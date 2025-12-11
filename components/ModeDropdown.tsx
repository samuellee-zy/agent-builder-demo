import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Train, Bus, Ship, ChevronDown, Check } from 'lucide-react';

interface ModeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MODES = [
  { id: 'train', name: 'Train', icon: Train, color: 'text-orange-400', bg: 'bg-orange-900/20' },
  { id: 'metro', name: 'Metro', icon: Train, color: 'text-teal-400', bg: 'bg-teal-900/20' },
  { id: 'bus', name: 'Bus', icon: Bus, color: 'text-blue-400', bg: 'bg-blue-900/20' },
  { id: 'ferry', name: 'Ferry', icon: Ship, color: 'text-green-400', bg: 'bg-green-900/20' },
  { id: 'lightrail', name: 'Light Rail', icon: Train, color: 'text-red-400', bg: 'bg-red-900/20' },
  { id: 'coach', name: 'Coach', icon: Bus, color: 'text-purple-400', bg: 'bg-purple-900/20' },
];

export const ModeDropdown: React.FC<ModeDropdownProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const selectedMode = MODES.find(m => m.id === value) || MODES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (portalRef.current && portalRef.current.contains(event.target as Node)) {
        return;
      }
      if (isOpen) setIsOpen(false); // Close on external scroll
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // Capture scroll events from any container
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 20; // Increased buffer

      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(50, Math.min(300, spaceBelow)) // Ensure at least 50px, max 300px, but prefer spaceBelow. Actually strictly respecting spaceBelow is better to avoid scroll.
      });
    }
  }, [isOpen]);

  const handleSelect = (modeId: string) => {
    onChange(modeId);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none flex items-center justify-between group hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedMode.bg} ${selectedMode.color}`}>
            <selectedMode.icon size={12} />
          </div>
          <span className="font-medium">{selectedMode.name}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={portalRef}
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-[9999] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight
          }}
        >
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className="w-full text-left px-3 py-3 hover:bg-slate-700/50 flex items-center justify-between transition-colors group border-b border-slate-700/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${mode.bg} ${mode.color}`}>
                  <mode.icon size={16} />
                </div>
                <span className="text-sm text-slate-200 font-medium">{mode.name}</span>
              </div>
              {value === mode.id && <Check size={14} className="text-brand-400" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
