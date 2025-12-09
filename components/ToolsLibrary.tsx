
import React from 'react';
import { AVAILABLE_TOOLS_LIST } from '../services/tools'; // Updated source
import { Terminal, Code2, Zap, LayoutGrid, Database, HeadphonesIcon, Calculator } from 'lucide-react';

export const ToolsLibrary: React.FC = () => {
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

  return (
    <div className="flex flex-col h-full bg-slate-900">
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
                    return (
                    <div key={tool.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors shadow-sm">
                        <div className="p-5 border-b border-slate-700/50 bg-slate-800/50">
                        <div className="flex items-start justify-between">
                            <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white text-lg">{tool.name}</h3>
                                <code className="text-[10px] bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                                    {tool.id}
                                </code>
                            </div>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            {tool.description}
                        </p>
                        </div>
                        {!isNative && (
                            <div className="bg-slate-950 p-4 font-mono text-xs overflow-x-auto custom-scrollbar group relative">
                                <div className="flex items-center gap-2 text-slate-500 mb-2 select-none">
                                    <Code2 size={12} />
                                    <span>Logic Preview</span>
                                </div>
                                <div className="text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {/* Show a snippet of the executable function converted to string */}
                                    {tool.executable.toString().slice(0, 150)}...
                                </div>
                            </div>
                        )}
                        {isNative && (
                            <div className="bg-slate-950 p-4 font-mono text-xs flex items-center gap-2 text-yellow-500/80">
                                <Zap size={12} />
                                <span>Native Gemini Grounding Integration</span>
                            </div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
