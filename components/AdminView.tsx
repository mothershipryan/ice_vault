import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MetricsDashboard from './MetricsDashboard.tsx';

const AdminView: React.FC = () => {
    const { t } = useTranslation();
    const [pinInput, setPinInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinError, setPinError] = useState(false);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const correctPin = import.meta.env.VITE_ADMIN_PIN;
        if (correctPin && pinInput === correctPin) {
            setIsAuthenticated(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPinInput('');
            setTimeout(() => setPinError(false), 2000);
        }
    };

    if (isAuthenticated) {
        return (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <MetricsDashboard />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md glass-card bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-8 md:p-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">
                            {t('app.internal_access')}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        {t('app.terminal_access')}
                    </h2>
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest px-1">
                            {t('app.enter_auth_code')}
                        </label>
                        <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            className={`w-full h-14 bg-white dark:bg-slate-950 border ${pinError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl px-6 text-2xl text-center tracking-[0.5em] font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all`}
                            autoFocus
                        />
                        {pinError && (
                            <p className="text-center text-red-500 text-[10px] font-bold uppercase tracking-widest animate-bounce">
                                {t('app.invalid_code')}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-3"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('app.authorize')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminView;
