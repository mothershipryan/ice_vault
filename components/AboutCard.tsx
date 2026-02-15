
import React from 'react';

const AboutCard: React.FC = () => {
  return (
    <div className="w-full mt-10 space-y-4">
      <div className="flex items-center gap-4 justify-center mb-6">
        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
        <h2 className="text-slate-500 dark:text-slate-500 text-[9px] font-black tracking-[0.3em] uppercase transition-colors">
          Identity Module
        </h2>
        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
      </div>

      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden group transition-colors">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-600/5 dark:bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-600/10 dark:group-hover:bg-blue-500/10 transition-colors duration-500" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-600/20 dark:border-blue-400/20 transition-colors">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase transition-colors">About I.C.E. Vault</h3>
          </div>

          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed font-medium transition-colors">
              ICE Vault is a web application designed to serve as an immutable digital witness. By providing direct-to-cloud upload for video recordings, the app ensures that critical footage is captured and secured instantly. This architecture is built specifically to prevent the local loss or physical destruction of evidence.
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed font-medium transition-colors">
              We guarantee <strong>zero-knowledge privacy</strong> by leveraging <strong>German infrastructure</strong>, renowned for robust data protection laws. All data is processed by <strong>Supabase</strong> and secured via <strong>high-security European providers</strong> on servers physically located in <strong>Germany</strong>.
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed font-medium transition-colors">
              <strong>Retrieval Protocol:</strong> Assets can be retrieved through our <strong>European Retrieval Terminal</strong>. Use the State, City, and Date of capture to locate encrypted evidence. Each file is secured with a unique <strong>SHA-256 Hash</strong> for legal verification, ensuring the footage remains untampered, mathematically verified, and admissible as court-ready evidence.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/5 transition-colors">
            <div className="flex items-center justify-between opacity-30">
              <div className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              </div>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase transition-colors">DE / EU PRIVACY JURISDICTION // VERIFIABLE EVIDENCE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutCard;
