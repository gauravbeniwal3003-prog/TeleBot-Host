export type BotFramework = 'aiogram' | 'telethon' | 'pyrogram' | 'telegraf' | 'grammy' | 'python-telegram-bot' | 'telebot' | 'go-telegram' | 'custom';

export type BotStatus = 'running' | 'stopped' | 'restarting' | 'error' | 'paused' | 'expired';

export interface ASTSyntaxError {
  line: number;
  message: string;
  column?: number;
  errorType?: 'SyntaxError' | 'IndentationError' | 'TabError' | 'TokenError' | 'ParseError' | string;
  lineText?: string;
  pointer?: string;
  suggestedFix?: string;
  fileName?: string;
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

export interface PreflightAstResult {
  valid: boolean;
  entryPoint: string;
  fileName: string;
  syntaxErrors: ASTSyntaxError[];
  summary: string;
}

export interface SecurityTestReport {
  testId: string;
  title: string;
  description: string;
  simulatedAttack: string;
  outcome: 'PASSED_SECURED' | 'CONTAINER_TERMINATED_CLEANLY' | 'BLOCKED_BY_KERNEL';
  hostImpact: 'ZERO_HOST_IMPACT' | 'HOST_PROTECTED';
  details: string;
  kernelLog: string;
}

export interface ContainerTelemetry {
  containerId: string;
  botId: string;
  state: string;
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  pidsCount: number;
  pidsLimit: number;
  uptimeSeconds: number;
  restartCount: number;
  networkRxBytes: number;
  networkTxBytes: number;
  lastExitCode?: number;
  lastErrorMessage?: string;
}

export interface BotEnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface TelegramBot {
  id: string;
  name: string;
  username: string;
  framework: BotFramework;
  version: string;
  status: BotStatus;
  statusBadge?: string;
  statusDescription?: string;
  statusColor?: string;
  isActiveSlot: boolean;
  cpuUsage: number; // percentage 0-100
  memoryUsageMB: number;
  memoryLimitMB: number;
  storageUsageMB: number;
  uptimeSeconds: number;
  restartCount: number;
  lastDeployedAt: string;
  lastStartedAt?: string;
  lastStoppedAt?: string;
  lastError?: string;
  lastErrorFriendly?: string;
  lastErrorTechnical?: string;
  gitRepoUrl?: string;
  entryPoint: string; // e.g. "main.py" or "bot.js"
  startCommand?: string; // Custom user start command e.g. "python3 -u main.py" or "python3 -u bot.py"
  envVars: BotEnvVar[];
  hasDatabase: boolean;
  dbType?: 'sqlite' | 'postgres' | 'redis';
  webhookEnabled: boolean;
  webhookUrl?: string;
}

export interface BotFileItem {
  id: string;
  filePath: string;
  virtualPath?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  isDirectory: boolean;
  content?: string;
  updatedAt: string;
  isEntryPoint?: boolean;
}

export interface StorageSummary {
  usedStorageBytes: number;
  usedStorageMB: number;
  totalStorageMB: number;
  remainingStorageMB: number;
  usagePercentage: number;
  maxPythonFileSizeMB: number;
  dbAllocatedMB: number;
  dbUsedMB: number;
  fileCount: number;
  filesStorageMB: number;
  databaseStorageMB: number;
  isOverQuota: boolean;
}

export interface FileUploadResult {
  success: boolean;
  file: BotFileItem;
  storageSummary: StorageSummary;
  replaced: boolean;
  validation?: PythonValidationResult;
  message?: string;
}

export interface StorageCleanupReport {
  timestamp: string;
  cleanedBotsCount: number;
  cleanedFilesCount: number;
  freedStorageMB: number;
  purgedExpiredSubscriptions: number;
  details: Array<{
    userId: string;
    botId: string;
    reason: string;
    freedBytes: number;
  }>;
}

export interface HostingPlan {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
  priceINR: number;
  priceUSD: number;
  yearlyDiscountPercent: number;
  botSlots: number;
  ramMB: number;
  cpuCores: number;
  diskStorageGB: number;
  databaseStorageMB: number;
  maxPythonFileSizeMB?: number;
  bandwidthGB: number;
  dedicatedIPv4: boolean;
  features: string[];
}

export interface CustomPlanConfig {
  botSlots: number;
  ramMB: number;
  cpuCores: number;
  diskStorageGB: number;
  databaseType: 'sqlite' | 'postgres' | 'redis' | 'none';
  databaseStorageMB: number;
  dedicatedIPv4: boolean;
  autoRestart: boolean;
  billingInterval: 'monthly' | 'yearly';
}

export interface DynamicPlanConfig {
  activeBotCount: number; // 1, 2, 3, 5, 10, or custom
  totalBotSlots: number; // Formula: activeBotCount * 3
  maxPythonFileSizeMB: number; // 0.5, 1, 2, 3, 5 MB
  dbStorageMB: number; // 50, 100, 250, 500, 1024, 2048, 5120, or custom MB
  durationDays: number; // 7, 30, 90, 180, 365, or custom
}

export interface PricingCalculationResult {
  activeBotCount: number;
  totalBotSlots: number; // activeBotCount * 3
  maxPythonFileSizeMB: number;
  dbStorageMB: number;
  durationDays: number;

  baseBotRateMonthlyINR: number;
  botTierDiscountPercent: number;
  effectiveBotRateMonthlyINR: number;
  botsMonthlySubtotalINR: number;

  fileSizeMonthlyCostINR: number;
  storageMonthlyCostINR: number;

  baseMonthlyTotalINR: number;
  durationMultiplier: number;
  durationDiscountPercent: number;
  durationDiscountAmountINR: number;

  subtotalINR: number;
  couponDiscountINR: number;
  taxRatePercent: number;
  taxAmountINR: number;
  finalPriceINR: number;

  finalPriceUSD: number;
  subtotalUSD: number;
  taxUSD: number;
  savingsTotalINR: number;
}

export interface DBPricingConfig {
  basePricePerBotMonthlyINR: number;
  inrToUsdRate: number;
  taxRatePercent: number;
  botPricingTiers: Array<{
    count: number;
    label: string;
    monthlyPriceINR: number;
    enabled?: boolean;
    isPopular?: boolean;
  }>;
  botTierDiscounts: Array<{
    minBots: number;
    maxBots: number;
    discountPercent: number;
    label: string;
    enabled?: boolean;
  }>;
  fileSizeTierCostsINR: Array<{
    sizeMB: number;
    label: string;
    monthlyCostINR: number;
    enabled?: boolean;
    isDefault?: boolean;
  }>;
  storageTiersINR: Array<{
    storageMB: number;
    label: string;
    monthlyCostINR: number;
    enabled?: boolean;
    isDefault?: boolean;
  }>;
  customStorageCostPerGBMonthlyINR: number;
  durationDiscounts: Array<{
    days: number;
    label: string;
    discountPercent: number;
    isDefault?: boolean;
    enabled?: boolean;
  }>;
  customSlidersEnabled?: boolean;
  couponsEnabled?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalBots: number;
  activeBots: number;
  stoppedBots: number;
  errorBots?: number;
  pausedBots?: number;
  totalRevenueINR: number;
  totalRevenueUSD: number;
  totalRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  refundedPaymentsCount: number;
  totalRefundedAmountINR: number;
  storageUsage: {
    totalUsedMB: number;
    totalAllocatedMB: number;
    totalAllocatedGB: number;
    percentageUsed: number;
    totalFilesCount: number;
  };
  vpsResourceUsage: {
    cpu: {
      cores: number;
      model: string;
      usedPercent: number;
      allocatedPercent: number;
      loadAverages: number[];
    };
    memory: {
      totalMB: number;
      usedMB: number;
      freeMB: number;
      cachedMB: number;
      percentage: number;
    };
    disk: {
      totalGB: number;
      usedGB: number;
      freeGB: number;
      percentage: number;
      nvmeHealth: string;
    };
    runningContainers: number;
    workerStatus: 'online' | 'offline' | 'degraded';
    workerLatencyMs: number;
    workerUptime: string;
    tasksProcessed: number;
    workerTokenVerified: boolean;
  };
  vpsNodes: Array<{
    id: string;
    region: string;
    status: string;
    loadPercent: number;
    botsCount: number;
    ip?: string;
  }>;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  telegramUsername?: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended';
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt: string;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    expiryDate: string;
    autoRenew: boolean;
    totalBotSlots: number;
    ramLimitMB: number;
    storageLimitGB: number;
  } | null;
  totalBots: number;
  runningBots: number;
  ordersCount: number;
  totalSpentINR: number;
  planName?: string;
  planStatus?: string;
}

export interface AdminBotItem {
  id: string;
  user_id: string;
  name: string;
  username: string;
  framework: string;
  version?: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'paused' | 'expired';
  entry_point?: string;
  cpu_usage: number;
  memory_usage_mb: number;
  memory_limit_mb?: number;
  storage_usage_mb: number;
  uptime_seconds: number;
  restart_count: number;
  last_started_at?: string;
  last_stopped_at?: string;
  last_deployed_at?: string;
  last_error?: string;
  last_error_friendly?: string;
  owner: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}

export interface AdminOrderItem {
  order_id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  billing_interval: string;
  currency: string;
  amount: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method?: string;
  payment_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  failure_reason?: string;
  refund_amount?: number;
  refunded_at?: string;
  refund_reason?: string;
  refund_transaction_id?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    telegramUsername?: string;
    status: string;
  } | null;
}

export interface AdminSystemHealth {
  vpsHost: {
    hostname: string;
    os: string;
    kernel: string;
    uptime: string;
    ipAddress: string;
    datacenter: string;
    cgroupsVersion: string;
  };
  cpu: {
    model: string;
    totalCores: number;
    allocatedCores: number;
    usagePercent: number;
    loadAverages: number[];
    temperatureCelsius: number;
  };
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    buffersCachedMB: number;
    usagePercent: number;
    swapTotalMB: number;
    swapUsedMB: number;
  };
  disk: {
    mount: string;
    type: string;
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usagePercent: number;
    readIOPS: string;
    writeIOPS: string;
    healthStatus: string;
  };
  containers: {
    totalRunning: number;
    totalRegistered: number;
    runtime: string;
    networkBridge: string;
    cgroupsMemoryThrottled: number;
    cgroupsOOMKillsTotal: number;
  };
  worker: {
    status: string;
    port: number;
    internalSocket: string;
    latencyMs: number;
    protocolVersion: string;
    tasksProcessed: number;
    lastHeartbeat: string;
    tokenVerified: boolean;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended';
  telegramUsername?: string;
  avatarUrl?: string;
  createdAt: string;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    status: 'active' | 'trial' | 'expired' | 'cancelled';
    trialStarted?: boolean;
    trialStartedAt?: string | null;
    startDate: string;
    expiryDate: string;
    autoRenew: boolean;
    totalBotSlots: number;
    activeBotCount?: number;
    ramLimitMB: number;
    storageLimitGB: number;
    maxPythonFileSizeMB?: number;
  } | null;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'system';
  message: string;
  friendlyMessage?: string;
  suggestedFix?: string;
  technicalDetails?: {
    rawError: string;
    exceptionType?: string;
    offendingLine?: number;
    offendingFile?: string;
    suggestedCommand?: string;
    stackTrace?: string;
  };
}

export interface BotMonitoringOverview {
  botId: string;
  botName: string;
  status: string;
  statusBadge: string;
  statusDescription: string;
  statusColor: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  restartCount: number;
  lastStartedAt?: string;
  lastStoppedAt?: string;
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  storageUsageMB: number;
  hasErrors: boolean;
  latestError?: {
    title: string;
    friendlyMessage: string;
    suggestedFix: string;
    technicalDetails?: any;
    timestamp?: string;
  };
  logSummary: {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    logFileSizeBytes: number;
    logFileSizeFormatted: string;
    maxLogSizeMB: number;
    rotationEnabled: boolean;
  };
}

export interface OrderDetails {
  orderId: string;
  userId: string;
  planId: string;
  planName: string;
  billingInterval: 'monthly' | 'yearly';
  currency: 'INR' | 'USD';
  amount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  createdAt: string;
  paymentMethod?: string;
  paymentId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  failureReason?: string;
  refundTransactionId?: string;
}

export interface UpgradeQuoteResult {
  currentSubscription?: {
    planName: string;
    activeBotCount: number;
    totalBotSlots: number;
    maxPythonFileSizeMB: number;
    dbStorageMB: number;
    startDate: string;
    expiryDate: string;
    daysRemaining: number;
    unusedCreditINR: number;
    unusedCreditUSD: number;
  };
  newPlanCalculation: PricingCalculationResult;
  creditAppliedINR: number;
  creditAppliedUSD: number;
  upgradePayableINR: number;
  upgradePayableUSD: number;
  taxINR: number;
  taxUSD: number;
  totalPayableINR: number;
  totalPayableUSD: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'hosting' | 'billing' | 'technical' | 'security' | 'feature';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'admin' | 'system';
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  action: string;
  category: 'bot' | 'auth' | 'billing' | 'storage' | 'security';
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  targetUser?: {
    name: string;
    email: string;
  };
}
