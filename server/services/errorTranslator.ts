/**
 * TeleHost Intelligent Error Translation & Root Cause Diagnosis Engine
 * 
 * Translates complex, cryptic Linux container & Python tracebacks into
 * plain English, non-technical explanations for regular users, while
 * preserving and structuring full technical details for advanced developers.
 */

export interface TranslatedError {
  isError: boolean;
  errorCategory: 
    | 'missing_package'
    | 'invalid_token'
    | 'syntax_error'
    | 'memory_limit'
    | 'network_timeout'
    | 'database_locked'
    | 'indentation'
    | 'permission_denied'
    | 'rate_limit'
    | 'port_conflict'
    | 'file_not_found'
    | 'runtime_exception';
  friendlyTitle: string;
  friendlyMessage: string;
  suggestedFix: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  technicalDetails: {
    rawError: string;
    exceptionType?: string;
    offendingLine?: number;
    offendingFile?: string;
    suggestedCommand?: string;
    stackTrace?: string;
  };
}

export class ErrorTranslator {
  /**
   * Translates any raw error message or Python traceback into a customer-friendly diagnosis
   */
  public static translate(rawMessage: string): TranslatedError {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return {
        isError: false,
        errorCategory: 'runtime_exception',
        friendlyTitle: 'No Error Detected',
        friendlyMessage: 'Bot is operating normally.',
        suggestedFix: 'No action required.',
        severity: 'info',
        technicalDetails: { rawError: '' },
      };
    }

    const text = rawMessage.trim();

    // Ignore intermediate traceback lines, source code snippets, and standard logs that are not actual errors
    if (
      text.startsWith('File "') ||
      text.startsWith('^^^^') ||
      text.startsWith('return await') ||
      text.startsWith('await ') ||
      text.startsWith('return ') ||
      text.startsWith('def ') ||
      text.startsWith('async ') ||
      text.startsWith('raise ') ||
      text.startsWith('result =') ||
      text.startsWith('The above exception') ||
      text.startsWith('During handling of') ||
      text === '^' ||
      text.startsWith('Traceback') ||
      text.includes('INFO - HTTP Request:') ||
      text.includes('Network Retry Loop')
    ) {
      return {
        isError: false,
        errorCategory: 'runtime_exception',
        friendlyTitle: 'Traceback Info',
        friendlyMessage: '',
        suggestedFix: '',
        severity: 'info',
        technicalDetails: { rawError: text },
      };
    }

    // 1. Missing Python Package / ModuleNotFoundError / ImportError
    if (
      text.includes('ModuleNotFoundError') ||
      text.includes('ImportError') ||
      text.includes('No module named')
    ) {
      const match = text.match(/No module named ['"]([^'"]+)['"]/i) ||
                    text.match(/ModuleNotFoundError:\s+([^\n\r]+)/i) ||
                    text.match(/cannot import name ['"]([^'"]+)['"]/i);
      const pkgName = match ? match[1].replace(/['"]/g, '').trim() : 'a required module';

      return {
        isError: true,
        errorCategory: 'missing_package',
        friendlyTitle: 'Missing Python Package',
        friendlyMessage: `Bot stopped because a required Python package (${pkgName}) is missing.`,
        suggestedFix: `Install the package by including "${pkgName}" in your requirements.txt or uploading the required module file.`,
        severity: 'critical',
        technicalDetails: {
          rawError: text,
          exceptionType: 'ModuleNotFoundError',
          suggestedCommand: `pip install ${pkgName}`,
          stackTrace: text,
        },
      };
    }

    // 2. Invalid Telegram Bot Token / Unauthorized 401
    if (
      text.includes('Unauthorized') ||
      text.includes('InvalidToken') ||
      text.includes('telegram.error.Unauthorized') ||
      text.includes('Invalid bot token') ||
      text.includes('Error code 401') ||
      text.includes('Bad Request: wrong bot token')
    ) {
      return {
        isError: true,
        errorCategory: 'invalid_token',
        friendlyTitle: 'Invalid Telegram Bot Token',
        friendlyMessage: 'Bot could not connect to Telegram because the API Bot Token is invalid, expired, or revoked.',
        suggestedFix: 'Verify your bot token against @BotFather on Telegram. You can set it in your Python script directly (e.g. main.py) or in Environment Variables under Configuration.',
        severity: 'critical',
        technicalDetails: {
          rawError: text,
          exceptionType: 'TelegramUnauthorizedError (401)',
          suggestedCommand: 'Verify token with https://api.telegram.org/bot<TOKEN>/getMe',
          stackTrace: text,
        },
      };
    }

    // 3. Out of Memory / OOM Killed
    if (
      text.includes('OOMKilled') ||
      text.includes('MemoryError') ||
      text.includes('cgroup memory limit exceeded') ||
      text.includes('Container killed due to memory exhaustion')
    ) {
      return {
        isError: true,
        errorCategory: 'memory_limit',
        friendlyTitle: 'Memory Limit Exceeded',
        friendlyMessage: 'Bot was stopped because it exceeded its allocated memory (RAM) limit.',
        suggestedFix: 'Optimize data structures in your Python code, clear in-memory caches, or upgrade your plan RAM allocation in settings.',
        severity: 'critical',
        technicalDetails: {
          rawError: text,
          exceptionType: 'MemoryError / SIGKILL (OOM)',
          suggestedCommand: 'Monitor memory usage with memory_profiler or tracemalloc',
          stackTrace: text,
        },
      };
    }

    // 4. Python Syntax Error
    if (text.includes('SyntaxError') || text.includes('invalid syntax')) {
      const lineMatch = text.match(/line (\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      const fileMatch = text.match(/File ['"]([^'"]+)['"]/i);
      const fileName = fileMatch ? fileMatch[1] : 'main.py';

      return {
        isError: true,
        errorCategory: 'syntax_error',
        friendlyTitle: 'Python Code Syntax Error',
        friendlyMessage: `Bot failed to start due to a syntax error in your Python code${lineNum ? ` on line ${lineNum}` : ''}.`,
        suggestedFix: `Check ${fileName}${lineNum ? ` at line ${lineNum}` : ''} for missing colons, unbalanced parentheses, or misplaced punctuation in the File Explorer code editor.`,
        severity: 'critical',
        technicalDetails: {
          rawError: text,
          exceptionType: 'SyntaxError',
          offendingLine: lineNum,
          offendingFile: fileName,
          stackTrace: text,
        },
      };
    }

    // 5. Indentation Error / Tab Error
    if (text.includes('IndentationError') || text.includes('TabError') || text.includes('unindent does not match')) {
      const lineMatch = text.match(/line (\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

      return {
        isError: true,
        errorCategory: 'indentation',
        friendlyTitle: 'Code Indentation Issue',
        friendlyMessage: `Bot stopped because Python found misaligned spaces or tabs in your code${lineNum ? ` around line ${lineNum}` : ''}.`,
        suggestedFix: 'Ensure your code consistently uses 4 spaces for every indent level. Avoid mixing tabs and spaces.',
        severity: 'error',
        technicalDetails: {
          rawError: text,
          exceptionType: 'IndentationError',
          offendingLine: lineNum,
          stackTrace: text,
        },
      };
    }

    // 6. SQLite Database Locked / Database Busy
    if (
      text.includes('sqlite3.OperationalError: database is locked') ||
      text.includes('database is locked') ||
      text.includes('OperationalError: disk I/O error')
    ) {
      return {
        isError: true,
        errorCategory: 'database_locked',
        friendlyTitle: 'Database File Locked',
        friendlyMessage: 'Bot database file is temporarily locked or in use by another concurrent task.',
        suggestedFix: 'Ensure your database queries properly close connections with context managers (e.g. `with sqlite3.connect(...) as conn:`).',
        severity: 'warning',
        technicalDetails: {
          rawError: text,
          exceptionType: 'sqlite3.OperationalError',
          suggestedCommand: 'PRAGMA busy_timeout = 5000;',
          stackTrace: text,
        },
      };
    }

    // 7. Network / Telegram Connection Timeout
    if (
      text.includes('NetworkError') ||
      text.includes('TimedOut') ||
      text.includes('ConnectTimeout') ||
      text.includes('ConnectError') ||
      text.includes('httpcore.ConnectTimeout') ||
      text.includes('httpx.ConnectTimeout') ||
      text.includes('ConnectionRefusedError') ||
      text.includes('RemoteDisconnected') ||
      text.includes('telegram.error.NetworkError') ||
      text.includes('telegram.error.TimedOut')
    ) {
      return {
        isError: true,
        errorCategory: 'network_timeout',
        friendlyTitle: 'Temporary Network Connection Timeout',
        friendlyMessage: 'Bot encountered a network timeout while connecting to the Telegram API servers.',
        suggestedFix: 'Check that your VPS firewall or outbound network permits HTTPS traffic to api.telegram.org:443. In python-telegram-bot or aiogram, consider increasing request timeout or using a proxy.',
        severity: 'warning',
        technicalDetails: {
          rawError: text,
          exceptionType: 'NetworkError / ConnectTimeout',
          suggestedCommand: 'curl -v https://api.telegram.org',
          stackTrace: text,
        },
      };
    }

    // 8. Sandbox Permission / Restricted Path Error
    if (
      text.includes('PermissionError') ||
      text.includes('Permission denied') ||
      text.includes('Read-only file system') ||
      text.includes('EACCES')
    ) {
      return {
        isError: true,
        errorCategory: 'permission_denied',
        friendlyTitle: 'Sandbox Permission Block',
        friendlyMessage: 'Bot attempted to modify a system directory outside its isolated customer workspace.',
        suggestedFix: 'Save files inside your bot folder (/app or current relative working directory) rather than system root folders.',
        severity: 'error',
        technicalDetails: {
          rawError: text,
          exceptionType: 'PermissionError (cgroups read-only rootfs)',
          stackTrace: text,
        },
      };
    }

    // 9. Telegram Rate Limit / Flood Control (429)
    if (text.includes('FloodWait') || text.includes('RetryAfter') || text.includes('429 Too Many Requests') || text.includes('FLOOD_WAIT')) {
      const waitMatch = text.match(/wait of (\d+)/i) || text.match(/retry in (\d+)/i) || text.match(/RetryAfter\((\d+)\)/i);
      const seconds = waitMatch ? waitMatch[1] : 'a few';

      return {
        isError: true,
        errorCategory: 'rate_limit',
        friendlyTitle: 'Telegram Flood Wait',
        friendlyMessage: `Telegram API rate limit reached. Bot is paused for ${seconds} seconds to comply with Telegram rules.`,
        suggestedFix: 'Implement request throttling / message queues in your bot to avoid sending too many messages simultaneously.',
        severity: 'warning',
        technicalDetails: {
          rawError: text,
          exceptionType: 'TelegramRetryAfter (429 Flood Control)',
          stackTrace: text,
        },
      };
    }

    // 10. File Not Found
    if (text.includes('FileNotFoundError') || text.includes('No such file or directory')) {
      const match = text.match(/No such file or directory:\s*['"]([^'"]+)['"]/i);
      const fileName = match ? match[1] : 'the specified file';

      return {
        isError: true,
        errorCategory: 'file_not_found',
        friendlyTitle: 'File Not Found',
        friendlyMessage: `Bot could not find a required file: "${fileName}".`,
        suggestedFix: 'Upload the missing file using the Files tab or ensure relative file paths match your project structure.',
        severity: 'error',
        technicalDetails: {
          rawError: text,
          exceptionType: 'FileNotFoundError',
          stackTrace: text,
        },
      };
    }

    // 11. Generic Python Runtime Exception - Only if it explicitly looks like an Exception class
    const excMatch = text.match(/([a-zA-Z0-9_]+Error|[a-zA-Z0-9_]+Exception):\s*([^\n\r]+)/i);
    if (!excMatch) {
      return {
        isError: false,
        errorCategory: 'runtime_exception',
        friendlyTitle: '',
        friendlyMessage: '',
        suggestedFix: '',
        severity: 'info',
        technicalDetails: { rawError: text },
      };
    }

    const lineMatch = text.match(/line (\d+)/i);
    const excType = excMatch[1];
    const excDetail = excMatch[2] || text.slice(0, 120);

    return {
      isError: true,
      errorCategory: 'runtime_exception',
      friendlyTitle: `${excType} Encountered`,
      friendlyMessage: `Bot encountered a ${excType}: "${excDetail}".`,
      suggestedFix: 'Inspect the technical traceback details in the console to locate the issue in your Python script.',
      severity: 'error',
      technicalDetails: {
        rawError: text,
        exceptionType: excType,
        offendingLine: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        stackTrace: text,
      },
    };
  }

  /**
   * Formats human-readable bot status descriptors
   */
  public static getReadableStatus(status: string): {
    badge: string;
    description: string;
    color: 'emerald' | 'amber' | 'slate' | 'sky' | 'rose';
  } {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
      case 'hosting':
        return {
          badge: 'Hosting',
          description: 'Bot is currently running.',
          color: 'emerald',
        };
      case 'paused':
        return {
          badge: 'Paused',
          description: 'Bot has been temporarily paused.',
          color: 'amber',
        };
      case 'stopped':
        return {
          badge: 'Stopped',
          description: 'Bot is not running.',
          color: 'slate',
        };
      case 'starting':
      case 'deploying':
      case 'restarting':
        return {
          badge: 'Starting',
          description: 'Bot is starting.',
          color: 'sky',
        };
      case 'error':
      case 'crashed':
        return {
          badge: 'Error',
          description: 'Bot could not run successfully.',
          color: 'rose',
        };
      case 'expired':
        return {
          badge: 'Expired',
          description: 'Hosting plan has expired.',
          color: 'rose',
        };
      default:
        return {
          badge: status ? status.toUpperCase() : 'Unknown',
          description: 'Bot status is currently being determined.',
          color: 'slate',
        };
    }
  }
}
