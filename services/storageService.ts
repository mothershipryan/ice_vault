import { UploadRecord } from '../types.ts';
import { supabase, supabaseAdmin } from './supabaseClient.ts';

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
    encoder.encode(passphrase.trim()),
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
    encoder.encode(passphrase.trim()),
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
  const parts = encryptedStr.split(':');
  if (parts.length < 2) throw new Error("Invalid metadata format");
  const ivHex = parts[0];
  const dataHex = parts[1];

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

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const wrappedHex = Array.from(new Uint8Array(wrappedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ivHex}:${wrappedHex}`;
};

// Helper: Unwrap (decrypt) the video key using the KEK
const unwrapKey = async (wrappedKeyStr: string, kek: CryptoKey): Promise<CryptoKey> => {
  const parts = wrappedKeyStr.split(':');
  if (parts.length < 2) throw new Error("Invalid wrapped key format");
  const ivHex = parts[0];
  const wrappedHex = parts[1];

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

// Helper: Encrypt file in chunks
const encryptFileInChunks = async (
  file: File,
  key: CryptoKey,
  onProgress: (percent: number) => void
): Promise<Blob> => {
  const CHUNK_SIZE = 5 * 1024 * 1024;
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

// Helper: Guess MIME type from extension
const guessMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    case 'webm': return 'video/webm';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
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
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'uploader@fuck-ice.com',
        password: 'PUBLIC_UPLOADER_PASSWORD_123!'
      });
      user = authData.user;
    }
    if (!user) throw new Error('User not authenticated');

    onProgress(1);
    const secretKey = await generateAESKey();
    const encryptedBlob = await encryptFileInChunks(file, secretKey, onProgress);

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKEK(passphrase, salt);
    const searchKey = await deriveSearchKey(passphrase, salt);

    const wrappedKeyStr = await wrapKey(secretKey, kek);
    const mimeType = file.type || guessMimeType(file.name);

    const metadataMsg = { filename: file.name, mime_type: mimeType, upload_date: date, state: state.trim(), city: city.trim() };
    const encryptedMetadata = await encryptMetadata(metadataMsg, kek);

    const blindIndexState = await calculateBlindIndex(state, searchKey);
    const blindIndexCity = await calculateBlindIndex(city, searchKey);
    const blindIndexDate = await calculateBlindIndex(date, searchKey);

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const dbKeyPayload = `PWV2:${saltHex}:${wrappedKeyStr}`;

    const bucketName = 'fuckicevault';
    const randomName = crypto.randomUUID();
    const cleanState = state.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const cleanCity = city.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const s3Path = `${user.id}/${cleanState}/${cleanCity}/${randomName}.enc`;

    onProgress(75);
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(s3Path, encryptedBlob);
    if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);

    onProgress(95);
    const { error: dbError } = await supabase.from('videos').insert({
      user_id: user.id,
      blind_index_state: blindIndexState,
      blind_index_city: blindIndexCity,
      blind_index_date: blindIndexDate,
      encrypted_metadata: encryptedMetadata,
      s3_path: s3Path,
      encrypted_aes_key: dbKeyPayload,
      file_size: file.size,
      created_at: new Date().toISOString()
    });

    if (dbError) throw new Error(`Database Error: ${dbError.message}`);

    onProgress(100);
    const exportedRaw = await window.crypto.subtle.exportKey('raw', secretKey);
    return {
      id: "SUCCESS",
      fileName: file.name,
      mimeType,
      state: state.trim(),
      city: city.trim(),
      uploadDate: date,
      fileSize: file.size,
      bucketUrl: `${bucketName}/${s3Path}`,
      s3Path,
      encryptedKeyPayload: dbKeyPayload,
      recoveryKey: Array.from(new Uint8Array(exportedRaw)).map(b => b.toString(16).padStart(2, '0')).join(''),
      status: 'completed',
      isLegacy: false
    };
  },

  retrieveRecordKey: async (dbKeyPayload: string, passphraseOrKey: string): Promise<CryptoKey> => {
    const trimmed = passphraseOrKey.trim();
    const cleanKey = trimmed.replace(/^ICE-|[^A-F0-9]/gi, '');
    if (/^[0-9a-f]{64}$/i.test(cleanKey)) {
      return storageService.importKeyFromString(cleanKey);
    }

    if (dbKeyPayload.includes(':')) {
      const parts = dbKeyPayload.split(':');
      const saltHex = parts[0].startsWith('PW') ? parts[1] : parts[0];
      const wrappedKeyStr = parts[0].startsWith('PW') ? parts.slice(2).join(':') : parts.slice(1).join(':');
      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const kek = await deriveKEK(trimmed, salt);
      return unwrapKey(wrappedKeyStr, kek);
    }
    return storageService.importKeyFromString(trimmed);
  },

  importKeyFromString: async (keyString: string): Promise<CryptoKey> => {
    const cleanKey = keyString.trim().replace(/^ICE-|[^A-F0-9]/gi, '');
    const keyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  },

  decryptFile: async (encryptedBlob: Blob, key: CryptoKey, mimeType?: string): Promise<Blob> => {
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const ENCRYPTED_PART_SIZE = CHUNK_SIZE + 28;
    let finalMime = mimeType || 'video/mp4';
    if (finalMime === 'application/octet-stream' || finalMime === 'text/plain') finalMime = 'video/mp4';

    const decryptedParts: Blob[] = [];
    let offset = 0;
    try {
      while (offset < encryptedBlob.size) {
        let currentPartSize = Math.min(ENCRYPTED_PART_SIZE, encryptedBlob.size - offset);
        const chunk = encryptedBlob.slice(offset, offset + currentPartSize);
        const chunkBuffer = await chunk.arrayBuffer();
        const iv = chunkBuffer.slice(0, 12);
        const ciphertext = chunkBuffer.slice(12);
        const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, ciphertext);
        decryptedParts.push(new Blob([decryptedBuffer]));
        offset += currentPartSize;
      }
      return new Blob(decryptedParts, { type: finalMime });
    } catch (e: any) {
      throw new Error(`Decryption failed: ${e.message}`);
    }
  },

  downloadFile: async (s3Path: string): Promise<Blob> => {
    const { data, error } = await supabase.storage.from('fuckicevault').download(s3Path);
    if (error) throw new Error(`Download error: ${error.message}`);
    return data;
  },

  deleteRecord: async (id: string, s3Path: string, isLegacy: boolean): Promise<void> => {
    const bucketName = isLegacy ? 'video_vault' : 'fuckicevault';
    const tableName = isLegacy ? 'video_vault' : 'videos';

    console.log(`[Vault] Purge sequence initiated for ID: ${id} (isLegacy: ${isLegacy}) using ADMIN BYPASS.`);

    // 1. Delete from Database using ADMIN CLIENT to bypass RLS
    const { error: dbError, data: deletedRows } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', id)
      .select();

    if (dbError) {
      console.error(`[Vault] Admin deletion FAILED:`, dbError);
      throw new Error(`Auto-Destruct FAILED (DB Admin): ${dbError.message}`);
    }

    if (!deletedRows || deletedRows.length === 0) {
      console.warn(`[Vault] No rows were deleted for ID ${id} even with Admin key.`);
      throw new Error(`Auto-Destruct FAILED: Record not found in database. Check if ID matches exactly.`);
    }

    console.log(`[Vault] Database row purged successfully.`);

    // 2. Delete from Storage
    const { error: storageError } = await supabase.storage.from(bucketName).remove([s3Path]);
    if (storageError) console.warn(`[Vault] Storage deletion error: ${storageError.message}`);

    console.log(`[Vault] Auto-Destruct complete.`);
  },

  getRecords: async (query: { state?: string, city?: string, date?: string }, passphrase?: string): Promise<UploadRecord[]> => {
    if (!passphrase || !passphrase.trim()) return [];

    const trimmedPass = passphrase.trim();
    const cleanInput = trimmedPass.replace(/^ICE-|[^A-F0-9]/gi, '');
    const isHexKey = /^[0-9a-f]{64}$/i.test(cleanInput);

    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: authData } = await supabase.auth.signInWithPassword({ email: 'uploader@fuck-ice.com', password: 'PUBLIC_UPLOADER_PASSWORD_123!' });
      user = authData.user;
    }
    if (!user) return [];

    console.log(`[Vault] Searching for records... User: ${user.id}`);
    const [v2Resp, v1Resp] = await Promise.all([
      supabase.from('videos').select('*').eq('user_id', user.id),
      supabase.from('video_vault').select('*').eq('user_id', user.id)
    ]);

    const allRows = [
      ...(v2Resp.data || []),
      ...(v1Resp.data || []).map(r => ({ ...r, is_legacy: true }))
    ];

    if (allRows.length === 0) return [];
    console.log(`[Vault] Found ${allRows.length} potential rows in DB. Starting decryption scan...`);

    const decryptedPromises = allRows.map(async (row: any) => {
      let meta = { filename: 'Encrypted', mime_type: 'video/mp4', state: '', city: '', upload_date: '' };

      try {
        if (!isHexKey) {
          const parts = row.encrypted_aes_key.split(':');
          const saltHex = parts[0].startsWith('PW') ? parts[1] : parts[0];
          const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
          const kek = await deriveKEK(trimmedPass, salt);

          if (!row.is_legacy) {
            try {
              const decryptedMeta = await decryptMetadata(row.encrypted_metadata, kek);
              meta = { ...decryptedMeta, mime_type: decryptedMeta.mime_type || guessMimeType(decryptedMeta.filename || '') };
              console.log(`[Vault] Row ${row.id}: Metadata Decrypted Successfully.`);
            } catch (decErr) {
              console.warn(`[Vault] Row ${row.id}: Passphrase decryption failed (Check salt/iterations).`);
              return null;
            }
          } else {
            meta = { filename: row.filename || 'Legacy', mime_type: guessMimeType(row.filename || ''), state: row.state || '', city: row.city || '', upload_date: row.upload_date || '' };
          }

          // Relaxed Filters
          if (query.state && meta.state && meta.state.toLowerCase() !== query.state.toLowerCase().trim()) return null;
          if (query.city && meta.city && meta.city.toLowerCase().trim() !== query.city.toLowerCase().trim()) return null;
          if (query.date && meta.upload_date && meta.upload_date !== query.date) return null;
        } else if (row.is_legacy) {
          meta = { filename: row.filename || 'Encrypted', mime_type: 'video/mp4', state: row.state || '', city: row.city || '', upload_date: row.upload_date || '' };
        }
      } catch (e) { return null; }

      const { data: { publicUrl } } = supabase.storage.from(row.is_legacy ? 'video_vault' : 'fuckicevault').getPublicUrl(row.s3_path);

      return {
        id: row.id,
        fileName: meta.filename,
        mimeType: meta.mime_type,
        state: meta.state || 'Unknown',
        city: meta.city || 'Unknown',
        uploadDate: meta.upload_date || 'Unknown',
        fileSize: row.file_size || 0,
        bucketUrl: publicUrl,
        s3Path: row.s3_path,
        encryptedKeyPayload: row.encrypted_aes_key,
        status: 'completed',
        isLegacy: !!row.is_legacy
      } as UploadRecord;
    });

    const results = (await Promise.all(decryptedPromises)).filter((r): r is UploadRecord => r !== null);
    console.log(`[Vault] Search Complete. Found ${results.length} verified results.`);
    return results;
  }
};
