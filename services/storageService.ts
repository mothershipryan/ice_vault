import { UploadRecord } from '../types.ts';
import { supabase } from './supabaseClient.ts';

const s3Endpoint = import.meta.env.VITE_S3_ENDPOINT;

// Helper: Generate a random 256-bit AES-GCM key
const generateAESKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
};

// Helper: Derive a Key Encryption Key (KEK) from a passphrase
const deriveKEK = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"]
  );
};

// Helper: Derive a Search Index Key (Blind Indexing) from a passphrase
const deriveSearchKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
};

// Helper: Calculate Blind Index (HMAC-SHA256)
const calculateBlindIndex = async (term: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(term.toLowerCase().trim())
  );
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper: Encrypt Metadata Blob
const encryptMetadata = async (metadata: object, key: CryptoKey): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(metadata))
  );

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const dataHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ivHex}:${dataHex}`;
};

// Helper: Decrypt Metadata Blob
const decryptMetadata = async (encryptedStr: string, key: CryptoKey): Promise<any> => {
  const [ivHex, dataHex] = encryptedStr.split(':');
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const data = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedBuffer));
};

// Helper: Wrap (encrypt) the video key with the KEK
const wrapKey = async (dek: CryptoKey, kek: CryptoKey): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrappedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    kek,
    await window.crypto.subtle.exportKey("raw", dek)
  );

  // Return IV + Wrapped Key as Hex
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const wrappedHex = Array.from(new Uint8Array(wrappedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ivHex}:${wrappedHex}`;
};

// Helper: Unwrap (decrypt) the video key using the KEK
const unwrapKey = async (wrappedKeyStr: string, kek: CryptoKey): Promise<CryptoKey> => {
  const [ivHex, wrappedHex] = wrappedKeyStr.split(':');
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const wrappedBuffer = new Uint8Array(wrappedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    kek,
    wrappedBuffer
  );

  return window.crypto.subtle.importKey(
    "raw",
    decryptedBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Helper: Encrypt file in chunks to prevent memory crashes
const encryptFileInChunks = async (
  file: File,
  key: CryptoKey,
  onProgress: (percent: number) => void
): Promise<Blob> => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const encryptedParts: Blob[] = [];

  let offset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkBuffer = await chunk.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      chunkBuffer
    );

    encryptedParts.push(new Blob([iv, encryptedBuffer]));
    offset += CHUNK_SIZE;
    onProgress(Math.round((i / totalChunks) * 50));
  }

  return new Blob(encryptedParts);
};

export const storageService = {
  uploadVideo: async (
    file: File,
    state: string,
    city: string,
    date: string,
    passphrase: string,
    onProgress: (progress: number) => void
  ): Promise<UploadRecord> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    onProgress(1);
    const secretKey = await generateAESKey();
    const encryptedBlob = await encryptFileInChunks(file, secretKey, onProgress);

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKEK(passphrase, salt);
    const searchKey = await deriveSearchKey(passphrase, salt);

    // 1. Wrap the Video Encryption Key
    const wrappedKeyStr = await wrapKey(secretKey, kek);

    // 2. Encrypt Metadata (Filename, Date, etc.)
    const metadataMsg = { filename: file.name, upload_date: date, state, city };
    const encryptedMetadata = await encryptMetadata(metadataMsg, kek); // Encrypting metadata with KEK directly for simplicity

    // 3. Generate Blind Indexes
    const blindIndexState = await calculateBlindIndex(state, searchKey);
    const blindIndexCity = await calculateBlindIndex(city, searchKey);
    const blindIndexDate = await calculateBlindIndex(date, searchKey);

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const dbKeyPayload = `PWV2:${saltHex}:${wrappedKeyStr}`; // PWV2 indicates Hardened Schema

    const bucketName = 'fuckicevault'; // Normalized bucket name to avoid leak in S3 path
    const randomName = crypto.randomUUID();
    const s3Path = `/${randomName}.enc`; // Fully anonymized path
    onProgress(75);

    const { data: { session } } = await supabase.auth.getSession();

    // 1. Get Presigned URL
    // 1. Get Presigned URL
    console.log('Requesting presigned URL...');
    const presignedRes = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        action: 'get_presigned_url',
        payload: {
          key: s3Path.substring(1), // Remove leading slash for S3 key
          fileType: 'application/octet-stream' // Encrypted blob type
        }
      })
    });

    if (!presignedRes.ok) {
      const errText = await presignedRes.text();
      throw new Error(`Failed to get upload URL: ${presignedRes.status} ${errText}`);
    }
    const { data: { url: uploadUrl } } = await presignedRes.json();
    console.log('Got presigned URL');

    // 2. Upload to S3 with Progress
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Encryption takes 0-75%, Upload takes 75-95%
          const percentComplete = (event.loaded / event.total) * 20;
          onProgress(75 + percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(null);
        } else {
          reject(new Error(`S3 Upload Failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('S3 Network Error'));
      xhr.send(encryptedBlob);
    });

    // 3. Save Metadata (Proxy Request)
    const response = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        action: 'save_metadata',
        payload: {
          user_id: user.id,
          blind_index_state: blindIndexState,
          blind_index_city: blindIndexCity,
          blind_index_date: blindIndexDate,
          encrypted_metadata: encryptedMetadata,
          s3_path: s3Path,
          encrypted_aes_key: dbKeyPayload,
          file_size: file.size
        }
      })
    });

    if (!response.ok) throw new Error('Proxy API Error');
    const { data: record, error } = await response.json();

    if (error) throw new Error('Database save failed');
    onProgress(100);

    const rawKey = await window.crypto.subtle.exportKey("raw", secretKey);
    const hexKey = Array.from(new Uint8Array(rawKey))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    return {
      id: record.id,
      fileName: file.name,
      state: state,
      city: city,
      uploadDate: date,
      fileSize: file.size,
      bucketUrl: `${s3Endpoint}/${bucketName}${s3Path}`,
      recoveryKey: `ICE-${hexKey}`,
      status: 'completed',
      hash: 'N/A'
    };
  },

  retrieveRecordKey: async (dbKeyPayload: string, passphraseOrKey: string): Promise<CryptoKey> => {
    if (dbKeyPayload.startsWith('PWV1:')) {
      const [, saltHex, wrappedKeyStr] = dbKeyPayload.split(':');
      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const kek = await deriveKEK(passphraseOrKey, salt);
      return unwrapKey(wrappedKeyStr, kek);
    }
    else if (dbKeyPayload.startsWith('PWV2:')) {
      // PWV2 shares same KEK derivation as V1 for the wrapping key
      const [, saltHex, wrappedKeyStr] = dbKeyPayload.split(':');
      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const kek = await deriveKEK(passphraseOrKey, salt);
      return unwrapKey(wrappedKeyStr, kek);
    }
    return storageService.importKeyFromString(passphraseOrKey);
  },

  importKeyFromString: async (keyString: string): Promise<CryptoKey> => {
    const cleanKey = keyString.replace(/^ICE-|[^A-F0-9]/g, '');
    const keyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    return window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  decryptFile: async (encryptedBlob: Blob, key: CryptoKey): Promise<Blob> => {
    const buffer = await encryptedBlob.arrayBuffer();
    const iv = buffer.slice(0, 12);
    const ciphertext = buffer.slice(12);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        ciphertext
      );
      return new Blob([decryptedBuffer]);
    } catch (e) {
      console.error("Decryption failed:", e);
      throw new Error("Decryption failed. Invalid Key or Passphrase.");
    }
  },

  getRecords: async (query: { state?: string, city?: string, date?: string }, passphrase?: string): Promise<UploadRecord[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const token = session?.access_token;

    if (!user || !token) return [];

    let legacyRecords: any[] = [];
    let hardenedRecords: any[] = [];

    // 1. Fetch Legacy Data (V1) - Direct
    let legacyQuery = supabase.from('video_vault').select('*').eq('user_id', user.id);
    if (query.state) legacyQuery = legacyQuery.eq('state', query.state);
    if (query.city) legacyQuery = legacyQuery.eq('city', query.city);
    if (query.date) legacyQuery = legacyQuery.eq('upload_date', query.date);

    try {
      const { data: v1Data } = await legacyQuery;
      legacyRecords = v1Data || [];
    } catch (e) { console.error("Legacy fetch error", e); }

    // 2. Fetch Hardened Data (V2) - via Proxy
    // We fetch ALL for the user and decrypt/filter client-side to ensure Zero-Knowledge of search terms.
    try {
      const resV2 = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          action: 'search_vault',
          payload: {}
        })
      });

      if (resV2.ok) {
        const jsonV2 = await resV2.json();
        const v2Rows = jsonV2.data || [];

        if (v2Rows.length > 0) {
          hardenedRecords = await Promise.all(v2Rows.map(async (row: any) => {
            let decryptedMeta: any = { filename: 'Encrypted', state: 'Locked', city: 'Locked', upload_date: 'Locked' };

            if (passphrase) {
              try {
                // Attempt decryption
                const [, saltHex] = row.encrypted_aes_key.split(':');
                const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
                const kek = await deriveKEK(passphrase, salt);
                decryptedMeta = await decryptMetadata(row.encrypted_metadata, kek);
              } catch (e) {
                // Decryption failed (wrong passphrase)
              }
            }

            return {
              id: row.id,
              fileName: decryptedMeta.filename,
              state: decryptedMeta.state,
              city: decryptedMeta.city,
              uploadDate: decryptedMeta.upload_date,
              fileSize: row.file_size || 0,
              bucketUrl: `${s3Endpoint}${row.s3_path}`,
              encryptedKeyPayload: row.encrypted_aes_key,
              status: 'completed',
              hash: 'N/A'
            };
          }));
        }

        // Filter Hardened Records logic
        if (passphrase && (query.state || query.city || query.date)) {
          hardenedRecords = hardenedRecords.filter(r => {
            if (query.state && r.state.toLowerCase() !== query.state.toLowerCase()) return false;
            if (query.city && r.city.toLowerCase() !== query.city.toLowerCase()) return false;
            if (query.date && r.uploadDate !== query.date) return false;
            return true;
          });
        }
      }
    } catch (e) { console.error("Hardened fetch error", e); }

    const allRecords = [...legacyRecords.map((row: any) => ({
      id: row.id,
      fileName: row.filename || 'Legacy Video',
      state: row.state,
      city: row.city,
      uploadDate: row.upload_date,
      fileSize: row.file_size || 0,
      bucketUrl: `${s3Endpoint}${row.s3_path}`,
      encryptedKeyPayload: row.encrypted_aes_key,
      status: 'completed',
      hash: 'N/A'
    })), ...hardenedRecords];

    return allRecords;
  }
};
