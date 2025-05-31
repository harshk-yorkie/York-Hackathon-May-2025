import express from "express";
import axios from "axios";
import dotenv from "dotenv";

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
    // console.log(issuesRes.data.issues[0]['fields']['description']['content']);
  } catch (err) {
    res.status(500).send("OAuth failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
