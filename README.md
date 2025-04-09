# Vesper - Voice-Controlled Gmail Assistant

Vesper is a Chrome extension that provides voice control for Gmail, focusing on composing emails. It uses the Web Speech API for voice input and leverages OpenAI to extract contact information from natural language, then matches against your recent Gmail contacts.

## Features

- Voice command recognition for composing emails
- Natural language processing to extract recipient information
- Integration with Gmail to fetch and match contacts
- Simple UI to confirm selected contacts
- User authentication via Google OAuth through Supabase
- Serverless backend on Vercel for storing user preferences and data

## Setup

### Prerequisites

- Google Chrome browser
- OpenAI API key
- Google Cloud Platform account with Gmail API enabled
- Supabase account
- Vercel account (for deploying the API)

### Development Setup

1. Clone this repository
   ```
   git clone https://github.com/yourusername/vesper.git
   cd vesper
   ```

2. Create a `.env` file from the example
   ```
   cp .env.example .env
   ```

3. Fill in your API keys and credentials in the `.env` file

4. Set up Google OAuth credentials
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Gmail API
   - Create OAuth credentials (Web application type)
   - Add `chrome-extension://YOUR_EXTENSION_ID` to the authorized redirect URIs
   - Copy your Client ID to the `.env` file

5. Set up Supabase
   - Create a new project on [Supabase](https://supabase.com/)
   - Go to Authentication → Settings → URL Configuration
   - Add `chrome-extension://YOUR_EXTENSION_ID/popup/auth-callback.html` to the redirect URLs
   - Go to Project Settings → API
   - Copy your Supabase URL and anon key to the `.env` file
   - Enable Google OAuth provider in Authentication → Providers
   - Configure Google OAuth using the client ID and secret from Google Cloud Console

6. Deploy the Vercel API
   - Install Vercel CLI: `npm install -g vercel`
   - Login to Vercel: `vercel login`
   - Deploy the API: `vercel`
   - Add your environment variables to Vercel

7. Load the extension in Chrome
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` folder from this repository

## Usage

1. Click the Vesper icon in your Chrome toolbar
2. Sign in with your Google account if not already authenticated
3. Click the "Start Voice Input" button
4. Speak your request, e.g., "Email John from Acme Corp"
5. Review the matched contacts and confirm

## Development

The extension follows a modular structure:
- `background.js`: Handles OAuth flow and background tasks
- `content.js`: Interfaces with Gmail
- `popup/`: Contains the UI for user interaction
- `scripts/`: Contains the main functionality modules
- `api/`: Contains the serverless API functions for Vercel

### Authentication Flow

1. User clicks "Sign in with Google" in the extension popup
2. Extension initiates OAuth flow using Supabase
3. User completes Google authentication in a new tab
4. OAuth callback page handles token exchange and session storage
5. Extension uses stored session to authenticate API requests

## License

[MIT License](LICENSE)

## Acknowledgements

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [OpenAI API](https://platform.openai.com/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Supabase](https://supabase.com)
- [Vercel](https://vercel.com) 