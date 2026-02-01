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
    ["wrapKey", "unwrapKey"]
  );
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
    const wrappedKeyStr = await wrapKey(secretKey, kek);

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const dbKeyPayload = `PWV1:${saltHex}:${wrappedKeyStr}`;

    const bucketName = state.toLowerCase().replace(/\s+/g, '-');
    const s3Path = `/${state}/${city}/${date}_${file.name}.enc`;
    onProgress(75);

    const { data: record, error } = await supabase
      .from('video_vault')
      .insert({
        user_id: user.id,
        state,
        city,
        upload_date: date,
        filename: file.name,
        s3_path: s3Path,
        encrypted_aes_key: dbKeyPayload,
        file_size: file.size
      })
      .select()
      .single();

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
      state: record.state,
      city: record.city,
      uploadDate: record.upload_date,
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

  getRecords: async (query: { state?: string, city?: string, date?: string }): Promise<UploadRecord[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let queryBuilder = supabase.from('video_vault').select('*').eq('user_id', user.id);
    if (query.state) queryBuilder = queryBuilder.eq('state', query.state);
    if (query.city) queryBuilder = queryBuilder.eq('city', query.city);
    if (query.date) queryBuilder = queryBuilder.eq('upload_date', query.date);

    const { data, error } = await queryBuilder;
    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      fileName: row.filename || 'Encrypted Video',
      state: row.state,
      city: row.city,
      uploadDate: row.upload_date,
      fileSize: row.file_size || 0,
      bucketUrl: `${s3Endpoint}${row.s3_path}`,
      encryptedKeyPayload: row.encrypted_aes_key,
      status: 'completed',
      hash: 'N/A'
    }));
  }
};
