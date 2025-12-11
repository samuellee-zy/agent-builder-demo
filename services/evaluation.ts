import { Agent, ChatMessage, EvaluationMetric, EvaluationReport, EvaluationSession } from '../types';
import { AgentOrchestrator } from './orchestrator';
import { generateContent } from './api';

// Helper to strip markdown code blocks and find JSON object OR array
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  const firstSquare = clean.indexOf('[');
  const firstCurly = clean.indexOf('{');
  
  let startIndex = -1;
  let endIndex = -1;

  // Determine if we are looking for an Array or Object based on which comes first
  if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
      startIndex = firstSquare;
      endIndex = clean.lastIndexOf(']');
  } else if (firstCurly !== -1) {
      startIndex = firstCurly;
      endIndex = clean.lastIndexOf('}');
  }

  if (startIndex !== -1 && endIndex !== -1) {
      return clean.substring(startIndex, endIndex + 1);
  }
  
  return clean;
};

// Helper to strip base64 image data for the Judge to save tokens
const compressForJudge = (text: string): string => {
  // Matches: ![alt](data:image/type;base64,DATA)
  // Replaces with: ![Generated Image] (Image data hidden to save tokens)
  return text.replace(/!\[(.*?)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '![Generated Image] (Image data hidden to save tokens)');
};

export class EvaluationService {
  // private ai: GoogleGenAI; // No longer needed as generateContent is a static helper

  constructor() {
    // The constructor is now empty as generateContent is a static helper
  }

  /**
   * Internal Retry Wrapper
   */
  private async retryOperation<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error;
        
        const status = error.status || error.code;
        const errorMessage = error.message || '';
        
        // Retry on Rate Limits (429) or Overloaded (503)
        if (status === 429 || status === 503 || errorMessage.includes('overloaded') || errorMessage.includes('quota')) {
             console.warn(`Evaluation Rate Limit/Busy (${status}). Retrying in ${delay}ms...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             delay *= 2;
        } else {
            throw error; // Don't retry logic errors
        }
      }
    }
    throw new Error("Evaluation operation failed after retries.");
  }

  /**
   * Generates test scenarios based on the agent's goal.
   */
  async generateScenarios(agent: Agent, count: number): Promise<string[]> {
    const prompt = `
      You are a QA Lead testing an AI Agent.
      
      Agent Name: ${agent.name}
      Agent Goal: ${agent.goal}
      
      Generate ${count} distinct, realistic, and challenging user scenarios to test this agent.
      Each scenario should be a short description of a user intent or problem (1-2 sentences).
      
      Output ONLY a JSON array of strings. Example:
      ["User asks for refund but has no receipt", "User wants to book a flight for tomorrow"]
    `;

    try {
      const result = await this.retryOperation(() => generateContent({
        model: 'gemini-3-pro-preview',
        prompt: prompt,
        responseMimeType: 'application/json'
      }));

      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const cleaned = cleanJson(result.candidates[0].content.parts[0].text);
        return JSON.parse(cleaned);
      }
      throw new Error("Empty response from scenario generator");
    } catch (error) {
      console.error("Scenario Generation Error:", error);
      // Fallback scenarios
      return Array(count).fill(0).map((_, i) => `Generic test scenario ${i + 1} for ${agent.name}`);
    }
  }

  /**
   * Runs a single simulation session.
   */
  async runSimulation(
    agent: Agent, 
    scenario: string, 
    simulatorModel: string
  ): Promise<EvaluationSession> {
    const sessionId = Date.now().toString() + Math.random().toString().slice(2, 6);
    const transcript: ChatMessage[] = [];
    const latencies: number[] = [];
    let errorCount = 0;

    // 1. Setup User Simulator (logic integrated into generateContent calls)

    // 2. Setup System Under Test (Orchestrator)
    // We must capture onAgentResponse to get "Rich" content (Images/Videos)
    let turnMessages: ChatMessage[] = [];
    
    const orchestrator = new AgentOrchestrator({
      apiKey: '', // No longer needed
      rootAgent: agent,
      onAgentResponse: (name, content) => {
          // DEDUPLICATION: Check against the last message in THIS turn buffer
          const lastMsg = turnMessages[turnMessages.length - 1];
          if (lastMsg && lastMsg.content.trim() === content.trim()) return;

          turnMessages.push({
             id: Date.now().toString() + Math.random(),
             role: 'assistant',
             sender: name,
             content: content,
             timestamp: Date.now()
          });
      }
    });

    let currentInput = "Hello."; // Start signal
    const MAX_TURNS = 5;

    try {
      // Initial user message generation (Simulator starts)
      const simStart = await this.retryOperation(() => generateContent({
        model: simulatorModel,
        prompt: `You are simulating a user for a chat agent.
Agent Goal: ${agent.goal}
Scenario: ${scenario}

Start the conversation with a message relevant to the scenario.`
      }));
      const initialMessage = simStart.candidates?.[0]?.content?.parts?.[0]?.text || '';
      currentInput = initialMessage || "Hello.";
      
      transcript.push({
        id: Date.now().toString(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now()
      });

      for (let i = 0; i < MAX_TURNS; i++) {
        turnMessages = []; // Reset buffer for this turn

        // Agent Turn
        const start = performance.now();
        
        try {
          // Filter history for Orchestrator (exclude init system msgs if any)
          const historyForAgent = transcript.map(m => ({ ...m })); 
          // We await sendMessage, but we rely on onAgentResponse to populate turnMessages
          await orchestrator.sendMessage(historyForAgent, currentInput);
        } catch (e) {
          console.error("Agent Error during Sim:", e);
          turnMessages.push({
             id: Date.now().toString(),
             role: 'assistant',
             sender: agent.name,
             content: "**Error**: System failed to respond.",
             timestamp: Date.now()
          });
          errorCount++;
        }
        
        const end = performance.now();
        const latency = Math.round(end - start);
        latencies.push(latency);

        // Assign latency to the last message in the turn (representing completion)
        if (turnMessages.length > 0) {
            turnMessages[turnMessages.length - 1].latency = latency;
            transcript.push(...turnMessages);
        } else if (errorCount === 0) {
             // Edge case: Agent returned empty string (no onAgentResponse fired)
             // This can happen if model output was blocked.
             transcript.push({
                 id: Date.now().toString(),
                 role: 'assistant',
                 sender: agent.name,
                 content: "[No Response]",
                 timestamp: Date.now(),
                 latency: latency
             });
        }

        // Construct full text response for the Simulator to react to
        const fullAgentResponse = turnMessages.map(m => m.content).join('\n\n');

        // Stop if agent has effectively ended conversation or error
        if (fullAgentResponse.includes("**Error**")) break;

        // Simulator Turn (React to agent)
        if (i < MAX_TURNS - 1) {
          const history = transcript.map(m => ({ role: m.role, content: m.content }));
          const agentResponse = fullAgentResponse;

          const simResponse = await this.retryOperation(() => generateContent({
            model: simulatorModel,
            prompt: `History: ${JSON.stringify(history)}
Agent just said: ${agentResponse}
Reply as the user in the scenario: ${scenario}`
          }));

          const userReply = simResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
          currentInput = userReply || ".";
            
            transcript.push({
                id: Date.now().toString(),
                role: 'user',
                content: currentInput,
                timestamp: Date.now()
            });
        }
      }
    } catch (e) {
      console.error("Simulation Critical Failure:", e);
      errorCount = MAX_TURNS; // Assume full failure
    }

    // 3. Evaluate the Session (LLM-as-a-Judge)
    const metrics = await this.evaluateTranscript(scenario, transcript, errorCount, latencies);

    return {
      id: sessionId,
      scenario,
      transcript,
      metrics,
      stats: {
        avgLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        errorRate: (errorCount / MAX_TURNS) * 100
      }
    };
  }

  /**
   * Uses Gemini 3 Pro (with Flash fallback) to judge the transcript.
   */
  private async evaluateTranscript(
    scenario: string, 
    transcript: ChatMessage[],
    errorCount: number,
    latencies: number[]
  ): Promise<EvaluationMetric[]> {
    // Compress content (remove base64 images) before sending to Judge to avoid token limits
    const conversationText = transcript.map(m => `${m.role.toUpperCase()} (${m.latency ? m.latency + 'ms' : ''}): ${compressForJudge(m.content)}`).join('\n');
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    const prompt = `
      Evaluate the following interaction between a User and an AI Agent.
      
      SCENARIO: ${scenario}
      
      TRANSCRIPT:
      ${conversationText}
      
      SYSTEM STATS:
      - Average Latency: ${avgLatency}ms
      - API Errors: ${errorCount}
      
      Rate the agent on a scale of 1-10 (10 being best) for the following metrics:
      1. **Response Time**: Qualitative assessment. Is it fast enough for chat? (<1500ms is great, >5000ms is poor).
      2. **Accuracy**: Did the agent provide correct, relevant info based on the scenario?
      3. **User Satisfaction**: Was the user happy? Did the agent solve the problem?
      4. **System Stability**: Based on errors and consistency.
      
      OUTPUT JSON ONLY (Array of objects):
      [
        { "name": "Response Time", "score": number, "reasoning": "string" },
        { "name": "Accuracy", "score": number, "reasoning": "string" },
        { "name": "User Satisfaction", "score": number, "reasoning": "string" },
        { "name": "System Stability", "score": number, "reasoning": "string" }
      ]
    `;

    try {
      const result = await this.retryOperation(() => generateContent({
        model: 'gemini-3-pro-preview',
        prompt: prompt,
        responseMimeType: 'application/json'
      }));

      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const cleaned = cleanJson(result.candidates[0].content.parts[0].text);
        return JSON.parse(cleaned);
      }
    } catch (e) {
      console.warn("Gemini 3 Pro Evaluation failed, attempting fallback to Flash...", e);
    }

    // Attempt 2: Gemini 2.5 Flash Fallback
    try {
      const result = await this.retryOperation(() => generateContent({
            model: 'gemini-2.5-flash',
        prompt: prompt,
        responseMimeType: 'application/json'
        }));

      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const cleaned = cleanJson(result.candidates[0].content.parts[0].text);
            return JSON.parse(cleaned);
        }
    } catch (e) {
        console.error("All Evaluation Attempts Failed:", e);
    }

    // Default Error Response
    return [
      { name: 'Response Time', score: 0, reasoning: 'Evaluation failed to generate.' },
      { name: 'Accuracy', score: 0, reasoning: 'Evaluation failed to generate.' },
      { name: 'User Satisfaction', score: 0, reasoning: 'Evaluation failed to generate.' },
      { name: 'System Stability', score: 0, reasoning: 'Evaluation failed to generate.' }
    ];
  }

  /**
   * Aggregates results into a full report.
   */
  async runFullEvaluation(
    agent: Agent, 
    config: { simulatorModel: string, scenarioCount: number },
    onProgress: (msg: string) => void
  ): Promise<EvaluationReport> {
    
    onProgress("Generating Test Scenarios...");
    const scenarios = await this.generateScenarios(agent, config.scenarioCount);
    const sessions: EvaluationSession[] = [];

    // Concurrency Logic with Stagger
    if (config.scenarioCount <= 3) {
      onProgress(`Running ${config.scenarioCount} simulations in parallel...`);
      
      // Stagger start times by 2000ms to avoid instant rate limiting on start
      const promises = scenarios.map(async (scenario, index) => {
          await new Promise(resolve => setTimeout(resolve, index * 2000));
          return this.runSimulation(agent, scenario, config.simulatorModel);
      });

      const results = await Promise.all(promises);
      sessions.push(...results);
    } else {
      for (let i = 0; i < scenarios.length; i++) {
        onProgress(`Running simulation ${i + 1}/${scenarios.length}...`);
        const result = await this.runSimulation(agent, scenarios[i], config.simulatorModel);
        sessions.push(result);
      }
    }

    onProgress("Compiling Report...");

    // Calculate Averages
    const totalSessions = sessions.length;
    const avgResponse = sessions.reduce((sum, s) => sum + (s.metrics.find(m => m.name === 'Response Time')?.score || 0), 0) / totalSessions;
    const avgAccuracy = sessions.reduce((sum, s) => sum + (s.metrics.find(m => m.name === 'Accuracy')?.score || 0), 0) / totalSessions;
    const avgSatisfaction = sessions.reduce((sum, s) => sum + (s.metrics.find(m => m.name === 'User Satisfaction')?.score || 0), 0) / totalSessions;
    const avgStability = sessions.reduce((sum, s) => sum + (s.metrics.find(m => m.name === 'System Stability')?.score || 0), 0) / totalSessions;
    const avgTotal = (avgResponse + avgAccuracy + avgSatisfaction + avgStability) / 4;

    return {
      id: Date.now().toString(),
      timestamp: new Date(),
      config,
      sessions,
      summary: {
        avgScore: parseFloat(avgTotal.toFixed(1)),
        avgResponseScore: parseFloat(avgResponse.toFixed(1)),
        avgAccuracy: parseFloat(avgAccuracy.toFixed(1)),
        avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
        avgStability: parseFloat(avgStability.toFixed(1))
      }
    };
  }
}
