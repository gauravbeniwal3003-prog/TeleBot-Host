import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';

export const activityRouter = Router();

activityRouter.use(requireAuth);

activityRouter.get('/', (req: Request, res: Response): void => {
  try {
    const logs = db.getUserActivityLogs(req.user!.id);
    res.json({ activities: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch activity logs' });
  }
});
