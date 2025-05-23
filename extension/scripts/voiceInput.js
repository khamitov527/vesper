/**
 * Vesper - Voice Input Module
 * Handles Web Speech API for voice transcription
 */

// Initialize speech recognition
let recognition = null;
let isListening = false;

// Create and configure speech recognition
const setupRecognition = () => {
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
  recognition.onstart = handleRecognitionStart;
  recognition.onresult = handleRecognitionResult;
  recognition.onerror = handleRecognitionError;
  recognition.onend = handleRecognitionEnd;
  
  return true;
};

// Handle recognition start
const handleRecognitionStart = () => {
  isListening = true;
  console.log('Voice recognition started');
};

// Handle recognition results
const handleRecognitionResult = (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join('');
  
  // Send transcript to background script for formatting and processing
  chrome.runtime.sendMessage({
    type: 'TRANSCRIPTION_RESULT',
    text: transcript,
    isFinal: event.results[0].isFinal
  });
};

// Handle recognition errors
const handleRecognitionError = (event) => {
  console.error('Recognition error:', event.error);
  isListening = false;
  
  chrome.runtime.sendMessage({
    type: 'RECOGNITION_ERROR',
    error: event.error
  });
};

// Handle recognition end
const handleRecognitionEnd = () => {
  isListening = false;
  console.log('Voice recognition ended');
};

// Process final transcription
const processTranscription = (transcript) => {
  // Processing is now done in the background script
  console.log('Transcription completed, will be processed by background script');
};

// Start voice recognition
const startListening = () => {
  if (!recognition) {
    if (!setupRecognition()) {
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
const stopListening = () => {
  if (recognition && isListening) {
    recognition.stop();
    return true;
  }
  
  return false;
};

// Export functions
export {
  startListening,
  stopListening,
  isListening
}; 