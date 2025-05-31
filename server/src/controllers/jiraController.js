import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
/**
 * Extracts the Jira ticket key from a full URL.
 * E.g., https://your-org.atlassian.net/browse/DEV-123 => DEV-123
 */
function extractTicketKey(jiraUrl) {
    const regex = /\/browse\/([A-Z]+-\d+)/i;
    const match = jiraUrl.match(regex);
    return match ? match[1] : null;
}

export async function fetchJiraTicketDetails(req, res) {
    try {
        const { jiraUrl } = req.body;

        console.log("jiraUrl::::::::::", jiraUrl)

        if (!jiraUrl) {
            return res.status(400).json({ error: 'jiraUrl is required' });
        }

        // Extract issue key
        const issueKey = extractTicketKey(jiraUrl);
        if (!issueKey) {
            return res.status(400).json({ error: 'Invalid Jira ticket URL' });
        }
        console.log("issueKey:::::::::", issueKey)
        // Get access token (update this if you're using a different path)
        const accessToken = req.accessToken;
        if (!accessToken) {
            return res.status(401).json({ error: 'No Jira access token found' });
        }

        console.log("accessToken::::::::::", accessToken)

        // Extract Jira domain from URL (more robust)
        const jiraDomainMatch = jiraUrl.match(/^https:\/\/([^\/]+)/);
        if (!jiraDomainMatch) {
            return res.status(400).json({ error: 'Invalid Jira URL' });
        }

        const jiraDomain = jiraDomainMatch[1];

        console.log("jiraDomain::::::::::", jiraDomain)
        const apiUrl = `https://${jiraDomain}/rest/api/3/issue/${issueKey}`;

        console.log("apiUrl::::::::::::", apiUrl)

        // Fetch issue details
        const response = await axios.get(apiUrl,{
            // headers: {
            //     'Authorization': `Bearer ${accessToken}`,
            //     'Accept': 'application/json'
            //   }
              headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json'
              }
    });

        const issueData = response.data;

        console.log("issueData::::::::::::::::::::::::", issueData)
        // Handle description formatting
        let description = '';
        if (typeof issueData.fields.description === 'string') {
            description = issueData.fields.description;
        } else if (issueData.fields.description?.content) {
            description = issueData.fields.description.content
                .map(c =>
                    c.content?.map(cc => cc.text).join('') || ''
                ).join('\n');
        }

        // Final formatted result
        const result = {
            key: issueData.key,
            title: issueData.fields.summary,
            description,
            
            // User-related
            assignee: issueData.fields.assignee?.displayName || null,
            reporter: issueData.fields.reporter?.displayName || null,
            creator: issueData.fields.creator?.displayName || null,
          
            // Status-related
            status: issueData.fields.status?.name || '',
            statusCategory: issueData.fields.status?.statusCategory?.name || '',
          
            // Project info
            project: {
              key: issueData.fields.project?.key,
              name: issueData.fields.project?.name,
              type: issueData.fields.project?.projectTypeKey,
            },
          
            // Issue type
            issueType: {
              name: issueData.fields.issuetype?.name,
              description: issueData.fields.issuetype?.description,
              iconUrl: issueData.fields.issuetype?.iconUrl,
            },
          
            // Priority
            priority: issueData.fields.priority?.name || '',
          
            // Time tracking
            timeTracking: {
              originalEstimate: issueData.fields.timetracking?.originalEstimate || '0m',
              remainingEstimate: issueData.fields.timetracking?.remainingEstimate || '0m',
              timeSpent: issueData.fields.timetracking?.timeSpent || '0m',
            },
          
            // Time
            createdAt: issueData.fields.created,
            updatedAt: issueData.fields.updated,
            resolutionDate: issueData.fields.resolutiondate,
          
            // Misc
            labels: issueData.fields.labels || [],
            components: issueData.fields.components?.map(c => c.name) || [],
            versions: issueData.fields.versions?.map(v => v.name) || [],
            fixVersions: issueData.fields.fixVersions?.map(v => v.name) || [],
            dueDate: issueData.fields.duedate,
            environment: issueData.fields.environment || null,
            watchers: issueData.fields.watches?.watchCount || 0,
            isWatching: issueData.fields.watches?.isWatching || false,
            votes: issueData.fields.votes?.votes || 0,
            hasVoted: issueData.fields.votes?.hasVoted || false,
          };
          

        console.log("result:::::::::::",result)

        return res.json(result);
    } catch (error) {
        console.error('Error fetching Jira ticket:', error);

        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Failed to fetch Jira issue',
                details: error.response.data,
            });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}
