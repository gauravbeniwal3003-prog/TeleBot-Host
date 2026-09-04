import {
  TelegramBot,
  HostingPlan,
  CustomPlanConfig,
  UserProfile,
  OrderDetails,
  BotLogEntry,
  SupportTicket,
  BotFramework,
  BotFileItem,
  ActivityLogItem,
  AdminStats,
  AdminUserItem,
  AdminBotItem,
  AdminOrderItem,
  AdminSystemHealth,
  AdminAuditLogItem,
  DynamicPlanConfig,
  PricingCalculationResult,
  DBPricingConfig,
  UpgradeQuoteResult,
  PythonValidationResult,
  SecurityTestReport,
  ContainerTelemetry,
  StorageSummary,
  FileUploadResult,
  StorageCleanupReport,
  BotMonitoringOverview,
} from '../types';

const TOKEN_STORAGE_KEY = 'telehost_jwt_token';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return this.token;
  }

  public getApiUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) {
      const cleanBase = envUrl.replace(/\/+$/, '');
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    }
    return endpoint;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const targetUrl = this.getApiUrl(endpoint);

    try {
      const response = await fetch(targetUrl, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/register') {
          this.setToken(null);
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      if (err instanceof TypeError && err.message?.toLowerCase().includes('fetch')) {
        console.error(`[API Network Failure] Attempted: ${targetUrl}`, err);
        throw new Error(`Connection Failed: Could not reach backend API server at ${targetUrl}. Please verify if your VPS permits traffic or clear browser cache.`);
      }
      throw err;
    }
  }

  // ===================== AUTH SERVICES =====================
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const token = this.getToken();
      if (!token) return null;
      const res = await this.request<{ user: UserProfile }>('/api/auth/me');
      return res.user;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  async login(email: string, password?: string): Promise<UserProfile> {
    const res = await this.request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: password || 'Password@123' }),
    });
    this.setToken(res.token);
    return res.user;
  }

  async loginTelegram(telegramUsername?: string, email?: string): Promise<UserProfile> {
    const res = await this.request<{ user: UserProfile; token: string }>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ telegramUsername, email }),
    });
    this.setToken(res.token);
    return res.user;
  }

  async register(name: string, email: string, password?: string): Promise<UserProfile> {
    const res = await this.request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: password || 'Password@123' }),
    });
    this.setToken(res.token);
    return res.user;
  }

  async updateProfile(data: { name?: string; telegramUsername?: string; avatarUrl?: string }): Promise<UserProfile> {
    const res = await this.request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    this.setToken(null);
  }

  // ===================== PROJECT MANAGEMENT =====================
  async getProjects(): Promise<{ projects: any[] }> {
    return this.request<{ projects: any[] }>('/api/projects');
  }

  async createProject(name: string): Promise<{ project: any; message: string }> {
    return this.request<{ project: any; message: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateProjectName(id: string, name: string): Promise<{ project: any; message: string }> {
    return this.request<{ project: any; message: string }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ===================== BOT MANAGEMENT =====================
  async getBots(projectId?: string): Promise<TelegramBot[]> {
    try {
      const url = projectId ? `/api/bots?projectId=${projectId}` : '/api/bots';
      const res = await this.request<{ bots: TelegramBot[] }>(url);
      return res.bots || [];
    } catch {
      return [];
    }
  }

  async createBot(data: {
    name: string;
    username: string;
    framework: BotFramework;
    token: string;
    gitRepoUrl?: string;
    entryPoint: string;
    hasDatabase?: boolean;
    dbType?: 'sqlite' | 'postgres' | 'redis';
    webhookEnabled?: boolean;
    projectId?: string;
  }): Promise<TelegramBot> {
    const res = await this.request<{ bot: TelegramBot }>('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.bot;
  }

  async updateBotStatus(botId: string, action: 'start' | 'stop' | 'pause' | 'resume' | 'restart', startCommand?: string): Promise<TelegramBot> {
    const res = await this.request<{ bot: TelegramBot }>(`/api/bots/${botId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, startCommand }),
    });
    return res.bot;
  }

  async updateBotConfig(
    botId: string,
    config: {
      name?: string;
      entryPoint?: string;
      startCommand?: string;
      framework?: BotFramework;
      token?: string;
    }
  ): Promise<TelegramBot> {
    const res = await this.request<{ bot: TelegramBot }>(`/api/bots/${botId}/config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
    return res.bot;
  }

  async groqDiagnose(botId: string, rawLog?: string): Promise<{ diagnosis: any }> {
    return this.request<{ diagnosis: any }>(`/api/bots/${botId}/ai/diagnose`, {
      method: 'POST',
      body: JSON.stringify({ rawLog }),
    });
  }

  async groqDetectPackages(botId: string): Promise<{
    packages: Array<{ name: string; description: string; importName: string }>;
    installCommand: string;
    summary: string;
  }> {
    return this.request<{
      packages: Array<{ name: string; description: string; importName: string }>;
      installCommand: string;
      summary: string;
    }>(`/api/bots/${botId}/ai/detect-packages`, {
      method: 'POST',
    });
  }

  async installPackages(botId: string, packages: string[]): Promise<{ success: boolean; message: string; output: string }> {
    return this.request<{ success: boolean; message: string; output: string }>(`/api/bots/${botId}/packages/install`, {
      method: 'POST',
      body: JSON.stringify({ packages }),
    });
  }

  async installRequirements(botId: string): Promise<{ success: boolean; message: string; output: string }> {
    return this.request<{ success: boolean; message: string; output: string }>(`/api/bots/${botId}/packages/install-requirements`, {
      method: 'POST',
    });
  }

  async verifyTelegramToken(botId: string, token?: string): Promise<{
    valid: boolean;
    source?: string;
    tokenPreview?: string;
    botInfo?: { id: number; username: string; firstName: string; canJoinGroups?: boolean };
    errorCode?: number;
    description?: string;
    message: string;
  }> {
    return this.request<{
      valid: boolean;
      source?: string;
      tokenPreview?: string;
      botInfo?: { id: number; username: string; firstName: string; canJoinGroups?: boolean };
      errorCode?: number;
      description?: string;
      message: string;
    }>(`/api/bots/${botId}/verify-telegram-token`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async switchActiveBot(targetBotId: string, fromBotId?: string): Promise<{ targetBot: TelegramBot; stoppedBot?: TelegramBot; message: string }> {
    return this.request<{ targetBot: TelegramBot; stoppedBot?: TelegramBot; message: string }>(`/api/bots/${targetBotId}/switch-active`, {
      method: 'POST',
      body: JSON.stringify({ fromBotId }),
    });
  }

  async validatePythonCode(code: string, fileName?: string): Promise<PythonValidationResult> {
    const res = await this.request<{ result: PythonValidationResult }>('/api/bots/validate-code', {
      method: 'POST',
      body: JSON.stringify({ code, fileName }),
    });
    return res.result;
  }

  async runSecurityTest(testType: string): Promise<SecurityTestReport> {
    const res = await this.request<{ report: SecurityTestReport }>('/api/bots/security-test', {
      method: 'POST',
      body: JSON.stringify({ testType }),
    });
    return res.report;
  }

  async getBotTelemetry(botId: string): Promise<ContainerTelemetry | undefined> {
    try {
      const res = await this.request<{ telemetry: ContainerTelemetry }>(`/api/bots/${botId}/telemetry`);
      return res.telemetry;
    } catch {
      return undefined;
    }
  }

  async deleteBot(botId: string): Promise<void> {
    await this.request(`/api/bots/${botId}`, {
      method: 'DELETE',
    });
  }

  async getBotLogs(
    botId: string,
    options?: { search?: string; level?: string; limit?: number; offset?: number }
  ): Promise<{ logs: BotLogEntry[]; totalCount: number; filteredCount: number }> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.level && options.level !== 'all') params.append('level', options.level);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const url = `/api/bots/${botId}/logs${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await this.request<{ logs: BotLogEntry[]; totalCount?: number; filteredCount?: number }>(url);
      return {
        logs: res.logs || [],
        totalCount: res.totalCount || res.logs?.length || 0,
        filteredCount: res.filteredCount || res.logs?.length || 0,
      };
    } catch {
      return { logs: [], totalCount: 0, filteredCount: 0 };
    }
  }

  async clearBotLogs(botId: string): Promise<{ clearedCount: number; message: string }> {
    return this.request<{ clearedCount: number; message: string }>(`/api/bots/${botId}/logs`, {
      method: 'DELETE',
    });
  }

  async rotateBotLogs(botId: string): Promise<{ success: boolean; rotated: boolean; message: string; logStats?: any }> {
    return this.request<{ success: boolean; rotated: boolean; message: string; logStats?: any }>(
      `/api/bots/${botId}/logs/rotate`,
      { method: 'POST' }
    );
  }

  async simulateBotError(botId: string, errorType: string): Promise<{ success: boolean; log: BotLogEntry; translatedError: any; message: string }> {
    return this.request<{ success: boolean; log: BotLogEntry; translatedError: any; message: string }>(
      `/api/bots/${botId}/logs/simulate-error`,
      {
        method: 'POST',
        body: JSON.stringify({ errorType }),
      }
    );
  }

  async getBotMonitoring(botId: string): Promise<BotMonitoringOverview | null> {
    try {
      const res = await this.request<{ overview: BotMonitoringOverview }>(`/api/bots/${botId}/monitoring`);
      return res.overview;
    } catch {
      return null;
    }
  }

  async updateBotEnvVars(botId: string, envVars: TelegramBot['envVars']): Promise<TelegramBot> {
    const res = await this.request<{ bot: TelegramBot }>(`/api/bots/${botId}/env`, {
      method: 'POST',
      body: JSON.stringify({ envVars }),
    });
    return res.bot;
  }

  // ===================== BOT FILES & STORAGE =====================
  async getBotFiles(botId: string): Promise<{
    files: BotFileItem[];
    storageUsageMB: number;
    storageSummary: StorageSummary;
    memoryLimitMB: number;
  }> {
    return this.request<{
      files: BotFileItem[];
      storageUsageMB: number;
      storageSummary: StorageSummary;
      memoryLimitMB: number;
    }>(`/api/bots/${botId}/files`);
  }

  async getBotStorageSummary(botId: string): Promise<StorageSummary> {
    return this.request<StorageSummary>(`/api/bots/${botId}/storage-summary`);
  }

  async getUserStorageSummary(): Promise<StorageSummary> {
    return this.request<StorageSummary>('/api/bots/storage/user-summary');
  }

  async saveBotFile(
    botId: string,
    filePath: string,
    content: string
  ): Promise<{
    file: BotFileItem;
    storageUsageMB: number;
    storageSummary: StorageSummary;
    validation?: PythonValidationResult;
    message: string;
  }> {
    return this.request<{
      file: BotFileItem;
      storageUsageMB: number;
      storageSummary: StorageSummary;
      validation?: PythonValidationResult;
      message: string;
    }>(`/api/bots/${botId}/files`, {
      method: 'POST',
      body: JSON.stringify({ filePath, content }),
    });
  }

  async uploadBotFile(
    botId: string,
    fileName: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
  ): Promise<FileUploadResult> {
    return this.request<FileUploadResult>(`/api/bots/${botId}/files/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileName, content, encoding }),
    });
  }

  async renameBotFile(
    botId: string,
    oldPath: string,
    newPath: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${botId}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    });
  }

  async replaceBotFile(
    botId: string,
    targetFilePath: string,
    newContent: string,
    newFileName?: string
  ): Promise<FileUploadResult> {
    return this.request<FileUploadResult>(`/api/bots/${botId}/files/replace`, {
      method: 'POST',
      body: JSON.stringify({ targetFilePath, newContent, newFileName }),
    });
  }

  async downloadBotFile(botId: string, filePath: string): Promise<void> {
    const token = this.getToken();
    const url = this.getApiUrl(`/api/bots/${botId}/files/download?filePath=${encodeURIComponent(filePath)}`);
    
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(errJson.error || 'Failed to download file');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    
    // Extract filename from header or fallback
    const disposition = response.headers.get('Content-Disposition');
    let fileName = filePath.split('/').pop() || 'bot-file';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        fileName = match[1];
      }
    }
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }

  async deleteBotFile(botId: string, filePath: string): Promise<{ success: boolean; message: string; storageSummary: StorageSummary }> {
    return this.request<{ success: boolean; message: string; storageSummary: StorageSummary }>(
      `/api/bots/${botId}/files?filePath=${encodeURIComponent(filePath)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async runStorageCleanupJob(): Promise<{ success: boolean; report: StorageCleanupReport; message: string }> {
    return this.request<{ success: boolean; report: StorageCleanupReport; message: string }>(
      '/api/bots/storage/cleanup-job',
      {
        method: 'POST',
      }
    );
  }

  // ===================== ACTIVITY LOGS =====================
  async getActivityLogs(): Promise<ActivityLogItem[]> {
    try {
      const res = await this.request<{ activities: ActivityLogItem[] }>('/api/activity');
      return res.activities || [];
    } catch {
      return [];
    }
  }

  // ===================== DYNAMIC PRICING & HOSTING PLANS =====================
  async getPlans(): Promise<HostingPlan[]> {
    try {
      const res = await this.request<{ plans: HostingPlan[] }>('/api/plans');
      return res.plans || [];
    } catch {
      return [];
    }
  }

  async getPricingConfig(): Promise<DBPricingConfig> {
    const res = await this.request<{ config: DBPricingConfig }>('/api/pricing/config');
    return res.config;
  }

  async calculateDynamicPlanPrice(input: {
    activeBotCount: number;
    maxPythonFileSizeMB: number;
    dbStorageMB: number;
    durationDays: number;
    couponCode?: string;
  }): Promise<PricingCalculationResult> {
    const res = await this.request<{ result: PricingCalculationResult }>('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.result;
  }

  async decreaseStoragePlan(): Promise<{ success: boolean; maxStorageMB: number }> {
    const res = await this.request<{ success: boolean; maxStorageMB: number }>('/api/subscriptions/decrease-storage', {
      method: 'POST',
    });
    return res;
  }

  async getUpgradeQuote(targetConfig: DynamicPlanConfig): Promise<UpgradeQuoteResult> {
    const res = await this.request<{ quote: UpgradeQuoteResult }>('/api/subscriptions/upgrade-quote', {
      method: 'POST',
      body: JSON.stringify(targetConfig),
    });
    return res.quote;
  }

  calculateCustomPlanPrice(config: CustomPlanConfig): { priceINR: number; priceUSD: number } {
    let baseINR = 0;
    baseINR += config.botSlots * 80;
    baseINR += (config.ramMB / 512) * 50;
    baseINR += config.cpuCores * 100;
    baseINR += (config.diskStorageGB / 5) * 40;
    if (config.databaseType === 'postgres' || config.databaseType === 'redis') {
      baseINR += 120;
    }
    if (config.dedicatedIPv4) {
      baseINR += 250;
    }

    if (config.billingInterval === 'yearly') {
      baseINR = Math.round(baseINR * 0.8 * 12);
    }

    const priceINR = Math.max(49, Math.round(baseINR));
    const priceUSD = parseFloat((priceINR / 78).toFixed(2));

    return { priceINR, priceUSD };
  }

  // ===================== CASHFREE CHECKOUT & ORDERS =====================
  async createAddonOrder(storageMB: number, projectId?: string): Promise<{ order: OrderDetails; cashfreePayload: any }> {
    const res = await this.request<{ order: OrderDetails; cashfreePayload: any }>('/api/orders/create-addon', {
      method: 'POST',
      body: JSON.stringify({ storageMB, projectId }),
    });
    return res;
  }

  async createCheckoutOrder(data: {
    planId: string;
    planName: string;
    billingInterval?: 'monthly' | 'yearly';
    currency?: 'INR' | 'USD';
    amount?: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    couponCode?: string;
    dynamicConfig?: DynamicPlanConfig;
    isUpgrade?: boolean;
  }): Promise<{ order: OrderDetails; cashfreePayload: any }> {
    const res = await this.request<{ order: OrderDetails; cashfreePayload: any }>('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async verifyPayment(orderId: string, paymentMethod?: string, paymentId?: string): Promise<OrderDetails> {
    const res = await this.request<{ order: OrderDetails; subscription: any }>('/api/orders/verify', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentMethod, paymentId }),
    });
    return res.order;
  }

  async getUserOrders(): Promise<OrderDetails[]> {
    try {
      const res = await this.request<{ orders: OrderDetails[] }>('/api/orders');
      return res.orders || [];
    } catch {
      return [];
    }
  }

  // ===================== SUPPORT SERVICES =====================
  async submitSupportTicket(data: {
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    message: string;
  }): Promise<SupportTicket> {
    const res = await this.request<{ ticket: SupportTicket }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.ticket;
  }

  // ===================== ADMIN SERVICES =====================
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/api/admin/dashboard');
  }

  async getAdminDashboard(): Promise<AdminStats> {
    return this.request<AdminStats>('/api/admin/dashboard');
  }

  async getAdminUsers(query?: string): Promise<AdminUserItem[]> {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    const res = await this.request<{ users: AdminUserItem[] }>(`/api/admin/users${params}`);
    return res.users || [];
  }

  async getAdminUserDetail(userId: string): Promise<any> {
    return this.request<any>(`/api/admin/users/${userId}`);
  }

  async suspendUser(userId: string, reason?: string): Promise<{ message: string; user: any }> {
    return this.request<{ message: string; user: any }>(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async restoreUser(userId: string): Promise<{ message: string; user: any }> {
    return this.request<{ message: string; user: any }>(`/api/admin/users/${userId}/restore`, {
      method: 'POST',
    });
  }

  async setUserRole(userId: string, role: string): Promise<void> {
    await this.request(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async adminAssignPlan(userId: string, planData: {
    planName: string;
    activeBotCount?: number;
    totalBotSlots?: number;
    dbStorageMB?: number;
    durationDays?: number;
    maxFileSizeMB?: number;
    status?: string;
  }): Promise<{ message: string; subscription: any }> {
    return this.request<{ message: string; subscription: any }>(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async getAdminBots(query?: string, status?: string): Promise<AdminBotItem[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (status && status !== 'all') params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ bots: AdminBotItem[] }>(`/api/admin/bots${qs}`);
    return res.bots || [];
  }

  async adminRestartBot(botId: string): Promise<{ message: string; bot: any }> {
    return this.request<{ message: string; bot: any }>(`/api/admin/bots/${botId}/restart`, {
      method: 'POST',
    });
  }

  async adminStopBot(botId: string): Promise<{ message: string; bot: any }> {
    return this.request<{ message: string; bot: any }>(`/api/admin/bots/${botId}/stop`, {
      method: 'POST',
    });
  }

  async getAdminBotLogs(botId: string, limit: number = 200): Promise<{ logs: BotLogEntry[] }> {
    return this.request<{ logs: BotLogEntry[] }>(`/api/admin/bots/${botId}/logs?limit=${limit}`);
  }

  async getAdminPricingConfig(): Promise<DBPricingConfig> {
    const res = await this.request<{ pricing: DBPricingConfig }>('/api/admin/pricing');
    return res.pricing;
  }

  async updateAdminPricingConfig(config: Partial<DBPricingConfig>): Promise<DBPricingConfig> {
    const res = await this.request<{ message: string; pricing: DBPricingConfig }>('/api/admin/pricing', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return res.pricing;
  }

  async resetAdminPricingConfig(): Promise<DBPricingConfig> {
    const res = await this.request<{ message: string; pricing: DBPricingConfig }>('/api/admin/pricing/reset', {
      method: 'POST',
    });
    return res.pricing;
  }

  async getAdminOrders(filter?: string, search?: string): Promise<AdminOrderItem[]> {
    const params = new URLSearchParams();
    if (filter && filter !== 'all') params.append('filter', filter);
    if (search) params.append('query', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ orders: AdminOrderItem[] }>(`/api/admin/payments${qs}`);
    return res.orders || [];
  }

  async refundOrder(orderId: string, reason?: string): Promise<{ message: string; order: AdminOrderItem }> {
    return this.request<{ message: string; order: AdminOrderItem }>(`/api/admin/payments/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getAdminSystemHealth(): Promise<AdminSystemHealth> {
    return this.request<AdminSystemHealth>('/api/admin/system');
  }

  async getAdminAuditLogs(limit: number = 100): Promise<AdminAuditLogItem[]> {
    const res = await this.request<{ logs: AdminAuditLogItem[] }>(`/api/admin/audit-logs?limit=${limit}`);
    return res.logs || [];
  }
}

export const api = new ApiService();

