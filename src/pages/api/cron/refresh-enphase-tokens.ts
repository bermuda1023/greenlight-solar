import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { EnphaseTokenService } from '@/services/enphase-token-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const enphaseTokenService = new EnphaseTokenService();

/**
 * Cron Job to automatically refresh Enphase OAuth tokens
 * This runs every 6 hours to ensure tokens are refreshed before expiration
 * Prevents billing issues by maintaining valid tokens for all Enphase customers
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the request is from a cron job
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[CRON-TOKEN] Starting automatic Enphase token refresh...');

    // Fetch all Enphase customers (those with refresh_token)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, site_name, email, refresh_token, token_expired_at, authorization_status')
      .not('refresh_token', 'is', null);

    if (customersError) {
      console.error('[CRON-TOKEN] Error fetching customers:', customersError);
      throw customersError;
    }

    console.log(`[CRON-TOKEN] Found ${customers?.length || 0} Enphase customers`);

    const results = {
      total: customers?.length || 0,
      checked: 0,
      skipped: 0,
      refreshed: 0,
      failed: 0,
      needsReauth: 0,
      details: [] as any[]
    };

    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now

    // Process each Enphase customer
    for (const customer of customers || []) {
      results.checked++;

      const customerResult = {
        id: customer.id,
        siteName: customer.site_name,
        email: customer.email,
        tokenExpiresAt: customer.token_expired_at,
        action: 'none' as string,
        success: false,
        message: ''
      };

      try {
        // Check if token needs refresh
        const tokenExpiresAt = customer.token_expired_at ? new Date(customer.token_expired_at) : null;
        const isExpired = customer.authorization_status === 'ENPHASE_AUTHORIZATION_EXPIRED';
        const isExpiringSoon = tokenExpiresAt && tokenExpiresAt < refreshThreshold;

        if (isExpired) {
          console.log(`[CRON-TOKEN] Customer ${customer.site_name} is marked as expired`);
          customerResult.action = 'needs_reauthorization';
          customerResult.message = 'Token expired - manual reauthorization required';
          results.needsReauth++;
        } else if (!tokenExpiresAt) {
          console.log(`[CRON-TOKEN] Customer ${customer.site_name} has no expiry date, attempting refresh...`);

          const refreshResult = await enphaseTokenService.refreshCustomerToken(customer.id);

          if (refreshResult.success) {
            results.refreshed++;
            customerResult.action = 'refreshed';
            customerResult.success = true;
            customerResult.message = 'Token refreshed successfully';
            console.log(`[CRON-TOKEN] ✓ Refreshed token for ${customer.site_name}`);
          } else {
            results.failed++;
            customerResult.action = 'refresh_failed';
            customerResult.message = refreshResult.error || 'Unknown error';
            console.error(`[CRON-TOKEN] ✗ Failed to refresh token for ${customer.site_name}: ${refreshResult.error}`);

            if (refreshResult.error?.includes('expired') || refreshResult.error?.includes('invalid')) {
              results.needsReauth++;
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (isExpiringSoon) {
          console.log(`[CRON-TOKEN] Token for ${customer.site_name} expires soon (${tokenExpiresAt.toISOString()}), refreshing...`);

          const refreshResult = await enphaseTokenService.refreshCustomerToken(customer.id);

          if (refreshResult.success) {
            results.refreshed++;
            customerResult.action = 'refreshed';
            customerResult.success = true;
            customerResult.message = `Token refreshed successfully (was expiring ${tokenExpiresAt.toISOString()})`;
            console.log(`[CRON-TOKEN] ✓ Refreshed expiring token for ${customer.site_name}`);
          } else {
            results.failed++;
            customerResult.action = 'refresh_failed';
            customerResult.message = refreshResult.error || 'Unknown error';
            console.error(`[CRON-TOKEN] ✗ Failed to refresh expiring token for ${customer.site_name}: ${refreshResult.error}`);

            if (refreshResult.error?.includes('expired') || refreshResult.error?.includes('invalid')) {
              results.needsReauth++;
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`[CRON-TOKEN] Token for ${customer.site_name} is still valid (expires ${tokenExpiresAt.toISOString()})`);
          customerResult.action = 'skipped';
          customerResult.message = `Token valid until ${tokenExpiresAt.toISOString()}`;
          results.skipped++;
        }
      } catch (error) {
        console.error(`[CRON-TOKEN] Error processing ${customer.site_name}:`, error);
        results.failed++;
        customerResult.action = 'error';
        customerResult.message = error instanceof Error ? error.message : 'Unknown error';
      }

      results.details.push(customerResult);
    }

    console.log('[CRON-TOKEN] Token refresh completed:', {
      total: results.total,
      checked: results.checked,
      skipped: results.skipped,
      refreshed: results.refreshed,
      failed: results.failed,
      needsReauth: results.needsReauth
    });

    return res.status(200).json({
      success: true,
      message: 'Enphase token refresh completed',
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        checked: results.checked,
        skipped: results.skipped,
        refreshed: results.refreshed,
        failed: results.failed,
        needsReauth: results.needsReauth
      },
      details: results.details
    });

  } catch (error) {
    console.error('[CRON-TOKEN] Error in refresh-enphase-tokens:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
