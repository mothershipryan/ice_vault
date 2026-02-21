import { UploadRecord } from '../types.ts';
import { supabase } from './supabaseClient.ts';

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
      iterations: 600000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
};

// Helper: Derive a deterministic user ID from passphrase
const deriveUserIdFromPassphrase = async (passphrase: string): Promise<string> => {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  const staticSalt = encoder.encode('FUCK-ICE-STATIC-SALT-2024'); // Static salt for consistent user ID
  const baseKey = await window.crypto.subtle.importKey('raw', passphraseBytes, 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: staticSalt, iterations: 600000, hash: 'SHA-256' },
    baseKey,
    256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Memory hygiene: Zero out the derived bits
  new Uint8Array(derivedBits).fill(0);

  // Format as UUID for compatibility with Supabase user_id field (UUID v4 format)
  return `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-${hashHex.slice(12, 16)}-${hashHex.slice(16, 20)}-${hashHex.slice(20, 32)}`;
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
  onProgress: (percent: number, step: string) => void
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

    // Memory hygiene: Zero out the chunk buffer after use
    new Uint8Array(chunkBuffer).fill(0);
    iv.fill(0);

    onProgress(5 + Math.round((i / totalChunks) * 45), "Encrypting Shards...");
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
    onProgress: (progress: number, step: string) => void
  ): Promise<UploadRecord> => {
    onProgress(1, "Deriving Identity...");
    // Derive a deterministic user ID from the passphrase
    const derivedUserId = await deriveUserIdFromPassphrase(passphrase);

    onProgress(5, "Generating Session Keys...");
    const secretKey = await generateAESKey();
    const encryptedBlob = await encryptFileInChunks(file, secretKey, onProgress);

    onProgress(55, "Deriving KEK & Search Keys...");
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKEK(passphrase, salt);
    const searchKey = await deriveSearchKey(passphrase, salt);

    onProgress(60, "Wrapping Payload Keys...");
    const wrappedKeyStr = await wrapKey(secretKey, kek);
    const mimeType = file.type || guessMimeType(file.name);

    const metadataMsg = { filename: file.name, mime_type: mimeType, upload_date: date, state: state.trim(), city: city.trim() };
    const encryptedMetadata = await encryptMetadata(metadataMsg, kek);

    onProgress(65, "Blind Indexing (State/City)...");
    const blindIndexState = await calculateBlindIndex(state, searchKey);
    const blindIndexCity = await calculateBlindIndex(city, searchKey);
    const blindIndexDate = await calculateBlindIndex(date, searchKey);

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const dbKeyPayload = `PWV2:${saltHex}:${wrappedKeyStr}`;

    const s3Path = `${derivedUserId}/${state.toLowerCase()}/${city.toLowerCase()}/${window.crypto.randomUUID()}.enc`;

    onProgress(70, "Requesting Proxy Access...");
    // 1. Get Pre-signed URL from Supabase Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('vault-proxy', {
      body: {
        action: 'get_presigned_url',
        payload: {
          key: s3Path,
          fileType: 'application/octet-stream'
        }
      }
    });

    if (edgeError) {
      console.error(`[Vault] Edge Function Error:`, edgeError);
      throw new Error(`Cloud Proxy Error: ${edgeError.message}`);
    }

    const presignedUrl = edgeData?.url || (edgeData as any)?.data?.url;

    if (!presignedUrl) throw new Error("Failed to get pre-signed upload URL");

    onProgress(75, "Uploading Shards to S3...");
    // 2. Upload directly to S3
    const s3UploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: encryptedBlob,
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    if (!s3UploadRes.ok) throw new Error(`S3 Upload Failed: ${s3UploadRes.statusText}`);

    onProgress(95, "Committing to Ledger...");
    const { error: dbError } = await supabase.from('videos').insert({
      user_id: derivedUserId,
      blind_index_state: blindIndexState,
      blind_index_city: blindIndexCity,
      blind_index_date: blindIndexDate,
      encrypted_metadata: encryptedMetadata,
      state_code: state.trim().toUpperCase(),
      s3_path: s3Path,
      encrypted_aes_key: dbKeyPayload,
      file_size: file.size,
      created_at: new Date().toISOString()
    });

    if (dbError) throw new Error(`Database Error: ${dbError.message}`);

    onProgress(100, "Complete");
    const exportedRaw = await window.crypto.subtle.exportKey('raw', secretKey);
    return {
      id: "SUCCESS",
      fileName: file.name,
      mimeType,
      state: state.trim(),
      city: city.trim(),
      uploadDate: date,
      fileSize: file.size,
      bucketUrl: `https://${import.meta.env.VITE_S3_ENDPOINT?.replace('https://', '')}/fuckicevault/${s3Path}`,
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

  decryptFile: async (encryptedBlob: Blob, key: CryptoKey, mimeType?: string, onProgress?: (percent: number) => void): Promise<Blob> => {
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

        // Memory hygiene: Zero out sensitive buffers
        new Uint8Array(chunkBuffer).fill(0);
        new Uint8Array(decryptedBuffer).fill(0);

        if (onProgress) onProgress(Math.round((offset / encryptedBlob.size) * 100));
      }
      return new Blob(decryptedParts, { type: finalMime });
    } catch (e: any) {
      throw new Error(`Decryption failed: ${e.message}`);
    }
  },

  downloadAndDecryptVideo: async (
    record: UploadRecord,
    passphrase: string,
    onProgress: (percent: number, step: string) => void
  ): Promise<void> => {
    onProgress(5, "Authenticating...");
    const key = await storageService.retrieveRecordKey(record.encryptedKeyPayload, passphrase);

    // 1. Get Download URL
    onProgress(10, "Requesting Access...");
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('vault-proxy', {
      body: {
        action: 'get_download_url',
        payload: { key: record.s3Path }
      }
    });

    if (edgeError || !edgeData?.url) {
      throw new Error("Failed to authorize download from secure vault.");
    }

    // 2. Download Encrypted Blob
    onProgress(20, "Downloading Encrypted Shards...");
    const response = await fetch(edgeData.url);
    if (!response.ok) throw new Error("Download stream failed.");
    const encryptedBlob = await response.blob();

    // 3. Decrypt
    onProgress(50, "Decrypting (AES-256-GCM)...");
    const decryptedBlob = await storageService.decryptFile(
      encryptedBlob,
      key,
      record.mimeType,
      (p) => onProgress(50 + Math.round(p / 2), "Decrypting...")
    );

    // 4. Save to Disk
    onProgress(100, "Finalizing...");
    const url = window.URL.createObjectURL(decryptedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = record.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  downloadFile: async (s3Path: string): Promise<Blob> => {
    const { data, error } = await supabase.storage.from('fuckicevault').download(s3Path);
    if (error) throw new Error(`Download error: ${error.message}`);
    return data;
  },

  deleteRecord: async (id: string, s3Path: string, isLegacy: boolean): Promise<void> => {
    const bucketName = isLegacy ? 'video_vault' : 'fuckicevault';
    const tableName = isLegacy ? 'video_vault' : 'videos';

    console.log(`[Vault] Purge sequence initiated for ID: ${id} (isLegacy: ${isLegacy})`);
    console.log(`[Vault] Target: Table=${tableName}, Bucket=${bucketName}, Path=${s3Path}`);
    console.log(`[Vault] ID Type: ${typeof id}, ID Value: "${id}"`);

    // 0. Pre-flight check: Verify record exists
    try {
      const { data: existingRecord, error: checkError } = await supabase
        .from(tableName)
        .select('id, s3_path')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error(`[Vault] Pre-flight check error:`, checkError);
        if (checkError.code === 'PGRST116') {
          throw new Error(`Record not found in database. The file may have already been deleted. (ID: ${id})`);
        }
        throw new Error(`Pre-flight check failed: ${checkError.message}`);
      }

      if (!existingRecord) {
        console.warn(`[Vault] Record does not exist in ${tableName} table.`);
        throw new Error(`Record not found in database (ID: ${id}). It may have been deleted already.`);
      }

      console.log(`[Vault] ✓ Pre-flight check passed. Record exists in database.`);
      console.log(`[Vault] Record details:`, existingRecord);
    } catch (preflightErr: any) {
      console.error(`[Vault] Pre-flight verification failed:`, preflightErr);
      throw preflightErr;
    }

    // 1. Delete from Database using ADMIN CLIENT to bypass RLS
    try {
      const { error: dbError, data: deletedRows } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select();

      if (dbError) {
        console.error(`[Vault] Database deletion FAILED:`, dbError);
        throw new Error(`Auto-Destruct FAILED (DB): ${dbError.message}`);
      }

      if (!deletedRows || deletedRows.length === 0) {
        console.warn(`[Vault] No rows were deleted for ID ${id}.`);
        console.warn(`[Vault] This may indicate the record doesn't exist, ID mismatch, or RLS policy blocking deletion.`);
        throw new Error(`Auto-Destruct FAILED: Record not found in database (ID: ${id})`);
      }

      console.log(`[Vault] ✓ Database row purged successfully. Deleted ${deletedRows.length} row(s).`);
    } catch (dbErr: any) {
      console.error(`[Vault] Database deletion error:`, dbErr);
      throw dbErr; // Re-throw to prevent storage deletion if DB fails
    }

    // 2. Delete from S3 via Edge Function Proxy (only if database deletion succeeded)
    try {
      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('vault-proxy', {
        body: {
          action: 'delete_object',
          payload: { key: s3Path }
        }
      });

      if (deleteError) {
        throw new Error(deleteError.message || `S3 deletion failed`);
      }

      console.log(`[Vault] ✓ S3 file purged successfully via Edge Function.`);
    } catch (storageErr: any) {
      console.error(`[Vault] S3 deletion error:`, storageErr);
      throw new Error(`S3 deletion failed after DB deletion: ${storageErr.message}`);
    }

    console.log(`[Vault] ✓ Auto-Destruct complete. Both database and storage purged.`);
  },

  getRecords: async (query: { state?: string, city?: string, date?: string }, passphrase?: string): Promise<UploadRecord[]> => {
    if (!passphrase || !passphrase.trim()) return [];

    const trimmedPass = passphrase.trim();
    const cleanInput = trimmedPass.replace(/^ICE-|[^A-F0-9]/gi, '');
    const isHexKey = /^[0-9a-f]{64}$/i.test(cleanInput);

    // Derive a deterministic user ID from the passphrase
    const derivedUserId = await deriveUserIdFromPassphrase(trimmedPass);

    const [v2Resp, v1Resp] = await Promise.all([
      supabase.from('videos').select('*').eq('user_id', derivedUserId),
      supabase.from('video_vault').select('*').eq('user_id', derivedUserId)
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

      const s3Url = `https://${import.meta.env.VITE_S3_ENDPOINT?.replace('https://', '')}/fuckicevault/${row.s3_path}`;

      return {
        id: row.id,
        fileName: meta.filename,
        mimeType: meta.mime_type,
        state: meta.state || 'Unknown',
        city: meta.city || 'Unknown',
        uploadDate: meta.upload_date || 'Unknown',
        fileSize: row.file_size || 0,
        bucketUrl: s3Url,
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
