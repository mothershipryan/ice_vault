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

// Helper: Guess MIME type from filename extension
const guessMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    case 'webm': return 'video/webm';
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
    let { data: { session } } = await supabase.auth.getSession();

    if (!user || !session) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'uploader@fuck-ice.com',
        password: 'PUBLIC_UPLOADER_PASSWORD_123!'
      });
      if (authError) throw new Error(`Auth failed: ${authError.message}`);
      user = authData.user;
      session = authData.session;
    }

    if (!user) throw new Error('User not authenticated');

    onProgress(1);
    const secretKey = await generateAESKey();
    const encryptedBlob = await encryptFileInChunks(file, secretKey, onProgress);

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const kek = await deriveKEK(passphrase, salt);
    const searchKey = await deriveSearchKey(passphrase, salt);

    const wrappedKeyStr = await wrapKey(secretKey, kek);
    // Include mime_type in metadata
    const metadataMsg = { filename: file.name, mime_type: file.type, upload_date: date, state, city };
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

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(s3Path, encryptedBlob, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);

    onProgress(95);

    const { error: dbError } = await supabase
      .from('videos')
      .insert({
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
    const recoveryKeyHex = Array.from(new Uint8Array(exportedRaw))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      id: "SUCCESS",
      fileName: file.name,
      mimeType: file.type,
      state: state,
      city: city,
      uploadDate: date,
      fileSize: file.size,
      bucketUrl: `${bucketName}/${s3Path}`,
      s3Path: s3Path,
      encryptedKeyPayload: dbKeyPayload,
      recoveryKey: recoveryKeyHex,
      status: 'completed',
      hash: 'N/A'
    };
  },

  retrieveRecordKey: async (dbKeyPayload: string, passphraseOrKey: string): Promise<CryptoKey> => {
    const cleanKey = passphraseOrKey.replace(/^ICE-|[^A-F0-9]/gi, '');
    const isHexKey = /^[0-9a-f]{64}$/i.test(cleanKey);

    if (isHexKey) {
      return storageService.importKeyFromString(cleanKey);
    }

    if (dbKeyPayload.includes(':')) {
      const parts = dbKeyPayload.split(':');
      // Support PWV1 and PWV2 formats
      const saltHex = parts[0].startsWith('PW') ? parts[1] : parts[0];
      const wrappedKeyStr = parts[0].startsWith('PW') ? parts.slice(2).join(':') : parts.slice(1).join(':');

      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const kek = await deriveKEK(passphraseOrKey, salt);
      return unwrapKey(wrappedKeyStr, kek);
    }
    return storageService.importKeyFromString(passphraseOrKey);
  },

  importKeyFromString: async (keyString: string): Promise<CryptoKey> => {
    const cleanKey = keyString.replace(/^ICE-|[^A-F0-9]/gi, '');
    if (cleanKey.length !== 64) throw new Error("Invalid Recovery Key Format. Must be 64 characters.");
    const keyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    return window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  decryptFile: async (encryptedBlob: Blob, key: CryptoKey, mimeType?: string): Promise<Blob> => {
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const ENCRYPTED_CHUNK_EXTRA = 12 + 16;
    const ENCRYPTED_PART_SIZE = CHUNK_SIZE + ENCRYPTED_CHUNK_EXTRA;

    console.log(`[Vault] Decrypting ${encryptedBlob.size} bytes (MIME: ${mimeType || 'default'})...`);
    const decryptedParts: Blob[] = [];
    let offset = 0;

    try {
      while (offset < encryptedBlob.size) {
        let currentPartSize = Math.min(ENCRYPTED_PART_SIZE, encryptedBlob.size - offset);
        const chunk = encryptedBlob.slice(offset, offset + currentPartSize);
        const chunkBuffer = await chunk.arrayBuffer();

        if (chunkBuffer.byteLength < 12) throw new Error("Truncated chunk.");

        const iv = chunkBuffer.slice(0, 12);
        const ciphertext = chunkBuffer.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(iv) },
          key,
          ciphertext
        );

        decryptedParts.push(new Blob([decryptedBuffer]));
        offset += currentPartSize;
      }
      return new Blob(decryptedParts, { type: mimeType || 'application/octet-stream' });
    } catch (e: any) {
      console.error("[Vault] Decryption Detail:", e);
      throw new Error(`Decryption failed: ${e.message || 'Check Key'}`);
    }
  },

  downloadFile: async (s3Path: string): Promise<Blob> => {
    const bucketName = 'fuckicevault';
    console.log(`[Vault] Downloading from storage: ${s3Path}`);

    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .download(s3Path);

    if (error) {
      console.error("[Vault] Download error:", error);
      throw new Error(`Failed to fetch encrypted asset: ${error.message}`);
    }

    if (!data) throw new Error("No data received from storage.");
    return data;
  },

  getRecords: async (query: { state?: string, city?: string, date?: string }, passphrase?: string): Promise<UploadRecord[]> => {
    if (!passphrase) return [];

    const cleanInput = passphrase.replace(/^ICE-|[^A-F0-9]/gi, '');
    const isHexKey = /^[0-9a-f]{64}$/i.test(cleanInput);

    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'uploader@fuck-ice.com',
        password: 'PUBLIC_UPLOADER_PASSWORD_123!'
      });
      user = authData.user;
    }
    if (!user) return [];

    const bucketName = 'fuckicevault';

    // FETCH BOTH TABLES
    const [v2Resp, v1Resp] = await Promise.all([
      supabase.from('videos').select('*').eq('user_id', user.id),
      supabase.from('video_vault').select('*').eq('user_id', user.id)
    ]);

    const allRows = [
      ...(v2Resp.data || []),
      ...(v1Resp.data || []).map(r => ({ ...r, is_legacy: true }))
    ];

    if (allRows.length === 0) return [];

    const decryptedPromises = allRows.map(async (row: any) => {
      let decryptedMeta = { filename: 'Encrypted', mime_type: '', state: 'Locked', city: 'Locked', upload_date: 'Locked' };
      let isValid = true;
      let metdataDecrypted = false;

      try {
        if (!isHexKey) {
          const parts = row.encrypted_aes_key.split(':');
          const saltHex = parts[0].startsWith('PW') ? parts[1] : parts[0];
          const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
          const kek = await deriveKEK(passphrase, salt);

          if (row.is_legacy) {
            decryptedMeta = {
              filename: row.filename || 'Legacy',
              mime_type: guessMimeType(row.filename || ''),
              state: row.state || 'Locked',
              city: row.city || 'Locked',
              upload_date: row.upload_date || 'Locked'
            };
            metdataDecrypted = true;
          } else {
            const meta = await decryptMetadata(row.encrypted_metadata, kek);
            decryptedMeta = {
              ...meta,
              mime_type: meta.mime_type || guessMimeType(meta.filename || '')
            };
            metdataDecrypted = true;
          }

          if (query.state && decryptedMeta.state.toLowerCase() !== query.state.toLowerCase()) isValid = false;
          if (query.city && decryptedMeta.city.toLowerCase().trim() !== query.city.toLowerCase().trim()) isValid = false;
          if (query.date && decryptedMeta.upload_date !== query.date) isValid = false;
        } else {
          // Hex Key: Decrypt metadata columns if they exist (legacy), else show locked.
          if (row.is_legacy) {
            decryptedMeta = {
              filename: row.filename || 'Encrypted',
              mime_type: guessMimeType(row.filename || ''),
              state: row.state || 'Locked',
              city: row.city || 'Locked',
              upload_date: row.upload_date || 'Locked'
            };
            metdataDecrypted = true;
          }
        }
      } catch (e) {
        if (!isHexKey) return null;
      }

      if (!isHexKey && !metdataDecrypted) return null;
      if (!isValid) return null;

      const { data: { publicUrl } } = supabase.storage.from(row.is_legacy ? 'video_vault' : bucketName).getPublicUrl(row.s3_path);

      return {
        id: row.id,
        fileName: decryptedMeta.filename,
        mimeType: decryptedMeta.mime_type,
        state: decryptedMeta.state,
        city: decryptedMeta.city,
        uploadDate: decryptedMeta.upload_date,
        fileSize: row.file_size || 0,
        bucketUrl: publicUrl,
        s3Path: row.s3_path,
        encryptedKeyPayload: row.encrypted_aes_key,
        status: 'completed',
        hash: 'N/A'
      } as UploadRecord;
    });

    const resolved = await Promise.all(decryptedPromises);
    return resolved.filter((r): r is UploadRecord => r !== null);
  }
};
