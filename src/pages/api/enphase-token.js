import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    console.log("Making Enphase token request with code:", code);

    const tokenUrl = "https://api.enphaseenergy.com/oauth/token";
    const authHeader =
      "Basic YmE1MjI4ZTRmODQzYTk0NjA3ZTZjYzI0NTA0M2JjNTQ6YjAzZTUxZDhlM2I1MGM0OTc2OTk0NTgwM2Y2NWZiNzA=";

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: "https://api.enphaseenergy.com/oauth/redirect_uri",
      code: code,
    });

    console.log("Token request URL:", tokenUrl);
    console.log("Token request params:", params.toString());

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const responseText = await response.text();
    console.log("Raw Enphase response:", responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid response from Enphase API",
        details: responseText,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Error from Enphase API",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Server error in Enphase token request:", error);
    return res.status(500).json({
      error: "Failed to obtain token from Enphase",
      message: error.message,
    });
  }
}
