import * as vscode from 'vscode';

interface LLMResponse {
  codeRequirements: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
}

interface OpenAIError {
  error?: {
    message: string;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function analyzeTicketWithLLM(prompt: string): Promise<LLMResponse> {
  const config = vscode.workspace.getConfiguration('jiraAssistant');
  const apiKey = config.get<string>('openaiApiKey');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in settings.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a technical requirements analyzer. Extract and categorize requirements from Jira tickets into code requirements, acceptance criteria, and technical notes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json() as OpenAIError;
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as OpenAIResponse;
    const content = data.choices[0].message.content;

    // Parse the LLM response into structured data
    return parseLLMResponse(content);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`LLM analysis failed: ${errorMessage}`);
    throw error;
  }
}

function parseLLMResponse(content: string): LLMResponse {
  const response: LLMResponse = {
    codeRequirements: [],
    acceptanceCriteria: [],
    technicalNotes: []
  };

  const sections = content.split('\n\n');
  let currentSection: keyof LLMResponse | null = null;

  sections.forEach(section => {
    const lines = section.split('\n');
    const header = lines[0].toLowerCase();

    if (header.includes('code requirements')) {
      currentSection = 'codeRequirements';
    } else if (header.includes('acceptance criteria')) {
      currentSection = 'technicalNotes';
    } else if (header.includes('technical notes')) {
      currentSection = 'technicalNotes';
    } else if (currentSection && lines[0].trim()) {
      response[currentSection].push(lines[0].trim());
    }
  });

  return response;
} 