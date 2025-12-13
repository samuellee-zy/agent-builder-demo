/**
 * @file src/types.ts
 * @description Core Data Models and Type Definitions.
 * 
 * This file serves as the Single Source of Truth for the application's data structures.
 * It defines the shape of Agents, Sessions, Tools, and Analysis data.
 */

import { FunctionDeclaration } from "@google/genai";

/**
 * Represents a single AI Agent in the system.
 * This structure supports recursion via the `subAgents` field, enabling complex hierarchies.
 */
export interface Agent {
  /** Unique UUID for the agent. */
  id: string;
  /** Display name of the agent. */
  name: string;
  /** Short description of the agent's role (visible to other agents). */
  description: string;
  /** The primary objective of the agent. */
  goal: string;
  /** System instructions/prompt for the agent. */
  instructions: string;
  /** Array of Tool IDs that this agent allows. */
  tools: string[];
  /** Model ID (e.g., 'gemini-2.5-flash'). */
  model: string;
  /** Tags for categorization/filtering. */
  tags?: string[];
  /** Creation timestamp. */
  createdAt: Date;
  /** Recursive list of sub-agents (children). */
  subAgents?: Agent[];
  
  // -- Architecture Patterns --
  /**
   * 'agent': A standard functional agent.
   * 'group': A container for multiple sub-agents.
   */
  type: 'agent' | 'group';
  /**
   * Execution mode for groups:
   * 'sequential': A -> B -> C (Pipeline). Output of A is context for B.
   * 'concurrent': A + B + C (Parallel). All run independently, results aggregated.
   */
  groupMode?: 'sequential' | 'concurrent';

  // -- Historical Data --
  /** Chat history sessions. */
  sessions?: AgentSession[];
  /** Evaluation reports from the 'Test' phase. */
  evaluations?: EvaluationReport[];
  
  // -- Watchtower Cache --
  /** Cached analysis results from the Watchtower service. */
  watchtowerAnalysis?: WatchtowerAnalysis;
}

/**
 * Represents a chat session history.
 */
export interface AgentSession {
  id: string;
  timestamp: Date;
  messages: ChatMessage[];
}

/**
 * A single message in the chat transcript.
 * Supports rich metadata for tool calls, reports, and latency tracking.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Name of the specific agent who generated this message (useful in multi-agent chats). */
  sender?: string;
  content: string;
  timestamp: number;
  /** API Latency in milliseconds (for performance tracking). */
  latency?: number;

  /**
   * Structured data for UI visualization of tool executions.
   * Allows the UI to render "Thinking..." states or specific tool outputs.
   * Captured by the Orchestrator during the Function Calling loop.
   */
  toolCalls?: { name: string; args: any; result?: any }[];

  /** 
   * For the 'publish_report' tool.
   * Content here is rendered as a special Report Card UI.
   */
  reportData?: { title: string; content: string; summary: string };

  /** 
   * If true, this message is hidden from the UI but still sent to the model context.
   * Used for 'silent handoffs' or system prompts.
   */
  hidden?: boolean;
}

/**
 * Phases of the Agent Builder wizard.
 */
export type BuildStep = 'input' | 'building' | 'review' | 'testing';

/**
 * Defines an executable capability (Tool) available to agents.
 * Maps to a function declaration in the AI Model.
 */
export interface Tool {
  /** Unique identifier (e.g., 'google_search'). */
  id: string;
  /** Human-readable name (e.g., 'Google Search'). */
  name: string;
  /** Description of what the tool does (used for RAG/Discovery). */
  description: string;
  /** Tags for categorization/filtering (e.g., 'Grounding', 'Utility'). */
  tags: string[];
  /** @deprecated Use `tags` instead. Broad category. */
  category?: string;
  /** The schema configuration sent to the Gemini API. */
  functionDeclaration: FunctionDeclaration; 
  /** The actual JavaScript implementation of the tool. */
  executable: (args: any) => Promise<any> | any;
}

// Watchtower / Analysis Interfaces
export interface IntentGroup {
  id: string;
  name: string; // e.g. "Order Status Inquiry"
  description: string;
  count: number; // How many times this intent was detected
  avgSentiment: number; // 0-100
  avgLatency: number;
  sampleSessionIds: string[];
}

export interface WatchtowerRecommendation {
  id: string;
  category: 'Knowledge' | 'Tooling' | 'Behavior';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  actionContext?: string; // Code snippet or instruction text to apply
}

export interface WatchtowerAnalysis {
  timestamp: Date;
  sessionsAnalyzed: number;
  globalScore: number; // 0-100 satisfaction
  intents: IntentGroup[];
  recommendations: WatchtowerRecommendation[];
  stats: {
    avgLatency: number;
    errorRate: number;
    totalMessages: number;
  };
}

// -- Evaluation Interfaces --

export interface EvaluationMetric {
  name: 'Response Time' | 'Accuracy' | 'User Satisfaction' | 'System Stability';
  score: number; // 1-10
  reasoning: string;
}

/**
 * Represents a full "Runs" of the evaluation suite.
 * Contains aggregate metrics and individual scenarios.
 */
/**
 * Represents a full "Runs" of the evaluation suite.
 * Contains aggregate metrics and individual scenarios.
 */
export interface EvaluationReport {
  /** Unique ID for this report. */
  id: string;
  /** (Optional) ID of the agent being evaluated. */
  agentId?: string;
  /** When the evaluation was run. */
  timestamp: Date;
  /** Configuration used for this evaluation run. */
  config: { simulatorModel: string, scenarioCount: number };
  /**
   * Quantitative summary stats.
   */
  summary: {
    avgScore: number;
    avgResponseScore: number;
    avgAccuracy: number;
    avgSatisfaction: number;
    avgStability: number;
  };
  /** List of all sessions in this report. */
  sessions: EvaluationSession[];
}

/**
 * A grouping of user interactions for a specific agent.
 * Used for history replay.
 */
export interface EvaluationSession {
  /** Sequential, user-friendly ID (e.g., "Session #1"). */
  id: string;
  /** The scenario script/intent being tested. */
  scenario: string;
  /** The chat history. */
  transcript: ChatMessage[];
  /** Metrics returned by the Judge. */
  metrics: EvaluationMetric[];
  /** Stats for this specific session. */
  stats: {
    avgLatency: number;
    errorRate: number;
  };
  /** When this session occurred. */
  timestamp?: string;
}

/**
 * Output from the Watchtower Observability service.
 * Represents a batch analysis of agent performance.
 */
// NOTE: Duplicate WatchtowerAnalysis definition removed. 
// Use the one defined at line 148.

/**
 * A cluster of sessions that share a common user goal.
 */
// NOTE: Duplicate IntentGroup definition removed.
// Use the one defined at line 129.

/**
 * List of available Gemini models with metadata.
 * These are displayed in the "Model" dropdown in the Agent Builder.
 */
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, cost-efficient, low latency.' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash Lite', description: 'Extremely cost-effective, high throughput.' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Best for reasoning and coding.' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'General image generation and editing.' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Image)', description: 'High-quality image generation and editing.' },
  { id: 'veo-3.1-fast-generate-001', name: 'Veo 3.1 Fast', description: 'Rapid video generation.' },
  { id: 'imagen-4.0-generate-001', name: 'Imagen 4', description: 'Photorealistic image generation.' },
  { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', description: 'Fast photorealistic image generation.' },
];

export const AVAILABLE_TOOLS = [
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations.',
    category: 'Utility',
    tags: ['Utility', 'Math'],
    code: `// Calculator Tool
export const calculator = ({ expression }) => {
  try {
    return Function(\`"use strict"; return (\${expression})\`)();
  } catch (e) {
    return \`Error: \${e}\`;
  }
}`
  },
  {
    id: 'get_current_time',
    name: 'System Time',
    description: 'Get the current date and time.',
    category: 'Utility',
    tags: ['Utility', 'Time'],
    code: `// System Time Tool
export const get_current_time = () => {
  return new Date().toISOString();
}`
  },
  {
    id: 'web_search_mock',
    name: 'Simulated Web Search',
    description: 'Simulates a search engine for demo purposes.',
    category: 'Data Retrieval',
    tags: ['Data Retrieval', 'Search'],
    code: `// Mock Search Tool
export const web_search_mock = async ({ query }) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { title: \`\${query} - Wikipedia\`, snippet: '...' },
    { title: \`Latest News on \${query}\`, snippet: '...' }
  ];
}`
  }
];

// Initial empty state
export const SAMPLE_AGENTS: Agent[] = [];

// Global type augmentation for AI Studio
// Redundant global declaration removed. 
// See src/global.d.ts for Window interface augmentations.