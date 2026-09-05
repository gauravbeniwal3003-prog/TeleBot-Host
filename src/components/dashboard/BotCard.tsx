import React, { useState } from 'react';
import { TelegramBot } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Play,
  Square,
  Pause,
  RotateCw,
  Terminal,
  KeyRound,
  Trash2,
  HardDrive,
  Database,
  Globe,
  Radio,
  FileCode,
  UploadCloud,
  ArrowRightLeft,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface BotCardProps {
  bot: TelegramBot;
  onOpenLogs: (bot: TelegramBot) => void;
  onOpenEnvVars: (bot: TelegramBot) => void;
  onOpenFiles?: (bot: TelegramBot) => void;
  onOpenUpload?: (bot: TelegramBot) => void;
  onOpenSwitchSlot?: (bot: TelegramBot) => void;
  onRefresh: () => void;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  onOpenLogs,
  onOpenEnvVars,
  onOpenFiles,
  onOpenUpload,
  onOpenSwitchSlot,
  onRefresh,
}) => {
  const { user, addToast } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleStatusChange = async (action: 'start' | 'stop' | 'pause' | 'resume' | 'restart') => {
    setLoadingAction(action);
    try {
      await api.updateBotStatus(bot.id, action);
      addToast('success', `Bot "${bot.name}" ${action}ed`);
      onRefresh();
    } catch (e: any) {
      addToast('error', e.message || 'Action failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRestart = async () => {
    setLoadingAction('restart');
    try {
      await api.updateBotStatus(bot.id, 'restart');
      addToast('success', `Bot "${bot.name}" restarted`);
      onRefresh();
    } catch (e: any) {
      addToast('error', e.message || 'Restart failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${bot.name}"? This action cannot be undone.`)) {
      return;
    }
    setLoadingAction('delete');
    try {
      await api.deleteBot(bot.id);
      addToast('success', `Bot "${bot.name}" deleted`);
      onRefresh();
    } catch (e: any) {
      addToast('error', e.message || 'Deletion failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const isRunning = bot.status === 'running';
  const isPaused = bot.status === 'paused';
  const isExpired = bot.status === 'expired';
  const isError = bot.status === 'error';

  const getStatusBadge = () => {
    switch (bot.status) {
      case 'running':
        return {
          label: 'Running 24/7',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotBg: 'bg-emerald-500 animate-pulse',
        };
      case 'paused':
        return {
          label: 'Paused',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          dotBg: 'bg-amber-500',
        };
      case 'restarting':
        return {
          label: 'Starting',
          badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
          dotBg: 'bg-[#24A1DE] animate-pulse',
        };
      case 'error':
        return {
          label: 'Stopped (Issue)',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          dotBg: 'bg-rose-500',
        };
      case 'expired':
        return {
          label: 'Plan Expired',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          dotBg: 'bg-rose-500',
        };
      case 'stopped':
      default:
        return {
          label: 'Stopped',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
          dotBg: 'bg-slate-400',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const planStorageMB = user?.subscription?.storage_limit_gb ? user.subscription.storage_limit_gb * 1024 : 1024;
  const diskUsed = Math.round((bot.storageUsageMB || 25) * 10) / 10;
  const isStorageExceeded = diskUsed >= planStorageMB;

  const ramLimit = bot.memoryLimitMB || 100;
  const rawRamUsage = bot.memoryUsageMB || 0;
  const ramPercent = isRunning ? Math.min(100, Math.round((rawRamUsage / ramLimit) * 100)) : 0;
  const isMemoryExceeded = isRunning && (ramPercent >= 95 || (bot.lastErrorTechnical?.toLowerCase().includes('oom') || bot.lastError?.toLowerCase().includes('memory')));

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
        isMemoryExceeded || isStorageExceeded
          ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/10'
          : isRunning
          ? 'border-emerald-200 ring-1 ring-emerald-100'
          : isPaused
          ? 'border-amber-200 bg-amber-50/10'
          : isExpired || isError
          ? 'border-rose-200 bg-rose-50/20'
          : 'border-slate-200 bg-slate-50/30'
      }`}
      id={`bot-card-${bot.id}`}
    >
      <div className="p-5 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-base">{bot.name}</h3>
              {isMemoryExceeded && (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
                  RAM Exceeded ({ramPercent}%)
                </span>
              )}
              {isStorageExceeded && (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
                  Storage Quota Full
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#0088cc]">
              {bot.username}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge.badgeBg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dotBg}`} />
            {statusBadge.label}
          </span>
        </div>

        {/* Resource Exceeded Alert Notification */}
        {(isMemoryExceeded || isStorageExceeded) && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {isMemoryExceeded
                  ? `RAM limit reached (${ramPercent}%). Bot paused/stopped.`
                  : `Storage quota full (${diskUsed} MB / ${planStorageMB} MB).`}
              </span>
            </div>
            <button
              onClick={() => onOpenLogs(bot)}
              className="text-rose-700 font-bold hover:underline shrink-0 text-xs"
            >
              Logs →
            </button>
          </div>
        )}

        {/* Friendly Error Notice */}
        {!(isMemoryExceeded || isStorageExceeded) && (isError || bot.lastErrorFriendly) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{bot.lastErrorFriendly || 'Bot encountered a script error.'}</span>
            </div>
            <button
              onClick={() => onOpenLogs(bot)}
              className="text-[#0088cc] font-bold hover:underline shrink-0 text-xs"
            >
              View Logs →
            </button>
          </div>
        )}

        {/* Clean Storage, RAM & Status Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Storage Used</span>
            <div className={`font-extrabold flex items-center gap-1 ${isStorageExceeded ? 'text-rose-700 font-black' : 'text-slate-800'}`}>
              <HardDrive className={`w-3.5 h-3.5 ${isStorageExceeded ? 'text-rose-600' : 'text-[#0088cc]'}`} />
              <span>{diskUsed} MB / {planStorageMB} MB</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">RAM Usage</span>
            <div className={`font-extrabold flex items-center gap-1 ${
              isMemoryExceeded ? 'text-rose-700 font-black' : ramPercent > 80 ? 'text-amber-700' : 'text-slate-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                !isRunning ? 'bg-slate-300' : isMemoryExceeded ? 'bg-rose-500 animate-pulse' : ramPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span>{ramPercent}% RAM</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Database</span>
            <div className="font-extrabold text-slate-800 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>{bot.hasDatabase ? bot.dbType || 'SQLite' : 'None'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* State Controls */}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <>
              <button
                onClick={() => handleStatusChange('pause')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold transition-colors disabled:opacity-50"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </button>

              <button
                onClick={() => handleStatusChange('stop')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold transition-colors disabled:opacity-50"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>

              <button
                onClick={handleRestart}
                disabled={loadingAction !== null}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                title="Restart Bot"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingAction === 'restart' ? 'animate-spin text-[#24A1DE]' : ''}`} />
              </button>
            </>
          ) : isPaused ? (
            <>
              <button
                onClick={() => handleStatusChange('resume')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </button>

              <button
                onClick={() => handleStatusChange('stop')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold transition-colors disabled:opacity-50"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStatusChange('start')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start</span>
              </button>

              {onOpenSwitchSlot && (
                <button
                  onClick={() => onOpenSwitchSlot(bot)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-[#0088cc] hover:bg-sky-100 border border-sky-200 font-bold transition-colors"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Switch Slot</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Upload & Tools */}
        <div className="flex items-center gap-1.5">
          {onOpenUpload && (
            <button
              onClick={() => onOpenUpload(bot)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0088cc] font-bold border border-sky-100 transition-colors"
              title="Upload Python Script (.py)"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Python (.py)</span>
            </button>
          )}

          {onOpenFiles && (
            <button
              onClick={() => onOpenFiles(bot)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              title="Manage Storage & Files"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#0088cc]" />
              <span>Files</span>
            </button>
          )}

          <button
            onClick={() => onOpenLogs(bot)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
            title="View Console Logs"
          >
            <Terminal className="w-3.5 h-3.5 text-[#24A1DE]" />
            <span>Logs</span>
          </button>

          <button
            onClick={() => onOpenEnvVars(bot)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            title="Environment Variables"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDelete}
            disabled={loadingAction !== null}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Bot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
