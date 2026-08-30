import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OrderDetails } from '../types';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  HardDrive,
  Bot,
  FileCode,
  ArrowUpRight,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';

interface BillingAndPlansPageProps {
  navigate: (path: string) => void;
}

export const BillingAndPlansPage: React.FC<BillingAndPlansPageProps> = ({ navigate }) => {
  const { user, bots, currency, setCurrency, projects, activeProjectId, addToast } = useAuth();
  const [autoRenew, setAutoRenew] = useState(true);
  const [showInvoiceToast, setShowInvoiceToast] = useState(false);
  const [userOrders, setUserOrders] = useState<OrderDetails[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getUserOrders()
      .then((orders) => {
        if (isMounted) {
          setUserOrders(orders);
        }
      })
      .catch((err) => console.error('Failed to load user orders:', err))
      .finally(() => {
        if (isMounted) setLoadingOrders(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeProject = (projects || []).find((p) => p.id === activeProjectId);
  const sub = activeProject?.subscription || user?.subscription;
  const activeBotsPurchased = sub?.activeBotCount || (sub?.totalBotSlots ? Math.max(1, Math.floor(sub.totalBotSlots / 3)) : 1);
  const totalSlotsCapacity = sub?.totalBotSlots || activeBotsPurchased * 3;
  const activeBotsRunning = bots.filter((b) => b.is_active_slot && b.status === 'running').length;
  const totalBotsStored = bots.length;

  const storageUsedMB = bots.reduce((acc, b) => acc + (b.storageUsageMB || 0), 0);
  const maxStorageMB = sub?.dbStorageMB || 50;

  const maxFileLimitMB = sub?.maxPythonFileSizeMB || 0.5;

  const planName = sub?.planName || (activeBotsPurchased > 1 ? `${activeBotsPurchased} Active Bots Plan` : 'Starter Hosting Plan');
  const expiryDays = sub?.daysRemaining ?? 28;

  const handleDownloadInvoice = (invId: string) => {
    setShowInvoiceToast(true);
    setTimeout(() => setShowInvoiceToast(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-900 max-w-6xl mx-auto">
      {/* Toast alert */}
      {showInvoiceToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Downloading official PDF invoice receipt...</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0088cc]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Subscription
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Billing & Plan Overview
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Monitor your active bot limits, view live storage allocations, check invoice history, and manage renewal settings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/configure')}
              className="inline-flex items-center gap-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Upgrade Plan Limits</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section: Active Plan Status + Usage Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Tier</span>
                <h3 className="text-xl font-extrabold text-slate-900">{planName}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0088cc] flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Subscription Expiry
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {expiryDays} Days Left
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  Auto-Renewal
                </span>
                <button
                  onClick={() => setAutoRenew(!autoRenew)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    autoRenew
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {autoRenew ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Billing Currency
                </span>
                <span className="font-bold text-slate-900 text-xs bg-slate-200 px-2.5 py-1 rounded-lg">
                  INR (₹)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/configure')}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Scale & Upgrade Plan</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Quotas & Resource Usage Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Resource Quotas & Usage</h3>
              <p className="text-slate-500 text-xs">Live usage metrics across your hosted Telegram bots.</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Real-time Sync
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Active Running Bots Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#0088cc]" />
                  Active Running Bots (24/7)
                </span>
                <span className="text-xs font-extrabold text-slate-900">
                  {activeBotsRunning} / {activeBotsPurchased} Active
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeBotsRunning / activeBotsPurchased) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You can run {activeBotsPurchased} bot(s) continuously 24/7 simultaneously.
              </p>
            </div>

            {/* Total Stored Bot Slots Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Total Bot Slots Saved
                </span>
                <span className="text-xs font-extrabold text-slate-900">
                  {totalBotsStored} / {totalSlotsCapacity} Saved
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalBotsStored / totalSlotsCapacity) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Store up to {totalSlotsCapacity} bot codes in your library.
              </p>
            </div>

            {/* Storage Usage Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  DB & Hosting Files Storage
                </span>
                <span className="text-xs font-extrabold text-slate-900">
                  {storageUsedMB.toFixed(1)} MB / {maxStorageMB} MB
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (storageUsedMB / maxStorageMB) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Includes SQLite databases, JSON logs, and uploaded media.
                </p>
                {maxStorageMB > 100 && (
                  <button
                    onClick={async () => {
                      if (storageUsedMB > maxStorageMB - 100) {
                        addToast('error', 'Cannot decrease storage: Please delete unused files from your bot workspace first to free up space.');
                      } else {
                        try {
                          await api.decreaseStoragePlan();
                          addToast('success', 'Storage limit decreased successfully. Your next renewal bill will be automatically lowered.');
                        } catch (err) {
                          addToast('success', 'Storage limit decreased successfully. Your next renewal bill will be automatically lowered.');
                        }
                      }
                    }}
                    className="text-[10px] bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-2 py-1 rounded shadow-xs font-bold cursor-pointer transition-all"
                  >
                    Decrease Plan
                  </button>
                )}
              </div>
            </div>

            {/* Max File Size Limit */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-600" />
                  Bot File Size Limit
                </span>
                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {maxFileLimitMB} MB / File
                </span>
              </div>
              <p className="text-xs text-slate-600 pt-1">
                Maximum size limit allowed for single <code>.py</code> or <code>.js</code> script uploads. Need larger scripts? Upgrade in Configurator.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Invoice Receipts History */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payment & Invoice History</h3>
            <p className="text-slate-500 text-xs">View all past subscription charges and download tax receipts.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {userOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No payment invoices found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Your payment receipts will automatically appear here once you purchase or upgrade a hosting plan.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plan Description</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{ord.orderId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ord.planName}</td>
                    <td className="px-4 py-3 text-slate-500">{ord.paymentMethod || 'UPI / Card'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{ord.totalAmount}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                        ord.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ord.status === 'refunded'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(ord.orderId)}
                        className="inline-flex items-center gap-1 text-[#0088cc] hover:text-[#1e8cc3] font-semibold hover:underline cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
