import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token parameter required' });
  }

  try {
    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({
        error: 'Token not found',
        details: tokenError
      });
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const createdAt = new Date(tokenData.created_at);

    return res.status(200).json({
      tokenFound: true,
      currentTime: now.toISOString(),
      currentTimeLocal: now.toString(),
      createdAt: tokenData.created_at,
      createdAtParsed: createdAt.toString(),
      expiresAt: tokenData.expires_at,
      expiresAtParsed: expiresAt.toString(),
      usedAt: tokenData.used_at,
      isExpired: now > expiresAt,
      timeUntilExpiry: expiresAt - now,
      minutesUntilExpiry: Math.floor((expiresAt - now) / 1000 / 60),
      timeSinceCreation: now - createdAt,
      minutesSinceCreation: Math.floor((now - createdAt) / 1000 / 60)
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}
