

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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  sender?: string; // Name of the agent who sent this message
  content: string;
  timestamp: number;
  // For UI visualization of tool calls/thought process
  toolCalls?: { name: string; args: any; result?: any }[];
}

export type BuildStep = 'input' | 'building' | 'review' | 'testing';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  // The schema sent to Gemini
  functionDeclaration: FunctionDeclaration; 
  // The actual JS implementation
  executable: (args: any) => Promise<any> | any;
}

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, cost-efficient, low latency.' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Best for reasoning and coding.' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Image)', description: 'High-quality image generation and editing.' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', description: 'Rapid video generation.' },
  { id: 'imagen-4.0-generate-001', name: 'Imagen 3', description: 'Photorealistic image generation.' },
];

export const AVAILABLE_TOOLS = [
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations.',
    category: 'Utility',
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