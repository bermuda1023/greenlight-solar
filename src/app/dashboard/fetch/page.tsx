"use client";

import { useEffect, useState } from "react";

const EnergyDataFetcher = () => {
  const [energyData, setEnergyData] = useState(null);
  const [error] = useState(null);

  useEffect(() => {
    const fetchEnergyData = async () => {
      const proxyUrl = `/api/proxy-energy-data?startTime=2024-12-16%2000:00:00&endTime=2025-01-15%2000:00:00`;

      try {
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setEnergyData(data);
        console.log("Energy Data Response:", data);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Error fetching energy data:", err.message);
        } else {
          console.error("Unknown error occurred:", err);
        }
      }
    };

    fetchEnergyData();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Energy Data Fetcher</h1>
      {error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : energyData ? (
        <pre>{JSON.stringify(energyData, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default EnergyDataFetcher;
