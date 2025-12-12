import React from 'react';
import { Train, Bus, Ship, X } from 'lucide-react';

interface TransportModeSelectorProps {
  onSelect: (mode: string) => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const MODES = [
  { id: 'train', name: 'Train', icon: Train, color: 'text-orange-400', bg: 'bg-orange-900/20' },
  { id: 'metro', name: 'Metro', icon: Train, color: 'text-teal-400', bg: 'bg-teal-900/20' },
  { id: 'bus', name: 'Bus', icon: Bus, color: 'text-blue-400', bg: 'bg-blue-900/20' },
  { id: 'ferry', name: 'Ferry', icon: Ship, color: 'text-green-400', bg: 'bg-green-900/20' },
  { id: 'lightrail', name: 'Light Rail', icon: Train, color: 'text-red-400', bg: 'bg-red-900/20' },
  { id: 'coach', name: 'Coach', icon: Bus, color: 'text-purple-400', bg: 'bg-purple-900/20' },
];

export const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({ onSelect, onClose, className, style }) => {
  return (
    <div
      style={style}
      className={`absolute w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 ${className || 'bottom-16 left-10'}`}
    >
      <div className="p-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
        <span className="text-xs font-bold text-slate-400 uppercase px-2">Select Mode</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
          <X size={12} />
        </button>
      </div>
      <div className="p-1">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className="w-full text-left px-3 py-2 hover:bg-slate-700/50 flex items-center gap-3 rounded-lg transition-colors group"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mode.bg} ${mode.color}`}>
              <mode.icon size={14} />
            </div>
            <span className="text-sm text-slate-200 font-medium group-hover:text-white">{mode.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
