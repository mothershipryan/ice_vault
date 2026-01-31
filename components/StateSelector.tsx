
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
      try {
        setLoading(true);
        console.log('Fetching states from Supabase...');
        const { data, error } = await supabase
          .from('states')
          .select('name, state_code')
          .order('name');

        if (error) {
          console.error('Supabase Error fetching states:', error);
          return;
        }

        if (data) {
          console.log(`Successfully fetched ${data.length} states`);
          setStates(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching states:', err);
      } finally {
        setLoading(false);
      }
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
