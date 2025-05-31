import * as vscode from 'vscode';

// Types
export interface JiraTicket {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      accountId: string;
    };
    reporter?: {
      displayName: string;
      accountId: string;
    };
    created: string;
    updated: string;
    priority?: {
      name: string;
      id: string;
    };
    project: {
      key: string;
      name: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    labels: string[];
    customfield_10016?: string; // Story Points
    customfield_10014?: string; // Sprint
    customfield_10015?: {      // Epic Link
      id: string;
      key: string;
      fields: {
        summary: string;
      };
    };
    customfield_10017?: string; // Epic Name
    customfield_10018?: {      // Acceptance Criteria
      type: string;
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

interface JiraProject {
  key: string;
  name: string;
  id: string;
  lead: {
    displayName: string;
    accountId: string;
  };
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: string;
}

interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

// Configuration
const getConfig = () => {
  const config = vscode.workspace.getConfiguration('jiraAssistant');
  const jiraUrl = config.get<string>('jiraUrl');
  const token = config.get<string>('apiToken');
  const email = config.get<string>('email');

  if (!jiraUrl || !token || !email) {
    throw new Error('Missing configuration. Please configure Jira settings first.');
  }

  return { jiraUrl, token, email };
};

// API Functions
export const fetchJiraTicket = async (url: string): Promise<ApiResponse<JiraTicket>> => {
  try {
    const config = vscode.workspace.getConfiguration('jiraAssistant');
    const jiraUrl = config.get<string>('jiraUrl');
    const token = await vscode.workspace.getConfiguration('jiraAssistant').get<string>('apiToken');
    const email = await vscode.workspace.getConfiguration('jiraAssistant').get<string>('email');
    
    if (!jiraUrl || !token || !email) {
      return {
        error: 'Missing configuration',
        details: 'Please configure Jira URL, email, and API token in settings'
      };
    }

    // Clean and validate Jira URL
    const cleanJiraUrl = jiraUrl.trim().replace(/\/$/, '');
    
    // Extract ticket key from URL
    let ticketKey = '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      ticketKey = pathParts[pathParts.length - 1];
    } catch (e) {
      // If URL parsing fails, try to extract key directly
      const match = url.match(/([A-Z]+-\d+)/);
      if (match) {
        ticketKey = match[1];
      }
    }

    if (!ticketKey) {
      return {
        error: 'Invalid ticket URL',
        details: 'Could not extract ticket key from URL. Please provide a valid Jira ticket URL or key (e.g., PROJ-123)'
      };
    }

    const apiUrl = `${cleanJiraUrl}/rest/api/2/issue/${ticketKey}?expand=renderedFields`;
    console.log(`Fetching ticket from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        error: 'Invalid response format',
        details: `Expected JSON but got ${contentType || 'unknown content type'}. Please check your Jira URL and authentication.`
      };
    }

    const data = await response.json() as JiraTicket | JiraErrorResponse;
    
    if (!response.ok) {
      const errorData = data as JiraErrorResponse;
      const errorMessage = errorData.errorMessages?.[0] || 'Failed to fetch ticket';
      const errorDetails = errorData.errors ? JSON.stringify(errorData.errors) : `HTTP ${response.status}: ${response.statusText}`;
      
      return {
        error: errorMessage,
        details: `${errorDetails}\n\nPlease check:\n1. Your Jira URL is correct (${cleanJiraUrl})\n2. Your email and API token are valid\n3. You have permission to view this ticket\n4. The ticket key is correct (${ticketKey})`
      };
    }

    // Ensure the ticket data has the required fields
    const ticket = data as JiraTicket;
    if (!ticket.fields) {
      return {
        error: 'Invalid ticket data',
        details: 'The ticket data is missing required fields'
      };
    }

    // Ensure labels array exists
    if (!ticket.fields.labels) {
      ticket.fields.labels = [];
    }

    return { data: ticket };
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const fetchProjects = async (): Promise<ApiResponse<JiraProject[]>> => {
  try {
    const { jiraUrl, token, email } = getConfig();

    const response = await fetch(`${jiraUrl}/rest/api/2/project`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json() as JiraProject[] | JiraErrorResponse;
    
    if (!response.ok) {
      const errorData = data as JiraErrorResponse;
      return {
        error: errorData.errorMessages?.[0] || 'Failed to fetch projects',
        details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
      };
    }

    return { data: data as JiraProject[] };
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const fetchSprints = async (boardId: number): Promise<ApiResponse<JiraSprint[]>> => {
  try {
    const { jiraUrl, token, email } = getConfig();

    const response = await fetch(`${jiraUrl}/rest/agile/1.0/board/${boardId}/sprint`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json() as { values: JiraSprint[] } | JiraErrorResponse;
    
    if (!response.ok) {
      const errorData = data as JiraErrorResponse;
      return {
        error: errorData.errorMessages?.[0] || 'Failed to fetch sprints',
        details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
      };
    }

    return { data: (data as { values: JiraSprint[] }).values };
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const createIssue = async (
  projectKey: string,
  summary: string,
  description: string,
  issueType: string
): Promise<ApiResponse<JiraTicket>> => {
  try {
    const { jiraUrl, token, email } = getConfig();

    const response = await fetch(`${jiraUrl}/rest/api/2/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description,
          issuetype: { name: issueType }
        }
      })
    });

    const data = await response.json() as JiraTicket | JiraErrorResponse;
    
    if (!response.ok) {
      const errorData = data as JiraErrorResponse;
      return {
        error: errorData.errorMessages?.[0] || 'Failed to create issue',
        details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
      };
    }

    return { data: data as JiraTicket };
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const transitionIssue = async (
  issueKey: string,
  transitionId: string
): Promise<ApiResponse<void>> => {
  try {
    const { jiraUrl, token, email } = getConfig();

    const response = await fetch(`${jiraUrl}/rest/api/2/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transition: { id: transitionId }
      })
    });

    if (!response.ok) {
      const data = await response.json() as JiraErrorResponse;
      return {
        error: data.errorMessages?.[0] || 'Failed to transition issue',
        details: data.errors ? JSON.stringify(data.errors) : undefined
      };
    }

    return {};
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const logTime = async (
  issueKey: string,
  timeSpentSeconds: number,
  comment?: string
): Promise<ApiResponse<void>> => {
  try {
    const { jiraUrl, token, email } = getConfig();

    const response = await fetch(`${jiraUrl}/rest/api/2/issue/${issueKey}/worklog`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeSpentSeconds,
        comment
      })
    });

    if (!response.ok) {
      const data = await response.json() as JiraErrorResponse;
      return {
        error: data.errorMessages?.[0] || 'Failed to log time',
        details: data.errors ? JSON.stringify(data.errors) : undefined
      };
    }

    return {};
  } catch (error) {
    return {
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const authenticateJira = async (): Promise<void> => {
  const config = vscode.workspace.getConfiguration('jiraAssistant');
  
  const jiraUrl = await vscode.window.showInputBox({
    prompt: 'Enter your Jira instance URL',
    placeHolder: 'https://your-domain.atlassian.net'
  });

  if (jiraUrl) {
    await config.update('jiraUrl', jiraUrl, true);
  }

  const email = await vscode.window.showInputBox({
    prompt: 'Enter your Atlassian account email',
    placeHolder: 'your.email@example.com'
  });

  if (email) {
    await config.update('email', email, true);
  }

  const apiToken = await vscode.window.showInputBox({
    prompt: 'Enter your Jira API token',
    password: true
  });

  if (apiToken) {
    await config.update('apiToken', apiToken, true);
  }
}; 