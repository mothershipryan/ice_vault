import { UploadRecord } from '../types.ts';
import { supabase } from './supabaseClient.ts';

const filenApiKey = import.meta.env.VITE_FILEN_API_KEY;

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

    // 2. Generate Vault Key
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const vaultKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const formattedKey = `ICE-${vaultKey.substring(0, 4)}-${vaultKey.substring(4, 8)}-${vaultKey.substring(8, 12)}-${vaultKey.substring(12, 16)}`;

    // 3. Hash the Key for Storage
    const encoder = new TextEncoder();
    const data = encoder.encode(formattedKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const recoveryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. Initialize Filen SDK
    if (!filenApiKey) {
      console.warn('VITE_FILEN_API_KEY is missing. Mocking Filen upload.');
    }

    // Mock Progress
    for (let i = 0; i <= 90; i += 10) {
      onProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 5. Perform Upload (Mocked logic)
    const bucketName = state.toLowerCase().replace(/\s+/g, '-');
    const region = 'eu-central-1';
    const filenRef = {
      provider: 'filen.io',
      bucket: bucketName,
      path: `/${state}/${city}/${date}_${file.name}`,
      hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') // TODO: Calculate real hash
    };

    // 6. Save Metadata to Supabase
    const { data: record, error } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        state,
        city,
        upload_date: date,
        filen_ref: filenRef,
        recovery_hash: recoveryHash
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
      bucketUrl: `https://filen.io/vault/${region}/${bucketName}/${filenRef.hash.substring(0, 12)}`,
      status: 'completed',
      hash: filenRef.hash,
      recoveryKey: formattedKey // RETURN THE PLAIN KEY TO UI
    };
  },

  getRecords: async (query: { state?: string, city?: string, date?: string, vaultKey?: string }): Promise<UploadRecord[]> => {

    // If Vault Key is provided, use the secure RPC function
    if (query.vaultKey) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(query.vaultKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const recoveryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase
        .rpc('retrieve_upload', { hash_input: recoveryHash });

      if (error) {
        console.error('Vault Retrieval Error:', error);
        return [];
      }

      // Transform RPC result
      return (data || []).map((row: any) => ({
        id: row.id,
        fileName: 'Encrypted Video',
        state: row.state,
        city: row.city,
        uploadDate: row.upload_date,
        fileSize: 0,
        bucketUrl: '#',
        status: 'completed',
        hash: row.filen_ref?.hash || 'N/A'
      }));
    }

    // Fallback: Authenticated User Retrieval (Session based)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let queryBuilder = supabase
      .from('uploads')
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
      fileName: 'Encrypted Video',
      state: row.state,
      city: row.city,
      uploadDate: row.upload_date,
      fileSize: 0,
      bucketUrl: '#',
      status: 'completed',
      hash: row.filen_ref?.hash || 'N/A'
    }));
  }
};
