
import React, { useState, useRef, useEffect } from 'react';
import { Agent } from '../types';
import { Plus, Bot, ArrowDownCircle, Layers, Trash2 } from 'lucide-react';

interface AgentDiagramProps {
  agent: Agent;
  selectedId: string | null;
  onSelect: (agent: Agent) => void;
  onAddSub?: (parentId: string, type: 'agent' | 'group', groupMode?: 'sequential' | 'concurrent') => void;
  onDelete?: (id: string) => void;
  depth?: number;
  isLast?: boolean;
  readOnly?: boolean;
}

export const AgentDiagram: React.FC<AgentDiagramProps> = ({ 
  agent, 
  selectedId, 
  onSelect, 
  onAddSub,
  onDelete, 
  depth = 0, 
  isLast,
  readOnly = false
}) => {
  const isSelected = agent.id === selectedId;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddClick = (e: React.MouseEvent, type: 'agent' | 'group', mode?: 'sequential' | 'concurrent') => {
    e.stopPropagation();
    if (onAddSub) {
      onAddSub(agent.id, type, mode);
    }
    setShowAddMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) {
          onDelete(agent.id);
      }
  };

  const isGroup = agent.type === 'group';
  const isSequential = agent.groupMode === 'sequential';

  return (
    <div className="flex flex-col items-center">
      {depth > 0 && (
        <div className="h-6 w-px bg-slate-600"></div>
      )}

      {isGroup ? (
          <div 
             onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
             className={`
                relative p-4 rounded-xl border-2 border-dashed transition-all duration-200 group flex flex-col items-center
                ${isSelected 
                  ? 'bg-slate-800/80 border-brand-400/50 shadow-lg shadow-brand-500/10' 
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}
                ${isSequential ? 'min-w-[200px]' : 'min-w-[300px]'}
                ${readOnly ? 'cursor-default' : 'cursor-pointer'}
             `}
          >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-700 flex items-center gap-1 whitespace-nowrap">
                  {isSequential ? <ArrowDownCircle size={10} /> : <Layers size={10} />}
                  {isSequential ? 'Sequential Flow' : 'Concurrent Flow'}
              </div>
              
              {!readOnly && depth > 0 && (
                <button
                    onClick={handleDeleteClick}
                    className="absolute -top-2 -right-2 p-1 bg-slate-800 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded-full border border-slate-700 transition-colors z-30"
                    title="Delete Group"
                >
                    <Trash2 size={12} />
                </button>
              )}

              <div className={`flex ${isSequential ? 'flex-col gap-4' : 'flex-row gap-4'} mt-2`}>
                  {agent.subAgents && agent.subAgents.length > 0 ? (
                      agent.subAgents.map((sub, idx) => (
                        <AgentDiagram 
                            key={sub.id} 
                            agent={sub} 
                            selectedId={selectedId} 
                            onSelect={onSelect}
                            onAddSub={onAddSub}
                            onDelete={onDelete}
                            depth={0} 
                            readOnly={readOnly}
                        />
                      ))
                  ) : (
                      <div className="text-xs text-slate-600 italic py-2">Empty Group</div>
                  )}
              </div>

               {!readOnly && (
                   <div className="relative mt-4" ref={menuRef}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                        className="w-6 h-6 rounded-full bg-slate-700 hover:bg-brand-600 text-white flex items-center justify-center transition-colors shadow-md z-20"
                      >
                        <Plus size={14} />
                      </button>

                      {showAddMenu && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                           <button onClick={(e) => handleAddClick(e, 'agent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                               <Bot size={12} /> Add Agent
                           </button>
                        </div>
                      )}
                   </div>
               )}
          </div>
      ) : (
          <div 
            onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
            className={`
              relative w-48 p-3 rounded-xl border-2 transition-all duration-200 group
              flex flex-col items-center text-center gap-2 z-10
              ${isSelected 
                ? 'bg-brand-900/30 border-brand-500 shadow-lg shadow-brand-500/20 scale-105' 
                : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'}
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
            `}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner
              ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300'}
            `}>
              <Bot size={14} />
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-slate-100 truncate w-full px-1">{agent.name}</h4>
              <p className="text-[10px] text-slate-400 truncate w-full px-1">{agent.model?.replace('gemini-', '').replace('-preview', '')}</p>
            </div>

            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isSelected ? 'bg-green-500' : 'bg-slate-600'}`}></div>
            
            {!readOnly && depth > 0 && (
                <button
                    onClick={handleDeleteClick}
                    className="absolute -top-2 -right-2 p-1 bg-slate-800 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded-full border border-slate-700 transition-colors z-30 opacity-0 group-hover:opacity-100"
                    title="Delete Agent"
                >
                    <Trash2 size={12} />
                </button>
            )}

            {!readOnly && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2" ref={menuRef}>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                     className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-md z-20 border-2 border-slate-900 ${showAddMenu ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-brand-500 hover:text-white'}`}
                   >
                     <Plus size={12} />
                   </button>

                   {showAddMenu && (
                     <div className="absolute top-8 left-1/2 -translate-x-1/2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50">Coordinator Pattern</div>
                        <button onClick={(e) => handleAddClick(e, 'agent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <Bot size={12} className="text-brand-400" /> Sub-Agent (Managed)
                        </button>
                        
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50 border-t border-slate-700/50 mt-1">Flow Control</div>
                        <button onClick={(e) => handleAddClick(e, 'group', 'sequential')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <ArrowDownCircle size={12} className="text-blue-400" /> Sequential Group
                        </button>
                        <button onClick={(e) => handleAddClick(e, 'group', 'concurrent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                            <Layers size={12} className="text-purple-400" /> Concurrent Group
                        </button>
                     </div>
                   )}
                </div>
            )}
          </div>
      )}

      {!isGroup && agent.subAgents && agent.subAgents.length > 0 && (
        <div className="flex flex-col items-center mt-0">
          <div className="h-6 w-px bg-slate-600"></div>
          <div className="relative flex justify-center gap-8 pt-4 border-t border-slate-600 px-4">
             {agent.subAgents.map((sub, idx) => (
               <AgentDiagram 
                 key={sub.id} 
                 agent={sub} 
                 selectedId={selectedId} 
                 onSelect={onSelect}
                 onAddSub={onAddSub}
                 onDelete={onDelete}
                 depth={depth + 1}
                 isLast={idx === (agent.subAgents?.length || 0) - 1}
                 readOnly={readOnly}
               />
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
