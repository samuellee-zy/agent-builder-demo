
import React from 'react';
import { Agent } from '../types';
import { Bot, Clock, Plus, Wrench, Database, ChevronDown } from 'lucide-react';

interface SidebarProps {
  recentAgents: Agent[];
  onNewAgent: () => void;
  onSelectAgent: (agent: Agent) => void; // New Prop
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * @file src/components/Sidebar.tsx
 * @description The Main Navigation Sidebar.
 * 
 * FEATURES:
 * 1. **Navigation**: Switches between Overview, Watchtower, AOP, Registry, and Tools.
 * 2. **Recent Agents**: Quick access list of recently modified agents.
 * 3. **Draft Initiation**: "New Agent" button to reset state and start fresh.
 * 4. **Responsive**: Off-canvas drawer on mobile, fixed sidebar on desktop.
 */

export const Sidebar: React.FC<SidebarProps & { isOpen: boolean; onClose: () => void }> = ({
  recentAgents,
  onNewAgent,
  onSelectAgent,
  activeTab,
  onTabChange,
  isOpen,
  onClose
}) => {
  const [isAopMenuOpen, setIsAopMenuOpen] = React.useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
            A
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Agent Builder</span>
        </div>

        <div className="px-4 py-6 space-y-1">
          <button
            onClick={() => { onTabChange('overview'); onClose(); }}
            className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => { onTabChange('watchtower'); onClose(); }}
            className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'watchtower' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            Watchtower
          </button>
          {/* Navigation Group with Explicit Toggle */}
          <div className="relative">
            <div className={`flex items-center w-full rounded-md transition-colors ${activeTab === 'aop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              {/* Main Action: Navigate & Reset */}
              <button
                onClick={() => { onTabChange('aop'); onNewAgent(); onClose(); }}
                className="flex-1 text-left px-3 py-3 text-sm font-medium focus:outline-none"
              >
                Agent Operating Procedure
              </button>

              {/* Toggle Action: Open/Close Menu */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsAopMenuOpen(!isAopMenuOpen); }}
                className="p-3 text-slate-500 hover:text-white focus:outline-none"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${isAopMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown Menu (State Controlled) */}
            {isAopMenuOpen && (
              <div className="mt-1 ml-2 border-l border-slate-800 pl-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <button
                  onClick={(e) => { e.stopPropagation(); onTabChange('registry'); onClose(); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === 'registry' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                  <Database size={12} />
                  Agent Registry
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onTabChange('tools'); onClose(); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === 'tools' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                  <Wrench size={12} />
                  Tools Library
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Recent Agents
          </div>
          <div className="space-y-1">
            {recentAgents.length === 0 && (
              <div className="text-xs text-slate-600 italic px-2">No agents yet.</div>
            )}
            {recentAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => { onSelectAgent(agent); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 group hover:bg-slate-800"
              >
                <div className="w-2 h-2 rounded-full bg-brand-500 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all" />
                <span className="text-sm text-slate-400 group-hover:text-white truncate">
                  {agent.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={() => { onNewAgent(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            <Plus size={16} />
            <span>New Agent</span>
          </button>
        </div>
      </div>
    </>
  );
};
