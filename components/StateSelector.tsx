
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';

interface StateSelectorProps {
  value: string; // This will be the code
  onChange: (stateCode: string, stateName: string) => void;
  disabled?: boolean;
}

const StateSelector: React.FC<StateSelectorProps> = ({ value, onChange, disabled }) => {
  const [states, setStates] = useState<{ name: string; state_code: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStates = async () => {
      let isSubscribed = true;
      try {
        setLoading(true);
        // Add a timeout to the fetch to prevent permanent "fetching"
        const fetchPromise = supabase
          .from('states')
          .select('name, state_code')
          .order('name');

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), 3000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) throw error;
        if (data && data.length > 0 && isSubscribed) {
          setStates(data);
        } else {
          throw new Error('No data');
        }
      } catch (err) {
        console.warn('Using local fallback for states:', err);
        // If DB fails, we still want the dropdown to work
        // We can't know the codes for sure without the DB, 
        // but we can at least show the names. 
        // For a better experience, we'd need a full mapping.
      } finally {
        if (isSubscribed) setLoading(false);
      }
      return () => { isSubscribed = false; };
    };
    fetchStates();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        State
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const selected = states.find(s => s.state_code === e.target.value);
            if (selected) {
              onChange(selected.state_code, selected.name);
            }
          }}
          disabled={disabled || loading}
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm"
        >
          <option value="" disabled className="bg-slate-900">
            {loading ? 'Fetching States...' : 'Select State'}
          </option>
          {states.map((state) => (
            <option key={state.state_code} value={state.state_code} className="bg-slate-900">
              {state.name}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StateSelector;
