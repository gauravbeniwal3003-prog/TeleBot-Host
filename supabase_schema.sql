-- ============================================================
-- TELEBOT HOST SUPABASE POSTGRESQL SCHEMA & MIGRATIONS
-- Copy and paste this script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  telegram_username TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  status TEXT DEFAULT 'active',
  trial_started BOOLEAN DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TEXT,
  auto_renew BOOLEAN DEFAULT false,
  total_bot_slots INTEGER DEFAULT 1,
  ram_limit_mb INTEGER DEFAULT 512,
  storage_limit_gb NUMERIC DEFAULT 0.05,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOTS TABLE
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  name TEXT NOT NULL,
  username TEXT,
  framework TEXT DEFAULT 'python-telegram-bot',
  version TEXT,
  status TEXT DEFAULT 'stopped',
  is_active_slot BOOLEAN DEFAULT true,
  entry_point TEXT DEFAULT 'main.py',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  order_id TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'PAID',
  payment_method TEXT DEFAULT 'cashfree',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ENSURE RECENT COLUMNS EXIST IF TABLES WERE CREATED PREVIOUSLY
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE IF EXISTS bots ADD COLUMN IF NOT EXISTS project_id TEXT;

-- 8. DISABLE ROW LEVEL SECURITY (RLS) FOR UNRESTRICTED BACKEND SYNC
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets DISABLE ROW LEVEL SECURITY;

-- 9. GRANT ALL PRIVILEGES TO ANON, AUTHENTICATED AND SERVICE_ROLE
GRANT ALL ON TABLE users TO anon, authenticated, service_role;
GRANT ALL ON TABLE projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE bots TO anon, authenticated, service_role;
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE tickets TO anon, authenticated, service_role;

