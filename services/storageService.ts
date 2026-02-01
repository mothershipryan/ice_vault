import { UploadRecord } from '../types.ts';
import { supabase } from './supabaseClient.ts';

const s3Endpoint = import.meta.env.VITE_S3_ENDPOINT;
const s3Region = import.meta.env.VITE_S3_REGION;

// Helper: Generate a random 256-bit AES-GCM key
const generateAESKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
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

    // Generate specific IV for this chunk
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      chunkBuffer
    );

    // Append IV + Encrypted Data to output
    encryptedParts.push(new Blob([iv, encryptedBuffer]));

    offset += CHUNK_SIZE;

    // Update progress (Encryption is 0-50% of total process)
    const progress = Math.round((i / totalChunks) * 50);
    onProgress(progress);
  }

  return new Blob(encryptedParts);
};

export const storageService = {
  uploadVideo: async (
    file: File,
    state: string,
    city: string,
    date: string,
    onProgress: (progress: number) => void
  ): Promise<UploadRecord> => {
    // 1. Get Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated (Anonymous session failed)');

    // 2. Client-Side Encryption
    onProgress(1); // Start
    const secretKey = await generateAESKey();
    const encryptedBlob = await encryptFileInChunks(file, secretKey, onProgress);

    // 3. Export Key for Recovery (Raw bytes -> Hex string)
    const rawKey = await window.crypto.subtle.exportKey("raw", secretKey);
    const keyArray = Array.from(new Uint8Array(rawKey));
    const hexKey = keyArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const formattedKey = `ICE-${hexKey.substring(0, 4)}-${hexKey.substring(4, 8)}-${hexKey.substring(8, 12)}-${hexKey.substring(12, 16)}`;

    // 4. Initialize S3 SDK (Mocked for now)
    if (!s3Endpoint) {
      console.warn('VITE_S3_ENDPOINT is missing. Mocking S3 upload.');
    }

    // Mock Upload Progress (50-100%)
    for (let i = 50; i <= 90; i += 10) {
      onProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 5. Perform Upload (Using the ENCRYPTED blob)
    const bucketName = state.toLowerCase().replace(/\s+/g, '-');
    const s3Path = `/${state}/${city}/${date}_${file.name}.enc`;

    // Note: In a real implementation, we would upload 'encryptedBlob' here
    console.log(`Would upload encrypted blob size: ${encryptedBlob.size} to ${s3Endpoint}/${bucketName}${s3Path}`);

    // 6. Save Metadata to Supabase (video_vault table)
    const { data: record, error } = await supabase
      .from('video_vault') // UPDATED TABLE NAME
      .insert({
        user_id: user.id,
        state,
        city,
        upload_date: date,
        filename: file.name,
        s3_path: s3Path, // SAVING S3 PATH
        encrypted_aes_key: formattedKey, // SAVING THE HEX KEY
        file_size: file.size
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to save upload record to database');
    }

    onProgress(100);

    return {
      id: record.id,
      fileName: file.name,
      state: record.state,
      city: record.city,
      uploadDate: record.upload_date,
      fileSize: file.size,
      bucketUrl: `${s3Endpoint}/${bucketName}${s3Path}`,
      status: 'completed',
      hash: 'N/A',
      recoveryKey: formattedKey
    };
  },

  // Helper: Import Key from Hex String (inverse of export)
  importKeyFromString: async (keyString: string): Promise<CryptoKey> => {
    // Remove formatting dashes/prefix if present
    const cleanKey = keyString.replace(/^ICE-|[^A-F0-9]/g, '');

    // Convert Hex -> Uint8Array
    const keyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    return window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Client-Side Decryption: Blob -> Decrypted Blob
  decryptFile: async (encryptedBlob: Blob, key: CryptoKey): Promise<Blob> => {
    const buffer = await encryptedBlob.arrayBuffer();

    // Extract IV (first 12 bytes) and Ciphertext
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
      throw new Error("Decryption failed. Invalid Key or Corrupted Data.");
    }
  },

  getRecords: async (query: { state?: string, city?: string, date?: string, vaultKey?: string }): Promise<UploadRecord[]> => {

    // Fallback: Authenticated User Retrieval (Session based)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let queryBuilder = supabase
      .from('video_vault') // UPDATED TABLE NAME
      .select('*')
      .eq('user_id', user.id);

    if (query.state) queryBuilder = queryBuilder.eq('state', query.state);
    if (query.city) queryBuilder = queryBuilder.eq('city', query.city);
    if (query.date) queryBuilder = queryBuilder.eq('upload_date', query.date);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Fetch error:', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      fileName: row.filename || 'Encrypted Video',
      state: row.state,
      city: row.city,
      uploadDate: row.upload_date,
      fileSize: row.file_size || 0,
      bucketUrl: row.s3_path ? `${s3Endpoint}${row.s3_path}` : '#',
      status: 'completed',
      hash: 'N/A'
    }));
  }
};
