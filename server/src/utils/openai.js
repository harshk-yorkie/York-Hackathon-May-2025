// helpers/gptHelper.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractPlainTextFromDescription(description) {
    if (!description || !description.content) return '';
    return description.content
        .map((node) => {
            if (node.content) {
                return node.content.map((child) => child.text || '').join('');
            }
            return '';
        })
        .join('\n');
}


export async function extractRequirementsWithLLM(ticket) {
    const title = ticket.fields.summary;
    const description = extractPlainTextFromDescription(ticket.fields.description);
    const ticketKey = ticket.key;
    const status = ticket.fields.status.name;
    const projectName = ticket.fields.project.name;
    const priority = ticket.fields.priority.name;
    const labels = ticket.fields.labels || [];

    console.log("title::", title)
    console.log("description::", description)
    console.log("ticketKey::", ticketKey)
    console.log("status::", status)
    console.log("projectName::", projectName)
    console.log("priority::", priority)
    console.log("labels::", labels)


    const prompt = `
You are an advanced software engineer AI assistant integrated into a CI/CD environment. Given a Jira ticket, your tasks are:

---

### 🔹 Extract Requirements
1. **Code Requirements**  List all technical tasks that must be implemented (e.g., "Add user authentication endpoint").
2. **Acceptance Criteria**  Define specific success conditions (e.g., "JWT support", "≥80% test coverage", "Responsive table layout").

---

### 🔹 Generate Code
Write fully working, complete, production-ready code that can be directly copied and run without further modification. The code must not contain any placeholders, stubs, or comments like "implement here" or "write tests here". All functions must be implemented, types defined, and files must be complete and ready to use.  Ensure:
- Every file is complete and immediately usable.
- All functions are fully implemented — no placeholders or comments like "implement here".
- Follow the appropriate language and project structure.
- Respect existing linting/formatting rules (e.g., ESLint, Prettier).
- Files are correctly named and structured (e.g., \`src/components/WeatherTable.tsx\`).
- Avoid hardcoded values; ensure reusability and adherence to SOLID principles.

---

### 🔹 Write Automated Tests
Write comprehensive unit and integration tests:
- Use the correct testing framework (e.g., Jest, Mocha, Pytest).
- Ensure ≥80% test coverage.
- Include edge cases and error handling.
- Place tests in the proper test directory.

---

### 🔹 Git & Collaboration Automation
Generate the following Git operations:
- Branch name: \`feature/${ticketKey}-${title.toLowerCase().replace(/\s+/g, '-')}\`
- Commit message and PR:
  - **Title**: \`[${ticketKey}] ${title}\`
  - **Description**:
    - Summary of changes
    - List of files created/modified
    - Link to original Jira ticket

---

### 🔹 Jira Ticket Enhancements
Generate a comment for the Jira ticket containing:
- **QA Test Steps** (e.g., "1. Go to /compare; 2. Select multiple cities; 3. Verify correct weather data")
- **Peer Review Checklist** (e.g., "✅ Code follows lint rules", "✅ Handles edge cases", "✅ Test coverage ≥80%")
- Ticket transition recommendation (e.g., ${status} → Code Review)

---

### 🧾 Jira Ticket Metadata:
- **Title**: ${title}
- **Description**: ${description}
- **Ticket Key**: ${ticketKey}
- **Project**: ${projectName}
- **Labels**: ${labels.join(', ') || '[]'}
- **Priority**: ${priority}
- **Status**: ${status}

---

### ✅ Final Output Format (JSON):

{
  "requirements": {
    "codeTasks": [
      "Implement a responsive table component for comparing weather data of multiple cities.",
      "Fetch weather data from OpenWeatherMap API for selected cities.",
      "Allow dynamic city selection via dropdown or search input."
    ],
    "acceptanceCriteria": [
      "Table adjusts correctly on all screen sizes.",
      "Weather data updates in real-time upon city selection.",
      "Code has ≥80% unit test coverage."
    ]
  },
  "code": {
  "fileMap": {
    "src/components/WeatherComparisonTable.tsx": "/* ✅ Full, complete code here */",
    ...
  }
},
"tests": {
  "fileMap": {
    "src/components/__tests__/WeatherComparisonTable.test.tsx": "/* ✅ Full working test cases here */",
    ...
  }
},
  "git": {
    "branchName": "feature/WEAT-1-implement-multi-city-weather-comparison-table",
    "commitMessage": "[WEAT-1] Implement multi-city weather comparison table",
    "prDescription": {
      "summary": "This PR implements a feature that allows users to compare weather across multiple cities in a responsive table view.",
      "filesChanged": [
        "src/components/WeatherComparisonTable.tsx",
        "src/utils/weatherUtils.ts",
        "src/types/index.ts"
      ],
      "jiraLink": "https://yorkhackathonteam15.atlassian.net/browse/WEAT-1"
    }
  },
  "jiraComment": {
    "qaTestSteps": [
      "Navigate to the /compare route.",
      "Select two or more cities.",
      "Ensure the table updates with weather data for each city.",
      "Verify responsiveness on desktop and mobile views."
    ],
    "peerReviewChecklist": [
      "✅ Code adheres to linting and formatting rules.",
      "✅ Handles edge cases (e.g., invalid city input).",
      "✅ Test coverage ≥80% with meaningful test cases.",
      "✅ Clean separation of concerns and modular code."
    ],
    "recommendedTransition": "To Do → In Review"
  }
}

`;
    console.log('::::::::::::::::::::::::::::::::::::::::gpt-4 start')
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
    });
    console.log('::::::::::::::::::::::::::::::::::::::::test')

    const output = response.choices[0].message?.content;
    return JSON.parse(output || '{}');
}
