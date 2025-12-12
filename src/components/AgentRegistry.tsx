
import React, { useState } from 'react';
import { Agent, AgentSession, ChatMessage, EvaluationReport, EvaluationSession, AVAILABLE_MODELS } from '../types';
import { AgentDiagram } from './AgentDiagram';
import { AVAILABLE_TOOLS_REGISTRY } from '../services/tools';
import { VideoMessage } from './VideoMessage';
import { EvaluationService } from '../services/evaluation';
import { Bot, Clock, ArrowLeft, MessageSquare, Database, Terminal, Film, Image as ImageIcon, X, FileText, Layers, ArrowDownCircle, Trash2, Activity, Play, CheckCircle, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentRegistryProps {
  agents: Agent[];
  onDeleteAgent: (id: string) => void;
  onUpdateAgent?: (agent: Agent) => void; // New prop to save evaluations
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

export const AgentRegistry: React.FC<AgentRegistryProps> = ({ agents, onDeleteAgent, onUpdateAgent }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'history' | 'evaluation'>('architecture');
  
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

  // Helper to count nodes
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
      if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
          onDeleteAgent(agentId);
      }
  };

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
    if (!selectedAgent) return null;
    const evaluations = selectedAgent.evaluations || [];

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            {!selectedReport && (
                <>
                     {/* Config Panel */}
                    <div className="mb-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">New Evaluation</h3>
                                <p className="text-sm text-slate-400">Configure parameters to stress-test this agent.</p>
                            </div>
                            <button 
                                onClick={handleRunEvaluation}
                                disabled={isEvaluating}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isEvaluating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Play size={16} />}
                                {isEvaluating ? 'Running...' : 'Start Evaluation'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Number of Scenarios</label>
                                <input 
                                    type="number" 
                                    min={1} 
                                    max={10} 
                                    value={evalConfig.scenarioCount}
                                    onChange={(e) => setEvalConfig({...evalConfig, scenarioCount: parseInt(e.target.value) || 1})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                />
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                    {evalConfig.scenarioCount <= 3 ? 'Running concurrently (Fast)' : 'Running sequentially (Safe)'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">User Simulator Model</label>
                                <select 
                                    value={evalConfig.simulatorModel}
                                    onChange={(e) => setEvalConfig({...evalConfig, simulatorModel: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                >
                                    {AVAILABLE_MODELS.filter(m => !m.id.includes('video') && !m.id.includes('image')).map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isEvaluating && (
                            <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3 text-sm text-slate-300">
                                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                                {evalProgress}
                            </div>
                        )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Past Reports</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {evaluations.length === 0 && <p className="text-slate-500 italic">No evaluations run yet.</p>}
                        {evaluations.map(report => (
                            <div 
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-800/80"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity size={18} className={report.summary.avgScore >= 8 ? 'text-green-400' : 'text-yellow-400'} />
                                        <span className="font-bold text-white text-lg">{report.summary.avgScore}/10</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{formatDate(report.timestamp, true)}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-xs text-slate-400">
                                    <div>Latency: {report.summary.avgResponseScore}</div>
                                    <div>Accuracy: {report.summary.avgAccuracy}</div>
                                    <div>Sat: {report.summary.avgSatisfaction}</div>
                                    <div>Stability: {report.summary.avgStability}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {selectedReport && renderEvaluationReport()}
        </div>
    );
  };

    // Mobile Detail View State
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // When an agent is selected, show detail view on mobile
    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        setShowMobileDetail(true);
    };

    const handleBackToRegistry = () => {
        setShowMobileDetail(false);
        setSelectedAgent(null);
    };

  if (selectedAgent) {
    return (
        <div className={`flex flex-col md:flex-row h-full bg-slate-900 ${showMobileDetail ? 'fixed inset-0 z-50' : ''}`}>
            {/* Detail Sidebar - Hidden on Mobile unless it's the active view in stack (conceptually, but here we just hide it and use main content) */}
            {/* Actually, for mobile we want the Detail Sidebar content to be part of the main scrollable view or a separate tab? 
             The current design has a sidebar for tabs (Architecture/History/Eval) and a main content area.
             On mobile, we should probably stack them or use a bottom nav?
             Let's try to keep the sidebar as a top nav or collapsible.
             For now, let's just make the sidebar full width on mobile.
         */}

            <div className={`${showMobileDetail && (!selectedSession || activeTab !== 'history') ? 'flex' : 'hidden md:flex'} w-full md:w-72 bg-slate-900 border-r border-slate-800 flex-col h-auto md:h-full flex-shrink-0 relative z-20`}>
             <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
                    <button onClick={handleBackToRegistry} className="md:hidden p-2 hover:bg-slate-800 rounded-full text-slate-400 mr-2">
                     <ArrowLeft size={20} />
                 </button>
                    <button onClick={() => { setSelectedAgent(null); setSelectedSession(null); setSelectedNodeId(null); setSelectedReport(null); setActiveTab('architecture'); }} className="hidden md:block hover:text-brand-400 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-white truncate text-sm flex-1">{selectedAgent.name}</h2>
                    {/* Mobile Tab Toggle? */}
             </div>
             
             <div className="p-5 border-b border-slate-800">
                <p className="text-xs text-slate-400 mb-4 line-clamp-3">{selectedAgent.description}</p>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Bot size={14} className="text-brand-400" />
                        <span className="text-xs font-bold">{countNodes(selectedAgent).models} Agents</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Terminal size={14} className="text-yellow-400" />
                        <span className="text-xs font-bold">{countNodes(selectedAgent).tools} Tools</span>
                    </div>
                </div>
             </div>

             {/* Tab Navigation */}
             <div className="p-2 space-y-1">
                 <button 
                    onClick={() => { setActiveTab('architecture'); setSelectedSession(null); setSelectedReport(null); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'architecture' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                 >
                     <Layers size={14} /> Architecture
                 </button>
                 <button 
                    onClick={() => { setActiveTab('history'); setSelectedReport(null); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                 >
                     <Clock size={14} /> Session History
                 </button>
                 <button 
                    onClick={() => { setActiveTab('evaluation'); setSelectedSession(null); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'evaluation' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                 >
                     <Activity size={14} /> Evaluation
                 </button>
             </div>
             
             {activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-4 border-t border-slate-800 min-h-[200px] md:min-h-0">
                     <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Recorded Sessions</h3>
                     {renderSessionList()}
                 </div>
             )}

                {/* Mobile: Show Content Below Tabs if Architecture/Eval? 
                 Actually, the original design has a side-by-side layout.
                 On mobile, if we select Architecture, we probably want to hide this "Sidebar" and show the content?
                 Or maybe we treat this "Sidebar" as the MAIN view for mobile when an agent is selected, 
                 and the "Content" is accessed via these tabs?
                 
                 Let's try a simpler approach:
                 On mobile, this "Sidebar" IS the view. 
                 If activeTab is 'architecture', we show the diagram in a modal or push view?
                 
                 Alternative: 
                 Keep the side-by-side but stack them on mobile?
                 The "Sidebar" becomes the top part, "Content" becomes bottom?
                 
                 Let's go with: 
                 Mobile: "Sidebar" is the navigation menu. 
                 Clicking a tab switches the view to that content.
                 BUT 'history' renders the list IN the sidebar.
                 
                 Let's just hide the "Content" area on mobile when "Sidebar" is visible?
                 No, that's confusing.
                 
                 Let's use a Tab Bar for mobile?
             */}
         </div>

            {/* Main Content Area - Hidden on mobile if we are "in the menu"? 
             Actually, let's just stack them on mobile.
             Sidebar (Agent Info + Tabs) -> Content.
             But the Sidebar is `h-full`.
             
             Let's make the Sidebar `h-auto` on mobile and `flex-shrink-0`.
         */}
            <div className={`${showMobileDetail ? 'flex' : 'hidden'} md:flex flex-1 bg-slate-950 relative overflow-hidden flex-col ${activeTab === 'history' && !selectedSession ? 'hidden md:flex' : ''}`}>
                {/* Mobile Back Button for Content View if needed? No, the sidebar has it. */}

             {/* Content Switcher */}
             {activeTab === 'architecture' && (
                    <div className="flex-1 flex overflow-hidden relative min-h-[400px] md:min-h-0">
                        <div className="flex-1 h-full overflow-auto p-4 md:p-10 flex items-center justify-center bg-slate-950/50 touch-pan-x touch-pan-y">
                            <div className="transform scale-75 md:scale-90 origin-center">
                            <AgentDiagram 
                                agent={selectedAgent} 
                                selectedId={selectedNodeId} 
                                onSelect={(a) => setSelectedNodeId(a.id)} 
                                readOnly={true}
                            />
                        </div>
                    </div>
                        {selectedNodeId && (
                            <div className="absolute inset-0 z-50 md:static md:z-auto">
                                {renderNodeDetails()}
                            </div>
                        )}
                 </div>
             )}

             {activeTab === 'history' && (
                 selectedSession ? renderSessionViewer(
                     selectedSession.messages, 
                     `Session ${selectedSession.id.length > 6 ? '#' + selectedSession.id.slice(-4) : '#' + selectedSession.id}`, 
                     formatDate(selectedSession.timestamp, true),
                     () => setSelectedSession(null)
                 ) : (
                            <div className="hidden md:flex flex-1 items-center justify-center text-slate-500 text-sm italic">
                         Select a session from the sidebar to view details.
                     </div>
                 )
             )}

             {activeTab === 'evaluation' && renderEvaluationsList()}
         </div>
      </div>
    );
  }

  return (
      <div className={`flex flex-col h-full bg-slate-900 p-4 md:p-8 overflow-y-auto ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
      <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Database className="text-brand-500" />
            Agent Registry
        </h1>
              <p className="text-slate-400 text-sm md:text-base">Manage, review, and audit your deployed agent systems.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.length === 0 && <p className="text-slate-500 italic">No agents found in registry.</p>}
        {agents.map((agent) => {
            const stats = countNodes(agent);
            return (
                <div 
                    key={agent.id}
                    onClick={() => handleAgentSelect(agent)}
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
    </div>
  );
};
