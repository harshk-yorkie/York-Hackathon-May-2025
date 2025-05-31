/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authenticateJira = exports.logTime = exports.transitionIssue = exports.createIssue = exports.fetchSprints = exports.fetchProjects = exports.fetchJiraTicket = void 0;
const vscode = __webpack_require__(1);
// Configuration
const getConfig = () => {
    const config = vscode.workspace.getConfiguration('jiraAssistant');
    const jiraUrl = config.get('jiraUrl');
    const token = config.get('apiToken');
    const email = config.get('email');
    if (!jiraUrl || !token || !email) {
        throw new Error('Missing configuration. Please configure Jira settings first.');
    }
    return { jiraUrl, token, email };
};
// API Functions
const fetchJiraTicket = async (url) => {
    try {
        const config = vscode.workspace.getConfiguration('jiraAssistant');
        const jiraUrl = config.get('jiraUrl');
        const token = await vscode.workspace.getConfiguration('jiraAssistant').get('apiToken');
        const email = await vscode.workspace.getConfiguration('jiraAssistant').get('email');
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
        }
        catch (e) {
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
        const data = await response.json();
        if (!response.ok) {
            const errorData = data;
            const errorMessage = errorData.errorMessages?.[0] || 'Failed to fetch ticket';
            const errorDetails = errorData.errors ? JSON.stringify(errorData.errors) : `HTTP ${response.status}: ${response.statusText}`;
            return {
                error: errorMessage,
                details: `${errorDetails}\n\nPlease check:\n1. Your Jira URL is correct (${cleanJiraUrl})\n2. Your email and API token are valid\n3. You have permission to view this ticket\n4. The ticket key is correct (${ticketKey})`
            };
        }
        // Ensure the ticket data has the required fields
        const ticket = data;
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
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.fetchJiraTicket = fetchJiraTicket;
const fetchProjects = async () => {
    try {
        const { jiraUrl, token, email } = getConfig();
        const response = await fetch(`${jiraUrl}/rest/api/2/project`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok) {
            const errorData = data;
            return {
                error: errorData.errorMessages?.[0] || 'Failed to fetch projects',
                details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
            };
        }
        return { data: data };
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.fetchProjects = fetchProjects;
const fetchSprints = async (boardId) => {
    try {
        const { jiraUrl, token, email } = getConfig();
        const response = await fetch(`${jiraUrl}/rest/agile/1.0/board/${boardId}/sprint`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok) {
            const errorData = data;
            return {
                error: errorData.errorMessages?.[0] || 'Failed to fetch sprints',
                details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
            };
        }
        return { data: data.values };
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.fetchSprints = fetchSprints;
const createIssue = async (projectKey, summary, description, issueType) => {
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
        const data = await response.json();
        if (!response.ok) {
            const errorData = data;
            return {
                error: errorData.errorMessages?.[0] || 'Failed to create issue',
                details: errorData.errors ? JSON.stringify(errorData.errors) : undefined
            };
        }
        return { data: data };
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.createIssue = createIssue;
const transitionIssue = async (issueKey, transitionId) => {
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
            const data = await response.json();
            return {
                error: data.errorMessages?.[0] || 'Failed to transition issue',
                details: data.errors ? JSON.stringify(data.errors) : undefined
            };
        }
        return {};
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.transitionIssue = transitionIssue;
const logTime = async (issueKey, timeSpentSeconds, comment) => {
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
            const data = await response.json();
            return {
                error: data.errorMessages?.[0] || 'Failed to log time',
                details: data.errors ? JSON.stringify(data.errors) : undefined
            };
        }
        return {};
    }
    catch (error) {
        return {
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};
exports.logTime = logTime;
const authenticateJira = async () => {
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
exports.authenticateJira = authenticateJira;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseTicketRequirements = parseTicketRequirements;
const vscode = __webpack_require__(1);
const llmService_1 = __webpack_require__(4);
async function parseTicketRequirements(ticket) {
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
        const useLLM = config.get('useLLM') ?? true;
        if (useLLM) {
            try {
                return await (0, llmService_1.analyzeTicketWithLLM)(prompt);
            }
            catch (error) {
                vscode.window.showWarningMessage('LLM analysis failed, falling back to local parsing');
                // Fall back to local parsing if LLM fails
                return parseRequirementsLocally(ticketInfo);
            }
        }
        else {
            // Use local parsing if LLM is disabled
            return parseRequirementsLocally(ticketInfo);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to parse requirements: ${error}`);
        throw error;
    }
}
function extractAcceptanceCriteria(ticket) {
    const criteria = [];
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
function createPrompt(ticketInfo) {
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
function parseRequirementsLocally(ticketInfo) {
    const codeRequirements = [];
    const technicalNotes = [];
    const descriptionLines = ticketInfo.description.split('\n');
    let currentSection = null;
    descriptionLines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine)
            return;
        if (trimmedLine.toLowerCase().includes('code requirements:')) {
            currentSection = 'requirements';
        }
        else if (trimmedLine.toLowerCase().includes('technical notes:')) {
            currentSection = 'notes';
        }
        else if (trimmedLine.toLowerCase().includes('acceptance criteria:')) {
            currentSection = null; // Acceptance criteria handled separately
        }
        else if (currentSection === 'requirements' && trimmedLine.startsWith('-')) {
            codeRequirements.push(trimmedLine.substring(1).trim());
        }
        else if (currentSection === 'notes' && trimmedLine.startsWith('-')) {
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
function extractAcceptanceCriteriaFromDescription(description) {
    const criteria = [];
    const descriptionLines = description.split('\n');
    let inCriteriaSection = false;
    descriptionLines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine)
            return;
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
            }
            else if (trimmedLine.startsWith('+')) {
                criteria.push(trimmedLine.substring(1).trim());
            }
        }
    });
    return criteria;
}


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.analyzeTicketWithLLM = analyzeTicketWithLLM;
const vscode = __webpack_require__(1);
async function analyzeTicketWithLLM(prompt) {
    const config = vscode.workspace.getConfiguration('jiraAssistant');
    const apiKey = config.get('openaiApiKey');
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
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        const content = data.choices[0].message.content;
        // Parse the LLM response into structured data
        return parseLLMResponse(content);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`LLM analysis failed: ${errorMessage}`);
        throw error;
    }
}
function parseLLMResponse(content) {
    const response = {
        codeRequirements: [],
        acceptanceCriteria: [],
        technicalNotes: []
    };
    const sections = content.split('\n\n');
    let currentSection = null;
    sections.forEach(section => {
        const lines = section.split('\n');
        const header = lines[0].toLowerCase();
        if (header.includes('code requirements')) {
            currentSection = 'codeRequirements';
        }
        else if (header.includes('acceptance criteria')) {
            currentSection = 'technicalNotes';
        }
        else if (header.includes('technical notes')) {
            currentSection = 'technicalNotes';
        }
        else if (currentSection && lines[0].trim()) {
            response[currentSection].push(lines[0].trim());
        }
    });
    return response;
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __webpack_require__(1);
const jiraApi_1 = __webpack_require__(2);
const requirementsParser_1 = __webpack_require__(3);
function activate(context) {
    console.log('Jira Assistant is now active!');
    // Authentication command
    let authenticateCommand = vscode.commands.registerCommand('jira-assistant.authenticate', async () => {
        try {
            await (0, jiraApi_1.authenticateJira)();
            vscode.window.showInformationMessage('Successfully configured Jira settings!');
        }
        catch (error) {
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
            const result = await (0, jiraApi_1.fetchJiraTicket)(ticketUrl);
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
            const requirements = await (0, requirementsParser_1.parseTicketRequirements)(ticketData);
            // Create and show a new webview panel
            const panel = vscode.window.createWebviewPanel('jiraTicket', `Jira Ticket: ${ticketData.key}`, vscode.ViewColumn.One, {
                enableScripts: true
            });
            // Generate HTML content
            panel.webview.html = getWebviewContent(ticketData, requirements);
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async (message) => {
                if (!ticketData)
                    return; // Ensure ticketData is available
                switch (message.command) {
                    case 'transition':
                        const transitionResult = await (0, jiraApi_1.transitionIssue)(ticketData.key, message.transitionId);
                        if (transitionResult.error) {
                            vscode.window.showErrorMessage(`Failed to transition: ${transitionResult.error}`);
                        }
                        else {
                            vscode.window.showInformationMessage('Issue transitioned successfully');
                            // Refresh the ticket view
                            const updatedTicket = await (0, jiraApi_1.fetchJiraTicket)(ticketUrl);
                            if (updatedTicket.data) {
                                panel.webview.html = getWebviewContent(updatedTicket.data, await (0, requirementsParser_1.parseTicketRequirements)(updatedTicket.data));
                            }
                            else if (updatedTicket.error) {
                                vscode.window.showErrorMessage(`Error refreshing ticket: ${updatedTicket.error}\n${updatedTicket.details || ''}`);
                            }
                        }
                        break;
                    case 'logTime':
                        const timeResult = await (0, jiraApi_1.logTime)(ticketData.key, message.timeSpentSeconds, message.comment);
                        if (timeResult.error) {
                            vscode.window.showErrorMessage(`Failed to log time: ${timeResult.error}`);
                        }
                        else {
                            vscode.window.showInformationMessage('Time logged successfully');
                            // Refresh the ticket view
                            const updatedTicket = await (0, jiraApi_1.fetchJiraTicket)(ticketUrl);
                            if (updatedTicket.data) {
                                panel.webview.html = getWebviewContent(updatedTicket.data, await (0, requirementsParser_1.parseTicketRequirements)(updatedTicket.data));
                            }
                            else if (updatedTicket.error) {
                                vscode.window.showErrorMessage(`Error refreshing ticket: ${updatedTicket.error}\n${updatedTicket.details || ''}`);
                            }
                        }
                        break;
                }
            }, undefined, context.subscriptions);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error fetching ticket: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
    });
    // List projects command
    let listProjectsCommand = vscode.commands.registerCommand('jira-assistant.listProjects', async () => {
        try {
            const result = await (0, jiraApi_1.fetchProjects)();
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch projects: ${error}`);
        }
    });
    // Create issue command
    let createIssueCommand = vscode.commands.registerCommand('jira-assistant.createIssue', async () => {
        try {
            // Get project list
            const projectsResult = await (0, jiraApi_1.fetchProjects)();
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
            const result = await (0, jiraApi_1.createIssue)(projectKey, summary, description, issueType);
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error}`);
        }
    });
    context.subscriptions.push(authenticateCommand, fetchTicketCommand, listProjectsCommand, createIssueCommand);
}
function getWebviewContent(ticket, parsedRequirements) {
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
        ? parsedRequirements.codeRequirements.map(req => `<div class="requirement-item">${req}</div>`).join('')
        : '<div class="empty-section">No code requirements specified</div>'}
      </div>

      <div class="section">
        <h2>Acceptance Criteria</h2>
        ${parsedRequirements.acceptanceCriteria.length > 0
        ? parsedRequirements.acceptanceCriteria.map(criteria => `<div class="criteria-item">${criteria}</div>`).join('')
        : '<div class="empty-section">No acceptance criteria specified</div>'}
      </div>

      <div class="section">
        <h2>Technical Notes</h2>
        ${parsedRequirements.technicalNotes.length > 0
        ? parsedRequirements.technicalNotes.map(note => `<div class="note-item">${note}</div>`).join('')
        : '<div class="empty-section">No technical notes specified</div>'}
      </div>

      <div class="section">
        <h2>Labels</h2>
        ${ticket.fields.labels.length > 0
        ? ticket.fields.labels.map(label => `<span class="label">${label}</span>`).join('')
        : '<div class="empty-section">No labels specified</div>'}
      </div>
    </body>
    </html>`;
}
function deactivate() { }

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map