
import { Tool } from '../types';
import { Type } from '@google/genai';

export const AVAILABLE_TOOLS_REGISTRY: Record<string, Tool> = {
  google_search: {
    id: 'google_search',
    name: 'Google Search',
    description: 'Uses Google Search to ground the response in real-world data and current events.',
    category: 'Grounding',
    // Native tools don't need a functionDeclaration for the client-side tool manager, 
    // but we keep the structure compatible. The Orchestrator handles this specially.
    functionDeclaration: {
      name: '__native_google_search__', 
      description: 'Native Google Search Grounding',
    },
    executable: () => { return "Native Feature"; } 
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations.',
    category: 'Utility',
    functionDeclaration: {
      name: 'calculator',
      description: 'Evaluates a mathematical expression.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          expression: {
            type: Type.STRING,
            description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 5").',
          },
        },
        required: ['expression'],
      },
    },
    executable: ({ expression }: { expression: string }) => {
      try {
        // Safe evaluation for demo purposes
        // eslint-disable-next-line no-new-func
        return Function(`"use strict"; return (${expression})`)();
      } catch (e) {
        return `Error: ${e}`;
      }
    },
  },
  get_current_time: {
    id: 'get_current_time',
    name: 'System Time',
    description: 'Get the current date and time.',
    category: 'Utility',
    functionDeclaration: {
      name: 'get_current_time',
      description: 'Returns the current date and time in ISO format.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    executable: () => {
      return new Date().toISOString();
    },
  },
  web_search_mock: {
    id: 'web_search_mock',
    name: 'Simulated Web Search',
    description: 'Simulates a search engine for demo purposes (Mock).',
    category: 'Data Retrieval',
    functionDeclaration: {
      name: 'web_search_mock',
      description: 'Searches the web for information.',
      parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: 'The search query.' }
        },
        required: ['query']
      }
    },
    executable: async ({ query }: { query: string }) => {
        // Realistic mock response since we don't have a real SERP API key for the user
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate latency
        return JSON.stringify([
            { title: `${query} - Wikipedia`, snippet: `Detailed information about ${query} from the free encyclopedia.` },
            { title: `Latest News on ${query}`, snippet: `Recent developments and updates regarding ${query}.` },
            { title: `${query} Official Site`, snippet: `Official resources and documentation for ${query}.` }
        ]);
    }
  }
};

export const AVAILABLE_TOOLS_LIST = Object.values(AVAILABLE_TOOLS_REGISTRY);
