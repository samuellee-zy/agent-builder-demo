import { FunctionDeclaration } from "@google/genai";

export interface Agent {
  id: string;
  name: string;
  description: string;
  goal: string;
  instructions: string;
  tools: string[]; // IDs of tools
  model: string;
  createdAt: Date;
  subAgents?: Agent[];
  
  // Architecture Patterns
  type: 'agent' | 'group';
  groupMode?: 'sequential' | 'concurrent';

  // Historical Data
  sessions?: AgentSession[];
  evaluations?: EvaluationReport[];
  
  // Watchtower Cache
  watchtowerAnalysis?: WatchtowerAnalysis;
}

export interface AgentSession {
  id: string;
  timestamp: Date;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  sender?: string; // Name of the agent who sent this message
  content: string;
  timestamp: number;
  latency?: number; // In milliseconds
  // For UI visualization of tool calls/thought process
  toolCalls?: { name: string; args: any; result?: any }[];
  reportData?: { title: string; content: string; summary: string }; // For structured reports
  hidden?: boolean; // If true, not shown in UI but sent to model
}

export type BuildStep = 'input' | 'building' | 'review' | 'testing';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  // The schema sent to Gemini
  functionDeclaration: FunctionDeclaration; 
  // The actual JS implementation
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

// Evaluation Interfaces
export interface EvaluationMetric {
  name: 'Response Time' | 'Accuracy' | 'User Satisfaction' | 'System Stability';
  score: number; // 1-10
  reasoning: string;
}

export interface EvaluationSession {
  id: string;
  scenario: string;
  transcript: ChatMessage[];
  metrics: EvaluationMetric[];
  stats: {
    avgLatency: number;
    errorRate: number; // Percentage 0-100
  };
}

export interface EvaluationReport {
  id: string;
  timestamp: Date;
  config: {
    simulatorModel: string;
    scenarioCount: number;
  };
  sessions: EvaluationSession[];
  summary: {
    avgScore: number;
    avgResponseScore: number;
    avgAccuracy: number;
    avgSatisfaction: number;
    avgStability: number;
  };
}

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
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}