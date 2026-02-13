import { UploadRecord } from '../types.ts';
import { supabase } from './supabaseClient.ts';

// Manual s3Endpoint removed in favor of supabase.storage.getPublicUrl()

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
    let { data: { user } } = await supabase.auth.getUser();
    let { data: { session } } = await supabase.auth.getSession();

    // If no user/session, sign in with the public uploader account
    if (!user || !session) {
      console.log('No active session, signing in as uploader...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'uploader@fuck-ice.com',
        password: 'PUBLIC_UPLOADER_PASSWORD_123!'
      });

      if (authError) {
        console.error('Auth failed:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      user = authData.user;
      session = authData.session;
    }

    if (!user || !session) throw new Error('User not authenticated (No session)');

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

    const bucketName = 'fuckicevault';
    const randomName = crypto.randomUUID();

    // Sanitize state and city for folder names (remove non-alphanumeric, lowercase)
    const cleanState = state.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const cleanCity = city.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const s3Path = `${user.id}/${cleanState}/${cleanCity}/${randomName}.enc`;

    onProgress(75);

    // 1. Upload to Supabase Storage (Proxies to S3/Disk)
    console.log('Uploading via Supabase Storage...');

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(s3Path, encryptedBlob, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage Upload Failed:', uploadError);
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    // Calculate progress manually isn't supported by supabase-js v2 upload() directly unless using XHR custom client
    // So we just jump to 100% after await
    onProgress(95);

    // 2. Save Metadata to Database
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        blind_index_state: blindIndexState,
        blind_index_city: blindIndexCity,
        blind_index_date: blindIndexDate,
        encrypted_metadata: encryptedMetadata,
        s3_path: s3Path, // Store path
        encrypted_aes_key: dbKeyPayload,
        file_size: file.size,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database Insert Failed:', dbError);
      // Optional: Cleanup file?
      throw new Error(`Database Error: ${dbError.message}`);
    }

    onProgress(100);

    // Export the raw key as a hex string for the recovery backup
    const exportedRaw = await window.crypto.subtle.exportKey('raw', secretKey);
    const recoveryKeyHex = Array.from(new Uint8Array(exportedRaw))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      id: "SUCCESS",
      fileName: file.name,
      state: state,
      city: city,
      uploadDate: date,
      fileSize: file.size,
      bucketUrl: `${bucketName}/${s3Path}`,
      encryptedKeyPayload: dbKeyPayload,
      recoveryKey: recoveryKeyHex, // This will be displayed in the UI modal
      status: 'completed',
      hash: 'N/A'
    };
  },

  retrieveRecordKey: async (dbKeyPayload: string, passphraseOrKey: string): Promise<CryptoKey> => {
    // Check if passphraseOrKey is actually a raw Recovery Key (64-char hex)
    const isHexKey = /^[0-9a-f]{64}$/i.test(passphraseOrKey.trim());

    if (isHexKey) {
      console.log('Using direct Recovery Key for retrieval');
      return storageService.importKeyFromString(passphraseOrKey);
    }

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
    const CHUNK_SIZE = 5 * 1024 * 1024; // Original data size
    const ENCRYPTED_CHUNK_EXTRA = 12 + 16; // 12 IV + 16 TAG
    const ENCRYPTED_PART_SIZE = CHUNK_SIZE + ENCRYPTED_CHUNK_EXTRA;

    const decryptedParts: Blob[] = [];
    const totalSize = encryptedBlob.size;
    let offset = 0;

    try {
      while (offset < totalSize) {
        // Find how much to read. 
        // We don't know the exact ciphertext size of the last chunk easily, 
        // but we know it's [IV(12)][Cipher(len)][Tag(16)].
        // Since we encrypted in 5MB blocks, every block except the last is ENCRYPTED_PART_SIZE.

        let currentPartSize = ENCRYPTED_PART_SIZE;
        if (offset + currentPartSize > totalSize) {
          currentPartSize = totalSize - offset;
        }

        const chunk = encryptedBlob.slice(offset, offset + currentPartSize);
        const chunkBuffer = await chunk.arrayBuffer();

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

      return new Blob(decryptedParts);
    } catch (e) {
      console.error("Decryption failed:", e);
      throw new Error("Decryption failed. Invalid Key or Passphrase.");
    }
  },

  getRecords: async (query: { state?: string, city?: string, date?: string }, passphrase?: string): Promise<UploadRecord[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return [];

    const bucketName = 'fuckicevault';
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

    // 2. Fetch Hardened Data (V2) - via Supabase (NOT Proxy, direct)
    // Querying blind indexes if passphrase provided, else query won't match much (except by user_id)
    // Actually, without a backend, we can only query by user_id and then filter client-side if we have the key.

    let v2Query = supabase.from('videos').select('*').eq('user_id', user.id);

    // Blind Index Filtering (if we have a passphrase to generate them)
    if (passphrase) {
      // We need to derive the search key to generate blind indexes
      // But wait, we don't know the salt used for the search key without a row... 
      // Actually, in the upload, we used a random salt for KEK/SearchKey.
      // Only the KEK salt is stored in `encrypted_aes_key` (PWV2:salt:wrappedKey).
      // The schema assumes the SAME salt for SearchKey? 
      // In `uploadVideo`: `deriveSearchKey(passphrase, salt)`.
      // Yes, same salt.
      // BUT, to query, we need to generate the blind index BEFORE fetching.
      // This implies we need the salt. But salt is per-row!
      // So we CANNOT query by blind index efficiently without a fixed salt or backend.
      // Current workaround: Fetch ALL user records, then filter client-side.
    }

    try {
      const { data: v2Data } = await v2Query;
      const v2Rows = v2Data || [];

      if (v2Rows.length > 0) {
        // Parallel decryption/filtering
        const decryptedPromises = v2Rows.map(async (row: any) => {
          let decryptedMeta: any = { filename: 'Encrypted', state: 'Locked', city: 'Locked', upload_date: 'Locked' };
          let isValid = true;

          if (passphrase) {
            try {
              // Attempt decryption of METADATA
              const [ivHex, dataHex] = row.encrypted_metadata.split(':');
              // But wait, we need the KEK first.
              const [prefix, saltHex, wrappedKeyStr] = row.encrypted_aes_key.split(':');
              if (prefix !== 'PWV2') throw new Error('Unknown format');

              const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
              const kek = await deriveKEK(passphrase, salt);

              // Decrypt Metadata
              decryptedMeta = await decryptMetadata(row.encrypted_metadata, kek);

              // Filter Check
              if (query.state && decryptedMeta.state.toLowerCase() !== query.state.toLowerCase()) isValid = false;
              if (query.city && decryptedMeta.city.toLowerCase() !== query.city.toLowerCase()) isValid = false;
              if (query.date && decryptedMeta.upload_date !== query.date) isValid = false;

            } catch (e) {
              // Decryption failed means wrong passphrase or corrupted
              // We keep it as "Locked"
            }
          }

          if (!isValid) return null;

          const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(row.s3_path);

          return {
            id: row.id,
            fileName: decryptedMeta.filename,
            state: decryptedMeta.state,
            city: decryptedMeta.city,
            uploadDate: decryptedMeta.upload_date,
            fileSize: row.file_size || 0,
            bucketUrl: publicUrl,
            encryptedKeyPayload: row.encrypted_aes_key,
            status: 'completed',
            hash: 'N/A'
          };
        });

        const resolved = await Promise.all(decryptedPromises);
        hardenedRecords = resolved.filter(r => r !== null);
      }
    } catch (e) { console.error("Hardened fetch error", e); }

    // Combine
    return [...legacyRecords.map((row: any) => {
      const { data: { publicUrl } } = supabase.storage.from('video_vault').getPublicUrl(row.s3_path);
      return {
        id: row.id,
        fileName: row.filename || 'Legacy Video',
        state: row.state,
        city: row.city,
        uploadDate: row.upload_date,
        fileSize: row.file_size || 0,
        bucketUrl: publicUrl,
        encryptedKeyPayload: row.encrypted_aes_key,
        status: 'completed',
        hash: 'N/A'
      };
    }), ...hardenedRecords];
  }
};
