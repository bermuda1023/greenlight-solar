// src/pages/api/enphase/monitor-tokens.js
import { enphaseTokenService } from "@/services/enphase-token-service";
import { createClient } from '@supabase/supabase-js';

// Use server-side Supabase for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Starting Enphase token monitoring...");

    // Get customers needing token refresh - use server-side query
    const soonExpiry = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString();
    const { data: customersNeedingRefresh, error } = await supabase
      .from("customers")
      .select("id, site_name, email, refresh_token, token_expired_at, authorization_status")
      .or(`authorization_status.eq.ENPHASE_AUTHORIZATION_EXPIRED,token_expired_at.lt.${soonExpiry}`)
      .not("refresh_token", "is", null);

    if (error) {
      return res.status(500).json({
        error: 'Failed to check customer tokens',
        details: error.message
      });
    }

    console.log(`Found ${customersNeedingRefresh?.length || 0} customers needing token refresh`);

    const results = {
      total: customersNeedingRefresh?.length || 0,
      expired: 0,
      expiringSoon: 0,
      refreshAttempts: 0,
      refreshSuccessful: 0,
      refreshFailed: 0,
      customers: []
    };

    // Process each customer
    for (const customer of customersNeedingRefresh || []) {
      const customerResult = {
        id: customer.id,
        siteName: customer.site_name,
        email: customer.email,
        status: customer.authorization_status,
        tokenExpiresAt: customer.token_expired_at,
        action: 'none',
        success: false,
        message: ''
      };

      // Check if token is expired or expiring soon
      const now = new Date();
      const expiryDate = customer.token_expired_at ? new Date(customer.token_expired_at) : null;
      const isExpired = customer.authorization_status === "ENPHASE_AUTHORIZATION_EXPIRED";
      const isExpiringSoon = expiryDate && expiryDate < new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (isExpired) {
        results.expired++;
        customerResult.action = 'needs_reauthorization';
        customerResult.message = 'Token expired - manual reauthorization required';
      } else if (isExpiringSoon && customer.refresh_token) {
        results.expiringSoon++;
        
        // Attempt automatic refresh for expiring tokens
        if (req.method === 'POST') {
          console.log(`Attempting to refresh token for ${customer.site_name}...`);
          results.refreshAttempts++;
          
          const refreshResult = await enphaseTokenService.refreshCustomerToken(customer.id);
          
          if (refreshResult.success) {
            results.refreshSuccessful++;
            customerResult.action = 'refreshed';
            customerResult.success = true;
            customerResult.message = 'Token refreshed successfully';
          } else {
            results.refreshFailed++;
            customerResult.action = 'refresh_failed';
            customerResult.message = refreshResult.error;
          }
        } else {
          customerResult.action = 'needs_refresh';
          customerResult.message = 'Token expiring soon - refresh recommended';
        }
      }

      results.customers.push(customerResult);
    }

    const summary = {
      timestamp: new Date().toISOString(),
      action: req.method === 'POST' ? 'monitor_and_refresh' : 'monitor_only',
      ...results
    };

    console.log("Token monitoring completed:", {
      total: results.total,
      expired: results.expired,
      expiringSoon: results.expiringSoon,
      refreshAttempts: results.refreshAttempts,
      refreshSuccessful: results.refreshSuccessful,
      refreshFailed: results.refreshFailed
    });

    res.status(200).json({
      success: true,
      summary,
      customers: results.customers
    });

  } catch (error) {
    console.error('Error in token monitoring:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Export configuration for potential cron job usage
export const config = {
  api: {
    externalResolver: true,
  },
};
