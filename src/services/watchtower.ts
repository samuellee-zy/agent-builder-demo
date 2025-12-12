import { generateContent } from './api';
import { Agent, AgentSession, WatchtowerAnalysis } from "../types";

const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstCurly = clean.indexOf('{');
  const lastCurly = clean.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
    return clean.substring(firstCurly, lastCurly + 1);
  }
  return clean;
};

// Strip heavy base64 data to save tokens during analysis
const compressTranscript = (messages: any[]): string => {
    return messages.map(m => {
        let content = m.content;
        // Remove Base64 Image Data
        content = content.replace(/!\[.*?\]\(data:image\/.*?;base64,.*?\)/g, '[Image Generated]');
        // Remove Video Links (simplify)
        content = content.replace(/\[Download Video\]\(.*?\)/g, '[Video Generated]');
        return `${m.role.toUpperCase()} (${m.latency || 0}ms): ${content}`;
    }).join('\n');
};

export class WatchtowerService {
  // private ai: GoogleGenAI; // Removed as per instruction

  constructor() {
    // this.ai = new GoogleGenAI({ apiKey: getApiKey() }); // Removed as per instruction
  }

  async runAnalysis(agent: Agent): Promise<WatchtowerAnalysis> {
    const sessions = agent.sessions || [];
    
    // 1. Filter for valid sessions (at least 2 messages)
    // Take max 20 recent sessions to respect token limits
    const validSessions = sessions
        .filter(s => s.messages.length >= 2)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

    if (validSessions.length === 0) {
        throw new Error("Not enough session data to analyze.");
    }

    // 2. Prepare Transcripts
    const sessionData = validSessions.map((s, idx) => `
--- SESSION ID: ${s.id} ---
${compressTranscript(s.messages)}
`).join('\n');

    // 3. Prompt Gemini 3 Pro (Reasoning)
    const prompt = `
You are 'Watchtower', an advanced AI Observability Engine.
Analyze the following ${validSessions.length} chat sessions for the AI Agent "${agent.name}".
Goal: ${agent.goal}

TASK:
1. **Cluster Intents**: Group these sessions into 3-5 distinct user intents (e.g., "Refunds", "Technical Support", "Chit Chat").
2. **Sentiment Analysis**: Estimate user satisfaction (0-100) for each group and globally.
3. **Latency Check**: Note if average latency seems high (>2000ms is high).
4. **Recommendations**: Identify 3 specific improvements.
   - If users ask for things the agent can't do, suggest a NEW TOOL.
   - If the agent is rude or verbose, suggest INSTRUCTION changes.

OUTPUT JSON FORMAT:
{
  "globalScore": 85,
  "stats": {
    "avgLatency": 1200,
    "errorRate": 0,
    "totalMessages": 50
  },
  "intents": [
    {
      "id": "intent_1",
      "name": "Order Tracking",
      "description": "Users asking where their package is.",
      "count": 5,
      "avgSentiment": 90,
      "avgLatency": 800,
      "sampleSessionIds": ["1", "3"]
    }
  ],
  "recommendations": [
    {
      "id": "rec_1",
      "category": "Tooling", 
      "title": "Add Order Cancel Tool",
      "description": "Users try to cancel orders but the agent refuses.",
      "impact": "High",
      "actionContext": "Consider adding a 'cancel_order' function."
    }
  ]
}

TRANSCRIPTS:
${sessionData}
`;

    try {
      const result = await generateContent({
            model: 'gemini-3-pro-preview',
        prompt: prompt,
        responseMimeType: 'application/json'
        });

      if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("No response from Watchtower AI.");
      }

      const cleaned = cleanJson(result.candidates[0].content.parts[0].text);
        const data = JSON.parse(cleaned);

        return {
            timestamp: new Date(),
            sessionsAnalyzed: validSessions.length,
            globalScore: data.globalScore || 0,
            intents: data.intents || [],
            recommendations: data.recommendations || [],
            stats: {
                avgLatency: data.stats?.avgLatency || 0,
                errorRate: data.stats?.errorRate || 0,
                totalMessages: data.stats?.totalMessages || 0
            }
        };

    } catch (e) {
        console.error("Watchtower Analysis Failed:", e);
        throw e;
    }
  }
}