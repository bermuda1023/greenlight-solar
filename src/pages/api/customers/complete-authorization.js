import { createClient } from "@supabase/supabase-js";

// Create a direct Supabase client without relying on auth helpers
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
);

export default async function handler(req, res) {
  console.log("API handler called with method:", req.method);
  console.log("Request body:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let { customerId, authCode, token, refreshToken } = req.body;

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

  // After validating the token
  console.log("Token data:", tokenData);

  // Get the customer ID directly from the database
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId);

  console.log("Customer lookup result:", {
    data: customerData,
    error: customerError,
  });

  if (customerData && customerData.length > 0) {
    // Use the correct ID from the database
    customerId = customerData[0].id;
    console.log("Using customer ID from database:", customerId);
  }

  // After validating the token and before updating the customer
  console.log("About to update customer with ID:", customerId);

  try {
    // First, check if the customer exists
    const { data: existingCustomer, error: checkError } = await supabase
      .from("customers")
      .select("id, verification")
      .eq("id", customerId)
      .single();

    console.log("Existing customer check:", {
      exists: !!existingCustomer,
      data: existingCustomer,
      error: checkError,
    });

    if (checkError || !existingCustomer) {
      console.error("Customer not found:", checkError);
      return res.status(404).json({ error: "Customer not found" });
    }

    // Then try the update
    console.log("Attempting direct update with SQL");

    // Try a direct SQL update
    const { data: directUpdate, error: directError } = await supabase.rpc(
      "update_customer_verification",
      {
        customer_id: customerId,
        auth_code: authCode,
        refresh_token_value: refreshToken || null,
      },
    );

    console.log("Direct update result:", {
      data: directUpdate,
      error: directError,
    });

    // Verify the update worked
    const { data: verifiedCustomer, error: verifyError } = await supabase
      .from("customers")
      .select("id, verification, authorization_code")
      .eq("id", customerId)
      .single();

    console.log("Verification check after update:", {
      customer: verifiedCustomer,
      error: verifyError,
    });
  } catch (error) {
    console.error("Unexpected error during update:", error);
    return res.status(500).json({ error: "Unexpected error during update" });
  }

  // Delete token
  await supabase
    .from("customer_verification_tokens")
    .delete()
    .eq("id", tokenData.id);

  return res.status(200).json({ success: true });
}
