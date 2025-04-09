/**
 * API Test Module
 * Functions to test Supabase authentication and API integrations
 */

import { getPersistedSession } from './supabaseClient.js';

// Test the Vercel API session endpoint
export const testSessionAPI = async () => {
  try {
    // Get the authenticated session
    const session = await getPersistedSession();
    
    if (!session) {
      console.log('[API Test] No session found, please authenticate first');
      return {
        success: false,
        error: 'No session found, please authenticate first'
      };
    }
    
    // Get the API URL from the environment variables or use a default
    const apiURL = await getAPIUrl();
    const apiEndpoint = `${apiURL}/session`;
    
    console.log(`[API Test] Testing session endpoint: ${apiEndpoint}`);
    
    // Make the request to the session API
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API Test] Session API test failed:', data);
      return {
        success: false,
        status: response.status,
        error: data.error || 'Unknown error'
      };
    }
    
    console.log('[API Test] Session API test succeeded:', data);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[API Test] Error testing session API:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test the user preferences API
export const testUserPreferencesAPI = async () => {
  try {
    // Get the authenticated session
    const session = await getPersistedSession();
    
    if (!session) {
      console.log('[API Test] No session found, please authenticate first');
      return {
        success: false,
        error: 'No session found, please authenticate first'
      };
    }
    
    // Get the API URL from the environment variables or use a default
    const apiURL = await getAPIUrl();
    const apiEndpoint = `${apiURL}/user`;
    
    console.log(`[API Test] Testing user preferences endpoint: ${apiEndpoint}`);
    
    // Make the request to get user preferences
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API Test] User preferences API test failed:', data);
      return {
        success: false,
        status: response.status,
        error: data.error || 'Unknown error'
      };
    }
    
    console.log('[API Test] User preferences API test succeeded:', data);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[API Test] Error testing user preferences API:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to get the API URL
const getAPIUrl = async () => {
  try {
    // Try to load from environment variables
    const response = await fetch(chrome.runtime.getURL('.env'));
    const text = await response.text();
    
    // Parse .env file for VERCEL_API_URL
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('VERCEL_API_URL=')) {
        const url = line.replace('VERCEL_API_URL=', '').trim().replace(/['"]/g, '');
        if (url) return url;
      }
    }
    
    // Fallback to a default URL if not found in environment
    return 'https://vesper-api.vercel.app/api';
  } catch (error) {
    console.error('[API Test] Error getting API URL:', error);
    return 'https://vesper-api.vercel.app/api';
  }
}; 