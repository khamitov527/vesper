/**
 * Vesper - Popup Script
 * Handles UI interactions and communication with background script
 */

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

// Initialize popup event listeners and state
const initializePopup = () => {
  console.log('[Popup] Initializing popup');
  
  const startVoiceButton = document.getElementById('start-voice');
  const confirmButton = document.getElementById('confirm-button');
  const cancelButton = document.getElementById('cancel-button');
  const statusIndicator = document.getElementById('status-indicator');
  const transcriptionText = document.getElementById('transcription-text');
  
  console.log('[Popup] Setting up event listeners');
  
  // Setup event listeners
  startVoiceButton.addEventListener('click', handleVoiceStart);
  confirmButton.addEventListener('click', handleConfirmSelection);
  cancelButton.addEventListener('click', handleCancelSelection);
  
  // Add listener for popup closing
  window.addEventListener('beforeunload', stopVoiceRecognition);
  
  // Check auth status
  checkAuthStatus();
  
  console.log('[Popup] Popup initialized');
};

// Handle voice input start
const handleVoiceStart = () => {
  console.log('[Popup] Voice start button clicked');
  updateStatus('listening');
  
  // Clear previous transcript
  updateTranscription('');
  
  // Change button to stop listening
  const startVoiceButton = document.getElementById('start-voice');
  startVoiceButton.textContent = '🛑 Stop Listening';
  startVoiceButton.removeEventListener('click', handleVoiceStart);
  startVoiceButton.addEventListener('click', handleVoiceStop);
  
  console.log('[Popup] Sending START_VOICE_RECOGNITION message');
  // Send message to start recognition
  chrome.runtime.sendMessage({ type: 'START_VOICE_RECOGNITION' }, (response) => {
    console.log('[Popup] Response to start voice recognition:', response);
  });
};

// Handle voice input stop
const handleVoiceStop = () => {
  console.log('[Popup] Voice stop button clicked');
  updateStatus('ready');
  
  // Change button back to start listening
  const startVoiceButton = document.getElementById('start-voice');
  startVoiceButton.innerHTML = '<span class="icon">🎤</span> Start Voice Input';
  startVoiceButton.removeEventListener('click', handleVoiceStop);
  startVoiceButton.addEventListener('click', handleVoiceStart);
  
  // Stop voice recognition
  stopVoiceRecognition();
};

// Stop voice recognition
const stopVoiceRecognition = () => {
  console.log('[Popup] Stopping voice recognition');
  chrome.runtime.sendMessage({ type: 'STOP_VOICE_RECOGNITION' }, (response) => {
    console.log('[Popup] Response to stop voice recognition:', response);
  });
};

// Update UI status
const updateStatus = (status) => {
  const statusIndicator = document.getElementById('status-indicator');
  statusIndicator.className = status;
  
  switch (status) {
    case 'listening':
      statusIndicator.textContent = 'Listening...';
      break;
    case 'processing':
      statusIndicator.textContent = 'Processing...';
      break;
    case 'ready':
      statusIndicator.textContent = 'Ready';
      break;
    default:
      statusIndicator.textContent = 'Inactive';
      statusIndicator.className = 'inactive';
  }
};

// Update transcription display
const updateTranscription = (text) => {
  console.log('[Popup] Updating transcription display with text:', text);
  document.getElementById('transcription-text').textContent = text;
};

// Handle confirm button click
const handleConfirmSelection = () => {
  const selectedContacts = document.querySelectorAll('.contact-item.selected');
  
  if (selectedContacts.length === 0) {
    console.log('No contacts selected');
    return;
  }
  
  // Extract selected contact data
  const contactData = Array.from(selectedContacts).map(item => {
    return {
      name: item.dataset.name,
      organization: item.dataset.organization
    };
  });
  
  // TODO: Pass selected contacts to Gmail 
  console.log('Selected contacts:', contactData);
  
  chrome.runtime.sendMessage({
    type: 'FILL_RECIPIENT',
    contacts: contactData
  }, (response) => {
    console.log('Recipients filled:', response);
    // Close popup or provide feedback
  });
};

// Handle cancel button click
const handleCancelSelection = () => {
  // Clear UI state
  updateTranscription('');
  displayContacts([]);
  updateStatus('ready');
};

// Display contacts in UI
const displayContacts = (contacts) => {
  const container = document.getElementById('contacts-container');
  container.innerHTML = '';
  
  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p class="empty-state">No contacts found</p>';
    return;
  }
  
  const confirmButton = document.getElementById('confirm-button');
  confirmButton.disabled = true;
  
  contacts.forEach(contact => {
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-item';
    contactElement.dataset.name = contact.name || '';
    contactElement.dataset.organization = contact.organization || '';
    
    contactElement.innerHTML = `
      <div class="contact-name">${contact.name || 'Unknown'}</div>
      ${contact.organization ? `<div class="contact-org">${contact.organization}</div>` : ''}
    `;
    
    contactElement.addEventListener('click', () => {
      contactElement.classList.toggle('selected');
      
      // Enable confirm button if at least one contact is selected
      const hasSelection = document.querySelector('.contact-item.selected') !== null;
      confirmButton.disabled = !hasSelection;
    });
    
    container.appendChild(contactElement);
  });
};

// Check if user is authenticated
const checkAuthStatus = () => {
  chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
    if (!response || !response.authenticated) {
      // TODO: Handle not authenticated state
      console.log('[Popup] User not authenticated');
    } else {
      console.log('[Popup] User is authenticated');
    }
  });
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Popup] Received message type:', message.type, message);
  
  switch (message.type) {
    case 'TRANSCRIPTION_RESULT':
      // We're no longer showing real-time transcription
      // Wait for FORMATTED_TRANSCRIPTION instead
      console.log('[Popup] Ignoring TRANSCRIPTION_RESULT message, waiting for formatted version');
      sendResponse({ status: 'awaiting_formatted_text' });
      break;
      
    case 'FORMATTED_TRANSCRIPTION':
      // Use the formatted text in the UI, falling back to original if there was an error
      console.log('[Popup] Handling FORMATTED_TRANSCRIPTION message');
      const textToDisplay = message.error ? message.originalText : message.formattedText;
      console.log('[Popup] Text to display:', textToDisplay, 'Error:', message.error);
      updateTranscription(textToDisplay);
      updateStatus('processing');
      sendResponse({ status: 'formatted_transcription_displayed' });
      break;
      
    case 'CONTACTS_RESULT':
      console.log('[Popup] Handling CONTACTS_RESULT message:', message.contacts);
      displayContacts(message.contacts);
      updateStatus('ready');
      sendResponse({ status: 'contacts_displayed' });
      break;
      
    default:
      console.log('[Popup] Unknown message type:', message.type);
      sendResponse({ status: 'unknown_message_type' });
  }
  
  return true; // Indicates async response
}); 