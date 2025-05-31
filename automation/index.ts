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
const scopes = "read:jira-work read:jira-user write:jira-work";

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
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const projectName = projectsRes.data[0].name;

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

    const branchName = `feature/${projectName.split(" ").join('_').toLowerCase()}`;
    const baseDir = path.join(__dirname, "..", projectName.split(" ").join('_'));
    for (const issue of issues) {
      try {
        const key = issue.key;
        const id = issue.id;

        const prompt = extractPlainTextFromADF(issue.fields.description);
        ensureProjectSetup(baseDir);

        const transitions = await getTransitions(id, cloudId, accessToken);
        if (transitions) await moveToInProgress(id, cloudId, accessToken);

        const llmOutput = await getCodeFromPrompt(prompt);
        const fileMap = parseFilesFromLLMResponse(llmOutput);
        writeFilesToDisk(fileMap, baseDir);

        await gitCommitAndPush.commitOnly(baseDir, `Implement ${key}: ${issue.fields.summary}`);

        const transitions2 = await getTransitions(id, cloudId, accessToken);
        const done = transitions2.find((t: { name: string }) => t.name === "Done");
        if (done) await transitionJiraIssue(id, done.id, cloudId, accessToken);

        console.log(`✅ Task ${key} completed.\n`);
      } catch (err) {
        console.error(`❌ Failed to process issue ${issue.key}:`, err);
      }
    }

    // 6. Final push after all tasks
    await gitCommitAndPush.pushOnly(baseDir, branchName);

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
    let fileContent = match[2].trim();

    // Strip code block markers if present
    if (fileContent.startsWith("```")) {
      fileContent = fileContent.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }

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
});


async function getCodeFromPrompt(prompt: string) {
  const systemMessage = `
  You are a senior software engineer assistant. Given a task:
  
  - Analyze the requirements.
  - Propose folder structure.
  - Generate production-ready code with proper linting.
  - Include a test suite with 80%+ coverage.
  - Use correct file extensions (.ts, .js, .py).
  - Respond with Git commit message, PR title/desc, and QA checklist.
  
  Respond in this format:
  \`\`\`
  [FOLDER STRUCTURE]
  /project-root
    /src
      index.ts
      routes.ts
    /tests
      index.test.ts
    package.json
    README.md
  
  [FILE: /src/index.ts]
  <code>
  
  [FILE: /tests/index.test.ts]
  <code>
  
  [GIT]
  Branch: feature/DEV-123-auth
  Commit: Add auth routes and validation
  PR Title: [DEV-123] Add user authentication
  PR Description:
  - Adds login/signup
  - Validates payloads
  - Links to Jira: https://jira.example.com/browse/DEV-123
  
  [JIRA QA]
  1. Call POST /login with valid creds
  2. Validate JWT returned
  Peer Checklist:
  - Code linted
  - Error handling tested
  - Input validation
  - Coverage ≥ 80%
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

    const inProgress = transitions.find(
      (t: any) => t.name?.toLowerCase() === "in progress"
    );

    if (inProgress) {
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
    fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectPath, "README.md"), "# Project Initialized");
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

const gitCommitAndPush = {
  async prepareRepo(projectDir: string, branchName: string) {
    const git = simpleGit(projectDir);

    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      console.log("📦 Git repo initialized.");
    }

    const remotes = await git.getRemotes(true);
    if (!remotes.find(r => r.name === "origin")) {
      const remoteUrl = process.env.GIT_REMOTE_URL;
      if (!remoteUrl) throw new Error("❌ GIT_REMOTE_URL is not set.");
      await git.addRemote("origin", remoteUrl);
      console.log(`🔗 Remote set to ${remoteUrl}`);
    }

    await git.fetch();
    try {
      await git.checkout(branchName);
    } catch {
      await git.checkoutLocalBranch(branchName);
    }
  },

  async commitOnly(projectDir: string, message: string) {
    const git = simpleGit(projectDir);
    await git.add(".");
    const status = await git.status();

    if (status.files.length === 0) {
      console.log("🟢 No changes to commit.");
      return;
    }

    await git.commit(message);
    console.log(`💾 Committed: ${message}`);
  },

  async pushOnly(projectDir: string, branchName: string) {
    const git = simpleGit(projectDir);
    try {
      await git.push("origin", branchName);
    } catch {
      console.log("🟡 Push failed, retrying with upstream setup...");
      await git.raw([
        "push",
        "--set-upstream",
        "origin",
        branchName,
        "--verbose",
        "--porcelain"
      ]);
    }
    console.log(`🚀 Pushed to origin/${branchName}`);
  }
};
