const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // This endpoint is simply for checking if the user's session is valid
  // and returning basic user info
  
  // Handle OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Extract token from Authorization header
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      authenticated: false,
      error: 'No authentication token provided'
    });
  }
  
  try {
    // Verify the token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({
        authenticated: false,
        error: error.message
      });
    }
    
    // Return basic user info
    return res.status(200).json({
      authenticated: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata
      }
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    
    return res.status(500).json({
      authenticated: false,
      error: 'Failed to verify authentication'
    });
  }
}; 