import { supabase } from '@/utils/supabase/browserClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  // Query the verification tokens table
  const { data, error } = await supabase
    .from('customer_verification_tokens')
    .select('customer_id, expires_at')
    .eq('token', token)
    .single();
  if (error || !data) {
    return res.status(404).json({ valid: false });
  }
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < now) {
    return res.status(410).json({ valid: false, expired: true });
  }
  return res.status(200).json({ valid: true, customerId: data.customer_id });
} 