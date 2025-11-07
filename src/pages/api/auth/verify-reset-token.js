import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Query token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_password_reset_tokens')
      .select('*, user_id')
      .eq('token', token)
      .is('used_at', null) // Token hasn't been used
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired token' });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ valid: false, error: 'Token has expired' });
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      tokenData.user_id
    );

    if (userError || !userData) {
      return res.status(400).json({ valid: false, error: 'User not found' });
    }

    return res.status(200).json({
      valid: true,
      email: userData.user.email
    });

  } catch (error) {
    console.error('Error verifying reset token:', error);
    return res.status(500).json({ valid: false, error: 'An error occurred verifying the token' });
  }
}
