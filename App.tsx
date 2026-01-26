
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient.ts';
import StateSelector from './components/StateSelector.tsx';
import CityInput from './components/CityInput.tsx';
import DatePicker from './components/DatePicker.tsx';
import FAQ from './components/FAQ.tsx';
import AboutCard from './components/AboutCard.tsx';
import RetrievalModule from './components/RetrievalModule.tsx';
import InstallationGuide from './components/InstallationGuide.tsx';
import { storageService } from './services/storageService.ts';
import { BACKGROUND_URL } from './constants.ts';
import { AppStatus, ViewMode } from './types.ts';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DEPOSIT);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) console.error('Auth error:', signInError);
      }
    };
    initAuth();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a valid video file.');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedState || !selectedCity || !selectedDate) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setStatus(AppStatus.UPLOADING);
      setError(null);
      const result = await storageService.uploadVideo(
        file,
        selectedState,
        selectedCity,
        selectedDate,
        (p) => setProgress(p)
      );
      setRecoveryKey(result.recoveryKey || null);
      setStatus(AppStatus.SUCCESS);
      setFile(null);
    } catch (err) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setError('Upload failed. Please try again.');
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setProgress(0);
    setError(null);
    setRecoveryKey(null);
  };

  const isInstalling = viewMode === ViewMode.INSTALLATION;

  return (
    <div className="min-h-[100dvh] relative flex flex-col items-center bg-slate-950 overflow-y-auto overflow-x-hidden safe-pt safe-pb">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${BACKGROUND_URL})`,
          opacity: 0.4
        }}
      />
      <div className="fixed inset-0 z-1 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-blue-900/30" />

      <main className="relative z-10 w-full max-w-lg px-4 py-8 md:py-16 flex flex-col min-h-full">

        {/* Header */}
        {!isInstalling && (
          <div className="text-center mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-[10px] font-bold tracking-widest uppercase">Encryption Active</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9]">
              FUCK I.C.E.<br />
              <span className="text-blue-400">Vault</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium tracking-wide max-w-[300px] mx-auto opacity-80">
              SECURE STATE-INDEXED COLD VIDEO STORAGE
            </p>
          </div>
        )}

        {/* View Switcher */}
        {!isInstalling && (
          <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 mb-6">
            <button
              onClick={() => setViewMode(ViewMode.DEPOSIT)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.DEPOSIT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Vault Deposit
            </button>
            <button
              onClick={() => setViewMode(ViewMode.RETRIEVAL)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.RETRIEVAL ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Retrieval
            </button>
          </div>
        )}

        {/* Dark Glass Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex-1">

          {viewMode === ViewMode.DEPOSIT && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {status === AppStatus.SUCCESS && (
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-2xl text-center">
                  <p className="text-green-400 text-sm font-bold">Transmission successful.</p>
                  <button
                    onClick={reset}
                    className="mt-1 text-xs text-green-300/80 font-bold underline underline-offset-4"
                  >
                    Upload another asset
                  </button>
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
                  onChange={setSelectedState}
                  disabled={status === AppStatus.UPLOADING}
                />

                <CityInput
                  value={selectedCity}
                  onChange={setSelectedCity}
                  disabled={status === AppStatus.UPLOADING}
                />

                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  disabled={status === AppStatus.UPLOADING}
                />

                <div className="flex flex-col gap-2">
                  <label className="text-blue-200/40 text-[10px] font-bold tracking-[0.2em] uppercase px-1">
                    Data Source
                  </label>
                  <div
                    className={`relative h-48 border-2 border-dashed rounded-[1.75rem] transition-all flex flex-col items-center justify-center p-6 text-center
                      ${file ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/80 active:bg-slate-800'}
                      ${status === AppStatus.UPLOADING ? 'opacity-50 pointer-events-none' : ''}
                    `}
                  >
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {!file ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-blue-400 shadow-lg">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-slate-200 text-sm font-bold">Select Video</p>
                          <p className="text-slate-500 text-[10px] mt-1 font-medium tracking-widest uppercase">Tap to scan storage</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-3 border border-blue-400/30">
                          <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        </div>
                        <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">Asset Loaded</p>
                        <p className="text-slate-400 text-[11px] font-medium truncate max-w-[200px]">
                          {file.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                {status === AppStatus.UPLOADING ? (
                  <div className="space-y-4 py-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Uploading...</span>
                      <span className="text-blue-400 text-xs font-black">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleUpload}
                    disabled={!file || !selectedState}
                    className="group w-full h-[64px] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-black rounded-[1.5rem] shadow-[0_15px_30px_rgba(37,99,235,0.2)] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 uppercase tracking-[0.25em] text-xs flex items-center justify-center gap-3 border border-blue-400/20"
                  >
                    <span>Upload to Vault</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {viewMode === ViewMode.RETRIEVAL && <RetrievalModule />}

          {viewMode === ViewMode.INSTALLATION && (
            <InstallationGuide onBack={() => setViewMode(ViewMode.DEPOSIT)} />
          )}
        </div>

        {!isInstalling && (
          <>
            <AboutCard />
            <FAQ />
          </>
        )}

        <footer className="mt-10 mb-6 text-center pb-safe space-y-4">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setViewMode(ViewMode.INSTALLATION)}
              className="text-blue-400/60 hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>How to Install on Mobile</span>
            </button>
            <p className="text-slate-600 text-[9px] uppercase tracking-[0.4em] font-black opacity-50">
              System Protocol 2.4.0 // Cold Storage
            </p>
          </div>
        </footer>
      </main>

      <div className="fixed top-0 left-0 w-full h-1/2 bg-blue-500/5 blur-[120px] pointer-events-none -z-10" />
    </div>
  );
};

export default App;
