import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
    const lang = currentLanguage.split('-')[0];

    const languages = [
        { code: 'en', label: 'EN' },
        { code: 'es', label: 'ES' },
        { code: 'zh', label: '中文' }
    ];

    const activeIndex = Math.max(0, languages.findIndex(l => l.code === lang));

    return (
        <div className="relative flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-full border border-slate-200 dark:border-white/5 shadow-inner select-none overflow-hidden h-9 w-[180px]">
            {/* Sliding Indicator */}
            <div
                className="absolute top-1 bottom-1 left-1 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/10 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-0"
                style={{
                    width: `calc((100% - 8px) / 3)`,
                    transform: `translateX(calc(${activeIndex * 100}%))`
                }}
            />

            {languages.map((l) => (
                <button
                    key={l.code}
                    onClick={() => i18n.changeLanguage(l.code)}
                    className={`relative z-10 flex-1 h-full rounded-full text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${lang === l.code
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                        }`}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
