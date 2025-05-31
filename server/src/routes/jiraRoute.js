import express from 'express';
import { ticketDetails } from '../controllers/jiraController.js';
import { jiraAuthMiddleware } from '../middlewares/jiraAuthMiddleware.js';

const router = express.Router();

router.post('/ticket-details', jiraAuthMiddleware, ticketDetails);

export default router;
