/**
 * Vesper - Content Script
 * Injected into Gmail page for DOM manipulation
 */

// Initialize speech recognition
let recognition = null;
let isListening = false;

// Initialize content script
const initVesper = () => {
  console.log('Vesper content script initialized');
  setupVoiceButton();
  setupMessageListeners();
  setupSpeechRecognition();
};

// Add voice button to Gmail compose window
const setupVoiceButton = () => {
  // TODO: Find Gmail compose window and add voice button
  console.log('Voice button setup pending');
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
    console.log('Voice recognition started');
  };
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    // Send current transcript to popup
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPTION_RESULT',
      text: transcript,
      isFinal: event.results[0].isFinal
    });
  };
  
  recognition.onerror = (event) => {
    console.error('Recognition error:', event.error);
    isListening = false;
    
    chrome.runtime.sendMessage({
      type: 'RECOGNITION_ERROR',
      error: event.error
    });
  };
  
  recognition.onend = () => {
    isListening = false;
    console.log('Voice recognition ended');
  };
  
  return true;
};

// Start voice recognition
const startVoiceRecognition = () => {
  if (!recognition) {
    if (!setupSpeechRecognition()) {
      return false;
    }
  }
  
  if (!isListening) {
    try {
      recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      return false;
    }
  }
  
  return false;
};

// Stop voice recognition
const stopVoiceRecognition = () => {
  if (recognition && isListening) {
    recognition.stop();
    return true;
  }
  
  return false;
};

// Set up message listeners for communication with popup and background script
const setupMessageListeners = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message.type);
    
    switch (message.type) {
      case 'FILL_RECIPIENT':
        // TODO: Fill recipient in Gmail compose window
        sendResponse({ status: 'recipient_filled' });
        break;
        
      case 'START_VOICE_RECOGNITION':
        const started = startVoiceRecognition();
        sendResponse({ status: started ? 'recognition_started' : 'recognition_failed' });
        break;
        
      case 'STOP_VOICE_RECOGNITION':
        const stopped = stopVoiceRecognition();
        sendResponse({ status: stopped ? 'recognition_stopped' : 'recognition_not_running' });
        break;
        
      default:
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
    stopVoiceRecognition
  };
} 