import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, MapPin, Loader2, X } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface StopLocation {
  id: string;
  name: string;
  disassembledName?: string;
  type?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ value, onChange, placeholder, className }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<StopLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (portalRef.current && portalRef.current.contains(event.target as Node)) {
        return;
      }
      if (showSuggestions) setShowSuggestions(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showSuggestions]);

  useEffect(() => {
    if (showSuggestions && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 20;

      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(50, Math.min(300, spaceBelow))
      });
    }
  }, [showSuggestions, results]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          type_sf: 'any',
          name_sf: query,
          TfNSWSF: 'true'
        });

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
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (location: string) => {
    onChange(location);
    setQuery(location);
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal);
    setShowSuggestions(true);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder || "Search location..."}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none font-mono pl-8"
        />
        <MapPin size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
        {isLoading && (
          <div className="absolute right-2.5 top-2.5">
            <Loader2 size={14} className="animate-spin text-brand-400" />
          </div>
        )}
      </div>

      {showSuggestions && (results.length > 0 || query.length >= 3) && position && createPortal(
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
          {results.length > 0 ? (
            results.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelect(loc.disassembledName || loc.name)}
                className="w-full text-left px-3 py-2 hover:bg-slate-700/50 flex items-center gap-2 transition-colors group border-b border-slate-700/50 last:border-0"
              >
                <MapPin size={12} className="text-slate-500 group-hover:text-brand-400" />
                <div>
                  <p className="text-xs text-slate-200 font-medium">{loc.disassembledName || loc.name}</p>
                </div>
              </button>
            ))
          ) : (
            !isLoading && <div className="p-3 text-center text-xs text-slate-500">No locations found</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
