// src/pages/api/enphase-energy-data.js
import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase/browserClient";
import { enphaseTokenService } from "@/services/enphase-token-service";

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

    // 2. Get a fresh access token using the refresh token service
    console.log("Getting fresh access token using token service...");
    const refreshResult = await enphaseTokenService.refreshAccessToken(refreshToken);

    if (!refreshResult.success) {
      console.error("Token refresh failed:", refreshResult.error);
      
      // Check if the refresh token needs reauthorization
      if (refreshResult.needsReauthorization) {
        console.log("Refresh token expired, marking customer for re-authorization...");
        
        // Mark customer for reauthorization using the service
        await enphaseTokenService.markCustomerForReauthorization(customerId, refreshResult.error);
        
        // Return fallback data instead of throwing an error
        console.log("Returning fallback energy data due to expired token...");
        return res.status(200).json({
          energyDetails: {
            timeUnit: "day",
            unit: "Wh",
            meters: [
              {
                type: "Consumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }] // 500 kWh fallback
              },
              {
                type: "FeedIn",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }] // 50 kWh fallback
              },
              {
                type: "SelfConsumption", 
                values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
              },
              {
                type: "Production",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }] // 50 kWh fallback
              }
            ]
          },
          message: "Token expired - using fallback data. Customer needs re-authorization.",
          tokenExpired: true,
          customerId: customerId
        });
      }
      
      throw new Error(`Failed to refresh token: ${refreshResult.error}`);
    }

    console.log("Access token obtained with expiry:", refreshResult.expiresIn, "seconds");

    // Extract the access token to use for subsequent API calls
    const accessToken = refreshResult.accessToken;

    // Update customer record with new token data
    if (refreshResult.refreshToken && refreshResult.refreshToken !== refreshToken) {
      console.log("Updating refresh token in database...");
      const updateResult = await enphaseTokenService.updateCustomerToken(customerId, refreshResult);
      
      if (!updateResult.success) {
        console.error("Failed to update refresh token:", updateResult.error);
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

    // Replace the existing production data fetch (lines 161-189) with this code:

    // 5. Fetch Production Data using energy_lifetime API
    console.log("Fetching production data using energy_lifetime API...");
    const endDateFormatted = new Date(endTime || new Date())
      .toISOString()
      .split("T")[0]; // Format end date
    const productionUrl = `https://api.enphaseenergy.com/api/v4/systems/${process.env.ENPHASE_SYSTEM_ID}/energy_lifetime?start_date=${startDateFormatted}&end_date=${endDateFormatted}&key=${apiKey}`;
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

    const lifetimeData = await productionResponse.json();
    console.log("Energy lifetime data received:", {
      daysCount: lifetimeData?.production?.length || 0,
      startDate: lifetimeData?.start_date,
      systemId: lifetimeData?.system_id,
    });

    // Calculate totals
    let totalImport = 0;
    let totalExport = 0;
    let totalProduction = 1;

    // Sum all production values in the array (they're already in Wh)
    const totalProductionWh = lifetimeData.production.reduce(
      (sum, dayValue) => sum + dayValue,
      0,
    );
    totalProduction = totalProductionWh / 1000; // Convert Wh to kWh for consistency with other metrics

    console.log(
      "Total production calculated from energy_lifetime:",
      totalProduction,
      "kWh",
      `(${totalProductionWh} Wh from ${lifetimeData.production.length} days)`,
    );

    // We don't need to create intervals since we're just using the total
    // but for consistency with the rest of your code, maintain the productionData variable
    const productionData = {
      intervals: [{ wh_del: totalProductionWh }],
    };

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
    
    // Provide fallback data instead of failing completely
    console.log("Providing fallback energy data due to API error...");
    
    const fallbackData = {
      energyDetails: {
        timeUnit: "day",
        unit: "Wh",
        meters: [
          {
            type: "Consumption",
            values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }] // 500 kWh fallback
          },
          {
            type: "FeedIn",
            values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }] // 50 kWh fallback
          },
          {
            type: "SelfConsumption", 
            values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
          },
          {
            type: "Production",
            values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }] // 50 kWh fallback
          }
        ]
      },
      message: "API error - using fallback data. Please check Enphase authorization.",
      apiError: true,
      error: error.message,
      customerId: req.query.customerId
    };
    
    res.status(200).json(fallbackData);
  }
}
