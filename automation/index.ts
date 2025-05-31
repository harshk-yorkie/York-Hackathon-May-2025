import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { fetch } from "undici";
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

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Atlassian Integration</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                background: linear-gradient(135deg, #0052CC 0%, #00B8D9 100%);
                color: #172B4D;
            }
            .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
                width: 90%;
            }
            h1 {
                margin: 0 0 1rem 0;
                color: #172B4D;
            }
            p {
                margin: 0 0 2rem 0;
                color: #6B778C;
                line-height: 1.5;
            }
            .connect-button {
                display: inline-block;
                background: #0052CC;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            .connect-button:hover {
                background: #0747A6;
            }
            .logo {
                width: 48px;
                height: 48px;
                margin-bottom: 1rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png" alt="Atlassian Logo" class="logo">
            <h1>Connect to Atlassian</h1>
            <p>Click the button below to connect your Atlassian account and start managing your Jira issues.</p>
            <a href="${authUrl}" class="connect-button">Connect with Atlassian</a>
        </div>
    </body>
    </html>
  `);
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
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Get cloud ID
    const identityRes = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

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

    // Extract issues
    let issues = issuesRes.data.issues;
    issues.sort((a: { key: string }, b: { key: string }) => {
      const numA = parseInt(a.key.split("-")[1]);
      const numB = parseInt(b.key.split("-")[1]);
      return numA - numB;
    });

    solveIssues({
      projectName,
      accessToken,
      cloudId,
      issues,
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Atlassian Integration - Success</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                  margin: 0;
                  padding: 0;
                  min-height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  background: linear-gradient(135deg, #0052CC 0%, #00B8D9 100%);
                  color: #172B4D;
              }
              .container {
                  background: white;
                  padding: 2rem;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 400px;
                  width: 90%;
              }
              h1 {
                  margin: 0 0 1rem 0;
                  color: #172B4D;
              }
              p {
                  margin: 0 0 1rem 0;
                  color: #6B778C;
                  line-height: 1.5;
              }
              .logo {
                  width: 48px;
                  height: 48px;
                  margin-bottom: 1rem;
              }
              .status {
                  background: #E3FCEF;
                  color: #006644;
                  padding: 1rem;
                  border-radius: 4px;
                  margin: 1rem 0;
                  font-weight: 500;
              }
              .project-info {
                  background: #F4F5F7;
                  padding: 1rem;
                  border-radius: 4px;
                  margin: 1rem 0;
              }
              .loading {
                  display: inline-block;
                  width: 20px;
                  height: 20px;
                  border: 2px solid #F4F5F7;
                  border-radius: 50%;
                  border-top-color: #0052CC;
                  animation: spin 1s linear infinite;
                  margin-left: 8px;
                  vertical-align: middle;
              }
              @keyframes spin {
                  to { transform: rotate(360deg); }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <img src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png" alt="Atlassian Logo" class="logo">
              <h1>Successfully Connected!</h1>
              <div class="project-info">
                  <p><strong>Project:</strong> ${projectName}</p>
                  <p><strong>Issues Found:</strong> ${issues.length}</p>
              </div>
              <div class="status">
                  <p>Hang tight — we're automatically resolving issues in the background to get everything working smoothly</p>
              </div>
              <p>Check the console for detailed updates on the progress.</p>
          </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function extractPlainTextFromADF(adf: any) {
  let result = "";

  function walk(node: { type: any; content: any[]; text: any }) {
    if (!node) return;

    switch (node.type) {
      case "paragraph":
        if (node.content) {
          result += getTextFromContentArray(node.content) + "\n";
        }
        break;

      case "bulletList":
      case "orderedList":
        if (node.content) {
          node.content.forEach((item) => {
            if (item.type === "listItem" && item.content) {
              item.content.forEach(walk); // Recurse into paragraph inside listItem
            }
          });
        }
        break;

      case "heading":
        if (node.content) {
          result += getTextFromContentArray(node.content).toUpperCase() + "\n";
        }
        break;

      case "text":
        result += node.text || "";
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
      .map((c: { type: string; text: any }) =>
        c.type === "text" ? c.text : ""
      )
      .join("");
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
      fileContent = fileContent
        .replace(/^```[a-z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    files[filePath] = fileContent;
  }

  return files;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function getCodeFromPrompt(prompt: string) {
  const systemMessage = `
      You are a helpful software engineer assistant. You will receive a software task description and terminal errors (if any).
      - Analyze the requirements and errors.
      - Identify or fix key components.
      - Propose a project folder structure.
      - Generate realistic starter files (e.g., index.ts, routes.ts, README.md, tests, configs).
      - Ensure the code passes TypeScript, ESLint, and unit tests.
      - If terminal errors are provided, fix the code accordingly.

      Respond in this format:
      \`\`\`
      [FOLDER STRUCTURE]

      /project-root
        /src
          index.ts
          routes.ts
        /tests
          index.test.ts
        tsconfig.json
        package.json
        README.md

      [FILE: /src/index.ts]
      <insert code here>

      [FILE: /tests/index.test.ts]
      <insert code here>

      [FILE: /tsconfig.json]
      <insert code here>

      [FILE: /package.json]
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

async function moveToInProgress(
  issueId: string,
  cloudId: any,
  accessToken: any
) {
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

async function getTransitions(
  issueId: string,
  cloudId: string,
  accessToken: string
) {
  try {
    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueId}/transitions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    return response.data.transitions;
  } catch (error: any) {
    console.error(
      "Error getting transitions:",
      error.response?.data || error.message
    );
    return null;
  }
}

function ensureProjectSetup(projectPath: string) {
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, "README.md"),
      "# Project Initialized"
    );
    console.log(`✅ Created base project at ${projectPath}`);
  } else {
    console.log(`📦 Project exists at ${projectPath}`);
  }
}

async function transitionJiraIssue(
  issueId: string,
  statusId: string,
  cloudId: string,
  accessToken: string
) {
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
    if (!remotes.find((r) => r.name === "origin")) {
      const remoteUrl = process.env.GIT_REMOTE_URL;
      if (!remoteUrl) throw new Error("❌ GIT_REMOTE_URL is not set.");
      await git.addRemote("origin", remoteUrl);
      console.log(`🔗 Remote set to ${remoteUrl}`);
    }

    await git.fetch();

    const localBranches = await git.branchLocal();
    const branchExists = localBranches.all.includes(branchName);

    if (branchExists) {
      await git.checkout(branchName);
      console.log(`🔀 Switched to existing branch: ${branchName}`);
    } else {
      await git.checkoutLocalBranch(branchName);
      console.log(`🌿 Created and checked out new branch: ${branchName}`);
    }
  },

  async commitOnly(projectDir: string, message: string) {
    const git = simpleGit(projectDir);
    await git.add(".");

    const status = await git.status();
    if (status.files.length === 0) {
      console.log("🟢 No file changes to commit.");
      return;
    }

    await git.commit(message);
    console.log(`💾 Committed: ${message}`);
  },

  async pushOnly(projectDir: string, branchName: string) {
    const git = simpleGit(projectDir);
    try {
      await git.push("origin", branchName);
      console.log(`🚀 Pushed to origin/${branchName}`);
    } catch (error) {
      console.log("🟡 Initial push failed, retrying with --set-upstream...");
      try {
        await git.push(["--set-upstream", "origin", branchName]);
        console.log(`🚀 Pushed to origin/${branchName} (with upstream)`);
      } catch (e: any) {
        console.error("❌ Push with upstream failed:", e.message || e);
        throw e;
      }
    }
  },
};

function writeFilesToDisk(
  fileMap: Record<string, string>,
  baseDir: string = "generated"
) {
  const packageJsonPath = path.join(baseDir, "package.json");
  let pkg: any = {};

  if (fs.existsSync(packageJsonPath)) {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    pkg.dependencies ??= {};
    pkg.devDependencies ??= {};
  }

  const dependenciesToInstall = new Set<string>();

  for (const [relativePath, content] of Object.entries(fileMap)) {
    const fullPath = path.join(baseDir, relativePath);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    // Write file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`✅ Created ${fullPath}`);

    // Scan for imports
    const importRegex =
      /(?:import .* from ['"]|require\(['"])([a-zA-Z0-9@/_-]+)['"]/g;
    let match: any;
    while ((match = importRegex.exec(content)) !== null) {
      const pkgName = match[1].split("/")[0]; // handle scoped packages and subpaths
      if (
        !pkg.dependencies[pkgName] &&
        !pkg.devDependencies[pkgName] &&
        !isBuiltInModule(pkgName)
      ) {
        dependenciesToInstall.add(pkgName);
      }
    }
  }

  // Update package.json if needed
  if (dependenciesToInstall.size > 0) {
    for (const dep of dependenciesToInstall) {
      pkg.dependencies[dep] = "*";
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    console.log("📦 Updated package.json with new dependencies.");

    // Install new dependencies
    try {
      execSync(`npm install`, { cwd: baseDir, stdio: "inherit" });
      console.log("📥 Installed missing dependencies.");
    } catch (err) {
      console.error("⚠️ Error installing dependencies:", err);
    }
  }
}

function isBuiltInModule(pkgName: string): boolean {
  const builtIns = new Set(require("module").builtinModules);
  return builtIns.has(pkgName);
}

async function solveIssues({
  projectName,
  issues,
  accessToken,
  cloudId,
}: {
  projectName: string;
  issues: any[];
  cloudId: string;
  accessToken: string;
}) {
  const branchName = `feature/${projectName
    .split(" ")
    .join("_")
    .toLowerCase()}`;
  const baseDir = path.join(__dirname, "..", projectName.split(" ").join("_"));
  const git = simpleGit(baseDir);

  const localBranches = await git.branchLocal();
  if (!localBranches.all.includes(branchName)) {
    await git.checkoutLocalBranch(branchName);
  } else {
    await git.checkout(branchName);
  }
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
      // await validateAndFixCode(baseDir, prompt);
      await gitCommitAndPush.commitOnly(
        baseDir,
        `Implement ${key}: ${issue.fields.summary}`
      );

      const transitions2 = await getTransitions(id, cloudId, accessToken);
      const done = transitions2.find(
        (t: { name: string }) => t.name === "Done"
      );
      if (done) await transitionJiraIssue(id, done.id, cloudId, accessToken);

      console.log(`✅ Task ${key} completed.\n`);
    } catch (err) {
      console.error(`❌ Failed to process issue ${issue.key}:`, err);
    }
  }
  // 6. Final push after all tasks
  await gitCommitAndPush.pushOnly(baseDir, branchName);
}
