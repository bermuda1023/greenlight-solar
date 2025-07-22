import { createSupabaseServerClient } from '@/utils/supabase/serverClient';

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { customerId, authCode, token } = req.body;

  if (!customerId || !authCode || !token) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from("customer_verification_tokens")
    .select("id, expires_at")
    .eq("token", token)
    .eq("customer_id", customerId)
    .single();
  if (tokenError || !tokenData) {
    return res.status(404).json({ error: "Invalid or expired token" });
  }
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt < now) {
    return res.status(410).json({ error: "Token expired" });
  }
  // Update customer
  const { error: updateError } = await supabase
    .from("customers")
    .update({ authorization_code: authCode, verification: true })
    .eq("id", customerId);
  if (updateError) {
    return res.status(500).json({ error: "Failed to update customer" });
  }
  // Delete token
  await supabase
    .from("customer_verification_tokens")
    .delete()
    .eq("id", tokenData.id);
  return res.status(200).json({ success: true });
}
