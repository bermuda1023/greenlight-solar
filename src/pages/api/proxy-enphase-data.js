// pages/api/proxy-enphase-data.js
export default async function handler(req, res) {
    // Get query parameters
    const { system_id, start_date, end_date, api_key, user_id } = req.query;
  
    if (!system_id || !start_date || !end_date || !api_key || !user_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
  
    try {
      // Create the authorization header for Enphase API
      const authHeader = `Bearer ${api_key}`;
      
      // Construct Enphase API URL for energy production
      const enphaseUrl = `${process.env.ENPHASE_API_URL}/systems/${system_id}/energy_lifetime?start_date=${start_date}&end_date=${end_date}&user_id=${user_id}`;
      
      // Make request to Enphase API
      const response = await fetch(enphaseUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Enphase API error:', errorText);
        return res.status(response.status).json({ error: `Enphase API error: ${response.status}` });
      }
  
      // Get the JSON response from Enphase
      const data = await response.json();
      
      // Return the data
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching Enphase data:', error);
      return res.status(500).json({ error: 'Error fetching Enphase data' });
    }
  }