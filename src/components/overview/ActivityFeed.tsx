import React from 'react';
import { Agent } from '../../types';
import { Clock, MessageSquare, Plus, Activity, Zap, Play } from 'lucide-react';

interface ActivityFeedProps {
    agents: Agent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ agents }) => {
    // 1. Flatten all sessions into a single list of "Activities"
    // We can also infer "Agent Created" events from agent.createdAt
    
    type ActivityItem = {
        id: string;
        type: 'session' | 'creation' | 'update';
        agentName: string;
        timestamp: Date;
        description: string;
        icon: any;
        color: string;
    };

    const activities: ActivityItem[] = [];

    agents.forEach(agent => {
        // Agent Creation Event
        activities.push({
            id: `create-${agent.id}`,
            type: 'creation',
            agentName: agent.name,
            timestamp: new Date(agent.createdAt),
            description: `Agent initialized with ${agent.model}`,
            icon: Plus,
            color: 'text-blue-400'
        });

        // Session Events
        if (agent.sessions) {
            agent.sessions.forEach(session => {
                const msgCount = session.messages.length;
                activities.push({
                    id: `session-${session.id}`,
                    type: 'session',
                    agentName: agent.name,
                    timestamp: new Date(session.timestamp),
                    description: `Ran session with ${msgCount} messages`,
                    icon: Play, // Using Play instead of MessageSquare for variety
                    color: 'text-green-400'
                });
            });
        }
    });

    // Sort by timestamp desc and take recent
    const recentActivities = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);

    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Activity size={16} className="text-brand-400" />
                    Recent Activity
                </h3>
                <span className="text-xs text-slate-500">{recentActivities.length} events</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {recentActivities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-4 group">
                         {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700 group-hover:border-brand-500/50 transition-colors ${activity.color} shadow-lg`}>
                                <activity.icon size={14} />
                            </div>
                            {idx < recentActivities.length - 1 && (
                                <div className="w-0.5 h-full bg-slate-800 my-2 group-hover:bg-slate-700 transition-colors"></div>
                            )}
                        </div>
                        
                        <div className="flex-1 pb-2">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-bold text-slate-200">{activity.agentName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-snug">{activity.description}</p>
                             <div className="mt-1 text-[10px] text-slate-600">
                                {activity.timestamp.toLocaleDateString()}
                             </div>
                        </div>
                    </div>
                ))}

                {recentActivities.length === 0 && (
                    <div className="text-center py-8 text-slate-500 italic text-sm">
                        No recent activity found.
                    </div>
                )}
            </div>
        </div>
    );
};
