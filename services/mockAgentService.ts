
import { Agent, ChatMessage } from '../types';
import { AVAILABLE_TOOLS_LIST } from './tools';
import { GoogleGenAI } from "@google/genai";

export const sendArchitectMessage = async (
  history: ChatMessage[], 
  newMessage: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `You are an expert AI Systems Architect. 
Your goal is to help the user design a multi-agent system.

GUIDELINES:
1. Analyze their request.
2. If the request is vague, ask *one* clarifying question about the desired workflow.
3. **CRITICAL**: When proposing a design, you MUST explicitly mention:
   - **Models**: Which model assigns to which agent (e.g., "Gemini 3 Pro for reasoning", "Veo 3.1 for video").
   - **Tools**: Which tools from the library (e.g., 'Google Search', 'Calculator') each agent needs.
   - **Patterns**: How agents are organized. Specify if sub-agents are:
     - *Managed* (Standard delegation).
     - *Sequential* (Step-by-step strict flow).
     - *Concurrent* (Parallel execution).
4. Always assume a "Coordinator Pattern" where a Root Agent manages sub-agents.
5. Keep responses concise and helpful. Do not output JSON yet. Just converse.

AVAILABLE MODELS:
- Gemini 2.5 Flash: Good for general tasks, speed.
- Gemini 3 Pro: Best for reasoning, coding, complex instruction following.
- Veo 3.1: For video generation.
- Imagen 3: For image generation.

AVAILABLE TOOLS:
${AVAILABLE_TOOLS_LIST.map(t => `- ${t.name}: ${t.description}`).join('\n')}
`;

    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash', 
      config: { systemInstruction },
      history: chatHistory
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm having trouble thinking right now.";
  } catch (error) {
    console.error("Architect Chat Error:", error);
    return "I'm sorry, I'm having trouble connecting to the design server.";
  }
};

export const generateArchitectureFromChat = async (
  history: ChatMessage[]
): Promise<Agent> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const transcript = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const prompt = `
Based on the conversation, generate a complete JSON definition for the Multi-Agent System.

CONVERSATION TRANSCRIPT:
${transcript}

AVAILABLE TOOLS:
${AVAILABLE_TOOLS_LIST.map(t => `- ID: ${t.id}, Name: ${t.name}, Desc: ${t.description}`).join('\n')}

AVAILABLE MODELS:
- 'gemini-2.5-flash' (Default, Text)
- 'gemini-3-pro-preview' (Complex Text/Reasoning)
- 'gemini-3-pro-image-preview' (Image Understanding/Generation)
- 'veo-3.1-fast-generate-preview' (Video Generation)
- 'imagen-4.0-generate-001' (Image Generation)

INSTRUCTIONS:
1. **Root Agent Required**: You MUST create a top-level 'Root Agent' that acts as the Coordinator.
2. **Architecture**: If the user mentioned multiple tasks, create specific sub-agents under the Root Agent.
3. **Tools**: Assign relevant tool IDs. If a user needs Google Search, use 'google_search'.
4. **Models**: Assign the correct model ID based on the task. 
   - Use 'veo-3.1-fast-generate-preview' ONLY for agents specifically tasked with creating videos.
   - Use 'imagen-4.0-generate-001' ONLY for agents specifically tasked with creating images.
   - Use 'gemini-3-pro-preview' for complex reasoning or coding.
5. **Operating Procedures**: Generate detailed markdown 'instructions' for each agent.
6. **Structure**: 
   - Root Agent (type: agent)
     - Sub Agent 1 (type: agent)
     - Sub Agent 2 (type: agent)
   - Do not use 'group' type unless explicitly requested for strict sequential flow control.

OUTPUT FORMAT (JSON ONLY):
{
  "id": "root",
  "name": "Root Agent Name",
  "description": "...",
  "goal": "...",
  "instructions": "Detailed Markdown instructions...",
  "tools": ["google_search", "calculator"], 
  "model": "gemini-2.5-flash", 
  "type": "agent",
  "subAgents": [ ... ]
}
`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    if (result.text) {
      const parsed = JSON.parse(result.text);
      const hydrate = (node: any): Agent => ({
        ...node,
        id: node.id === 'root' ? `root-${Date.now()}` : (node.id || Date.now().toString() + Math.random()),
        createdAt: new Date(),
        subAgents: node.subAgents ? node.subAgents.map(hydrate) : []
      });
      return hydrate(parsed);
    }
    
    throw new Error("No JSON returned");
  } catch (error) {
    console.error("Generation Error:", error);
    return {
      id: Date.now().toString(),
      name: 'Fallback Coordinator',
      description: 'System generated fallback.',
      goal: 'Assist user.',
      instructions: 'You are a helpful assistant.',
      tools: [],
      model: 'gemini-2.5-flash',
      createdAt: new Date(),
      subAgents: [],
      type: 'agent'
    };
  }
};
