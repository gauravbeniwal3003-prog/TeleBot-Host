/**
 * TeleHost Python Static Analyzer & Security Validator
 * Validates Python Telegram bot code for syntax correctness, file-size limits,
 * entry-point integrity, and security sandboxing compliance.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';

export interface ASTSyntaxError {
  line: number;
  column: number;
  errorType: 'SyntaxError' | 'IndentationError' | 'TabError' | 'TokenError' | 'ParseError' | string;
  message: string;
  lineText: string;
  pointer: string;
  suggestedFix: string;
  fileName: string;
}

export interface PythonASTValidationResult {
  isValid: boolean;
  fileName: string;
  syntaxErrors: ASTSyntaxError[];
  summary: string;
}

export interface PythonValidationResult {
  isValid: boolean;
  fileSizeBytes: number;
  fileSizeMB: number;
  maxAllowedMB: number;
  syntaxErrors: ASTSyntaxError[];
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
   * Run high-precision Python AST syntax & indentation pre-validation on source code string.
   * Executes Python's native `ast.parse()` engine with fallback to robust regex AST tokenizer.
   */
  static validateASTSync(
    code: string,
    fileName: string = 'main.py',
    pythonBin?: string
  ): PythonASTValidationResult {
    const bin = pythonBin || process.env.PYTHON_BIN || (fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');

    const pythonScript = `
import ast, sys, json

try:
    code = sys.stdin.read()
    filename = sys.argv[1] if len(sys.argv) > 1 else "main.py"
    ast.parse(code, filename=filename)
    print(json.dumps({"valid": True, "syntaxErrors": []}))
except (SyntaxError, IndentationError, TabError) as e:
    lineno = e.lineno or 1
    offset = e.offset or 1
    raw_text = (e.text or "").rstrip("\\r\\n")
    caret = " " * max(0, offset - 1) + "^" if raw_text else "^"
    err_type = type(e).__name__
    msg = e.msg or "Invalid syntax"
    
    trimmed = raw_text.strip()
    suggestion = ""
    if "expected ':'" in msg or "colon" in msg.lower() or (err_type == "SyntaxError" and trimmed.startswith(("def ", "class ", "if ", "elif ", "else", "for ", "while ", "try", "except", "finally", "with ", "async def ", "async with ")) and not trimmed.endswith(":")):
        suggestion = f"Add a colon ':' at the end of the statement on line {lineno}: {trimmed}:"
    elif "indented block" in msg.lower():
        suggestion = f"Add at least 4 spaces of indentation for the block following line {max(1, lineno - 1)}."
    elif "unindent does not match" in msg.lower() or "unexpected indent" in msg.lower():
        suggestion = f"Fix indentation on line {lineno}. Python requires consistent 4-space indentation; avoid mixing tabs."
    elif "inconsistent use of tabs" in msg.lower():
        suggestion = f"Convert all tabs to 4 spaces on line {lineno}."
    elif "never closed" in msg.lower() or "unclosed" in msg.lower():
        suggestion = f"Close the unclosed parenthesis '()', bracket '[]', or quotation mark before or on line {lineno}."
    else:
        suggestion = f"Inspect Python syntax near column {offset} on line {lineno}."

    print(json.dumps({
        "valid": False,
        "syntaxErrors": [{
            "line": lineno,
            "column": offset,
            "errorType": err_type,
            "message": msg,
            "lineText": raw_text,
            "pointer": caret,
            "suggestedFix": suggestion,
            "fileName": filename
        }]
    }))
except Exception as ex:
    print(json.dumps({
        "valid": False,
        "syntaxErrors": [{
            "line": 1,
            "column": 1,
            "errorType": "ParseError",
            "message": str(ex),
            "lineText": "",
            "pointer": "^",
            "suggestedFix": "Verify Python file structure",
            "fileName": filename
        }]
    }))
`;

    try {
      const res = spawnSync(bin, ['-c', pythonScript, fileName], {
        input: code,
        encoding: 'utf-8',
        timeout: 5000,
        env: {
          PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          PYTHONUNBUFFERED: '1',
        },
      });

      if (res.stdout) {
        const parsed = JSON.parse(res.stdout.trim());
        if (parsed && typeof parsed.valid === 'boolean') {
          return {
            isValid: parsed.valid,
            fileName,
            syntaxErrors: parsed.syntaxErrors || [],
            summary: parsed.valid
              ? 'Python AST syntax verification passed.'
              : `Python AST syntax error: ${parsed.syntaxErrors?.[0]?.message || 'Invalid syntax'}`,
          };
        }
      }
    } catch {
      // Fallback to JS heuristics below
    }

    // Pure JavaScript Fallback AST & Indentation Tokenizer
    return PythonValidator.fallbackValidateAST(code, fileName);
  }

  /**
   * Run AST syntax check directly on a file path
   */
  static validateASTFile(filePath: string, pythonBin?: string): PythonASTValidationResult {
    const fileName = filePath.split(/[/\\]/).pop() || 'main.py';
    try {
      if (!fs.existsSync(filePath)) {
        return {
          isValid: false,
          fileName,
          syntaxErrors: [
            {
              line: 1,
              column: 1,
              errorType: 'ParseError',
              message: `File '${fileName}' not found at path: ${filePath}`,
              lineText: '',
              pointer: '^',
              suggestedFix: 'Ensure entry point file exists before starting bot.',
              fileName,
            },
          ],
          summary: `File '${fileName}' not found`,
        };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return PythonValidator.validateASTSync(content, fileName, pythonBin);
    } catch (err: any) {
      return {
        isValid: false,
        fileName,
        syntaxErrors: [
          {
            line: 1,
            column: 1,
            errorType: 'ParseError',
            message: `Failed to read file for AST inspection: ${err.message}`,
            lineText: '',
            pointer: '^',
            suggestedFix: 'Check file permissions or disk storage.',
            fileName,
          },
        ],
        summary: err.message,
      };
    }
  }

  /**
   * Validate entire bot workspace: checks entry point first, then all .py files in directory
   */
  static validateWorkspaceAST(botDir: string, entryPoint: string = 'main.py', pythonBin?: string): PythonASTValidationResult {
    const primaryPath = fs.existsSync(entryPoint) ? entryPoint : `${botDir}/${entryPoint}`;
    const primaryRes = PythonValidator.validateASTFile(primaryPath, pythonBin);
    if (!primaryRes.isValid) {
      return primaryRes;
    }

    // Check other python files in the workspace
    try {
      if (fs.existsSync(botDir)) {
        const files = fs.readdirSync(botDir).filter((f) => f.endsWith('.py') && f !== entryPoint);
        for (const file of files) {
          const subRes = PythonValidator.validateASTFile(`${botDir}/${file}`, pythonBin);
          if (!subRes.isValid) {
            return subRes;
          }
        }
      }
    } catch {}

    return {
      isValid: true,
      fileName: entryPoint,
      syntaxErrors: [],
      summary: 'All Python workspace files passed AST syntax and indentation checks.',
    };
  }

  /**
   * Robust JavaScript fallback AST tokenizer for environments where Python binary execution is unavailable
   */
  private static fallbackValidateAST(code: string, fileName: string): PythonASTValidationResult {
    const syntaxErrors: ASTSyntaxError[] = [];
    const lines = code.split('\n');
    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;
    let inTripleQuoteSingle = false;
    let inTripleQuoteDouble = false;

    let prevNonEmptyIndent = 0;
    let prevEndsWithColon = false;
    let prevLineNumber = 1;

    for (let index = 0; index < lines.length; index++) {
      const lineNum = index + 1;
      const lineText = lines[index];
      const trimmed = lineText.trim();

      const singleMatches = (lineText.match(/'''/g) || []).length;
      if (singleMatches % 2 !== 0) inTripleQuoteSingle = !inTripleQuoteSingle;
      const doubleMatches = (lineText.match(/"""/g) || []).length;
      if (doubleMatches % 2 !== 0) inTripleQuoteDouble = !inTripleQuoteDouble;

      if (inTripleQuoteSingle || inTripleQuoteDouble || trimmed.startsWith('#') || trimmed.length === 0) {
        continue;
      }

      // Check brackets
      for (const char of lineText) {
        if (char === '(') openParens++;
        else if (char === ')') openParens--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
        else if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
      }

      // Calculate leading indent
      const indentMatch = lineText.match(/^[ \t]*/);
      const currentIndent = indentMatch ? indentMatch[0].length : 0;

      // Missing colon check
      const colonStatementRegex = /^(?:def\s+[a-zA-Z0-9_]+\s*\(.*\)|class\s+[a-zA-Z0-9_]+(?:\(.*\))?|if\s+.*|elif\s+.*|else|for\s+.*|while\s+.*|try|except(?:\s+.*)?|finally|with\s+.*|async\s+def\s+[a-zA-Z0-9_]+\s*\(.*\)|async\s+with\s+.*|async\s+for\s+.*)$/;
      if (colonStatementRegex.test(trimmed) && !trimmed.endsWith(':')) {
        syntaxErrors.push({
          line: lineNum,
          column: lineText.length,
          errorType: 'SyntaxError',
          message: `expected ':'`,
          lineText: lineText.trimEnd(),
          pointer: ' '.repeat(Math.max(0, lineText.trimEnd().length - 1)) + '^',
          suggestedFix: `Add a colon ':' at the end of line ${lineNum}: ${trimmed}:`,
          fileName,
        });
        break;
      }

      // Indentation Error check after colon
      if (prevEndsWithColon && currentIndent <= prevNonEmptyIndent) {
        syntaxErrors.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          message: `expected an indented block after statement on line ${prevLineNumber}`,
          lineText: lineText.trimEnd(),
          pointer: '^',
          suggestedFix: `Indent line ${lineNum} with 4 spaces to form a code block.`,
          fileName,
        });
        break;
      }

      // Tab mixing check
      if (lineText.startsWith('\t') && lineText.includes('    ')) {
        syntaxErrors.push({
          line: lineNum,
          column: 1,
          errorType: 'TabError',
          message: `inconsistent use of tabs and spaces in indentation`,
          lineText: lineText.trimEnd(),
          pointer: '^',
          suggestedFix: `Replace tabs with 4 spaces on line ${lineNum}.`,
          fileName,
        });
        break;
      }

      prevNonEmptyIndent = currentIndent;
      prevEndsWithColon = trimmed.endsWith(':');
      prevLineNumber = lineNum;
    }

    if (syntaxErrors.length === 0) {
      if (openParens > 0) {
        syntaxErrors.push({
          line: lines.length,
          column: 1,
          errorType: 'SyntaxError',
          message: `'(' was never closed`,
          lineText: '',
          pointer: '^',
          suggestedFix: 'Close unmatched opening parenthesis.',
          fileName,
        });
      } else if (openBrackets > 0) {
        syntaxErrors.push({
          line: lines.length,
          column: 1,
          errorType: 'SyntaxError',
          message: `'[' was never closed`,
          lineText: '',
          pointer: '^',
          suggestedFix: 'Close unmatched opening square bracket.',
          fileName,
        });
      } else if (openBraces > 0) {
        syntaxErrors.push({
          line: lines.length,
          column: 1,
          errorType: 'SyntaxError',
          message: `'{' was never closed`,
          lineText: '',
          pointer: '^',
          suggestedFix: 'Close unmatched opening brace.',
          fileName,
        });
      }
    }

    return {
      isValid: syntaxErrors.length === 0,
      fileName,
      syntaxErrors,
      summary: syntaxErrors.length === 0
        ? 'AST Syntax checks passed.'
        : `Syntax Error on line ${syntaxErrors[0].line}: ${syntaxErrors[0].message}`,
    };
  }

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

    const securityWarnings: Array<{ line: number; severity: 'critical' | 'warning' | 'info'; code: string; message: string }> = [];
    const detectedDependencies: Set<string> = new Set();
    let detectedFramework: 'aiogram' | 'telethon' | 'pyrogram' | 'python-telegram-bot' | 'custom' = 'custom';

    // 1. Run Python native AST syntax pre-validation first
    const astResult = PythonValidator.validateASTSync(code, fileName);
    const syntaxErrors: ASTSyntaxError[] = [...astResult.syntaxErrors];

    // 2. File Size Verification (Max 5MB per bot)
    if (sizeBytes > effectiveLimitBytes) {
      syntaxErrors.push({
        line: 1,
        column: 1,
        errorType: 'ParseError',
        message: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${effectiveLimitMB} MB. Please compress assets or split code.`,
        lineText: '',
        pointer: '^',
        suggestedFix: 'Reduce file size below 5MB.',
        fileName,
      });
    }

    const lines = code.split('\n');

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

      // Security Inspection Patterns
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
