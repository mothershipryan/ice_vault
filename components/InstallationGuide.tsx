import React from 'react';
import { useTranslation } from 'react-i18next';

interface InstallationGuideProps {
  onBack: () => void;
}

const InstallationGuide: React.FC<InstallationGuideProps> = ({ onBack }) => {
  const { t } = useTranslation();

  const iosSteps = t('install.ios.steps', { returnObjects: true }) as string[];
  const androidSteps = t('install.android.steps', { returnObjects: true }) as string[];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">
          {t('install.title')}
        </h2>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed transition-colors">
        {t('install.description')}
      </p>

      {/* iOS Instructions */}
      <div className="bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-6 space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white font-bold transition-colors">{t('install.ios.title')}</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest transition-colors">{t('install.ios.subtitle')}</p>
          </div>
        </div>
        <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-400 font-medium transition-colors">
          {Array.isArray(iosSteps) && iosSteps.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-black transition-colors">{String(idx + 1).padStart(2, '0')}.</span>
              <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ol>
      </div>

      {/* Android Instructions */}
      <div className="bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-6 space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600/10 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 11h2v2H7v-2m10 0h2v2h-2v-2m-2-6l1.88-3.03c.1-.19-.1-.4-.27-.27L15 5.25C14.12 4.6 13.1 4.25 12 4.25s-2.12.35-3 1L7.39 2.2c-.17-.13-.37.08-.27.27L9 5.5c-1.1.75-2.12 1.5-2.61 2.5H17.61c-.49-1-1.51-1.75-2.61-2.5m-5 13h2v2h-2v-2m6 0h2v2h-2v-2m-9.5-8C5.67 7 5 7.67 5 8.5V17c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V8.5c0-.83-.67-1.5-1.5-1.5H6.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white font-bold transition-colors">{t('install.android.title')}</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest transition-colors">{t('install.android.subtitle')}</p>
          </div>
        </div>
        <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-400 font-medium transition-colors">
          {Array.isArray(androidSteps) && androidSteps.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="text-green-600 dark:text-green-400 font-black transition-colors">{String(idx + 1).padStart(2, '0')}.</span>
              <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onBack}
        className="w-full h-[64px] bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 border border-slate-700 dark:border-white/5 transition-colors shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>{t('install.return_link')}</span>
      </button>
    </div>
  );
};

export default InstallationGuide;
