/**
 * Vesper - Google People API Integration
 * Fetches email contacts using the Google People API and stores them in chrome.storage.local
 */

// People API scope for reading contacts
const PEOPLE_API_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';
const PEOPLE_API_ENDPOINT = 'https://people.googleapis.com/v1/people/me/connections';

/**
 * Initializes the People API
 * This should be called when the extension starts
 */
export const initPeopleAPI = async () => {
  try {
    console.log('[PeopleAPI] Initializing People API with client ID from manifest');
    return { success: true };
  } catch (error) {
    console.error('[PeopleAPI] Error initializing:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetches user's contacts from Google People API
 * @returns {Promise<Array>} Array of contact objects
 */
export const fetchContacts = async () => {
  try {
    console.log('[PeopleAPI] Fetching contacts...');
    
    // Get the authentication token
    const token = await getAuthToken();
    
    // Parameters for the People API request
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses',
      pageSize: 1000 // Maximum allowed by the API
    });
    
    // Make the API request
    const response = await fetch(`${PEOPLE_API_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`People API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process and format the contacts
    const contacts = processContactsData(data);
    
    // Store contacts in chrome.storage.local
    await storeContacts(contacts);
    
    console.log(`[PeopleAPI] Successfully fetched and stored ${contacts.length} contacts`);
    return contacts;
  } catch (error) {
    console.error('[PeopleAPI] Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Gets an authentication token for the People API
 * @returns {Promise<string>} The auth token
 */
const getAuthToken = async () => {
  try {
    // Get the auth token using the client ID from the manifest
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error('Failed to obtain auth token'));
        } else {
          resolve(token);
        }
      });
    });
  } catch (error) {
    console.error('[PeopleAPI] Error getting auth token:', error);
    throw error;
  }
};

/**
 * Processes the raw contacts data from the People API
 * @param {Object} data - Raw response from the People API
 * @returns {Array} Processed array of contact objects
 */
const processContactsData = (data) => {
  if (!data.connections) {
    return [];
  }
  
  return data.connections
    .filter(person => person.emailAddresses && person.emailAddresses.length > 0)
    .map(person => {
      const name = person.names && person.names.length > 0 
        ? person.names[0].displayName 
        : null;
      
      const emails = person.emailAddresses.map(email => ({
        email: email.value,
        type: email.type || 'other',
        primary: email.metadata?.primary || false
      }));
      
      return {
        name,
        emails,
        resourceName: person.resourceName
      };
    });
};

/**
 * Stores the contacts in chrome.storage.local
 * @param {Array} contacts - Array of processed contact objects
 * @returns {Promise<void>}
 */
const storeContacts = async (contacts) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ 'vesperContacts': contacts }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Retrieves stored contacts from chrome.storage.local
 * @returns {Promise<Array>} Array of contact objects
 */
export const getStoredContacts = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('vesperContacts', (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result.vesperContacts || []);
      }
    });
  });
}; 