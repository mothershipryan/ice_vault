import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, disabled }) => {
  // Parse initial date from value string (YYYY-MM-DD) or default to today
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();

  // State for the currently displayed month in the popup
  const [viewDate, setViewDate] = useState(initialDate);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync viewDate if external value changes significantly
  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
          setViewDate(date);
        }
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    if (disabled) return;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    // Format as YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysCount = daysInMonth(currentYear, currentMonth);
  const startDay = startDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Helper to check if a specific day is the currently selected date
  const isSelected = (day: number) => {
    if (!value) return false;
    const [selYear, selMonth, selDay] = value.split('-').map(Number);
    return selYear === currentYear && selMonth === currentMonth + 1 && selDay === day;
  };

  // Helper to check if a day is "Today"
  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day;
  };

  // Format date for display in the trigger input
  const formattedDateValue = () => {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={containerRef}>
      <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
        Capture Timestamp
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full h-[64px] bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 
          transition-all text-sm font-bold shadow-sm flex items-center justify-between cursor-pointer
          hover:bg-slate-800/50 hover:border-slate-600
          ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500' : ''}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <span>{formattedDateValue()}</span>
        <svg className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Popup Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl">
            {/* Header: Month/Year + Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-white text-sm font-bold tracking-wide uppercase">
                {monthNames[currentMonth]} <span className="text-blue-400">{currentYear}</span>
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {daysOfWeek.map(d => (
                <div key={d} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {d}
                </div>
              ))}

              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysCount }).map((_, i) => {
                const day = i + 1;
                const selected = isSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                      ${selected
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white bg-slate-800/20'}
                      ${today && !selected ? 'border border-blue-400/50 text-blue-300' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
