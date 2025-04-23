// src/pages/api/enphase-energy-data.js
import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase/browserClient";

export default async function handler(req, res) {
  console.log("Enphase API called with query params:", req.query);
  const { startTime, endTime, siteId, customerId } = req.query;

  try {
    if (!customerId) {
      throw new Error("Customer ID is required to fetch refresh token");
    }

    // Format dates for API calls
    const startDateFormatted = new Date(startTime).toISOString().split("T")[0]; // YYYY-MM-DD
    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000); // Unix timestamp
    console.log("Formatted dates:", { startDateFormatted, startTimestamp });

    // Get API key from environment variable
    const apiKey =
      process.env.ENPHASE_API_KEY || "96b76a5f1fb504d9139c1af7490741c2";
    const systemId = siteId || process.env.ENPHASE_SYSTEM_ID || "4201701";

    console.log("Using system ID:", systemId);

    // 1. Get refresh token from the customer database
    console.log("Fetching refresh token for customer ID:", customerId);
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("refresh_token")
      .eq("id", customerId)
      .single();

    if (customerError || !customerData || !customerData.refresh_token) {
      console.error("Customer data fetch error:", customerError);
      throw new Error(
        `Failed to get refresh token for customer: ${customerId}`,
      );
    }

    const refreshToken = customerData.refresh_token;
    console.log(
      "Found refresh token:",
      refreshToken ? "✓ Present" : "✗ Missing",
    );

    // 2. Get a fresh access token using the refresh token
    console.log("Getting fresh access token...");
    const tokenUrl = "https://api.enphaseenergy.com/oauth/token";
    const tokenParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization:
          "Basic YmE1MjI4ZTRmODQzYTk0NjA3ZTZjYzI0NTA0M2JjNTQ6YjAzZTUxZDhlM2I1MGM0OTc2OTk0NTgwM2Y2NWZiNzA=",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh error:", errorText);
      throw new Error(`Failed to refresh token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log(
      "Access token obtained with expiry:",
      tokenData.expires_in,
      "seconds",
    );

    // Extract the access token to use for subsequent API calls
    const accessToken = tokenData.access_token;

    // Store the new refresh token back in the database for future use
    const newRefreshToken = tokenData.refresh_token;
    if (newRefreshToken && newRefreshToken !== refreshToken) {
      console.log("Updating refresh token in database...");
      const { error: updateError } = await supabase
        .from("customers")
        .update({ refresh_token: newRefreshToken })
        .eq("id", customerId);

      if (updateError) {
        console.error("Failed to update refresh token:", updateError);
      } else {
        console.log("Refresh token updated successfully");
      }
    }

    // 3. Fetch Import Data using the fresh access token
    console.log("Fetching import data...");
    const importUrl = `https://api.enphaseenergy.com/api/v4/systems/${process.env.ENPHASE_SYSTEM_ID}/energy_import_telemetry?start_at=${startTimestamp}`;
    console.log("Import URL:", importUrl);

    const importResponse = await fetch(importUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Use the fresh access token
        key: apiKey,
        Accept: "application/json",
      },
    });

    console.log("Import API response status:", importResponse.status);
    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      console.error("Import API Error:", errorText);
      throw new Error(
        `Import API Error: ${importResponse.statusText} (${errorText})`,
      );
    }

    const importData = await importResponse.json();
    console.log("Import data structure:", {
      intervalsCount: importData?.intervals?.length || 0,
      hasNestedArray:
        Array.isArray(importData?.intervals) &&
        Array.isArray(importData?.intervals[0]),
    });

    // 4. Fetch Export Data with the fresh access token
    console.log("Fetching export data...");
    const exportUrl = `https://api.enphaseenergy.com/api/v4/systems/${process.env.ENPHASE_SYSTEM_ID}/energy_export_telemetry?start_date=${startDateFormatted}&granularity=day`;
    console.log("Export URL:", exportUrl);

    const exportResponse = await fetch(exportUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Use the fresh access token
        key: apiKey,
        Accept: "application/json",
      },
    });

    console.log("Export API response status:", exportResponse.status);
    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error("Export API Error:", errorText);
      throw new Error(
        `Export API Error: ${exportResponse.statusText} (${errorText})`,
      );
    }

    const exportData = await exportResponse.json();
    console.log("Export data structure:", {
      intervalsCount: exportData?.intervals?.length || 0,
      hasNestedArray:
        Array.isArray(exportData?.intervals) &&
        Array.isArray(exportData?.intervals[0]),
    });

    // 5. Fetch Production Data with the fresh access token
    console.log("Fetching production data...");
    const productionUrl = `https://api.enphaseenergy.com/api/v4/systems/${process.env.ENPHASE_SYSTEM_ID}/telemetry/production_meter?start_date=${startDateFormatted}&granularity=15mins&key=${apiKey}`;
    console.log("Production URL:", productionUrl);

    const productionResponse = await fetch(productionUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Use the fresh access token
        Accept: "application/json",
      },
    });

    console.log("Production API response status:", productionResponse.status);
    if (!productionResponse.ok) {
      const errorText = await productionResponse.text();
      console.error("Production API Error:", errorText);
      throw new Error(
        `Production API Error: ${productionResponse.statusText} (${errorText})`,
      );
    }

    const productionData = await productionResponse.json();
    console.log("Production data structure:", {
      intervalsCount: productionData?.intervals?.length || 0,
      sampleInterval: productionData?.intervals?.[0] || null,
    });

    // Calculate totals
    let totalImport = 0;
    let totalExport = 0;
    let totalProduction = 1;

    // Sum up import values - handle the nested array structure
    if (importData && importData.intervals && importData.intervals.length > 0) {
      // Check if intervals contains a nested array
      const importIntervals = Array.isArray(importData.intervals[0])
        ? importData.intervals[0]
        : importData.intervals;

      totalImport =
        importIntervals.reduce(
          (sum, interval) => sum + (interval.wh_imported || 0),
          0,
        ) / 1000; // Convert Wh to kWh

      console.log(`Summed ${importIntervals.length} import intervals`);
    }

    // Sum up export values - handle the nested array structure
    if (exportData && exportData.intervals && exportData.intervals.length > 0) {
      // Check if intervals contains a nested array
      const exportIntervals = Array.isArray(exportData.intervals[0])
        ? exportData.intervals[0]
        : exportData.intervals;

      totalExport =
        exportIntervals.reduce(
          (sum, interval) => sum + (interval.wh_exported || 0),
          0,
        ) / 1000; // Convert Wh to kWh

      console.log(`Summed ${exportIntervals.length} export intervals`);
    }

    // Sum up production values
    if (productionData && productionData.intervals) {
      totalProduction =
        productionData.intervals.reduce(
          (sum, interval) => sum + (interval.wh_del || 0),
          0,
        ) / 1000; // Convert Wh to kWh

      console.log(
        `Summed ${productionData.intervals.length} production intervals`,
      );
    }

    // Calculate consumption using the formula: Consumption = Import + Production - Export
    const totalConsumption = totalImport + totalProduction - totalExport;

    console.log("Calculated energy totals:", {
      totalImport,
      totalExport,
      totalProduction,
      totalConsumption,
    });

  

    // Then proceed with your response formatting...
    // Format the response to match the structure expected by BillModal
    const responseData = {
      energyDetails: {
        meters: [
          {
            type: "Consumption",
            values: [{ value: totalConsumption * 1000 }], // Convert back to Wh for consistency
          },
          {
            type: "FeedIn",
            values: [{ value: totalExport * 1000 }],
          },
          {
            type: "Production",
            values: [{ value: totalProduction * 1000 }],
          },
          {
            type: "SelfConsumption",
            values: [{ value: (totalProduction - totalExport) * 1000 }],
          },
        ],
      },
    };

    console.log(
      "Sending response data structure with meter types:",
      responseData.energyDetails.meters.map((m) => m.type),
    );

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Enphase API proxy error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch Enphase energy data" });
  }
}
