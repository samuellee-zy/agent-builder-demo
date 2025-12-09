

import { Agent, ChatMessage } from '../types';
import { AVAILABLE_TOOLS_LIST } from './tools';
import { GoogleGenAI } from "@google/genai";

// Helper to strip markdown code blocks and find JSON object
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    clean = clean.substring(firstOpen, lastClose + 1);
  }
  return clean;
};

// Helper to hydrate JSON data into Agent objects
const hydrate = (node: any): Agent => ({
  ...node,
  id: node.id === 'root' ? `root-${Date.now()}` : (node.id || Date.now().toString() + Math.random()),
  createdAt: new Date(),
  // Default to flash if model is missing (e.g. for groups)
  model: node.model || 'gemini-2.5-flash',
  subAgents: node.subAgents ? node.subAgents.map(hydrate) : []
});

// Retry Wrapper for Generation
const retryOperation = async <T>(operation: () => Promise<T>, retries = 4, initialDelay = 2000): Promise<T> => {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            if (i === retries - 1) throw error;
            const isTransient = error.status === 503 || error.status === 429 || error.message?.includes('overloaded');
            if (isTransient) {
                console.warn(`Architect Service Busy (${error.status}). Retrying in ${delay}ms...`);
            } else {
                console.warn(`Architect Error. Retrying in ${delay}ms...`, error);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    throw new Error("Architect service failed after retries.");
};

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
- Gemini 2.5 Flash Image: General image generation/editing.
- Veo 3.1: For video generation.
- Imagen 4: For photorealistic image generation.

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

    // Use retry wrapper
    const result = await retryOperation(() => chat.sendMessage({ message: newMessage }));
    return result.text || "I'm having trouble thinking right now.";
  } catch (error) {
    console.error("Architect Chat Error:", error);
    return "I'm sorry, I'm having trouble connecting to the design server. Please try again.";
  }
};

export const generateArchitectureFromChat = async (
  history: ChatMessage[]
): Promise<Agent> => {
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
- 'gemini-2.5-flash-image' (General Image Generation/Editing)
- 'gemini-3-pro-image-preview' (High-Quality Image Understanding/Generation)
- 'veo-3.1-fast-generate-preview' (Video Generation)
- 'imagen-4.0-generate-001' (Image Generation)

INSTRUCTIONS:
1. **Root Agent Required**: You MUST create a top-level 'Root Agent' that acts as the Coordinator.
2. **Architecture**: 
   - Analyze the workflow implied by the user.
   - **Sequential**: If tasks must happen in a specific order (e.g. Research -> then Write -> then Review), you MUST wrap these agents in a sub-node with "type": "group" and "groupMode": "sequential".
   - **Concurrent**: If tasks can happen at the same time (e.g. Search Twitter AND Search Google), wrap them in a sub-node with "type": "group" and "groupMode": "concurrent".
   - **Managed**: If the Root agent just needs to delegate to various experts ad-hoc, put them as direct sub-agents of the root.
   - **Hierarchy**: Nest groups correctly. For example, a "Root" can contain a "Sequential Group", which contains "Agent A" and "Agent B".
3. **Tools**: Assign relevant tool IDs. If a user needs Google Search, use 'google_search'.
4. **Models**: Assign the correct model ID based on the task. 
   - Use 'veo-3.1-fast-generate-preview' ONLY for agents specifically tasked with creating videos.
   - Use 'imagen-4.0-generate-001' ONLY for agents specifically tasked with creating photorealistic images.
   - Use 'gemini-2.5-flash-image' for general image editing or creation tasks.
   - Use 'gemini-3-pro-preview' for complex reasoning or coding.
5. **Operating Procedures**: Generate detailed markdown 'instructions' for each agent.

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
  "subAgents": [ 
     {
        "id": "group1",
        "type": "group",
        "groupMode": "sequential", 
        "name": "Research Phase",
        "subAgents": [ ...agents in order... ]
     }
  ]
}
`;

  try {
    // Attempt 1: Gemini 3 Pro (Reasoning) with Retry
    const result = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    }));

    if (result.text) {
        try {
            const cleaned = cleanJson(result.text);
            const parsed = JSON.parse(cleaned);
            return hydrate(parsed);
        } catch (e) {
            console.warn("Gemini 3 Pro JSON parse failed, attempting fallback...", e);
        }
    }
    
    // Attempt 2: Fallback to Flash (Reliable JSON) with Retry
    console.log("Falling back to Gemini 2.5 Flash for JSON generation...");
    const fallbackResult = await retryOperation(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    }));

    if (fallbackResult.text) {
        const parsed = JSON.parse(fallbackResult.text);
        return hydrate(parsed);
    }
    
    throw new Error("No JSON returned from fallback generation.");

  } catch (error) {
    console.error("Generation Error:", error);
    return {
      id: Date.now().toString(),
      name: 'Fallback Coordinator',
      description: 'System generated fallback due to error.',
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