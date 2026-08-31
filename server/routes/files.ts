import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { StorageManager } from '../services/storageManager';
import { PythonValidator } from '../services/pythonValidator';
import { vpsWorkerClient } from '../services/vpsWorkerClient';
import path from 'path';

export const filesRouter = Router();

filesRouter.use(requireAuth);

// Helper to determine MIME type from extension
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.py':
      return 'text/x-python';
    case '.json':
      return 'application/json';
    case '.txt':
    case '.log':
      return 'text/plain';
    case '.csv':
      return 'text/csv';
    case '.sqlite':
    case '.sqlite3':
    case '.db':
      return 'application/vnd.sqlite3';
    case '.env':
      return 'text/x-env';
    case '.yaml':
    case '.yml':
      return 'text/yaml';
    case '.toml':
    case '.ini':
    case '.cfg':
      return 'text/x-config';
    case '.sql':
      return 'application/sql';
    case '.md':
      return 'text/markdown';
    case '.html':
      return 'text/html';
    case '.js':
      return 'text/javascript';
    case '.ts':
      return 'text/typescript';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'text/plain';
  }
}

// 1. GET ALL FILES AND STORAGE SUMMARY FOR A BOT
filesRouter.get('/:botId/files', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const bot = db.getBotById(botId, userId);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found or unauthorized' });
      return;
    }

    const files = db.getBotFiles(botId, userId);
    const storageSummary = StorageManager.calculateStorageSummary(userId, botId);

    res.json({
      files: files.map((f) => ({
        id: f.id,
        filePath: f.file_path,
        virtualPath: StorageManager.getVirtualSandboxPath(botId, f.file_path),
        fileName: f.file_name,
        fileSizeBytes: f.file_size_bytes || (f.content ? Buffer.byteLength(f.content, 'utf-8') : 0),
        mimeType: f.mime_type || getMimeType(f.file_name),
        isDirectory: f.is_directory,
        content: f.content,
        updatedAt: f.updated_at,
        isEntryPoint: f.file_path === bot.entry_point || f.file_name === bot.entry_point,
      })),
      storageUsageMB: storageSummary.usedStorageMB,
      storageSummary,
      memoryLimitMB: bot.memory_limit_mb || 512,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch bot files' });
  }
});

// 2. GET USER & BOT STORAGE SUMMARY (Used, Total, Remaining, Percentage)
filesRouter.get('/:botId/storage-summary', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const summary = StorageManager.calculateStorageSummary(userId, botId);
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch storage summary' });
  }
});

// Global user storage summary across all bots
filesRouter.get('/storage/user-summary', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const summary = StorageManager.calculateStorageSummary(userId);
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch user storage summary' });
  }
});

// 3. SAVE / CREATE / UPDATE FILE CONTENT (e.g. from in-browser code editor)
filesRouter.post('/:botId/files', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
      res.status(400).json({ error: 'filePath and content are required' });
      return;
    }

    // 1. Sanitize file path (prevent directory traversal)
    const cleanPath = StorageManager.sanitizeFilePath(filePath);
    const fileName = path.basename(cleanPath);

    // 2. Validate filename and extension
    const nameValidation = StorageManager.validateFileName(fileName);
    if (!nameValidation.valid) {
      res.status(400).json({ error: nameValidation.error });
      return;
    }

    // 3. Check byte size
    const sizeBytes = Buffer.byteLength(content, 'utf-8');

    // 4. Pre-check storage quota atomically before writing
    const quotaCheck = StorageManager.checkQuotaBeforeWrite(userId, botId, cleanPath, sizeBytes);
    if (!quotaCheck.allowed) {
      res.status(403).json({ error: quotaCheck.error });
      return;
    }

    // 5. Save file in database/virtual sandbox
    const { file, totalStorageMB, validation } = db.saveBotFile(botId, userId, cleanPath, content);
    const storageSummary = StorageManager.calculateStorageSummary(userId, botId);

    // 6. Real-time sync to VPS sandbox
    try {
      await vpsWorkerClient.syncBotFile(botId, cleanPath, content);
    } catch (err) {
      console.error(`[VPS Sync] Non-fatal error during file save:`, err);
    }

    res.json({
      file: {
        id: file.id,
        filePath: file.file_path,
        virtualPath: StorageManager.getVirtualSandboxPath(botId, file.file_path),
        fileName: file.file_name,
        fileSizeBytes: file.file_size_bytes,
        mimeType: file.mime_type || getMimeType(file.file_name),
        content: file.content,
        updatedAt: file.updated_at,
      },
      storageUsageMB: totalStorageMB,
      storageSummary,
      validation,
      message: `File "${file.file_name}" saved successfully into sandbox.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save file' });
  }
});

// 4. UPLOAD FILE (Supports single or multi upload payload, Drag & Drop, with replacement detection)
filesRouter.post('/:botId/files/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const { fileName, content, encoding } = req.body;

    if (!fileName || content === undefined) {
      res.status(400).json({ error: 'fileName and content are required for upload' });
      return;
    }

    // 1. Sanitize file name and path
    const nameValidation = StorageManager.validateFileName(fileName);
    if (!nameValidation.valid) {
      res.status(400).json({ error: nameValidation.error });
      return;
    }

    const cleanPath = StorageManager.sanitizeFilePath(fileName);
    let rawContent = content;

    // Handle base64 encoded binary/asset files if provided
    if (encoding === 'base64') {
      rawContent = Buffer.from(content, 'base64').toString('utf-8');
    }

    const sizeBytes = Buffer.byteLength(rawContent, 'utf-8');

    // 2. Pre-check storage quota atomically before allocating
    const quotaCheck = StorageManager.checkQuotaBeforeWrite(userId, botId, cleanPath, sizeBytes);
    if (!quotaCheck.allowed) {
      res.status(403).json({ error: quotaCheck.error });
      return;
    }

    // Check if replacing existing file
    const existingFiles = db.getBotFiles(botId, userId);
    const isReplacement = existingFiles.some((f) => f.file_path === cleanPath);

    // 3. Save file
    const { file, totalStorageMB, validation } = db.saveBotFile(botId, userId, cleanPath, rawContent);
    const storageSummary = StorageManager.calculateStorageSummary(userId, botId);

    // 4. Real-time sync to VPS sandbox
    try {
      await vpsWorkerClient.syncBotFile(botId, cleanPath, rawContent);
    } catch (err) {
      console.error(`[VPS Sync] Non-fatal error during file upload:`, err);
    }

    db.logActivity({
      user_id: userId,
      action: isReplacement ? 'bot.file_replace' : 'bot.file_upload',
      target_type: 'bot',
      target_id: botId,
      details: {
        fileName: file.file_name,
        sizeBytes: file.file_size_bytes,
        replaced: isReplacement,
      },
    });

    res.json({
      success: true,
      file: {
        id: file.id,
        filePath: file.file_path,
        virtualPath: StorageManager.getVirtualSandboxPath(botId, file.file_path),
        fileName: file.file_name,
        fileSizeBytes: file.file_size_bytes,
        mimeType: getMimeType(file.file_name),
        content: file.content,
        updatedAt: file.updated_at,
      },
      storageSummary,
      replaced: isReplacement,
      validation,
      message: isReplacement
        ? `File "${file.file_name}" replaced successfully.`
        : `File "${file.file_name}" uploaded successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'File upload failed' });
  }
});

// 5. DOWNLOAD BOT FILE (With safe Content-Disposition, sanitized headers, no host path leak)
filesRouter.get('/:botId/files/download', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const { filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'filePath query param is required' });
      return;
    }

    const cleanPath = StorageManager.sanitizeFilePath(filePath);
    const files = db.getBotFiles(botId, userId);
    const file = files.find((f) => f.file_path === cleanPath || f.file_name === cleanPath);

    if (!file) {
      res.status(404).json({ error: `File "${cleanPath}" not found in bot sandbox` });
      return;
    }

    const safeDownloadName = file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const mime = file.mime_type || getMimeType(safeDownloadName);

    res.setHeader('Content-Type', `${mime}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    res.setHeader('X-Virtual-Sandbox-Path', StorageManager.getVirtualSandboxPath(botId, file.file_path));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.send(file.content || '');
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to download file' });
  }
});

// 6. REPLACE FILE EXPLICITLY
filesRouter.post('/:botId/files/replace', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const { targetFilePath, newContent, newFileName } = req.body;

    if (!targetFilePath || newContent === undefined) {
      res.status(400).json({ error: 'targetFilePath and newContent are required' });
      return;
    }

    const cleanTargetPath = StorageManager.sanitizeFilePath(targetFilePath);
    const finalPath = newFileName ? StorageManager.sanitizeFilePath(newFileName) : cleanTargetPath;
    const sizeBytes = Buffer.byteLength(newContent, 'utf-8');

    // Quota pre-check
    const quotaCheck = StorageManager.checkQuotaBeforeWrite(userId, botId, cleanTargetPath, sizeBytes);
    if (!quotaCheck.allowed) {
      res.status(403).json({ error: quotaCheck.error });
      return;
    }

    // If changing name, delete old first
    if (finalPath !== cleanTargetPath) {
      db.deleteBotFile(botId, userId, cleanTargetPath);
    }

    const { file, validation } = db.saveBotFile(botId, userId, finalPath, newContent);
    const storageSummary = StorageManager.calculateStorageSummary(userId, botId);

    res.json({
      success: true,
      file: {
        id: file.id,
        filePath: file.file_path,
        virtualPath: StorageManager.getVirtualSandboxPath(botId, file.file_path),
        fileName: file.file_name,
        fileSizeBytes: file.file_size_bytes,
        mimeType: getMimeType(file.file_name),
        content: file.content,
        updatedAt: file.updated_at,
      },
      storageSummary,
      validation,
      message: `File "${file.file_name}" replaced successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to replace file' });
  }
});

// 7. DELETE FILE
filesRouter.delete('/:botId/files', (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const botId = req.params.botId;
    const { filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'filePath query param is required' });
      return;
    }

    const cleanPath = StorageManager.sanitizeFilePath(filePath);
    const bot = db.getBotById(botId, userId);
    
    // Safety warning if deleting entry point
    if (bot && (cleanPath === bot.entry_point || path.basename(cleanPath) === bot.entry_point)) {
      const userFiles = db.getBotFiles(botId, userId);
      if (userFiles.length <= 1) {
        res.status(400).json({
          error: `Cannot delete primary entry point "${cleanPath}" when it is the only source file in the bot sandbox. Replace it or add another file first.`,
        });
        return;
      }
    }

    db.deleteBotFile(botId, userId, cleanPath);
    const storageSummary = StorageManager.calculateStorageSummary(userId, botId);

    db.logActivity({
      user_id: userId,
      action: 'bot.file_delete',
      target_type: 'bot',
      target_id: botId,
      details: { filePath: cleanPath },
    });

    res.json({
      success: true,
      message: `File "${cleanPath}" deleted from sandbox.`,
      storageSummary,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete file' });
  }
});

// 8. STORAGE CLEANUP TRIGGER & AUDIT
filesRouter.post('/storage/cleanup-job', requireAdmin, (req: Request, res: Response): void => {
  try {
    const report = StorageManager.runStorageCleanupJob();
    res.json({
      success: true,
      report,
      message: `Storage cleanup job executed. Freed ${report.freedStorageMB} MB across ${report.cleanedFilesCount} files.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Storage cleanup failed' });
  }
});
