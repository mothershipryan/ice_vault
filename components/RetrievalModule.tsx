import React, { useState } from 'react';
import StateSelector from './StateSelector.tsx';
import CityInput from './CityInput.tsx';
import DatePicker from './DatePicker.tsx';
import { storageService } from '../services/storageService.ts';
import { UploadRecord } from '../types.ts';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '../utils/rateLimit.ts';

const RetrievalModule: React.FC = () => {
  const [state, setState] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [vaultKey, setVaultKey] = useState('');
  const [downloadState, setDownloadState] = useState<{ id: string; progress: number; step: string } | null>(null);

  const handleDownload = async (rec: UploadRecord) => {
    if (!vaultKey) return;
    try {
      setDownloadState({ id: rec.id, progress: 0, step: 'Initializing...' });

      await storageService.downloadAndDecryptVideo(
        rec,
        vaultKey.trim(),
        (progress, step) => {
          setDownloadState({ id: rec.id, progress, step });
        }
      );

      setDownloadState(null);
    } catch (err: any) {
      console.error(err);
      alert(`Download Failed: ${err.message}`);
      setDownloadState(null);
    }
  };

  const handleSearch = async () => {
    if (!vaultKey || !vaultKey.trim()) {
      alert("Ghost Vault: You must enter a Passphrase or Backup Key to find your files.");
      return;
    }

    // Require state and city to prevent cross-location access with same passphrase
    if (!state && !stateName) {
      alert("Security Notice: You must select a State to retrieve files.");
      return;
    }

    if (!city || !city.trim()) {
      alert("Security Notice: You must select a City to retrieve files.");
      return;
    }

    // Require date for complete isolation
    if (!date || !date.trim()) {
      alert("Security Notice: You must select a Date to retrieve files.");
      return;
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      alert(rateLimitCheck.message);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      console.log(`[Vault] Searching archives with key: ${vaultKey.trim().slice(0, 4)}***`);
      const data = await storageService.getRecords({ state: stateName || state, city, date }, vaultKey.trim());
      setResults(data);

      // Reset rate limit on successful retrieval
      if (data.length > 0) {
        resetRateLimit();
      }
    } catch (e) {
      console.error(e);
      // Record failed attempt for rate limiting
      recordFailedAttempt();
      alert("Search Failed. Check Browser Console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-blue-600/20 dark:border-blue-500/20 space-y-2 transition-colors">
          <label className="text-blue-700 dark:text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase px-1">
            Passphrase or Backup Key
          </label>
          <input
            type="password"
            value={vaultKey}
            onChange={(e) => setVaultKey(e.target.value)}
            placeholder="ENTER PASSPHRASE OR EMERGENCY KEY"
            className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 text-sm font-bold tracking-wider focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all uppercase placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />
        </div>

        <div className="relative pointer-events-none opacity-50">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-500 font-bold tracking-widest italic transition-colors">Target node parameters</span>
          </div>
        </div>

        <StateSelector
          value={state}
          onChange={(code, name) => {
            setState(code);
            setStateName(name);
          }}
        />
        <CityInput value={city} onChange={setCity} state={state} stateName={stateName} />
        <DatePicker value={date} onChange={setDate} />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full h-[64px] bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-400/20 dark:border-slate-900/20 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
              <span>Scanning Nodes...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search Archives</span>
            </>
          )}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((rec) => (
            <div key={rec.id} className="bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-900 dark:text-white text-sm font-bold">{rec.fileName}</p>
                  <p className="text-blue-700 dark:text-blue-400 text-[9px] font-black tracking-widest uppercase mt-1">ID: {rec.id}</p>
                </div>
                <span className="bg-green-600/10 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[8px] font-black px-2 py-1 rounded-md border border-green-600/20 dark:border-green-500/20">
                  VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-200 dark:border-white/5">
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">Status</p>
                  <p className="text-slate-800 dark:text-slate-300 font-bold">Immutable</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">Encryption</p>
                  <p className="text-slate-800 dark:text-slate-300 font-bold">AES-256-GCM</p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(rec)}
                disabled={!!downloadState}
                id={`btn-${rec.id}`}
                className={`flex items-center justify-center gap-2 w-full py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer relative overflow-hidden
                  ${downloadState?.id === rec.id
                    ? 'bg-blue-600/20 text-blue-600 border-blue-600/30'
                    : 'bg-blue-600/10 dark:bg-blue-500/10 hover:bg-blue-600/20 dark:hover:bg-blue-500/20 border-blue-600/20 dark:border-blue-400/20 text-blue-700 dark:text-blue-400'
                  }`}
              >
                {downloadState?.id === rec.id ? (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-600/10 transition-all duration-300" style={{ width: `${downloadState.progress}%` }} />
                    <span className="relative z-10 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {downloadState.step} ({downloadState.progress}%)
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Decrypt & Download
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="p-12 text-center bg-white/30 dark:bg-slate-950/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2 transition-colors">
          <p className="text-slate-600 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">No matching assets materialized.</p>
          <p className="text-slate-500 dark:text-slate-700 text-[10px] font-medium tracking-tight">Check your passphrase. Search filters are now optional.</p>
        </div>
      ) : null}
    </div>
  );
};

export default RetrievalModule;
