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
  const debugResetButton = document.getElementById('debug-reset');
  const statusIndicator = document.getElementById('status-indicator');
  const transcriptionText = document.getElementById('transcription-text');
  
  console.log('[Popup] Setting up event listeners');
  
  // Setup event listeners
  startVoiceButton.addEventListener('click', handleVoiceStart);
  confirmButton.addEventListener('click', handleConfirmSelection);
  cancelButton.addEventListener('click', handleCancelSelection);
  debugResetButton.addEventListener('click', handleDebugReset);
  
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
  
  // Get recipient info if available
  const recipientContainer = document.getElementById('recipient-container');
  const recipientItem = recipientContainer.querySelector('.recipient-item');
  
  let recipientData = null;
  if (recipientItem) {
    // Create recipient data from displayed info
    const nameEl = recipientItem.querySelector('.recipient-name');
    const orgEl = recipientItem.querySelector('.recipient-org');
    const nicknameEl = recipientItem.querySelector('.recipient-nickname');
    const titleEl = recipientItem.querySelector('.recipient-title');
    
    recipientData = {
      name: nameEl ? nameEl.textContent.replace('Name: ', '') : null,
      organization: orgEl ? orgEl.textContent.replace('Organization: ', '') : null,
      nickname: nicknameEl ? nicknameEl.textContent.replace('Relation: ', '') : null,
      title: titleEl ? titleEl.textContent.replace('Title: ', '') : null
    };
  }
  
  console.log('Selected contacts:', contactData);
  console.log('Recipient data:', recipientData);
  
  chrome.runtime.sendMessage({
    type: 'FILL_RECIPIENT',
    contacts: contactData,
    recipient: recipientData
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
  displayRecipientInfo(null);
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

// Display recipient information in UI
const displayRecipientInfo = (recipient) => {
  const container = document.getElementById('recipient-container');
  container.innerHTML = '';
  
  console.log('[Popup] Displaying recipient info:', recipient);
  
  if (!recipient || (!recipient.name && !recipient.organization && !recipient.nickname && !recipient.title)) {
    console.log('[Popup] No valid recipient data to display');
    container.innerHTML = '<p class="empty-state">No recipient detected</p>';
    return;
  }
  
  const recipientElement = document.createElement('div');
  recipientElement.className = 'recipient-item';
  
  let recipientHTML = '';
  
  if (recipient.name) {
    recipientHTML += `<div class="recipient-name"><strong>Name:</strong> ${recipient.name}</div>`;
  }
  
  if (recipient.organization) {
    recipientHTML += `<div class="recipient-org"><strong>Organization:</strong> ${recipient.organization}</div>`;
  }
  
  if (recipient.nickname) {
    recipientHTML += `<div class="recipient-nickname"><strong>Relation:</strong> ${recipient.nickname}</div>`;
  }
  
  if (recipient.title) {
    recipientHTML += `<div class="recipient-title"><strong>Title:</strong> ${recipient.title}</div>`;
  }
  
  console.log('[Popup] Generated recipient HTML:', recipientHTML);
  recipientElement.innerHTML = recipientHTML;
  container.appendChild(recipientElement);
};

// Attempt to extract recipient information from text
const extractRecipientFromText = (text) => {
  console.log('[Popup] Attempting to extract recipient info from text');
  
  // Initialize empty recipient object
  const recipient = { 
    name: null, 
    organization: null, 
    nickname: null, 
    title: null 
  };
  
  if (!text) return recipient;
  
  // Common patterns to look for
  const namePatterns = [
    /(?:send|write|email|message|to)\s+(?:my\s+)?(friend|colleague|boss|coworker|teammate)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  const orgPatterns = [
    /(?:at|from|with)\s+([A-Z][a-z]*(?:\s+[A-Z][a-z]*)?(?:\s+(?:Inc|LLC|Corp|Company|Co))?)/i,
    /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)?(?:\s+(?:Inc|LLC|Corp|Company|Co)))/i
  ];
  
  const nicknamePatterns = [
    /(?:my|the)\s+(friend|colleague|boss|coworker|teammate|partner)/i
  ];
  
  // Try to extract name
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      // If the first group is a relation word, use the second group as name
      if (match[1] && /friend|colleague|boss|coworker|teammate/.test(match[1])) {
        recipient.name = match[2];
        recipient.nickname = match[1];
      } else if (match[1]) {
        recipient.name = match[1];
      }
      if (recipient.name) break;
    }
  }
  
  // Try to extract organization
  for (const pattern of orgPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      recipient.organization = match[1];
      break;
    }
  }
  
  // Try to extract nickname if not already found
  if (!recipient.nickname) {
    for (const pattern of nicknamePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        recipient.nickname = match[1];
        break;
      }
    }
  }
  
  console.log('[Popup] Extracted recipient info:', recipient);
  return recipient;
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
      
      // Display recipient information if available
      console.log('[Popup] Recipient data received:', message.recipient);
      if (message.recipient && (message.recipient.name || message.recipient.organization || message.recipient.nickname || message.recipient.title)) {
        console.log('[Popup] Using provided recipient information');
        displayRecipientInfo(message.recipient);
      } else {
        console.log('[Popup] No usable recipient data, attempting extraction from text');
        // Try to extract recipient info from text
        const extractedRecipient = extractRecipientFromText(textToDisplay);
        displayRecipientInfo(extractedRecipient);
      }
      
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

// Handle debug reset button
const handleDebugReset = () => {
  console.log('[Popup] Debug reset button clicked');
  
  // Insert a test recipient into the UI
  const testRecipient = {
    name: "Test User",
    organization: "Test Company",
    nickname: "friend",
    title: "CEO"
  };
  
  displayRecipientInfo(testRecipient);
  
  // Insert a test transcription
  updateTranscription("Send an email to my friend Test User from Test Company and tell him I'll be late for the meeting.");
  
  // Update UI status
  updateStatus('ready');
  
  console.log('[Popup] Debug reset completed');
}; 