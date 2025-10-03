// src/services/enphase-token-service.js
import { supabase } from "@/utils/supabase/browserClient";

export class EnphaseTokenService {
  constructor() {
    this.clientId = "ba5228e4f843a94607e6cc245043bc54";
    this.clientSecret = "b03e51d8e3b50c497699458003f65b70";
    this.redirectUri = "https://api.enphaseenergy.com/oauth/redirect_uri";
    this.authUrl = "https://api.enphaseenergy.com/oauth/authorize";
    this.tokenUrl = "https://api.enphaseenergy.com/oauth/token";
    this.basicAuth = "Basic YmE1MjI4ZTRmODQzYTk0NjA3ZTZjYzI0NTA0M2JjNTQ6YjAzZTUxZDhlM2I1MGM0OTc2OTk0NTgwM2Y2NWZiNzA=";
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      console.log("Attempting to refresh Enphase access token...");
      
      const tokenParams = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          Authorization: this.basicAuth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token refresh failed:", errorText);
        
        // Parse error response
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: "unknown_error", error_description: errorText };
        }
        
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`);
      }

      const tokenData = await response.json();
      console.log("Token refresh successful, expires in:", tokenData.expires_in, "seconds");
      
      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      };
    } catch (error) {
      console.error("Error refreshing token:", error);
      return {
        success: false,
        error: error.message,
        needsReauthorization: error.message.includes("expired") || error.message.includes("invalid_token")
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeAuthorizationCode(authorizationCode) {
    try {
      console.log("Exchanging authorization code for tokens...");
      
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: this.redirectUri,
      });

      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          Authorization: this.basicAuth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Authorization code exchange failed:", errorText);
        throw new Error(`Failed to exchange authorization code: ${response.statusText}`);
      }

      const tokenData = await response.json();
      console.log("Authorization code exchange successful");
      
      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      };
    } catch (error) {
      console.error("Error exchanging authorization code:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update customer token in database
   */
  async updateCustomerToken(customerId, tokenData, authorizationCode = null) {
    try {
      const updateData = {
        refresh_token: tokenData.refreshToken,
        authorization_status: null, // Clear any expired status
        verification: true,
        token_expires_at: tokenData.expiresAt?.toISOString(),
        last_token_refresh: new Date().toISOString()
      };

      if (authorizationCode) {
        updateData.authorization_code = authorizationCode;
      }

      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customerId);

      if (error) {
        console.error("Failed to update customer token:", error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      console.log(`Successfully updated token for customer ${customerId}`);
      return { success: true };
    } catch (error) {
      console.error("Error updating customer token:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark customer as needing reauthorization
   */
  async markCustomerForReauthorization(customerId, reason = "Token expired") {
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          refresh_token: null,
          authorization_status: "ENPHASE_AUTHORIZATION_EXPIRED",
          token_expired_at: new Date().toISOString(),
          token_expiry_reason: reason
        })
        .eq("id", customerId);

      if (error) {
        console.error("Failed to mark customer for reauthorization:", error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      console.log(`Marked customer ${customerId} for reauthorization: ${reason}`);
      return { success: true };
    } catch (error) {
      console.error("Error marking customer for reauthorization:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customers with expired or expiring tokens
   */
  async getCustomersNeedingTokenRefresh() {
    try {
      const now = new Date().toISOString();
      const soonExpiry = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(); // 24 hours from now

      const { data, error } = await supabase
        .from("customers")
        .select("id, site_name, email, refresh_token, token_expires_at, authorization_status")
        .or(`authorization_status.eq.ENPHASE_AUTHORIZATION_EXPIRED,token_expires_at.lt.${soonExpiry}`)
        .not("refresh_token", "is", null);

      if (error) {
        console.error("Failed to fetch customers needing token refresh:", error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        success: true,
        customers: data || []
      };
    } catch (error) {
      console.error("Error getting customers needing token refresh:", error);
      return {
        success: false,
        error: error.message,
        customers: []
      };
    }
  }

  /**
   * Refresh token for a specific customer
   */
  async refreshCustomerToken(customerId) {
    try {
      // Get customer's current refresh token
      const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("refresh_token, site_name")
        .eq("id", customerId)
        .single();

      if (fetchError || !customer) {
        throw new Error(`Failed to fetch customer: ${fetchError?.message || "Customer not found"}`);
      }

      if (!customer.refresh_token) {
        throw new Error("Customer has no refresh token - needs reauthorization");
      }

      // Attempt to refresh the token
      const refreshResult = await this.refreshAccessToken(customer.refresh_token);
      
      if (!refreshResult.success) {
        if (refreshResult.needsReauthorization) {
          // Mark customer for reauthorization
          await this.markCustomerForReauthorization(customerId, refreshResult.error);
        }
        throw new Error(refreshResult.error);
      }

      // Update customer record with new token
      const updateResult = await this.updateCustomerToken(customerId, refreshResult);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        message: `Token refreshed successfully for ${customer.site_name}`,
        expiresAt: refreshResult.expiresAt
      };
    } catch (error) {
      console.error(`Error refreshing token for customer ${customerId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate authorization URL for customer
   */
  generateAuthorizationUrl(customerId) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: customerId // Use customer ID as state parameter
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Bulk refresh tokens for multiple customers
   */
  async bulkRefreshTokens(customerIds) {
    const results = [];
    
    for (const customerId of customerIds) {
      const result = await this.refreshCustomerToken(customerId);
      results.push({
        customerId,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

// Export singleton instance
export const enphaseTokenService = new EnphaseTokenService();
