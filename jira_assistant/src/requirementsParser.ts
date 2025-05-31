import * as vscode from 'vscode';
import { JiraTicket } from './jiraApi';
import { analyzeTicketWithLLM } from './llmService';

export interface ParsedRequirements {
  codeRequirements: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
}

export async function parseTicketRequirements(ticket: JiraTicket): Promise<ParsedRequirements> {
  // Extract relevant information from the ticket
  const ticketInfo = {
    summary: ticket.fields.summary,
    description: ticket.fields.description || '',
    labels: ticket.fields.labels || [],
    acceptanceCriteria: extractAcceptanceCriteria(ticket),
  };

  // Create a prompt for the LLM
  const prompt = createPrompt(ticketInfo);

  try {
    // Try to use LLM first
    const config = vscode.workspace.getConfiguration('jiraAssistant');
    const useLLM = config.get<boolean>('useLLM') ?? true;

    if (useLLM) {
      try {
        return await analyzeTicketWithLLM(prompt);
      } catch (error) {
        vscode.window.showWarningMessage('LLM analysis failed, falling back to local parsing');
        // Fall back to local parsing if LLM fails
        return parseRequirementsLocally(ticketInfo);
      }
    } else {
      // Use local parsing if LLM is disabled
      return parseRequirementsLocally(ticketInfo);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to parse requirements: ${error}`);
    throw error;
  }
}

function extractAcceptanceCriteria(ticket: JiraTicket): string[] {
  const criteria: string[] = [];
  
  if (ticket.fields.customfield_10018?.content) {
    ticket.fields.customfield_10018.content.forEach(item => {
      item.content.forEach(content => {
        if (content.type === 'text' && content.text.trim()) {
          criteria.push(content.text.trim());
        }
      });
    });
  }

  // If no acceptance criteria in custom field, try to extract from description
  if (criteria.length === 0 && ticket.fields.description) {
    const description = ticket.fields.description;
    const criteriaMatch = description.match(/Acceptance Criteria:([\s\S]*?)(?=Technical Notes:|$)/i);
    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1].trim();
      criteria.push(...criteriaText.split('\n').map(line => line.trim()).filter(line => line));
    }
  }

  return criteria;
}

function createPrompt(ticketInfo: {
  summary: string;
  description: string;
  labels: string[];
  acceptanceCriteria: string[];
}): string {
  return `
Please analyze this Jira ticket and extract the following:

1. Code Requirements:
- Technical tasks that need to be implemented
- API endpoints to be created/modified
- Database changes required
- Integration points

2. Acceptance Criteria:
- Test requirements
- Performance criteria
- Security requirements
- User acceptance criteria

3. Technical Notes:
- Important technical considerations
- Dependencies
- Architecture decisions
- Performance implications

Ticket Summary: ${ticketInfo.summary}
Description: ${ticketInfo.description}
Labels: ${ticketInfo.labels.join(', ')}
Acceptance Criteria: ${ticketInfo.acceptanceCriteria.join('\n')}
`;
}

function parseRequirementsLocally(ticketInfo: {
  summary: string;
  description: string;
  labels: string[];
  acceptanceCriteria: string[];
}): ParsedRequirements {
  const codeRequirements: string[] = [];
  const technicalNotes: string[] = [];

  const descriptionLines = ticketInfo.description.split('\n');
  let currentSection: 'requirements' | 'notes' | null = null;

  descriptionLines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    if (trimmedLine.toLowerCase().includes('code requirements:')) {
      currentSection = 'requirements';
    } else if (trimmedLine.toLowerCase().includes('technical notes:')) {
      currentSection = 'notes';
    } else if (trimmedLine.toLowerCase().includes('acceptance criteria:')) {
      currentSection = null; // Acceptance criteria handled separately
    } else if (currentSection === 'requirements' && trimmedLine.startsWith('-')) {
      codeRequirements.push(trimmedLine.substring(1).trim());
    } else if (currentSection === 'notes' && trimmedLine.startsWith('-')) {
      technicalNotes.push(trimmedLine.substring(1).trim());
    }
  });

  // If no requirements found in sections, try to extract from summary
  if (codeRequirements.length === 0) {
    const summaryWords = ticketInfo.summary.toLowerCase().split(' ');
    if (summaryWords.includes('implement') || summaryWords.includes('create') || summaryWords.includes('add')) {
      codeRequirements.push(ticketInfo.summary);
    }
  }

  return {
    codeRequirements,
    acceptanceCriteria: ticketInfo.acceptanceCriteria.length > 0 ? ticketInfo.acceptanceCriteria : extractAcceptanceCriteriaFromDescription(ticketInfo.description),
    technicalNotes
  };
}

function extractAcceptanceCriteriaFromDescription(description: string): string[] {
    const criteria: string[] = [];
    const descriptionLines = description.split('\n');
    let inCriteriaSection = false;

    descriptionLines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        if (trimmedLine.toLowerCase().includes('acceptance criteria:')) {
            inCriteriaSection = true;
            return;
        }

        if (inCriteriaSection) {
            if (trimmedLine.toLowerCase().includes('technical notes:') || trimmedLine.toLowerCase().includes('code requirements:')) {
                inCriteriaSection = false;
                return;
            }
            if (trimmedLine.startsWith('-')) {
                criteria.push(trimmedLine.substring(1).trim());
            } else if (trimmedLine.startsWith('+')) {
                 criteria.push(trimmedLine.substring(1).trim());
            }
        }
    });
    return criteria;
} 