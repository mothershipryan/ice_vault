
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';

interface StateSelectorProps {
  value: string; // This will be the code
  onChange: (stateCode: string, stateName: string) => void;
  disabled?: boolean;
}

const FALLBACK_STATES = [
  { name: "Alabama", state_code: "AL" }, { name: "Alaska", state_code: "AK" },
  { name: "Arizona", state_code: "AZ" }, { name: "Arkansas", state_code: "AR" },
  { name: "California", state_code: "CA" }, { name: "Colorado", state_code: "CO" },
  { name: "Connecticut", state_code: "CT" }, { name: "Delaware", state_code: "DE" },
  { name: "Florida", state_code: "FL" }, { name: "Georgia", state_code: "GA" },
  { name: "Hawaii", state_code: "HI" }, { name: "Idaho", state_code: "ID" },
  { name: "Illinois", state_code: "IL" }, { name: "Indiana", state_code: "IN" },
  { name: "Iowa", state_code: "IA" }, { name: "Kansas", state_code: "KS" },
  { name: "Kentucky", state_code: "KY" }, { name: "Louisiana", state_code: "LA" },
  { name: "Maine", state_code: "ME" }, { name: "Maryland", state_code: "MD" },
  { name: "Massachusetts", state_code: "MA" }, { name: "Michigan", state_code: "MI" },
  { name: "Minnesota", state_code: "MN" }, { name: "Mississippi", state_code: "MS" },
  { name: "Missouri", state_code: "MO" }, { name: "Montana", state_code: "MT" },
  { name: "Nebraska", state_code: "NE" }, { name: "Nevada", state_code: "NV" },
  { name: "New Hampshire", state_code: "NH" }, { name: "New Jersey", state_code: "NJ" },
  { name: "New Mexico", state_code: "NM" }, { name: "New York", state_code: "NY" },
  { name: "North Carolina", state_code: "NC" }, { name: "North Dakota", state_code: "ND" },
  { name: "Ohio", state_code: "OH" }, { name: "Oklahoma", state_code: "OK" },
  { name: "Oregon", state_code: "OR" }, { name: "Pennsylvania", state_code: "PA" },
  { name: "Rhode Island", state_code: "RI" }, { name: "South Carolina", state_code: "SC" },
  { name: "South Dakota", state_code: "SD" }, { name: "Tennessee", state_code: "TN" },
  { name: "Texas", state_code: "TX" }, { name: "Utah", state_code: "UT" },
  { name: "Vermont", state_code: "VT" }, { name: "Virginia", state_code: "VA" },
  { name: "Washington", state_code: "WA" }, { name: "West Virginia", state_code: "WV" },
  { name: "Wisconsin", state_code: "WI" }, { name: "Wyoming", state_code: "WY" }
];

const StateSelector: React.FC<StateSelectorProps> = ({ value, onChange, disabled }) => {
  const [states, setStates] = useState<{ name: string; state_code: string }[]>(FALLBACK_STATES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStates = async () => {
      let isSubscribed = true;
      try {
        setLoading(true);
        const fetchPromise = supabase
          .from('states')
          .select('name, state_code')
          .order('name');

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), 2000)
        );

        const result: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (result && result.data && result.data.length > 0 && isSubscribed) {
          setStates(result.data);
        }
      } catch (err) {
        console.warn('Using local fallback for states:', err);
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
          disabled={disabled}
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm"
        >
          <option value="" disabled className="bg-slate-900">
            {loading && states.length === 0 ? 'Fetching States...' : 'Select State'}
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
