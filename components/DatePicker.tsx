
import React from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        Capture Timestamp
      </label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 text-sm font-bold shadow-sm [color-scheme:dark] relative z-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none z-0">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
