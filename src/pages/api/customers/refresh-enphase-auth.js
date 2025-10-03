// src/pages/api/customers/refresh-enphase-auth.js
import { supabase } from "@/utils/supabase/browserClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId, authorizationCode } = req.body;

  if (!customerId || !authorizationCode) {
    return res.status(400).json({ error: 'Customer ID and authorization code are required' });
  }

  try {
    // Exchange authorization code for refresh token
    const tokenUrl = "https://api.enphaseenergy.com/oauth/token";
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: "https://api.enphaseenergy.com/oauth/redirect_uri",
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic YmE1MjI4ZTRmODQzYTk0NjA3ZTZjYzI0NTA0M2JjNTQ6YjAzZTUxZDhlM2I1MGM0OTc2OTk0NTgwM2Y2NWZiNzA=",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange error:", errorText);
      return res.status(400).json({ error: "Failed to exchange authorization code for token" });
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    // Update customer record with new refresh token
    const { error: updateError } = await supabase
      .from("customers")
      .update({ 
        refresh_token: refreshToken,
        authorization_code: authorizationCode,
        authorization_status: null, // Clear expired status
        verification: true
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("Failed to update customer:", updateError);
      return res.status(500).json({ error: "Failed to update customer record" });
    }

    console.log(`Successfully refreshed Enphase authorization for customer ${customerId}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Enphase authorization refreshed successfully" 
    });

  } catch (error) {
    console.error("Error refreshing Enphase authorization:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
