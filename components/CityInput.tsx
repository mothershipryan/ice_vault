
import React from 'react';

interface CityInputProps {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
}

const CityInput: React.FC<CityInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        City / Municipality
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="ENTER LOCATION"
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm placeholder:text-slate-600 placeholder:tracking-widest"
        />
        {!value && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
             <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
             </svg>
            </div>
        )}
      </div>
    </div>
  );
};

export default CityInput;
