
import React from 'react';
import { Agent } from '../types';
import { Bot, Clock, Plus, Wrench } from 'lucide-react';

interface SidebarProps {
  recentAgents: Agent[];
  onNewAgent: () => void;
  onSelectAgent: (agent: Agent) => void; // New Prop
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ recentAgents, onNewAgent, onSelectAgent, activeTab, onTabChange }) => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
          A
        </div>
        <span className="font-bold text-lg tracking-tight text-white">Agent Builder</span>
      </div>

      <div className="px-4 py-6 space-y-1">
        <button
          onClick={() => onTabChange('overview')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onTabChange('watchtower')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'watchtower' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Watchtower
        </button>
        <button
          onClick={() => onTabChange('aop')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'aop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Agent Operating Procedure
        </button>
        <button
          onClick={() => onTabChange('tools')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'tools' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Wrench size={14} />
          Tools Library
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex items-center justify-between mb-4 mt-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Agents</h3>
        </div>
        
        <div className="space-y-3">
          {recentAgents.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4 italic">No agents yet.</p>
          )}
          {recentAgents.map((agent) => (
            <div 
                key={agent.id} 
                onClick={() => onSelectAgent(agent)}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all border border-transparent hover:border-slate-700"
            >
              <div className="mt-1 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 group-hover:bg-brand-900/20 group-hover:text-brand-300">
                <Bot size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-200 truncate">{agent.name}</h4>
                <p className="text-xs text-slate-500 truncate">{agent.description}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-600">
                   <Clock size={10} />
                   <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={onNewAgent}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border border-slate-700"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>
    </div>
  );
};
