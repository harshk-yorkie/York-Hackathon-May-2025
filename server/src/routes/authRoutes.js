import { Router } from 'express';
import { redirectToAtlassian, handleAtlassianCallback } from '../controllers/authController.js';

const router = Router();

router.get('/jira', redirectToAtlassian); // Step 1
router.get('/jira/callback', handleAtlassianCallback); // Step 2

export default router;
