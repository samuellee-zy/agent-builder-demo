
import React, { useState, useRef, useEffect } from 'react';
import { Agent } from '../types';
import { Plus, Bot, ArrowDownCircle, Layers, Trash2, ChevronDown, Wrench } from 'lucide-react';
import { AVAILABLE_TOOLS_LIST } from '../services/tools';

interface AgentDiagramProps {
  agent: Agent;
  selectedId: string | null;
  onSelect: (agent: Agent) => void;
  onAddSub?: (parentId: string, type: 'agent' | 'group', groupMode?: 'sequential' | 'concurrent') => void;
  onDelete?: (id: string) => void;
  depth?: number;
  readOnly?: boolean;
  // Connector Context Props
  parentType?: 'agent' | 'group';
  parentNodeMode?: 'sequential' | 'concurrent';
  sequenceIndex?: number;
}

/**
 * @file src/components/AgentDiagram.tsx
 * @description The Interactive Visualization Engine.
 * 
 * CORE LOGIC:
 * 1. **Recursive Hierarchy**: Renders agents nested within groups (Sequential or Concurrent).
 * 2. **Smart Connectors**: 
 *    - Draws vertical lines for Sequential groups.
 *    - Draws tree-like arms for Concurrent groups.
 * 3. **Context Menus**: Allows adding sub-agents or groups via a floating "+" button.
 * 4. **Z-Index Management**: Intelligently lifts active nodes above siblings during menu interaction.
 */

export const AgentDiagram: React.FC<AgentDiagramProps> = ({ 
  agent, 
  selectedId, 
  onSelect, 
  onAddSub,
  onDelete, 
  depth = 0, 
  readOnly = false,
  parentType,
  parentNodeMode,
  sequenceIndex
}) => {
  const isSelected = agent.id === selectedId;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic Z-Index: When menu is open, lift this node above everything else (siblings/children)
  const nodeZIndex = showAddMenu ? 'z-50' : 'z-10';

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
  const children = agent.subAgents || [];

  // --- Connector Logic ---
  // Renders the vertical line connecting to the parent in a sequential list
  const renderSequentialConnector = () => {
    if (parentType === 'group' && parentNodeMode === 'sequential' && depth > 0) {
        return (
            <div className="h-8 w-0.5 bg-slate-700 relative shrink-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-0.5 rounded-full border border-slate-700 z-10">
                    <ChevronDown size={10} className="text-slate-400" />
                </div>
            </div>
        );
    }
    return null;
  };

  const NodeContent = () => (
      isGroup ? (
      <div 
             onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
             className={`
                relative p-[clamp(0.5rem,1.5vw,1rem)] rounded-xl border-2 border-dashed transition-all duration-200 group flex flex-col items-center
                ${isSelected 
                  ? 'bg-slate-800/80 border-brand-400/50 shadow-lg shadow-brand-500/10' 
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}
                ${isSequential ? 'min-w-[clamp(180px,60vw,200px)]' : 'min-w-[clamp(260px,85vw,300px)]'}
                ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                ${nodeZIndex}
             `}
          >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-700 flex items-center gap-1 whitespace-nowrap z-20">
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

              {/* Internal Stem: Connects the group header to the children tree */}
              {!isSequential && children.length > 0 && (
                 <div className="h-6 w-0.5 bg-slate-700 shrink-0 z-0"></div>
              )}

              {/* Children Container (Group) */}
              <div className={`flex ${isSequential ? 'flex-col items-center' : 'flex-row justify-center'} w-full`}>
                  {children.length > 0 ? (
                      children.map((sub, idx) => (
                        <div key={sub.id} className={isSequential ? 'w-full flex justify-center' : 'flex flex-col items-center relative px-[clamp(0.25rem,1vw,1rem)] shrink-0'}>
                            
                            {/* Tree Connectors (Concurrent) - Rendered on Wrapper */}
                            {!isSequential && children.length > 1 && (
                                <>
                                    {/* Left Arm: Overlaps center by 1px to ensure connectivity */}
                                    {idx > 0 && <div className="absolute top-0 left-0 w-[calc(50%+1px)] h-0.5 bg-slate-700 z-0"></div>}
                                    {/* Right Arm: Overlaps center by 1px */}
                                    {idx < children.length - 1 && <div className="absolute top-0 right-0 w-[calc(50%+1px)] h-0.5 bg-slate-700 z-0"></div>}
                                </>
                            )}
                            
                            {/* Vertical Line Down to Node */}
                            {!isSequential && <div className="h-6 w-0.5 bg-slate-700 shrink-0 z-0"></div>}

                            <AgentDiagram 
                                agent={sub} 
                                selectedId={selectedId} 
                                onSelect={onSelect}
                                onAddSub={onAddSub}
                                onDelete={onDelete}
                                depth={depth + 1} 
                                readOnly={readOnly}
                                parentType="group"
                                parentNodeMode={agent.groupMode}
                                sequenceIndex={isSequential ? idx + 1 : undefined}
                            />
                        </div>
                      ))
                  ) : (
                      <div className="text-xs text-slate-600 italic py-4">Empty Group</div>
                  )}
              </div>

               {!readOnly && (
                   <div className="relative mt-4 z-20" ref={menuRef}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                        className="w-6 h-6 rounded-full bg-slate-700 hover:bg-brand-600 text-white flex items-center justify-center transition-colors shadow-md border border-slate-600"
                      >
                        <Plus size={14} />
                      </button>

                      {showAddMenu && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 bg-slate-950 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                           <button onClick={(e) => handleAddClick(e, 'agent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
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
              relative w-[clamp(140px,45vw,192px)] p-[clamp(0.5rem,1.5vw,0.75rem)] rounded-xl border-2 transition-all duration-200 group
              flex flex-col items-center text-center gap-2
              ${isSelected 
                ? 'bg-brand-900/30 border-brand-500 shadow-lg shadow-brand-500/20 scale-105' 
                : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'}
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              ${nodeZIndex}
            `}
          >
            {sequenceIndex !== undefined && (
                <div className="absolute -top-3 -left-2 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-20">
                    #{sequenceIndex}
                </div>
            )}

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

          {/* Tool Icons */}
          {agent.tools && agent.tools.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-1 px-1">
              {agent.tools.map(toolId => {
                // Import AVAILABLE_TOOLS_LIST if not available, simply using check for now or passing it as prop?
                // Ideally AgentDiagram shouldn't depend on Services directly to remain pure UI?
                // But for now direct import is practical.

                // We need the tool name. 
                // To avoid import cycles or props drilling, we can use a simple lookup if the list is imported.
                // Let's assume we import AVAILABLE_TOOLS_LIST at top.

                const tool = AVAILABLE_TOOLS_LIST.find(t => t.id === toolId);
                return (
                  <div key={toolId} className="flex items-center gap-0.5 bg-slate-700/50 border border-slate-600 px-1 py-0.5 rounded text-[9px] text-slate-300">
                    <Wrench size={8} className="text-brand-400" />
                    <span className="truncate max-w-[60px]">{tool?.name || toolId}</span>
                  </div>
                );
              })}
            </div>
          )}

            {!readOnly && depth > 0 && (
                <button
                    onClick={handleDeleteClick}
              className="absolute -top-2 -right-2 p-1 bg-slate-800 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded-full border border-slate-700 transition-colors z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    title="Delete Agent"
                >
                    <Trash2 size={12} />
                </button>
            )}

            {!readOnly && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20" ref={menuRef}>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                     className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-md border-2 border-slate-900 ${showAddMenu ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-brand-500 hover:text-white'}`}
                   >
                     <Plus size={12} />
                   </button>

                   {showAddMenu && (
                     <div className="absolute top-8 left-1/2 -translate-x-1/2 w-56 bg-slate-950 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900/50">Coordinator Pattern</div>
                        <button onClick={(e) => handleAddClick(e, 'agent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <Bot size={12} className="text-brand-400" /> Sub-Agent (Managed)
                        </button>
                        
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900/50 border-t border-slate-700/50 mt-1">Flow Control</div>
                        <button onClick={(e) => handleAddClick(e, 'group', 'sequential')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <ArrowDownCircle size={12} className="text-blue-400" /> Sequential Group
                        </button>
                        <button onClick={(e) => handleAddClick(e, 'group', 'concurrent')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <Layers size={12} className="text-purple-400" /> Concurrent Group
                        </button>
                     </div>
                   )}
                </div>
            )}
          </div>
      )
  );

  return (
    <div className="flex flex-col items-center touch-pan-x touch-pan-y">
      {/* 1. Sequential Connector (If Applicable) */}
      {renderSequentialConnector()}

      {/* 2. The Node Content (Box or Agent Card) */}
      <NodeContent />

      {/* 3. Recursive Children (Tree View for Root/Agent/Managed) */}
      {!isGroup && children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          {/* Parent Tail Line */}
          <div className="h-6 w-0.5 bg-slate-700 shrink-0 z-0"></div>
          
          {/* Children Container */}
          <div className="flex justify-center w-full relative">
             {children.map((sub, idx) => (
               <div key={sub.id} className="flex flex-col items-center relative px-4 shrink-0">
                   {/* Tree Connectors - Rendered on Wrapper to span gaps */}
                   {children.length > 1 && (
                       <>
                           {/* Left Arm: Overlaps center by 1px */}
                           {idx > 0 && <div className="absolute top-0 left-0 w-[calc(50%+1px)] h-0.5 bg-slate-700 z-0"></div>}
                           
                           {/* Right Arm: Overlaps center by 1px */}
                           {idx < children.length - 1 && <div className="absolute top-0 right-0 w-[calc(50%+1px)] h-0.5 bg-slate-700 z-0"></div>}
                       </>
                   )}
                   {/* Vertical Line from Top to Node */}
                   <div className="h-6 w-0.5 bg-slate-700 shrink-0 z-0"></div>

                   <AgentDiagram 
                     agent={sub} 
                     selectedId={selectedId} 
                     onSelect={onSelect}
                     onAddSub={onAddSub}
                     onDelete={onDelete}
                     depth={depth + 1}
                     readOnly={readOnly}
                     parentType="agent"
                   />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
