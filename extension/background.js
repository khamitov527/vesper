/**
 * Vesper - Background Service Worker
 * Handles OAuth flow and background tasks
 */

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Vesper installed:', details.reason);
  // TODO: Initialize any required storage
});

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
    
    case 'FETCH_CONTACTS':
      // TODO: Implement contact fetching logic
      sendResponse({ status: 'fetching_contacts' });
      break;
      
    case 'START_VOICE_RECOGNITION':
      // Initialize voice recognition
      try {
        // This will be handled by the content script with SpeechRecognition API
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_VOICE_RECOGNITION' });
        });
        sendResponse({ status: 'recognition_started' });
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        sendResponse({ status: 'recognition_error', error: error.message });
      }
      break;
      
    default:
      sendResponse({ status: 'unknown_command' });
  }
  
  return true; // Indicates async response
});

// Export functions for testing (if needed)
if (typeof module !== 'undefined') {
  module.exports = {
    initiateAuthFlow,
    handleAuthCallback
  };
} 