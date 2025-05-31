import { Request, Response, NextFunction } from 'express';
import { RequestHandler, MiddlewareHandler } from '../types/express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };
};

export const asyncMiddleware = (fn: MiddlewareHandler): MiddlewareHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}; 