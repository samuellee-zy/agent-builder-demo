import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean; // true for green, false for red, undefined for neutral
    color?: string; // Tailwind text color class for icon
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, trendUp, color = 'text-brand-400' }) => {
    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={48} />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <div className={`p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 ${color}`}>
                         <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                </div>
                
                <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
                    {trend && (
                        <div className={`text-xs font-bold mb-1.5 px-1.5 py-0.5 rounded border ${
                            trendUp === true ? 'text-green-400 bg-green-900/20 border-green-500/20' :
                            trendUp === false ? 'text-red-400 bg-red-900/20 border-red-500/20' :
                            'text-slate-400 bg-slate-800 border-slate-700'
                        }`}>
                            {trend}
                        </div>
                    )}
                </div>
            </div>
             {/* Decorator Line */}
             <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${color.replace('text-', '')} to-transparent opacity-0 group-hover:opacity-50 transition-opacity`}></div>
        </div>
    );
};
