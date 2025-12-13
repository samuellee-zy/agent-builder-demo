
import React, { useState } from 'react';
import { Agent, AgentSession, ChatMessage, EvaluationReport, EvaluationSession, AVAILABLE_MODELS } from '../types';
import { AgentDiagram } from './AgentDiagram';
import { AgentBuilder } from './AgentBuilder';
import { AVAILABLE_TOOLS_REGISTRY } from '../services/tools';
import { VideoMessage } from './VideoMessage';
import { EvaluationService } from '../services/evaluation';
import { Bot, Clock, ArrowLeft, MessageSquare, Database, Terminal, Film, Image as ImageIcon, X, FileText, Layers, ArrowDownCircle, Trash2, Activity, Play, CheckCircle, AlertTriangle, Zap, ChevronDown, ChevronUp, Pencil, RefreshCw, Search, Filter } from 'lucide-react';

interface AgentRegistryProps {
  agents: Agent[];
    onSelectAgent: (agent: Agent) => void;
    onEditAgent?: (agent: Agent) => void;
    onUpdateAgent: (agent: Agent) => void; // New Prop for embedded builder updates
    onDeleteAgent?: (id: string) => void;
}

// Date formatter helper
const formatDate = (date: Date | string, includeTime = false) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  let dateStr = `${day}/${month}/${year}`;
  
  if (includeTime) {
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      dateStr += ` ${hours}:${minutes}`;
  }
  return dateStr;
};

/**
 * @file src/components/AgentRegistry.tsx
 * @description The Deployment & Management Hub.
 * 
 * CORE VIEWS:
 * 1. **Grid View**: Lists all deployed agents with status summaries.
 * 2. **Architecture Tab**: Read-only view of the agent's structure (using `AgentDiagram`).
 * 3. **History Tab**: Playback interface for past sessions with latency/tool usage.
 * 4. **Evaluation Tab**: Interface to trigger and view results of "LLM-as-a-Judge" audits.
 */

export const AgentRegistry: React.FC<AgentRegistryProps> = ({ agents, onDeleteAgent, onUpdateAgent, onEditAgent, onSelectAgent }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'history' | 'evaluation'>('architecture');
    const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  
  // Detail State
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Evaluation State
  const [evalConfig, setEvalConfig] = useState({
      scenarioCount: 3,
      simulatorModel: 'gemini-3-pro-preview'
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState('');
  const [selectedReport, setSelectedReport] = useState<EvaluationReport | null>(null);
    const showMobileDetail = !!selectedAgent;

    // Filter Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Get all unique tags from all agents
    const allTags = Array.from(new Set(agents.flatMap(a => a.tags || []))).sort();

    const filteredAgents = agents.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (agent.tags && agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesTag = selectedTag ? agent.tags?.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    /**
     * Helper to recursively count Models and Tools in an agent tree.
     * Used for the statistics badges on the agent cards.
     */
  const countNodes = (agent: Agent): { models: number, tools: number } => {
    let models = agent.type === 'agent' ? 1 : 0;
    let tools = agent.tools?.length || 0;
    if (agent.subAgents) {
      agent.subAgents.forEach(sub => {
        const counts = countNodes(sub);
        models += counts.models;
        tools += counts.tools;
      });
    }
    return { models, tools };
  };

  const findNodeById = (id: string, current: Agent): Agent | null => {
    if (current.id === id) return current;
    if (current.subAgents) {
      for (const sub of current.subAgents) {
        const found = findNodeById(id, sub);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedAgent && selectedNodeId ? findNodeById(selectedNodeId, selectedAgent) : null;

  const handleDeleteClick = (e: React.MouseEvent, agentId: string) => {
      e.stopPropagation();
        setAgentToDelete(agentId);
    };

    const confirmDelete = () => {
        if (agentToDelete && onDeleteAgent) {
            onDeleteAgent(agentToDelete);
            setAgentToDelete(null);
        }
  };

    const handleSelectAgent = (agent: Agent) => {
        setSelectedAgent(agent);
        if (onSelectAgent) {
            onSelectAgent(agent);
        }
    };

    /**
     * Triggers a new Evaluation Audit.
     * Uses `EvaluationService` to run simulations and generate a report.
     * 
     * FLOW:
     * 1. Starts UI loading state.
     * 2. Calls `service.runFullEvaluation`.
     * 3. Saves result to Agent object.
     * 4. Persists updated Agent to storage.
     */
  const handleRunEvaluation = async () => {
      if (!selectedAgent) return;
      setIsEvaluating(true);
      setEvalProgress('Initializing...');

      try {
          const service = new EvaluationService();
          const report = await service.runFullEvaluation(selectedAgent, evalConfig, (msg) => setEvalProgress(msg));
          
          // Save Report
          const updatedAgent = {
              ...selectedAgent,
              evaluations: [report, ...(selectedAgent.evaluations || [])]
          };
          
          if (onUpdateAgent) {
              onUpdateAgent(updatedAgent);
          }
          setSelectedAgent(updatedAgent); // Update local state
          setSelectedReport(report); // Show new report
      } catch (e) {
          console.error("Evaluation failed:", e);
          setEvalProgress('Error during evaluation.');
      } finally {
          setIsEvaluating(false);
      }
  };

  const renderSessionList = () => {
    if (!selectedAgent) return null;
    const sessions = selectedAgent.sessions || [];
    
    return (
      <div className="space-y-2">
        {sessions.length === 0 && <p className="text-slate-500 text-sm italic">No recorded sessions.</p>}
        {sessions.map((session) => (
          <div 
            key={session.id}
            onClick={() => { setSelectedSession(session); setSelectedNodeId(null); }}
            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded bg-brand-900/30 flex items-center justify-center text-brand-400">
                  <MessageSquare size={14} />
               </div>
               <div>
                  <h4 className="text-xs font-bold text-slate-300">
                      Session {session.id.length > 6 ? `#${session.id.slice(-4)}` : `#${session.id}`}
                  </h4>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                     <Clock size={10} />
                     {formatDate(session.timestamp, true)}
                  </p>
               </div>
            </div>
            <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded">
                {session.messages.length} msgs
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSessionViewer = (messages: ChatMessage[], title: string, subtitle?: string, onBack?: () => void) => {
     return (
        <div className="h-full flex flex-col bg-slate-900 w-full animate-in fade-in duration-300">
           <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900 sticky top-0 z-10">
              {onBack && (
                  <button 
                     onClick={onBack}
                     className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                  >
                      <ArrowLeft size={18} />
                  </button>
              )}
              <div>
                 <h3 className="font-bold text-white text-sm">{title}</h3>
                 {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.filter(m => m.id !== 'init').map(msg => (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm relative group ${
                           msg.role === 'user' 
                           ? 'bg-slate-700 text-white rounded-tr-none' 
                           : 'bg-slate-800 text-slate-300 border border-slate-700 rounded-tl-none'
                       }`}>
                           {(msg.sender || msg.latency) && (
                               <div className="flex items-center justify-between mb-1 gap-4">
                                   {msg.sender && <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.sender}</span>}
                                   {msg.latency && (
                                       <span className="text-[9px] font-mono text-yellow-500 flex items-center gap-0.5 bg-slate-950/50 px-1 rounded" title="Response Latency">
                                           <Zap size={8} /> {(msg.latency / 1000).toFixed(2)}s
                                       </span>
                                   )}
                               </div>
                           )}

                           <div className="text-sm whitespace-pre-wrap">
                               {msg.content.split('\n').map((line, i) => {
                                   if (line.includes('[Download Video]')) {
                                       const match = line.match(/\[(.*?)\]\((.*?)\)/);
                                       if (match) {
                                           return <VideoMessage key={i} src={match[2]} />;
                                       }
                                   }
                                   
                                   const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
                                   if (imgMatch) {
                                        return (
                                            <div key={i} className="mt-3 rounded-lg overflow-hidden border border-slate-700 bg-black shadow-lg max-w-md">
                                                <div className="flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                                                    <ImageIcon size={12} className="text-brand-400" />
                                                    <span>Generated Image</span>
                                                </div>
                                                <img 
                                                    src={imgMatch[2]} 
                                                    alt={imgMatch[1] || "Generated content"} 
                                                    className="w-full h-auto object-contain" 
                                                />
                                            </div>
                                        );
                                   }

                                   return <div key={i}>{line}</div>
                               })}
                           </div>
                       </div>
                   </div>
               ))}
           </div>
        </div>
     );
  };

    /**
     * Renders the Read-Only Details Sidebar for a selected node.
     * Shows configuration, assigned tools, and flow mode.
     */
  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    const isGroup = selectedNode.type === 'group';

    return (
        <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-xl flex-shrink-0 animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                <div>
                   <h3 className="font-bold text-white text-lg">{isGroup ? 'Flow Group' : 'Agent Details'}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-500">ID: {selectedNode.id.slice(-6)}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 uppercase">Read Only</span>
                   </div>
                </div>
                <button 
                    onClick={() => setSelectedNodeId(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
                    <div className="text-sm text-slate-200 bg-slate-800/50 p-2 rounded border border-slate-800">
                        {selectedNode.name}
                    </div>
                </div>

                {isGroup ? (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flow Mode</label>
                        <div className="flex items-center gap-2 text-sm text-brand-300 bg-brand-900/10 p-2 rounded border border-brand-500/20">
                            {selectedNode.groupMode === 'sequential' ? <ArrowDownCircle size={14} /> : <Layers size={14} />}
                            <span className="capitalize">{selectedNode.groupMode} Execution</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model</label>
                        <div className="text-sm text-brand-300 bg-brand-900/10 p-2 rounded border border-brand-500/20 font-mono">
                            {selectedNode.model}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Goal / Purpose</label>
                    <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-2 rounded border border-slate-800">
                        {selectedNode.goal}
                    </div>
                </div>
                
                {!isGroup && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Tools</label>
                        <div className="space-y-1">
                            {selectedNode.tools && selectedNode.tools.length > 0 ? (
                                selectedNode.tools.map(tId => {
                                    const tool = AVAILABLE_TOOLS_REGISTRY[tId];
                                    return (
                                        <div key={tId} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 p-2 rounded border border-slate-700">
                                            <Terminal size={12} className="text-slate-500" />
                                            {tool ? tool.name : tId}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-xs text-slate-500 italic">No tools assigned.</div>
                            )}
                        </div>
                    </div>
                )}

                {!isGroup && (
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <FileText size={10} /> Agent Operating Procedure
                        </label>
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-3 text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-96 custom-scrollbar">
                            {selectedNode.instructions}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

    /**
     * Renders the full "LLM-as-a-Judge" Evaluation Report.
     * Includes Scorecard, Scenario Breakdown, and Transcript logs.
     */
  const renderEvaluationReport = () => {
      if (!selectedReport) return null;

      return (
          <div className="h-full flex flex-col bg-slate-950 animate-in fade-in duration-300">
              {/* Report Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-900">
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                              <ArrowLeft size={20} />
                          </button>
                          <div>
                              <h2 className="text-xl font-bold text-white">Evaluation Report</h2>
                              <p className="text-sm text-slate-500">{formatDate(selectedReport.timestamp, true)} • {selectedReport.sessions.length} Scenarios</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                           <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-500 uppercase">Total Score</p>
                               <p className={`text-2xl font-bold ${selectedReport.summary.avgScore >= 8 ? 'text-green-400' : selectedReport.summary.avgScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                   {selectedReport.summary.avgScore}/10
                               </p>
                           </div>
                      </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-2 mb-2 text-slate-400">
                              <Clock size={16} />
                              <span className="text-xs font-bold uppercase">Response Time</span>
                          </div>
                          <p className="text-xl font-bold text-white">{selectedReport.summary.avgResponseScore}/10</p>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-2 mb-2 text-slate-400">
                              <CheckCircle size={16} />
                              <span className="text-xs font-bold uppercase">Accuracy</span>
                          </div>
                          <p className="text-xl font-bold text-white">{selectedReport.summary.avgAccuracy}/10</p>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-2 mb-2 text-slate-400">
                              <Activity size={16} />
                              <span className="text-xs font-bold uppercase">Satisfaction</span>
                          </div>
                          <p className="text-xl font-bold text-white">{selectedReport.summary.avgSatisfaction}/10</p>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-2 mb-2 text-slate-400">
                              <AlertTriangle size={16} />
                              <span className="text-xs font-bold uppercase">Stability</span>
                          </div>
                          <p className="text-xl font-bold text-white">{selectedReport.summary.avgStability}/10</p>
                      </div>
                  </div>
              </div>

              {/* Session Breakdown */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Scenario Breakdown</h3>
                  {selectedReport.sessions.map((session, idx) => (
                      <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                          <details className="group">
                              <summary className="flex items-center justify-between p-4 cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                          {idx + 1}
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-white">{session.scenario}</p>
                                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                              <span>Avg Latency: {session.stats.avgLatency}ms</span>
                                              <span>•</span>
                                              <span>Error Rate: {session.stats.errorRate.toFixed(0)}%</span>
                                          </div>
                                      </div>
                                  </div>
                                  <ChevronDown size={16} className="text-slate-500 group-open:rotate-180 transition-transform" />
                              </summary>
                              
                              <div className="p-4 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Chat Transcript Preview */}
                                  <div className="bg-black rounded-lg border border-slate-800 h-96 overflow-hidden flex flex-col">
                                      <div className="p-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                                          Transcript Log
                                      </div>
                                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                          {session.transcript.map(msg => (
                                              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                  <div className={`text-xs px-3 py-2 rounded-lg max-w-[90%] ${
                                                      msg.role === 'user' ? 'bg-slate-800 text-slate-300' : 'bg-brand-900/20 text-brand-100 border border-brand-500/20'
                                                  }`}>
                                                      {/* Parsed Content (Rich Media Support) */}
                                                      <div className="whitespace-pre-wrap">
                                                        {msg.content.split('\n').map((line, i) => {
                                                            if (line.includes('[Download Video]')) {
                                                                const match = line.match(/\[(.*?)\]\((.*?)\)/);
                                                                if (match) return <VideoMessage key={i} src={match[2]} />;
                                                            }
                                                            const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
                                                            if (imgMatch) {
                                                                return (
                                                                    <img key={i} src={imgMatch[2]} alt="Generated" className="mt-2 rounded border border-slate-700 max-w-full h-auto" />
                                                                );
                                                            }
                                                            return <div key={i}>{line}</div>
                                                        })}
                                                      </div>
                                                  </div>
                                                  {msg.latency && <span className="text-[9px] text-yellow-500/80 mt-0.5">{msg.latency}ms</span>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  {/* Metrics Detail */}
                                  <div className="space-y-4">
                                      {session.metrics.map(metric => (
                                          <div key={metric.name} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                              <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-bold text-slate-300">{metric.name}</span>
                                                  <span className={`text-xs font-bold ${metric.score >= 8 ? 'text-green-400' : 'text-slate-400'}`}>{metric.score}/10</span>
                                              </div>
                                              <p className="text-xs text-slate-500 leading-relaxed">{metric.reasoning}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </details>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderEvaluationsList = () => {
        return null;
    };


    // --- MAIN RENDER ---

    const renderDetailPanel = () => {
        if (!selectedAgent) return null;

        return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex animate-in slide-in-from-right duration-300">
                {/* Left Sidebar Navigation */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                        <button
                            onClick={() => setSelectedAgent(null)}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="font-bold text-white truncate">Agent Details</h2>
                    </div>

                    <div className="p-6 border-b border-slate-800">
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
                            <Bot size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{selectedAgent.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-4">{selectedAgent.model}</p>

                        <div className="flex flex-wrap gap-2">
                            {selectedAgent.tags?.map(tag => (
                                <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">{tag}</span>
                            ))}
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <button
                            onClick={() => setActiveTab('architecture')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'architecture'
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Layers size={18} />
                            <span className="font-medium">Architecture</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history'
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Clock size={18} />
                            <span className="font-medium">Session History</span>
                            {selectedAgent.sessions && selectedAgent.sessions.length > 0 && (
                                <span className="ml-auto text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
                                    {selectedAgent.sessions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('evaluation')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'evaluation'
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <CheckCircle size={18} />
                            <span className="font-medium">Evaluations</span>
                        </button>
                    </nav>

                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={() => onEditAgent?.(selectedAgent)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700 font-medium text-sm"
                        >
                            <Pencil size={16} />
                            Edit Agent
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
                    {activeTab === 'architecture' && (
                        <div className="h-full relative overflow-hidden flex flex-col">
                            <AgentBuilder
                                initialAgent={selectedAgent}
                                onAgentCreated={(updatedAgent) => {
                                    onUpdateAgent(updatedAgent);
                                    setSelectedAgent(updatedAgent);
                                }}
                                isEmbedded={true}
                                onSelectAgent={(agent) => {
                                    // Optional: Sync selection back to registry if needed
                                    // For now just logging or ignoring is fine, or simple state update
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="h-full flex">
                            {/* Session List Sidebar */}
                            <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                                <div className="p-4 border-b border-slate-800">
                                    <h3 className="font-bold text-white text-sm">Recorded Sessions</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {renderSessionList()}
                                </div>
                            </div>

                            {/* Session Content */}
                            <div className="flex-1 bg-slate-950 relative">
                                {selectedSession ? (
                                    renderSessionViewer(
                                        selectedSession.messages,
                                        `Session ${selectedSession.id.length > 6 ? '#' + selectedSession.id.slice(-4) : '#' + selectedSession.id}`,
                                        formatDate(selectedSession.timestamp, true)
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                            <MessageSquare size={32} className="opacity-20" />
                                        </div>
                                            <p className="font-medium">Select a session to view details</p>
                                        </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'evaluation' && (
                        <div className="h-full p-8 flex flex-col items-center justify-center text-slate-500">
                            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-slate-800">
                                <CheckCircle size={40} className="text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Evaluation Module</h3>
                            <p className="max-w-md text-center text-slate-400 mb-8">Run comprehensive benchmarks and automated tests against your agent to measure performance, accuracy, and latency.</p>
                            <button
                                onClick={handleRunEvaluation}
                                disabled={isEvaluating}
                                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
                            >
                                {isEvaluating ? (
                                    <>
                                        <RefreshCw className="animate-spin" />
                                        Running Tests...
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} />
                                        Start New Evaluation
                                    </>
                                )}
                            </button>
                            {evalProgress && (
                                <p className="mt-4 text-xs font-mono text-brand-400 animate-pulse">{evalProgress}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };




  return (
      <div className={`flex flex-col h-full bg-slate-900 p-4 md:p-8 overflow-y-auto ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>

          {/* Delete Confirmation Modal */}
          {agentToDelete && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-4 mb-4 text-red-400">
                          <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center">
                              <AlertTriangle size={24} />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">Delete Agent?</h3>
                              <p className="text-sm text-slate-400">This action cannot be undone.</p>
                          </div>
                      </div>

                      <p className="text-slate-300 text-sm leading-relaxed mb-6">
                          Are you sure you want to permanently delete <strong className="text-white">{agents.find(a => a.id === agentToDelete)?.name || 'this agent'}</strong>?
                          All associated history, sessions, and evaluations will be lost.
                      </p>

                      <div className="flex items-center gap-3 justify-end">
                          <button
                              onClick={() => setAgentToDelete(null)}
                              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium text-sm"
                          >
                              Cancel
                          </button>
                          <button
                              onClick={confirmDelete}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-bold text-sm shadow-lg shadow-red-900/20"
                          >
                              Delete Agent
                          </button>
                      </div>
                  </div>
              </div>
          )}

      <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Database className="text-brand-500" />
            Agent Registry
        </h1>
              <p className="text-slate-400 text-sm md:text-base">Manage, review, and audit your deployed agent systems.</p>
      </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                      type="text"
                      placeholder="Search agents by name, description, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-slate-500"
                  />
              </div>

              {/* Tag Filter */}
              <div className="relative group">
                  <button className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-xl hover:text-white hover:border-slate-600 transition-colors">
                      <Filter size={18} />
                      <span>{selectedTag || 'All Tags'}</span>
                      <ChevronDown size={14} />
                  </button>

                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20 hidden group-hover:block animate-in fade-in zoom-in-95 duration-100">
                      <button
                          onClick={() => setSelectedTag(null)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${!selectedTag ? 'text-brand-400 font-bold bg-slate-700/50' : 'text-slate-300'}`}
                      >
                          All Tags
                      </button>
                      {allTags.map(tag => (
                          <button
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${selectedTag === tag ? 'text-brand-400 font-bold bg-slate-700/50' : 'text-slate-300'}`}
                          >
                              {tag}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
              {filteredAgents.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <Search size={32} className="opacity-20" />
                      </div>
                      <p>No agents found matching your criteria.</p>
                      {(searchQuery || selectedTag) && (
                          <button
                              onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                              className="mt-2 text-brand-400 hover:text-brand-300 text-sm font-bold"
                          >
                              Clear Filters
                          </button>
                      )}
                  </div>
              )}
              {filteredAgents.map((agent) => {
            const stats = countNodes(agent);
            return (
                <div 
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="relative bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-brand-500/50 hover:bg-slate-800/80 transition-all group"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <Bot size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded-full border border-slate-800">
                                {formatDate(agent.createdAt)}
                            </span>
                            <button
                                onClick={(e) => handleDeleteClick(e, agent.id)}
                                className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-900/50 rounded-full transition-colors"
                                title="Delete Agent"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 pr-8">{agent.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">{agent.description}</p>
                    
                    {/* Tags on Card */}
                    {agent.tags && agent.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {agent.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50">
                                    {tag}
                                </span>
                            ))}
                            {agent.tags.length > 3 && (
                                <span className="text-[10px] text-slate-500 px-1">+{agent.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Bot size={12} /> {stats.models} Agents
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MessageSquare size={12} /> {agent.sessions?.length || 0} Sessions
                        </div>
                         <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Activity size={12} /> {agent.evaluations?.length || 0} Evals
                        </div>
                    </div>
                </div>
            )
        })}
      </div>
          {renderDetailPanel()}
    </div>
  );
};
