import React, { useState } from 'react';
import { AVAILABLE_TOOLS_LIST } from '../services/tools';
import { Tool } from '../types';
import { LocationAutocomplete } from './LocationAutocomplete';
import { ModeDropdown } from './ModeDropdown';
import { CategoryDropdown } from './CategoryDropdown';
import { Terminal, Code2, Zap, LayoutGrid, Database, HeadphonesIcon, Calculator, X, Play, ChevronRight, MapPin, Train, Search, ChevronLeft, Globe, Users, Package, BookOpen, Ticket, FileText, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { get, set } from 'idb-keyval';

/**
 * @file src/components/ToolsLibrary.tsx
 * @description The Tool Catalog and Testing Workbench.
 * 
 * FEATURES:
 * 1. **Catalog**: browsable list of all available tools (`AVAILABLE_TOOLS_LIST`).
 * 2. **Filtering**: Search by name or tag/category.
 * 3. **Inspector**: Detailed view of a tool's schema and description.
 * 4. **Mock Tester**: Interactive UI to execute tools with custom parameters and view raw output.
 */

export const ToolsLibrary: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 16;
  
  // Test State
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
    const [customToolTags, setCustomToolTags] = useState<Record<string, string[]>>({});

    // Load custom tags
    React.useEffect(() => {
        get('custom_tool_tags').then((val) => {
            if (val) setCustomToolTags(val);
        });
    }, []);

    // Filter & Pagination Logic
    const uniqueTags = Array.from(new Set(AVAILABLE_TOOLS_LIST.flatMap(t => {
        const custom = customToolTags[t.id] || [];
        return [...(t.tags || [t.category]), ...custom];
    }))).sort();
    const allTags = ['All', ...uniqueTags];

    const filteredTools = AVAILABLE_TOOLS_LIST.filter(tool => {
        const custom = customToolTags[tool.id] || [];
        const toolTags = [...(tool.tags || [tool.category]), ...custom];

        const matchesTag = selectedTag === 'All' || toolTags.includes(selectedTag);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = tool.name.toLowerCase().includes(searchLower) ||
            tool.description.toLowerCase().includes(searchLower);
        return matchesTag && matchesSearch;
    });

    const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visibleTools = filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Customer Service': return <HeadphonesIcon size={18} className="text-pink-400" />;
      case 'Data Retrieval': return <Database size={18} className="text-blue-400" />;
      case 'Utility': return <Calculator size={18} className="text-green-400" />;
      case 'Grounding': return <Zap size={18} className="text-yellow-400" />;
      default: return <LayoutGrid size={18} className="text-slate-400" />;
    }
  };

    const getToolIcon = (toolId: string) => {
        switch (toolId) {
            case 'google_search': return <Globe size={24} className="text-blue-400" />;
            case 'calculator': return <Calculator size={24} className="text-green-400" />;
            case 'get_current_time': return <Clock size={24} className="text-teal-400" />;
            case 'web_search_mock': return <Search size={24} className="text-purple-400" />;
            case 'crm_customer_lookup': return <Users size={24} className="text-pink-400" />;
            case 'check_order_status': return <Package size={24} className="text-orange-400" />;
            case 'kb_search': return <BookOpen size={24} className="text-cyan-400" />;
            case 'create_support_ticket': return <Ticket size={24} className="text-rose-400" />;
            case 'publish_report': return <FileText size={24} className="text-indigo-400" />;
            case 'nsw_trains_realtime': return <Train size={24} className="text-amber-400" />;
            case 'nsw_metro_realtime': return <Train size={24} className="text-emerald-400" />;
            case 'nsw_trip_planner': return <MapPin size={24} className="text-red-400" />;
            default: return <Terminal size={24} className="text-slate-400" />;
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

    /**
     * Executes the selected tool with the current test parameters.
     * Displays the valid JSON result or error message.
     * 
     * NOTE: This executes the REAL tool logic (e.g. fetching NSW Trains API),
     * not a simulation, unless the tool itself is a mock.
     */
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
          <div className="fixed inset-0 z-50 lg:absolute lg:right-0 lg:left-auto lg:top-0 lg:h-full lg:w-[500px] lg:z-20 bg-slate-900 lg:border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                  <div>
                     <h3 className="font-bold text-white text-lg">{selectedTool.name}</h3>
                      <div className="mt-1 mb-2">
                          <code className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs font-mono text-yellow-500">
                            {selectedTool.id}
                          </code>
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
                  <div className="space-y-4">
                      {/* Tool Tags */}
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between mb-2">
                              <span>Tags</span>
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                              {/* Combine static and custom tags */}
                              {Array.from(new Set([...(selectedTool.tags || [selectedTool.category]), ...(customToolTags[selectedTool.id] || [])])).map(tag => (
                                  <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 group/tag">
                                      {tag}
                                      {(customToolTags[selectedTool.id] || []).includes(tag) && (
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newTags = (customToolTags[selectedTool.id] || []).filter(t => t !== tag);
                                                  const newMap = { ...customToolTags, [selectedTool.id]: newTags };
                                                  setCustomToolTags(newMap);
                                                  set('custom_tool_tags', newMap);
                                              }}
                                              className="hover:text-white"
                                          >
                                              <X size={10} />
                                          </button>
                                      )}
                                  </span>
                              ))}
                          </div>
                          <input
                              type="text"
                              placeholder="+ Add tag..."
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                      const val = e.currentTarget.value.trim();
                                      if (val) {
                                          const current = customToolTags[selectedTool.id] || [];
                                          if (!current.includes(val)) {
                                              const newMap = { ...customToolTags, [selectedTool.id]: [...current, val] };
                                              setCustomToolTags(newMap);
                                              set('custom_tool_tags', newMap);
                                          }
                                          e.currentTarget.value = '';
                                      }
                                  }
                              }}
                          />
                      </div>

                  <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                              {selectedTool.description}
                          </p>
                  </div>

                  {/* Schema */}
                  {!isNative && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parameter Schema</h4>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-800/50 text-slate-400 font-medium">
                                              <tr>
                                                  <th className="px-4 py-2">Name</th>
                                                  <th className="px-4 py-2">Type</th>
                                                  <th className="px-4 py-2">Description</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-800">
                                              {Object.entries(selectedTool.functionDeclaration.parameters?.properties || {}).map(([key, prop]: [string, any]) => (
                                                  <tr key={key} className="hover:bg-slate-800/30">
                                                      <td className="px-4 py-2 font-mono text-brand-300">
                                                          {key}
                                                          {(selectedTool.functionDeclaration.parameters?.required || []).includes(key) && (
                                                              <span className="text-red-400 ml-1">*</span>
                                                          )}
                                                      </td>
                                                      <td className="px-4 py-2 text-purple-300 font-mono">{prop.type}</td>
                                                      <td className="px-4 py-2 text-slate-400">{prop.description}</td>
                                                  </tr>
                                              ))}
                                              {Object.keys(selectedTool.functionDeclaration.parameters?.properties || {}).length === 0 && (
                                                  <tr>
                                                      <td colSpan={3} className="px-4 py-3 text-center text-slate-500 italic">No parameters required.</td>
                                                  </tr>
                                              )}
                                          </tbody>
                                      </table>
                                  </div>
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


                                          // Custom rendering for Publish Report
                                          if (selectedTool.id === 'publish_report' && key === 'content') {
                                              return (
                                                  <div key={key}>
                                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                                      <textarea
                                                          value={testParams[key] || ''}
                                                          onChange={(e) => handleParamChange(key, e.target.value)}
                                                          placeholder={`Enter markdown content...`}
                                                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none font-mono min-h-[120px] resize-y"
                                                      />
                                                  </div>
                                              );
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
                                      {selectedTool.id === 'publish_report' ? (
                                          (() => {
                                              try {
                                                  const parsed = JSON.parse(executionResult);
                                                  const data = parsed.data;
                                                  if (!data) throw new Error("No data");
                                                  return (
                                                      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg">
                                                          <div className="border-b border-slate-700 pb-2 mb-3">
                                                              <h3 className="text-lg font-bold text-brand-300">{data.title}</h3>
                                                              <p className="text-xs text-slate-400 italic">{data.summary}</p>
                                                          </div>
                                                          <div className="prose prose-invert prose-sm max-w-none">
                                                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                  {data.content}
                                                              </ReactMarkdown>
                                                          </div>
                                                      </div>
                                                  );
                                              } catch (e) {
                                                  return (
                                                      <div className="bg-black rounded-lg p-3 font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto max-h-40 custom-scrollbar border border-slate-800">
                                                          {executionResult}
                                                      </div>
                                                  );
                                              }
                                          })()
                                      ) : (
                                              <div className="bg-black rounded-lg p-3 font-mono text-xs text-green-400 whitespace-pre-wrap overflow-x-auto max-h-40 custom-scrollbar border border-slate-800">
                                                  {executionResult}
                                              </div>
                                      )}
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
          </div>
      );
  };

  return (
    <div className="flex h-full bg-slate-900 relative overflow-hidden">
          <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${selectedTool ? 'lg:mr-[500px]' : ''}`}>
              {/* Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 space-y-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                              <Terminal className="text-brand-500" />
                              Tools Library
                          </h1>
                          <p className="text-slate-400 text-sm mt-1">
                              {AVAILABLE_TOOLS_LIST.length} executable functions available.
                          </p>
                      </div>
                  </div>

                  {/* Search & Filter */}
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                      <div className="relative w-full md:flex-1 md:max-w-[600px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                              placeholder="Search tools..."
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500/50 outline-none"
                          />
                      </div>
                      <div className="flex-shrink-0">
                          <CategoryDropdown
                              value={selectedTag}
                              categories={allTags}
                              onChange={(tag) => { setSelectedTag(tag); setCurrentPage(1); }}
                          />
                      </div>
                  </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                  {visibleTools.length > 0 ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
                          {visibleTools.map((tool) => {
                        const isNative = tool.id === 'google_search';
                        const isSelected = selectedTool?.id === tool.id;

                        return (
                        <div 
                            key={tool.id} 
                            onClick={() => handleSelectTool(tool)}
                            className={`
                                group relative border rounded-xl overflow-hidden transition-all shadow-sm cursor-pointer flex flex-col
                                ${isSelected 
                                ? 'bg-brand-900/10 border-brand-500 ring-1 ring-brand-500/50 shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.1)]' 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'}
                            `}
                        >
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 group-hover:border-slate-600 transition-colors">
                                            {getToolIcon(tool.id)}
                                        </div>
                                        {isNative && <Zap size={14} className="text-yellow-500" fill="currentColor" />}
                                    </div>
                                    <h3 className={`font-bold text-lg mb-2 transition-colors ${isSelected ? 'text-brand-300' : 'text-white group-hover:text-brand-300'}`}>
                                        {tool.name}
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                                    {tool.description}
                                </p>
                            </div>
                            
                                <div className="bg-slate-900/50 px-5 py-3 border-t border-slate-700/50 flex items-center justify-between mt-auto">
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set([...(tool.tags || [tool.category]), ...(customToolTags[tool.id] || [])])).map((tag, i) => (
                                            <span key={i} className="text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <ChevronRight size={16} className={`text-slate-600 transition-transform ${isSelected ? 'rotate-90 text-brand-500' : 'group-hover:text-slate-400'}`} />
                                </div>
                        </div>
                        );
                    })}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                          <Search size={48} className="mb-4 opacity-20" />
                          <p>No tools found matching your criteria.</p>
                      </div>
                  )}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
                      <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          <ChevronLeft size={16} />
                          Previous
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                          Page {currentPage} of {totalPages}
                      </span>
                      <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          Next
                          <ChevronRight size={16} />
                      </button>
                  </div>
              )}
      </div>

      {renderToolInspector()}
    </div>
  );
};
