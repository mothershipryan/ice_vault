import React from 'react';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();

    const sections = t('privacy.sections', { returnObjects: true }) as Array<{
        id: string;
        title: string;
        content: string;
        items?: string[];
    }>;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase truncate border-b-2 border-green-500 pb-1 transition-colors">
                    {t('privacy.title')}
                </h2>
            </div>

            <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed font-light transition-colors">
                {Array.isArray(sections) && sections.map((section) => (
                    <section key={section.id} className="space-y-3">
                        <h3 className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm transition-colors">
                            {section.id}. {section.title}
                        </h3>
                        <p>{section.content}</p>
                        {section.items && (
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400 marker:text-blue-600 dark:marker:text-blue-500 transition-colors">
                                {section.items.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}

                <div className="p-4 bg-red-600/10 dark:bg-red-500/10 border border-red-600/20 dark:border-red-500/20 rounded-xl mt-8 transition-colors">
                    <h4 className="text-red-700 dark:text-red-400 font-bold uppercase text-xs tracking-widest mb-2 transition-colors">
                        {t('privacy.disclaimer_title')}
                    </h4>
                    <p className="text-xs text-red-900/60 dark:text-red-200/60 transition-colors">
                        {t('privacy.disclaimer_text')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
