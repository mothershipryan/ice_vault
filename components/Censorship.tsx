import React from 'react';

const Censorship: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase truncate border-b-2 border-red-500 pb-1 transition-colors">
                    Censorship Alert
                </h2>
            </div>

            <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed font-light transition-colors">
                <section className="space-y-4 group">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 shadow-2xl transition-colors">
                        <img
                            src="https://www.eff.org/files/banner_library/protest-2024-2.jpg"
                            alt="EFF Protest"
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-950 via-transparent to-transparent opacity-60" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm transition-colors">01. Open Letter to Tech Companies</h3>
                        <p>
                            The EFF and other organizations are calling on tech companies to protect their users from lawless DHS subpoenas.
                        </p>
                        <a
                            href="https://www.eff.org/deeplinks/2026/02/open-letter-tech-companies-protect-your-users-lawless-dhs-subpoenas?utm_source=effector"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Read EFF Article
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 shadow-2xl transition-colors">
                        <img
                            src="https://static01.nyt.com/images/2026/02/12/multimedia/00biz-ice-social-media-01-bwvf/00biz-ice-social-media-01-bwvf-facebookJumbo.jpg"
                            alt="NYT DHS Monitoring"
                            className="w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-70 transition-all duration-700 font-mono text-[8px] text-slate-500 flex items-center justify-center italic"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-950 via-transparent to-transparent opacity-60" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm transition-colors">02. DHS Anti-ICE Social Media Monitoring</h3>
                        <p>
                            A recent report highlights how the DHS is monitoring social media for content critical of ICE, raising significant free speech concerns.
                        </p>
                        <a
                            href="https://www.nytimes.com/2026/02/13/technology/dhs-anti-ice-social-media.html?unlocked_article_code=1.MFA.X7aE.0itmiKfDD2d6&smid=nytcore-ios-share"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Read NYT Article
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                        <img
                            src="https://www.eff.org/files/banner_library/effector_banner_5.jpeg"
                            alt="EFF Effector"
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-950 via-transparent to-transparent opacity-60" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm transition-colors">03. Homeland Security Wants Names: Effector 38.3</h3>
                        <p>
                            The DHS is attempting to unmask anonymous critics on social media, prompting legal challenges and privacy alarms.
                        </p>
                        <a
                            href="https://www.eff.org/deeplinks/2026/02/homeland-security-wants-names-effector-383"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Read EFF Article
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </section>

                <div className="p-4 bg-red-600/10 dark:bg-red-500/10 border border-red-600/20 dark:border-red-500/20 rounded-xl mt-8 transition-colors">
                    <h4 className="text-red-700 dark:text-red-400 font-bold uppercase text-xs tracking-widest mb-2 transition-colors">Notice</h4>
                    <p className="text-xs text-red-900/60 dark:text-red-200/60 leading-relaxed transition-colors">
                        We are tracking instances of digital censorship and government overreach. Stay informed and protect your digital footprint.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Censorship;
