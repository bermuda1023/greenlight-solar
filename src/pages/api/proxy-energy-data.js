import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { startTime, endTime,siteid,api_key } = req.query;

  const url = `https://monitoringapi.solaredge.com/site/${siteid}/energyDetails?meters=PRODUCTION,FeedIn,SelfConsumption,Consumption&timeUnit=DAY&startTime=${encodeURIComponent(
    startTime
  )}&endTime=${encodeURIComponent(
    endTime
  )}&api_key=${api_key}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from SolarEdge API: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch energy data" });
  }
}
