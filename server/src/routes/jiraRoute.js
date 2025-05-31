import express from 'express';
import { fetchJiraTicketDetails } from '../controllers/jiraController.js';
import { jiraAuthMiddleware } from '../middlewares/jiraAuthMiddleware.js';

const router = express.Router();

router.post('/ticket-details', jiraAuthMiddleware, fetchJiraTicketDetails);

export default router;
