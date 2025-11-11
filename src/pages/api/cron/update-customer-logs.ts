import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EnergyDataError {
  errorType: 'API_ERROR' | 'ZERO_PRODUCTION' | 'NO_DATA' | 'INVALID_RESPONSE' | 'TOKEN_EXPIRED' | 'NETWORK_ERROR';
  errorMessage: string;
  httpStatus?: number;
}

interface EnergyDataResult {
  customerId: string;
  status: 'success' | 'failure';
  energyData?: {
    production: number;
    consumption: number;
    feedIn: number;
    selfConsumption: number;
  };
  error?: EnergyDataError;
  apiResponse?: any;
}

/**
 * Daily Cron Job to fetch energy data for all customers and update logs table
 * This should be called once per day (e.g., at midnight) via cron service
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the request is from a cron job (add your own auth mechanism)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[CRON] Starting daily customer logs update...');

    // Fetch all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*');

    if (customersError) {
      console.error('[CRON] Error fetching customers:', customersError);
      throw customersError;
    }

    console.log(`[CRON] Found ${customers?.length || 0} customers to process`);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format dates for API calls (yesterday's data)
    const startDate = yesterday.toISOString().split('T')[0] + ' 00:00:00';
    const endDate = yesterday.toISOString().split('T')[0] + ' 23:59:59';

    const results: EnergyDataResult[] = [];

    // Process each customer
    for (const customer of customers || []) {
      console.log(`[CRON] Processing customer: ${customer.site_name} (${customer.id})`);

      const result = await fetchEnergyDataForCustomer(
        customer,
        startDate,
        endDate
      );

      results.push(result);

      // Insert log entry
      await insertLogEntry(customer.id, result, yesterday);

      // Update customer status
      await updateCustomerStatus(customer.id, result.status);
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failure').length;

    console.log(`[CRON] Completed: ${successCount} success, ${failureCount} failures`);

    return res.status(200).json({
      success: true,
      message: 'Customer logs updated successfully',
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    });

  } catch (error) {
    console.error('[CRON] Error in update-customer-logs:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function fetchEnergyDataForCustomer(
  customer: any,
  startDate: string,
  endDate: string
): Promise<EnergyDataResult> {
  try {
    let apiUrl: string;
    let response: Response;

    // Determine which API to use
    if (customer.refresh_token) {
      // Enphase customer
      apiUrl = `/api/enphase-energy-data?startTime=${encodeURIComponent(
        startDate
      )}&endTime=${encodeURIComponent(
        endDate
      )}&siteId=${customer.site_ID}&customerId=${customer.id}`;
    } else {
      // SolarEdge customer
      apiUrl = `/api/proxy-energy-data?startTime=${encodeURIComponent(
        startDate
      )}&endTime=${encodeURIComponent(
        endDate
      )}&siteid=${customer.site_ID}&api_key=${customer.solar_api_key}`;
    }

    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.greenlightenergy.bm'}${apiUrl}`;
    response = await fetch(fullUrl);

    const apiResponse = await response.json();

    if (!response.ok) {
      return {
        customerId: customer.id,
        status: 'failure',
        error: {
          errorType: 'API_ERROR',
          errorMessage: `HTTP ${response.status}: ${apiResponse.message || 'API request failed'}`,
          httpStatus: response.status,
        },
        apiResponse,
      };
    }

    // Check for token expiration
    if (apiResponse.tokenExpired) {
      return {
        customerId: customer.id,
        status: 'failure',
        error: {
          errorType: 'TOKEN_EXPIRED',
          errorMessage: apiResponse.message || 'Authorization expired',
        },
        apiResponse,
      };
    }

    // Check for API errors
    if (apiResponse.apiError) {
      return {
        customerId: customer.id,
        status: 'failure',
        error: {
          errorType: 'API_ERROR',
          errorMessage: apiResponse.message || apiResponse.error || 'API error',
        },
        apiResponse,
      };
    }

    // Validate response structure
    if (!apiResponse.energyDetails || !Array.isArray(apiResponse.energyDetails.meters)) {
      return {
        customerId: customer.id,
        status: 'failure',
        error: {
          errorType: 'INVALID_RESPONSE',
          errorMessage: 'Invalid energy data structure',
        },
        apiResponse,
      };
    }

    // Calculate energy sums
    const energyData = {
      production: 0,
      consumption: 0,
      feedIn: 0,
      selfConsumption: 0,
    };

    apiResponse.energyDetails.meters.forEach((meter: any) => {
      if (!meter.type || !Array.isArray(meter.values)) return;

      const meterValue = meter.values.reduce((sum: number, value: any) => {
        const numValue = parseFloat(value?.value || 0);
        return sum + (isNaN(numValue) ? 0 : numValue);
      }, 0) / 1000; // Convert to kWh

      if (meter.type === 'Consumption') energyData.consumption = meterValue;
      else if (meter.type === 'FeedIn') energyData.feedIn = meterValue;
      else if (meter.type === 'Production') energyData.production = meterValue;
      else if (meter.type === 'SelfConsumption') energyData.selfConsumption = meterValue;
    });

    // Check for zero production
    if (energyData.production === 0) {
      return {
        customerId: customer.id,
        status: 'failure',
        error: {
          errorType: 'ZERO_PRODUCTION',
          errorMessage: 'No solar production detected',
        },
        energyData,
        apiResponse,
      };
    }

    return {
      customerId: customer.id,
      status: 'success',
      energyData,
      apiResponse,
    };

  } catch (error) {
    console.error(`[CRON] Error fetching data for customer ${customer.id}:`, error);
    return {
      customerId: customer.id,
      status: 'failure',
      error: {
        errorType: 'NETWORK_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

async function insertLogEntry(
  customerId: string,
  result: EnergyDataResult,
  logDate: Date
) {
  try {
    const logEntry = {
      customer_id: customerId,
      log_date: logDate.toISOString().split('T')[0],
      status: result.status,
      error_type: result.error?.errorType || null,
      error_message: result.error?.errorMessage || null,
      api_response: result.apiResponse || null,
      production_kwh: result.energyData?.production || null,
      consumption_kwh: result.energyData?.consumption || null,
      feed_in_kwh: result.energyData?.feedIn || null,
      self_consumption_kwh: result.energyData?.selfConsumption || null,
      http_status_code: result.error?.httpStatus || null,
    };

    const { error } = await supabase
      .from('logs')
      .upsert(logEntry, {
        onConflict: 'customer_id,log_date',
      });

    if (error) {
      console.error(`[CRON] Error inserting log for customer ${customerId}:`, error);
      throw error;
    }

    console.log(`[CRON] Log entry created for customer ${customerId}`);
  } catch (error) {
    console.error(`[CRON] Failed to insert log entry:`, error);
    throw error;
  }
}

async function updateCustomerStatus(customerId: string, status: 'success' | 'failure') {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ status })
      .eq('id', customerId);

    if (error) {
      console.error(`[CRON] Error updating customer status for ${customerId}:`, error);
      throw error;
    }

    console.log(`[CRON] Customer ${customerId} status updated to: ${status}`);
  } catch (error) {
    console.error(`[CRON] Failed to update customer status:`, error);
    throw error;
  }
}
