
import React from 'react';
import { US_STATES } from '../constants.ts';

interface StateSelectorProps {
  value: string;
  onChange: (state: string) => void;
  disabled?: boolean;
}

const StateSelector: React.FC<StateSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        State
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm"
        >
          <option value="" disabled className="bg-slate-900">Select State</option>
          {US_STATES.map((state) => (
            <option key={state} value={state} className="bg-slate-900">
              {state}
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
