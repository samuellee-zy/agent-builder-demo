
import React from 'react';
import { AVAILABLE_TOOLS } from '../types';
import { Terminal, Code2, Zap } from 'lucide-react';

export const ToolsLibrary: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-8 border-b border-slate-800">
        <h1 className="text-3xl font-bold text-white mb-2">Tools Library</h1>
        <p className="text-slate-400">Available functions and capabilities for your agents.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {AVAILABLE_TOOLS.map((tool) => {
            const isNative = tool.id === 'google_search'; // or other native checks
            return (
              <div key={tool.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
                <div className="p-5 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isNative ? (
                             <Zap size={18} className="text-yellow-400" />
                        ) : (
                             <Terminal size={18} className="text-brand-400" />
                        )}
                        <h3 className="font-bold text-white text-lg">{tool.name}</h3>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded uppercase tracking-wider ${isNative ? 'bg-yellow-900/20 text-yellow-500' : 'bg-slate-900 text-slate-500'}`}>
                        {tool.category}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                {!isNative && tool.code && (
                    <div className="bg-slate-950 p-4 font-mono text-xs overflow-x-auto custom-scrollbar">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Code2 size={12} />
                            <span>Implementation (Python)</span>
                        </div>
                        <pre className="text-emerald-400">
                            {tool.code}
                        </pre>
                    </div>
                )}
                {isNative && (
                    <div className="bg-slate-950 p-4 font-mono text-xs flex items-center gap-2 text-slate-500">
                        <Zap size={12} />
                        <span>Native Gemini API Integration</span>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
