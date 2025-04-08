/**
 * Vesper - Gmail API Module
 * Handles Gmail API integration for fetching contacts
 */

// OAuth2 configuration
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Check if user is authenticated
const checkAuth = () => {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve(!!token);
    });
  });
};

// Get auth token
const getAuthToken = () => {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
};

// Revoke auth token
const revokeAuthToken = (token) => {
  return new Promise((resolve, reject) => {
    const revokeUrl = `https://accounts.google.com/o/oauth2/revoke?token=${token}`;
    
    fetch(revokeUrl)
      .then(() => {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          resolve(true);
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

// Fetch recent contacts from Gmail
const fetchRecentContacts = async (limit = 20) => {
  try {
    const token = await getAuthToken();
    
    // TODO: Implement actual Gmail API call
    console.log('Fetching recent contacts with token:', token ? 'Valid token' : 'No token');
    
    // Sample Gmail API call to get messages (to be implemented)
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=' + limit, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Gmail API error: ' + response.status);
    }
    
    const data = await response.json();
    
    // TODO: Process messages to extract contacts
    // This is a placeholder that would need to be implemented to actually extract contacts
    const extractedContacts = await processMessagesToExtractContacts(data.messages, token);
    
    return {
      success: true,
      contacts: extractedContacts
    };
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process messages to extract contacts (placeholder)
const processMessagesToExtractContacts = async (messages, token) => {
  // TODO: Implement actual contact extraction from messages
  // This is just a placeholder returning sample data
  console.log('Processing messages to extract contacts');
  
  // In a real implementation, you would:
  // 1. Fetch full message details for each message ID
  // 2. Extract email addresses from headers
  // 3. Deduplicate and format contacts
  
  return [
    { name: 'John Doe', email: 'john.doe@example.com', organization: 'Acme Inc.' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', organization: 'Tech Corp' }
  ];
};

// Search contacts by query (name, organization)
const searchContacts = async (query) => {
  try {
    // For now, just fetch all contacts and filter client-side
    const result = await fetchRecentContacts(50);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Client-side filtering of contacts based on query
    const filteredContacts = result.contacts.filter(contact => {
      const nameMatch = contact.name && contact.name.toLowerCase().includes(query.toLowerCase());
      const orgMatch = contact.organization && contact.organization.toLowerCase().includes(query.toLowerCase());
      return nameMatch || orgMatch;
    });
    
    return {
      success: true,
      contacts: filteredContacts
    };
    
  } catch (error) {
    console.error('Error searching contacts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export functions
export {
  checkAuth,
  getAuthToken,
  revokeAuthToken,
  fetchRecentContacts,
  searchContacts
}; 