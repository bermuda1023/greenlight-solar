// src/pages/api/enphase/refresh-token.js
import { enphaseTokenService } from "@/services/enphase-token-service";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId, authorizationCode } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  try {
    let result;

    if (authorizationCode) {
      // Exchange authorization code for new tokens
      console.log(`Exchanging authorization code for customer ${customerId}`);
      
      const exchangeResult = await enphaseTokenService.exchangeAuthorizationCode(authorizationCode);
      
      if (!exchangeResult.success) {
        return res.status(400).json({ 
          error: 'Failed to exchange authorization code',
          details: exchangeResult.error 
        });
      }

      // Update customer record with new tokens
      const updateResult = await enphaseTokenService.updateCustomerToken(
        customerId, 
        exchangeResult, 
        authorizationCode
      );

      if (!updateResult.success) {
        return res.status(500).json({ 
          error: 'Failed to update customer record',
          details: updateResult.error 
        });
      }

      result = {
        success: true,
        message: 'Authorization code exchanged and customer updated successfully',
        method: 'authorization_code',
        expiresAt: exchangeResult.expiresAt
      };
    } else {
      // Try to refresh existing token
      console.log(`Refreshing existing token for customer ${customerId}`);
      
      result = await enphaseTokenService.refreshCustomerToken(customerId);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Failed to refresh token',
          details: result.error,
          needsReauthorization: result.error.includes('expired') || result.error.includes('invalid_token')
        });
      }

      result.method = 'refresh_token';
    }

    console.log(`Token refresh successful for customer ${customerId}`);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in token refresh endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
