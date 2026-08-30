import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ActivityLogItem } from '../../types';
import { Activity, Clock, Shield, Globe, Terminal, RefreshCw } from 'lucide-react';

export const ActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs();
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const formatAction = (action: string) => {
    switch (action) {
      case 'user.register':
        return { label: 'Account Created (Trial Active)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'user.login':
        return { label: 'Successful Sign In', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'user.logout':
        return { label: 'User Logged Out', color: 'text-slate-600 bg-slate-50 border-slate-200' };
      case 'user.password_change':
        return { label: 'Password Changed', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'bot.create':
        return { label: 'New Bot Container Deployed', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      case 'bot.start':
        return { label: 'Bot Process Started', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'bot.stop':
        return { label: 'Bot Process Stopped', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'bot.restart':
        return { label: 'Bot Container Restarted', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'bot.delete':
        return { label: 'Bot Container Deleted', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'bot.env_update':
        return { label: 'Environment Variables Updated', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'payment.success':
        return { label: 'Payment Verified & Plan Upgraded', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'order.create':
        return { label: 'Order Checkout Initiated', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      default:
        return { label: action, color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Account Security & Activity Audit Log</h3>
          <p className="text-xs text-slate-500">Immutable trace of authentication, container events, and subscription upgrades</p>
        </div>
        <button
          onClick={fetchActivity}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {logs.map((log) => {
              const act = formatAction(log.action);
              return (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-semibold border text-[11px] ${act.color}`}>
                          {act.label}
                        </span>
                        {log.details?.bot_name && (
                          <span className="font-semibold text-slate-800">"{log.details.bot_name}"</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-2">
                        <span>IP: {log.ip_address || '127.0.0.1'}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {log.id.slice(0, 12)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
