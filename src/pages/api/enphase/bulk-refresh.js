// src/pages/api/enphase/bulk-refresh.js
import { enphaseTokenService } from "@/services/enphase-token-service";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerIds, action = 'refresh' } = req.body;

  if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ error: 'Customer IDs array is required' });
  }

  try {
    let results = [];

    if (action === 'refresh') {
      console.log(`Bulk refreshing tokens for ${customerIds.length} customers`);
      results = await enphaseTokenService.bulkRefreshTokens(customerIds);
    } else if (action === 'check') {
      console.log(`Checking token status for ${customerIds.length} customers`);
      
      // Get customers needing refresh
      const checkResult = await enphaseTokenService.getCustomersNeedingTokenRefresh();
      
      if (checkResult.success) {
        const needingRefresh = checkResult.customers.filter(c => customerIds.includes(c.id));
        results = needingRefresh.map(customer => ({
          customerId: customer.id,
          siteName: customer.site_name,
          status: customer.authorization_status || 'needs_refresh',
          tokenExpiresAt: customer.token_expires_at,
          needsAction: true
        }));
      }
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "refresh" or "check"' });
    }

    const summary = {
      total: customerIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      needsReauthorization: results.filter(r => r.error && (r.error.includes('expired') || r.error.includes('invalid_token'))).length
    };

    console.log(`Bulk ${action} completed:`, summary);

    res.status(200).json({
      success: true,
      action,
      summary,
      results
    });

  } catch (error) {
    console.error('Error in bulk token refresh endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
