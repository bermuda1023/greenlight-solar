// src/pages/api/enphase/energy-import.js
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { start_at, authorization, site_id, api_key } = req.query;

  const url = `https://api.enphaseenergy.com/api/v4/systems/${site_id}/energy_import_telemetry?start_at=${encodeURIComponent(start_at)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authorization}`,
        "key": api_key,
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from Enphase Import API: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch import energy data" });
  }
}