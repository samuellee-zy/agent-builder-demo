import React, { useState } from 'react';
import { AVAILABLE_TOOLS_LIST } from '../services/tools';
import { Tool } from '../types';
import { LocationAutocomplete } from './LocationAutocomplete';
import { ModeDropdown } from './ModeDropdown';
import { Terminal, Code2, Zap, LayoutGrid, Database, HeadphonesIcon, Calculator, X, Play, ChevronRight, MapPin, Train } from 'lucide-react';

export const ToolsLibrary: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  
  // Test State
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Group tools by category
  const categories = Array.from(new Set(AVAILABLE_TOOLS_LIST.map(t => t.category)));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Customer Service': return <HeadphonesIcon size={18} className="text-pink-400" />;
      case 'Data Retrieval': return <Database size={18} className="text-blue-400" />;
      case 'Utility': return <Calculator size={18} className="text-green-400" />;
      case 'Grounding': return <Zap size={18} className="text-yellow-400" />;
      default: return <LayoutGrid size={18} className="text-slate-400" />;
    }
  };

  const handleSelectTool = (tool: Tool) => {
    setSelectedTool(tool);
    setExecutionResult(null);
      // Default mode to 'train' if it's the trip planner
      if (tool.id === 'nsw_trip_planner') {
          setTestParams({ mode: 'train' });
      } else {
          setTestParams({});
      }
  };

  const handleParamChange = (key: string, value: string) => {
    setTestParams(prev => ({ ...prev, [key]: value }));
  };

  const handleRunMock = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
        // Simple type conversion could go here if needed, keeping it string-based for now
        // or attempting JSON parse for objects if complex.
        const result = await selectedTool.executable(testParams);
        setExecutionResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    } catch (error: any) {
        setExecutionResult(`Error: ${error.message || error}`);
    } finally {
        setIsExecuting(false);
    }
  };

  const renderToolInspector = () => {
      if (!selectedTool) return null;
      
      const params = selectedTool.functionDeclaration.parameters?.properties || {};
      const requiredParams = selectedTool.functionDeclaration.parameters?.required || [];
      const hasParams = Object.keys(params).length > 0;
      const isNative = selectedTool.id === 'google_search';

      return (
          <div className="w-[500px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl flex-shrink-0 animate-in slide-in-from-right duration-300 absolute right-0 top-0 z-20">
              <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                  <div>
                     <h3 className="font-bold text-white text-lg">{selectedTool.name}</h3>
                     <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                            {selectedTool.id}
                        </code>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider border border-slate-700 px-1.5 py-0.5 rounded">
                            {selectedTool.category}
                        </span>
                     </div>
                  </div>
                  <button 
                      onClick={() => setSelectedTool(null)}
                      className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded"
                  >
                      <X size={20} />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-950">
                  {/* Description */}
                  <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded border border-slate-800">
                          {selectedTool.description}
                      </p>
                  </div>

                  {/* Schema */}
                  {!isNative && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parameter Schema</h4>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                            {hasParams ? Object.entries(params).map(([key, schema]: any) => (
                                <div key={key} className="p-3 border-b border-slate-800 last:border-0 flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-mono text-brand-300">{key}</span>
                                        <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 rounded uppercase">
                                            {schema.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">{schema.description}</p>
                                    {requiredParams.includes(key) && (
                                        <span className="text-[10px] text-amber-500 font-medium">Required</span>
                                    )}
                                </div>
                            )) : (
                                <div className="p-4 text-xs text-slate-500 italic">No parameters required.</div>
                            )}
                        </div>
                    </div>
                  )}

                  {/* Mock Tester */}
                  {!isNative && (
                      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                          <div className="bg-slate-800/50 p-3 border-b border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <Terminal size={16} className="text-brand-400" />
                                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Mock Tester</h4>
                              </div>
                              <button 
                                onClick={handleRunMock}
                                disabled={isExecuting}
                                  className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-brand-900/20"
                              >
                                  {isExecuting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={14} fill="currentColor" />}
                                  Run Function
                              </button>
                          </div>
                          
                          <div className="p-4 space-y-4">
                              {hasParams && (
                                  <div className="space-y-3 relative">
                                      {Object.entries(params).map(([key, schema]: any) => {
                                          // Custom rendering for Trip Planner
                                          if (selectedTool.id === 'nsw_trip_planner') {
                                              if (key === 'origin' || key === 'destination') {
                                                  return (
                                                      <div key={key}>
                                                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                                          <LocationAutocomplete
                                                              value={testParams[key] || ''}
                                                              onChange={(val) => handleParamChange(key, val)}
                                                              placeholder={`Search ${key}...`}
                                                          />
                                                      </div>
                                                  );
                                              }
                                              if (key === 'mode') {
                                                  return (
                                                      <div key={key}>
                                                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                                          <ModeDropdown
                                                              value={testParams[key] || 'train'}
                                                              onChange={(val) => handleParamChange(key, val)}
                                                          />
                                                      </div>
                                                  );
                                              }
                                          }

                                          // Default rendering
                                          return (
                                              <div key={key}>
                                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                                  <input
                                                      type="text"
                                                      value={testParams[key] || ''}
                                                      onChange={(e) => handleParamChange(key, e.target.value)}
                                                      placeholder={`Enter ${schema.type.toLowerCase()}...`}
                                                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                                                  />
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}

                              {executionResult && (
                                  <div className="animate-in fade-in duration-300 pt-2 border-t border-slate-800">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Output Result</label>
                                      <div className="bg-black rounded-lg p-3 font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto max-h-40 custom-scrollbar border border-slate-800">
                                          {executionResult}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* Source Code */}
                  <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logic Source</h4>
                      <div className="relative group">
                          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-blue-300 whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">
                              {selectedTool.executable.toString()}
                          </pre>
                          {isNative && (
                               <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center border border-slate-800 rounded-lg backdrop-blur-sm">
                                   <div className="text-center">
                                       <Zap size={24} className="mx-auto text-yellow-500 mb-2" />
                                       <p className="text-slate-300 font-bold">Native Integration</p>
                                       <p className="text-xs text-slate-500 px-8">Logic handled internally by Gemini API.</p>
                                   </div>
                               </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex h-full bg-slate-900 relative overflow-hidden">
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${selectedTool ? 'mr-[500px]' : ''}`}>
          <div className="p-8 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Terminal className="text-brand-500" />
                Tools Library
            </h1>
            <p className="text-slate-400">
                {AVAILABLE_TOOLS_LIST.length} executable functions available for agent assignment.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
            {categories.map(category => (
                <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                        {getCategoryIcon(category)}
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{category}</h2>
                        <div className="h-px bg-slate-800 flex-1 ml-4"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {AVAILABLE_TOOLS_LIST.filter(t => t.category === category).map((tool) => {
                        const isNative = tool.id === 'google_search';
                        const isSelected = selectedTool?.id === tool.id;

                        return (
                        <div 
                            key={tool.id} 
                            onClick={() => handleSelectTool(tool)}
                            className={`
                                group relative border rounded-xl overflow-hidden transition-all shadow-sm cursor-pointer
                                ${isSelected 
                                    ? 'bg-slate-800 border-brand-500 ring-1 ring-brand-500/50' 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'}
                            `}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white text-lg group-hover:text-brand-300 transition-colors">{tool.name}</h3>
                                        {isNative && <Zap size={14} className="text-yellow-500" fill="currentColor" />}
                                    </div>
                                    <ChevronRight size={16} className={`text-slate-600 transition-transform ${isSelected ? 'rotate-90 text-brand-500' : 'group-hover:text-slate-400'}`} />
                                </div>
                                <p className="mt-2 text-sm text-slate-300 leading-relaxed line-clamp-2">
                                    {tool.description}
                                </p>
                            </div>
                            
                            <div className="bg-slate-900/50 px-5 py-3 border-t border-slate-700/50 flex items-center justify-between">
                                <code className="text-[10px] text-slate-500 font-mono">
                                    {tool.id}
                                </code>
                                {isNative ? (
                                    <span className="text-[10px] text-yellow-500/80 font-medium">Native Grounding</span>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[10px] text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Code2 size={12} /> View Source
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            ))}
          </div>
      </div>

      {renderToolInspector()}
    </div>
  );
};
