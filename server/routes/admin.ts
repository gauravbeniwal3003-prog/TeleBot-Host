import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAdmin } from '../middleware/auth';
import { UserRole } from '../db/schema';

export const adminRouter = Router();

// Protect ALL admin routes with strict database admin verification
adminRouter.use(requireAdmin);

// ==========================================
// 1. DASHBOARD & OVERVIEW
// ==========================================
adminRouter.get('/stats', (_req: Request, res: Response): void => {
  try {
    const stats = db.getAdminDashboardOverview();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin dashboard metrics' });
  }
});

adminRouter.get('/dashboard', (_req: Request, res: Response): void => {
  try {
    const stats = db.getAdminDashboardOverview();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin dashboard metrics' });
  }
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================
adminRouter.get('/users', (req: Request, res: Response): void => {
  try {
    const query = req.query.query as string | undefined;
    const users = db.getAdminUsers(query);
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

adminRouter.get('/users/:userId', (req: Request, res: Response): void => {
  try {
    const userDetail = db.getAdminUserDetail(req.params.userId);
    if (!userDetail) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(userDetail);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user details' });
  }
});

adminRouter.post('/users/:userId/suspend', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const { reason } = req.body;
    const targetUserId = req.params.userId;

    const updatedUser = db.suspendUser(adminUser.id, targetUserId, reason);
    res.json({
      message: `User ${updatedUser.name} (${updatedUser.email}) has been suspended.`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to suspend user' });
  }
});

adminRouter.post('/users/:userId/restore', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const targetUserId = req.params.userId;

    const updatedUser = db.restoreUser(adminUser.id, targetUserId);
    res.json({
      message: `User ${updatedUser.name} (${updatedUser.email}) has been restored to active status.`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to restore user' });
  }
});

adminRouter.post('/users/:userId/role', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const { role } = req.body;
    const validRoles: UserRole[] = ['user', 'admin', 'moderator'];

    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const updatedUser = db.setUserRole(adminUser.id, req.params.userId, role);
    res.json({
      message: `User role for ${updatedUser.name} updated to ${role}.`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update user role' });
  }
});

// ==========================================
// 3. BOT MANAGEMENT
// ==========================================
adminRouter.get('/bots', (req: Request, res: Response): void => {
  try {
    const query = req.query.query as string | undefined;
    const status = req.query.status as string | undefined;
    const bots = db.getAdminBots(query, status);
    res.json({ bots });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch cluster bots' });
  }
});

adminRouter.post('/bots/:botId/restart', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const bot = db.adminRestartBot(adminUser.id, req.params.botId);
    res.json({
      message: `Bot "${bot.name}" restarted successfully.`,
      bot,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to restart bot' });
  }
});

adminRouter.post('/bots/:botId/stop', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const bot = db.adminStopBot(adminUser.id, req.params.botId);
    res.json({
      message: `Bot "${bot.name}" stopped successfully.`,
      bot,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to stop bot' });
  }
});

adminRouter.get('/bots/:botId/logs', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 200;
    const logs = db.getAdminBotLogs(req.params.botId, limit);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bot logs' });
  }
});

// ==========================================
// 4. PRICING MANAGEMENT
// ==========================================
adminRouter.get('/pricing', (_req: Request, res: Response): void => {
  try {
    const pricing = db.getPricingConfig();
    res.json({ pricing });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pricing config' });
  }
});

adminRouter.put('/pricing', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const updatedPricing = db.updateAdminPricingConfig(adminUser.id, req.body);
    res.json({
      message: 'Pricing configuration updated successfully.',
      pricing: updatedPricing,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update pricing configuration' });
  }
});

adminRouter.post('/pricing/reset', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const defaultPricing = db.resetAdminPricingConfig(adminUser.id);
    res.json({
      message: 'Pricing configuration reset to default settings.',
      pricing: defaultPricing,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reset pricing configuration' });
  }
});

// ==========================================
// 5. PAYMENTS & REFUNDS
// ==========================================
adminRouter.get('/payments', (req: Request, res: Response): void => {
  try {
    const filter = req.query.filter as string | undefined;
    const query = req.query.query as string | undefined;
    const orders = db.getAdminOrders(filter, query);
    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch payment records' });
  }
});

adminRouter.post('/payments/:orderId/refund', (req: Request, res: Response): void => {
  try {
    const adminUser = (req as any).user;
    const { reason } = req.body;
    const refundedOrder = db.refundOrder(adminUser.id, req.params.orderId, reason);
    res.json({
      message: `Payment ${refundedOrder.order_id} refunded successfully.`,
      order: refundedOrder,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process refund' });
  }
});

// ==========================================
// 6. SYSTEM HEALTH & AUDIT TRAIL
// ==========================================
adminRouter.get('/system', (_req: Request, res: Response): void => {
  try {
    const health = db.getAdminSystemHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch system health metrics' });
  }
});

adminRouter.get('/vps-setup', (req: Request, res: Response): void => {
  try {
    const host = req.get('host') || 'your-domain.com';
    const protocol = req.protocol || 'https';
    const scriptUrl = `${protocol}://${host}/setup-vps.sh`;
    const installCommand = `curl -sSL ${scriptUrl} | bash`;

    res.json({
      hardware: {
        cpu: 'Intel Xeon Platinum 8168 CPU @ 2.70GHz',
        vCores: 2,
        ram: '2 GB DDR4 RAM',
        storage: '30 GB NVMe Storage',
        os: 'Ubuntu 24.04.3 LTS',
      },
      securityLimits: {
        ramLimitPerBotMB: 80,
        cgroupsVersion: 'v2 Unified Hierarchy',
        isolatedUser: 'telebot-runner (UID 10001)',
        fileSystemIsolation: 'Read-only rootfs + Isolated per-bot home sandbox',
        processQuota: 64,
      },
      preBakedFrameworks: [
        'aiogram 3.x',
        'Telethon 1.30+',
        'pyrogram 2.x',
        'python-telegram-bot 20.x',
        'pyTelegramBotAPI (telebot)',
        'requests',
        'aiohttp',
        'beautifulsoup4',
        'Pillow',
        'pymongo',
        'cryptography',
      ],
      scriptUrl,
      installCommand,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch VPS deployment configuration' });
  }
});

adminRouter.get('/audit-logs', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = db.getAdminAuditLogs(limit);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});
