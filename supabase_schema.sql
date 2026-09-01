-- =====================================================================
-- TELEGRAM BOT HOSTING - PRODUCTION RELATIONAL DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- =====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    telegram_username VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOSTING PLANS TABLE
CREATE TABLE IF NOT EXISTS hosting_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tagline VARCHAR(255) NOT NULL,
    price_inr INTEGER NOT NULL,
    price_usd NUMERIC(8,2) NOT NULL,
    bot_slots INTEGER NOT NULL DEFAULT 1,
    ram_mb INTEGER NOT NULL DEFAULT 512,
    cpu_cores NUMERIC(4,2) NOT NULL DEFAULT 0.5,
    disk_storage_gb INTEGER NOT NULL DEFAULT 2,
    database_storage_mb INTEGER NOT NULL DEFAULT 100,
    bandwidth_gb INTEGER NOT NULL DEFAULT 50,
    dedicated_ipv4 BOOLEAN DEFAULT FALSE,
    popular BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES hosting_plans(id),
    plan_name VARCHAR(100) NOT NULL DEFAULT 'Starter Bot Plan',
    status VARCHAR(30) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    trial_started BOOLEAN DEFAULT FALSE,
    trial_started_at TIMESTAMPTZ,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    total_bot_slots INTEGER NOT NULL DEFAULT 1,
    ram_limit_mb INTEGER NOT NULL DEFAULT 512,
    storage_limit_gb NUMERIC(10,3) NOT NULL DEFAULT 2.000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 COMPATIBILITY SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES hosting_plans(id),
    plan_name VARCHAR(100) NOT NULL DEFAULT 'Starter Plan',
    status VARCHAR(30) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    trial_started BOOLEAN DEFAULT FALSE,
    trial_started_at TIMESTAMPTZ,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    total_bot_slots INTEGER NOT NULL DEFAULT 1,
    ram_limit_mb INTEGER NOT NULL DEFAULT 512,
    storage_limit_gb NUMERIC(10,3) NOT NULL DEFAULT 2.000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOTS DATABASE TABLE
CREATE TABLE IF NOT EXISTS telegram_bots (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL,
    framework VARCHAR(50) NOT NULL,
    version VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'restarting', 'error', 'deploying', 'paused')),
    is_active_slot BOOLEAN DEFAULT FALSE,
    entry_point VARCHAR(255) DEFAULT 'main.py',
    git_repo_url TEXT,
    has_database BOOLEAN DEFAULT FALSE,
    db_type VARCHAR(30),
    webhook_enabled BOOLEAN DEFAULT FALSE,
    webhook_url TEXT,
    cpu_usage NUMERIC(5,2) DEFAULT 0.0,
    memory_usage_mb INTEGER DEFAULT 0,
    memory_limit_mb INTEGER DEFAULT 512,
    storage_usage_mb NUMERIC(8,2) DEFAULT 0.0,
    uptime_seconds BIGINT DEFAULT 0,
    restart_count INTEGER DEFAULT 0,
    last_deployed_at TIMESTAMPTZ DEFAULT NOW(),
    last_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5 COMPATIBILITY BOTS DATABASE TABLE
CREATE TABLE IF NOT EXISTS bots (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL,
    framework VARCHAR(50) NOT NULL,
    version VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'restarting', 'error', 'deploying', 'paused')),
    is_active_slot BOOLEAN DEFAULT FALSE,
    entry_point VARCHAR(255) DEFAULT 'main.py',
    git_repo_url TEXT,
    has_database BOOLEAN DEFAULT FALSE,
    db_type VARCHAR(30),
    webhook_enabled BOOLEAN DEFAULT FALSE,
    webhook_url TEXT,
    cpu_usage NUMERIC(5,2) DEFAULT 0.0,
    memory_usage_mb INTEGER DEFAULT 0,
    memory_limit_mb INTEGER DEFAULT 512,
    storage_usage_mb NUMERIC(8,2) DEFAULT 0.0,
    uptime_seconds BIGINT DEFAULT 0,
    restart_count INTEGER DEFAULT 0,
    last_deployed_at TIMESTAMPTZ DEFAULT NOW(),
    last_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BOT ENVIRONMENT VARIABLES TABLE (SECURE KEY-VALUES)
CREATE TABLE IF NOT EXISTS bot_env_vars (
    id VARCHAR(100) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bot_id, key)
);

-- 6. BOT FILES METADATA & CONTENT TABLE
CREATE TABLE IF NOT EXISTS bot_files (
    id VARCHAR(100) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'text/plain',
    is_directory BOOLEAN DEFAULT FALSE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bot_id, file_path)
);

-- 7. BOT LOGS TABLE
CREATE TABLE IF NOT EXISTS bot_logs (
    id VARCHAR(100) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'debug', 'system')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BOT PERFORMANCE METRICS TIME-SERIES TABLE
CREATE TABLE IF NOT EXISTS bot_metrics (
    id VARCHAR(100) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cpu_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    ram_mb INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVITY & AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDERS & PAYMENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES hosting_plans(id),
    plan_name VARCHAR(100) NOT NULL,
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    amount NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    coupon_code VARCHAR(50),
    payment_method VARCHAR(50),
    payment_id VARCHAR(150),
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR USER ISOLATION
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Helper RLS policy function for Supabase auth
CREATE POLICY "Users can only read and update own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access own subscriptions" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only manage own bots" ON telegram_bots
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own bot env vars" ON bot_env_vars
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own bot files" ON bot_files
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own bot logs" ON bot_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own activity logs" ON activity_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own orders" ON orders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own support tickets" ON support_tickets
    FOR ALL USING (auth.uid() = user_id);

-- Hosting plans are publicly readable
CREATE POLICY "Public plans are viewable by all" ON hosting_plans
    FOR SELECT USING (is_active = TRUE);

-- =====================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON telegram_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_files_bot_id ON bot_files(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON bot_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
