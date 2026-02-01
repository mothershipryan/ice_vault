import React from 'react';

interface FooterProps {
    onPrivacyClick: () => void;
    onInstallClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onPrivacyClick, onInstallClick }) => {
    return (
        <footer className="w-full mt-12 py-8 border-t border-slate-800/30 flex flex-col items-center gap-6">

            {/* Primary Links */}
            <div className="flex justify-center items-center gap-6 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500/60">
                <a
                    href="mailto:contact@icevault.app"
                    className="hover:text-blue-400 transition-colors"
                >
                    Contact
                </a>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-700"></span>
                <button
                    onClick={onPrivacyClick}
                    className="hover:text-blue-400 transition-colors"
                >
                    Privacy Policy
                </button>
            </div>

            {/* Installation Action */}
            <button
                onClick={onInstallClick}
                className="text-blue-400/60 hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2 group"
            >
                <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>How to Install on Mobile</span>
            </button>

            {/* Version Tag */}
            <p className="text-slate-700 text-[8px] uppercase tracking-[0.4em] font-black opacity-40">
                System Protocol 2.5.0 // Cold Storage
            </p>
        </footer>
    );
};

export default Footer;
