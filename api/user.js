const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Check for authentication
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verify the token and get user
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Retrieve user preferences
        const { data: preferences, error: fetchError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
          return res.status(500).json({ error: fetchError.message });
        }
        
        return res.status(200).json({ preferences: preferences || {} });
        
      case 'POST':
        // Create or update user preferences
        const updates = req.body;
        
        if (!updates) {
          return res.status(400).json({ error: 'No data provided' });
        }
        
        // Add user_id to the data
        updates.user_id = user.id;
        updates.updated_at = new Date();
        
        const { data: updatedData, error: updateError } = await supabase
          .from('user_preferences')
          .upsert(updates, { onConflict: 'user_id' })
          .select();
        
        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }
        
        return res.status(200).json({ 
          message: 'Preferences updated successfully',
          data: updatedData
        });
      
      case 'OPTIONS':
        // Handle preflight request
        return res.status(200).end();
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in user API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 