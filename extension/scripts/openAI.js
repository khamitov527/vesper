/**
 * Vesper - OpenAI Module
 * Handles OpenAI API integration for extracting contact information
 */

// Get API key from storage or environment
const getAPIKey = async () => {
  console.log('[OpenAI] Getting API key');
  
  // First try to get from environment variables
  try {
    // Check if we're in a development environment with access to process.env
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      console.log('[OpenAI] Found API key in environment variables');
      return process.env.OPENAI_API_KEY;
    } else {
      console.log('[OpenAI] No environment API key, checking chrome storage');
    }
  } catch (e) {
    console.log('[OpenAI] Error accessing environment variables:', e);
  }
  
  // Fall back to chrome storage
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openai_api_key'], (result) => {
      console.log('[OpenAI] API key from storage:', result.openai_api_key ? 'Found key' : 'No key found');
      resolve(result.openai_api_key || null);
    });
  });
};

// Extract contact information from transcription
const extractContactInfo = async (transcript) => {
  const apiKey = await getAPIKey();
  
  if (!apiKey) {
    console.error('OpenAI API key not found');
    return {
      error: 'API key not found',
      data: null
    };
  }
  
  try {
    // TODO: Make actual API call to OpenAI
    console.log('Making API call to OpenAI with transcript:', transcript);
    
    // Sample OpenAI API call (to be implemented)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract name and organization information from the following transcription. Return a JSON object with fields: name, organization'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse and return extracted information
    // This assumes the model returns valid JSON in its response
    try {
      const extractedText = data.choices[0].message.content;
      const extractedData = JSON.parse(extractedText);
      
      return {
        error: null,
        data: extractedData
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return {
        error: 'Error parsing response',
        data: null
      };
    }
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      error: error.message,
      data: null
    };
  }
};

// Format transcription text using OpenAI
const formatTranscriptionText = async (transcript) => {
  console.log('[OpenAI] Starting text formatting for transcript:', transcript);
  const apiKey = await getAPIKey();
  
  if (!apiKey) {
    console.error('[OpenAI] API key not found, returning original text');
    return {
      error: 'API key not found',
      formattedText: transcript // Return original if no API key
    };
  }
  
  try {
    console.log('[OpenAI] Making API call to format text');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Correct grammar, punctuation, and formatting in the following transcribed text. Return only the corrected text with no explanations or additional content.'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      console.error('[OpenAI] API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[OpenAI] Received response data:', data);
    
    const formattedText = data.choices[0].message.content.trim();
    console.log('[OpenAI] Formatted text:', formattedText);
    
    return {
      error: null,
      formattedText: formattedText
    };
    
  } catch (error) {
    console.error('[OpenAI] Error formatting text:', error);
    return {
      error: error.message,
      formattedText: transcript // Return original on error
    };
  }
};

// Save API key to storage
const saveAPIKey = async (apiKey) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ 'openai_api_key': apiKey }, () => {
      resolve(true);
    });
  });
};

// Export functions
export {
  extractContactInfo,
  saveAPIKey,
  getAPIKey,
  formatTranscriptionText
};

// Test API key on module load
(async function() {
  console.log('[OpenAI] Testing API key on module load');
  const apiKey = await getAPIKey();
  if (apiKey) {
    console.log('[OpenAI] API key available, ready for formatting');
  } else {
    console.warn('[OpenAI] No API key found, formatting will not work');
  }
})(); 