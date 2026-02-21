import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.tsx';
import LanguageSwitcher from './LanguageSwitcher.tsx';

interface FooterProps {
    onPrivacyClick: () => void;
    onCensorshipClick: () => void;
    onInstallClick: () => void;
    onStatsClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onPrivacyClick, onCensorshipClick, onInstallClick, onStatsClick }) => {
    const { t } = useTranslation();

    return (
        <footer className="w-full mt-6 pb-safe">
            {/* Install Action Area - Distinct from footer links */}
            <div className="flex justify-center mb-12">
                <button
                    onClick={onInstallClick}
                    className="group relative px-6 py-3 bg-white/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 border border-slate-200 dark:border-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-full transition-all duration-300 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-full bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-100 transition-colors">
                            {t('footer.install_mobile')}
                        </span>
                    </div>
                </button>
            </div>

            <div className="flex justify-center mt-[-24px] mb-12">
                <img
                    src="/icemelt_150w.png"
                    alt="IceMelt"
                    className="w-16 h-auto drop-shadow-[0_0_15px_rgba(37,99,235,0.4)] opacity-80"
                />
            </div>

            {/* Actual Footer Content - Subtle & Technical */}
            <div className="w-full border-t border-slate-200 dark:border-slate-900 pt-8 flex flex-col items-center gap-6 transition-colors">

                {/* Navigation Links */}
                <div className="flex justify-center items-center gap-8">
                    <a
                        href="mailto:fuckicesite@proton.me"
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('footer.contact')}
                    </a>
                    <button
                        onClick={onPrivacyClick}
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('footer.privacy')}
                    </button>
                    <button
                        onClick={onCensorshipClick}
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('footer.censorship')}
                    </button>
                    <button
                        onClick={onStatsClick}
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('footer.stats')}
                    </button>
                    <a
                        href="/stickers.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('footer.stickers')}
                    </a>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <ThemeToggle />
                </div>

                <div className="flex flex-col items-center gap-2 opacity-30 p-4">
                    <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                    <p className="text-slate-500 text-[8px] uppercase tracking-[0.4em] font-black select-none">
                        {t('footer.system_protocol')}
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
