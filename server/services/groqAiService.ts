import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database';
import { LogManager } from './logManager';

export interface GroqDiagnosisResult {
  isError: boolean;
  errorType: string;
  friendlyTitle: string;
  explanation: string;
  friendlyMessage: string;
  rootCause: string;
  possibilities: string[];
  suggestedFix: string;
  codeFix?: string;
  suggestedCommand?: string;
  missingPackages: string[];
  requiredPackages: string[];
  autoFixable: boolean;
  readyToUsePrompt?: string;
  confidence: number;
}

export interface GroqPackageDetectionResult {
  packages: Array<{
    name: string;
    description: string;
    importName: string;
    alreadyInstalled?: boolean;
  }>;
  installCommand: string;
  summary: string;
}

export class GroqAiService {
  private static getApiKey(): string {
    return process.env.GROQ_API_KEY?.trim() || '';
  }

  private static getModels(): string[] {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'qwen/qwen3.8-27b',
    ];
  }

  public static readonly MODULE_TO_PYPI: Record<string, string> = {
    telegram: 'python-telegram-bot',
    telebot: 'pyTelegramBotAPI',
    aiogram: 'aiogram',
    dotenv: 'python-dotenv',
    PIL: 'Pillow',
    cv2: 'opencv-python',
    bs4: 'beautifulsoup4',
    yaml: 'PyYAML',
    sklearn: 'scikit-learn',
    jwt: 'PyJWT',
    psycopg2: 'psycopg2-binary',
    fitz: 'PyMuPDF',
    docx: 'python-docx',
    pptx: 'python-pptx',
    magic: 'python-magic',
    mysql: 'mysql-connector-python',
    discord: 'discord.py',
    pyrogram: 'pyrogram',
    telethon: 'telethon',
  };

  public static resolvePypiPackageName(importName: string): string {
    const clean = importName.replace(/['"]/g, '').trim();
    return this.MODULE_TO_PYPI[clean] || clean;
  }

  /**
   * Helper to invoke Groq OpenAI-compatible Chat Completions API
   */
  private static async queryGroqChat(messages: Array<{ role: string; content: string }>, maxTokens: number = 800): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    const models = this.getModels();

    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Groq AI] Model ${model} returned error status ${response.status}: ${errText}`);
          lastError = new Error(`Groq API error (${response.status}): ${errText}`);
          continue; // Try next model
        }

        const data: any = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (err: any) {
        console.warn(`[Groq AI] Request failed for model ${model}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq AI models failed');
  }

  /**
   * Diagnose runtime errors and terminal tracebacks using Groq AI
   */
  public static async diagnoseError(
    rawLogText: string,
    context?: { botName?: string; framework?: string; files?: Array<{ fileName: string; content?: string }> }
  ): Promise<GroqDiagnosisResult> {
    // 1. Check for quick local missing module detection
    const missingModuleMatch = rawLogText.match(/No module named ['"]([^'"]+)['"]/i) ||
      rawLogText.match(/ModuleNotFoundError:\s+No module named ['"]?([^'"\n\r]+)['"]?/i) ||
      rawLogText.match(/cannot import name ['"]([^'"]+)['"]/i);
    
    let localDetectedPackages: string[] = [];
    if (missingModuleMatch) {
      const mod = missingModuleMatch[1].trim().split('.')[0];
      if (mod) {
        localDetectedPackages.push(this.resolvePypiPackageName(mod));
      }
    }

    // Attempt Groq AI API diagnosis
    try {
      const codeContext = (context?.files || [])
        .filter(f => f.fileName.endsWith('.py') || f.fileName === 'requirements.txt')
        .slice(0, 3)
        .map(f => `--- File: ${f.fileName} ---\n${(f.content || '').slice(0, 1500)}`)
        .join('\n\n');

      const prompt = `You are a world-class Python and Telegram Bot DevOps specialist.
A user's Telegram bot encountered an issue or produced these logs:

LOGS / CONSOLE OUTPUT:
"""
${rawLogText.slice(-4000)}
"""

BOT CONTEXT:
Framework: ${context?.framework || 'auto-detect'}
Bot Name: ${context?.botName || 'Telegram Bot'}
${codeContext ? `Source Files:\n${codeContext}` : ''}

Provide an in-depth diagnosis to help the customer understand why this error occurred, all possibilities, and exact fixes ready to implement.

Respond ONLY with a valid JSON object matching this schema:
{
  "isError": true,
  "errorType": "Category (e.g. Missing Package, Telegram API Auth, SQLite Lock, Syntax Error, Network Timeout, Runtime Logic)",
  "friendlyTitle": "Crystal clear title (under 8 words)",
  "explanation": "Clear, direct explanation of why this error occurred and what happened",
  "rootCause": "The exact technical root cause behind the failure",
  "possibilities": [
    "Possibility 1 explaining why this occurred",
    "Possibility 2 explaining potential contributing factors",
    "Possibility 3 explaining environment or network aspects"
  ],
  "suggestedFix": "Clear step-by-step instructions on how to resolve the issue",
  "codeFix": "# Ready-to-use Python or configuration snippet resolving the issue\\n...",
  "suggestedCommand": "pip install <package> (or relevant bash command if applicable)",
  "missingPackages": ["pypi-package-name"], // Real PyPI package names if missing module (e.g. ['python-telegram-bot', 'aiogram', 'httpx'])
  "autoFixable": true, // true if this can be solved automatically by installing missing packages
  "readyToUsePrompt": "Formatted prompt explaining the error and requesting a fix that the user can copy/paste directly into ChatGPT, Claude, Cursor or any AI coding assistant",
  "confidence": 0.95
}`;

      const rawJson = await this.queryGroqChat([
        { role: 'system', content: 'You are an expert Telegram bot and Python hosting diagnosis AI. Always return strictly valid JSON.' },
        { role: 'user', content: prompt }
      ], 800);

      const parsed = JSON.parse(rawJson);
      const missingPkgs: string[] = Array.isArray(parsed.missingPackages)
        ? parsed.missingPackages.map((p: string) => this.resolvePypiPackageName(p))
        : (localDetectedPackages.length > 0 ? localDetectedPackages : []);

      const expl = parsed.explanation || parsed.friendlyMessage || 'An issue occurred during bot execution.';

      return {
        isError: parsed.isError !== false,
        errorType: parsed.errorType || (missingPkgs.length > 0 ? 'Missing Package' : 'Runtime Issue'),
        friendlyTitle: parsed.friendlyTitle || (missingPkgs.length > 0 ? `Missing Python Package: ${missingPkgs.join(', ')}` : 'Runtime Issue Detected'),
        explanation: expl,
        friendlyMessage: expl,
        rootCause: parsed.rootCause || expl,
        possibilities: Array.isArray(parsed.possibilities) && parsed.possibilities.length > 0
          ? parsed.possibilities
          : ['A required library was not imported or installed.', 'Execution environment configuration issue.'],
        suggestedFix: parsed.suggestedFix || (missingPkgs.length > 0 ? `Install the missing package (${missingPkgs.join(', ')}) to resolve this.` : 'Review the console traceback above and verify script logic.'),
        codeFix: parsed.codeFix || (missingPkgs.length > 0 ? `# Run in terminal:\\npip install ${missingPkgs.join(' ')}` : undefined),
        suggestedCommand: parsed.suggestedCommand || (missingPkgs.length > 0 ? `pip install ${missingPkgs.join(' ')}` : undefined),
        missingPackages: missingPkgs,
        requiredPackages: missingPkgs,
        autoFixable: Boolean(parsed.autoFixable) || missingPkgs.length > 0,
        readyToUsePrompt: parsed.readyToUsePrompt || `I am hosting a Python Telegram bot (${context?.framework || 'bot'}). My bot failed with the following error:\n\n${rawLogText.slice(-1500)}\n\nPlease provide the corrected code to fix this issue.`,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
      };
    } catch (e: any) {
      console.warn('[Groq AI] Falling back to intelligent local error analyzer:', e.message);
      
      // Fallback rule-based analyzer
      if (localDetectedPackages.length > 0) {
        const pkg = localDetectedPackages.join(', ');
        return {
          isError: true,
          errorType: 'Missing Package',
          friendlyTitle: `Missing Python Package: ${pkg}`,
          explanation: `Your bot stopped because Python could not find the required package "${pkg}".`,
          friendlyMessage: `Your bot stopped because Python could not find the required package "${pkg}".`,
          rootCause: `ModuleNotFoundError: No module named '${pkg}' during script initialization.`,
          possibilities: [
            `The package "${pkg}" is imported in your script but has not been installed via pip yet.`,
            `The package name used in import might differ slightly from the PyPI distribution name.`,
            `A sub-dependency required by your Telegram framework is missing.`,
          ],
          suggestedFix: `Install the missing package "${pkg}" using the 1-click install button below or add it to requirements.txt.`,
          codeFix: `# Install the package on host:\npip install ${localDetectedPackages.join(' ')}`,
          suggestedCommand: `pip install ${localDetectedPackages.join(' ')}`,
          missingPackages: localDetectedPackages,
          requiredPackages: localDetectedPackages,
          autoFixable: true,
          readyToUsePrompt: `My Python Telegram bot encountered a ModuleNotFoundError for '${pkg}'. Please provide the code or dependency requirements to fix this.\n\nError:\n${rawLogText.slice(-1000)}`,
          confidence: 0.95,
        };
      }

      return {
        isError: true,
        errorType: 'Runtime Execution Error',
        friendlyTitle: 'Runtime Execution Error',
        explanation: 'The bot process encountered an unexpected exception or stopped during execution.',
        friendlyMessage: 'The bot process encountered an unexpected exception or stopped during execution.',
        rootCause: rawLogText.slice(-200),
        possibilities: [
          'An unhandled exception occurred in an async handler or event loop.',
          'Database file access or network connection was interrupted.',
          'Bot token or environment configuration was incomplete.'
        ],
        suggestedFix: 'Review the terminal traceback lines in the console stream and adjust the offending code snippet.',
        codeFix: undefined,
        suggestedCommand: undefined,
        missingPackages: [],
        requiredPackages: [],
        autoFixable: false,
        readyToUsePrompt: `Here are the logs from my Python Telegram bot which exited unexpectedly:\n\n${rawLogText.slice(-1500)}\n\nPlease diagnose why this happened and provide the fixed code.`,
        confidence: 0.7,
      };
    }
  }

  /**
   * Scan Python code files and accurately detect all pip packages required using Groq AI
   */
  public static async detectPackagesFromCode(
    files: Array<{ fileName: string; content: string }>
  ): Promise<GroqPackageDetectionResult> {
    try {
      const codeSnippets = files
        .filter(f => f.fileName.endsWith('.py') || f.fileName === 'requirements.txt' || f.fileName.endsWith('.json'))
        .map(f => `--- File: ${f.fileName} ---\n${f.content.slice(0, 4000)}`)
        .join('\n\n');

      if (!codeSnippets.trim()) {
        return {
          packages: [],
          installCommand: '',
          summary: 'No Python scripts found in workspace to analyze.',
        };
      }

      const prompt = `You are an expert Python packaging engineer.
Analyze the following Python source code and requirements files:
"""
${codeSnippets.slice(0, 7000)}
"""

Identify all third-party PyPI packages needed to run this project.
Note:
- Standard library modules (like os, sys, json, time, math, asyncio, typing, re, logging, datetime, sqlite3, random) must NEVER be included.
- Map import names to real PyPI package names (e.g. "telegram" -> "python-telegram-bot", "dotenv" -> "python-dotenv", "PIL" -> "Pillow", "cv2" -> "opencv-python", "bs4" -> "beautifulsoup4").

Respond ONLY with a valid JSON object matching this schema:
{
  "packages": [
    {
      "name": "package-name-on-pypi",
      "importName": "import_name",
      "description": "Brief description of what this package does in the bot"
    }
  ],
  "installCommand": "pip install package1 package2",
  "summary": "Brief 1-sentence summary of dependencies detected"
}`;

      const rawJson = await this.queryGroqChat([
        { role: 'system', content: 'You are an expert in Python packaging and PyPI. Always return valid JSON only.' },
        { role: 'user', content: prompt }
      ], 500);

      const parsed = JSON.parse(rawJson);
      return {
        packages: Array.isArray(parsed.packages) ? parsed.packages : [],
        installCommand: parsed.installCommand || '',
        summary: parsed.summary || 'Detected packages based on workspace code imports.',
      };
    } catch (e: any) {
      console.error('[Groq AI] Package detection failed:', e.message);
      return {
        packages: [
          { name: 'python-telegram-bot', importName: 'telegram', description: 'Standard Telegram Bot API wrapper' },
          { name: 'httpx', importName: 'httpx', description: 'Async HTTP client required by telegram framework' }
        ],
        installCommand: 'pip install python-telegram-bot httpx',
        summary: 'Standard Telegram bot packages fallback.',
      };
    }
  }

  /**
   * Execute real pip install directly inside the bot's workspace on the VPS host
   */
  public static async installPackages(
    botId: string,
    userId: string,
    packages: string[]
  ): Promise<{ success: boolean; message: string; output: string }> {
    const bot = db.getBotById(botId, userId);
    if (!bot) throw new Error('Bot not found or unauthorized');

    const cleanPkgs = packages
      .map(p => this.resolvePypiPackageName(p.trim()))
      .filter(p => p.length > 0 && /^[a-zA-Z0-9_.-]+$/.test(p));

    if (cleanPkgs.length === 0) {
      throw new Error('No valid package names provided');
    }

    const user = db.getAllUsers().find(u => u.id === userId);
    const safeUserName = user?.name ? user.name.replace(/[^a-zA-Z0-9_-]/g, '_') : userId;
    const safeBotName = bot.name ? bot.name.replace(/[^a-zA-Z0-9_-]/g, '_') : botId;
    const botDir = path.join(process.cwd(), 'vps_workspaces', safeUserName, safeBotName);
    fs.mkdirSync(botDir, { recursive: true });

    LogManager.appendLog(botId, userId, 'system', `[Terminal] [PIP] Installing package(s): ${cleanPkgs.join(', ')}...`);

    const pythonBin = process.env.PYTHON_BIN || (fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');
    const args = ['-m', 'pip', 'install', '--break-system-packages', ...cleanPkgs];

    return new Promise((resolve) => {
      const child = spawn(pythonBin, args, {
        cwd: botDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      let fullOutput = '';

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        lines.forEach((line: string) => LogManager.appendLog(botId, userId, 'info', `[PIP] ${line}`));
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        lines.forEach((line: string) => LogManager.appendLog(botId, userId, 'warn', `[PIP] ${line}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          LogManager.appendLog(botId, userId, 'system', `[Terminal] [SUCCESS] Successfully installed ${cleanPkgs.join(', ')}!`);
          resolve({
            success: true,
            message: `Successfully installed: ${cleanPkgs.join(', ')}`,
            output: fullOutput,
          });
        } else {
          LogManager.appendLog(botId, userId, 'error', `[Terminal] [ERROR] Package installation exited with code ${code}.`);
          resolve({
            success: false,
            message: `Package installation failed with exit code ${code}`,
            output: fullOutput,
          });
        }
      });

      child.on('error', (err) => {
        LogManager.appendLog(botId, userId, 'error', `[Terminal] [ERROR] Failed to run pip: ${err.message}`);
        resolve({
          success: false,
          message: `Failed to execute pip process: ${err.message}`,
          output: err.message,
        });
      });
    });
  }

  /**
   * Install requirements.txt if present
   */
  public static async installRequirementsFile(
    botId: string,
    userId: string
  ): Promise<{ success: boolean; message: string; output: string }> {
    const bot = db.getBotById(botId, userId);
    if (!bot) throw new Error('Bot not found or unauthorized');

    const user = db.getAllUsers().find(u => u.id === userId);
    const safeUserName = user?.name ? user.name.replace(/[^a-zA-Z0-9_-]/g, '_') : userId;
    const safeBotName = bot.name ? bot.name.replace(/[^a-zA-Z0-9_-]/g, '_') : botId;
    const botDir = path.join(process.cwd(), 'vps_workspaces', safeUserName, safeBotName);
    const reqFile = path.join(botDir, 'requirements.txt');

    if (!fs.existsSync(reqFile)) {
      throw new Error('requirements.txt not found in bot workspace.');
    }

    LogManager.appendLog(botId, userId, 'system', `[Terminal] [PIP] Installing dependencies from requirements.txt...`);

    const pythonBin = process.env.PYTHON_BIN || (fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');
    const args = ['-m', 'pip', 'install', '--break-system-packages', '-r', 'requirements.txt'];

    return new Promise((resolve) => {
      const child = spawn(pythonBin, args, {
        cwd: botDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      let fullOutput = '';

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        lines.forEach((line: string) => LogManager.appendLog(botId, userId, 'info', `[PIP] ${line}`));
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        fullOutput += text;
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        lines.forEach((line: string) => LogManager.appendLog(botId, userId, 'warn', `[PIP] ${line}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          LogManager.appendLog(botId, userId, 'system', `[Terminal] [SUCCESS] All requirements from requirements.txt installed successfully!`);
          resolve({
            success: true,
            message: 'All requirements installed successfully!',
            output: fullOutput,
          });
        } else {
          LogManager.appendLog(botId, userId, 'error', `[Terminal] [ERROR] requirements.txt installation failed with exit code ${code}.`);
          resolve({
            success: false,
            message: `Installation failed with exit code ${code}`,
            output: fullOutput,
          });
        }
      });

      child.on('error', (err) => {
        LogManager.appendLog(botId, userId, 'error', `[Terminal] [ERROR] Failed to run pip: ${err.message}`);
        resolve({
          success: false,
          message: `Failed to execute pip: ${err.message}`,
          output: err.message,
        });
      });
    });
  }
}

