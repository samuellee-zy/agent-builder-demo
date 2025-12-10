
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
   * Handles Video Generation for Veo models.
   * Uses `generateVideos` instead of `generateContent`.
   */
  private async generateVideo(model: string, prompt: string, agentName: string): Promise<string> {
    try {
      // FIX: Auto-migrate deprecated/legacy model IDs to prevent 404s
      let targetModel = model;
      if (targetModel === 'veo-3.0-fast-generate') {
          targetModel = 'veo-3.1-fast-generate-preview';
          console.warn(`[Orchestrator] Auto-migrating deprecated model '${model}' to '${targetModel}'`);
      }

      if (this.onToolStart) this.onToolStart(agentName, 'generateVideos', { prompt, model: targetModel });

      let operation = await this.retryOperation(() => this.ai.models.generateVideos({
        model: targetModel,
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      }));

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await this.retryOperation(() => this.ai.operations.getVideosOperation({ operation }));
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("No video URI returned in response.");

      // Append API key for secure frontend fetching
      const secureUrl = `${uri}&key=${this.apiKey}`;
      const displayResult = `Here is your generated video:\n\n[Download Video](${secureUrl})`;

      if (this.onToolEnd) this.onToolEnd(agentName, 'generateVideos', "Success");
      // Emit the RICH content to the UI
      if (this.onAgentResponse) this.onAgentResponse(agentName, displayResult);
      
      // RETURN a simple system message to the Coordinator.
      // This prevents the Coordinator from "echoing" the video link and causing duplicate outputs.
      return "Video generated successfully and displayed to user.";

    } catch (error: any) {
       console.error("Video Generation Error:", error);
       const failMsg = `[Video Generation Error]: ${error.message}`;
       if (this.onToolEnd) this.onToolEnd(agentName, 'generateVideos', "Failed");
       if (this.onAgentResponse) this.onAgentResponse(agentName, failMsg);
       return failMsg;
    }
  }

  /**
   * Handles Image Generation for Imagen models.
   * Uses `generateImages` instead of `generateContent`.
   */
  private async generateImage(model: string, prompt: string, agentName: string): Promise<string> {
    try {
      if (this.onToolStart) this.onToolStart(agentName, 'generateImages', { prompt, model });

      const response = await this.retryOperation(() => this.ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/jpeg'
        }
      }));

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error("No image bytes returned.");

      const displayResult = `Here is your generated image:\n\n![Generated Image](data:image/jpeg;base64,${imageBytes})`;
      
      if (this.onToolEnd) this.onToolEnd(agentName, 'generateImages', "Success");
      // Emit the RICH content to the UI
      if (this.onAgentResponse) this.onAgentResponse(agentName, displayResult);

      // RETURN a simple system message to the Coordinator.
      // This prevents the Coordinator from echoing the image AND keeps the Coordinator's context window small (no base64).
      return "Image generated successfully and displayed to user.";

    } catch (error: any) {
      console.error("Image Generation Error:", error);
      const failMsg = `[Image Generation Error]: ${error.message}`;
      if (this.onToolEnd) this.onToolEnd(agentName, 'generateImages', "Failed");
      if (this.onAgentResponse) this.onAgentResponse(agentName, failMsg);
      return failMsg;
    }
  }

  /**
   * Compresses content history to prevent token limits.
   * Specifically strips heavy Base64 image data from text blocks.
   * Regex matches markdown image syntax with data URIs and removes the Base64 payload.
   */
  private compressContent(text: string): string {
      // Matches: ![alt](data:image/type;base64,DATA)
      return text.replace(/!\[(.*?)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '![Generated Image] (Image data hidden to save tokens)');
  }

  /**
   * The core Recursive Execution Loop.
   * - Constructs prompts.
   * - Injects tools.
   * - Handles Function Calling loop.
   * - Handles Delegation recursion.
   */
  private async runAgentLoop(agent: Agent, history: ChatMessage[], input: string): Promise<string> {
    
    // 0. Specialized Model Dispatch
    if (agent.model.startsWith('veo-')) {
        return this.generateVideo(agent.model, input, agent.name);
    }
    if (agent.model.startsWith('imagen-')) {
        return this.generateImage(agent.model, input, agent.name);
    }

    // 1. Build System Instruction
    let systemInstruction = `You are ${agent.name}.\nGOAL: ${agent.goal}\n\n${agent.instructions || ''}`;
    
    // 2. Prepare Tools
    const tools: GenAITool[] = [];
    const functionDeclarations: FunctionDeclaration[] = [];
    let requestGoogleSearch = false;
    
    if (agent.tools) {
        agent.tools.forEach(toolId => {
            const toolDef = AVAILABLE_TOOLS_REGISTRY[toolId];
            if (toolDef) {
                if (toolId === 'google_search') {
                   if (MODELS_SUPPORTING_SEARCH.includes(agent.model)) {
                       requestGoogleSearch = true;
                   }
                } else {
                    functionDeclarations.push(toolDef.functionDeclaration);
                }
            }
        });
    }

    // 3. Coordinator Logic
    if (agent.subAgents && agent.subAgents.length > 0) {
        systemInstruction += `\n\n### COORDINATION PROTOCOL
You are a Coordinator. You have access to the following Sub-Agents:
${agent.subAgents.map(sub => `- "${sub.name}": ${sub.description}`).join('\n')}

RULES:
1. To delegate work, YOU MUST use the 'delegate_to_agent' tool.
2. DO NOT hallucinate responses for sub-agents.
3. **CRITICAL**: The user sees the sub-agent's output DIRECTLY. **DO NOT REPEAT** the sub-agent's response.
4. If the sub-agent's response answers the user's question, you should either:
   - Remain silent (output nothing).
   - Or offer a brief confirmation (e.g., "Is there anything else?").
   - NEVER summarize or re-state what was just shown.
`;
        
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

    // CONFLICT RESOLUTION
    if (functionDeclarations.length > 0) {
        tools.push({ functionDeclarations });
        
        if (requestGoogleSearch) {
             console.warn(`[Orchestrator] Conflict in agent '${agent.name}': Native Google Search disabled because other tools (Function Calling) are present.`);
        }
    } else if (requestGoogleSearch) {
        tools.push({ googleSearch: {} });
    }

    // 4. Construct Chat History (Deep copy, format, and COMPRESS)
    // CRITICAL FIX: Strip large base64 strings to prevent 400 INVALID_ARGUMENT (Token Limit) errors.
    const chatHistory: Content[] = history
        .filter(h => h.id !== 'init') 
        .map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: this.compressContent(h.content) }]
        }));

    // Add the current input
    chatHistory.push({ role: 'user', parts: [{ text: input }] });

    // 5. Execution Loop (Model -> Tool -> Model)
    let keepGoing = true;
    let finalResponse = "";
    let turns = 0;
    const MAX_TURNS = 10;

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

            const functionCalls = responseContent.parts?.filter(p => p.functionCall).map(p => p.functionCall);
            
            if (responseContent.parts) {
                currentContents.push({ role: 'model', parts: responseContent.parts });
            }

            if (functionCalls && functionCalls.length > 0) {
                const functionResponses: Part[] = [];

                for (const call of functionCalls) {
                    if (!call) continue;
                    
                    const { name, args: rawArgs } = call;
                    const args = (rawArgs || {}) as Record<string, any>;
                    
                    if (this.onToolStart) this.onToolStart(agent.name, name, args);

                    let functionResult;

                    if (name === 'delegate_to_agent') {
                        const subAgentName = args['agentName'] as string;
                        const task = args['task'] as string;
                        const subAgent = agent.subAgents?.find(sa => sa.name === subAgentName);

                        if (subAgent) {
                            const rawResult = await this.runAgentLoop(subAgent, [], task);
                            // Tag the result so the Coordinator knows the user already saw it
                            functionResult = `[SYSTEM: The user has already seen this response from sub-agent '${subAgentName}'. DO NOT REPEAT IT.]\n\n${rawResult}`;
                        } else {
                            functionResult = `Error: Agent '${subAgentName}' not found. Available: ${agent.subAgents?.map(s => s.name).join(', ')}`;
                        }
                    } else {
                        const toolDef = AVAILABLE_TOOLS_REGISTRY[Object.keys(AVAILABLE_TOOLS_REGISTRY).find(k => AVAILABLE_TOOLS_REGISTRY[k].functionDeclaration.name === name) || ''];
                        
                        if (toolDef) {
                            functionResult = await toolDef.executable(args);
                        } else {
                            functionResult = `Error: Tool '${name}' not implemented.`;
                        }
                    }

                    if (this.onToolEnd) this.onToolEnd(agent.name, name, functionResult);

                    functionResponses.push({
                        functionResponse: {
                            name: name,
                            response: { result: functionResult }
                        }
                    });
                }

                currentContents.push({ role: 'user', parts: functionResponses });
                
            } else {
                const text = responseContent.parts?.map(p => p.text).join('') || '';
                
                if (text) {
                    finalResponse = text;
                    keepGoing = false;
                    if (this.onAgentResponse) this.onAgentResponse(agent.name, finalResponse);
                } else {
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
