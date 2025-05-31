import { Request, Response, NextFunction } from 'express';

export type RequestHandler = (req: Request, res: Response) => Promise<void>;
export type MiddlewareHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: RequestHandler;
  middlewares?: MiddlewareHandler[];
} 