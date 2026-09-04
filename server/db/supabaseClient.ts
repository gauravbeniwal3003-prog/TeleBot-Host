import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns';

// Fix Node.js 18+ undici fetch IPv6 issue on Linux VPS
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore if unsupported
}

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://nurvwlwqurovglbptknf.supabase.co').trim();
// Prioritize Service Role Key for backend administrative operations (bypasses RLS), fallback to Anon Key
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cnZ3bHdxdXJvdmdsYnB0a25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTg1NzcsImV4cCI6MjA4NDg3NDU3N30.L7D3LTkHq1ZudoyHPbzWVumOXm4zi2AXXspKvTPNv-w'
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log(`[Supabase] Initialized client for ${SUPABASE_URL}`);

// Circuit breaker state to prevent repetitive console spam when Supabase network is down or unreachable
let isCircuitOpen = false;
let nextRetryTime = 0;
const COOLDOWN_MS = 60000; // Pause retrying network calls for 60s on connection failure
const loggedWarnings = new Set<string>();

function isNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return msg.includes('fetch failed') || msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('etimedout') || msg.includes('socket hanging up');
}

function handleSupabaseError(context: string, error: any): void {
  if (!error) return;
  const code = error.code || '';
  const msg = error.message || String(error);

  if (isNetworkError(error)) {
    const now = Date.now();
    if (!isCircuitOpen || now > nextRetryTime) {
      isCircuitOpen = true;
      nextRetryTime = now + COOLDOWN_MS;
      console.warn(`[Supabase Connection Note] Network fetch failed to ${SUPABASE_URL}. Local fallback active. Sync paused for 60s.`);
    }
  } else if (code === '42P01' || msg.includes('does not exist')) {
    if (!loggedWarnings.has('missing_table')) {
      loggedWarnings.add('missing_table');
      console.warn(`[Supabase Schema Notice] One or more tables do not exist in Supabase yet. Run 'supabase_schema.sql' in your Supabase SQL Editor.`);
    }
  } else if (code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission denied')) {
    if (!loggedWarnings.has('rls_warning')) {
      loggedWarnings.add('rls_warning');
      console.warn(`[Supabase RLS Notice] Supabase Row-Level Security (RLS) is active on your tables. To enable direct backend sync, execute 'supabase_schema.sql' in Supabase SQL Editor or supply SUPABASE_SERVICE_ROLE_KEY in .env.`);
    }
  } else if (msg.includes('project_id') || code === 'PGRST204') {
    // Column missing in schema cache - handled gracefully
  } else {
    if (!loggedWarnings.has(context)) {
      loggedWarnings.add(context);
      console.warn(`[Supabase Sync Warning] ${context}:`, msg);
    }
  }
}

export function shouldAttemptSync(): boolean {
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-custom') || SUPABASE_URL.includes('example.com')) {
    return false;
  }
  if (isCircuitOpen) {
    if (Date.now() > nextRetryTime) {
      isCircuitOpen = false;
      return true;
    }
    return false;
  }
  return true;
}

// Fetch a single user by email directly from Supabase
export async function fetchUserFromSupabaseByEmail(email: string): Promise<any | null> {
  if (!shouldAttemptSync()) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      handleSupabaseError(`Fetch User ${cleanEmail}`, error);
      return null;
    }
    return data;
  } catch (err: any) {
    handleSupabaseError(`Fetch User ${email}`, err);
    return null;
  }
}

// Fetch user data bundle (user, project, subscription, bots) from Supabase
export async function fetchUserDataBundleFromSupabase(userId: string): Promise<{
  user: any | null;
  projects: any[];
  subscriptions: any[];
  bots: any[];
} | null> {
  if (!shouldAttemptSync()) return null;
  try {
    const [uRes, pRes, sRes, bRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('subscriptions').select('*').eq('user_id', userId),
      supabase.from('bots').select('*').eq('user_id', userId),
    ]);

    return {
      user: uRes.data || null,
      projects: pRes.data || [],
      subscriptions: sRes.data || [],
      bots: bRes.data || [],
    };
  } catch (err: any) {
    handleSupabaseError(`Fetch Data Bundle ${userId}`, err);
    return null;
  }
}

// Helper function to sync a user to Supabase
export async function syncUserToSupabase(user: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
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
      handleSupabaseError(`User ${user.email}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`User ${user.email}`, err);
    return false;
  }
}

// Helper function to sync a project to Supabase
export async function syncProjectToSupabase(project: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: project.user_id,
      name: project.name,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      handleSupabaseError(`Project ${project.name}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`Project ${project.name}`, err);
    return false;
  }
}

// Helper function to sync a subscription to Supabase
export async function syncSubscriptionToSupabase(sub: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const payload = {
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
    };

    let { error } = await supabase.from('subscriptions').upsert(payload, { onConflict: 'id' });

    if (error && (error.message.includes('relation "subscriptions" does not exist') || error.code === '42P01')) {
      const fallbackPayload = {
        id: sub.id,
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        status: sub.status,
        start_date: sub.start_date,
        expiry_date: sub.expiry_date || new Date().toISOString(),
        auto_renew: sub.auto_renew || false,
        total_bot_slots: sub.total_bot_slots || 1,
        ram_limit_mb: sub.ram_limit_mb || 512,
        storage_limit_gb: sub.storage_limit_gb || 0.05,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      };
      const { error: fallbackErr } = await supabase.from('user_subscriptions').upsert(fallbackPayload, { onConflict: 'id' });
      error = fallbackErr;
    }

    if (error) {
      handleSupabaseError(`Subscription ${sub.id}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`Subscription ${sub.id}`, err);
    return false;
  }
}

// Helper function to sync a bot to Supabase
export async function syncBotToSupabase(bot: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const payload = {
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
    };

    let { error } = await supabase.from('bots').upsert(payload, { onConflict: 'id' });

    if (error && (error.message.includes('relation "bots" does not exist') || error.code === '42P01')) {
      const fallbackPayload = {
        id: bot.id,
        user_id: bot.user_id,
        name: bot.name,
        username: bot.username,
        framework: bot.framework,
        version: bot.version,
        status: bot.status,
        is_active_slot: bot.is_active_slot ?? true,
        entry_point: bot.entry_point || 'main.py',
        created_at: bot.created_at,
        updated_at: bot.updated_at,
      };
      const { error: fallbackErr } = await supabase.from('telegram_bots').upsert(fallbackPayload, { onConflict: 'id' });
      error = fallbackErr;
    }

    if (error) {
      handleSupabaseError(`Bot ${bot.id}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`Bot ${bot.id}`, err);
    return false;
  }
}

// Helper function to sync an order to Supabase
export async function syncOrderToSupabase(order: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const payload: any = {
      id: order.id,
      user_id: order.user_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      status: order.status || 'PAID',
      payment_method: order.payment_method || 'cashfree',
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
    if (order.project_id) {
      payload.project_id = order.project_id;
    }

    let { error } = await supabase.from('orders').upsert(payload, { onConflict: 'id' });

    if (error && (error.message.includes('project_id') || error.code === 'PGRST204')) {
      // Retry without project_id if column not present in schema
      delete payload.project_id;
      const retryRes = await supabase.from('orders').upsert(payload, { onConflict: 'id' });
      error = retryRes.error;
    }

    if (error) {
      handleSupabaseError(`Order ${order.order_id}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`Order ${order.order_id}`, err);
    return false;
  }
}

// Helper function to sync a support ticket to Supabase
export async function syncTicketToSupabase(ticket: any): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const { error } = await supabase.from('tickets').upsert({
      id: ticket.id,
      user_id: ticket.user_id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    }, { onConflict: 'id' });

    if (error) {
      handleSupabaseError(`Ticket ${ticket.id}`, error);
      return false;
    }
    return true;
  } catch (err: any) {
    handleSupabaseError(`Ticket ${ticket.id}`, err);
    return false;
  }
}

// Bulk sync function to push full local state to Supabase PostgreSQL
export async function syncAllToSupabase(data: {
  users?: any[];
  projects?: any[];
  subscriptions?: any[];
  bots?: any[];
  orders?: any[];
  tickets?: any[];
}): Promise<void> {
  if (!shouldAttemptSync()) return;
  if (data.users && data.users.length > 0) {
    for (const u of data.users) await syncUserToSupabase(u);
  }
  if (data.projects && data.projects.length > 0) {
    for (const p of data.projects) await syncProjectToSupabase(p);
  }
  if (data.subscriptions && data.subscriptions.length > 0) {
    for (const s of data.subscriptions) await syncSubscriptionToSupabase(s);
  }
  if (data.bots && data.bots.length > 0) {
    for (const b of data.bots) await syncBotToSupabase(b);
  }
  if (data.orders && data.orders.length > 0) {
    for (const o of data.orders) await syncOrderToSupabase(o);
  }
  if (data.tickets && data.tickets.length > 0) {
    for (const t of data.tickets) await syncTicketToSupabase(t);
  }
}

// Helper functions for deletion
export async function deleteBotFromSupabase(botId: string): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    let { error } = await supabase.from('bots').delete().eq('id', botId);
    if (error && (error.message.includes('relation "bots" does not exist') || error.code === '42P01')) {
      const { error: fallbackErr } = await supabase.from('telegram_bots').delete().eq('id', botId);
      error = fallbackErr;
    }
    if (error) handleSupabaseError(`Delete bot ${botId}`, error);
    return !error;
  } catch (err: any) {
    handleSupabaseError(`Delete bot ${botId}`, err);
    return false;
  }
}

export async function deleteProjectFromSupabase(projectId: string): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) handleSupabaseError(`Delete project ${projectId}`, error);
    return !error;
  } catch (err: any) {
    handleSupabaseError(`Delete project ${projectId}`, err);
    return false;
  }
}

export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  if (!shouldAttemptSync()) return false;
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) handleSupabaseError(`Delete user ${userId}`, error);
    return !error;
  } catch (err: any) {
    handleSupabaseError(`Delete user ${userId}`, err);
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
  if (!shouldAttemptSync()) return null;
  try {
    // 1. Load users table (required)
    const uRes = await supabase.from('users').select('*');
    if (uRes.error) {
      handleSupabaseError('Load Users table', uRes.error);
      return null;
    }

    // 2. Load projects table (optional fallback)
    let projects: any[] = [];
    const pRes = await supabase.from('projects').select('*');
    if (!pRes.error) {
      projects = pRes.data || [];
    } else {
      console.warn('[Supabase Load Warning] Projects table failed (skipping):', pRes.error.message);
    }

    // 3. Load subscriptions table with 'subscriptions' or 'user_subscriptions' fallback
    let subscriptions: any[] = [];
    let sRes = await supabase.from('subscriptions').select('*');
    if (sRes.error && (sRes.error.message.includes('relation "subscriptions" does not exist') || sRes.error.code === '42P01')) {
      console.log('[Supabase Load Fallback] subscriptions table not found, trying user_subscriptions...');
      sRes = await supabase.from('user_subscriptions').select('*');
    }
    if (!sRes.error) {
      subscriptions = (sRes.data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        project_id: s.project_id || null,
        plan_id: s.plan_id,
        plan_name: s.plan_name || 'Starter Plan',
        status: s.status || 'active',
        trial_started: s.trial_started || false,
        trial_started_at: s.trial_started_at || null,
        start_date: s.start_date || s.created_at,
        expiry_date: s.expiry_date || '',
        auto_renew: s.auto_renew || false,
        total_bot_slots: s.total_bot_slots || 3,
        ram_limit_mb: s.ram_limit_mb || 512,
        storage_limit_gb: s.storage_limit_gb || 0.05,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));
    } else {
      console.warn('[Supabase Load Warning] Subscriptions table failed:', sRes.error.message);
    }

    // 4. Load bots table with 'bots' or 'telegram_bots' fallback
    let bots: any[] = [];
    let bRes = await supabase.from('bots').select('*');
    if (bRes.error && (bRes.error.message.includes('relation "bots" does not exist') || bRes.error.code === '42P01')) {
      console.log('[Supabase Load Fallback] bots table not found, trying telegram_bots...');
      bRes = await supabase.from('telegram_bots').select('*');
    }
    if (!bRes.error) {
      bots = (bRes.data || []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        project_id: b.project_id || null,
        name: b.name,
        username: b.username,
        framework: b.framework,
        version: b.version,
        status: b.status,
        is_active_slot: b.is_active_slot ?? true,
        entry_point: b.entry_point || 'main.py',
        created_at: b.created_at,
        updated_at: b.updated_at,
      }));
    } else {
      console.warn('[Supabase Load Warning] Bots table failed:', bRes.error.message);
    }

    return {
      users: uRes.data || [],
      projects,
      subscriptions,
      bots,
    };
  } catch (err: any) {
    console.warn('[Supabase Load Exception]', err.message || err);
    return null;
  }
}
