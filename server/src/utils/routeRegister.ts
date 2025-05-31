import { Express } from 'express';
import { RouteConfig } from '../types/express';

export const registerRoutes = (app: Express, routes: RouteConfig[]): void => {
  routes.forEach(({ path, method, handler, middlewares = [] }) => {
    app[method](path, ...middlewares, handler);
  });
}; 