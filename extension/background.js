/**
 * Vesper - Background Service Worker
 * Handles OAuth flow and background tasks
 */

// Import OpenAI module
import { formatTranscriptionText, extractContactInfo, saveAPIKey } from './scripts/openAI.js';
// Import People API module
import { fetchContacts, getStoredContacts, initPeopleAPI } from './scripts/peopleAPI.js';
// Import Supabase client
import { getAuthenticatedUser, signInWithGoogle, persistSession } from './scripts/supabaseClient.js';

// Load environment variables from .env
const loadEnvVariables = async () => {
  console.log('[Background] Loading environment variables');
  try {
    const response = await fetch(chrome.runtime.getURL('.env'));
    if (!response.ok) {
      throw new Error(`Failed to load .env file: ${response.status}`);
    }
    
    const text = await response.text();
    const envVars = {};
    
    // Parse .env file content
    text.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          const trimmedKey = key.trim();
          // Remove quotes if present
          const trimmedValue = value.replace(/^['"]|['"]$/g, '');
          envVars[trimmedKey] = trimmedValue;
        }
      }
    });
    
    console.log('[Background] Loaded environment variables:', Object.keys(envVars));
    
    // Store OpenAI API key if found
    if (envVars.OPENAI_API_KEY) {
      console.log('[Background] Found OpenAI API key in .env, saving to storage');
      await saveAPIKey(envVars.OPENAI_API_KEY);
    }
    
    return envVars;
  } catch (error) {
    console.error('[Background] Error loading environment variables:', error);
    return {};
  }
};

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Vesper installed:', details.reason);
  
  // Load environment variables
  const envVars = await loadEnvVariables();
  console.log('[Background] Environment variables loaded on install');
  
  // Initialize the People API
  const peopleAPIInit = await initPeopleAPI();
  console.log('[Background] People API initialization result:', peopleAPIInit);
  
  // Check if the user is authenticated with Supabase
  const { user } = await getAuthenticatedUser();
  console.log('[Background] User authentication status:', user ? 'Authenticated' : 'Not authenticated');
  
  // Log stored contacts
  logStoredContacts();
});

// Log stored contacts
const logStoredContacts = () => {
  console.log('[Background] Logging contacts from storage');
  chrome.storage.local.get('vesperContacts', (result) => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Error retrieving contacts:', chrome.runtime.lastError);
      return;
    }
    
    const contacts = result.vesperContacts || [];
    console.log(`[Background] Found ${contacts.length} contacts in storage`);
    
    if (contacts.length === 0) {
      console.log('[Background] No contacts found in storage yet.');
      return;
    }
    
    // Extract and log email addresses
    const emails = [];
    contacts.forEach(contact => {
      if (contact.emails && contact.emails.length > 0) {
        contact.emails.forEach(emailObj => {
          emails.push({
            name: contact.name || 'Unknown',
            email: emailObj.email,
            primary: emailObj.primary || false
          });
        });
      }
    });
    
    console.log(`[Background] Total email addresses: ${emails.length}`);
    console.table(emails);
  });
};

// OAuth functions
const initiateAuthFlow = () => {
  // TODO: Implement OAuth flow for Gmail API
  console.log('Auth flow initiated');
};

const handleAuthCallback = (token) => {
  // TODO: Store token and initialize API
  console.log('Auth callback received');
};

// Message handling from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  switch (message.type) {
    case 'INITIATE_AUTH':
      initiateAuthFlow();
      sendResponse({ status: 'auth_initiated' });
      break;
    
    case 'SUPABASE_SIGN_IN':
      console.log('[Background] Processing SUPABASE_SIGN_IN message');
      (async () => {
        try {
          const result = await signInWithGoogle();
          sendResponse({ 
            status: result.success ? 'success' : 'error',
            message: result.success ? 'Sign in initiated' : result.error
          });
        } catch (error) {
          console.error('[Background] Error initiating Supabase sign-in:', error);
          sendResponse({ 
            status: 'error', 
            error: error.message,
            message: 'Failed to initiate sign-in'
          });
        }
      })();
      return true; // Required to use the sendResponse asynchronously
    
    case 'AUTH_SUCCESS':
      console.log('[Background] Processing AUTH_SUCCESS message');
      // This is received from the auth-callback.html page
      (async () => {
        try {
          // The session should already be stored by the callback page
          // Notify any open popup about the successful authentication
          chrome.runtime.sendMessage({ 
            type: 'AUTH_STATUS_UPDATE', 
            authenticated: true,
            user: message.user
          });
          
          // Set badge or state to indicate authenticated status
          chrome.action.setBadgeText({ text: '✓' });
          chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
          
          console.log('[Background] Successfully authenticated user:', message.user);
        } catch (error) {
          console.error('[Background] Error processing auth success:', error);
        }
      })();
      break;
    
    case 'CHECK_AUTH_STATUS':
      console.log('[Background] Processing CHECK_AUTH_STATUS message');
      (async () => {
        try {
          const { user, error } = await getAuthenticatedUser();
          sendResponse({ 
            status: user ? 'authenticated' : 'unauthenticated',
            user: user,
            error: error
          });
        } catch (error) {
          console.error('[Background] Error checking auth status:', error);
          sendResponse({ 
            status: 'error', 
            error: error.message,
            message: 'Failed to check auth status'
          });
        }
      })();
      return true;
      
    case 'SIGN_OUT':
      console.log('[Background] Processing SIGN_OUT message');
      (async () => {
        try {
          const { signOut } = await import('./scripts/supabaseClient.js');
          const result = await signOut();
          
          // Clear badge
          chrome.action.setBadgeText({ text: '' });
          
          sendResponse({ 
            status: result.success ? 'success' : 'error',
            message: result.success ? 'Successfully signed out' : result.error
          });
          
          // Notify any open popup about the sign out
          chrome.runtime.sendMessage({ 
            type: 'AUTH_STATUS_UPDATE', 
            authenticated: false
          });
        } catch (error) {
          console.error('[Background] Error signing out:', error);
          sendResponse({ 
            status: 'error', 
            error: error.message,
            message: 'Failed to sign out'
          });
        }
      })();
      return true;
      
    case 'FETCH_CONTACTS':
      console.log('[Background] Processing FETCH_CONTACTS message');
      (async () => {
        try {
          // Try to fetch fresh contacts from the API
          const contacts = await fetchContacts();
          sendResponse({ 
            status: 'success', 
            contacts: contacts,
            message: `Successfully fetched ${contacts.length} contacts` 
          });
        } catch (error) {
          console.error('[Background] Error fetching contacts:', error);
          
          // If API fetch fails, try to get stored contacts as fallback
          try {
            const storedContacts = await getStoredContacts();
            if (storedContacts && storedContacts.length > 0) {
              sendResponse({ 
                status: 'success_from_cache', 
                contacts: storedContacts,
                message: `Retrieved ${storedContacts.length} contacts from cache` 
              });
            } else {
              sendResponse({ 
                status: 'error', 
                error: error.message,
                message: 'Failed to fetch contacts and no cached contacts available'
              });
            }
          } catch (storageError) {
            sendResponse({ 
              status: 'error', 
              error: error.message,
              storageError: storageError.message,
              message: 'Failed to fetch contacts and retrieve from cache'
            });
          }
        }
      })();
      return true; // Required to use the sendResponse asynchronously
      
    case 'SET_OPENAI_API_KEY':
      console.log('[Background] Setting OpenAI API key manually');
      (async () => {
        try {
          await saveAPIKey(message.apiKey);
          sendResponse({ success: true });
        } catch (error) {
          console.error('[Background] Error saving API key:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    case 'LOAD_ENV_VARIABLES':
      console.log('[Background] Received request to load environment variables');
      (async () => {
        try {
          const envVars = await loadEnvVariables();
          if (envVars && envVars.OPENAI_API_KEY) {
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'API key not found in .env' });
          }
        } catch (error) {
          console.error('[Background] Error loading environment variables:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    case 'START_VOICE_RECOGNITION':
      // Initialize voice recognition
      console.log('[Background] Processing START_VOICE_RECOGNITION message');
      try {
        // This will be handled by the content script with SpeechRecognition API
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          console.log('[Background] Found active tab:', tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_VOICE_RECOGNITION' });
        });
        sendResponse({ status: 'recognition_started' });
      } catch (error) {
        console.error('[Background] Error starting voice recognition:', error);
        sendResponse({ status: 'recognition_error', error: error.message });
      }
      break;
      
    case 'STOP_VOICE_RECOGNITION':
      // Stop voice recognition
      console.log('[Background] Processing STOP_VOICE_RECOGNITION message');
      try {
        // This will be handled by the content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          console.log('[Background] Found active tab for stopping:', tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_VOICE_RECOGNITION' }, response => {
            console.log('[Background] Content script response to stop request:', response);
          });
        });
        sendResponse({ status: 'stop_request_sent' });
      } catch (error) {
        console.error('[Background] Error stopping voice recognition:', error);
        sendResponse({ status: 'stop_error', error: error.message });
      }
      break;
      
    case 'TRANSCRIPTION_RESULT':
      // Format the transcription text using OpenAI and then forward to popup
      console.log('[Background] Received transcription result:', message);
      (async () => {
        const originalText = message.text;
        
        // Only send for formatting if it's non-empty
        if (originalText && originalText.trim() !== '') {
          console.log('[Background] Processing non-empty transcript, isFinal:', message.isFinal);
          
          // If it's the final result, format it with OpenAI
          if (message.isFinal) {
            console.log('[Background] Final result, sending to OpenAI for formatting');
            try {
              const result = await formatTranscriptionText(originalText);
              console.log('[Background] OpenAI formatting result:', result);
              console.log('[Background] Detailed result structure:', JSON.stringify(result));
              console.log('[Background] Recipient data:', result.recipient);
              
              // Handle the case where result.data contains the actual data
              const formattedData = result.data || result;
              const formattedText = formattedData.formattedText || originalText;
              const recipientData = formattedData.recipient || { name: null, organization: null, nickname: null, title: null };
              
              // Send formatted result to popup
              console.log('[Background] Sending formatted result to popup');
              try {
                // Try direct runtime message
                chrome.runtime.sendMessage({
                  type: 'FORMATTED_TRANSCRIPTION',
                  originalText: originalText,
                  formattedText: formattedText,
                  recipient: recipientData,
                  isFinal: message.isFinal,
                  error: result.error
                }, response => {
                  console.log('[Background] Popup direct response to formatted text:', response);
                });
                
                // Also try sending to all tabs as backup
                chrome.tabs.query({}, (tabs) => {
                  console.log('[Background] Found total tabs:', tabs.length);
                  for (const tab of tabs) {
                    console.log('[Background] Sending to tab:', tab.id);
                    chrome.tabs.sendMessage(tab.id, {
                      type: 'FORMATTED_TRANSCRIPTION',
                      originalText: originalText,
                      formattedText: formattedText,
                      recipient: recipientData,
                      isFinal: message.isFinal,
                      error: result.error
                    }).catch(err => {
                      console.log('[Background] Error sending to tab', tab.id, err);
                    });
                  }
                });
              } catch (err) {
                console.error('[Background] Error sending formatted result:', err);
              }
              
              // If final result and no errors, also process it for contact extraction
              if (!result.error) {
                console.log('[Background] No errors, sending for contact extraction');
                // Process the formatted text for contact extraction
                chrome.runtime.sendMessage({
                  type: 'EXTRACT_CONTACT_INFO',
                  transcript: result.formattedText
                });
              }
            } catch (error) {
              console.error('[Background] Error during formatting:', error);
              // Send original text if formatting fails
              chrome.runtime.sendMessage({
                type: 'FORMATTED_TRANSCRIPTION',
                originalText: originalText,
                formattedText: originalText,
                recipient: { name: null, organization: null, nickname: null, title: null },
                isFinal: message.isFinal,
                error: error.message
              });
            }
          } else {
            // For interim results, don't send anything to the popup
            console.log('[Background] Interim result, not forwarding to popup');
          }
        } else {
          console.log('[Background] Empty transcript, ignoring');
        }
      })();
      sendResponse({ status: 'processing_transcription' });
      break;
      
    case 'EXTRACT_CONTACT_INFO':
      // Process transcript to extract contact info
      (async () => {
        try {
          const result = await extractContactInfo(message.transcript);
          console.log('[Background] Contact extraction result:', result);
          
          // Forward extracted data to popup
          if (!result.error) {
            // Handle the case where result.data contains the actual data
            const contactData = result.data || result;
            
            chrome.runtime.sendMessage({
              type: 'CONTACTS_RESULT',
              contacts: [contactData] // Wrap in array for consistency with UI
            });
          } else {
            console.error('Contact extraction failed:', result.error);
          }
        } catch (error) {
          console.error('Error extracting contacts:', error);
        }
      })();
      sendResponse({ status: 'extracting_contacts' });
      break;
      
    case 'CHECK_AUTH':
      console.log('[Background] Processing CHECK_AUTH message');
      // TODO: Implement actual auth check
      sendResponse({ authenticated: true });
      break;
      
    default:
      sendResponse({ status: 'unknown_command' });
  }
  
  return true; // Indicates async response
});

// Immediately try to load environment variables on script load
(async function() {
  console.log('[Background] Initial load of environment variables');
  await loadEnvVariables();
})();

// Export functions for testing (if needed)
if (typeof module !== 'undefined') {
  module.exports = {
    initiateAuthFlow,
    handleAuthCallback
  };
} 