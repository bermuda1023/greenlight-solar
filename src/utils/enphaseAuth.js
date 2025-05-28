// utils/enphaseAuth.js
import axios from 'axios';

// Cache the access token and its expiration
let cachedToken = null;
let tokenExpiration = 0;

export async function getEnphaseAccessToken() {
  const currentTime = Date.now();
  
  // Return cached token if it's still valid (with 60 second buffer)
  if (cachedToken && tokenExpiration > currentTime + (60 * 1000)) {
    return cachedToken;
  }
  
  try {
    // Get a new token using client credentials flow
    const response = await axios.post(
      'https://api.enphaseenergy.com/oauth/token',
      new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': process.env.ENPHASE_CLIENT_ID,
        'client_secret': process.env.ENPHASE_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Cache the token and set expiration
    cachedToken = response.data.access_token;
    // Set expiration time (convert seconds to milliseconds)
    tokenExpiration = currentTime + (response.data.expires_in * 1000);
    
    return cachedToken;
  } catch (error) {
    console.error('Error getting Enphase access token:', error);
    throw new Error('Failed to authenticate with Enphase API');
  }
}