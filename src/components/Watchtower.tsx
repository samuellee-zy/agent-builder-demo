import React, { useState, useEffect } from 'react';
import { Agent, WatchtowerAnalysis } from '../types';
import { WatchtowerService } from '../services/watchtower';
import { 
  Activity, 
  BarChart3, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  RefreshCw, 
  Search, 
  ArrowRight, 
  Lightbulb, 
  Clock, 
  Target, 
    Terminal,
    ChevronDown
} from 'lucide-react';

interface WatchtowerProps {
  agents: Agent[];
  onUpdateAgent: (agent: Agent) => void;
}

/**
 * @file src/components/Watchtower.tsx
 * @description The Observability Dashboard ("Watchtower").
 * 
 * FEATURES:
 * 1. **Live Pulse**: Real-time metrics (Last Active, Total Sessions).
 * 2. **Deep Analysis**: Triggers `WatchtowerService` to generate insights.
 * 3. **Visualization**: Displays Intent Clusters, Sentiment Scores, and Latency.
 * 4. **Recommendations**: Shows strategic improvements suggested by the AI.
 */

export const Watchtower: React.FC<WatchtowerProps> = ({ agents, onUpdateAgent }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const analysis = selectedAgent?.watchtowerAnalysis;

  // Simple In-Session Metrics (Client-Side Simulation)
  const getLiveMetrics = () => {
      if (!selectedAgent || !selectedAgent.sessions) return { count: 0, lastActive: 'Never' };
      const sessions = selectedAgent.sessions;
      const total = sessions.length;
      const last = sessions.length > 0 ? new Date(sessions[0].timestamp).toLocaleString() : 'Never';
      return { count: total, lastActive: last };
  };

  const liveMetrics = getLiveMetrics();

    /**
     * Triggers the Watchtower Analysis Service.
     * Sends the agent's session history to Gemini for offline evaluation.
     * 
     * STRATEGY:
     * 1. Extract recent sessions (max 20 to fit context window).
     * 2. Call `WatchtowerService.runAnalysis` which prompts Gemini 3 Pro.
     * 3. Receive structured JSON (intents, recommendations, sentiment).
     * 4. Update the Agent model with the new analysis to persist it.
     */
  const handleRunAnalysis = async () => {
    if (!selectedAgent) return;
    setIsAnalyzing(true);
    try {
        const service = new WatchtowerService();
        const result = await service.runAnalysis(selectedAgent);
        
        const updatedAgent = {
            ...selectedAgent,
            watchtowerAnalysis: result
        };
        onUpdateAgent(updatedAgent);
    } catch (e) {
        alert("Analysis failed. Please ensure you have recent sessions.");
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (!selectedAgent) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Activity size={64} className="mb-4 opacity-20" />
              <p>No agents available to monitor.</p>
          </div>
      );
  }

  return (
    <div className="flex h-full bg-slate-900 text-slate-200">
          {/* Sidebar: Agent Selector (Desktop) */}
          <div className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 p-4 flex-col">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Select Agent</h2>
            <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                {agents.map(agent => (
                    <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedAgentId === agent.id 
                            ? 'bg-brand-900/20 border-brand-500 text-white shadow-lg shadow-brand-500/10' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        <div className="font-bold text-sm truncate">{agent.name}</div>
                        <div className="text-[10px] mt-1 flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${agent.watchtowerAnalysis ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                             {agent.watchtowerAnalysis ? 'Analyzed' : 'No Data'}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {/* Mobile Agent Selector */}
              <div className="md:hidden mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Agent</label>
                  <div className="relative">
                      <select
                          value={selectedAgentId}
                          onChange={(e) => setSelectedAgentId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-3 appearance-none focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                          {agents.map(agent => (
                              <option key={agent.id} value={agent.id}>
                                  {agent.name} {agent.watchtowerAnalysis ? '(Analyzed)' : ''}
                              </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Activity className="text-brand-500" />
                        Watchtower
                    </h1>
                      <p className="text-slate-400 text-sm md:text-base">Observability & Insights Engine</p>
                </div>
                <button 
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                      className="w-full md:w-auto bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                >
                    {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                    {isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}
                </button>
            </div>

              {/* Live Pulse Section */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 mb-8">
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">Last Active</span>
                    </div>
                    <div className="text-xl font-mono text-white">{liveMetrics.lastActive}</div>
                </div>
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Target size={16} />
                        <span className="text-xs font-bold uppercase">Total Sessions</span>
                    </div>
                    <div className="text-xl font-mono text-white">{liveMetrics.count}</div>
                </div>
                {analysis && (
                     <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Activity size={64} className="text-brand-500" />
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <CheckCircle size={16} />
                            <span className="text-xs font-bold uppercase">Global Satisfaction</span>
                        </div>
                        <div className={`text-3xl font-bold ${analysis.globalScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {analysis.globalScore}/100
                        </div>
                    </div>
                )}
            </div>

            {/* Analysis Results */}
            {analysis ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Intents Grid */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Search size={18} className="text-blue-400" />
                            Detected Intents
                        </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {analysis.intents.map(intent => (
                                <div key={intent.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:bg-slate-800 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white">{intent.name}</h3>
                                        <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">{intent.count} detections</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4">{intent.description}</p>
                                    <div className="flex items-center gap-4 text-xs font-mono">
                                        <div className="flex items-center gap-1">
                                            <Zap size={12} className={intent.avgLatency > 2000 ? 'text-red-400' : 'text-green-400'} />
                                            <span className={intent.avgLatency > 2000 ? 'text-red-300' : 'text-slate-300'}>{intent.avgLatency}ms</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity size={12} className={intent.avgSentiment > 70 ? 'text-green-400' : 'text-yellow-400'} />
                                            <span>{intent.avgSentiment}% Sat</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Lightbulb size={18} className="text-yellow-400" />
                            Strategic Recommendations
                        </h2>
                        <div className="space-y-4">
                            {analysis.recommendations.map(rec => (
                                <div key={rec.id} className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-l-4 border-l-brand-500 border-y border-r border-slate-700 rounded-r-xl p-6 relative group">
                                    <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-slate-950 px-2 py-1 rounded text-slate-500">
                                        {rec.impact} Impact
                                    </div>
                                    <h3 className="font-bold text-white text-lg mb-1">{rec.title}</h3>
                                    <span className="text-xs text-brand-400 font-bold uppercase mb-2 block">{rec.category}</span>
                                    <p className="text-slate-300 text-sm mb-4 max-w-2xl">{rec.description}</p>
                                    
                                    {rec.actionContext && (
                                        <div className="bg-black/30 rounded-lg p-3 text-xs font-mono text-slate-400 border border-slate-700/50">
                                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                                <Terminal size={12} /> Suggested Action
                                            </div>
                                            {rec.actionContext}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="text-center text-xs text-slate-600 pt-8">
                        Analysis generated at {new Date(analysis.timestamp).toLocaleString()} based on {analysis.sessionsAnalyzed} sessions.
                    </div>
                </div>
            ) : (
                <div className="mt-12 p-12 bg-slate-800/30 border border-slate-800 border-dashed rounded-xl text-center">
                    <BarChart3 size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-400 mb-2">No Analysis Data</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                        Run a deep analysis to cluster user intents, measure sentiment, and generate actionable recommendations for this agent.
                    </p>
                    <button 
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="text-brand-400 hover:text-brand-300 text-sm font-bold flex items-center justify-center gap-2"
                    >
                        Start Analysis <ArrowRight size={14} />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};