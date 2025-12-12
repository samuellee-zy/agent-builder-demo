import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

interface LocationFinderProps {
  onSelect: (locationName: string) => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface StopLocation {
  id: string;
  name: string;
  disassembledName?: string;
  type?: string;
}

export const LocationFinder: React.FC<LocationFinderProps> = ({ onSelect, onClose, className, style }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StopLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type_sf: 'any',
          name_sf: query,
          TfNSWSF: 'true'
        });

        // Use the proxy endpoint
        const res = await fetch(`/api/transport/planner/stop_finder?${params}`);
        if (!res.ok) throw new Error('Failed to fetch locations');

        const data = await res.json();
        if (data.locations) {
          setResults(data.locations);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to search locations');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div
      style={style}
      className={`absolute w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 ${className || 'bottom-16 left-0'}`}
    >
      <div className="p-3 border-b border-slate-700 flex items-center gap-2 bg-slate-800/50">
        <Search size={14} className="text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search NSW locations..."
          className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 focus:ring-0 p-0"
        />
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar bg-slate-900/50">
        {isLoading ? (
          <div className="p-4 flex justify-center text-slate-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-red-400">{error}</div>
        ) : results.length > 0 ? (
          <div className="py-1">
            {results.map((loc) => (
              <button
                key={loc.id}
                onClick={() => onSelect(loc.disassembledName || loc.name)}
                className="w-full text-left px-4 py-2 hover:bg-slate-700/50 flex items-center gap-3 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-brand-900/30 group-hover:text-brand-400">
                  <MapPin size={14} />
                </div>
                <div>
                  <p className="text-sm text-slate-200 font-medium">{loc.disassembledName || loc.name}</p>
                  <p className="text-[10px] text-slate-500">ID: {loc.id}</p>
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 3 ? (
          <div className="p-4 text-center text-xs text-slate-500">No locations found</div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-600">Type at least 3 characters to search</div>
        )}
      </div>
    </div>
  );
};
