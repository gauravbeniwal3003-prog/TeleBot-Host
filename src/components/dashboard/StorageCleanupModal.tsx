import React, { useState } from 'react';
import { api } from '../../services/api';
import { StorageCleanupReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  HardDrive,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

interface StorageCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StorageCleanupModal: React.FC<StorageCleanupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useAuth();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<StorageCleanupReport | null>(null);

  if (!isOpen) return null;

  const handleRunCleanup = async () => {
    setRunning(true);
    try {
      const res = await api.runStorageCleanupJob();
      setReport(res.report);
      addToast('success', res.message || 'Storage cleanup job executed successfully.');
      if (onSuccess) onSuccess();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to execute storage cleanup');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Storage Cleanup & Data Retention Auditor</h3>
              <p className="text-xs text-slate-500">
                Automated 7-day post-expiration data purge and storage optimization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Policy Information Box */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>TeleBot Host Subscription Storage Policy</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
              <li>
                <strong>Immediate Expiration:</strong> When a subscription ends, bot execution is stopped immediately.
              </li>
              <li>
                <strong>7-Day Grace Period:</strong> Source files, SQLite database storage, and configurations are preserved for 7 days so users can renew without data loss.
              </li>
              <li>
                <strong>Automated Purge:</strong> After 7 days of expiration, customer container disk volumes are safely deallocated and unallocated storage is reclaimed.
              </li>
              <li>
                <strong>Account Preservation:</strong> Billing invoices and audit logs are securely retained for tax and legal compliance.
              </li>
            </ul>
          </div>

          {/* Action Trigger */}
          <div className="bg-sky-50/70 border border-sky-200/80 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Run Retention Cleanup Now</h4>
              <p className="text-[11px] text-slate-500">
                Scan all storage volumes, prune expired bots past grace period, and compact disk quotas.
              </p>
            </div>
            <button
              onClick={handleRunCleanup}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-colors"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{running ? 'Executing Audit...' : 'Execute Cleanup Job'}</span>
            </button>
          </div>

          {/* Report Results */}
          {report && (
            <div className="space-y-3 animate-in fade-in">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Audit Execution Summary</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="bg-slate-100 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Freed Storage</span>
                  <span className="text-sm font-bold text-emerald-600">{report.freedStorageMB} MB</span>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Cleaned Files</span>
                  <span className="text-sm font-bold text-slate-900">{report.cleanedFilesCount}</span>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Audited Bots</span>
                  <span className="text-sm font-bold text-slate-900">{report.cleanedBotsCount}</span>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Purged Subs</span>
                  <span className="text-sm font-bold text-indigo-600">{report.purgedExpiredSubscriptions}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-right">
                Executed at: {new Date(report.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
