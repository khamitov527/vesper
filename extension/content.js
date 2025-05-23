/**
 * Vesper - Content Script
 * Injected into Gmail page for DOM manipulation
 */

// Initialize speech recognition
let recognition = null;
let isListening = false;

// Initialize content script
const initVesper = () => {
  // console.log('Vesper content script initialized');
  setupVoiceButton();
  setupMessageListeners();
  setupSpeechRecognition();
};

// Add voice button to Gmail compose window
const setupVoiceButton = () => {
  // TODO: Find Gmail compose window and add voice button
  // console.log('Voice button setup pending');
};

// Handle voice control activation
const activateVoiceControl = () => {
  // TODO: Communicate with voice input module
  chrome.runtime.sendMessage({ type: 'ACTIVATE_VOICE' });
};

// Set up speech recognition
const setupSpeechRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition not supported in this browser');
    return false;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  // Set up event handlers
  recognition.onstart = () => {
    isListening = true;
    //console.log('[Content] Voice recognition started');
  };
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    // console.log('[Content] Recognition result:', transcript, 'isFinal:', event.results[0].isFinal);
    
    // Send current transcript to background script for processing
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPTION_RESULT',
      text: transcript,
      isFinal: event.results[0].isFinal
    }, response => {
      // console.log('[Content] Background response to transcription:', response);
    });
  };
  
  recognition.onerror = (event) => {
    console.error('[Content] Recognition error:', event.error);
    isListening = false;
    
    chrome.runtime.sendMessage({
      type: 'RECOGNITION_ERROR',
      error: event.error
    });
  };
  
  recognition.onend = () => {
    isListening = false;
    // console.log('[Content] Voice recognition ended');
  };
  
  return true;
};

// Start voice recognition
const startVoiceRecognition = () => {
  // console.log('[Content] Attempting to start voice recognition');
  if (!recognition) {
    // console.log('[Content] Recognition not set up, initializing');
    if (!setupSpeechRecognition()) {
      console.error('[Content] Failed to set up speech recognition');
      return false;
    }
  }
  
  if (!isListening) {
    try {
      // console.log('[Content] Starting recognition');
      recognition.start();
      
      // Log emails from storage when starting to listen
      logStoredContacts();
      
      return true;
    } catch (error) {
      console.error('[Content] Error starting recognition:', error);
      return false;
    }
  } else {
    console.log('[Content] Already listening, ignoring start request');
  }
  
  return false;
};

// Log stored contacts whenever listening starts
const logStoredContacts = () => {
  console.log('[Content] Logging contacts from storage');
  chrome.storage.local.get('vesperContacts', (result) => {
    if (chrome.runtime.lastError) {
      console.error('[Content] Error retrieving contacts:', chrome.runtime.lastError);
      return;
    }
    
    const contacts = result.vesperContacts || [];
    console.log(`[Content] Found ${contacts.length} contacts in storage`);
    
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
    
    console.log(`[Content] Total email addresses: ${emails.length}`);
    console.table(emails);
  });
};

// Stop voice recognition
const stopVoiceRecognition = () => {
  // console.log('[Content] Attempting to stop voice recognition, isListening:', isListening);
  if (recognition && isListening) {
    recognition.stop();
    return true;
  }
  
  return false;
};

// Fetch contacts from Google People API
const fetchEmailContacts = () => {
  console.log('[Content] Requesting contacts from background script');
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FETCH_CONTACTS' }, response => {
      if (chrome.runtime.lastError) {
        console.error('[Content] Error sending FETCH_CONTACTS message:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else if (response && (response.status === 'success' || response.status === 'success_from_cache')) {
        console.log(`[Content] Contacts fetched: ${response.contacts?.length || 0}`);
        resolve(response.contacts || []);
      } else {
        console.error('[Content] Failed to fetch contacts:', response?.error || 'Unknown error');
        reject(new Error(response?.error || 'Failed to fetch contacts'));
      }
    });
  });
};

// Set up message listeners for communication with popup and background script
const setupMessageListeners = () => {
  // console.log('[Content] Setting up message listeners');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('[Content] Received message:', message.type, message, 'from sender:', sender);
    
    switch (message.type) {
      case 'FILL_RECIPIENT':
        console.log('[Content] Processing FILL_RECIPIENT message');
        // Fill recipient in Gmail compose window
        if (message.contacts && message.contacts.length > 0) {
          console.log('[Content] Filling contacts:', message.contacts);
          // Here you would add code to actually fill the recipient field in Gmail
          // For example: document.querySelector('.compose-recipient').value = message.contacts[0].name;
        }
        sendResponse({ status: 'recipient_filled' });
        break;
        
      case 'FETCH_EMAIL_CONTACTS':
        console.log('[Content] Processing FETCH_EMAIL_CONTACTS message');
        // Fetch contacts and respond with result
        fetchEmailContacts()
          .then(contacts => {
            sendResponse({ 
              status: 'success', 
              contacts: contacts,
              message: `Successfully fetched ${contacts.length} contacts` 
            });
          })
          .catch(error => {
            sendResponse({ 
              status: 'error', 
              error: error.message,
              message: 'Failed to fetch contacts' 
            });
          });
        return true; // Required for async sendResponse
        
      case 'START_VOICE_RECOGNITION':
        // console.log('[Content] Processing START_VOICE_RECOGNITION message');
        const started = startVoiceRecognition();
        // console.log('[Content] Recognition started:', started);
        sendResponse({ status: started ? 'recognition_started' : 'recognition_failed' });
        break;
        
      case 'STOP_VOICE_RECOGNITION':
        // console.log('[Content] Processing STOP_VOICE_RECOGNITION message');
        const stopped = stopVoiceRecognition();
        console.log('[Content] Recognition stopped:', stopped);
        sendResponse({ status: stopped ? 'recognition_stopped' : 'recognition_not_running' });
        break;
        
      case 'FORMATTED_TRANSCRIPTION':
        // console.log('[Content] Received FORMATTED_TRANSCRIPTION message, isFinal:', message.isFinal);
        // Only forward final results to popup
        if (message.isFinal) {
          // console.log('[Content] Forwarding final result to popup');
          // Forward to popup including recipient info if available
          chrome.runtime.sendMessage({
            type: 'FORMATTED_TRANSCRIPTION',
            originalText: message.originalText,
            formattedText: message.formattedText,
            recipient: message.recipient,
            isFinal: message.isFinal,
            error: message.error
          }, response => {
            // console.log('[Content] Popup response to forwarded formatted text:', response);
            sendResponse(response);
          });
        } else {
          console.log('[Content] Ignoring interim result');
          sendResponse({ status: 'interim_ignored' });
        }
        break;
        
      default:
        console.log('[Content] Unknown message type:', message.type);
        sendResponse({ status: 'unknown_command' });
    }
    
    return true; // Indicates async response
  });
};

// Initialize when page loads
window.addEventListener('load', initVesper);

// Export functions for testing (if needed)
if (typeof module !== 'undefined') {
  module.exports = {
    initVesper,
    activateVoiceControl,
    startVoiceRecognition,
    stopVoiceRecognition,
    fetchEmailContacts
  };
} 