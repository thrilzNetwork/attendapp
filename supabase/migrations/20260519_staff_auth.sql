-- Staff Auth System Migration
-- Adds columns for email/password authentication via Supabase Auth

ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS setup_token TEXT;
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_accounts_setup_token ON staff_accounts(setup_token);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_auth_user_id ON staff_accounts(auth_user_id);
