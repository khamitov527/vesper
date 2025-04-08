/**
 * Vesper - Google People API Integration
 * Fetches email contacts using the Google People API and stores them in chrome.storage.local
 */

// People API scope for reading contacts
const PEOPLE_API_SCOPE = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly'
];
const CONTACTS_ENDPOINT = 'https://people.googleapis.com/v1/people/me/connections';
const OTHER_CONTACTS_ENDPOINT = 'https://people.googleapis.com/v1/otherContacts';

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
    console.log('[PeopleAPI] Fetching all contacts...');
    
    // Get the authentication token
    const token = await getAuthToken();
    
    // Fetch both regular contacts and other contacts
    const mainContacts = await fetchContactsFromEndpoint(CONTACTS_ENDPOINT, 'regular contacts', token);
    const otherContacts = await fetchContactsFromEndpoint(OTHER_CONTACTS_ENDPOINT, 'other contacts', token);
    
    // Combine both contact lists
    const allContacts = [...mainContacts, ...otherContacts];
    console.log(`[PeopleAPI] Combined total: ${allContacts.length} contacts (${mainContacts.length} regular + ${otherContacts.length} other)`);
    
    // Store contacts in chrome.storage.local
    await storeContacts(allContacts);
    
    console.log(`[PeopleAPI] Successfully fetched and stored ${allContacts.length} contacts`);
    return allContacts;
  } catch (error) {
    console.error('[PeopleAPI] Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Fetches contacts from a specific API endpoint
 * @param {string} endpoint - The API endpoint to fetch from
 * @param {string} type - The type of contacts being fetched (for logging)
 * @param {string} token - The auth token for API requests
 * @returns {Promise<Array>} Array of contact objects
 */
const fetchContactsFromEndpoint = async (endpoint, type, token) => {
  // Array to hold all contacts
  let allContacts = [];
  // Next page token for pagination
  let nextPageToken = null;
  // Total API calls counter
  let apiCallCount = 0;
  
  // Fetch contacts page by page
  do {
    apiCallCount++;
    console.log(`[PeopleAPI] Fetching ${type} page ${apiCallCount}${nextPageToken ? ' with page token' : ''}`);
    
    // Parameters for the People API request - use different parameters for different endpoints
    const params = new URLSearchParams({
      pageSize: 1000 // Maximum allowed by the API
    });
    
    // The otherContacts endpoint uses readMask instead of personFields
    if (endpoint.includes('otherContacts')) {
      params.append('readMask', 'names,emailAddresses');
    } else {
      params.append('personFields', 'names,emailAddresses');
      // Add sources parameters individually - don't combine with comma
      params.append('sources', 'READ_SOURCE_TYPE_CONTACT');
      params.append('sources', 'READ_SOURCE_TYPE_PROFILE');
    }
    
    // Add page token if we have one
    if (nextPageToken) {
      params.append('pageToken', nextPageToken);
    }
    
    // Make the API request
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[PeopleAPI] Error fetching ${type}:`, errorData);
      throw new Error(`People API error for ${type}: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Get the list of people from the appropriate property
    // Regular contacts use 'connections', otherContacts uses 'otherContacts'
    const peopleList = endpoint.includes('otherContacts') ? data.otherContacts : data.connections;
    
    // Log the raw response data for debugging
    console.log(`[PeopleAPI] ${type} page ${apiCallCount} response:`, {
      endpointType: type,
      totalItems: peopleList?.length || 0,
      hasNextPage: !!data.nextPageToken
    });
    
    if (!peopleList || peopleList.length === 0) {
      console.log(`[PeopleAPI] No ${type} found in this page`);
    } else {
      // Process the connections in this page
      const pageContacts = processContactsData(peopleList, type);
      allContacts = allContacts.concat(pageContacts);
      console.log(`[PeopleAPI] Processed ${pageContacts.length} ${type} with emails in page ${apiCallCount}, total so far: ${allContacts.length}`);
    }
    
    // Get the next page token
    nextPageToken = data.nextPageToken;
    
    // Safety check to avoid infinite loops
    if (apiCallCount >= 10) {
      console.warn(`[PeopleAPI] Reached maximum number of API calls (10) for ${type}, stopping pagination`);
      break;
    }
  } while (nextPageToken);
  
  console.log(`[PeopleAPI] Fetched a total of ${allContacts.length} ${type} across ${apiCallCount} API calls`);
  return allContacts;
};

/**
 * Gets an authentication token for the People API
 * @returns {Promise<string>} The auth token
 */
const getAuthToken = async () => {
  try {
    // Get the auth token using the client ID from the manifest
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: PEOPLE_API_SCOPE
      }, (token) => {
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
 * @param {Array} peopleList - Raw list of people from the API
 * @param {string} type - The type of contacts being processed (for logging)
 * @returns {Array} Processed array of contact objects
 */
const processContactsData = (peopleList, type) => {
  if (!peopleList || peopleList.length === 0) {
    console.log(`[PeopleAPI] No ${type} found in API response`);
    return [];
  }
  
  console.log(`[PeopleAPI] Processing ${peopleList.length} raw ${type}`);
  
  // Log how many contacts have emails vs. how many don't
  const contactsWithEmail = peopleList.filter(person => person.emailAddresses && person.emailAddresses.length > 0).length;
  const contactsWithoutEmail = peopleList.length - contactsWithEmail;
  
  console.log(`[PeopleAPI] ${type} breakdown: ${contactsWithEmail} with email, ${contactsWithoutEmail} without email`);
  
  // Process connections with emails
  const processedContacts = peopleList
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
        name: name || 'Unknown',
        emails,
        resourceName: person.resourceName,
        source: type, // Add source for tracking where contact came from
      };
    });
  
  console.log(`[PeopleAPI] Successfully processed ${processedContacts.length} ${type} with email addresses`);
  return processedContacts;
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