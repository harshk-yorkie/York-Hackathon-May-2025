import * as vscode from 'vscode';
import { 
  authenticateJira, 
  fetchJiraTicket, 
  fetchProjects, 
  fetchSprints,
  createIssue,
  transitionIssue,
  logTime,
  JiraTicket
} from './jiraApi';
import { parseTicketRequirements, ParsedRequirements } from './requirementsParser';

export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Assistant is now active!');

    // Authentication command
    let authenticateCommand = vscode.commands.registerCommand('jira-assistant.authenticate', async () => {
        try {
            await authenticateJira();
            vscode.window.showInformationMessage('Successfully configured Jira settings!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to configure Jira: ${error}`);
        }
    });

    // Fetch ticket command
    let fetchTicketCommand = vscode.commands.registerCommand('jira-assistant.fetchTicket', async () => {
        try {
            const ticketUrl = await vscode.window.showInputBox({
                prompt: 'Enter Jira ticket URL or key',
                placeHolder: 'https://your-domain.atlassian.net/browse/PROJ-123 or PROJ-123'
            });

            if (!ticketUrl) {
                return;
            }

            const result = await fetchJiraTicket(ticketUrl);
            
            if (result.error) {
                vscode.window.showErrorMessage(`Error: ${result.error}\n${result.details || ''}`);
                return;
            }

            if (!result.data) {
                vscode.window.showErrorMessage('No ticket data received from Jira');
                return;
            }

            const ticketData = result.data;

            // Parse requirements
            const requirements = await parseTicketRequirements(ticketData);

            // Create and show a new webview panel
            const panel = vscode.window.createWebviewPanel(
                'jiraTicket',
                `Jira Ticket: ${ticketData.key}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            // Generate HTML content
            panel.webview.html = getWebviewContent(ticketData, requirements);

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    if (!ticketData) return; // Ensure ticketData is available

                    switch (message.command) {
                        case 'transition':
                            const transitionResult = await transitionIssue(ticketData.key, message.transitionId);
                            if (transitionResult.error) {
                                vscode.window.showErrorMessage(`Failed to transition: ${transitionResult.error}`);
                            } else {
                                vscode.window.showInformationMessage('Issue transitioned successfully');
                                // Refresh the ticket view
                                const updatedTicket = await fetchJiraTicket(ticketUrl);
                                if (updatedTicket.data) {
                                    panel.webview.html = getWebviewContent(updatedTicket.data, await parseTicketRequirements(updatedTicket.data));
                                } else if (updatedTicket.error) {
                                     vscode.window.showErrorMessage(`Error refreshing ticket: ${updatedTicket.error}\n${updatedTicket.details || ''}`);
                                }
                            }
                            break;
                        case 'logTime':
                            const timeResult = await logTime(ticketData.key, message.timeSpentSeconds, message.comment);
                            if (timeResult.error) {
                                vscode.window.showErrorMessage(`Failed to log time: ${timeResult.error}`);
                            } else {
                                vscode.window.showInformationMessage('Time logged successfully');
                                // Refresh the ticket view
                                const updatedTicket = await fetchJiraTicket(ticketUrl);
                                if (updatedTicket.data) {
                                    panel.webview.html = getWebviewContent(updatedTicket.data, await parseTicketRequirements(updatedTicket.data));
                                } else if (updatedTicket.error) {
                                     vscode.window.showErrorMessage(`Error refreshing ticket: ${updatedTicket.error}\n${updatedTicket.details || ''}`);
                                }
                            }
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching ticket: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
    });

    // List projects command
    let listProjectsCommand = vscode.commands.registerCommand('jira-assistant.listProjects', async () => {
        try {
            const result = await fetchProjects();
            
            if (result.error) {
                vscode.window.showErrorMessage(`Error: ${result.error}`);
                if (result.details) {
                    vscode.window.showErrorMessage(`Details: ${result.details}`);
                }
                return;
            }

            if (!result.data) {
                vscode.window.showErrorMessage('No projects found');
                return;
            }

            const projectNames = result.data.map(p => `${p.key} - ${p.name}`);
            const selectedProject = await vscode.window.showQuickPick(projectNames, {
                placeHolder: 'Select a project'
            });

            if (selectedProject) {
                const projectKey = selectedProject.split(' - ')[0];
                // TODO: Show project details or open project board
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch projects: ${error}`);
        }
    });

    // Create issue command
    let createIssueCommand = vscode.commands.registerCommand('jira-assistant.createIssue', async () => {
        try {
            // Get project list
            const projectsResult = await fetchProjects();
            if (projectsResult.error || !projectsResult.data) {
                vscode.window.showErrorMessage('Failed to fetch projects');
                return;
            }

            const projectNames = projectsResult.data.map(p => `${p.key} - ${p.name}`);
            const selectedProject = await vscode.window.showQuickPick(projectNames, {
                placeHolder: 'Select a project'
            });

            if (!selectedProject) {
                return;
            }

            const projectKey = selectedProject.split(' - ')[0];

            // Get issue details
            const summary = await vscode.window.showInputBox({
                prompt: 'Enter issue summary',
                placeHolder: 'Brief description of the issue'
            });

            if (!summary) {
                return;
            }

            const description = await vscode.window.showInputBox({
                prompt: 'Enter issue description',
                placeHolder: 'Detailed description of the issue'
            });

            if (!description) {
                return;
            }

            const issueType = await vscode.window.showQuickPick(['Bug', 'Task', 'Story', 'Epic'], {
                placeHolder: 'Select issue type'
            });

            if (!issueType) {
                return;
            }

            // Create the issue
            const result = await createIssue(projectKey, summary, description, issueType);
            
            if (result.error) {
                vscode.window.showErrorMessage(`Error: ${result.error}`);
                if (result.details) {
                    vscode.window.showErrorMessage(`Details: ${result.details}`);
                }
                return;
            }

            if (result.data) {
                vscode.window.showInformationMessage(`Issue created: ${result.data.key}`);
                // Open the created issue
                vscode.commands.executeCommand('jira-assistant.fetchTicket', result.data.key);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
        }
    });

    context.subscriptions.push(
        authenticateCommand,
        fetchTicketCommand,
        listProjectsCommand,
        createIssueCommand
    );
}

function getWebviewContent(ticket: JiraTicket, parsedRequirements: ParsedRequirements): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Jira Ticket: ${ticket.key}</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-editor-foreground);
          background-color: var(--vscode-editor-background);
        }
        .section {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-textSeparator-foreground);
        }
        h2 {
          color: var(--vscode-textLink-foreground);
          border-bottom: 1px solid var(--vscode-textSeparator-foreground);
          padding-bottom: 5px;
          margin-top: 0;
        }
        .label {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          margin-right: 5px;
          margin-bottom: 5px;
          font-size: 0.9em;
        }
        .requirement-item, .criteria-item, .note-item {
          margin: 5px 0;
          padding: 8px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 4px;
          border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .ticket-detail {
          margin: 5px 0;
          line-height: 1.4;
        }
        .ticket-detail strong {
          color: var(--vscode-textLink-foreground);
        }
        .empty-section {
          color: var(--vscode-descriptionForeground);
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="section">
        <h2>Ticket Details</h2>
        <div class="ticket-detail"><strong>Key:</strong> ${ticket.key}</div>
        <div class="ticket-detail"><strong>Summary:</strong> ${ticket.fields.summary}</div>
        <div class="ticket-detail"><strong>Status:</strong> ${ticket.fields.status.name}</div>
        <div class="ticket-detail"><strong>Type:</strong> ${ticket.fields.issuetype.name}</div>
        ${ticket.fields.assignee ? `<div class="ticket-detail"><strong>Assignee:</strong> ${ticket.fields.assignee.displayName}</div>` : ''}
        ${ticket.fields.reporter ? `<div class="ticket-detail"><strong>Reporter:</strong> ${ticket.fields.reporter.displayName}</div>` : ''}
        ${ticket.fields.priority ? `<div class="ticket-detail"><strong>Priority:</strong> ${ticket.fields.priority.name}</div>` : ''}
      </div>

      <div class="section">
        <h2>Code Requirements</h2>
        ${parsedRequirements.codeRequirements.length > 0 
          ? parsedRequirements.codeRequirements.map(req => 
              `<div class="requirement-item">${req}</div>`
            ).join('')
          : '<div class="empty-section">No code requirements specified</div>'
        }
      </div>

      <div class="section">
        <h2>Acceptance Criteria</h2>
        ${parsedRequirements.acceptanceCriteria.length > 0
          ? parsedRequirements.acceptanceCriteria.map(criteria => 
              `<div class="criteria-item">${criteria}</div>`
            ).join('')
          : '<div class="empty-section">No acceptance criteria specified</div>'
        }
      </div>

      <div class="section">
        <h2>Technical Notes</h2>
        ${parsedRequirements.technicalNotes.length > 0
          ? parsedRequirements.technicalNotes.map(note => 
              `<div class="note-item">${note}</div>`
            ).join('')
          : '<div class="empty-section">No technical notes specified</div>'
        }
      </div>

      <div class="section">
        <h2>Labels</h2>
        ${ticket.fields.labels.length > 0
          ? ticket.fields.labels.map(label => 
              `<span class="label">${label}</span>`
            ).join('')
          : '<div class="empty-section">No labels specified</div>'
        }
      </div>
    </body>
    </html>`;
}

export function deactivate() {} 