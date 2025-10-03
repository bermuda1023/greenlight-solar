// src/pages/api/enphase/monitor-tokens.js
import { enphaseTokenService } from "@/services/enphase-token-service";

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Starting Enphase token monitoring...");

    // Get customers needing token refresh
    const checkResult = await enphaseTokenService.getCustomersNeedingTokenRefresh();
    
    if (!checkResult.success) {
      return res.status(500).json({ 
        error: 'Failed to check customer tokens',
        details: checkResult.error 
      });
    }

    const customersNeedingRefresh = checkResult.customers;
    console.log(`Found ${customersNeedingRefresh.length} customers needing token refresh`);

    const results = {
      total: customersNeedingRefresh.length,
      expired: 0,
      expiringSoon: 0,
      refreshAttempts: 0,
      refreshSuccessful: 0,
      refreshFailed: 0,
      customers: []
    };

    // Process each customer
    for (const customer of customersNeedingRefresh) {
      const customerResult = {
        id: customer.id,
        siteName: customer.site_name,
        email: customer.email,
        status: customer.authorization_status,
        tokenExpiresAt: customer.token_expires_at,
        action: 'none',
        success: false,
        message: ''
      };

      // Check if token is expired or expiring soon
      const now = new Date();
      const expiryDate = customer.token_expires_at ? new Date(customer.token_expires_at) : null;
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
