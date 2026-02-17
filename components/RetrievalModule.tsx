import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StateSelector from './StateSelector.tsx';
import CityInput from './CityInput.tsx';
import DatePicker from './DatePicker.tsx';
import { storageService } from '../services/storageService.ts';
import { UploadRecord } from '../types.ts';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '../utils/rateLimit.ts';

const RetrievalModule: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [vaultKey, setVaultKey] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [downloadState, setDownloadState] = useState<{ id: string; progress: number; step: string } | null>(null);

  const handleDownload = async (rec: UploadRecord) => {
    if (!vaultKey) return;
    try {
      setDownloadState({ id: rec.id, progress: 0, step: t('retrieval.initializing') });

      await storageService.downloadAndDecryptVideo(
        rec,
        vaultKey.trim(),
        (progress, step) => {
          setDownloadState({ id: rec.id, progress, step });
        }
      );

      // Auto-purge logic (Burn after reading)
      setDownloadState({ id: rec.id, progress: 100, step: t('retrieval.purging') });
      await storageService.deleteRecord(rec.id, rec.s3Path, rec.isLegacy);
      setResults(prev => prev.filter(r => r.id !== rec.id));

      setDownloadState(null);
    } catch (err: any) {
      console.error(err);
      alert(t('retrieval.download_failed', { error: err.message }));
      setDownloadState(null);
    }
  };

  const handleDelete = async (rec: UploadRecord) => {
    if (!window.confirm(t('retrieval.purge_confirm'))) return;

    setLoading(true);
    try {
      await storageService.deleteRecord(rec.id, rec.s3Path, rec.isLegacy);
      setResults(prev => prev.filter(r => r.id !== rec.id));
      alert(t('retrieval.purge_success'));
    } catch (err: any) {
      console.error(err);
      alert(t('retrieval.purge_failed', { error: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!vaultKey || !vaultKey.trim()) {
      alert(t('retrieval.ghost_vault_error'));
      return;
    }

    // Require state and city to prevent cross-location access with same passphrase
    if (!state && !stateName) {
      alert(t('retrieval.security_state_error'));
      return;
    }

    if (!city || !city.trim()) {
      alert(t('retrieval.security_city_error'));
      return;
    }

    // Require date for complete isolation
    if (!date || !date.trim()) {
      alert(t('retrieval.security_date_error'));
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
      alert(t('retrieval.search_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-blue-600/20 dark:border-blue-500/20 space-y-2 transition-colors">
          <label className="text-blue-700 dark:text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase px-1">
            {t('retrieval.module_label')}
          </label>
          <div className="relative">
            <input
              type={showPassphrase ? "text" : "password"}
              value={vaultKey}
              onChange={(e) => setVaultKey(e.target.value)}
              placeholder={t('retrieval.module_placeholder')}
              className="w-full h-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 pr-12 text-sm font-bold tracking-wider focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all uppercase placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(!showPassphrase)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 transition-colors"
              title={showPassphrase ? "Hide Passphrase" : "Show Passphrase"}
            >
              {showPassphrase ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="relative pointer-events-none opacity-50">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-500 font-bold tracking-widest italic transition-colors">{t('retrieval.target_parameters')}</span>
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
              <span>{t('retrieval.scanning')}</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{t('retrieval.search_button')}</span>
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
                  {t('retrieval.verified')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-200 dark:border-white/5">
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">{t('retrieval.status_label')}</p>
                  <p className="text-slate-800 dark:text-slate-300 font-bold">{t('retrieval.immutable')}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">{t('retrieval.encryption_label')}</p>
                  <p className="text-slate-800 dark:text-slate-300 font-bold">AES-256-GCM</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(rec)}
                  disabled={!!downloadState}
                  id={`btn-${rec.id}`}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer relative overflow-hidden
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
                      {t('retrieval.decrypt_download')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(rec)}
                  disabled={!!downloadState || loading}
                  className="px-4 flex items-center justify-center bg-red-600/10 dark:bg-red-500/10 hover:bg-red-600/20 dark:hover:bg-red-500/20 border border-red-600/20 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                  title={t('retrieval.purge_asset')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="p-12 text-center bg-white/30 dark:bg-slate-950/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2 transition-colors">
          <p className="text-slate-600 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">{t('retrieval.no_assets')}</p>
          <p className="text-slate-500 dark:text-slate-700 text-[10px] font-medium tracking-tight">{t('retrieval.search_hint')}</p>
        </div>
      ) : null}
    </div>
  );
};

export default RetrievalModule;
