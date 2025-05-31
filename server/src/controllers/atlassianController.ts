import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import { getAuthUrl, exchangeCodeForToken, getAccessibleResources, getProjects, getIssues } from '../services/atlassianService';
import { atlassianConfig } from '../config/atlassian';

export const initiateAuth = asyncHandler(async (_req: Request, res: Response) => {
  const authUrl = getAuthUrl(atlassianConfig);
  res.send(`<a href="${authUrl}">Connect with Atlassian</a>`);
});

export const handleCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;

  try {
    const tokenResponse = await exchangeCodeForToken(code, atlassianConfig);
    const resources = await getAccessibleResources(tokenResponse.access_token);
    const cloudId = resources[0].id;

    const [projects, issues] = await Promise.all([
      getProjects(cloudId, tokenResponse.access_token),
      getIssues(cloudId, tokenResponse.access_token),
    ]);

    successResponse(res, {
      projects,
      issues,
      descriptionContent: issues[0]?.fields.description.content,
    });
  } catch (error) {
    errorResponse(res, 'OAuth failed', 500);
  }
}); 