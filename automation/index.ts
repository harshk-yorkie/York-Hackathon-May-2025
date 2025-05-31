import express from "express";
import axios from "axios";
import dotenv from "dotenv";

import { fetch } from 'undici';
import simpleGit from "simple-git";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
globalThis.fetch = fetch as any;
dotenv.config();

const app = express();
const PORT = 3000;

const clientId = process.env.ATLASSIAN_CLIENT_ID!;
const clientSecret = process.env.ATLASSIAN_SECRET!;
const redirectUri = process.env.ATLASSIAN_REDIRECT_URI!;
const scopes = "read:jira-work read:jira-user";

app.get("/", (_req, res) => {
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(
    scopes
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&prompt=consent`;
  res.send(`<a href="${authUrl}">Connect with Atlassian</a>`);
});

app.get("/atlassian-verify", async (req, res) => {
  const code = req.query.code as string;

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }, {
      headers: {
        "Content-Type": "application/json"
      }
    }
    );

    const accessToken = tokenRes.data.access_token;

    // Get cloud ID
    const identityRes = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const cloudId = identityRes.data[0].id;

    // Fetch all Jira projects
    const projectsRes = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // // Fetch all Jira issues
    const issuesRes = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const descriptionContent = issuesRes.data.issues[0]['fields']['description']['content'];
    // Extract issues
    let issues = issuesRes.data.issues;
    issues.sort((a: { key: string; }, b: { key: string; }) => {
      const numA = parseInt(a.key.split('-')[1]);
      const numB = parseInt(b.key.split('-')[1]);
      return numA - numB;
    });

    //   // Example output
    //   issues.forEach((issue: { key: any; id: any; fields: { description: any; }; }) => {
    //     const key = issue.key;
    //     const id = issue.id;

    //     console.log(`${key} - ${id}`);

    //     const description = issue.fields.description;

    //     if (description && description.content) {
    //       const plainText = extractPlainTextFromADF(description);
    //       console.log('Description:', plainText);
    //     } else {
    //       console.log('Description: (none)');
    //     }
    //   });
    // } catch (err) {
    //   res.status(500).send("OAuth failed");
    // }

    for (const issue of issues) {
      const key = issue.key;
      const id = issue.id;
      const prompt = extractPlainTextFromADF(issue.fields.description);
      const branchName = `feature/${key.toLowerCase()}`;

      const baseDir = path.join("generated", key);
      ensureProjectSetup(baseDir);

      // Move to "In Progress"
      // const transitions = await getTransitions(id, cloudId, accessToken);
      // if (transitions) {
      //   await moveToInProgress(id, cloudId, accessToken);
      // } else {
      //   console.log("bjkdsbfkbs");
      // }
      // Generate code with LLM
      const llmOutput = await getCodeFromPrompt(prompt);
      const fileMap = parseFilesFromLLMResponse(llmOutput);
      writeFilesToDisk(fileMap, baseDir);

      // Git push
      await gitCommitAndPush(baseDir, branchName, `Implement ${key}: ${issue.fields.summary}`);

      // Move to "Done"
      const transitions2 = await getTransitions(id, cloudId, accessToken);
      const done = transitions2.find((t: { name: string; }) => t.name === "Done");
      if (done) await transitionJiraIssue(id, done.id, cloudId, accessToken);

      console.log(`✅ Task ${key} completed.\n`);
    }

  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function extractPlainTextFromADF(adf: any) {
  let result = '';

  function walk(node: { type: any; content: any[]; text: any; }) {
    if (!node) return;

    switch (node.type) {
      case 'paragraph':
        if (node.content) {
          result += getTextFromContentArray(node.content) + '\n';
        }
        break;

      case 'bulletList':
      case 'orderedList':
        if (node.content) {
          node.content.forEach(item => {
            if (item.type === 'listItem' && item.content) {
              item.content.forEach(walk); // Recurse into paragraph inside listItem
            }
          });
        }
        break;

      case 'heading':
        if (node.content) {
          result += getTextFromContentArray(node.content).toUpperCase() + '\n';
        }
        break;

      case 'text':
        result += node.text || '';
        break;

      default:
        if (node.content) {
          node.content.forEach(walk);
        }
        break;
    }
  }

  function getTextFromContentArray(contentArray: any[]) {
    return contentArray
      .map((c: { type: string; text: any; }) => (c.type === 'text' ? c.text : ''))
      .join('');
  }

  walk(adf);
  return result.trim();
}


function parseFilesFromLLMResponse(llmOutput: string): Record<string, string> {
  const fileRegex = /\[FILE: (.*?)\]\n([\s\S]*?)(?=\[FILE:|\n*$)/g;
  const files: Record<string, string> = {};
  let match: string[] | null;

  while ((match = fileRegex.exec(llmOutput)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    files[filePath] = fileContent;
  }

  return files;
}

function writeFilesToDisk(fileMap: Record<string, string>, baseDir: string = "generated") {
  for (const [relativePath, content] of Object.entries(fileMap)) {
    const fullPath = path.join(baseDir, relativePath);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    // Write file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`✅ Created ${fullPath}`);
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'yourapp.com',
    'X-Title': 'YourAppName'
  }
});


async function getCodeFromPrompt(prompt: string) {
  const systemMessage = `
You are a helpful software engineer assistant. You will receive a software task description.
- Analyze the requirements.
- Identify key components.
- Propose a project folder structure.
- Generate realistic starter files (e.g., index.ts, routes.ts, README.md).
- Include code with accurate filenames and code blocks.

Respond in this format:
\`\`\`
[FOLDER STRUCTURE]

/project-root
  /src
    index.ts
    routes.ts
  package.json
  README.md

[FILE: /src/index.ts]
<insert code here>

[FILE: /src/routes.ts]
<insert code here>

[FILE: /README.md]
<insert code here>
\`\`\`
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message?.content || "";
}


async function moveToInProgress(issueId: string, cloudId: any, accessToken: any) {
  try {
    const transitions = await getTransitions(issueId, cloudId, accessToken);
    console.log("move transition", transitions);

    const inProgress = transitions.find(
      (t: any) => t.name?.toLowerCase() === "in progress"
    );
    console.log("move transition in", inProgress.id);

    if (inProgress) {
      console.log("move transition in if cond", inProgress);
      await transitionJiraIssue(issueId, inProgress.id, cloudId, accessToken);
    }
  } catch (error) {
    console.log(error);
  }
}

async function getTransitions(issueId: string, cloudId: string, accessToken: string) {
  try {
    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueId}/transitions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      }
    );
    return response.data.transitions;
  } catch (error: any) {
    console.error("Error getting transitions:", error.response?.data || error.message);
    return null;
  }
}

function ensureProjectSetup(projectPath: string) {
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(`${projectPath}/src`, { recursive: true });
    fs.writeFileSync(`${projectPath}/README.md`, "# Project Initialized");
    console.log(`✅ Created base project at ${projectPath}`);
  } else {
    console.log(`📦 Project exists at ${projectPath}`);
  }
}


async function transitionJiraIssue(issueId: string, statusId: string, cloudId: string, accessToken: string) {
  await axios.post(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueId}/transitions`,
    {
      transition: { id: statusId }, // e.g., "31" for "In Progress", "41" for "Done"
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

async function gitCommitAndPush(projectDir: string, branchName: string, message: string) {
  const git = simpleGit(projectDir);

  await git.init(); // If not already a repo
  await git.checkoutLocalBranch(branchName).catch(() => { });
  await git.add(".");
  await git.commit(message);
  await git.push("origin", branchName).catch(() => {
    console.log("🟡 First push, creating upstream...");
    git.push(["--set-upstream", "origin", branchName]);
  });

  console.log(`🚀 Code pushed to branch ${branchName}`);
}