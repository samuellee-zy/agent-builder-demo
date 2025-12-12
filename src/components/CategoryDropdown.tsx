import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, LayoutGrid, HeadphonesIcon, Database, Calculator, Zap, Search, Train, MapPin, Clock, FileText, Book, MousePointerClick } from 'lucide-react';

interface CategoryDropdownProps {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
  className?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({ value, categories, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Customer Service': return <HeadphonesIcon size={14} className="text-pink-400" />;
      case 'Data Retrieval': return <Database size={14} className="text-blue-400" />;
      case 'Utility': return <Calculator size={14} className="text-green-400" />;
      case 'Grounding': return <Zap size={14} className="text-yellow-400" />;
      case 'Search': return <Search size={14} className="text-purple-400" />;
      case 'Transport': return <Train size={14} className="text-orange-400" />;
      case 'Planning': return <MapPin size={14} className="text-red-400" />;
      case 'Math': return <Calculator size={14} className="text-green-400" />;
      case 'Time': return <Clock size={14} className="text-teal-400" />;
      case 'Report': return <FileText size={14} className="text-indigo-400" />;
      case 'Knowledge Base': return <Book size={14} className="text-cyan-400" />;
      case 'Action': return <MousePointerClick size={14} className="text-rose-400" />;
      default: return <LayoutGrid size={14} className="text-slate-400" />;
    }
  };

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
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
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
      const spaceBelow = window.innerHeight - rect.bottom - 20;

      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200), // Min width for dropdown
        maxHeight: Math.max(50, Math.min(300, spaceBelow))
      });
    }
  }, [isOpen]);

  const handleSelect = (cat: string) => {
    onChange(cat);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-auto min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none flex items-center justify-between group hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getCategoryIcon(value)}
          <span className="font-medium truncate">{value}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ml-2 ${isOpen ? 'rotate-180' : ''}`} />
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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleSelect(cat)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-700/50 flex items-center justify-between transition-colors group border-b border-slate-700/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                {getCategoryIcon(cat)}
                <span className={`text-sm font-medium ${value === cat ? 'text-white' : 'text-slate-300'}`}>
                  {cat}
                </span>
              </div>
              {value === cat && <Check size={14} className="text-brand-400" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
