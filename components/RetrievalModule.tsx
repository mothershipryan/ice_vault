
import React, { useState } from 'react';
import StateSelector from './StateSelector.tsx';
import CityInput from './CityInput.tsx';
import DatePicker from './DatePicker.tsx';
import { storageService } from '../services/storageService.ts';
import { UploadRecord } from '../types.ts';

const RetrievalModule: React.FC = () => {
  const [state, setState] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [vaultKey, setVaultKey] = useState('');

  const handleSearch = async () => {
    if (!vaultKey) {
      alert("Ghost Vault: You must enter a Passphrase or Backup Key to find your files.");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await storageService.getRecords({ state: stateName || state, city, date }, vaultKey);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-blue-500/20 space-y-2">
          <label className="text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase px-1">
            Passphrase or Backup Key
          </label>
          <input
            type="password"
            value={vaultKey}
            onChange={(e) => setVaultKey(e.target.value)}
            placeholder="ENTER PASSPHRASE OR EMERGENCY KEY"
            className="w-full h-[48px] bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-sm font-bold tracking-wider focus:outline-none focus:border-blue-500 transition-all uppercase placeholder:text-slate-700"
          />
        </div>

        <div className="relative pointer-events-none opacity-50">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500 font-bold tracking-widest italic">Target node parameters</span>
          </div>
        </div>

        <StateSelector
          value={state}
          onChange={(code, name) => {
            setState(code);
            setStateName(name);
          }}
        />
        <CityInput value={city} onChange={setCity} state={state} />
        <DatePicker value={date} onChange={setDate} />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full h-[64px] bg-slate-100 hover:bg-white text-slate-900 font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
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
            <div key={rec.id} className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white text-sm font-bold">{rec.fileName}</p>
                  <p className="text-blue-400 text-[9px] font-black tracking-widest uppercase mt-1">ID: {rec.id}</p>
                </div>
                <span className="bg-green-500/10 text-green-400 text-[8px] font-black px-2 py-1 rounded-md border border-green-500/20">
                  VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">Node Region</p>
                  <p className="text-slate-300 font-bold">DE-CITY-1 (GERMANY)</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase font-black tracking-tighter">Encryption</p>
                  <p className="text-slate-300 font-bold">AES-256-GCM</p>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!vaultKey) {
                    alert("Please enter your Passphrase or Backup Key above to decrypt this file.");
                    return;
                  }

                  try {
                    const btn = document.getElementById(`btn-${rec.id}`);
                    if (btn) btn.innerText = "Decrypting...";

                    // 1. Fetch Encrypted Blob securely via Supabase Storage
                    const encryptedBlob = await storageService.downloadFile(rec.s3Path || "");

                    // 2. Retrieve the DEK (using Passphrase or Legacy Key)
                    const key = await storageService.retrieveRecordKey(
                      (rec as any).encryptedKeyPayload,
                      vaultKey
                    );

                    // 3. Decrypt (passing MIME type to preserve file format)
                    const decryptedBlob = await storageService.decryptFile(
                      encryptedBlob,
                      key,
                      rec.mimeType
                    );

                    // 4. Download
                    const url = URL.createObjectURL(decryptedBlob);
                    const a = document.createElement('a');
                    a.href = url;

                    // Restore original name without .enc (if present), but keep extension
                    let finalName = rec.fileName;
                    if (finalName.toLowerCase().endsWith('.enc')) {
                      finalName = finalName.slice(0, -4);
                    }
                    a.download = finalName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    if (btn) btn.innerText = "Decrypted & Downloaded";
                  } catch (err: any) {
                    console.error("Critical Retrieval Error:", err);
                    alert(err.message || "Decryption Failed. Check your Key.");
                    const btn = document.getElementById(`btn-${rec.id}`);
                    if (btn) btn.innerText = "Decryption Failed";
                  }
                }}
                id={`btn-${rec.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Decrypt & Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-950/30 rounded-3xl border border-dashed border-slate-800 space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No matching assets materialized.</p>
          <p className="text-slate-700 text-[10px] font-medium tracking-tight">Ensure your passphrase is correct and city/state match exactly.</p>
        </div>
      )}
    </div>
  )
}


export default RetrievalModule;
