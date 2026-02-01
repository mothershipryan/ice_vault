import React from 'react';

const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-black text-white tracking-widest uppercase truncate border-b-2 border-green-500 pb-1">
                    Privacy Protocol
                </h2>
            </div>

            <div className="space-y-8 text-slate-300 leading-relaxed font-light">
                <section className="space-y-3">
                    <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm">01. Zero-Knowledge Architecture</h3>
                    <p>
                        Fuck-I.C.E.-Vault is built on a "Zero-Knowledge" foundation. This means:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-400 marker:text-blue-500">
                        <li>We do not have your encryption keys.</li>
                        <li>We do not have your passphrase.</li>
                        <li>We cannot view, decrypt, or access your video footage under any circumstances.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm">02. Client-Side Encryption</h3>
                    <p>
                        All encryption happens locally on your device <strong>before</strong> any data is transmitted to our servers.
                        Your video is transformed into randomized cryptographic noise using AES-256-GCM.
                        The server only receives this encrypted blob.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm">03. No User Tracking</h3>
                    <p>
                        We do not use tracking cookies, analytics pixels, or third-party behavioral monitoring.
                        Your interaction with the vault is private. Logs are minimized to strictly operational necessities (e.g., successful upload confirmation) and contain no personally identifiable content.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-blue-400 font-bold tracking-widest uppercase text-sm">04. Device Independence</h3>
                    <p>
                        Because your keys are derived from your passphrase, your privacy is portable.
                        If your device is confiscated or destroyed, you can access your data from any secure terminal without relying on a local key file.
                    </p>
                </section>

                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mt-8">
                    <h4 className="text-red-400 font-bold uppercase text-xs tracking-widest mb-2">Legal Disclaimer</h4>
                    <p className="text-xs text-red-200/60">
                        This tool is designed for civil rights protection. While we secure the data mathematically, users are responsible for the legal implications of recording in their specific jurisdiction.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
