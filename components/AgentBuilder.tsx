
import React, { useState, useRef, useEffect } from 'react';
import { BuildStep, Agent, ChatMessage, AVAILABLE_MODELS, AgentSession } from '../types';
import { AVAILABLE_TOOLS_LIST } from '../services/tools';
import { sendArchitectMessage, generateArchitectureFromChat } from '../services/mockAgentService';
import { AgentOrchestrator } from '../services/orchestrator';
import { GoogleGenAI } from "@google/genai";
import { AgentDiagram } from './AgentDiagram';
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
  ChevronRight
} from 'lucide-react';

interface AgentBuilderProps {
  onAgentCreated: (agent: Agent) => void;
  initialAgent?: Agent; // Support reloading an existing agent
}

// Inner component to handle secure video playback via Blob
const VideoMessage: React.FC<{ src: string }> = ({ src }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadVideo = async () => {
            try {
                // Fetch the video data using the authenticated URL (which includes the key)
                const response = await fetch(src);
                if (!response.ok) throw new Error('Failed to load video stream');
                const blob = await response.blob();
                
                if (active) {
                    const url = URL.createObjectURL(blob);
                    setBlobUrl(url);
                    setLoading(false);
                }
            } catch (e) {
                if (active) {
                    console.error("Video load error:", e);
                    setError('Playback failed. Please download.');
                    setLoading(false);
                }
            }
        };

        loadVideo();

        return () => {
            active = false;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [src]);

    if (loading) {
        return (
            <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                <span>Buffering secure video stream...</span>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-lg overflow-hidden border border-slate-700 bg-black shadow-lg">
            <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <Film size={12} className="text-brand-400" />
                    <span>Generated Video (Veo)</span>
                </div>
                <a 
                    href={src} 
                    download="generated-video.mp4" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
                >
                    <Download size={10} /> Download
                </a>
            </div>
            {blobUrl ? (
                <video controls autoPlay loop className="w-full max-h-80 bg-black" src={blobUrl}>
                    Your browser does not support the video tag.
                </video>
            ) : (
                <div className="p-8 text-center text-xs text-red-400 bg-slate-950">
                    <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                    {error}
                </div>
            )}
        </div>
    );
};

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ onAgentCreated, initialAgent }) => {
  const [step, setStep] = useState<BuildStep>('input');
  
  // Step 1: Chat/Input State
  const [hasStarted, setHasStarted] = useState(false);
  const [architectMessages, setArchitectMessages] = useState<ChatMessage[]>([]);
  const [architectInput, setArchitectInput] = useState('');
  const [isArchitectTyping, setIsArchitectTyping] = useState(false);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Step 2 & 3: Generation & Architect View State
  const [rootAgent, setRootAgent] = useState<Agent | null>(initialAgent || null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(initialAgent?.id || null);
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Step 4: Testing & Billing State
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolLog, setActiveToolLog] = useState<string | null>(null);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const testInputRef = useRef<HTMLInputElement>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Load initial agent if provided
  useEffect(() => {
    if (initialAgent) {
      setRootAgent(initialAgent);
      setSelectedAgentId(initialAgent.id);
      setStep('review');
    }
  }, [initialAgent]);

  // Helper to find agent in tree
  const findAgentById = (id: string, current: Agent): Agent | null => {
    if (current.id === id) return current;
    if (current.subAgents) {
      for (const sub of current.subAgents) {
        const found = findAgentById(id, sub);
        if (found) return found;
      }
    }
    return null;
  };

  const updateAgentInTree = (updated: Agent, current: Agent): Agent => {
    if (current.id === updated.id) return updated;
    if (current.subAgents) {
      return {
        ...current,
        subAgents: current.subAgents.map(sub => updateAgentInTree(updated, sub))
      };
    }
    return current;
  };

  const deleteNodeFromTree = (nodeId: string, current: Agent): Agent | null => {
      if (current.id === nodeId) return null;
      if (current.subAgents) {
          return {
              ...current,
              subAgents: current.subAgents
                  .map(sub => deleteNodeFromTree(nodeId, sub))
                  .filter((sub): sub is Agent => sub !== null)
          };
      }
      return current;
  };

  const handleDeleteNode = (nodeId: string) => {
      if (!rootAgent) return;
      if (nodeId === rootAgent.id) return; // Cannot delete root
      
      const newRoot = deleteNodeFromTree(nodeId, rootAgent);
      if (newRoot) {
          setRootAgent(newRoot);
          onAgentCreated(newRoot);
          if (selectedAgentId === nodeId) {
              setSelectedAgentId(newRoot.id);
          }
      }
  };

  const addSubNode = (parentId: string, current: Agent, type: 'agent' | 'group', groupMode?: 'sequential' | 'concurrent'): Agent => {
    if (current.id === parentId) {
      const newNode: Agent = {
        id: Date.now().toString(),
        name: type === 'group' ? `${groupMode === 'sequential' ? 'Sequential' : 'Concurrent'} Flow` : 'New Sub-Agent',
        description: type === 'group' ? 'Executes children agents according to flow.' : 'Handles specific delegated tasks.',
        goal: type === 'group' ? 'Manage execution flow.' : 'Assist the main agent.',
        instructions: type === 'group' ? '' : '### AGENT OPERATING PROCEDURE\n\n1. **ROLE**: You are a specialized assistant.\n2. **TASK**: Complete delegated tasks efficiently.',
        tools: [],
        model: 'gemini-2.5-flash',
        createdAt: new Date(),
        subAgents: [],
        type: type,
        groupMode: groupMode
      };
      return {
        ...current,
        subAgents: [...(current.subAgents || []), newNode]
      };
    }
    if (current.subAgents) {
      return {
        ...current,
        subAgents: current.subAgents.map(sub => addSubNode(parentId, sub, type, groupMode))
      };
    }
    return current;
  };

  const selectedAgent = rootAgent && selectedAgentId ? findAgentById(selectedAgentId, rootAgent) : null;

  useEffect(() => {
    if (architectMessages.length === 0 && !initialAgent) {
      setArchitectMessages([{
        id: 'init',
        role: 'assistant',
        content: "Hi! I'm your AI Architect. What kind of agent or multi-agent system would you like to build today? You can describe a simple task or a complex workflow.",
        timestamp: Date.now()
      }]);
    }
  }, [architectMessages.length, initialAgent]);

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
      const replyText = await sendArchitectMessage(architectMessages, userMsg.content);
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

  const handleBuildFromChat = async () => {
    setStep('building');
    try {
        const result = await generateArchitectureFromChat(architectMessages);
        setRootAgent(result);
        setSelectedAgentId(result.id);
        onAgentCreated(result); // Persist immediately
        setStep('review');
    } catch (e) {
        console.error(e);
        setStep('input');
    }
  };

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
    onAgentCreated(defaultRoot);
    setStep('review');
  };

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
    const newRoot = addSubNode(parentId, rootAgent, type, groupMode);
    setRootAgent(newRoot);
    onAgentCreated(newRoot);
  };

  const handleEnhanceInstructions = async () => {
    if (!selectedAgent || !enhancePrompt.trim()) return;
    setIsEnhancing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Rewrite AOP for Agent '${selectedAgent.name}' to be professional markdown. Current goal: ${selectedAgent.goal}. User request: ${enhancePrompt}. Current instructions: ${selectedAgent.instructions}`;
        const result = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
        if (result.text) {
            handleUpdateSelectedAgent({ instructions: result.text });
            setEnhancePrompt(''); 
        }
    } catch (e) { console.error(e); } finally { setIsEnhancing(false); }
  };

  // --- Real Orchestration Testing Logic ---
  const handleStartTest = async () => {
    if (!rootAgent) return;
    
    // Check for paid models
    const requiresBilling = AgentOrchestrator.isPaidModelInUse(rootAgent);
    if (requiresBilling) {
        try {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                setShowBillingDialog(true);
                return;
            }
        } catch (e) {
            console.error("Billing check failed:", e);
        }
    }

    const initMsg: ChatMessage = {
        id: 'init',
        role: 'assistant',
        sender: 'System',
        content: `System Online. Coordinator '${rootAgent.name}' initialized. I am ready to orchestrate your request.`,
        timestamp: Date.now()
    };

    setTestMessages([initMsg]);
    
    // Create new Session
    const newSessionId = Date.now().toString();
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
  };

  const handleNewConversation = () => {
      handleStartTest();
  };

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
        apiKey: process.env.API_KEY || '',
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
        },
        onAgentResponse: (agentName, content) => {
            setTestMessages(prev => [...prev, {
                id: Date.now().toString() + Math.random(),
                role: 'assistant',
                sender: agentName,
                content: content,
                timestamp: Date.now()
            }]);
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

  // --- RENDERERS ---

  const renderToolSelector = () => (
    <div className="absolute bottom-12 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 z-50 overflow-hidden">
        <div className="p-3 border-b border-slate-700 bg-slate-800/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase">Available Tools</h4>
        </div>
        <div className="max-h-64 overflow-y-auto">
            {AVAILABLE_TOOLS_LIST.map(tool => (
                <div key={tool.id} className="px-3 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-2">
                    <Terminal size={14} className="text-brand-400" />
                    <div>
                        <p className="text-sm text-slate-200">{tool.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{tool.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
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
            <div className="flex justify-between items-center px-2 pb-2 mt-2 relative">
               <button 
                  onClick={() => setShowToolSelector(!showToolSelector)}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700/50 relative"
               >
                  <Paperclip size={14} />
                  <span>Attach Tools</span>
               </button>
               {showToolSelector && renderToolSelector()}

               <button 
                 onClick={handleArchitectSend}
                 disabled={!architectInput.trim()}
                 className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
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

  const renderArchitectChat = () => (
    <div className="flex flex-col h-full bg-slate-900 animate-in fade-in duration-300">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
             {architectMessages.map((msg) => (
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
             {isArchitectTyping && (
                <div className="flex justify-start">
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
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-full pl-6 pr-14 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-lg disabled:opacity-50"
                />
                 <button 
                    onClick={() => setShowToolSelector(!showToolSelector)}
                    className="absolute right-10 top-2 p-1 text-slate-400 hover:text-white transition-colors"
                >
                    <Paperclip size={18} />
                </button>
                {showToolSelector && <div className="absolute bottom-14 right-0 z-50">{renderToolSelector()}</div>}
                
                <button 
                    onClick={handleArchitectSend}
                    disabled={!architectInput.trim() || isArchitectTyping}
                    className="absolute right-2 top-2 p-1 bg-brand-600 text-white rounded-full hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:bg-slate-700"
                >
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    </div>
  );

  const renderArchitectView = () => (
    <div className="flex h-full overflow-hidden bg-slate-900">
        {/* Left: Diagram Canvas */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
             <div className="absolute top-4 left-4 z-20 flex gap-2">
                <button 
                    onClick={() => setStep('input')}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 hover:text-white"
                >
                    Back to Chat
                </button>
             </div>

             <div className="flex-1 overflow-auto p-10 flex items-center justify-center min-w-full min-h-full">
                {rootAgent && (
                    <div className="transform scale-100 origin-center min-w-max pb-20">
                       <AgentDiagram 
                          agent={rootAgent} 
                          selectedId={selectedAgentId || ''} 
                          onSelect={(a) => setSelectedAgentId(a.id)}
                          onAddSub={handleAddSub}
                          onDelete={handleDeleteNode}
                          depth={0} 
                       />
                    </div>
                )}
             </div>

             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <button 
                    onClick={handleStartTest}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-brand-500/20 transition-all hover:scale-105"
                >
                    <Play size={18} />
                    Deploy & Test System
                </button>
            </div>
        </div>

        {/* Right: Inspector Panel */}
        <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-30 flex-shrink-0">
            {selectedAgent ? (
                <>
                    <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                        <div>
                           <h3 className="font-bold text-white text-lg">{selectedAgent.type === 'group' ? 'Flow Controller' : 'Agent Config'}</h3>
                           <p className="text-xs text-slate-400">ID: {selectedAgent.id.slice(-6)}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
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

                         {selectedAgent.type === 'agent' && (
                             <div className="space-y-2">
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
                                        )
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
                <input
                    ref={testInputRef}
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleTestSendMessage()}
                    placeholder={`Message ${rootAgent?.name}...`}
                    disabled={isTyping}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-full pl-6 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-lg disabled:opacity-50 transition-all"
                />
                <button 
                    onClick={() => handleTestSendMessage()}
                    disabled={!testInput.trim() || isTyping}
                    className="absolute right-2 top-2 p-1.5 bg-brand-600 text-white rounded-full hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:bg-slate-700"
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
