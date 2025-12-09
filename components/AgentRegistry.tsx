
import React, { useState } from 'react';
import { Agent, AgentSession, ChatMessage } from '../types';
import { AgentDiagram } from './AgentDiagram';
import { AVAILABLE_TOOLS_REGISTRY } from '../services/tools';
import { Bot, Clock, ArrowLeft, MessageSquare, Database, Terminal, Film, Image as ImageIcon, X, FileText, Layers, ArrowDownCircle, Trash2 } from 'lucide-react';

interface AgentRegistryProps {
  agents: Agent[];
  onDeleteAgent: (id: string) => void;
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

export const AgentRegistry: React.FC<AgentRegistryProps> = ({ agents, onDeleteAgent }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Helper to count architecture nodes
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

  // Helper to find specific node in tree
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
                  <h4 className="text-xs font-bold text-slate-300">Session {session.id.slice(-4)}</h4>
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

  const renderSessionViewer = () => {
     if (!selectedSession) return null;
     
     return (
        <div className="h-full flex flex-col bg-slate-900 w-full">
           <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <button 
                 onClick={() => setSelectedSession(null)}
                 className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                  <ArrowLeft size={18} />
              </button>
              <div>
                 <h3 className="font-bold text-white text-sm">Session Log</h3>
                 <p className="text-xs text-slate-500">{formatDate(selectedSession.timestamp, true)}</p>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {selectedSession.messages.filter(m => m.id !== 'init').map(msg => (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                           msg.role === 'user' 
                           ? 'bg-slate-700 text-white rounded-tr-none' 
                           : 'bg-slate-800 text-slate-300 border border-slate-700 rounded-tl-none'
                       }`}>
                           {msg.sender && msg.role !== 'user' && (
                               <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{msg.sender}</div>
                           )}
                           <div className="text-sm whitespace-pre-wrap">
                               {msg.content.split('\n').map((line, i) => {
                                   // Redact heavy media for history view
                                   if (line.includes('[Download Video]')) {
                                       return (
                                            <div key={i} className="my-2 p-2 bg-slate-900 rounded border border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                                                <Film size={12} /> [Video Generated]
                                            </div>
                                       )
                                   }
                                   if (line.startsWith('![')) {
                                       return (
                                            <div key={i} className="my-2 p-2 bg-slate-900 rounded border border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                                                <ImageIcon size={12} /> [Image Generated]
                                            </div>
                                       )
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

  if (selectedAgent) {
    return (
      <div className="flex h-full bg-slate-900">
         {/* Detail Sidebar */}
         <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0">
             <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                 <button onClick={() => { setSelectedAgent(null); setSelectedSession(null); setSelectedNodeId(null); }} className="hover:text-brand-400 transition-colors">
                     <ArrowLeft size={20} />
                 </button>
                 <h2 className="font-bold text-white truncate">{selectedAgent.name}</h2>
             </div>
             
             <div className="p-5 border-b border-slate-800">
                <p className="text-sm text-slate-400 mb-4">{selectedAgent.description}</p>
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

             <div className="flex-1 overflow-y-auto p-4">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Session History</h3>
                 {renderSessionList()}
             </div>
         </div>

         {/* Main Content: Diagram or Session View */}
         <div className="flex-1 bg-slate-950 relative overflow-hidden flex">
             {selectedSession ? (
                 renderSessionViewer()
             ) : (
                 <>
                    <div className="flex-1 h-full overflow-auto p-10 flex items-center justify-center">
                        <div className="transform scale-90 origin-center">
                            <AgentDiagram 
                                agent={selectedAgent} 
                                selectedId={selectedNodeId} 
                                onSelect={(a) => setSelectedNodeId(a.id)} 
                                readOnly={true}
                            />
                        </div>
                    </div>
                    {/* Right Inspector Panel (Conditional) */}
                    {selectedNodeId && renderNodeDetails()}
                 </>
             )}
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Database className="text-brand-500" />
            Agent Registry
        </h1>
        <p className="text-slate-400">Manage, review, and audit your deployed agent systems.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.length === 0 && <p className="text-slate-500 italic">No agents found in registry.</p>}
        {agents.map((agent) => {
            const stats = countNodes(agent);
            return (
                <div 
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="relative bg-slate-800 border border-slate-700 rounded-xl p-5 cursor-pointer hover:border-brand-500/50 hover:bg-slate-800/80 transition-all group"
                >
                    <button
                        onClick={(e) => handleDeleteClick(e, agent.id)}
                        className="absolute top-3 right-3 p-2 text-slate-600 hover:text-red-400 hover:bg-slate-900/50 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                        title="Delete Agent"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <Bot size={20} />
                        </div>
                        <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded-full border border-slate-800">
                            {formatDate(agent.createdAt)}
                        </span>
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
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};
