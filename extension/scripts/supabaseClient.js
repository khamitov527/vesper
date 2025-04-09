// Import Supabase JS from CDN in the extension's popup.html
// This file will initialize the client for use across the extension

const initSupabaseClient = () => {
  // Get the Supabase URL and anon key from environment variables or constants
  const supabaseUrl = chrome.runtime.getURL('supabase_url');
  const supabaseAnonKey = chrome.runtime.getURL('supabase_anon_key');

  // Initialize the Supabase client
  const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
  
  return supabase;
};

// Handle Google OAuth login
const signInWithGoogle = async () => {
  try {
    // Get the extension's ID for constructing the redirect URL
    const extensionId = chrome.runtime.id;
    const redirectUrl = `chrome-extension://${extensionId}/popup/auth-callback.html`;
    
    // Start the OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Specify required scopes for Gmail API access if needed
        scopes: 'email profile'
      }
    });
    
    if (error) {
      console.error('Error signing in with Google:', error.message);
      return { success: false, error: error.message };
    }
    
    // Open the provider's login page in a new tab
    chrome.tabs.create({ url: data.url });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to initiate Google sign-in:', error);
    return { success: false, error: error.message };
  }
};

// Handle session persistence
const persistSession = async (session) => {
  try {
    await chrome.storage.local.set({ 
      'supabase_session': session 
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to persist session:', error);
    return { success: false, error: error.message };
  }
};

// Get the saved session
const getPersistedSession = async () => {
  try {
    const result = await chrome.storage.local.get(['supabase_session']);
    return result.supabase_session;
  } catch (error) {
    console.error('Failed to get persisted session:', error);
    return null;
  }
};

// Check if user is authenticated and refresh token if needed
const getAuthenticatedUser = async () => {
  try {
    const session = await getPersistedSession();
    
    if (!session) {
      return { user: null };
    }
    
    // Initialize Supabase client
    const supabase = initSupabaseClient();
    
    // Set the session
    supabase.auth.setSession(session);
    
    // Check if the user is still authenticated
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error.message);
      return { user: null, error };
    }
    
    return { user: data.user };
  } catch (error) {
    console.error('Failed to get authenticated user:', error);
    return { user: null, error };
  }
};

// Sign out
const signOut = async () => {
  try {
    const supabase = initSupabaseClient();
    await supabase.auth.signOut();
    await chrome.storage.local.remove(['supabase_session']);
    return { success: true };
  } catch (error) {
    console.error('Failed to sign out:', error);
    return { success: false, error: error.message };
  }
};

// Export the functions
export {
  initSupabaseClient,
  signInWithGoogle,
  persistSession,
  getPersistedSession,
  getAuthenticatedUser,
  signOut
}; 