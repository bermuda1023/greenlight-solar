-- Create password reset tokens table for admin users
CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token varchar UNIQUE NOT NULL,
  created_at timestamp DEFAULT NOW(),
  expires_at timestamp NOT NULL,
  used_at timestamp DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_password_reset_tokens_token
  ON admin_password_reset_tokens(token);
CREATE INDEX idx_admin_password_reset_tokens_user_id
  ON admin_password_reset_tokens(user_id);

-- Add comments for documentation
COMMENT ON TABLE admin_password_reset_tokens IS 'Stores password reset tokens for admin users';
COMMENT ON COLUMN admin_password_reset_tokens.token IS 'Unique token sent to user email for password reset';
COMMENT ON COLUMN admin_password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour from creation)';
COMMENT ON COLUMN admin_password_reset_tokens.used_at IS 'Timestamp when token was used for password reset';
