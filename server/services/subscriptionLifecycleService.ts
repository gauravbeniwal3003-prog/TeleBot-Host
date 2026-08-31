/**
 * TeleHost Subscription Lifecycle & Retention Engine
 * 
 * Responsibilities:
 * - Periodically audits active subscriptions for expiration
 * - Immediately shuts down all running customer containers when subscription expires
 * - Sets bot state to EXPIRED
 * - Enforces 7-day data retention grace period before isolated database storage is queued for purge
 * - Preserves user account and billing records for tax and legal compliance
 */

import { db } from '../db/database';
import { vpsWorkerClient } from './vpsWorkerClient';

export interface ExpirationAuditReport {
  timestamp: string;
  checkedSubscriptions: number;
  expiredSubscriptions: number;
  stoppedContainersCount: number;
  purgedStorageCount: number;
}

export class SubscriptionLifecycleService {
  private auditTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  public startScheduler(intervalMs: number = 60000): void {
    if (this.auditTimer) {
      clearInterval(this.auditTimer);
    }
    this.auditTimer = setInterval(() => {
      this.runAuditCycle().catch((err) => {
        console.error('[SubscriptionLifecycleService] Audit error:', err);
      });
    }, intervalMs);
  }

  public async runAuditCycle(): Promise<ExpirationAuditReport> {
    const allUsers = db.getAllUsers();
    const now = Date.now();
    let expiredSubsCount = 0;
    let stoppedContainers = 0;
    let purgedStorage = 0;

    for (const user of allUsers) {
      const projects = db.getUserProjects(user.id);
      for (const project of projects) {
        const sub = db.getProjectSubscription(project.id);
        if (!sub) continue;

        // Skip unstarted trial subscriptions where 24h timer has not begun
        if (sub.status === 'trial' && !sub.trial_started) {
          continue;
        }

        if (!sub.expiry_date) continue;

        const expiryTime = new Date(sub.expiry_date).getTime();
        const isExpired = expiryTime <= now;
        const isTrial = sub.plan_id === 'starter' && sub.status === 'trial' || sub.status === 'expired' && (sub.plan_name?.includes('Trial') || sub.trial_started);

        // Trial plans get a strict 24-hour retention grace period. Paid plans get 7 days.
        const RETENTION_GRACE_PERIOD_MS = isTrial ? (24 * 60 * 60 * 1000) : (7 * 24 * 60 * 60 * 1000);

        if (isExpired && sub.status !== 'expired') {
          // 1. Mark subscription expired in database
          sub.status = 'expired';
          sub.updated_at = new Date().toISOString();
          expiredSubsCount++;

          // 2. Shut down all project containers immediately
          const projectBots = db.getProjectBots(project.id);
          for (const bot of projectBots) {
            if (bot.status === 'running' || bot.status === 'paused' || bot.is_active_slot) {
              bot.status = 'expired' as any;
              bot.is_active_slot = false;
              bot.cpu_usage = 0;
              bot.memory_usage_mb = 0;
              bot.uptime_seconds = 0;
              bot.updated_at = new Date().toISOString();

              await vpsWorkerClient.expireBot(bot.id);
              stoppedContainers++;

              const message = isTrial 
                ? `[Trial Expired] Bot container stopped. You have 24 hours to purchase a plan before your bot files are permanently deleted from our VPS.`
                : `[Subscription Expired] Bot container stopped. Execution disabled. Storage preserved for 7-day grace period.`;

              db.appendBotLog(
                bot.id,
                user.id,
                'system',
                message
              );
            }
          }

          db.logActivity({
            user_id: user.id,
            action: 'subscription.expired',
            target_type: 'subscription',
            target_id: sub.id,
            details: { plan: sub.plan_name, stoppedBots: projectBots.length },
          });
        }

        // 3. Check for grace period expiration (older than 24h for trial, 7 days for paid)
        if (isExpired && now - expiryTime > RETENTION_GRACE_PERIOD_MS) {
          const projectBots = db.getProjectBots(project.id);
          for (const bot of projectBots) {
            // Delete all bot files permanently from VPS for expired trial users without a plan purchase
            const deletedFileCount = db.deleteBotFilesDirect(bot.id);
            if (deletedFileCount > 0) {
              purgedStorage++;
            }
            bot.storage_usage_mb = 0;
            await vpsWorkerClient.destroyBot(bot.id).catch(() => {});
          }

          db.logActivity({
            user_id: user.id,
            action: 'storage.purged_grace_expired',
            target_type: 'subscription',
            target_id: sub.id,
            details: { isTrial, gracePeriodHours: isTrial ? 24 : 168 },
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      checkedSubscriptions: allUsers.length,
      expiredSubscriptions: expiredSubsCount,
      stoppedContainersCount: stoppedContainers,
      purgedStorageCount: purgedStorage,
    };
  }

  public shutdown(): void {
    if (this.auditTimer) {
      clearInterval(this.auditTimer);
    }
  }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();
