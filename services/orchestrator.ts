
import { Agent, ChatMessage, Tool } from '../types';
import { AVAILABLE_TOOLS_REGISTRY } from './tools';
import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";

interface OrchestratorOptions {
  apiKey: string;
  rootAgent: Agent;
  onToolStart?: (agentName: string, toolName: string, args: any) => void;
  onToolEnd?: (agentName: string, toolName: string, result: any) => void;
  onAgentResponse?: (agentName: string, content: string) => void;
}

const MODELS_SUPPORTING_SEARCH = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-3-pro-image-preview'];
const MODELS_SUPPORTING_FUNCTIONS = ['gemini-2.5-flash', 'gemini-3-pro-preview'];
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
    if (PAID_MODELS.some(prefix => agent.model.startsWith(prefix))) return true;
    if (agent.subAgents) {
      return agent.subAgents.some(sub => AgentOrchestrator.isPaidModelInUse(sub));
    }
    return false;
  }

  /**
   * Wrapper for Chat.sendMessage with Retry Logic (Exponential Backoff)
   */
  private async retrySendMessage(chat: any, params: any, retries = 3): Promise<GenerateContentResponse> {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        return await chat.sendMessage(params);
      } catch (error: any) {
        if (i === retries - 1) throw error; // Re-throw on last attempt
        console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw new Error("Failed to send message after retries");
  }

  /**
   * Runs the execution loop for a specific agent.
   * Handles Tool Calls, Recursion, and Special Model Types (Veo, Imagen).
   */
  private async runAgentLoop(
    agent: Agent, 
    history: ChatMessage[], 
    userMessage: string
  ): Promise<string> {
    
    const modelId = agent.model || 'gemini-2.5-flash';

    // --- CASE 1: VIDEO GENERATION (VEO) ---
    if (modelId.startsWith('veo')) {
        this.onToolStart?.(agent.name, 'generateVideos', { prompt: userMessage });
        try {
            let operation = await this.ai.models.generateVideos({
                model: modelId,
                prompt: userMessage,
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
            });

            // Polling Loop
            let attempts = 0;
            const MAX_ATTEMPTS = 30; // 5 mins roughly
            while (!operation.done && attempts < MAX_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10s interval
                operation = await this.ai.operations.getVideosOperation({ operation: operation });
                attempts++;
            }
            
            if (!operation.done) throw new Error("Video generation timed out.");

            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!videoUri) throw new Error("No video URI returned.");

            this.onToolEnd?.(agent.name, 'generateVideos', 'Success');
            
            // Return Markdown to render video (Appended API Key for client-side playback)
            const videoMarkdown = `\n\n### Generated Video\n[Download Video](${videoUri}&key=${this.apiKey})`;
            this.onAgentResponse?.(agent.name, videoMarkdown);
            return videoMarkdown;

        } catch (e: any) {
            this.onToolEnd?.(agent.name, 'generateVideos', 'Failed');
            const errorMsg = `Error generating video: ${e.message}`;
            this.onAgentResponse?.(agent.name, errorMsg);
            return errorMsg;
        }
    }

    // --- CASE 2: IMAGE GENERATION (IMAGEN) ---
    if (modelId.startsWith('imagen')) {
        this.onToolStart?.(agent.name, 'generateImages', { prompt: userMessage });
        try {
            const response = await this.ai.models.generateImages({
                model: modelId,
                prompt: userMessage,
                config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
            });
            
            const b64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (!b64) throw new Error("No image bytes returned.");
            
            this.onToolEnd?.(agent.name, 'generateImages', 'Success');
            const imageMarkdown = `\n\n![Generated Image](data:image/jpeg;base64,${b64})`;
            this.onAgentResponse?.(agent.name, imageMarkdown);
            return imageMarkdown;

        } catch (e: any) {
            this.onToolEnd?.(agent.name, 'generateImages', 'Failed');
            const errorMsg = `Error generating image: ${e.message}`;
            this.onAgentResponse?.(agent.name, errorMsg);
            return errorMsg;
        }
    }

    // --- CASE 3: CHAT / COORDINATION (GEMINI) ---
    
    // 1. Prepare Tools
    const agentToolIds = agent.tools || [];
    const useGoogleSearch = agentToolIds.includes('google_search');

    const agentTools = agentToolIds
      .filter(id => id !== 'google_search')
      .map(id => AVAILABLE_TOOLS_REGISTRY[id])
      .filter(Boolean);

    // Inject 'delegate_to_agent' for sub-agents
    const subAgents = agent.subAgents || [];
    const hasSubAgents = subAgents.length > 0;
    
    let delegationTool: Tool | null = null;
    if (hasSubAgents) {
      delegationTool = {
        id: 'delegate_to_agent',
        name: 'Delegate Task',
        description: 'Delegates a specific task to a sub-agent.',
        category: 'System',
        functionDeclaration: {
          name: 'delegate_to_agent',
          description: `Delegate a task to one of the following agents: ${subAgents.map(sa => `${sa.name} (Goal: ${sa.goal})`).join(', ')}.`,
          parameters: {
            type: Type.OBJECT,
            properties: {
              agentName: { type: Type.STRING, description: 'The exact name of the agent to delegate to.', enum: subAgents.map(sa => sa.name) },
              instructions: { type: Type.STRING, description: 'Specific instructions for the sub-agent.' }
            },
            required: ['agentName', 'instructions']
          }
        },
        executable: async ({ agentName, instructions }: { agentName: string, instructions: string }) => {
          const targetAgent = subAgents.find(sa => sa.name === agentName);
          if (!targetAgent) return `Error: Agent '${agentName}' not found.`;
          // Recursive Call
          return await this.runAgentLoop(targetAgent, [], instructions);
        }
      };
    }

    const allExecutableTools = [...agentTools];
    if (delegationTool) allExecutableTools.push(delegationTool);

    // Validation
    if (useGoogleSearch && !MODELS_SUPPORTING_SEARCH.includes(modelId)) {
        return `Error: 'Google Search' requires a supported model. Current: ${modelId}`;
    }

    // Config construction
    const toolsConfig: any[] = [];
    const supportsFunctions = MODELS_SUPPORTING_FUNCTIONS.includes(modelId);

    // ONLY add function declarations if the model supports them.
    if (allExecutableTools.length > 0 && supportsFunctions) {
      toolsConfig.push({ functionDeclarations: allExecutableTools.map(t => t.functionDeclaration) });
    }
    
    if (useGoogleSearch) {
      toolsConfig.push({ googleSearch: {} });
    }

    let systemInstruction = agent.instructions;
    if (hasSubAgents) {
      systemInstruction += `\n\n### COORDINATION PROTOCOL
You are a Coordinator. Available Sub-Agents via 'delegate_to_agent':
${subAgents.map(sa => `- **${sa.name}**: ${sa.goal}`).join('\n')}`;
    }

    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const chat = this.ai.chats.create({
      model: modelId,
      config: { systemInstruction, tools: toolsConfig.length > 0 ? toolsConfig : undefined },
      history: chatHistory
    });

    let currentMessage: any = userMessage;
    let finalResponse = '';
    let turns = 0;
    const MAX_TURNS = 10;

    while (turns < MAX_TURNS) {
      turns++;
      
      const result: GenerateContentResponse = await this.retrySendMessage(chat, { message: currentMessage });
      const calls = result.functionCalls;
      
      if (calls && calls.length > 0) {
        const functionResponseParts = [];
        for (const call of calls) {
          this.onToolStart?.(agent.name, call.name, call.args);
          let output;
          if (delegationTool && call.name === delegationTool.functionDeclaration.name) {
             output = await delegationTool.executable(call.args);
          } else {
             const tool = agentTools.find(t => t.functionDeclaration.name === call.name);
             output = tool ? await tool.executable(call.args) : `Error: Tool ${call.name} not found.`;
          }
          this.onToolEnd?.(agent.name, call.name, output);
          functionResponseParts.push({
            functionResponse: { name: call.name, response: { result: output }, id: call.id }
          });
        }
        currentMessage = functionResponseParts;
      } else {
        // Text Response
        finalResponse = result.text || '';

        // Handle Inline Images (e.g. from Gemini 3 Image Pro)
        const parts = result.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    finalResponse += `\n\n![Generated Image](data:${part.inlineData.mimeType};base64,${part.inlineData.data})`;
                }
            }
        }

        // Handle Search Grounding
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
            const sources = groundingChunks
                .map((chunk: any) => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
                .filter(Boolean);
            if (sources.length > 0) {
                const uniqueSources = Array.from(new Set(sources));
                finalResponse += `\n\n**Sources:**\n${uniqueSources.map(s => `- ${s}`).join('\n')}`;
            }
        }
        
        // Emit the final response for this agent's turn
        this.onAgentResponse?.(agent.name, finalResponse);
        break;
      }
    }
    return finalResponse;
  }
}
