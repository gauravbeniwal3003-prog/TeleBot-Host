export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended';

export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  telegram_username?: string;
  avatar_url?: string;
  role: UserRole;
  status?: UserStatus;
  is_verified: boolean;
  suspended_at?: string;
  suspended_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DBProject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface DynamicPlanConfig {
  activeBotCount: number; // e.g. 1, 2, 3, 5, 10, or custom
  totalBotSlots: number; // Formula: activeBotCount * 3
  maxPythonFileSizeMB: number; // 0.5 (500KB), 1, 2, 3, 5 MB
  dbStorageMB: number; // 50, 100, 250, 500, 1024, 2048, 5120, or custom MB
  durationDays: number; // 7, 30, 90, 180, 365, or custom
}

export interface DBSubscription {
  id: string;
  user_id: string;
  project_id?: string; // Belongs to a project
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  trial_started?: boolean;
  trial_started_at?: string | null;
  start_date: string;
  expiry_date: string;
  auto_renew: boolean;
  active_bot_count?: number;
  total_bot_slots: number; // Formula: active_bot_count * 3
  max_file_size_mb?: number;
  db_storage_mb?: number;
  duration_days?: number;
  ram_limit_mb: number;
  storage_limit_gb: number;
  created_at: string;
  updated_at: string;
}

export type DBBotStatus = 'running' | 'stopped' | 'restarting' | 'error' | 'deploying' | 'paused' | 'expired';
export type DBBotFramework = 'aiogram' | 'telethon' | 'pyrogram' | 'telegraf' | 'grammy' | 'python-telegram-bot' | 'telebot' | 'go-telegram' | 'custom';

export interface DBBotEnvVar {
  id: string;
  bot_id: string;
  project_id?: string; // Belongs to a project
  user_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBTelegramBot {
  id: string;
  project_id?: string; // Belongs to a project
  user_id: string;
  name: string;
  username: string;
  framework: DBBotFramework;
  version: string;
  status: DBBotStatus;
  is_active_slot: boolean;
  entry_point: string;
  git_repo_url?: string;
  has_database: boolean;
  db_type?: 'sqlite' | 'postgres' | 'redis';
  webhook_enabled: boolean;
  webhook_url?: string;
  cpu_usage: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  storage_usage_mb: number;
  uptime_seconds: number;
  restart_count: number;
  last_deployed_at: string;
  last_started_at?: string;
  last_stopped_at?: string;
  last_error?: string;
  last_error_friendly?: string;
  last_error_technical?: string;
  created_at: string;
  updated_at: string;
}

export interface DBBotFile {
  id: string;
  bot_id: string;
  project_id?: string; // Belongs to a project
  user_id: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  is_directory: boolean;
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface DBBotLog {
  id: string;
  bot_id: string;
  project_id?: string; // Belongs to a project
  user_id: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'system';
  message: string;
  timestamp: string;
}

export interface DBActivityLog {
  id: string;
  user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface DBOrder {
  order_id: string;
  user_id: string;
  project_id?: string; // Associated project (optional for general, required for project plans)
  plan_id: string;
  plan_name: string;
  billing_interval: 'monthly' | 'yearly';
  currency: 'INR' | 'USD';
  amount: number;
  discount: number;
  tax: number;
  total_amount: number;
  coupon_code?: string;
  plan_config?: DynamicPlanConfig;
  upgrade_from_sub_id?: string;
  unused_credit?: number;
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
  invoice_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DBSupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'bot_crash' | 'billing' | 'vps_issue' | 'feature_request' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  message: string;
  created_at: string;
  updated_at: string;
}
