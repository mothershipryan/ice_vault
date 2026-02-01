import React from 'react';

interface FooterProps {
    onPrivacyClick: () => void;
    onInstallClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onPrivacyClick, onInstallClick }) => {
    return (
        <footer className="w-full mt-6 pb-safe">
            {/* Install Action Area - Distinct from footer links */}
            <div className="flex justify-center mb-12">
                <button
                    onClick={onInstallClick}
                    className="group relative px-6 py-3 bg-slate-900/40 hover:bg-slate-900/80 border border-blue-500/10 hover:border-blue-500/30 rounded-full transition-all duration-300"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-100 transition-colors">
                            Install App on Mobile
                        </span>
                    </div>
                </button>
            </div>

            {/* Actual Footer Content - Subtle & Technical */}
            <div className="w-full border-t border-slate-900 pt-8 flex flex-col items-center gap-6">

                {/* Navigation Links */}
                <div className="flex justify-center items-center gap-8">
                    <a
                        href="mailto:meltedice@fuckice.site"
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 hover:text-slate-300 transition-colors"
                    >
                        Contact
                    </a>
                    <button
                        onClick={onPrivacyClick}
                        className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 hover:text-slate-300 transition-colors"
                    >
                        Privacy
                    </button>
                </div>

                {/* System Tag */}
                <div className="flex flex-col items-center gap-2 opacity-30">
                    <div className="w-1 h-1 rounded-full bg-slate-500 animate-pulse"></div>
                    <p className="text-slate-500 text-[8px] uppercase tracking-[0.4em] font-black">
                        System Protocol 2.5.0
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
