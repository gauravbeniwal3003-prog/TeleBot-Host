import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';
import { DBTelegramBot } from '../db/schema';
import { PythonValidator } from '../services/pythonValidator';
import { vpsWorkerClient } from '../services/vpsWorkerClient';
import { LogManager } from '../services/logManager';
import { ErrorTranslator } from '../services/errorTranslator';
import { GroqAiService } from '../services/groqAiService';

export const botsRouter = Router();

// Protect all bot routes with authentication
botsRouter.use(requireAuth);

// Helper to format bot object matching frontend interface
function formatBot(bot: DBTelegramBot, envVars: any[] = []) {
  const readable = ErrorTranslator.getReadableStatus(bot.status);
  return {
    id: bot.id,
    name: bot.name,
    username: bot.username,
    framework: bot.framework,
    version: bot.version,
    status: bot.status,
    statusBadge: readable.badge,
    statusDescription: readable.description,
    statusColor: readable.color,
    isActiveSlot: bot.is_active_slot,
    cpuUsage: bot.cpu_usage,
    memoryUsageMB: bot.memory_usage_mb,
    memoryLimitMB: bot.memory_limit_mb,
    storageUsageMB: bot.storage_usage_mb,
    uptimeSeconds: bot.uptime_seconds,
    restartCount: bot.restart_count,
    lastDeployedAt: bot.last_deployed_at,
    lastStartedAt: bot.last_started_at,
    lastStoppedAt: bot.last_stopped_at,
    lastError: bot.last_error,
    lastErrorFriendly: bot.last_error_friendly,
    lastErrorTechnical: bot.last_error_technical,
    gitRepoUrl: bot.git_repo_url,
    entryPoint: bot.entry_point,
    startCommand: bot.start_command || '',
    hasDatabase: bot.has_database,
    dbType: bot.db_type,
    webhookEnabled: bot.webhook_enabled,
    webhookUrl: bot.webhook_url,
    envVars: envVars.map((e) => ({
      id: e.id,
      key: e.key,
      value: e.value,
      isSecret: e.is_secret,
    })),
  };
}

// 1. GET ALL USER BOTS
botsRouter.get('/', (req: Request, res: Response): void => {
  try {
    const { projectId } = req.query;
    let userBots;

    if (projectId && typeof projectId === 'string') {
      const project = db.getProjectById(projectId, req.user!.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      userBots = db.getProjectBots(projectId);
    } else {
      userBots = db.getUserBots(req.user!.id);
    }

    const formatted = userBots.map((bot) => {
      const envs = db.getBotEnvVars(bot.id, req.user!.id);
      return formatBot(bot, envs);
    });
    res.json({ bots: formatted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bots' });
  }
});

// VALIDATE PYTHON BOT SOURCE (Static security & syntax inspection)
botsRouter.post('/validate-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, fileName } = req.body;
    if (typeof code !== 'string') {
      res.status(400).json({ error: 'Code string is required for validation' });
      return;
    }
    const sub = db.getUserSubscription(req.user!.id);
    const maxLimitMB = sub?.max_file_size_mb || 5.0;

    const result = await vpsWorkerClient.validatePythonFile(code, fileName || 'main.py', maxLimitMB);
    res.json({ result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Validation failed' });
  }
});

// RUN SECURITY & ISOLATION TESTS
botsRouter.post('/security-test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testType } = req.body;
    const report = await vpsWorkerClient.runSecurityTest(testType || 'host_filesystem');
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Security test failed' });
  }
});

// 2. CREATE NEW BOT
botsRouter.post('/', (req: Request, res: Response): void => {
  try {
    const { name, username, framework, token, gitRepoUrl, entryPoint, hasDatabase, dbType, webhookEnabled, projectId } = req.body;

    if (!name || !username || !framework) {
       res.status(400).json({ error: 'Bot name, Telegram username, and framework are required' });
       return;
    }

    if (projectId) {
      const project = db.getProjectById(projectId, req.user!.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    }

    const { bot, envVars } = db.createBot(req.user!.id, {
      name,
      username,
      framework,
      token: token || 'YOUR_BOT_TOKEN',
      gitRepoUrl,
      entryPoint,
      hasDatabase,
      dbType,
      webhookEnabled,
      projectId,
    });

    res.status(201).json({
      bot: formatBot(bot, envVars),
      message: `Bot "${bot.name}" deployed in isolated container!`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create bot' });
  }
});

// 3. GET SINGLE BOT
botsRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const bot = db.getBotById(req.params.id, req.user!.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }
    const envs = db.getBotEnvVars(bot.id, req.user!.id);
    res.json({ bot: formatBot(bot, envs) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get bot' });
  }
});

// 4. PERFORM BOT ACTIONS (start, stop, pause, resume, restart)
botsRouter.post('/:id/action', (req: Request, res: Response): void => {
  try {
    const { action, startCommand } = req.body;
    if (!['start', 'stop', 'pause', 'resume', 'restart'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Choose from start, stop, pause, resume, restart' });
      return;
    }

    const updatedBot = db.updateBotStatus(req.params.id, req.user!.id, action as any, startCommand);
    const envs = db.getBotEnvVars(updatedBot.id, req.user!.id);

    res.json({
      bot: formatBot(updatedBot, envs),
      message: `Bot ${action} executed successfully`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to execute bot action' });
  }
});

// 4a. UPDATE BOT CONFIG (Custom Start Command, Entry Point, Name)
botsRouter.patch('/:id/config', (req: Request, res: Response): void => {
  try {
    const { name, entryPoint, startCommand, framework, token } = req.body;
    const updatedBot = db.updateBotConfig(req.params.id, req.user!.id, {
      name,
      entry_point: entryPoint,
      start_command: startCommand,
      framework,
      token,
    });
    const envs = db.getBotEnvVars(updatedBot.id, req.user!.id);

    res.json({
      bot: formatBot(updatedBot, envs),
      message: 'Bot configuration updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update bot configuration' });
  }
});

// 4b. SWITCH ACTIVE BOT SLOT (Atomic slot swap)
botsRouter.post('/:id/switch-active', (req: Request, res: Response): void => {
  try {
    const { fromBotId } = req.body;
    const { targetBot, stoppedBot } = db.switchActiveBot(req.params.id, req.user!.id, fromBotId);
    const envs = db.getBotEnvVars(targetBot.id, req.user!.id);

    res.json({
      targetBot: formatBot(targetBot, envs),
      stoppedBot: stoppedBot ? formatBot(stoppedBot) : undefined,
      message: stoppedBot
        ? `Swapped active slot: "${stoppedBot.name}" stopped, "${targetBot.name}" is now running.`
        : `Bot "${targetBot.name}" is now running in active slot.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to switch active slot' });
  }
});

// 4c. GET CONTAINER TELEMETRY
botsRouter.get('/:id/telemetry', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = db.getBotById(req.params.id, req.user!.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    const telemetry = await vpsWorkerClient.getBotTelemetry(bot.id);
    res.json({ telemetry });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch telemetry' });
  }
});

// 5. DELETE BOT
botsRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    db.deleteBot(req.params.id, req.user!.id);
    res.json({ message: 'Bot deleted and container resources de-allocated' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete bot' });
  }
});

// 6. GET BOT LOGS (With search, level filter, and automatic friendly error translation)
botsRouter.get('/:id/logs', (req: Request, res: Response): void => {
  try {
    const { search, level, limit, offset } = req.query;
    const result = LogManager.getLogs(req.params.id, req.user!.id, {
      search: typeof search === 'string' ? search : undefined,
      level: typeof level === 'string' ? (level as any) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 200,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      logs: result.logs,
      totalCount: result.totalCount,
      filteredCount: result.filteredCount,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch logs' });
  }
});

// 6b. CLEAR BOT LOGS (Strictly isolated per user and bot)
botsRouter.delete('/:id/logs', (req: Request, res: Response): void => {
  try {
    const result = LogManager.clearLogs(req.params.id, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to clear logs' });
  }
});

// 6c. DOWNLOAD BOT LOGS (Clean text file export)
botsRouter.get('/:id/logs/download', (req: Request, res: Response): void => {
  try {
    const logText = LogManager.exportLogsAsText(req.params.id, req.user!.id);
    const bot = db.getBotById(req.params.id, req.user!.id);
    const fileName = `${bot ? bot.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'bot'}_logs_${Date.now()}.log`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(logText);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to export logs' });
  }
});

// 6d. ROTATE BOT LOGS (Compact storage and prune old entries)
botsRouter.post('/:id/logs/rotate', (req: Request, res: Response): void => {
  try {
    const rotated = LogManager.rotateLogsIfNecessary(req.params.id, req.user!.id);
    const overview = LogManager.getBotMonitoringOverview(req.params.id, req.user!.id);
    res.json({
      success: true,
      rotated,
      message: rotated
        ? 'Logs rotated successfully. Oldest records archived.'
        : 'Logs are within safe storage thresholds (under 500 entries).',
      logStats: overview.logStats,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to rotate logs' });
  }
});

// 6e. SIMULATE RUNTIME ERROR (Interactive testing for friendly error diagnosis)
botsRouter.post('/:id/logs/simulate-error', (req: Request, res: Response): void => {
  try {
    const { errorType } = req.body;
    const bot = db.getBotById(req.params.id, req.user!.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    let simulatedRawError = '';
    switch (errorType) {
      case 'missing_package':
        simulatedRawError = `Traceback (most recent call last):
  File "/app/main.py", line 4, in <module>
    import aiohttp_socks
ModuleNotFoundError: No module named 'aiohttp_socks'`;
        break;
      case 'invalid_token':
        simulatedRawError = `Traceback (most recent call last):
  File "/app/main.py", line 18, in start_polling
    bot_info = await bot.get_me()
aiogram.utils.exceptions.Unauthorized: Unauthorized: 401: Invalid bot token provided`;
        break;
      case 'database_locked':
        simulatedRawError = `Traceback (most recent call last):
  File "/app/handlers/users.py", line 42, in save_user
    cursor.execute("INSERT INTO users VALUES (?, ?)", (user_id, name))
sqlite3.OperationalError: database is locked`;
        break;
      case 'memory_limit':
        simulatedRawError = `Fatal Python error: Container killed due to memory exhaustion
cgroup memory limit exceeded (Allocated 512MB / Usage 514MB). OOMKilled SIGKILL`;
        break;
      case 'syntax_error':
        simulatedRawError = `  File "/app/main.py", line 12
    async def handle_message(message
                                    ^
SyntaxError: '(' was never closed`;
        break;
      default:
        simulatedRawError = `Traceback (most recent call last):
  File "/app/main.py", line 33, in process_event
    user_state = states_dict[message.chat.id]
KeyError: 98124401`;
    }

    const { log, translatedError } = LogManager.appendLog(
      bot.id,
      req.user!.id,
      'error',
      simulatedRawError
    );

    res.json({
      success: true,
      log,
      translatedError,
      message: 'Simulated error logged and translated successfully.',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Simulation failed' });
  }
});

// 6f. GET BOT MONITORING & LOGGING OVERVIEW
botsRouter.get('/:id/monitoring', (req: Request, res: Response): void => {
  try {
    const overview = LogManager.getBotMonitoringOverview(req.params.id, req.user!.id);
    res.json({ overview });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch monitoring overview' });
  }
});

// 7. GET & UPDATE BOT ENVIRONMENT VARIABLES
botsRouter.get('/:id/env', (req: Request, res: Response): void => {
  try {
    const envs = db.getBotEnvVars(req.params.id, req.user!.id);
    res.json({
      envVars: envs.map((e) => ({
        id: e.id,
        key: e.key,
        value: e.is_secret ? '••••••••••••••••' : e.value,
        isSecret: e.is_secret,
      })),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch env vars' });
  }
});

botsRouter.post('/:id/env', (req: Request, res: Response): void => {
  try {
    const { envVars } = req.body;
    if (!Array.isArray(envVars)) {
      res.status(400).json({ error: 'envVars must be an array' });
      return;
    }

    const updated = db.setBotEnvVars(req.params.id, req.user!.id, envVars);
    const bot = db.getBotById(req.params.id, req.user!.id);

    res.json({
      bot: bot ? formatBot(bot, updated) : null,
      envVars: updated.map((e) => ({
        id: e.id,
        key: e.key,
        value: e.value,
        isSecret: e.is_secret,
      })),
      message: 'Environment variables saved and loaded into container.',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save env vars' });
  }
});

// 7. GROQ AI ERROR DIAGNOSIS
botsRouter.post('/:id/ai/diagnose', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = db.getBotById(req.params.id, req.user!.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const { rawLog } = req.body;
    let logToAnalyze = rawLog;
    if (!logToAnalyze) {
      // Grab recent error/system logs
      const logsResult = LogManager.getLogs(bot.id, req.user!.id, { limit: 40 });
      logToAnalyze = logsResult.logs.map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n');
    }

    const diagnosis = await GroqAiService.diagnoseError(logToAnalyze, {
      botName: bot.name,
      framework: bot.framework,
    });

    res.json({ diagnosis });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Groq AI diagnosis failed' });
  }
});

// 8. GROQ AI DETECT PACKAGES FROM WORKSPACE
botsRouter.post('/:id/ai/detect-packages', async (req: Request, res: Response): Promise<void> => {
  try {
    const bot = db.getBotById(req.params.id, req.user!.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const files = db.getBotFilesDirect(bot.id);
    const codeFiles = files.map((f) => ({
      fileName: f.file_path,
      content: f.content || '',
    }));

    const result = await GroqAiService.detectPackagesFromCode(codeFiles);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Package detection failed' });
  }
});

// 9. REAL-TIME PIP PACKAGE INSTALLATION ON HOST
botsRouter.post('/:id/packages/install', async (req: Request, res: Response): Promise<void> => {
  try {
    const { packages } = req.body;
    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      res.status(400).json({ error: 'Please provide an array of package names' });
      return;
    }

    const result = await GroqAiService.installPackages(req.params.id, req.user!.id, packages);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Package installation failed' });
  }
});

// 10. INSTALL REQUIREMENTS.TXT
botsRouter.post('/:id/packages/install-requirements', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await GroqAiService.installRequirementsFile(req.params.id, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'requirements.txt installation failed' });
  }
});

