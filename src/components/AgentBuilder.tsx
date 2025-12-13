/**
 * @file src/components/AgentBuilder.tsx
 * @description The Core "IDE" for Agent Creation and Testing.
 * 
 * WORKFLOW STEPS:
 * 1. **Input (Chat)**: User converses with the "Architect" persona to define requirements.
 * 2. **Building (Spinner)**: The Architect generates a JSON spec for the agent system.
 * 3. **Review (Visual Builder)**: User views the Agent Diagram, edits configs, and refines instructions.
 * 4. **Testing (Simulator)**: User runs the agent in an interactive chat session to verify behavior.
 * 
 * KEY FEATURES:
 * - **Undo/Redo**: Maintains a history stack of Agent configurations.
 * - **Live Preview**: Updates the `AgentDiagram` as you edit.
 * - **Test Environment**: Authentic simulation using `AgentOrchestrator` with real tool execution.
 */

import React, { useState, useRef, useEffect } from 'react';
import { BuildStep, Agent, ChatMessage, AVAILABLE_MODELS, AgentSession } from '../types';
import { AVAILABLE_TOOLS_LIST } from '../services/tools';
import { sendArchitectMessage, generateArchitectureFromChat } from '../services/mockAgentService';
import { AgentOrchestrator } from '../services/orchestrator';
import { GoogleGenAI } from "@google/genai";
import { AgentDiagram } from './AgentDiagram';
import { VideoMessage } from './VideoMessage';
import { PanZoomContainer } from './PanZoomContainer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LocationFinder } from './LocationFinder';
import { TransportModeSelector } from './TransportModeSelector';
import { get, set } from 'idb-keyval';
import { 
  Sparkles, 
  ArrowRight, 
  Bot, 
  Layers,
  ArrowDownCircle,
  Zap,
  Network,
  Wrench,
  Check,
  Paperclip,
  Play,
  Terminal,
  CreditCard,
  AlertTriangle,
  Film,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  PencilRuler,
  MessageSquarePlus,
  Download,
  ChevronDown,
    ChevronLeft,
  ChevronRight,
    Undo2,
    MapPin,
    Train,
    Settings,
    X,
    Tag
} from 'lucide-react';

interface AgentBuilderProps {
  onAgentCreated: (agent: Agent) => void;
  initialAgent?: Agent; // Support reloading an existing agent
    draftId?: string;
    isEmbedded?: boolean;
    onSelectAgent?: (agent: Agent) => void;
}



export const AgentBuilder: React.FC<AgentBuilderProps> = ({ onAgentCreated, initialAgent, draftId, isEmbedded = false, onSelectAgent }) => {
    const [step, setStep] = useState<BuildStep>(initialAgent ? 'review' : 'input');
  
  // Step 1: Chat/Input State
  const [hasStarted, setHasStarted] = useState(false);
  const [architectMessages, setArchitectMessages] = useState<ChatMessage[]>([]);
  const [architectInput, setArchitectInput] = useState('');
  const [isArchitectTyping, setIsArchitectTyping] = useState(false);
  const [showToolSelector, setShowToolSelector] = useState(false);
    const [architectModel, setArchitectModel] = useState('gemini-2.5-flash');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Step 2 & 3: Generation & Architect View State
  const [rootAgent, setRootAgent] = useState<Agent | null>(initialAgent || null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(initialAgent?.id || null);
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Undo/History State
  const [history, setHistory] = useState<Agent[]>([]);

  // Step 4: Testing & Billing State
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolLog, setActiveToolLog] = useState<string | null>(null);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
    const [showLocationFinder, setShowLocationFinder] = useState(false);
    const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const testInputRef = useRef<HTMLInputElement>(null);
  const [lastError, setLastError] = useState<string | null>(null);

    const [apiKey, setApiKey] = useState('managed'); // Default to managed

    // Track previous agent ID to prevent unnecessary resets
    const prevAgentIdRef = useRef<string | null>(null);

  // Load initial agent if provided
  useEffect(() => {
    if (initialAgent) {
      setRootAgent(initialAgent);

        // Only reset view state if we've actually switched agents
        if (initialAgent.id !== prevAgentIdRef.current) {
            setSelectedAgentId(initialAgent.id);
            setStep('review');
            setHistory([]); // Reset history on load
            prevAgentIdRef.current = initialAgent.id;
        }
    }
  }, [initialAgent]);

    // --- Persistence Logic ---
  useEffect(() => {
      const loadChat = async () => {
          // If we have an initial agent, use its ID. Otherwise use the draftId.
          // Fallback to 'new_draft' only if draftId is missing (shouldn't happen with new App.tsx)
          const key = `architect_chat_${initialAgent?.id || draftId || 'new_draft'}`;
          try {
              const saved = await get<ChatMessage[]>(key);
              if (saved && saved.length > 0) {
                  setArchitectMessages(saved);
              } else if (!initialAgent) {
                  // Only reset if no saved chat AND no initial agent (fresh start)
                  setArchitectMessages([{
                      id: 'init',
                      role: 'assistant',
                      content: "Hi! I'm your AI Architect. What kind of agent or multi-agent system would you like to build today? You can describe a simple task or a complex workflow.",
                      timestamp: Date.now()
                  }]);
              }
          } catch (e) {
              console.error("Failed to load architect chat:", e);
          }
      };
      loadChat();
  }, [initialAgent?.id, draftId]);

    useEffect(() => {
        if (architectMessages.length > 0) {
            // If rootAgent exists (created), use its ID. Else use draftId.
            const key = `architect_chat_${rootAgent?.id || draftId || 'new_draft'}`;
            set(key, architectMessages).catch(e => console.error("Failed to save chat:", e));
        }
    }, [architectMessages, rootAgent?.id, draftId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [architectMessages, isArchitectTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages, activeToolLog]);

  // Auto-focus logic for test input
  useEffect(() => {
      if (!isTyping && step === 'testing') {
          setTimeout(() => {
             testInputRef.current?.focus();
          }, 100);
      }
  }, [isTyping, step]);

  // --- Session Sync Logic ---
  useEffect(() => {
    // Whenever testMessages changes, sync it to the current agent session and persist
    if (step === 'testing' && rootAgent && currentSessionId && testMessages.length > 0) {
        const sessions = rootAgent.sessions || [];
        const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        
        let updatedSessions = [...sessions];
        if (sessionIndex >= 0) {
            updatedSessions[sessionIndex] = { ...updatedSessions[sessionIndex], messages: testMessages };
        } else {
             // Should verify it exists, but safe fallback
             updatedSessions = [{ id: currentSessionId, timestamp: new Date(), messages: testMessages }, ...updatedSessions];
        }

        const updatedAgent = { ...rootAgent, sessions: updatedSessions };
        setRootAgent(updatedAgent); // Update local state
        onAgentCreated(updatedAgent); // Persist to storage
    }
  }, [testMessages, currentSessionId, step]);


  // --- Architect Chat Logic ---

    /**
     * Sends user input to the Architect Persona.
     * Updates local chat state and triggers the mock agent service.
     * 
     * FLOW:
     * 1. Updates UI with user message immediately.
     * 2. Calls `sendArchitectMessage` (Gemini 2.5/3.0).
     * 3. Appends response to history.
     */
  const handleArchitectSend = async () => {
    if (!architectInput.trim()) return;
    if (!hasStarted) setHasStarted(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: architectInput,
      timestamp: Date.now()
    };

    setArchitectMessages(prev => [...prev, userMsg]);
    setArchitectInput('');
    setIsArchitectTyping(true);

    try {
        const replyText = await sendArchitectMessage(architectMessages, userMsg.content, architectModel);
      setArchitectMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: Date.now()
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsArchitectTyping(false);
    }
  };

    /**
     * Triggers the "Build" phase.
     * Uses the full chat history to generate the initial Agent Configuration JSON.
     * 
     * TRANSITION:
     * - Moves state from 'input' -> 'building' -> 'review'.
     * - Hydrates the generated JSON with ID and Defaults.
     */
  const handleBuildFromChat = async () => {
    setStep('building');
    try {
        const result = await generateArchitectureFromChat(architectMessages);
        setRootAgent(result);
        setSelectedAgentId(result.id);
        setHistory([]); // Reset history for new build
        onAgentCreated(result); // Persist immediately
        setStep('review');
    } catch (e) {
        console.error(e);
        setStep('input');
    }
  };

    /**
     * Manual override to skip chat and start with a blank slate.
     */
  const handleSkipToVisualBuilder = () => {
    const defaultRoot: Agent = {
        id: `root-${Date.now()}`,
        name: 'Root Agent',
        description: 'Main coordinator for this system.',
        goal: 'Coordinate sub-agents to achieve the user objective.',
        instructions: 'You are the primary coordinator. Your role is to understand user requests and delegate tasks to your sub-agents efficiently.',
        tools: [],
        model: 'gemini-2.5-flash',
        createdAt: new Date(),
        subAgents: [],
        type: 'agent',
        sessions: []
    };
    setRootAgent(defaultRoot);
    setSelectedAgentId(defaultRoot.id);
    setHistory([]);
    onAgentCreated(defaultRoot);
    setStep('review');
  };

    // --- Helper Functions ---
    const saveCheckpoint = () => {
        if (rootAgent) {
            setHistory(prev => [...prev, rootAgent]);
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setRootAgent(previous);
        onAgentCreated(previous);
        // If selected agent no longer exists, reset selection
        // Simple check: if we can't find selectedAgentId in previous, reset to root
        // For now, just keep selection or reset to root if needed.
    };

    const updateAgentInTree = (updatedAgent: Agent, currentRoot: Agent): Agent => {
        if (currentRoot.id === updatedAgent.id) {
            return updatedAgent;
        }
        if (currentRoot.subAgents) {
            return {
                ...currentRoot,
                subAgents: currentRoot.subAgents.map(sub => updateAgentInTree(updatedAgent, sub))
            };
        }
        return currentRoot;
    };

    const addSubNode = (parentId: string, currentRoot: Agent, type: 'agent' | 'group', groupMode?: 'sequential' | 'concurrent'): Agent => {
        if (currentRoot.id === parentId) {
            const newSub: Agent = {
                id: `${type}-${Date.now()}`,
                name: type === 'group' ? 'New Group' : 'New Agent',
                description: 'Description...',
                goal: 'Goal...',
                instructions: 'Instructions...',
                tools: [],
                model: 'gemini-2.5-flash',
                createdAt: new Date(),
                subAgents: [],
                type: type,
                groupMode: groupMode
            };
            return {
                ...currentRoot,
                subAgents: [...(currentRoot.subAgents || []), newSub]
            };
        }
        if (currentRoot.subAgents) {
            return {
                ...currentRoot,
                subAgents: currentRoot.subAgents.map(sub => addSubNode(parentId, sub, type, groupMode))
            };
        }
        return currentRoot;
    };

    const deleteNodeFromTree = (nodeId: string, currentRoot: Agent): Agent | null => {
        if (currentRoot.id === nodeId) return null; // Can't delete root this way usually, or handled by caller

        if (currentRoot.subAgents) {
            const filtered = currentRoot.subAgents
                .map(sub => deleteNodeFromTree(nodeId, sub))
                .filter((sub): sub is Agent => sub !== null);

            return {
                ...currentRoot,
                subAgents: filtered
            };
        }
        return currentRoot;
    };

    const handleDeleteNode = (nodeId: string) => {
        if (!rootAgent) return;
        if (nodeId === rootAgent.id) return; // Prevent deleting root

        saveCheckpoint();
        const newRoot = deleteNodeFromTree(nodeId, rootAgent);
        if (newRoot) {
            setRootAgent(newRoot);
            onAgentCreated(newRoot);
            if (selectedAgentId === nodeId) {
                setSelectedAgentId(newRoot.id);
            }
        }
    };

    // Derived state for selected agent
    const findAgent = (id: string | null, current: Agent | null): Agent | null => {
        if (!id || !current) return null;
        if (current.id === id) return current;
        if (current.subAgents) {
            for (const sub of current.subAgents) {
                const found = findAgent(id, sub);
                if (found) return found;
            }
        }
        return null;
    };

    const selectedAgent = findAgent(selectedAgentId, rootAgent);

  const handleUpdateSelectedAgent = (updates: Partial<Agent>) => {
    if (!selectedAgent || !rootAgent) return;
    const updated = { ...selectedAgent, ...updates };
    const newRoot = updateAgentInTree(updated, rootAgent);
    setRootAgent(newRoot);
    onAgentCreated(newRoot);
  };

  const handleToggleTool = (toolId: string) => {
    if (!selectedAgent) return;
    const currentTools = selectedAgent.tools || [];
    if (currentTools.includes(toolId)) {
      handleUpdateSelectedAgent({ tools: currentTools.filter(t => t !== toolId) });
    } else {
      handleUpdateSelectedAgent({ tools: [...currentTools, toolId] });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
        prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleAddSub = (parentId: string, type: 'agent' | 'group', groupMode?: 'sequential' | 'concurrent') => {
    if (!rootAgent) return;
    saveCheckpoint(); // Save state before add
    const newRoot = addSubNode(parentId, rootAgent, type, groupMode);
    setRootAgent(newRoot);
    onAgentCreated(newRoot);
  };

    const handleConsultArchitect = () => {
        if (!rootAgent) return;

        // Create a hidden system message with the current state
        const stateMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user', // Using user role so it's part of the conversation history for the model
            content: `[SYSTEM UPDATE] User has manually modified the agent configuration. Current State:\n\`\`\`json\n${JSON.stringify(rootAgent, null, 2)}\n\`\`\`\nPlease acknowledge this update and wait for user instructions.`,
            timestamp: Date.now(),
            hidden: true
        };

        setArchitectMessages(prev => {
            // FIX: Filter out hidden messages to find the last VISIBLE message
            const visibleMessages = prev.filter(m => !m.hidden);
            const lastVisibleMsg = visibleMessages[visibleMessages.length - 1];
            const isLastMsgSync = lastVisibleMsg && lastVisibleMsg.content === "I've synced your manual changes. What would you like to do next?";

            if (isLastMsgSync) {
                return [...prev, stateMessage];
            }

            return [...prev, stateMessage, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I've synced your manual changes. What would you like to do next?",
                timestamp: Date.now() + 1
            }];
        });
        setStep('input');
        setHasStarted(true); // Explicitly enter chat mode when consulting
    };

  const handleEnhanceInstructions = async () => {
    if (!selectedAgent || !enhancePrompt.trim()) return;
    setIsEnhancing(true);
    try {
        const prompt = `Rewrite AOP for Agent '${selectedAgent.name}' to be professional markdown. 
        
        Current Goal: ${selectedAgent.goal}
        User Request: ${enhancePrompt}
        
        Current Instructions:
        ${selectedAgent.instructions}
        
        Output ONLY the new markdown instructions.`;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                prompt: prompt
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            handleUpdateSelectedAgent({ instructions: text });
            setEnhancePrompt(''); 
        }
    } catch (e) {
        console.error("Enhance failed:", e);
    } finally {
        setIsEnhancing(false);
    }
  };

  // --- Real Orchestration Testing Logic ---

    /**
     * Initializes a new Testing Session.
     * - Creates a new Session ID (Sequential).
     * - Injects the initial "System Online" message.
     * - Updates the Agent's session history in storage.
     * - Checks for Paid Model usage (Veo/Imagen) to warn users if needed.
     */
  const handleStartTest = async () => {
      try {
          console.log("Starting deployment sequence...");
          if (!rootAgent) {
              console.error("No root agent found");
              return;
          }

      // Check for paid models
      // Billing check removed for Vertex AI migration (handled by backend/ADC)
      // const requiresBilling = AgentOrchestrator.isPaidModelInUse(rootAgent);
      // if (requiresBilling) { ... }

        const initMsg: ChatMessage = {
            id: 'init',
            role: 'assistant',
            sender: 'System',
            content: `System Online. Coordinator '${rootAgent.name}' initialized. I am ready to orchestrate your request.`,
            timestamp: Date.now()
        };

        setTestMessages([initMsg]);

        // Create new Session with Sequential ID (1, 2, 3...)
        const sessions = rootAgent.sessions || [];

        // Filter out old timestamp-based IDs (typically > 1 trillion) to find the max sequential ID
        // Heuristic: IDs smaller than 1 billion are treated as sequential counters.
        const sequentialIds = sessions
            .map(s => parseInt(s.id, 10))
            .filter(id => !isNaN(id) && id < 1000000000);

        const nextId = sequentialIds.length > 0 ? Math.max(...sequentialIds) + 1 : 1;
        const newSessionId = nextId.toString();

        const newSession: AgentSession = {
            id: newSessionId,
            timestamp: new Date(),
            messages: [initMsg]
        };

        const updatedAgent = {
            ...rootAgent,
            sessions: [newSession, ...(rootAgent.sessions || [])]
        };
        setRootAgent(updatedAgent);
        onAgentCreated(updatedAgent); // Initial Save
        setCurrentSessionId(newSessionId);

        setStep('testing');
        setLastError(null);
    } catch (e: any) {
        console.error("Deployment failed:", e);
        setLastError(`Deployment failed: ${e.message}`);
    }
  };

  const handleNewConversation = () => {
      handleStartTest();
  };

    /**
     * Sends a user message to the active Test Session.
     * Uses `AgentOrchestrator` to execute the agent logic (tools, delegation, etc.).
     * 
     * LOGIC:
     * 1. Instantiates `AgentOrchestrator` with current Root Agent.
     * 2. Registers callbacks for Tool Execution logging (for UI "Thinking" state).
     * 3. Calls `orchestrator.sendMessage`.
     * 4. Handles errors and updates the chat transcript.
     * 
     * @param inputOverride - Optional message text (used for retries or programmatic sends).
     */
  const handleTestSendMessage = async (inputOverride?: string) => {
    const textToSend = inputOverride || testInput;
    if (!textToSend.trim() || !rootAgent) return;
    
    // If it's a new message (not a retry), add to UI
    if (!inputOverride) {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };
        setTestMessages(prev => [...prev, userMsg]);
        setTestInput('');
    }
    
    setIsTyping(true);
    setLastError(null);

    try {
        const orchestrator = new AgentOrchestrator({
        rootAgent: rootAgent,
        onToolStart: (agent, tool, args) => {
          if (tool === 'delegate_to_agent') {
              setActiveToolLog(`${agent} delegating to ${args.agentName}...`);
          } else if (tool === 'generateVideos') {
              setActiveToolLog(`${agent} generating video (Veo)...`);
          } else if (tool === 'generateImages') {
              setActiveToolLog(`${agent} generating image (Imagen)...`);
          } else {
              setActiveToolLog(`${agent} using ${tool}...`);
          }
        },
        onToolEnd: (agent, tool, result) => {
          setActiveToolLog(null);
            if (tool === 'publish_report') {
                try {
                    const parsed = JSON.parse(result);
                    if (parsed.data) {
                        setTestMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'assistant',
                            sender: agent,
                            content: '', // Empty content as we use reportData
                            reportData: parsed.data,
                            timestamp: Date.now()
                        }]);
                    }
                } catch (e) {
                    console.error("Failed to parse report data", e);
                }
            }
        },
        onAgentResponse: (agentName, content) => {
            // DEDUPLICATION: Check if the last message is identical to avoid "Echoing" effect
            setTestMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.content.trim() === content.trim()) {
                    // console.debug(`Ignoring duplicate message from ${agentName}`);
                    return prev;
                }
                return [...prev, {
                    id: Date.now().toString() + Math.random(),
                    role: 'assistant',
                    sender: agentName,
                    content: content,
                    timestamp: Date.now()
                }];
            });
        }
      });

      // Filter previous messages and map to chat history format
      const history = testMessages.filter(m => m.id !== 'init');
      
      await orchestrator.sendMessage(history, textToSend);

    } catch (error) {
      console.error("Orchestration Error:", error);
      setLastError(textToSend); // Store for retry
      setTestMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Error:** System encountered an issue.`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
      setActiveToolLog(null);
    }
  };

  const handleRetry = () => {
      if (lastError) {
          handleTestSendMessage(lastError);
      }
  };

  const handleBillingConfirm = async () => {
      try {
          await window.aistudio.openSelectKey();
          setShowBillingDialog(false);
          // Retry start
          handleStartTest();
      } catch (e) {
          console.error("Failed to open select key:", e);
      }
  };

    const handleLocationSelect = (location: string) => {
        setTestInput(prev => `${prev} ${location}`.trim());
        setShowLocationFinder(false);
        testInputRef.current?.focus();
    };

    const handleModeSelect = (mode: string) => {
        setTestInput(prev => `${prev} via ${mode}`.trim());
        setShowModeSelector(false);
        testInputRef.current?.focus();
    };

  // --- RENDERERS ---

  const renderToolSelector = () => (
      <>
          {/* Mobile Backdrop */}
          <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowToolSelector(false)}
          />

          {/* Responsive Container */}
          <div className={`
            z-50 overflow-hidden bg-slate-800 border-slate-700 shadow-xl
            
            /* Mobile: Bottom Sheet */
            fixed bottom-0 left-0 right-0 rounded-t-2xl border-t
            lg:absolute lg:bottom-12 lg:right-0 lg:w-64 lg:rounded-xl lg:border
        `}>
              <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Available Tools</h4>
                  <button onClick={() => setShowToolSelector(false)} className="lg:hidden text-slate-400">
                      <ChevronDown size={16} />
                  </button>
              </div>
              <div className="max-h-[50vh] lg:max-h-64 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                  {AVAILABLE_TOOLS_LIST.map(tool => (
                      <div key={tool.id} className="px-3 py-3 lg:py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 lg:gap-2 border-b border-slate-700/50 last:border-0 lg:border-0">
                          <Terminal size={16} className="text-brand-400 flex-shrink-0" />
                          <div className="min-w-0">
                              <p className="text-sm text-slate-200 font-medium">{tool.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{tool.description}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </>
  );

  const renderBillingDialog = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
             <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-12 h-12 bg-amber-900/50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                     <CreditCard size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Billing Required</h3>
                 <p className="text-slate-400 text-sm">
                     This system uses advanced models (like Veo or Imagen) which require a paid API key from a Google Cloud Project.
                 </p>
             </div>
             
             <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-500 mb-6 flex items-start gap-2">
                 <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                 <span>Please select a project with billing enabled to proceed with generation.</span>
             </div>

             <div className="flex gap-3">
                 <button 
                    onClick={() => setShowBillingDialog(false)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                 >
                     Cancel
                 </button>
                 <button 
                    onClick={handleBillingConfirm}
                    className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500 font-medium transition-colors"
                 >
                     Select API Key
                 </button>
             </div>
             <p className="text-center mt-4 text-[10px] text-slate-600">
                 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-slate-400">View Billing Documentation</a>
             </p>
          </div>
      </div>
  );

  const renderHeroInput = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-500/20">
          <Bot size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">What agent are we building?</h1>
        <p className="text-slate-400 mb-8 max-w-lg text-lg">
          Describe your goal. I will assign a <strong>Root Coordinator</strong> and structure the sub-agents for you.
        </p>
        
        <div className="w-full max-w-2xl relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative bg-slate-800 rounded-xl p-2 shadow-2xl border border-slate-700/50">
            <textarea
              value={architectInput}
              onChange={(e) => setArchitectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleArchitectSend();
                }
              }}
              placeholder="I need a research team to search for latest AI news and summarize it..."
              className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 resize-none h-32 text-lg p-4"
            />
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center px-4 pb-3 mt-2 relative gap-3 md:gap-0">
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
                          <button
                              onClick={() => setShowToolSelector(!showToolSelector)}
                              className="flex items-center justify-center md:justify-start gap-2 text-slate-400 hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-slate-700/50 relative group/attach border border-slate-700/50 md:border-transparent"
                          >
                              <Paperclip size={16} className="group-hover/attach:text-brand-400 transition-colors" />
                              <span className="font-medium">Attach Tools</span>
                          </button>

                          {/* Model Selector */}
                          <div className="relative group/model">
                              <select
                                  value={architectModel}
                                  onChange={(e) => setArchitectModel(e.target.value)}
                                  className="w-full md:w-auto appearance-none bg-slate-900/50 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg pl-4 pr-10 py-2 hover:border-slate-500 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer md:min-w-[200px]"
                              >
                                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover/model:text-slate-300 transition-colors" />
                          </div>
                      </div>
               {showToolSelector && renderToolSelector()}

               <button 
                 onClick={handleArchitectSend}
                 disabled={!architectInput.trim()}
                          className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex justify-center items-center"
               >
                 <ArrowRight size={20} />
               </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
            <button
                onClick={handleSkipToVisualBuilder}
                className="text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors border-b border-transparent hover:border-slate-400 pb-0.5"
            >
                <PencilRuler size={16} />
                <span>Skip to Visual Builder</span>
            </button>
        </div>
    </div>
  );

    /**
     * Renders the Chat Interface for the "Input" step.
     */
  const renderArchitectChat = () => (
      <div className="flex flex-col h-full bg-slate-900 animate-in fade-in duration-300 relative">
          {/* Navigation Header */}
          <div className="absolute top-4 right-6 z-10">
              <button
                  onClick={() => setStep('review')}
                  className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-700 shadow-lg transition-all text-xs font-bold uppercase tracking-wide"
              >
                  <PencilRuler size={14} />
                  <span>Back to Builder</span>
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-16">
              {architectMessages.filter(m => !m.hidden).map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-md ${
                        msg.role === 'user' 
                        ? 'bg-slate-700 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                    }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                </div>
            ))}
              {/* Active Tool Log Indicator */}
              {activeToolLog && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-slate-800/80 border border-brand-500/30 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg flex items-center gap-3 backdrop-blur-sm">
                          <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                          <span className="text-sm text-brand-200 font-mono">{activeToolLog}</span>
                      </div>
                  </div>
              )}

              {/* Typing Indicator */}
              {isTyping && !activeToolLog && (
                  <div className="flex justify-start animate-in fade-in">
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-md">
                          <div className="flex gap-1.5">
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          </div>
                      </div>
                  </div>
              )}

              <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col gap-3">
            {architectMessages.length > 2 && (
                <div className="flex justify-center">
                    <button 
                        onClick={handleBuildFromChat}
                        className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
                    >
                        <Sparkles size={16} />
                        Build & Initialize Agents
                    </button>
                </div>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={architectInput}
                    onChange={(e) => setArchitectInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isArchitectTyping && handleArchitectSend()}
                    placeholder="Refine the plan..."
                    disabled={isArchitectTyping}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-full pl-6 pr-20 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-lg disabled:opacity-50"
                />
                 <button 
                    onClick={() => setShowToolSelector(!showToolSelector)}
                      className="absolute right-12 top-1.5 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <Paperclip size={18} />
                </button>
                {showToolSelector && <div className="absolute bottom-14 right-0 z-50">{renderToolSelector()}</div>}
                
                <button 
                    onClick={handleArchitectSend}
                    disabled={!architectInput.trim() || isArchitectTyping}
                      className="absolute right-2 top-1.5 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:bg-slate-700"
                >
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    </div>
  );

    const [showMobileInspector, setShowMobileInspector] = useState(false);

    /**
     * Renders the Visual Builder for the "Review" step.
     * Includes the Diagram (Left) and Inspector Panel (Right).
     */
  const renderArchitectView = () => (
      <div className="flex h-full overflow-hidden bg-slate-900 relative">
        {/* Left: Diagram Canvas */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
              {!isEmbedded && (
                  <div className="absolute top-4 left-16 lg:left-4 z-20 flex gap-2 items-center">
                      <button
                          onClick={() => setStep('input')}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 hover:text-white flex items-center gap-2"
                      >
                          <ChevronLeft size={14} />
                          <span className="hidden sm:inline">Back to Chat</span>
                      </button>
                      <button
                          onClick={handleConsultArchitect}
                          className="px-3 py-1.5 bg-brand-900/30 text-brand-300 text-xs rounded border border-brand-500/30 hover:bg-brand-900/50 hover:text-brand-200 flex items-center gap-1.5 transition-colors"
                      >
                          <MessageSquarePlus size={14} />
                          <span className="hidden sm:inline">Consult Architect</span>
                          <span className="sm:hidden">Consult</span>
                      </button>
                      {history.length > 0 && (
                          <button
                              onClick={handleUndo}
                              className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 hover:text-white hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                          >
                              <Undo2 size={14} />
                              <span className="hidden sm:inline">Revert Changes</span>
                          </button>
                      )}
                  </div>
              )}

              {/* Mobile: Edit Config Button */}
              <div className="absolute top-4 right-4 z-20 lg:hidden">
                  <button
                      onClick={() => setShowMobileInspector(true)}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded border border-slate-700 shadow-lg flex items-center gap-2"
                  >
                      <Settings size={14} />
                      <span className="hidden sm:inline">Config</span>
                  </button>
              </div>

              <div className="flex-1 overflow-hidden relative bg-slate-950">
                {rootAgent && (
                      <PanZoomContainer className="w-full h-full bg-slate-950">
                       <AgentDiagram 
                          agent={rootAgent} 
                          selectedId={selectedAgentId || ''} 
                              onSelect={(a) => {
                                  setSelectedAgentId(a.id);
                                  setShowMobileInspector(true);
                              }}
                          onAddSub={handleAddSub}
                          onDelete={handleDeleteNode}
                          depth={0} 
                       />
                      </PanZoomContainer>
                )}
             </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-4 lg:w-auto lg:px-0">
                <button 
                    onClick={handleStartTest}
                      className="w-full lg:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-brand-500/20 transition-all hover:scale-105"
                >
                    <Play size={18} />
                    Deploy & Test System
                </button>
            </div>
        </div>

        {/* Right: Inspector Panel */}
          <div className={`
            bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-40 flex-shrink-0
            fixed inset-y-0 right-0 w-[min(100vw,400px)] lg:static lg:w-[clamp(350px,25vw,500px)] lg:inset-auto transition-transform duration-300
            ${showMobileInspector ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
            {selectedAgent ? (
                <>
                    <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                        <div>
                           <h3 className="font-bold text-white text-lg">{selectedAgent.type === 'group' ? 'Flow Controller' : 'Agent Config'}</h3>
                           <p className="text-xs text-slate-400">ID: {selectedAgent.id.slice(-6)}</p>
                        </div>
                          <button
                              onClick={() => setShowMobileInspector(false)}
                              className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                          >
                              <X size={20} />
                          </button>
                    </div>

                      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))]">
                         <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={selectedAgent.name} 
                                    onChange={(e) => handleUpdateSelectedAgent({ name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            
                            {selectedAgent.type === 'agent' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model</label>
                                    <select
                                        value={selectedAgent.model}
                                        onChange={(e) => handleUpdateSelectedAgent({ model: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    >
                                        {AVAILABLE_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                         </div>

                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Goal / Purpose</label>
                            <input 
                                type="text" 
                                value={selectedAgent.goal} 
                                onChange={(e) => handleUpdateSelectedAgent({ goal: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                         </div>

                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tags</label>
                              <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                      {(selectedAgent.tags || []).map((tag: string) => (
                                          <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 flex items-center gap-1">
                                              {tag}
                                              <button
                                                  onClick={() => handleUpdateSelectedAgent({ tags: selectedAgent.tags?.filter(t => t !== tag) })}
                                                  className="hover:text-white"
                                              >
                                                  <X size={10} />
                                              </button>
                                          </span>
                                      ))}
                                  </div>
                                  <div className="relative">
                                      <Tag size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                                      <input
                                          type="text"
                                          placeholder="Add tag (Press Enter)..."
                                          className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                          onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                  const val = e.currentTarget.value.trim();
                                                  if (val) {
                                                      const currentTags = selectedAgent.tags || [];
                                                      if (!currentTags.includes(val)) {
                                                          handleUpdateSelectedAgent({ tags: [...currentTags, val] });
                                                      }
                                                      e.currentTarget.value = '';
                                                  }
                                              }
                                          }}
                                      />
                                  </div>
                              </div>
                          </div>

                          {selectedAgent.type === 'agent' && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tools</label>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 max-h-80 overflow-y-auto custom-scrollbar">
                                    {/* Categorized Tools List */}
                                    {Array.from(new Set(AVAILABLE_TOOLS_LIST.map(t => t.category))).map(category => {
                                        const categoryTools = AVAILABLE_TOOLS_LIST.filter(t => t.category === category);
                                        const isExpanded = expandedCategories.includes(category);
                                        const selectedCount = categoryTools.filter(t => selectedAgent.tools?.includes(t.id)).length;

                                        return (
                                            <div key={category} className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden mb-2 last:mb-0">
                                                <button
                                                    onClick={() => toggleCategory(category)}
                                                    className="w-full flex items-center justify-between p-2 text-left hover:bg-slate-700/50 transition-colors"
                                                >
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{category}</span>
                                                    <div className="flex items-center gap-2">
                                                        {selectedCount > 0 && (
                                                            <span className="text-[9px] bg-brand-900/50 text-brand-300 px-1.5 py-0.5 rounded-full border border-brand-500/20">
                                                                {selectedCount} selected
                                                            </span>
                                                        )}
                                                        {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="p-2 space-y-1 border-t border-slate-700/50 bg-slate-900/30">
                                                        {categoryTools.map(tool => {
                                                            const isSelected = selectedAgent.tools?.includes(tool.id);
                                                            return (
                                                                <div 
                                                                    key={tool.id} 
                                                                    onClick={() => handleToggleTool(tool.id)}
                                                                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-brand-900/30 border border-brand-500/50' : 'hover:bg-slate-700'}`}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <Wrench size={12} className={isSelected ? 'text-brand-400' : 'text-slate-500'} />
                                                                        <span className={`text-xs ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}>{tool.name}</span>
                                                                    </div>
                                                                    {isSelected && <Check size={12} className="text-brand-500" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>
                         )}

                         {selectedAgent.type === 'agent' && (
                             <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-2 mt-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Agent Operating Procedure</label>
                                    <span className="text-[10px] text-brand-400 bg-brand-900/20 px-1.5 py-0.5 rounded">Markdown</span>
                                </div>
                                
                                <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={enhancePrompt}
                                            onChange={(e) => setEnhancePrompt(e.target.value)}
                                            placeholder="e.g. Make it strictly strictly professional..."
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                            onKeyDown={(e) => e.key === 'Enter' && handleEnhanceInstructions()}
                                        />
                                        <button 
                                            onClick={handleEnhanceInstructions}
                                            disabled={isEnhancing || !enhancePrompt.trim()}
                                            className="bg-brand-600 hover:bg-brand-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Zap size={10} />
                                            {isEnhancing ? '...' : 'Enhance'}
                                        </button>
                                    </div>
                                </div>

                                <textarea 
                                    value={selectedAgent.instructions} 
                                    onChange={(e) => handleUpdateSelectedAgent({ instructions: e.target.value })}
                                    className="flex-1 min-h-[300px] w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-3 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-brand-500 outline-none resize-none leading-relaxed custom-scrollbar"
                                />
                             </div>
                         )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                    <Network size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Select an agent or flow node in the diagram to configure.</p>
                </div>
            )}
        </div>
    </div>
  );

    /**
     * Renders the Simulator Interface for the "Testing" step.
     * Displays the chat window and tool execution logs.
     */
  const renderTestingStep = () => (
    <div className="h-full flex flex-col bg-slate-900">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white">
                    <Bot size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-white">{rootAgent?.name} (Root)</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Online
                        </span>
                        <span className="text-xs text-slate-500 border-l border-slate-700 pl-2">Coordinator Mode</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={handleNewConversation}
                    className="text-xs text-slate-400 hover:text-brand-300 flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    <MessageSquarePlus size={12} />
                    New Conversation
                </button>
                <button 
                    onClick={() => setStep('review')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    <Network size={12} />
                    Return to Architect
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30">
            {testMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex flex-col max-w-[80%]">
                        {msg.role !== 'user' && msg.sender && (
                            <span className="text-[10px] text-slate-400 mb-1 ml-2 font-bold uppercase tracking-wider">{msg.sender}</span>
                        )}
                        <div className={`rounded-2xl px-5 py-3.5 shadow-md ${
                            msg.role === 'user' 
                            ? 'bg-brand-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        }`}>
                            {msg.reportData ? (
                                <div className="prose prose-invert prose-sm max-w-none p-2">
                                    <div className="border-b border-slate-700 pb-2 mb-4">
                                        <h3 className="text-xl font-bold text-brand-300 m-0">{msg.reportData.title}</h3>
                                        <p className="text-slate-400 text-xs italic mt-1">{msg.reportData.summary}</p>
                                    </div>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.reportData.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {msg.content.split('\n').map((line, i) => {
                                            // Image Rendering
                                            if (line.startsWith('![')) {
                                                const match = line.match(/!\[.*?\]\((.*?)\)/);
                                                if (match) return <img key={i} src={match[1]} alt="Generated" className="mt-2 rounded-lg border border-slate-700 shadow-md max-w-full" />;
                                            }
                                            // Video Rendering via Secure Blob
                                            if (line.includes('[Download Video]')) {
                                                const match = line.match(/\[(.*?)\]\((.*?)\)/);
                                                if (match) {
                                                    return <VideoMessage key={i} src={match[2]} />;
                                                }
                                            }
                                            // Source Links
                                            if (line.trim().startsWith('- [') && line.includes('](')) {
                                                const match = line.match(/\[(.*?)\]\((.*?)\)/);
                                                if (match) {
                                                    return (
                                                        <div key={i} className="ml-4 mt-1">
                                                            <a href={match[2]} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline text-xs flex items-center gap-1">
                                                                <span>•</span> {match[1]}
                                                            </a>
                                                        </div>
                                                    )
                                                }
                                            }
                                            return <div key={i}>{line}</div>
                                        })}
                                    </div>
                            )}
                        </div>
                         {/* Retry Button for Errors */}
                         {msg.content.startsWith('**Error:**') && (
                            <button 
                                onClick={handleRetry}
                                className="mt-2 self-start flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded"
                            >
                                <RefreshCw size={10} /> Retry
                            </button>
                        )}
                    </div>
                </div>
            ))}
            
            {/* Tool Logs / Thinking Indicator */}
            {(isTyping || activeToolLog) && (
                <div className="flex justify-start w-full animate-in fade-in duration-300">
                    <div className="bg-slate-800/80 border border-brand-500/30 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg flex items-center gap-3 min-w-[200px]">
                         {activeToolLog ? (
                             <>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-500 blur-sm opacity-50 animate-pulse"></div>
                                    <Terminal size={14} className="text-brand-400 relative z-10" />
                                </div>
                                <span className="text-xs font-mono text-brand-200">{activeToolLog}</span>
                             </>
                         ) : (
                             <>
                                <div className="flex gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                                <span className="text-xs text-slate-400 ml-2">Orchestrating agents...</span>
                             </>
                         )}
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="max-w-4xl mx-auto relative">
                  {showLocationFinder && (
                      <LocationFinder
                          onSelect={handleLocationSelect}
                          onClose={() => setShowLocationFinder(false)}
                      />
                  )}
                  {showModeSelector && (
                      <TransportModeSelector
                          onSelect={handleModeSelect}
                          onClose={() => setShowModeSelector(false)}
                      />
                  )}

                  {/* Conditional Trip Planner Tools */}
                  {rootAgent && (function checkTripPlanner(agent: Agent): boolean {
                      if (agent.tools?.includes('nsw_trip_planner')) return true;
                      if (agent.subAgents) return agent.subAgents.some(checkTripPlanner);
                      return false;
                  })(rootAgent) && (
                          <div className="absolute left-4 top-3.5 flex items-center gap-2 z-10">
                              <button
                                  onClick={() => setShowLocationFinder(!showLocationFinder)}
                                  className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                  title="Find Location"
                              >
                                  <MapPin size={18} />
                              </button>
                              <button
                                  onClick={() => setShowModeSelector(!showModeSelector)}
                                  className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                  title="Select Transport Mode"
                              >
                                  <Train size={18} />
                              </button>
                          </div>
                      )}

                <input
                    ref={testInputRef}
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleTestSendMessage()}
                    placeholder={`Message ${rootAgent?.name}...`}
                    disabled={isTyping}
                      className={`w-full bg-slate-800 border border-slate-700 text-white rounded-full py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-lg disabled:opacity-50 transition-all ${rootAgent && (function check(a: Agent): boolean { return a.tools?.includes('nsw_trip_planner') || (a.subAgents?.some(check) ?? false); })(rootAgent)
                          ? 'pl-24 pr-14'
                          : 'pl-6 pr-14'
                          }`}
                />
                <button 
                    onClick={() => handleTestSendMessage()}
                    disabled={!testInput.trim() || isTyping}
                      className="absolute right-2 top-2 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:bg-slate-700"
                >
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />
      
      {showBillingDialog && renderBillingDialog()}

      {step === 'input' && (
         hasStarted ? renderArchitectChat() : renderHeroInput()
      )}
      
      {step === 'building' && (
         <div className="w-full flex-1 overflow-y-auto p-8 relative z-10 flex flex-col items-center justify-center">
             <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-brand-400 animate-pulse" size={32} /></div>
             </div>
             <h2 className="text-2xl font-semibold text-white mb-2">Architecting System...</h2>
             <p className="text-slate-400">Defining Coordinator protocols and Sub-Agent hierarchies.</p>
         </div>
      )}

      {step === 'review' && renderArchitectView()}
      {step === 'testing' && renderTestingStep()}
    </div>
  );
};
