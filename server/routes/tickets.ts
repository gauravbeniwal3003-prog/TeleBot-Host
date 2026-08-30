import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

// 1. GET USER TICKETS
ticketsRouter.get('/', (req: Request, res: Response): void => {
  try {
    const tickets = db.getUserTickets(req.user!.id);
    res.json({ tickets });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch tickets' });
  }
});

// 2. CREATE TICKET
ticketsRouter.post('/', (req: Request, res: Response): void => {
  try {
    const { subject, category, priority = 'medium', message } = req.body;

    if (!subject || !message) {
      res.status(400).json({ error: 'Subject and message are required' });
      return;
    }

    const ticket = db.createTicket(req.user!.id, {
      subject,
      category: category || 'general',
      priority,
      message,
    });

    res.status(201).json({
      ticket,
      message: 'Support ticket submitted. Our VPS engineering team will reply shortly.',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create ticket' });
  }
});
