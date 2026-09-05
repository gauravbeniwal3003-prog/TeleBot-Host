/**
 * TeleHost Hardened Bot Logging & Monitoring Engine
 * 
 * Features:
 * 1. Strict multi-tenant isolation per user and bot
 * 2. Automatic log rotation (limits entries to 500 lines per bot, ~250KB max)
 * 3. Automatic error detection and plain English translation
 * 4. Fast in-memory search with level and keyword filtering
 * 5. Clean download export formatting (.log file)
 * 6. Health & Uptime monitoring metrics
 */

import { db } from '../db/database';
import { DBBotLog } from '../db/schema';
import { ErrorTranslator, TranslatedError } from './errorTranslator';
import { execSync } from 'child_process';
import fs from 'fs';

export interface BotLogQueryOptions {
  search?: string;
  level?: 'all' | 'info' | 'warn' | 'error' | 'debug' | 'system' | 'success';
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface BotMonitoringOverview {
  botId: string;
  botName: string;
  username: string;
  framework: string;
  status: string;
  statusBadge: string;
  statusDescription: string;
  statusColor: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  restartCount: number;
  lastStartedAt?: string;
  lastStoppedAt?: string;
  lastError?: {
    friendlyTitle: string;
    friendlyMessage: string;
    suggestedFix: string;
    severity: string;
    technicalDetails: any;
    occurredAt: string;
  } | null;
  logStats: {
    totalEntries: number;
    errorEntriesCount: number;
    warningEntriesCount: number;
    approximateSizeBytes: number;
    approximateSizeKB: number;
    maxAllowedEntries: number;
    isRotationActive: boolean;
  };
  recentLogs: Array<{
    id: string;
    timestamp: string;
    level: string;
    message: string;
    friendlyMessage?: string;
    suggestedFix?: string;
    technicalDetails?: any;
  }>;
}

export class LogManager {
  public static readonly MAX_LOGS_PER_BOT = 500; // Cap log history per bot to protect VPS disk
  public static readonly MAX_LOG_PAYLOAD_BYTES = 256 * 1024; // 256 KB

  /**
   * Appends a log entry for a bot with strict user isolation and automatic rotation
   */
  public static appendLog(
    botId: string,
    userId: string,
    level: 'info' | 'warn' | 'error' | 'debug' | 'system',
    rawMessage: string,
    metadata?: Record<string, any>
  ): { log: DBBotLog; translatedError?: TranslatedError } {
    let friendlyMessage: string | undefined;
    let suggestedFix: string | undefined;
    let technicalDetails: string | undefined;
    let translated: TranslatedError | undefined;

    // If this is an error or warning, pass through intelligent translator
    if (level === 'error' || level === 'warn' || rawMessage.includes('Traceback') || rawMessage.includes('Error:')) {
      translated = ErrorTranslator.translate(rawMessage);
      friendlyMessage = translated.friendlyMessage;
      suggestedFix = translated.suggestedFix;
      technicalDetails = JSON.stringify(translated.technicalDetails);

      // Record last error on bot object if it's critical
      if (level === 'error' || translated.severity === 'critical') {
        const bot = db.getBotDirect(botId);
        if (bot) {
          bot.last_error = rawMessage;
          bot.last_error_friendly = friendlyMessage;
          bot.last_error_technical = technicalDetails;
          if (bot.status !== 'stopped' && bot.status !== 'expired') {
            bot.status = 'error';
          }
          db.save();
        }
      }
    }

    const log = db.appendBotLog(botId, userId, level, rawMessage);

    // Auto-rotate if bot logs exceed ceiling
    this.rotateLogsIfNecessary(botId, userId);

    return { log, translatedError: translated };
  }

  /**
   * Retrieves filtered and searched logs for a specific user and bot
   */
  public static getLogs(
    botId: string,
    userId: string,
    options: BotLogQueryOptions = {}
  ): {
    logs: Array<{
      id: string;
      timestamp: string;
      level: string;
      message: string;
      friendlyMessage?: string;
      suggestedFix?: string;
      technicalDetails?: any;
    }>;
    totalCount: number;
    filteredCount: number;
  } {
    let rawLogs = db.getBotLogs(botId, userId, 1000);

    // Fetch real-time VPS execution logs natively via journalctl
    if (fs.existsSync('/var/telebot-data/bots')) {
      try {
        const journalOutput = execSync(`journalctl -u telebot-bot-${botId} --no-pager -n 150 -o short-iso`).toString();
        const lines = journalOutput.split('\n').filter(l => l.trim().length > 0);
        
        const terminalLogs = lines.map((line, idx) => {
          // parse ISO time from start of line if possible
          const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))\s+(.*)/);
          let ts = new Date().toISOString();
          let msg = line;
          if (match) {
            ts = match[1];
            msg = match[2];
          }
          
          let lvl = 'info';
          const msgLower = msg.toLowerCase();
          if (msgLower.includes('error') || msgLower.includes('traceback') || msgLower.includes('exception')) lvl = 'error';
          else if (msgLower.includes('warn')) lvl = 'warn';
          
          return {
            id: `term_${Date.now()}_${idx}`,
            bot_id: botId,
            project_id: 'vps',
            user_id: userId,
            level: lvl,
            message: `[Terminal] ${msg}`,
            timestamp: ts
          } as DBBotLog;
        });

        // Merge DB logs and Terminal Logs, then sort by timestamp descending
        rawLogs = [...rawLogs, ...terminalLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (err) {
        // journalctl may fail if unit doesn't exist yet
      }
    }

    const totalCount = rawLogs.length;

    let filtered = rawLogs;

    // 1. Level Filter
    if (options.level && options.level !== 'all') {
      filtered = filtered.filter((l) => l.level === options.level);
    }

    // 2. Search Keyword Filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter((l) => {
        return (
          l.message.toLowerCase().includes(q) ||
          l.level.toLowerCase().includes(q) ||
          l.timestamp.toLowerCase().includes(q)
        );
      });
    }

    // 3. Limit & Offset
    const limit = options.limit || 200;
    const offset = options.offset || 0;
    const paginated = filtered.slice(Math.max(0, filtered.length - limit - offset), filtered.length - offset);

    // Enrich logs with translated error explanations where applicable
    const enriched = paginated.map((l) => {
      let friendlyMessage: string | undefined;
      let suggestedFix: string | undefined;
      let technicalDetails: any = undefined;

      if (l.level === 'error' || l.message.includes('Traceback') || l.message.includes('Error')) {
        const trans = ErrorTranslator.translate(l.message);
        if (trans.isError) {
          friendlyMessage = trans.friendlyMessage;
          suggestedFix = trans.suggestedFix;
          technicalDetails = trans.technicalDetails;
        }
      }

      return {
        id: l.id,
        timestamp: l.timestamp,
        level: l.level,
        message: l.message,
        friendlyMessage,
        suggestedFix,
        technicalDetails,
      };
    });

    return {
      logs: enriched,
      totalCount,
      filteredCount: filtered.length,
    };
  }

  /**
   * Formats logs into clean text for download
   */
  public static exportLogsAsText(botId: string, userId: string): string {
    const bot = db.getBotById(botId, userId);
    if (!bot) throw new Error('Bot not found or unauthorized');

    const logs = db.getBotLogs(botId, userId, 2000);
    const readableStatus = ErrorTranslator.getReadableStatus(bot.status);

    const header = [
      `================================================================================`,
      ` TELEHOST BOT LOG EXPORT`,
      ` Bot Name:        ${bot.name} (${bot.username})`,
      ` Bot ID:          ${bot.id}`,
      ` Framework:       ${bot.framework}`,
      ` Status:          ${readableStatus.badge} - ${readableStatus.description}`,
      ` Total Logs:      ${logs.length} entries`,
      ` Exported At:     ${new Date().toISOString()}`,
      ` Multi-tenant ID: Isolated (${userId})`,
      `================================================================================\n`,
    ].join('\n');

    const body = logs
      .map((l) => {
        const time = new Date(l.timestamp).toISOString();
        const levelTag = `[${l.level.toUpperCase()}]`.padEnd(8, ' ');
        return `[${time}] ${levelTag} ${l.message}`;
      })
      .join('\n');

    return header + body;
  }

  /**
   * Clears all log entries for a specific bot (Strictly scoped to user)
   */
  public static clearLogs(botId: string, userId: string): { clearedCount: number; message: string } {
    const bot = db.getBotById(botId, userId);
    if (!bot) throw new Error('Bot not found or unauthorized');

    const clearedCount = db.clearBotLogs(botId, userId);

    // Log the clear action
    this.appendLog(
      botId,
      userId,
      'system',
      `[Log System] Customer cleared log buffer. Freed ${clearedCount} log entries.`
    );

    return {
      clearedCount,
      message: `Successfully purged ${clearedCount} log entries from container storage.`,
    };
  }

  /**
   * Rotates bot logs automatically when exceeding MAX_LOGS_PER_BOT
   */
  public static rotateLogsIfNecessary(botId: string, userId: string): boolean {
    const result = db.rotateBotLogs(botId, userId, this.MAX_LOGS_PER_BOT);
    return result.removed > 0;
  }

  /**
   * Calculates comprehensive monitoring metrics for a bot dashboard
   */
  public static getBotMonitoringOverview(botId: string, userId: string): BotMonitoringOverview {
    const bot = db.getBotById(botId, userId);
    if (!bot) throw new Error('Bot not found or unauthorized');

    const logs = db.getBotLogs(botId, userId, 500);
    const readable = ErrorTranslator.getReadableStatus(bot.status);

    // Calculate uptime formatted
    const uptimeSec = bot.uptime_seconds || 0;
    const days = Math.floor(uptimeSec / 86400);
    const hrs = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    let uptimeFormatted = '0m (Offline)';
    if (uptimeSec > 0) {
      if (days > 0) uptimeFormatted = `${days}d ${hrs}h ${mins}m`;
      else if (hrs > 0) uptimeFormatted = `${hrs}h ${mins}m`;
      else uptimeFormatted = `${mins}m`;
    }

    // Log size calculation
    const totalChars = logs.reduce((acc, l) => acc + l.message.length + 50, 0);
    const errorCount = logs.filter((l) => l.level === 'error').length;
    const warnCount = logs.filter((l) => l.level === 'warn').length;

    // Detect last error
    let lastErrorObj = null;
    if (bot.last_error) {
      const trans = ErrorTranslator.translate(bot.last_error);
      lastErrorObj = {
        friendlyTitle: trans.friendlyTitle,
        friendlyMessage: bot.last_error_friendly || trans.friendlyMessage,
        suggestedFix: trans.suggestedFix,
        severity: trans.severity,
        technicalDetails: trans.technicalDetails,
        occurredAt: bot.updated_at || new Date().toISOString(),
      };
    } else {
      const lastErrorLog = [...logs].reverse().find((l) => l.level === 'error');
      if (lastErrorLog) {
        const trans = ErrorTranslator.translate(lastErrorLog.message);
        lastErrorObj = {
          friendlyTitle: trans.friendlyTitle,
          friendlyMessage: trans.friendlyMessage,
          suggestedFix: trans.suggestedFix,
          severity: trans.severity,
          technicalDetails: trans.technicalDetails,
          occurredAt: lastErrorLog.timestamp,
        };
      }
    }

    const recentLogs = logs.slice(-50).map((l) => {
      let friendlyMessage: string | undefined;
      let suggestedFix: string | undefined;
      let technicalDetails: any = undefined;

      if (l.level === 'error') {
        const trans = ErrorTranslator.translate(l.message);
        friendlyMessage = trans.friendlyMessage;
        suggestedFix = trans.suggestedFix;
        technicalDetails = trans.technicalDetails;
      }

      return {
        id: l.id,
        timestamp: l.timestamp,
        level: l.level,
        message: l.message,
        friendlyMessage,
        suggestedFix,
        technicalDetails,
      };
    });

    return {
      botId: bot.id,
      botName: bot.name,
      username: bot.username,
      framework: bot.framework,
      status: bot.status,
      statusBadge: readable.badge,
      statusDescription: readable.description,
      statusColor: readable.color,
      uptimeSeconds: bot.uptime_seconds,
      uptimeFormatted,
      restartCount: bot.restart_count || 0,
      lastStartedAt: bot.last_started_at,
      lastStoppedAt: bot.last_stopped_at,
      lastError: lastErrorObj,
      logStats: {
        totalEntries: logs.length,
        errorEntriesCount: errorCount,
        warningEntriesCount: warnCount,
        approximateSizeBytes: totalChars,
        approximateSizeKB: Math.round(totalChars / 1024 * 10) / 10,
        maxAllowedEntries: this.MAX_LOGS_PER_BOT,
        isRotationActive: true,
      },
      recentLogs,
    };
  }
}
