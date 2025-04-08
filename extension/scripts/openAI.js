/**
 * Vesper - OpenAI Module (Combined with Example)
 * Handles OpenAI API integration for both formatting the transcript and extracting contact information.
 */

// Get API key from storage or environment
const getAPIKey = async () => {
  console.log('[OpenAI] Getting API key');
  
  try {
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      console.log('[OpenAI] Found API key in environment variables');
      return process.env.OPENAI_API_KEY;
    } else {
      console.log('[OpenAI] No environment API key, checking chrome storage');
    }
  } catch (e) {
    console.log('[OpenAI] Error accessing environment variables:', e);
  }
  
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openai_api_key'], (result) => {
      console.log('[OpenAI] API key from storage:', result.openai_api_key ? 'Found key' : 'No key found');
      resolve(result.openai_api_key || null);
    });
  });
};

/**
 * Process the transcript by correcting its formatting and extracting contact info
 * in one single API call.
 *
 * The returned JSON object will have exactly two keys:
 * - formattedText: string (the corrected transcript)
 * - recipient: object (with keys: name, organization, nickname, title; use null if not present)
 *
 * The prompt includes an example:
 *
 * Input:
 *   "Send an email to my friend Johnny from Google and tell him I'll be a bit late."
 *
 * Expected Output:
 * {
 *   "formattedText": "Send an email to Johnny from Google and tell him I'll be a bit late.",
 *   "recipient": {
 *     "name": "Johnny",
 *     "organization": "Google",
 *     "nickname": "friend",
 *     "title": null
 *   }
 * }
 */
const processTranscript = async (transcript) => {
  const apiKey = await getAPIKey();
  
  if (!apiKey) {
    console.error('OpenAI API key not found');
    return { error: 'API key not found', data: null };
  }
  
  try {
    console.log('Making a combined API call to OpenAI with transcript:', transcript);

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
            content:
              'You are an assistant that both corrects grammar, punctuation, and formatting of a transcript and extracts any contact information mentioned. Return a JSON object with EXACTLY two keys: "formattedText" and "recipient". "formattedText" should contain the corrected transcript text. "recipient" should be an object with the following keys: name, organization, nickname, and title (set to null if not present). Return ONLY the JSON.'
          },
          {
            role: 'user',
            content:
              "Send an email to my friend Johnny from Google and tell him I'll be a bit late."
          },
          {
            role: 'assistant',
            content: `{
              "formattedText": "Send an email to Johnny from Google and tell him I'll be a bit late.",
              "recipient": {
                "name": "Johnny",
                "organization": "Google",
                "nickname": "friend",
                "title": null
              }
            }`
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
    const outputText = data.choices[0].message.content.trim();
    
    let outputJson;
    try {
      outputJson = JSON.parse(outputText);
    } catch (jsonError) {
      // Attempt to extract JSON block if parsing fails
      const jsonMatch = outputText.match(/^{[\s\S]*}$/m);
      if (jsonMatch) {
        outputJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON from response');
      }
    }
    
    // Ensure the 'recipient' object has all the expected keys
    const defaultRecipient = { name: null, organization: null, nickname: null, title: null };
    outputJson.recipient = { ...defaultRecipient, ...(outputJson.recipient || {}) };

    console.log('[OpenAI] Processed transcript successfully, returning data:', outputJson);
    
    return {
      error: null,
      data: outputJson
    };
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

// Export the combined function along with key helpers
export {
  processTranscript,
  saveAPIKey,
  getAPIKey
};

// Add aliases for background.js compatibility
export const formatTranscriptionText = processTranscript;
export const extractContactInfo = processTranscript;

// Test API key on module load
(async function() {
  console.log('[OpenAI] Testing API key on module load');
  const apiKey = await getAPIKey();
  if (apiKey) {
    console.log('[OpenAI] API key available, ready for processing');
  } else {
    console.warn('[OpenAI] No API key found, processing will not work');
  }
})();