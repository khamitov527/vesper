/**
 * Vesper - OpenAI Module
 * Handles OpenAI API integration for extracting contact information
 */

// Get API key from storage
const getAPIKey = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openai_api_key'], (result) => {
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
  getAPIKey
}; 