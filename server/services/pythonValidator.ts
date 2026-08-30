/**
 * TeleHost Python Static Analyzer & Security Validator
 * Validates Python Telegram bot code for syntax correctness, file-size limits,
 * entry-point integrity, and security sandboxing compliance.
 */

export interface PythonValidationResult {
  isValid: boolean;
  fileSizeBytes: number;
  fileSizeMB: number;
  maxAllowedMB: number;
  syntaxErrors: Array<{ line: number; message: string }>;
  securityWarnings: Array<{ line: number; severity: 'critical' | 'warning' | 'info'; code: string; message: string }>;
  detectedFramework: 'aiogram' | 'telethon' | 'pyrogram' | 'python-telegram-bot' | 'custom';
  detectedDependencies: string[];
  sanitizedTokensCount: number;
  summary: string;
}

const MAX_FILE_SIZE_DEFAULT_MB = 5.0;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB strict limit

// Dangerous modules and primitives that should be flagged or blocked in sandboxed customer bots
const FORBIDDEN_SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
}> = [
  {
    pattern: /(?:import\s+ctypes|from\s+ctypes)/g,
    severity: 'critical',
    code: 'SEC_CTYPES_BLOCKED',
    message: 'Direct C-types memory access is restricted in containerized sandboxes.',
  },
  {
    pattern: /(?:os\.system\s*\(|subprocess\.Popen\s*\(|subprocess\.run\s*\(|os\.popen\s*\()/g,
    severity: 'warning',
    code: 'SEC_SUBPROCESS_SPAWN',
    message: 'Raw host shell execution detected. Will run under unprivileged container context (pids-limit=64, no-new-privileges).',
  },
  {
    pattern: /(?:import\s+pty|from\s+pty|pty\.spawn)/g,
    severity: 'critical',
    code: 'SEC_PTY_ESCAPE',
    message: 'Pseudoterminal allocation (pty.spawn) is restricted.',
  },
  {
    pattern: /(?:os\.fork\s*\(|os\.forkpty\s*\()/g,
    severity: 'critical',
    code: 'SEC_FORK_BOMB_PREVENTION',
    message: 'Uncontrolled process forking detected. Container pid limit is capped at 64.',
  },
  {
    pattern: /(?:\/etc\/shadow|\/etc\/passwd|\/proc\/1\/environ|\/var\/run\/docker\.sock)/g,
    severity: 'critical',
    code: 'SEC_HOST_PATH_TRAVERSAL',
    message: 'Attempted access to privileged host system paths or docker daemon socket.',
  },
  {
    pattern: /(?:169\.254\.169\.254)/g,
    severity: 'critical',
    code: 'SEC_METADATA_PROBE',
    message: 'Cloud instance metadata endpoint IP is blocked by network egress firewall.',
  },
];

export class PythonValidator {
  /**
   * Validates Python bot source code before saving or executing inside container
   */
  static validateSource(
    code: string,
    fileName: string = 'main.py',
    maxAllowedMB: number = MAX_FILE_SIZE_DEFAULT_MB
  ): PythonValidationResult {
    const sizeBytes = Buffer.byteLength(code, 'utf-8');
    const sizeMB = parseFloat((sizeBytes / (1024 * 1024)).toFixed(3));
    const effectiveLimitMB = Math.min(maxAllowedMB, MAX_FILE_SIZE_DEFAULT_MB);
    const effectiveLimitBytes = effectiveLimitMB * 1024 * 1024;

    const syntaxErrors: Array<{ line: number; message: string }> = [];
    const securityWarnings: Array<{ line: number; severity: 'critical' | 'warning' | 'info'; code: string; message: string }> = [];
    const detectedDependencies: Set<string> = new Set();
    let detectedFramework: 'aiogram' | 'telethon' | 'pyrogram' | 'python-telegram-bot' | 'custom' = 'custom';

    // 1. File Size Verification (Max 5MB per bot)
    if (sizeBytes > effectiveLimitBytes) {
      syntaxErrors.push({
        line: 1,
        message: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${effectiveLimitMB} MB. Please compress assets or split code.`,
      });
    }

    const lines = code.split('\n');

    // 2. Syntax & Basic AST Heuristics
    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;
    let inTripleQuoteSingle = false;
    let inTripleQuoteDouble = false;

    lines.forEach((lineText, index) => {
      const lineNum = index + 1;
      const trimmed = lineText.trim();

      // Check imports for framework & dependency detection
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        if (trimmed.includes('aiogram')) {
          detectedFramework = 'aiogram';
          detectedDependencies.add('aiogram>=3.0.0');
        } else if (trimmed.includes('telethon')) {
          detectedFramework = 'telethon';
          detectedDependencies.add('telethon>=1.30.0');
        } else if (trimmed.includes('pyrogram')) {
          detectedFramework = 'pyrogram';
          detectedDependencies.add('pyrogram>=2.0.0');
        } else if (trimmed.includes('telegram') || trimmed.includes('telegram.ext')) {
          detectedFramework = 'python-telegram-bot';
          detectedDependencies.add('python-telegram-bot>=20.0');
        }

        if (trimmed.includes('aiohttp')) detectedDependencies.add('aiohttp');
        if (trimmed.includes('requests')) detectedDependencies.add('requests');
        if (trimmed.includes('sqlalchemy')) detectedDependencies.add('sqlalchemy');
        if (trimmed.includes('redis')) detectedDependencies.add('redis');
        if (trimmed.includes('sqlite3')) detectedDependencies.add('sqlite3 (built-in)');
      }

      // Check for unclosed syntax tokens
      const singleQuotesMatches = (lineText.match(/'''/g) || []).length;
      if (singleQuotesMatches % 2 !== 0) inTripleQuoteSingle = !inTripleQuoteSingle;

      const doubleQuotesMatches = (lineText.match(/"""/g) || []).length;
      if (doubleQuotesMatches % 2 !== 0) inTripleQuoteDouble = !inTripleQuoteDouble;

      if (!inTripleQuoteSingle && !inTripleQuoteDouble && !trimmed.startsWith('#')) {
        for (const char of lineText) {
          if (char === '(') openParens++;
          else if (char === ')') openParens--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
          else if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
        }

        // Detect missing colon in Python statements
        if (
          /^(?:def\s+[a-zA-Z0-9_]+\s*\(.*\)|class\s+[a-zA-Z0-9_]+(?:\(.*\))?|if\s+.*|elif\s+.*|else|for\s+.*|while\s+.*|try|except(?:\s+.*)?|finally|async\s+def\s+[a-zA-Z0-9_]+\s*\(.*\))$/.test(
            trimmed
          ) &&
          !trimmed.endsWith(':')
        ) {
          syntaxErrors.push({
            line: lineNum,
            message: `SyntaxError: Expected ':' at end of statement '${trimmed}'`,
          });
        }

        // Detect invalid indentation / tab-space mixing
        if (lineText.startsWith('\t') && lineText.includes('    ')) {
          securityWarnings.push({
            line: lineNum,
            severity: 'info',
            code: 'STYLE_MIXED_INDENT',
            message: 'Mixed tabs and spaces in indentation detected.',
          });
        }
      }

      // 3. Security Inspection Patterns
      for (const rule of FORBIDDEN_SECURITY_PATTERNS) {
        if (rule.pattern.test(lineText)) {
          securityWarnings.push({
            line: lineNum,
            severity: rule.severity,
            code: rule.code,
            message: rule.message,
          });
        }
      }
    });

    if (openParens !== 0) {
      syntaxErrors.push({
        line: lines.length,
        message: `SyntaxError: Unmatched parentheses '()' (${openParens > 0 ? 'missing closing' : 'extra closing'})`,
      });
    }
    if (openBrackets !== 0) {
      syntaxErrors.push({
        line: lines.length,
        message: `SyntaxError: Unmatched brackets '[]' (${openBrackets > 0 ? 'missing closing' : 'extra closing'})`,
      });
    }
    if (openBraces !== 0) {
      syntaxErrors.push({
        line: lines.length,
        message: `SyntaxError: Unmatched braces '{}' (${openBraces > 0 ? 'missing closing' : 'extra closing'})`,
      });
    }

    // 4. Token Check & Sanitization
    const tokenRegex = /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g;
    const tokensFound = code.match(tokenRegex) || [];

    const hasCriticalSec = securityWarnings.some((w) => w.severity === 'critical');
    const isValid = syntaxErrors.length === 0 && !hasCriticalSec;

    let summary = 'Code passed all validation checks and is ready for isolated container execution.';
    if (!isValid) {
      if (syntaxErrors.length > 0) {
        summary = `Syntax validation failed with ${syntaxErrors.length} error(s).`;
      } else if (hasCriticalSec) {
        summary = `Security validation rejected unsafe operations (${securityWarnings.filter((w) => w.severity === 'critical').length} critical issues).`;
      }
    } else if (securityWarnings.length > 0) {
      summary = `Code is valid with ${securityWarnings.length} informational notice(s).`;
    }

    return {
      isValid,
      fileSizeBytes: sizeBytes,
      fileSizeMB: sizeMB,
      maxAllowedMB: effectiveLimitMB,
      syntaxErrors,
      securityWarnings,
      detectedFramework,
      detectedDependencies: Array.from(detectedDependencies),
      sanitizedTokensCount: tokensFound.length,
      summary,
    };
  }
}
