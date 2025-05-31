import axios from 'axios';
import { AtlassianConfig, AtlassianTokenResponse, AtlassianResource, AtlassianProject, AtlassianIssue } from '../types/atlassian';

export const getAuthUrl = (config: AtlassianConfig): string => {
  return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${config.clientId}&scope=${encodeURIComponent(
    config.scopes
  )}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&prompt=consent`;
};

export const exchangeCodeForToken = async (
  code: string,
  config: AtlassianConfig
): Promise<AtlassianTokenResponse> => {
  const response = await axios.post<AtlassianTokenResponse>(
    'https://auth.atlassian.com/oauth/token',
    {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

export const getAccessibleResources = async (accessToken: string): Promise<AtlassianResource[]> => {
  const response = await axios.get<AtlassianResource[]>(
    'https://api.atlassian.com/oauth/token/accessible-resources',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.data;
};

export const getProjects = async (cloudId: string, accessToken: string): Promise<AtlassianProject[]> => {
  const response = await axios.get<{ values: AtlassianProject[] }>(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.data.values;
};

export const getIssues = async (cloudId: string, accessToken: string): Promise<AtlassianIssue[]> => {
  const response = await axios.get<{ issues: AtlassianIssue[] }>(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.data.issues;
}; 