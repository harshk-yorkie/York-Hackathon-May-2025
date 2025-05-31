import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';

export const getHome = asyncHandler(async (req: Request, res: Response) => {
  const data = {
    message: 'Hello, TypeScript Express Restart!',
    timestamp: new Date().toISOString(),
  };
  
  successResponse(res, data);
}); 