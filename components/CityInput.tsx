
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient.ts';

interface CityInputProps {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  state: string;
  stateName?: string;
}

const CityInput: React.FC<CityInputProps> = ({ value, onChange, disabled, state, stateName }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        if (!state || !value || value.length < 2) {
          setSuggestions([]);
          return;
        }

        // Try matching against state_code using either the code OR the full name
        const { data, error } = await supabase
          .from('cities')
          .select('name')
          .or(`state_code.eq."${state}",state_code.eq."${stateName}"`)
          .ilike('name', `${value}%`)
          .limit(50);

        if (error) {
          console.error('Supabase Error fetching cities:', error);
          return;
        }

        if (data) {
          const uniqueCities = Array.from(new Set(data.map((c: any) => c.name)));
          setSuggestions(uniqueCities.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Unexpected error fetching cities:', err);
      }
    };

    const timeoutId = setTimeout(fetchCities, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [value, state]);

  const handleSelect = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={wrapperRef}>
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        City / Municipality
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !state}
          placeholder={state ? "ENTER LOCATION" : "SELECT STATE FIRST"}
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm placeholder:text-slate-600 placeholder:tracking-widest"
          autoComplete="off"
        />
        {!value && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
        )}

        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl z-50">
            {suggestions.map((city, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(city)}
                className="w-full text-left px-5 py-3 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white transition-colors uppercase"
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CityInput;
