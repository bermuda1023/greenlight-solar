import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { startTime, endTime } = req.query;

  const url = `https://monitoringapi.solaredge.com/site/1443762/energyDetails?meters=PRODUCTION,FeedIn,SelfConsumption,Consumption&timeUnit=DAY&startTime=${encodeURIComponent(
    startTime
  )}&endTime=${encodeURIComponent(
    endTime
  )}&api_key=58XJQCW9CJ28N9CZQ99XSAN1YC4ND6F3`;

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
