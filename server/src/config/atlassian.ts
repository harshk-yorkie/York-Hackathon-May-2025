import dotenv from 'dotenv';
import { AtlassianConfig } from '../types/atlassian';

dotenv.config();

export const atlassianConfig: AtlassianConfig = {
  clientId: process.env.ATLASSIAN_CLIENT_ID || '',
  clientSecret: process.env.ATLASSIAN_SECRET || '',
  redirectUri: process.env.ATLASSIAN_REDIRECT_URI || '',
  scopes: 'read:jira-work read:jira-user',
}; 