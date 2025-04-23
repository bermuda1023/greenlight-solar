import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { start_date, granularity, authorization, site_id, api_key } =
    req.query;

  const url = `https://api.enphaseenergy.com/api/v4/systems/${site_id}/energy_export_telemetry?start_date=${encodeURIComponent(start_date)}&granularity=${granularity || "day"}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authorization}`,
        key: api_key,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from Enphase Export API: ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch export energy data" });
  }
}
