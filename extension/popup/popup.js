/**
 * Vesper - Popup Script
 * Handles UI interactions and communication with background script
 */

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

// Initialize popup event listeners and state
const initializePopup = () => {
  const startVoiceButton = document.getElementById('start-voice');
  const confirmButton = document.getElementById('confirm-button');
  const cancelButton = document.getElementById('cancel-button');
  const statusIndicator = document.getElementById('status-indicator');
  const transcriptionText = document.getElementById('transcription-text');
  
  // Setup event listeners
  startVoiceButton.addEventListener('click', handleVoiceStart);
  confirmButton.addEventListener('click', handleConfirmSelection);
  cancelButton.addEventListener('click', handleCancelSelection);
  
  // Add listener for popup closing
  window.addEventListener('beforeunload', stopVoiceRecognition);
  
  // Check auth status
  checkAuthStatus();
};

// Handle voice input start
const handleVoiceStart = () => {
  updateStatus('listening');
  
  // Clear previous transcript
  updateTranscription('');
  
  // Change button to stop listening
  const startVoiceButton = document.getElementById('start-voice');
  startVoiceButton.textContent = '🛑 Stop Listening';
  startVoiceButton.removeEventListener('click', handleVoiceStart);
  startVoiceButton.addEventListener('click', handleVoiceStop);
  
  // TODO: Communicate with voiceInput.js to start recognition
  chrome.runtime.sendMessage({ type: 'START_VOICE_RECOGNITION' }, (response) => {
    console.log('Voice recognition started:', response);
  });
};

// Handle voice input stop
const handleVoiceStop = () => {
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
  chrome.runtime.sendMessage({ type: 'STOP_VOICE_RECOGNITION' }, (response) => {
    console.log('Voice recognition stopped:', response);
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
  document.getElementById('transcription-text').textContent = text;
};

// Display contact results
const displayContacts = (contacts) => {
  const contactsContainer = document.getElementById('contacts-container');
  
  if (!contacts || contacts.length === 0) {
    contactsContainer.innerHTML = '<p class="empty-state">No contacts found</p>';
    return;
  }
  
  let contactsHTML = '';
  contacts.forEach((contact, index) => {
    contactsHTML += `
      <div class="contact-item" data-id="${index}">
        <div class="contact-name">${contact.name}</div>
        <div class="contact-email">${contact.email}</div>
        <div class="contact-org">${contact.organization || ''}</div>
      </div>
    `;
  });
  
  contactsContainer.innerHTML = contactsHTML;
  
  // Add click event to select contacts
  document.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', (e) => selectContact(e.currentTarget));
  });
  
  // Enable confirm button
  document.getElementById('confirm-button').disabled = false;
};

// Select a contact
const selectContact = (contactElement) => {
  // Remove selection from all contacts
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Add selection to clicked contact
  contactElement.classList.add('selected');
};

// Handle confirm button click
const handleConfirmSelection = () => {
  const selectedContact = document.querySelector('.contact-item.selected');
  
  if (!selectedContact) {
    console.log('No contact selected');
    return;
  }
  
  const contactId = selectedContact.dataset.id;
  
  // TODO: Send selected contact to Gmail page via content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'FILL_RECIPIENT', 
      contactId: contactId 
    });
  });
  
  window.close();
};

// Handle cancel button click
const handleCancelSelection = () => {
  window.close();
};

// Check if user is authenticated
const checkAuthStatus = () => {
  chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
    if (!response || !response.authenticated) {
      // TODO: Handle not authenticated state
      console.log('User not authenticated');
    }
  });
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message.type);
  
  switch (message.type) {
    case 'TRANSCRIPTION_RESULT':
      updateTranscription(message.text);
      updateStatus('processing');
      break;
      
    case 'CONTACTS_RESULT':
      displayContacts(message.contacts);
      updateStatus('ready');
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
  
  return true; // Indicates async response
}); 