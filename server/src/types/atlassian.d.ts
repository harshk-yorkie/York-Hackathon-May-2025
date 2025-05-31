export interface AtlassianConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

export interface AtlassianTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface AtlassianResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

export interface AtlassianProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface AtlassianIssue {
  id: string;
  key: string;
  fields: {
    description: {
      content: Array<{
        type: string;
        content: Array<{
          type: string;
          text: string;
        }>;
      }>;
    };
  };
} 