/**
 * TeleHost VPS Worker Client
 * Secure internal client that the Express Web Application uses to orchestrate
 * containers and validate Python bot files via the Bot Runner Worker daemon.
 * 
 * Never executes Python directly on host OS or exposes Docker sockets to the web layer.
 */

import { botRunnerWorker, ContainerState, ContainerTelemetry, SecurityTestReport } from './botRunnerWorker';
import { PythonValidator, PythonValidationResult } from './pythonValidator';

export class VPSWorkerClient {
  private readonly internalToken: string;

  constructor(internalToken: string = process.env.VPS_WORKER_SECRET || 'telehost_internal_worker_sec_99182') {
    this.internalToken = internalToken;
  }

  private authenticate(): void {
    if (!botRunnerWorker.verifyWorkerToken(this.internalToken)) {
      throw new Error('[VPS Worker Security] Unauthorized: Internal communication token mismatch');
    }
  }

  /**
   * Validate a customer's Python bot code against syntax, 5MB limit, and AST security rules
   */
  public async validatePythonFile(
    code: string,
    fileName: string = 'main.py',
    maxAllowedMB: number = 5.0
  ): Promise<PythonValidationResult> {
    this.authenticate();
    return PythonValidator.validateSource(code, fileName, maxAllowedMB);
  }

  /**
   * Synchronize a specific file directly to the VPS in real-time
   */
  public async syncBotFile(botId: string, filePath: string, content: string): Promise<void> {
    this.authenticate();
    botRunnerWorker.syncFileToVPS(botId, filePath, content);
  }

  public async listVPSFiles(botId: string): Promise<{ filePath: string, size: number, mtime: string, isDirectory: boolean }[]> {
    this.authenticate();
    return botRunnerWorker.listVPSFiles(botId);
  }

  public async readVPSFile(botId: string, filePath: string): Promise<Buffer | null> {
    this.authenticate();
    return botRunnerWorker.readVPSFile(botId, filePath);
  }

  public async renameVPSFile(botId: string, oldPath: string, newPath: string): Promise<boolean> {
    this.authenticate();
    return botRunnerWorker.renameVPSFile(botId, oldPath, newPath);
  }

  public async deleteVPSFile(botId: string, filePath: string): Promise<boolean> {
    this.authenticate();
    return botRunnerWorker.deleteVPSFile(botId, filePath);
  }

  /**
   * Provision container sandbox for a new or updated bot
   */
  public async provisionSandbox(params: {
    botId: string;
    userId: string;
    projectId?: string;
    botName: string;
    framework: string;
    entryPoint: string;
    memoryLimitMB?: number;
    storageQuotaMB?: number;
    envVars?: Record<string, string>;
  }) {
    this.authenticate();
    return botRunnerWorker.createContainerSandbox(params);
  }

  /**
   * Start bot container in an active slot
   */
  public async startBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.startBot(botId);
  }

  /**
   * Stop bot container
   */
  public async stopBot(botId: string, reason?: string) {
    this.authenticate();
    return botRunnerWorker.stopBot(botId, reason);
  }

  /**
   * Pause bot container (SIGSTOP / docker pause)
   */
  public async pauseBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.pauseBot(botId);
  }

  /**
   * Resume bot container (SIGCONT / docker unpause)
   */
  public async resumeBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.resumeBot(botId);
  }

  /**
   * Restart bot container cleanly
   */
  public async restartBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.restartBot(botId);
  }

  /**
   * Destroy bot container and release resources
   */
  public async destroyBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.destroyContainer(botId);
  }

  /**
   * Get telemetry stats for a bot
   */
  public async getBotTelemetry(botId: string): Promise<ContainerTelemetry | undefined> {
    this.authenticate();
    return botRunnerWorker.getTelemetry(botId);
  }

  /**
   * Mark container expired due to subscription expiration
   */
  public async expireBot(botId: string) {
    this.authenticate();
    return botRunnerWorker.expireBot(botId);
  }

  /**
   * Run automated security & isolation test suite
   */
  public async runSecurityTest(testType: string): Promise<SecurityTestReport> {
    this.authenticate();
    return botRunnerWorker.runSecurityIsolationTest(testType);
  }
}

export const vpsWorkerClient = new VPSWorkerClient();
