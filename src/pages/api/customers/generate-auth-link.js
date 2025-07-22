// src/pages/api/customers/generate-auth-link.js

import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/utils/supabase/browserClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { customerId, customerEmail } = req.body;
  if (!customerId || !customerEmail) {
    return res
      .status(400)
      .json({ error: "Missing customerId or customerEmail" });
  }
  // Generate token and expiry
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 525600 * 60 * 1000); // 1 Year from now
  // Store in DB
  const { error } = await supabase
    .from("customer_verification_tokens")
    .insert([
      { customer_id: customerId, token, expires_at: expiresAt.toISOString() },
    ]);
  if (error) {
    return res
      .status(500)
      .json({ error: "Failed to create verification token" });
  }
  // Build URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const link = `${baseUrl}/customers/verify/${token}`;

  // Send email to customer
  const subject = "Greenlight Energy: Complete Your Account Verification";
  const htmlContent = `
    <p>Hello,</p>
    <p>You have been added as a customer to Greenlight Energy.</p>
    <p>Please verify your account by clicking the link below and entering your Enphase authorization code:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link will expire in  1 year.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Best regards,<br/>Greenlight Energy Team</p>
  `;

  // Call the sendmail API
  const emailRes = await fetch(`${baseUrl}/api/sendmail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userEmail: customerEmail,
      subject,
      htmlContent,
      attachment: "",// No attachment for verification
    }),
  });
  const emailResult = await emailRes.json();
  console.log("Sendmail API result:", emailResult);

  return res.status(200).json({ link });
}
