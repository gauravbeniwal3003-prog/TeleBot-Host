import fs from 'fs';
import path from 'path';
import { db } from '../db/database';
import { supabase, shouldAttemptSync } from '../db/supabaseClient';
import { botRunnerWorker } from './botRunnerWorker';

export class SupabaseSyncEngine {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public start(intervalMs: number = 10000) {
    if (this.syncInterval) clearInterval(this.syncInterval);

    // Initial sync after 3 seconds
    setTimeout(() => this.runFullSync(), 3000);

    // Recurring sync
    this.syncInterval = setInterval(() => {
      this.runFullSync();
    }, intervalMs);

    console.log(`[Supabase Sync Engine] Realtime synchronization started (Polling interval: ${intervalMs / 1000}s)`);
  }

  public async runFullSync() {
    if (this.isRunning || !shouldAttemptSync()) return;
    this.isRunning = true;

    try {
      await this.syncUsersAndPurgeDeleted();
      await this.syncSubscriptionsAndLimits();
    } catch (err: any) {
      // Non-fatal error during background sync
      // console.warn('[Supabase Sync Engine Error]', err.message || err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check all users in Supabase.
   * If a user was deleted from Supabase, instantly stop all their bots and delete their physical directory!
   */
  private async syncUsersAndPurgeDeleted() {
    try {
      const { data: supaUsers, error } = await supabase.from('users').select('id, email, name, role, status');
      if (error || !supaUsers) return;

      const supaUserIds = new Set(supaUsers.map((u: any) => u.id));
      const supaUserEmails = new Set(supaUsers.map((u: any) => u.email.toLowerCase().trim()));

      // 1. Identify users present locally but deleted from Supabase
      const localUsers = db.getAllUsers();
      for (const localUser of localUsers) {
        // If user is neither in supaUserIds nor in supaUserEmails
        const isStillInSupabase = supaUserIds.has(localUser.id) || supaUserEmails.has(localUser.email.toLowerCase().trim());
        
        if (!isStillInSupabase) {
          console.log(`[Supabase Realtime Sync] User ${localUser.email} (${localUser.id}) was deleted from Supabase. Initiating instant cleanup...`);

          // 1. Stop all active bots running for this user
          const userBots = db.getUserBots(localUser.id);
          for (const bot of userBots) {
            try {
              botRunnerWorker.stopBot(bot.id, 'User account deleted from Supabase');
              botRunnerWorker.destroyContainer(bot.id);
            } catch (e) {}
          }

          // 2. Delete physical directory in vps_workspaces
          const safeUserName = localUser.name ? localUser.name.replace(/[^a-zA-Z0-9_-]/g, '_') : localUser.id;
          const workspacePath1 = path.join(process.cwd(), 'vps_workspaces', safeUserName);
          const workspacePath2 = path.join(process.cwd(), 'vps_workspaces', localUser.id);

          try {
            if (fs.existsSync(workspacePath1)) {
              fs.rmSync(workspacePath1, { recursive: true, force: true });
              console.log(`[Supabase Cleanup] Deleted workspace folder: ${workspacePath1}`);
            }
            if (fs.existsSync(workspacePath2)) {
              fs.rmSync(workspacePath2, { recursive: true, force: true });
              console.log(`[Supabase Cleanup] Deleted workspace folder: ${workspacePath2}`);
            }
          } catch (e) {
            console.error(`[Supabase Cleanup] Failed to delete directory for ${localUser.email}:`, e);
          }

          // 3. Purge user records from database
          try {
            db.purgeUserCompletely(localUser.id);
          } catch (e) {}
        }
      }

      // 2. Also check physical folders in vps_workspaces: if an orphaned directory exists for a non-existent user, purge it
      const workspacesRoot = path.join(process.cwd(), 'vps_workspaces');
      if (fs.existsSync(workspacesRoot)) {
        const folders = fs.readdirSync(workspacesRoot);
        for (const folder of folders) {
          // Check if folder belongs to any active user in Supabase
          const matchesActiveUser = supaUsers.some((u: any) => {
            const safe = u.name ? u.name.replace(/[^a-zA-Z0-9_-]/g, '_') : u.id;
            return safe === folder || u.id === folder;
          });

          if (!matchesActiveUser && folder !== '.keep' && folder !== 'temp') {
            const orphanPath = path.join(workspacesRoot, folder);
            try {
              fs.rmSync(orphanPath, { recursive: true, force: true });
              console.log(`[Supabase Cleanup] Purged orphaned directory for deleted user: ${orphanPath}`);
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      // ignore
    }
  }

  /**
   * Sync active subscriptions, RAM limits, and storage quotas from Supabase.
   * If a user upgraded storage/RAM in Supabase, update their live limits immediately!
   */
  private async syncSubscriptionsAndLimits() {
    try {
      let { data: supaSubs, error } = await supabase.from('subscriptions').select('*');
      if (error || !supaSubs) {
        const fallback = await supabase.from('user_subscriptions').select('*');
        if (!fallback.error && fallback.data) {
          supaSubs = fallback.data;
        } else {
          return;
        }
      }

      if (!supaSubs || supaSubs.length === 0) return;

      for (const supaSub of supaSubs) {
        const localSub = db.getUserSubscription(supaSub.user_id);
        if (localSub) {
          let updated = false;

          // Check if status changed
          if (supaSub.status && localSub.status !== supaSub.status) {
            localSub.status = supaSub.status;
            updated = true;

            // If subscription expired or suspended, stop their running bots
            if (supaSub.status === 'expired' || supaSub.status === 'suspended' || supaSub.status === 'cancelled') {
              const userBots = db.getUserBots(supaSub.user_id);
              for (const bot of userBots) {
                botRunnerWorker.expireBot(bot.id);
                bot.status = 'expired';
              }
            }
          }

          // Check if RAM limit changed
          if (supaSub.ram_limit_mb && localSub.ram_limit_mb !== supaSub.ram_limit_mb) {
            localSub.ram_limit_mb = Number(supaSub.ram_limit_mb);
            updated = true;
          }

          // Check if Storage limit changed
          if (supaSub.storage_limit_gb && localSub.storage_limit_gb !== supaSub.storage_limit_gb) {
            localSub.storage_limit_gb = Number(supaSub.storage_limit_gb);
            updated = true;
          }

          // Check if total bot slots or active bot count changed
          if (supaSub.total_bot_slots && localSub.total_bot_slots !== supaSub.total_bot_slots) {
            localSub.total_bot_slots = Number(supaSub.total_bot_slots);
            updated = true;
          }

          if (supaSub.active_bot_count && localSub.active_bot_count !== supaSub.active_bot_count) {
            localSub.active_bot_count = Number(supaSub.active_bot_count);
            updated = true;
          }

          if (supaSub.expiry_date && localSub.expiry_date !== supaSub.expiry_date) {
            localSub.expiry_date = supaSub.expiry_date;
            updated = true;
          }

          if (updated) {
            db.save();
            console.log(`[Supabase Realtime Sync] Updated limits for user ${supaSub.user_id}: RAM ${localSub.ram_limit_mb}MB, Storage ${localSub.storage_limit_gb}GB, Status: ${localSub.status}`);
          }
        }
      }
    } catch (err: any) {
      // ignore
    }
  }

  public shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const supabaseSyncEngine = new SupabaseSyncEngine();
