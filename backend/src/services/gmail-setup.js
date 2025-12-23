/**
 * Gmail OAuth Setup Script for PromptStack
 * 
 * This script helps you get the refresh token needed for Gmail API.
 * 
 * Usage:
 *   node src/services/gmail-setup.js <client_id> <client_secret>
 * 
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a new project (or select existing)
 *   3. Enable the Gmail API
 *   4. Create OAuth 2.0 credentials (Desktop application)
 *   5. Copy the Client ID and Client Secret
 */

const http = require('http');
const { URL } = require('url');

const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.log('\n=== PromptStack Gmail Setup ===\n');
  console.log('Usage: node src/services/gmail-setup.js <client_id> <client_secret>\n');
  console.log('Steps to get your Client ID and Client Secret:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select an existing one');
  console.log('3. Go to "APIs & Services" > "Library"');
  console.log('4. Search for "Gmail API" and enable it');
  console.log('5. Go to "APIs & Services" > "Credentials"');
  console.log('6. Click "Create Credentials" > "OAuth client ID"');
  console.log('7. If prompted, configure the OAuth consent screen first:');
  console.log('   - Choose "External" user type');
  console.log('   - Fill in app name (PromptStack) and your email');
  console.log('   - Add your email as a test user');
  console.log('8. For Application type, select "Desktop app"');
  console.log('9. Copy the Client ID and Client Secret\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Build the authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== PromptStack Gmail Setup ===\n');
console.log('Step 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\nStep 2: Sign in with promptstackhello@gmail.com');
console.log('Step 3: Grant permission to send emails');
console.log('\nWaiting for authorization...\n');

// Start a temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:3456`);
  
  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');
    
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization Failed</h1><p>You denied access or an error occurred.</p>');
      console.log('Authorization failed:', error);
      server.close();
      process.exit(1);
    }
    
    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Success!</h1><p>You can close this window and return to the terminal.</p>');
      
      // Exchange code for tokens
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        });
        
        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          console.log('Error getting tokens:', tokens.error_description);
          server.close();
          process.exit(1);
        }
        
        console.log('\n=== SUCCESS! ===\n');
        console.log('Add these values to your .env file:\n');
        console.log(`GOOGLE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`EMAIL_FROM=promptstackhello@gmail.com`);
        console.log('\n================\n');
        
        server.close();
        process.exit(0);
      } catch (err) {
        console.log('Error exchanging code for tokens:', err.message);
        server.close();
        process.exit(1);
      }
    }
  }
});

server.listen(3456, () => {
  console.log('Temporary server listening on http://localhost:3456');
  console.log('Waiting for you to authorize in your browser...\n');
});

// Timeout after 5 minutes
setTimeout(() => {
  console.log('Timed out waiting for authorization.');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
