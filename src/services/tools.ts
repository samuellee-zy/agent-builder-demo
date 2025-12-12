
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
  },
  publish_report: {
    id: 'publish_report',
    name: 'Publish Report',
    description: 'Publishes a formatted report to the user interface.',
    category: 'Utility',
    functionDeclaration: {
      name: 'publish_report',
      description: 'Publishes a structured report with markdown content.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'The title of the report.' },
          content: { type: Type.STRING, description: 'The main content of the report in Markdown format.' },
          summary: { type: Type.STRING, description: 'A brief summary or executive abstract.' }
        },
        required: ['title', 'content', 'summary']
      }
    },
    executable: async ({ title, content, summary }: { title: string, content: string, summary: string }) => {
      // The result is returned to the agent, but the UI will intercept this tool call to render the card.
      return JSON.stringify({
        status: 'success',
        message: 'Report published to UI.',
        data: { title, content, summary }
      });
    }
  },
  nsw_trains_realtime: {
    id: 'nsw_trains_realtime',
    name: 'NSW Trains Realtime',
    description: 'Get real-time trip updates for Sydney Trains network.',
    category: 'Data Retrieval',
    functionDeclaration: {
      name: 'nsw_trains_realtime',
      description: 'Fetches real-time trip updates for Sydney Trains.',
      parameters: {
        type: Type.OBJECT,
        properties: {}, // No params needed for the full feed
      },
    },
    executable: async () => {
      try {
        const response = await fetch('/api/transport/sydneytrains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          const err = await response.json();
          return `Error fetching train data: ${err.error || response.statusText}`;
        }
        const data = await response.json();
        // The feed might be huge. We should probably summarize it or let the agent handle it.
        // For now, let's return a summary or the first few entries if it's too big?
        // Or just return it and rely on the agent to parse.
        // Warning: The raw feed can be very large (MBs).
        // Let's truncate if it's too big or just return the entities count and a sample?
        // The user wants "real time trip updates".
        // Let's return the full data but maybe warn the agent if it's truncated?
        // Actually, for a demo, let's just return it. The Orchestrator might truncate it if it's too large for context.
        return JSON.stringify(data).substring(0, 50000); // Hard cap to prevent browser crash / context explosion
      } catch (e) {
        return `Error: ${e}`;
      }
    }
  },
  nsw_metro_realtime: {
    id: 'nsw_metro_realtime',
    name: 'NSW Metro Realtime',
    description: 'Get real-time trip updates for Sydney Metro network.',
    category: 'Data Retrieval',
    functionDeclaration: {
      name: 'nsw_metro_realtime',
      description: 'Fetches real-time trip updates for Sydney Metro.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    executable: async () => {
      try {
        const response = await fetch('/api/transport/metro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          const err = await response.json();
          return `Error fetching metro data: ${err.error || response.statusText}`;
        }
        const data = await response.json();
        return JSON.stringify(data).substring(0, 50000);
      } catch (e) {
        return `Error: ${e}`;
      }
    }
  },
  nsw_trip_planner: {
    id: 'nsw_trip_planner',
    name: 'NSW Trip Planner',
    description: 'Plan a trip using NSW public transport (Trains, Metro, Buses, Ferries, etc.).',
    category: 'Data Retrieval',
    functionDeclaration: {
      name: 'nsw_trip_planner',
      description: 'Plans a trip between two locations using specified transport modes.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          origin: { type: Type.STRING, description: 'Starting location (e.g., "Central Station", "Bondi Beach").' },
          destination: { type: Type.STRING, description: 'Destination location (e.g., "Manly Wharf", "Parramatta").' },
          mode: {
            type: Type.STRING,
            description: 'Preferred mode of transport. Options: "train", "metro", "bus", "ferry", "lightrail", "coach". Defaults to any.',
            enum: ['train', 'metro', 'bus', 'ferry', 'lightrail', 'coach', 'any']
          }
        },
        required: ['origin', 'destination']
      },
    },
    executable: async ({ origin, destination, mode }: { origin: string, destination: string, mode?: string }) => {
      try {
        // Helper to find a stop ID
        const findStop = async (query: string) => {
          const params = new URLSearchParams({
            type_sf: 'any',
            name_sf: query,
            TfNSWSF: 'true'
          });
          const res = await fetch(`/api/transport/planner/stop_finder?${params}`);
          if (!res.ok) throw new Error(`Stop Finder failed for "${query}"`);
          const data = await res.json();
          return data.locations?.[0]?.id; // Return best match ID
        };

        // 1. Resolve Origin
        const originId = await findStop(origin);
        if (!originId) return `Could not find location: "${origin}"`;

        // 2. Resolve Destination
        const destId = await findStop(destination);
        if (!destId) return `Could not find location: "${destination}"`;

        // 3. Plan Trip
        const tripParams = new URLSearchParams({
          type_origin: 'any',
          name_origin: originId,
          type_destination: 'any',
          name_destination: destId,
          calcNumberOfTrips: '3', // Limit to 3 options
          depArrMacro: 'dep', // Depart after...
          itdDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''), // YYYYMMDD
          itdTime: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''), // HHMM
          TfNSWTR: 'true'
        });

        // Handle Mode Filtering (Exclude others)
        // Modes: 1=Train, 2=Metro, 4=LightRail, 5=Bus, 7=Coach, 9=Ferry, 11=SchoolBus
        if (mode && mode !== 'any') {
          tripParams.set('excludedMeans', 'checkbox');
          const modeMap: Record<string, string> = {
            'train': '1', 'metro': '2', 'lightrail': '4', 'bus': '5', 'coach': '7', 'ferry': '9'
          };
          const targetId = modeMap[mode.toLowerCase()];

          if (targetId) {
            // Exclude everything EXCEPT the target
            Object.values(modeMap).forEach(id => {
              if (id !== targetId) tripParams.append(`exclMOT_${id}`, '1');
            });
          }
        }

        const tripRes = await fetch(`/api/transport/planner/trip?${tripParams}`);
        if (!tripRes.ok) {
          const err = await tripRes.json();
          return `Trip Planner Error: ${JSON.stringify(err)}`;
        }

        const tripData = await tripRes.json();

        // Simplify Output for Agent
        const journeys = tripData.journeys?.map((j: any, i: number) => {
          const legs = j.legs?.map((leg: any) => {
            const transport = leg.transportation;
            const modeName = transport?.product?.name || transport?.name || 'Walk';
            const origin = leg.origin?.name || 'Unknown';
            const dest = leg.destination?.name || 'Unknown';
            const startTime = leg.origin?.departureTimeEstimated || leg.origin?.departureTimePlanned;
            const endTime = leg.destination?.arrivalTimeEstimated || leg.destination?.arrivalTimePlanned;

            // Format times to HH:MM
            const formatTime = (t: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '?';

            return `${modeName} from ${origin} (${formatTime(startTime)}) to ${dest} (${formatTime(endTime)})`;
          }).join('\n    ↓\n  ');

          const totalDuration = Math.round((new Date(j.legs[j.legs.length - 1].destination.arrivalTimePlanned).getTime() - new Date(j.legs[0].origin.departureTimePlanned).getTime()) / 60000);

          return `Option ${i + 1} (${totalDuration} min):\n  ${legs}`;
        }).join('\n\n');

        return journeys || 'No journeys found.';

      } catch (e: any) {
        return `Error planning trip: ${e.message}`;
      }
    }
  }
};

export const AVAILABLE_TOOLS_LIST = Object.values(AVAILABLE_TOOLS_REGISTRY);
