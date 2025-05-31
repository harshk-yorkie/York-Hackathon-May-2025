import { RouteConfig } from '../types/express';
import { initiateAuth, handleCallback } from '../controllers/atlassianController';

export const atlassianRoutes: RouteConfig[] = [
  {
    path: '/',
    method: 'get',
    handler: initiateAuth,
  },
  {
    path: '/atlassian-verify',
    method: 'get',
    handler: handleCallback,
  },
]; 