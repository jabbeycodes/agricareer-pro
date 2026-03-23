-- Run this in Supabase Dashboard > SQL Editor
-- Adds columns needed for full auto-apply pipeline

ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailored_resume_text TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailored_resume_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_method TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_response TEXT;
