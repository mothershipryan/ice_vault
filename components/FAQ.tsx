import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQ: React.FC = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Load translated FAQ items. Use type assertion for returnObjects.
  const faqItems = t('faq.items', { returnObjects: true }) as Array<{ q: string, a: string }>;

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full space-y-3 mt-10 mb-6">
      <div className="flex items-center gap-4 justify-center mb-6">
        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
        <h2 className="text-slate-500 dark:text-slate-500 text-[9px] font-black tracking-[0.3em] uppercase transition-colors">
          {t('faq.title')}
        </h2>
        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
      </div>

      {Array.isArray(faqItems) && faqItems.map((item, idx) => (
        <div
          key={idx}
          className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm transition-colors"
        >
          <button
            onClick={() => toggle(idx)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            <span className={`text-xs font-bold transition-colors ${openIndex === idx ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {item.q}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <p className="px-5 pb-5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-white/5 pt-4 transition-colors">
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQ;
