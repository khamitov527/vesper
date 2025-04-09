const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // This endpoint handles the token exchange after Google OAuth
    try {
      const { code, redirectUrl } = req.body;
      
      // Exchange the OAuth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ 
        session: data.session,
        user: data.user
      });
    } catch (error) {
      return res.status(500).json({ error: 'Authentication failed' });
    }
  } else if (req.method === 'GET') {
    // This is for session validation
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      return res.status(200).json({ user: data.user });
    } catch (error) {
      return res.status(500).json({ error: 'Session validation failed' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}; 