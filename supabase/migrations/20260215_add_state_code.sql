-- Migration: Add state_code for readable analytics
-- This column stores the plaintext state (TX, NY, etc.) for new uploads
-- while maintaining the blind_index_state for legacy/encrypted searches.

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Index for analytics performance
CREATE INDEX IF NOT EXISTS idx_videos_state_code ON public.videos(state_code);
