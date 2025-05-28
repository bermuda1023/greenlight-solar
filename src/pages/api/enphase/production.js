// src/pages/api/enphase/production.js
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { start_date, granularity, authorization, site_id, api_key } = req.query;

  const url = `https://api.enphaseenergy.com/api/v4/systems/${site_id}/telemetry/production_meter?start_date=${encodeURIComponent(start_date)}&granularity=${granularity || '15mins'}&key=${api_key}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authorization}`,
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from Enphase Production API: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch production energy data" });
  }
}