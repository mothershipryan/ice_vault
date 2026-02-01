-- SECURITY HARDENING MIGRATION
-- 1. Create Private Schema and Secure Settings
COMMENT ON DATABASE postgres IS 'Hardened Mode';

-- 2. Create New Hardened Table
CREATE TABLE public.video_vault_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    
    -- Blind Indexes for Search (HMAC-SHA256 of State/City)
    -- Server sees: "a8f93..." instead of "California"
    blind_index_state TEXT NOT NULL,
    blind_index_city TEXT NOT NULL,
    blind_index_date TEXT NOT NULL, -- Optional: Index date if precise date search is strictly needed, otherwise store in metadata

    -- Encrypted Metadata Blob (AES-256-GCM)
    -- Contains JSON: { "filename": "...", "state": "...", "city": "...", "date": "..." }
    encrypted_metadata TEXT NOT NULL,

    -- Wrapped Key (KEK-Wrapped DEK)
    encrypted_aes_key TEXT NOT NULL,

    -- Storage Path (Randomized/UUID based to hide filenames in S3)
    s3_path TEXT NOT NULL,
    
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.video_vault_v2 ENABLE ROW LEVEL SECURITY;

-- 4. Create Strict Policy
CREATE POLICY "Users can only access their own vault"
ON public.video_vault_v2
FOR ALL
USING (auth.uid() = user_id);

-- 5. Migration Logic (Manual or Scripted?)
-- OLD table 'video_vault' is kept for reference but should be deprecated.
-- Real migration requires decrypting old records using the user's passphrase (client-side) 
-- and re-uploading to this new table. 
-- For this "Hardening" phase, we will assume new uploads go here.

-- 6. Privacy Settings (Supabase/Postgres Config)
-- These must be run by a Superuser or via Dashboard 'Database settings'
-- ALTER DATABASE postgres SET log_min_messages = 'warning';
-- ALTER DATABASE postgres SET log_statement = 'none';
