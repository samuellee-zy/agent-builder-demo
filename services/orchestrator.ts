
import { Agent, ChatMessage } from '../types';
import { AVAILABLE_TOOLS_REGISTRY } from './tools';
import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse, Tool as GenAITool, Content, Part } from "@google/genai";

interface OrchestratorOptions {
  apiKey: string;
  rootAgent: Agent;
  onToolStart?: (agentName: string, toolName: string, args: any) => void;
  onToolEnd?: (agentName: string, toolName: string, result: any) => void;
  onAgentResponse?: (agentName: string, content: string) => void;
}

const MODELS_SUPPORTING_SEARCH = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-3-pro-image-preview'];
const PAID_MODELS = ['veo', 'imagen', 'gemini-3-pro-image-preview'];

/**
 * The Orchestrator manages the interaction between agents.
 * It handles the Coordinator Pattern by dynamically injecting a `delegate_to_agent` tool.
 */
export class AgentOrchestrator {
  private apiKey: string;
  private rootAgent: Agent;
  private ai: GoogleGenAI;
  private onToolStart?: (agentName: string, toolName: string, args: any) => void;
  private onToolEnd?: (agentName: string, toolName: string, result: any) => void;
  private onAgentResponse?: (agentName: string, content: string) => void;

  constructor(options: OrchestratorOptions) {
    this.apiKey = options.apiKey;
    this.rootAgent = options.rootAgent;
    this.onToolStart = options.onToolStart;
    this.onToolEnd = options.onToolEnd;
    this.onAgentResponse = options.onAgentResponse;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Main entry point to send a message to the system.
   */
  async sendMessage(history: ChatMessage[], newMessage: string): Promise<string> {
    return this.runAgentLoop(this.rootAgent, history, newMessage);
  }

  /**
   * Checks if any agent in the hierarchy uses a paid model (Veo/Imagen/Gemini 3 Image).
   */
  static isPaidModelInUse(agent: Agent): boolean {
    if (agent.model && PAID_MODELS.some(prefix => agent.model.startsWith(prefix))) return true;
    if (agent.subAgents) {
      return agent.subAgents.some(sub => AgentOrchestrator.isPaidModelInUse(sub));
    }
    return false;
  }

  /**
   * Generic Retry Wrapper for any async operation with Exponential Backoff.
   * Handles 503 (Overloaded) and 429 (Rate Limit) specifically.
   */
  private async retryOperation<T>(operation: () => Promise<T>, retries = 6, initialDelay = 2000): Promise<T> {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error; // Re-throw on last attempt
        
        // Normalize status code check
        const status = error.status || error.code;
        const errorMessage = error.message || '';
        
        // 429: Resource Exhausted / Rate Limit
        // 503: Service Unavailable
        // 400: Invalid Argument (Don't retry if it's a known conflict, but general 400s shouldn't happen with our conflict fix)
        const isRateLimit = status === 429 || status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota');
        const isTransient = status === 503 || errorMessage.includes('overloaded');
        
        if (isRateLimit) {
            // Check for explicit "retry in X s" message
            const match = errorMessage.match(/retry in ([0-9.]+)s/);
            let waitTime = 6000; // Default minimum
            
            if (match && match[1]) {
                const seconds = parseFloat(match[1]);
                waitTime = Math.ceil(seconds * 1000) + 1000; // Wait requested time + 1s buffer
                console.warn(`API Rate Limit (429). Server requested wait: ${seconds}s. Sleeping for ${waitTime}ms.`);
            } else {
                waitTime = Math.max(delay, 6000);
                console.warn(`API Rate Limit (429). Retrying in ${waitTime}ms...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Do not double delay for rate limits, just stick to safe wait times
        } else if (isTransient) {
            console.warn(`API Busy (${status}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff for transient errors
        } else {
            // Unknown error, maybe just a blip, retry once or twice then fail
            if (i > 2) throw error;
            console.warn(`API Error (${errorMessage}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
      }
    }
    throw new Error("Operation failed after retries.");
  }

  /**
   * The core Recursive Execution Loop.
   * - Constructs prompts.
   * - Injects tools.
   * - Handles Function Calling loop.
   * - Handles Delegation recursion.
   */
  private async runAgentLoop(agent: Agent, history: ChatMessage[], input: string): Promise<string> {
    // 1. Build System Instruction
    let systemInstruction = `You are ${agent.name}.\nGOAL: ${agent.goal}\n\n${agent.instructions || ''}`;
    
    // 2. Prepare Tools
    const tools: GenAITool[] = [];
    const functionDeclarations: FunctionDeclaration[] = [];
    let requestGoogleSearch = false;
    
    // Map assigned tools
    if (agent.tools) {
        agent.tools.forEach(toolId => {
            const toolDef = AVAILABLE_TOOLS_REGISTRY[toolId];
            if (toolDef) {
                // Special handling for Native Google Search
                if (toolId === 'google_search') {
                   // Only add if model supports it
                   if (MODELS_SUPPORTING_SEARCH.includes(agent.model)) {
                       requestGoogleSearch = true;
                   }
                } else {
                    functionDeclarations.push(toolDef.functionDeclaration);
                }
            }
        });
    }

    // 3. Coordinator Logic: Inject Delegation Tool if sub-agents exist
    if (agent.subAgents && agent.subAgents.length > 0) {
        systemInstruction += `\n\n### COORDINATION PROTOCOL
You are a Coordinator. You have access to the following Sub-Agents:
${agent.subAgents.map(sub => `- "${sub.name}": ${sub.description}`).join('\n')}

RULES:
1. To delegate work, YOU MUST use the 'delegate_to_agent' tool.
2. DO NOT hallucinate responses for sub-agents.
3. When a sub-agent returns a result, summarize it briefly or pass it along. 
4. **DO NOT** repeat the sub-agent's output verbatim if it is long. Synthesize it.
`;
        
        // Add delegation tool
        functionDeclarations.push({
            name: 'delegate_to_agent',
            description: 'Delegates a specific task/query to a sub-agent.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    agentName: { type: Type.STRING, description: 'The exact name of the sub-agent to call.' },
                    task: { type: Type.STRING, description: 'The specific instructions or query for the sub-agent.' }
                },
                required: ['agentName', 'task']
            }
        });
    }

    // CONFLICT RESOLUTION: Google Search vs Function Calling
    // The Gemini API currently returns 400 if `googleSearch` is used alongside `functionDeclarations`.
    // We prioritize Function Calling (for tools/delegation) over Native Search to prevent system crashes.
    if (functionDeclarations.length > 0) {
        tools.push({ functionDeclarations });
        
        if (requestGoogleSearch) {
             console.warn(`[Orchestrator] Conflict in agent '${agent.name}': Native Google Search disabled because other tools (Function Calling) are present.`);
             // We do NOT add googleSearch here to avoid the 400 error.
        }
    } else if (requestGoogleSearch) {
        // Only use search if no other functions are present
        tools.push({ googleSearch: {} });
    }

    // 4. Construct Chat History (Deep copy and format)
    const chatHistory: Content[] = history
        .filter(h => h.id !== 'init') // Remove system init marker if present in UI logs
        .map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

    // Add the current input
    chatHistory.push({ role: 'user', parts: [{ text: input }] });

    // 5. Execution Loop (Model -> Tool -> Model)
    let keepGoing = true;
    let finalResponse = "";
    let turns = 0;
    const MAX_TURNS = 10; // Prevent infinite loops

    // We keep track of the conversation *for this run* in `currentContents`.
    const currentContents: Content[] = [...chatHistory];

    while (keepGoing && turns < MAX_TURNS) {
        turns++;

        try {
            // A. Call Model
            const result: GenerateContentResponse = await this.retryOperation(() => this.ai.models.generateContent({
                model: agent.model || 'gemini-2.5-flash',
                contents: currentContents,
                config: {
                    systemInstruction,
                    tools: tools.length > 0 ? tools : undefined,
                    temperature: 0.7,
                }
            }));

            const responseContent = result.candidates?.[0]?.content;
            if (!responseContent) throw new Error("No content in response");

            // B. Check for Function Calls
            const functionCalls = responseContent.parts?.filter(p => p.functionCall).map(p => p.functionCall);
            
            // Append model's turn to history so it knows what it asked
            if (responseContent.parts) {
                currentContents.push({ role: 'model', parts: responseContent.parts });
            }

            if (functionCalls && functionCalls.length > 0) {
                const functionResponses: Part[] = [];

                for (const call of functionCalls) {
                    if (!call) continue;
                    
                    const { name, args: rawArgs } = call;
                    const args = (rawArgs || {}) as Record<string, any>;
                    
                    // UI Hook
                    if (this.onToolStart) this.onToolStart(agent.name, name, args);

                    let functionResult;

                    // Handle Delegation
                    if (name === 'delegate_to_agent') {
                        const subAgentName = args['agentName'] as string;
                        const task = args['task'] as string;
                        const subAgent = agent.subAgents?.find(sa => sa.name === subAgentName);

                        if (subAgent) {
                            // RECURSION: Call the sub-agent
                            functionResult = await this.runAgentLoop(subAgent, [], task);
                        } else {
                            functionResult = `Error: Agent '${subAgentName}' not found. Available: ${agent.subAgents?.map(s => s.name).join(', ')}`;
                        }
                    } 
                    // Handle Standard Tools
                    else {
                        const toolDef = AVAILABLE_TOOLS_REGISTRY[Object.keys(AVAILABLE_TOOLS_REGISTRY).find(k => AVAILABLE_TOOLS_REGISTRY[k].functionDeclaration.name === name) || ''];
                        
                        if (toolDef) {
                            functionResult = await toolDef.executable(args);
                        } else {
                            functionResult = `Error: Tool '${name}' not implemented.`;
                        }
                    }

                    // UI Hook
                    if (this.onToolEnd) this.onToolEnd(agent.name, name, functionResult);

                    functionResponses.push({
                        functionResponse: {
                            name: name,
                            response: { result: functionResult }
                        }
                    });
                }

                // Send results back to model
                currentContents.push({ role: 'user', parts: functionResponses });
                
            } else {
                // No function calls, we have a text response
                const text = responseContent.parts?.map(p => p.text).join('') || '';
                
                // If there's text, we are done
                if (text) {
                    finalResponse = text;
                    keepGoing = false;
                    // UI Hook for streaming/final update could go here
                    if (this.onAgentResponse) this.onAgentResponse(agent.name, finalResponse);
                } else {
                    // Sometimes models return empty text with just thought, but usually strict JSON handling avoids this.
                    // If empty, force stop.
                    keepGoing = false;
                }
            }

        } catch (error) {
            console.error(`Error in agent ${agent.name} loop:`, error);
            return `[System Error in ${agent.name}]: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    return finalResponse;
  }
}
