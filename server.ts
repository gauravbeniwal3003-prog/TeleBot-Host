import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';

// Route Handlers
import { authRouter } from './server/routes/auth';
import { botsRouter } from './server/routes/bots';
import { filesRouter } from './server/routes/files';
import { subscriptionsRouter } from './server/routes/subscriptions';
import { activityRouter } from './server/routes/activity';
import { adminRouter } from './server/routes/admin';
import { ticketsRouter } from './server/routes/tickets';
import { projectsRouter } from './server/routes/projects';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for reverse proxy environment
  app.set('trust proxy', 1);

  // Basic Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // disabled for vite dev server
    crossOriginEmbedderPolicy: false
  }));

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Telegram Bot Hosting API Engine',
      timestamp: new Date().toISOString(),
      vpsNode: 'Intel Xeon Platinum 8168 CPU @ 2.70GHz (Ubuntu 24.04.3 LTS)',
    });
  });

  // Serve VPS Setup Bash Installer
  app.get(['/setup-vps.sh', '/api/vps/setup-script'], (_req, res) => {
    const scriptPath = path.join(process.cwd(), 'vps-deploy', 'setup-vps.sh');
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(scriptPath);
  });

  // Serve Dynamic Workspace Archive Bundle for automatic remote VPS cloning
  app.get('/download-bundle.tar.gz', async (_req, res) => {
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      const tarPath = path.join(process.cwd(), 'bundle.tar.gz');
      // Compress everything excluding unneeded development assets
      await execPromise(`tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='bundle.tar.gz' -czf "${tarPath}" -C "${process.cwd()}" .`);
      
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', 'attachment; filename="bundle.tar.gz"');
      res.sendFile(tarPath, () => {
        // Cleanup file immediately after stream ends
        import('fs').then(fs => fs.unlinkSync(tarPath)).catch(() => {});
      });
    } catch (error: any) {
      res.status(500).send(`Failed to create deployment package: ${error.message}`);
    }
  });

  // Mount API Endpoints FIRST
  app.use('/api/auth', authRouter);
  app.use('/api/bots', botsRouter);
  app.use('/api/bots', filesRouter);
  app.use('/api', subscriptionsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/projects', projectsRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TeleHost Server] Running on http://0.0.0.0:${PORT}`);
    
    // Auto-bootstrap python environment for AI Studio previews
    if (process.env.NODE_ENV !== 'production') {
      import('child_process').then(({ exec }) => {
        exec('python3 -c "import telegram" || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip && pip3 install --break-system-packages python-telegram-bot aiogram pyTelegramBotAPI telebot telethon pyrogram)', (err) => {
          if (!err) console.log('[TeleHost Python Sandbox] Core bot framework dependencies verified.');
        });
      });
    }
  });
}

startServer().catch((err) => {
  console.error('[TeleHost Server] Startup error:', err);
});
