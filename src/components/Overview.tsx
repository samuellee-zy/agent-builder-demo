import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { StatCard } from './overview/StatCard';
import { ActivityFeed } from './overview/ActivityFeed';
import { MediaCarousel } from './overview/MediaCarousel';
import {
    Users,
    MessageSquare,
    Zap,
    Activity,
    Plus,
    ExternalLink,
    Train,
    Map as MapIcon,
    ArrowRight
} from 'lucide-react';

interface OverviewProps {
    agents: Agent[];
    onNavigate: (tab: string) => void;
    onNewAgent: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ agents, onNavigate, onNewAgent }) => {
    // Calculate Stats
    const totalSessions = agents.reduce((acc, a) => acc + (a.sessions?.length || 0), 0);

    // Calculate intelligent "System Satisfaction" score
    // Purely synthetic for now based on Watchtower analysis existence + mock logic or actual scores if available
    const analyzedAgents = agents.filter(a => a.watchtowerAnalysis);
    const avgScore = analyzedAgents.length > 0
        ? Math.round(analyzedAgents.reduce((acc, a) => acc + (a.watchtowerAnalysis?.globalScore || 0), 0) / analyzedAgents.length)
        : 75; // Baseline mock score if no analysis yet

    // Live Ticker State
    const [activeService, setActiveService] = useState(0);
    const services = [
        { name: 'Gemini 2.5 Flash', status: 'Operational', color: 'bg-green-500' },
        { name: 'Gemini 3.0 Pro', status: 'Preview', color: 'bg-blue-500' },
        { name: 'Veo Video Gen 3.1', status: 'Operational', color: 'bg-purple-500' },
        { name: 'Imagen 4', status: 'Operational', color: 'bg-pink-500' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveService(prev => (prev + 1) % services.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full bg-slate-950 text-white overflow-y-auto custom-scrollbar p-4 md:p-8">

            {/* 1. Hero / Header with Pulse Ticker */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-purple-400 drop-shadow-sm">
                        Command Center
                    </h1>
                    <p className="text-slate-400 mt-1">System Overview & Operational Metrics</p>
                </div>

                {/* Live Status Ticker (Compact & Interactive) */}
                <div className="group relative z-50">
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-full pl-3 pr-4 py-2 flex items-center gap-3 shadow-lg cursor-help transition-all hover:border-slate-600">
                        <div className="flex items-center gap-2">
                            <span className={`relative flex h-3 w-3`}>
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${services[activeService].color}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${services[activeService].color}`}></span>
                            </span>
                            <span className="text-sm font-medium text-slate-200">{services[activeService].name}</span>
                        </div>

                        {/* Status Text (Only visible on Hover) */}
                        <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap pl-0 group-hover:pl-3 border-l-0 group-hover:border-l border-slate-700">
                            <span className={`text-xs font-bold ${services[activeService].color.replace('bg-', 'text-')}`}>
                                {services[activeService].status}
                            </span>
                        </div>
                    </div>

                    {/* Extended Details Dropdown */}
                    <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right translate-y-2 group-hover:translate-y-0">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Service Health
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono">
                                Live Updates
                            </div>
                        </div>

                        <div className="space-y-2">
                            {services.map((service, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group/item">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${service.color} shadow-[0_0_8px_currentColor] opacity-80 group-hover/item:opacity-100 transition-opacity`}></div>
                                        <span className="text-xs font-medium text-slate-300 group-hover/item:text-white transition-colors">{service.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/50 border border-slate-800 ${service.color.replace('bg-', 'text-')}`}>
                                        {service.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Grid (Adaptive) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                    label="Active Agents"
                    value={agents.length}
                    icon={Users}
                    trend={`+${agents.filter(a => new Date(a.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length} this week`}
                    trendUp={true}
                    color="text-blue-400"
                />
                <StatCard
                    label="Total Sessions"
                    value={totalSessions}
                    icon={MessageSquare}
                    trend="Lifetime Volume"
                    color="text-purple-400"
                />
                <StatCard
                    label="Global IQ Score"
                    value={`${avgScore}%`}
                    icon={Zap}
                    trend={avgScore > 80 ? "High Performance" : "Optimization Needed"}
                    trendUp={avgScore > 80}
                    color="text-yellow-400"
                />
            </div>

            {/* 3. Media Wall (Full Width) */}
            <div className="mb-8">
                <MediaCarousel agents={agents} />
            </div>

            {/* 4. Split View: Actions & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Quick Actions (Workbench) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14} className="text-brand-400" />
                        Workbench
                    </h3>

                    {/* Primary Action */}
                    <button
                        onClick={onNewAgent}
                        className="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white p-5 rounded-xl shadow-lg shadow-brand-500/20 group transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg">Create New Agent</span>
                            <div className="bg-white/20 p-2 rounded-lg group-hover:rotate-90 transition-transform">
                                <Plus size={20} />
                            </div>
                        </div>
                        <p className="text-brand-100 text-sm text-left opacity-90">Launch the Architect to build a new AI system from scratch.</p>
                    </button>

                    {/* Secondary Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onNavigate('tools')}
                            className="bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 p-4 rounded-xl flex flex-col gap-2 transition-all group"
                        >
                            <Train size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block font-bold text-slate-200">Tools Lib</span>
                                <span className="text-xs text-slate-500">Test APIs</span>
                            </div>
                        </button>

                        <button
                            onClick={() => onNavigate('watchtower')}
                            className="bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 p-4 rounded-xl flex flex-col gap-2 transition-all group"
                        >
                            <Activity size={24} className="text-green-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block font-bold text-slate-200">Watchtower</span>
                                <span className="text-xs text-slate-500">Live Analytics</span>
                            </div>
                        </button>
                    </div>

                    {/* Useful Links / Documentation */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resources</h4>
                        <div className="space-y-2">
                            <a href="#" className="flex items-center justify-between text-sm text-slate-400 hover:text-white group">
                                <span>Vertex AI Documentation</span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <div className="h-px bg-slate-800"></div>
                            <a href="#" className="flex items-center justify-between text-sm text-slate-400 hover:text-white group">
                                <span>Transport NSW API Guide</span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right: Activity Feed (Spans 2 cols on Large) */}
                <div className="lg:col-span-2 min-h-[400px]">
                    <ActivityFeed agents={agents} />
                </div>
            </div>
        </div>
    );
};
