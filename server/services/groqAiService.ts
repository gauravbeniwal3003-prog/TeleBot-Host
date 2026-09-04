import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database';
import { LogManager } from './logManager';

// Read purely from environment variable (e.g. Vercel environment or .env)
// Never hardcode API keys directly into source code.

export interface GroqDiagnosisResult {
  isError: boolean;
  friendlyTitle: string;
  friendlyMessage: string;
  suggestedFix: string;
  requiredPackages: string[];
  autoFixable: boolean;
  suggestedCommand?: string;
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
    return ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'groq/compound-mini'];
  }

  /**
   * Helper to invoke Groq OpenAI-compatible Chat Completions API
   */
  private static async queryGroqChat(messages: Array<{ role: string; content: string }>, maxTokens: number = 400): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not configured. Please add GROQ_API_KEY in your Vercel or deployment settings.');
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
    context?: { botName?: string; framework?: string }
  ): Promise<GroqDiagnosisResult> {
    try {
      const prompt = `You are a world-class Python and Telegram bot DevOps engineer.
Analyze the following error log or traceback:
"""
${rawLogText.slice(-3000)}
"""

Context: Bot Framework = ${context?.framework || 'auto-detect'}, Bot Name = ${context?.botName || 'Telegram Bot'}.

Respond ONLY with a valid JSON object matching this schema:
{
  "isError": true or false,
  "friendlyTitle": "Short, crystal clear title of what went wrong (under 8 words)",
  "friendlyMessage": "User-friendly explanation of why this happened and what it means (1-2 sentences)",
  "suggestedFix": "Precise, step-by-step instructions on how the user or system should fix this",
  "requiredPackages": ["package1", "package2"], // Extract real PyPI pip package names if this error is due to missing modules/libraries (e.g. ['python-telegram-bot', 'httpx'])
  "autoFixable": true or false, // True if installing missing packages or adding token can fix it
  "suggestedCommand": "e.g. pip install package_name", // Optional command to fix
  "confidence": 0.95
}`;

      const rawJson = await this.queryGroqChat([
        { role: 'system', content: 'You are an expert Telegram Bot hosting diagnosis assistant. Always return pure JSON.' },
        { role: 'user', content: prompt }
      ], 450);

      const parsed = JSON.parse(rawJson);
      return {
        isError: parsed.isError !== false,
        friendlyTitle: parsed.friendlyTitle || 'Runtime Issue Detected',
        friendlyMessage: parsed.friendlyMessage || 'An issue occurred during bot execution.',
        suggestedFix: parsed.suggestedFix || 'Please inspect the traceback and adjust your script configuration.',
        requiredPackages: Array.isArray(parsed.requiredPackages) ? parsed.requiredPackages : [],
        autoFixable: Boolean(parsed.autoFixable),
        suggestedCommand: parsed.suggestedCommand,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      };
    } catch (e: any) {
      console.error('[Groq AI] Error diagnosis failed:', e.message);
      // Fallback
      return {
        isError: true,
        friendlyTitle: 'Runtime Execution Error',
        friendlyMessage: 'Bot exited with an error. Review the traceback details in the console.',
        suggestedFix: 'Check bot credentials and ensure required dependencies are installed.',
        requiredPackages: [],
        autoFixable: false,
        confidence: 0.5,
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
      // Build a condensed summary of import statements and code
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
      .map(p => p.trim())
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
