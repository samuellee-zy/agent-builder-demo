
import { Tool } from '../types';
import { Type } from '@google/genai';

export const AVAILABLE_TOOLS_REGISTRY: Record<string, Tool> = {
  google_search: {
    id: 'google_search',
    name: 'Google Search',
    description: 'Uses Google Search to ground the response in real-world data and current events.',
    category: 'Grounding',
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
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        return JSON.stringify([
            { title: `${query} - Wikipedia`, snippet: `Detailed information about ${query} from the free encyclopedia.` },
            { title: `Latest News on ${query}`, snippet: `Recent developments and updates regarding ${query}.` },
            { title: `${query} Official Site`, snippet: `Official resources and documentation for ${query}.` }
        ]);
    }
  },
  // --- CUSTOMER SERVICE TOOLS ---
  crm_customer_lookup: {
    id: 'crm_customer_lookup',
    name: 'CRM Customer Lookup',
    description: 'Retrieve customer details, VIP status, and recent interactions by email.',
    category: 'Customer Service',
    functionDeclaration: {
      name: 'crm_customer_lookup',
      description: 'Looks up a customer in the database.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          email: { type: Type.STRING, description: 'Customer email address.' }
        },
        required: ['email']
      }
    },
    executable: async ({ email }: { email: string }) => {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate DB latency
      // Mock Database
      if (email.includes('vip')) {
        return JSON.stringify({
          id: 'CUST-999',
          name: 'Alice Vandergeld',
          tier: 'Platinum VIP',
          ltv: 15400.00,
          last_interaction: '2 days ago - Positive',
          notes: 'Prefer concierge shipping.'
        });
      }
      return JSON.stringify({
        id: 'CUST-102',
        name: 'John Doe',
        tier: 'Standard',
        ltv: 120.50,
        last_interaction: '6 months ago - Neutral',
        notes: 'N/A'
      });
    }
  },
  check_order_status: {
    id: 'check_order_status',
    name: 'Check Order Status',
    description: 'Get the shipping status and delivery date of an order.',
    category: 'Customer Service',
    functionDeclaration: {
      name: 'check_order_status',
      description: 'Checks the status of an order ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          order_id: { type: Type.STRING, description: 'The Order ID (e.g. ORD-123).' }
        },
        required: ['order_id']
      }
    },
    executable: async ({ order_id }: { order_id: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Randomize status for demo
      const statuses = ['Processing', 'Shipped', 'Delivered', 'On Hold'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      return JSON.stringify({
        order_id,
        status,
        estimated_delivery: '2025-10-15',
        carrier: 'FedEx',
        tracking_url: `https://fedex.com/track/${order_id}`
      });
    }
  },
  kb_search: {
    id: 'kb_search',
    name: 'Knowledge Base Search',
    description: 'Search company policies, FAQs, and documentation.',
    category: 'Customer Service',
    functionDeclaration: {
      name: 'kb_search',
      description: 'Searches the internal knowledge base for policy information.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          keywords: { type: Type.STRING, description: 'Search terms.' }
        },
        required: ['keywords']
      }
    },
    executable: async ({ keywords }: { keywords: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      // Mock RAG response
      return JSON.stringify([
        { title: 'Return Policy', content: 'Items can be returned within 30 days of purchase if unworn and tags are attached. Refund processes in 3-5 business days.' },
        { title: 'International Shipping', content: 'We ship to 50+ countries via DHL Express. Customs duties are calculated at checkout.' },
        { title: 'Password Reset', content: 'Go to Settings > Security > Reset Password. A link will be emailed to you.' }
      ]);
    }
  },
  create_support_ticket: {
    id: 'create_support_ticket',
    name: 'Create Support Ticket',
    description: 'Escalate an issue by creating a ticket in the tracking system.',
    category: 'Customer Service',
    functionDeclaration: {
      name: 'create_support_ticket',
      description: 'Creates a new support ticket.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          user_email: { type: Type.STRING, description: 'User email.' },
          subject: { type: Type.STRING, description: 'Ticket subject.' },
          priority: { type: Type.STRING, description: 'High, Medium, or Low.' }
        },
        required: ['user_email', 'subject', 'priority']
      }
    },
    executable: async ({ user_email, subject, priority }: any) => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return JSON.stringify({
        ticket_id: `TKT-${Math.floor(Math.random() * 10000)}`,
        status: 'Open',
        assigned_queue: priority === 'High' ? 'Tier 2 Support' : 'General Inbox',
        created_at: new Date().toISOString()
      });
    }
  }
};

export const AVAILABLE_TOOLS_LIST = Object.values(AVAILABLE_TOOLS_REGISTRY);
