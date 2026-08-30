import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

// 1. GET ALL PROJECTS
projectsRouter.get('/', (req: Request, res: Response): void => {
  try {
    const projects = db.getUserProjects(req.user!.id);
    const result = projects.map(p => {
      const bots = db.getProjectBots(p.id);
      const sub = db.getProjectSubscription(p.id);
      return {
        ...p,
        botCount: bots.length,
        subscription: sub ? {
          planId: sub.plan_id,
          planName: sub.plan_name,
          status: sub.status,
          expiryDate: sub.expiry_date,
          activeBotCount: sub.active_bot_count,
          totalBotSlots: sub.total_bot_slots,
          ramLimitMB: sub.ram_limit_mb,
          storageLimitGB: sub.storage_limit_gb,
        } : null
      };
    });
    res.json({ projects: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

// 2. CREATE A NEW PROJECT
projectsRouter.post('/', (req: Request, res: Response): void => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }
    const project = db.createProject(req.user!.id, name);
    res.status(201).json({
      project,
      message: `Project "${project.name}" created successfully!`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create project' });
  }
});

// 3. UPDATE PROJECT NAME
projectsRouter.put('/:id', (req: Request, res: Response): void => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }
    const project = db.updateProjectName(req.params.id, req.user!.id, name);
    res.json({
      project,
      message: 'Project updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update project' });
  }
});

// 4. DELETE PROJECT
projectsRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    db.deleteProject(req.params.id, req.user!.id);
    res.json({ message: 'Project and all associated bots have been deleted and de-allocated' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete project' });
  }
});
