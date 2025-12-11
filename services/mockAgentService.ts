import { Agent, ChatMessage } from '../types';
import { AVAILABLE_TOOLS_LIST } from './tools';
import { generateContent } from './api';

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

// Retry Wrapper for Generation with Smart Backoff
const retryOperation = async <T>(operation: () => Promise<T>, retries = 6, initialDelay = 2000): Promise<T> => {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            if (i === retries - 1) throw error;
            
            const status = error.status || error.code;
            const errorMessage = error.message || '';
            const isRateLimit = status === 429 || status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota');
            const isTransient = status === 503 || errorMessage.includes('overloaded');

            if (isRateLimit) {
                const match = errorMessage.match(/retry in ([0-9.]+)s/);
                let waitTime = 6000;
                
                if (match && match[1]) {
                    const seconds = parseFloat(match[1]);
                    waitTime = Math.ceil(seconds * 1000) + 1000;
                    console.warn(`Architect Rate Limit (429). Waiting ${seconds}s as requested.`);
                } else {
                    waitTime = Math.max(delay, 6000);
                    console.warn(`Architect Rate Limit (429). Retrying in ${waitTime}ms...`);
                }
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                delay = waitTime * 2;
            } else if (isTransient) {
                console.warn(`Architect Busy (${status}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                console.warn(`Architect Error. Retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    throw new Error("Architect service failed after retries.");
};

export const sendArchitectMessage = async (
  history: ChatMessage[], 
  newMessage: string
): Promise<string> => {
  try {
    // const ai = new GoogleGenAI({ apiKey: getApiKey() }); // Removed GoogleGenAI instance
    
    const systemInstruction = `You are an expert AI Systems Architect. 
Your goal is to help the user design a multi-agent system.

GUIDELINES:
1. Analyze their request.
2. If the request is vague, ask *one* clarifying question about the desired workflow.
3. **CRITICAL**: When proposing a design, you MUST explicitly mention:
   - **Models**: Which model assigns to which agent (e.g., "Gemini 3 Pro for reasoning", "Veo 3.1 for video").
   - **Tools**: Recommend specific tools from the library (e.g., 'CRM Lookup' for identifying users, 'Order Status' for logistics).
   - **Patterns**: How agents are organized. Specify if sub-agents are:
     - *Managed* (Standard delegation).
     - *Sequential* (Step-by-step strict flow).
     - *Concurrent* (Parallel execution).
4. Always assume a "Coordinator Pattern" where a Root Agent manages sub-agents.
5. Keep responses concise and helpful. Do not output JSON yet. Just converse.
6. **Images**: Recommend 'gemini-2.5-flash-image' for general image tasks.

AVAILABLE MODELS:
- Gemini 2.5 Flash: Good for general tasks, speed.
- Gemini 2.5 Flash Lite: Extremely cost-effective, high throughput.
- Gemini 3 Pro: Best for reasoning, coding, complex instruction following.
- Gemini 2.5 Flash Image: General image generation and editing.
- Veo 3.1: For video generation.
- Imagen 4: For photorealistic image generation.
- Imagen 4 Fast: For fast photorealistic image generation.

AVAILABLE TOOLS:
${AVAILABLE_TOOLS_LIST.map(t => `- ${t.name} (ID: ${t.id}): ${t.description}`).join('\n')}
`;

    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    // Replaced ai.chats.create and chat.sendMessage with direct generateContent call
    const result = await retryOperation(() => generateContent({
      model: 'gemini-2.5-flash', 
      prompt: newMessage,
      systemInstruction: systemInstruction,
      history: chatHistory
    }));
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking right now.";
  } catch (error) {
    console.error("Architect Chat Error:", error);
    return "I'm sorry, I'm having trouble connecting to the design server. Please try again.";
  }
};

export const generateArchitectureFromChat = async (
  history: ChatMessage[]
): Promise<Agent> => {
  // const ai = new GoogleGenAI({ apiKey: getApiKey() }); // Removed GoogleGenAI instance
  const transcript = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
Based on the conversation, generate a complete JSON definition for the Multi-Agent System.

CONVERSATION TRANSCRIPT:
${transcript}

AVAILABLE TOOLS:
${AVAILABLE_TOOLS_LIST.map(t => `- ID: ${t.id}, Name: ${t.name}, Desc: ${t.description}`).join('\n')}

AVAILABLE MODELS:
- 'gemini-2.5-flash' (Default, Text)
- 'gemini-flash-lite-latest' (Cost-effective, Text)
- 'gemini-3-pro-preview' (Complex Text/Reasoning)
- 'gemini-2.5-flash-image' (General Image Generation/Editing)
- 'gemini-3-pro-image-preview' (High-Quality Image Understanding/Generation)
- 'veo-3.1-fast-generate-001' (Video Generation)
- 'imagen-4.0-generate-001' (Image Generation)
- 'imagen-4.0-fast-generate-001' (Fast Image Generation)

INSTRUCTIONS:
1. **Root Agent**: You MUST create a top-level 'Root Agent'.
2. **Tools & Coordinator Constraints (CRITICAL)**: 
   - **Multi-Agent System**: If the Root Agent has 'subAgents', the Root Agent MUST be a **Pure Coordinator**.
     - The Root Agent's "tools" array MUST be empty [].
     - Its only job is to delegate. It DOES NOT execute searches or calculations itself.
     - Assign tools (like 'google_search', 'calculator') ONLY to the appropriate Sub-Agents.
   - **Single Agent System**: If there are NO 'subAgents', you may assign tools like 'google_search' directly to the Root Agent.
3. **Architecture**: 
   - **Sequential**: If tasks must happen in a specific order, wrap agents in a sub-node with "type": "group" and "groupMode": "sequential".
   - **Concurrent**: If tasks can happen at the same time, wrap them in a sub-node with "type": "group" and "groupMode": "concurrent".
   - **Managed**: If the Root agent just needs to delegate to various experts ad-hoc, put them as direct sub-agents of the root.
4. **Tools Selection**: 
   - Use 'crm_customer_lookup' for identifying users.
   - Use 'check_order_status' for tracking.
   - Use 'kb_search' for answering policy questions.
   - Use 'create_support_ticket' for escalations.
   - Use 'google_search' for external information.
5. **Models**: Assign the correct model ID based on the task. 
   - Use 'veo-3.1-fast-generate-001' ONLY for agents specifically tasked with creating videos.
   - Use 'imagen-4.0-generate-001' OR 'imagen-4.0-fast-generate-001' ONLY for agents specifically tasked with creating photorealistic images.
   - Use 'gemini-2.5-flash-image' for general image editing or creation tasks.
   - Use 'gemini-3-pro-preview' for complex reasoning or coding.
   - Use 'gemini-flash-lite-latest' for simple, high-volume text tasks.
6. **Operating Procedures (CRITICAL)**: You MUST generate detailed markdown 'instructions' for each agent following this EXACT format:

      # Role and Persona
      You are **[Agent Name]**, a [Role Description].
      * **Tone:** [Professional/Empathetic/Technical/etc.]
      * **Goal:** [Specific Goal]

      # Operational Context
      [Describe access, constraints, and environment]

      # Response Guidelines
      ## 1. Interaction Style
      * **Acknowledge and Validate:** [Instructions]
      * **Clarity:** [Instructions]
      * **Brevity:** [Instructions]

      ## 2. Troubleshooting Protocol (If applicable)
      1. **Clarify:** ...
      2. **Isolate:** ...
      3. **Solve:** ...

      ## 3. Formatting Rules
      * Use **bold** for UI elements.
      * Use 'code blocks' for technical terms.
      * Use > blockquotes for warnings.

      # Guardrails and Safety
      * **No PII:** [Instructions]
      * **Competitors:** [Instructions]
      * **Escalation:** [Instructions]

      # Fallback Mechanism
      [Instructions]

OUTPUT FORMAT (JSON ONLY):
{
  "id": "root",
  "name": "Root Agent Name",
  "description": "...",
  "goal": "...",
  "instructions": "Detailed Markdown instructions...",
  "tools": [], 
  "model": "gemini-2.5-flash", 
  "type": "agent",
  "subAgents": [ 
     {
        "id": "group1",
        "type": "group",
        "groupMode": "sequential", 
        "name": "Research Phase",
        "subAgents": [ 
            {
               "id": "researcher",
               "name": "Researcher",
               "tools": ["google_search"],
               "type": "agent",
               ...
            }
        ]
     }
  ]
}
`;

  try {
    // Attempt 1: Gemini 3 Pro (Reasoning) with Retry
    const result = await retryOperation(() => generateContent({
      model: 'gemini-3-pro-preview',
      prompt: prompt,
    }));

    // Helper to extract text from Vertex response
    const getText = (response: any) => {
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };

    const text = getText(result);
    if (text) {
        try {
          const cleaned = cleanJson(text);
            const parsed = JSON.parse(cleaned);
            return hydrate(parsed);
        } catch (e) {
            console.warn("Gemini 3 Pro JSON parse failed, attempting fallback...", e);
        }
    }
    
    // Attempt 2: Fallback to Flash (Reliable JSON) with Retry
    console.log("Falling back to Gemini 2.5 Flash for JSON generation...");
    const fallbackResult = await retryOperation(() => generateContent({
        model: 'gemini-2.5-flash',
      prompt: prompt,
      stream: false // explicit
    }));

    const fallbackText = getText(fallbackResult);
    if (fallbackText) {
      const cleaned = cleanJson(fallbackText);
      const parsed = JSON.parse(cleaned);
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
