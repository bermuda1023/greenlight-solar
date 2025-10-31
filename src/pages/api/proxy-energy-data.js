import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { startTime, endTime, siteid, api_key } = req.query;

  // Validate required parameters
  if (!siteid || !api_key || !startTime || !endTime) {
    console.error("Missing required parameters:", { siteid, api_key, startTime, endTime });
    return res.status(400).json({
      error: "Missing required parameters",
      apiError: true,
      message: "siteid, api_key, startTime, and endTime are required"
    });
  }

  const url = `https://monitoringapi.solaredge.com/site/${siteid}/energyDetails?meters=PRODUCTION,FeedIn,SelfConsumption,Consumption&timeUnit=DAY&startTime=${encodeURIComponent(
    startTime
  )}&endTime=${encodeURIComponent(
    endTime
  )}&api_key=${api_key}`;

  console.log(`SolarEdge API request for site ${siteid}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SolarEdge API error for site ${siteid}:`, response.status, errorText);

      // Handle specific HTTP status codes
      if (response.status === 403) {
        return res.status(200).json({
          energyDetails: {
            timeUnit: "day",
            unit: "Wh",
            meters: [
              {
                type: "Consumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
              },
              {
                type: "FeedIn",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              },
              {
                type: "SelfConsumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
              },
              {
                type: "Production",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              }
            ]
          },
          message: `Invalid API key or access denied for site ${siteid}`,
          apiError: true,
          httpStatus: 403,
        });
      }

      if (response.status === 404) {
        return res.status(200).json({
          energyDetails: {
            timeUnit: "day",
            unit: "Wh",
            meters: [
              {
                type: "Consumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
              },
              {
                type: "FeedIn",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              },
              {
                type: "SelfConsumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
              },
              {
                type: "Production",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              }
            ]
          },
          message: `Site ${siteid} not found or no data available`,
          apiError: true,
          httpStatus: 404,
        });
      }

      if (response.status === 429) {
        return res.status(200).json({
          energyDetails: {
            timeUnit: "day",
            unit: "Wh",
            meters: [
              {
                type: "Consumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
              },
              {
                type: "FeedIn",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              },
              {
                type: "SelfConsumption",
                values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
              },
              {
                type: "Production",
                values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
              }
            ]
          },
          message: "SolarEdge API rate limit exceeded. Please try again later.",
          apiError: true,
          httpStatus: 429,
        });
      }

      // Generic error response with fallback data
      return res.status(200).json({
        energyDetails: {
          timeUnit: "day",
          unit: "Wh",
          meters: [
            {
              type: "Consumption",
              values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
            },
            {
              type: "FeedIn",
              values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
            },
            {
              type: "SelfConsumption",
              values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
            },
            {
              type: "Production",
              values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
            }
          ]
        },
        message: `SolarEdge API error: ${response.status} - ${errorText}`,
        apiError: true,
        httpStatus: response.status,
      });
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !data.energyDetails) {
      console.error(`Invalid response structure from SolarEdge for site ${siteid}`);
      return res.status(200).json({
        energyDetails: {
          timeUnit: "day",
          unit: "Wh",
          meters: [
            {
              type: "Consumption",
              values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
            },
            {
              type: "FeedIn",
              values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
            },
            {
              type: "SelfConsumption",
              values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
            },
            {
              type: "Production",
              values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
            }
          ]
        },
        message: "Invalid response structure from SolarEdge API",
        apiError: true,
      });
    }

    console.log(`Successfully retrieved data for SolarEdge site ${siteid}`);
    res.status(200).json(data);
  } catch (error) {
    console.error("SolarEdge proxy error:", error);

    // Return fallback data instead of failing completely
    res.status(200).json({
      energyDetails: {
        timeUnit: "day",
        unit: "Wh",
        meters: [
          {
            type: "Consumption",
            values: [{ date: new Date().toISOString().split('T')[0], value: 500000 }]
          },
          {
            type: "FeedIn",
            values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
          },
          {
            type: "SelfConsumption",
            values: [{ date: new Date().toISOString().split('T')[0], value: 0 }]
          },
          {
            type: "Production",
            values: [{ date: new Date().toISOString().split('T')[0], value: 50000 }]
          }
        ]
      },
      message: error.message || "Network error connecting to SolarEdge API",
      apiError: true,
      error: error.message,
    });
  }
}
