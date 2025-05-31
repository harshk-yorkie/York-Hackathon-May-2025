// src/controllers/authController.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.ATLASSIAN_CLIENT_ID;
const CLIENT_SECRET = process.env.ATLASSIAN_CLIENT_SECRET;
const REDIRECT_URI = process.env.ATLASSIAN_REDIRECT_URI; // e.g., http://localhost:3000/api/auth/jira/callback

// Step 1: Redirect user to Atlassian OAuth Consent Screen
export const redirectToAtlassian = (req, res) => {
  const scopes = [
    'read:me',
    'read:jira-work',
    'read:account',
    'offline_access',
    // Add more scopes if needed
  ];

  const authUrl = `https://auth.atlassian.com/authorize?` +
    `audience=api.atlassian.com` +
    `&client_id=${CLIENT_ID}` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&prompt=consent`;

  return res.redirect(authUrl);
};

// Step 2: Handle OAuth callback and exchange code for access token
export const handleAtlassianCallback = async (req, res) => {
  const code = req.query.code ;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Store tokens securely (DB, session, etc.)
    // For now, just return them
    return res.status(200).json({
      message: 'Successfully authenticated with Atlassian',
      access_token,
      refresh_token,
      expires_in,
    });
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Token exchange failed' });
  }
};
