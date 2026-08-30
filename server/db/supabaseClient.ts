import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nurvwlwqurovglbptknf.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cnZ3bHdxdXJvdmdsYnB0a25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTg1NzcsImV4cCI6MjA4NDg3NDU3N30.L7D3LTkHq1ZudoyHPbzWVumOXm4zi2AXXspKvTPNv-w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log(`[Supabase] Initialized client for ${SUPABASE_URL}`);

// Helper function to sync a user to Supabase
export async function syncUserToSupabase(user: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      password_hash: user.password_hash,
      telegram_username: user.telegram_username,
      role: user.role || 'user',
      status: user.status || 'active',
      is_verified: user.is_verified ?? true,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Sync Warning] User ${user.email} sync note:`, error.message);
      return false;
    }
    console.log(`[Supabase Sync Success] User ${user.email} (${user.id}) successfully synced to Supabase!`);
    return true;
  } catch (err: any) {
    console.warn('[Supabase Sync Error]', err.message || err);
    return false;
  }
}

// Helper function to sync a project to Supabase
export async function syncProjectToSupabase(project: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: project.user_id,
      name: project.name,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Sync Warning] Project ${project.name} sync note:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Project Sync Error]', err.message || err);
    return false;
  }
}

// Helper function to sync a subscription to Supabase
export async function syncSubscriptionToSupabase(sub: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('subscriptions').upsert({
      id: sub.id,
      user_id: sub.user_id,
      project_id: sub.project_id || null,
      plan_id: sub.plan_id,
      plan_name: sub.plan_name,
      status: sub.status,
      trial_started: sub.trial_started || false,
      trial_started_at: sub.trial_started_at || null,
      start_date: sub.start_date,
      expiry_date: sub.expiry_date || '',
      auto_renew: sub.auto_renew || false,
      total_bot_slots: sub.total_bot_slots || 1,
      ram_limit_mb: sub.ram_limit_mb || 512,
      storage_limit_gb: sub.storage_limit_gb || 0.05,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Sync Warning] Subscription ${sub.id} sync note:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Subscription Sync Error]', err.message || err);
    return false;
  }
}

// Helper function to sync a bot to Supabase
export async function syncBotToSupabase(bot: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('bots').upsert({
      id: bot.id,
      user_id: bot.user_id,
      project_id: bot.project_id || null,
      name: bot.name,
      username: bot.username,
      framework: bot.framework,
      version: bot.version,
      status: bot.status,
      is_active_slot: bot.is_active_slot ?? true,
      entry_point: bot.entry_point || 'main.py',
      created_at: bot.created_at,
      updated_at: bot.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Sync Warning] Bot ${bot.id} sync note:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Bot Sync Error]', err.message || err);
    return false;
  }
}

// Helper functions for deletion
export async function deleteBotFromSupabase(botId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bots').delete().eq('id', botId);
    if (error) console.warn(`[Supabase Delete Bot Warning]`, error.message);
    return !error;
  } catch (err: any) {
    console.warn('[Supabase Delete Bot Error]', err);
    return false;
  }
}

export async function deleteProjectFromSupabase(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) console.warn(`[Supabase Delete Project Warning]`, error.message);
    return !error;
  } catch (err: any) {
    console.warn('[Supabase Delete Project Error]', err);
    return false;
  }
}

export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) console.warn(`[Supabase Delete User Warning]`, error.message);
    return !error;
  } catch (err: any) {
    console.warn('[Supabase Delete User Error]', err);
    return false;
  }
}

// Helper function to load all initial data from Supabase
export async function loadAllFromSupabase(): Promise<{
  users: any[];
  projects: any[];
  subscriptions: any[];
  bots: any[];
} | null> {
  try {
    const [uRes, pRes, sRes, bRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('subscriptions').select('*'),
      supabase.from('bots').select('*'),
    ]);

    if (uRes.error || pRes.error || sRes.error || bRes.error) {
      console.warn('[Supabase Load Error]', uRes.error || pRes.error || sRes.error || bRes.error);
      return null;
    }

    return {
      users: uRes.data || [],
      projects: pRes.data || [],
      subscriptions: sRes.data || [],
      bots: bRes.data || [],
    };
  } catch (err: any) {
    console.warn('[Supabase Load Exception]', err.message || err);
    return null;
  }
}
