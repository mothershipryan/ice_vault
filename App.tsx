
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './services/supabaseClient.ts';
import StateSelector from './components/StateSelector.tsx';
import CityInput from './components/CityInput.tsx';
import DatePicker from './components/DatePicker.tsx';
import FAQ from './components/FAQ.tsx';
import AboutCard from './components/AboutCard.tsx';
import RetrievalModule from './components/RetrievalModule.tsx';
import InstallationGuide from './components/InstallationGuide.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import Censorship from './components/Censorship.tsx';
import Footer from './components/Footer.tsx';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import AdminView from './components/AdminView.tsx';
import LanguageSwitcher from './components/LanguageSwitcher.tsx';
import { storageService } from './services/storageService.ts';
import { BACKGROUND_URL } from './constants.ts';
import { AppStatus, ViewMode } from './types.ts';
import { validatePassphraseStrength, PassphraseStrength } from './utils/passphraseValidation.ts';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DEPOSIT);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedStateName, setSelectedStateName] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Initialize with LOCAL date (YYYY-MM-DD) instead of UTC to avoid timezone shift bugs
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progress, setProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string>('');
  const [passphraseStrength, setPassphraseStrength] = useState<PassphraseStrength | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) console.error('Anonymous sign-in failed:', signInError);
      }
    };
    initAuth();
  }, []);

  // Validate passphrase strength on change
  useEffect(() => {
    if (passphrase) {
      const strength = validatePassphraseStrength(passphrase);
      setPassphraseStrength(strength);
    } else {
      setPassphraseStrength(null);
    }
  }, [passphrase]);

  const handleCopyKey = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(t('app.valid_video_error'));
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t('app.select_file_error'));
      return;
    }

    if (!selectedState || !selectedCity || !selectedDate) {
      setError(t('app.fill_all_fields_error'));
      return;
    }

    if (!passphrase || !passphrase.trim()) {
      setError(t('app.enter_passphrase_error'));
      return;
    }

    // Check passphrase strength
    const strength = validatePassphraseStrength(passphrase);
    if (!strength.valid) {
      setError(`${t('app.weak_passphrase')} ${strength.message}`);
      return;
    }

    setStatus(AppStatus.UPLOADING);
    setError(null);
    setProgress(0);

    try {
      const result = await storageService.uploadVideo(
        file,
        selectedStateName || selectedState,
        selectedCity,
        selectedDate,
        passphrase.trim(),
        (p, s) => {
          setProgress(p);
          setUploadStep(s);
        }
      );
      setRecoveryKey(result.recoveryKey || null);
      setStatus(AppStatus.SUCCESS);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setError(err.message || 'Upload failed. Please try again.');
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setProgress(0);
    setUploadStep('');
    setError(null);
    setRecoveryKey(null);
    setCopied(false);
  };

  // const isInstalling = viewMode === ViewMode.INSTALLATION; // This line is now replaced by the useState above

  return (
    <div className="min-h-[100dvh] relative flex flex-col items-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-y-auto overflow-x-hidden safe-pt safe-pb">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${BACKGROUND_URL})`,
          opacity: 0.2
        }}
      />
      <div className="fixed inset-0 z-1 bg-gradient-to-b from-white/80 via-slate-50/60 to-blue-50/30 dark:from-slate-950/80 dark:via-slate-900/60 dark:to-blue-900/30 transition-colors duration-500" />

      <main className="relative z-10 w-full max-w-lg px-4 py-8 md:py-16 flex flex-col min-h-full">
        {/* Header */}
        {!isInstalling && (
          <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 dark:bg-blue-500/10 dark:border-blue-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              <span className="text-blue-700 dark:text-blue-300 text-[10px] font-bold tracking-widest uppercase">{t('app.status')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
              {(() => {
                const parts = t('app.title').split(' ');
                const last = parts.pop();
                return (
                  <>
                    {parts.join(' ')}<br />
                    <span className="text-blue-600 dark:text-blue-400">{last}</span>
                  </>
                );
              })()}
            </h1>
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase opacity-80 whitespace-nowrap">
                {t('app.subtitle')}
              </p>
              <div className="flex justify-center pt-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/admin" element={<AdminView />} />
          <Route path="*" element={
            <>
              {/* View Switcher */}
              {!isInstalling && (
                <div className="flex p-1 bg-white/60 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/5 mb-6">
                  <button
                    onClick={() => setViewMode(ViewMode.DEPOSIT)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.DEPOSIT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {t('app.deposit')}
                  </button>
                  <button
                    onClick={() => setViewMode(ViewMode.RETRIEVAL)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.RETRIEVAL ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {t('app.retrieval')}
                  </button>
                </div>
              )}

              {/* Content Area */}
              {viewMode === ViewMode.DEPOSIT && (
                <div className="glass-card bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex-1 transition-colors duration-500">
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {status === AppStatus.SUCCESS && (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-2xl text-center">
                          <p className="text-green-400 text-sm font-bold">{t('app.transmission_successful')}</p>
                        </div>

                        {recoveryKey && (
                          <div className="p-5 bg-slate-100/80 dark:bg-slate-950/80 border border-blue-500/30 dark:border-blue-500/30 rounded-2xl space-y-3 transition-colors">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              <span className="text-xs font-black uppercase tracking-widest text-red-400">{t('app.emergency_key')}</span>
                            </div>
                            <div
                              onClick={handleCopyKey}
                              className="group relative bg-slate-200 dark:bg-slate-900 rounded-lg p-3 border border-slate-300 dark:border-slate-700 font-mono text-center text-slate-800 dark:text-white font-bold tracking-wider cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 hover:bg-slate-300 dark:hover:bg-slate-800 transition-all active:scale-[0.98] break-all text-[11px] leading-relaxed select-all"
                            >
                              {recoveryKey}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {copied ? (
                                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={handleCopyKey}
                                className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full transition-all ${copied
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                  }`}
                              >
                                {copied ? t('app.copied') : t('app.tap_to_copy')}
                              </button>
                            </div>
                            <p className="text-center text-[10px] text-red-600 dark:text-red-500/80 font-bold uppercase tracking-wide opacity-80 pt-2">
                              {t('app.emergency_warning').split('\n')[0]}<br />{t('app.emergency_warning').split('\n')[1]}
                            </p>
                          </div>
                        )}

                        <div className="text-center">
                          <button
                            onClick={reset}
                            className="mt-1 text-xs text-green-600 dark:text-green-300/80 font-bold underline underline-offset-4"
                          >
                            {t('app.upload_another')}
                          </button>
                        </div>
                      </div>
                    )}

                    {status === AppStatus.ERROR && (
                      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-center">
                        <p className="text-red-400 text-sm font-bold">{error}</p>
                      </div>
                    )}

                    <div className="space-y-6">
                      <StateSelector
                        value={selectedState}
                        onChange={(code, name) => {
                          setSelectedState(code);
                          setSelectedStateName(name);
                          setSelectedCity('');
                        }}
                        disabled={status === AppStatus.UPLOADING}
                      />

                      <CityInput
                        value={selectedCity}
                        onChange={setSelectedCity}
                        disabled={status === AppStatus.UPLOADING}
                        state={selectedState}
                        stateName={selectedStateName}
                      />

                      <DatePicker
                        value={selectedDate}
                        onChange={setSelectedDate}
                        disabled={status === AppStatus.UPLOADING}
                      />

                      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-5 rounded-[1.75rem] border border-blue-500/20 dark:border-blue-500/20 space-y-3 transition-colors">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-blue-900/40 dark:text-blue-200/40 text-[10px] font-black tracking-[0.2em] uppercase">
                            {t('app.passphrase_label')}
                          </label>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400/60 font-black uppercase tracking-widest bg-blue-600/5 dark:bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-600/10 dark:border-blue-500/10">{t('app.zero_knowledge')}</span>
                        </div>

                        <div className="relative">
                          <input
                            type={showPassphrase ? "text" : "password"}
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder={t('app.passphrase_placeholder')}
                            disabled={status === AppStatus.UPLOADING}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 pr-14 text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 font-bold focus:outline-none focus:border-blue-500 transition-all uppercase tracking-widest text-[11px] sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassphrase(!showPassphrase)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 transition-colors"
                            title={showPassphrase ? "Hide Passphrase" : "Show Passphrase"}
                          >
                            {showPassphrase ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {passphrase && passphraseStrength && (
                          <div className="space-y-1 px-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${passphraseStrength.color}`}
                                  style={{ width: `${(passphraseStrength.score / 5) * 100}%` }}
                                />
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wide ${passphraseStrength.valid ? 'text-green-400' : 'text-orange-400'}`}>
                                {passphraseStrength.label}
                              </span>
                            </div>
                            {!passphraseStrength.valid && (
                              <p className="text-[10px] text-orange-400 font-medium">{passphraseStrength.message}</p>
                            )}
                          </div>
                        )}

                        <div className="bg-blue-600/5 dark:bg-blue-500/5 border border-blue-600/10 dark:border-blue-500/10 rounded-lg p-3 space-y-1.5">
                          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide">{t('app.how_it_works')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('app.isolated_vaults')}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-blue-900/40 dark:text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">{t('app.data_source')}</label>
                        <div className={`relative h-48 border-2 border-dashed rounded-[1.75rem] transition-all flex flex-col items-center justify-center p-6 text-center
                          ${file ? 'border-blue-600 dark:border-blue-400 bg-blue-600/5 dark:bg-blue-500/10' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80'}
                          ${status === AppStatus.UPLOADING ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                          {!file ? (
                            <div className="space-y-3">
                              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 text-sm font-bold">{t('app.select_video')}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <p className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-1">{t('app.asset_loaded')}</p>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium truncate max-w-[200px]">{file.name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleUpload}
                        disabled={!file || !selectedState || status === AppStatus.UPLOADING}
                        className={`group w-full h-[64px] font-black rounded-[1.5rem] transition-all uppercase tracking-[0.25em] text-xs flex items-center justify-center gap-3 border relative overflow-hidden active:scale-[0.98]
                          ${status === AppStatus.UPLOADING
                            ? 'bg-blue-600/20 text-blue-600 border-blue-600/30'
                            : 'bg-blue-600 text-white shadow-lg border-blue-400/20 hover:bg-blue-700 disabled:opacity-30'
                          }`}
                      >
                        {status === AppStatus.UPLOADING ? (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 bg-blue-600/10 transition-all duration-300" style={{ width: `${progress}%` }} />
                            <span className="relative z-10 flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              {uploadStep} ({progress}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{t('app.upload_to_vault')}</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {viewMode === ViewMode.RETRIEVAL && <RetrievalModule />}
              {viewMode === ViewMode.INSTALLATION && <InstallationGuide onBack={() => setViewMode(ViewMode.DEPOSIT)} />}
              {viewMode === ViewMode.PRIVACY && <PrivacyPolicy onBack={() => setViewMode(ViewMode.DEPOSIT)} />}
              {viewMode === ViewMode.CENSORSHIP && <Censorship onBack={() => setViewMode(ViewMode.DEPOSIT)} />}

              {viewMode === ViewMode.DEPOSIT && (
                <>
                  <AboutCard />
                  <FAQ />
                </>
              )}

              <Footer
                onPrivacyClick={() => setViewMode(ViewMode.PRIVACY)}
                onCensorshipClick={() => setViewMode(ViewMode.CENSORSHIP)}
                onInstallClick={() => setViewMode(ViewMode.INSTALLATION)}
              />
            </>
          } />
        </Routes>
      </main>

      <div className="fixed top-0 left-0 w-full h-1/2 bg-blue-600/5 dark:bg-blue-500/5 blur-[120px] pointer-events-none -z-10" />
    </div>
  );
};

export default App;
