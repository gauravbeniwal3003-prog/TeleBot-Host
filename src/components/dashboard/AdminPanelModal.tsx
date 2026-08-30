import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  AdminStats,
  AdminUserItem,
  AdminBotItem,
  AdminOrderItem,
  AdminSystemHealth,
  AdminAuditLogItem,
  DBPricingConfig,
  BotLogEntry,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Users,
  Bot,
  Server,
  DollarSign,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Sliders,
  Save,
  Search,
  RotateCcw,
  Square,
  Play,
  FileText,
  UserX,
  UserCheck,
  CreditCard,
  HardDrive,
  Cpu,
  Zap,
  Clock,
  ShieldCheck,
  CornerDownRight,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  TrendingUp,
  Database,
  Layers,
  Terminal,
  Download,
  Info,
} from 'lucide-react';

interface AdminPanelModalProps {
  onClose: () => void;
}

type AdminTab = 'metrics' | 'users' | 'bots' | 'pricing' | 'payments' | 'system' | 'audit';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { user: currentAdmin, addToast } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [bots, setBots] = useState<AdminBotItem[]>([]);
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<AdminSystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [pricingConfig, setPricingConfig] = useState<DBPricingConfig | null>(null);
  const [editingPricing, setEditingPricing] = useState<DBPricingConfig | null>(null);

  // Filters & searches
  const [userSearch, setUserSearch] = useState('');
  const [botSearch, setBotSearch] = useState('');
  const [botStatusFilter, setBotStatusFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Interactive Sub-Modals & Dialogs
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const [orderToRefund, setOrderToRefund] = useState<AdminOrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [selectedBotLogs, setSelectedBotLogs] = useState<{ bot: AdminBotItem; logs: BotLogEntry[] } | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [savingPricing, setSavingPricing] = useState(false);
  const [actionInProgressBotId, setActionInProgressBotId] = useState<string | null>(null);

  // Fetch all initial data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [s, u, b, p, o, sys, audit] = await Promise.all([
        api.getAdminDashboard().catch(() => null),
        api.getAdminUsers().catch(() => []),
        api.getAdminBots().catch(() => []),
        api.getAdminPricingConfig().catch(() => null),
        api.getAdminOrders().catch(() => []),
        api.getAdminSystemHealth().catch(() => null),
        api.getAdminAuditLogs(100).catch(() => []),
      ]);

      if (s) setStats(s);
      setUsers(u);
      setBots(b);
      setOrders(o);
      if (sys) setSystemHealth(sys);
      setAuditLogs(audit);
      if (p) {
        setPricingConfig(p);
        setEditingPricing(JSON.parse(JSON.stringify(p)));
      }
    } catch (e: any) {
      addToast('error', e.message || 'Failed to load admin telemetry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.telegramUsername && u.telegramUsername.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const filteredBots = bots.filter((b) => {
    const matchesSearch =
      !botSearch.trim() ||
      b.name.toLowerCase().includes(botSearch.toLowerCase()) ||
      b.username.toLowerCase().includes(botSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(botSearch.toLowerCase()) ||
      b.owner.name.toLowerCase().includes(botSearch.toLowerCase()) ||
      b.owner.email.toLowerCase().includes(botSearch.toLowerCase());

    const matchesStatus = botStatusFilter === 'all' || b.status === botStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !paymentSearch.trim() ||
      o.order_id.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (o.payment_id && o.payment_id.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (o.refund_transaction_id && o.refund_transaction_id.toLowerCase().includes(paymentSearch.toLowerCase()));

    const matchesStatus = paymentStatusFilter === 'all' || o.status === paymentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // User Actions
  const handleViewUserDetail = async (userId: string) => {
    setLoadingUserDetail(true);
    try {
      const detail = await api.getAdminUserDetail(userId);
      setSelectedUserDetail(detail);
    } catch (e: any) {
      addToast('error', e.message || 'Failed to load user details');
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!userToSuspend) return;
    setSuspending(true);
    try {
      const res = await api.suspendUser(userToSuspend.id, suspendReason || 'Administrative suspension');
      addToast('success', res.message);
      setUserToSuspend(null);
      setSuspendReason('');
      await loadAdminData();
      if (selectedUserDetail?.user?.id === userToSuspend.id) {
        handleViewUserDetail(userToSuspend.id);
      }
    } catch (e: any) {
      addToast('error', e.message || 'Failed to suspend account');
    } finally {
      setSuspending(false);
    }
  };

  const handleRestoreUser = async (user: AdminUserItem) => {
    try {
      const res = await api.restoreUser(user.id);
      addToast('success', res.message);
      await loadAdminData();
      if (selectedUserDetail?.user?.id === user.id) {
        handleViewUserDetail(user.id);
      }
    } catch (e: any) {
      addToast('error', e.message || 'Failed to restore account');
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.setUserRole(userId, nextRole);
      addToast('success', `User role updated to ${nextRole}`);
      await loadAdminData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to change user role');
    }
  };

  // Bot Actions
  const handleAdminRestartBot = async (bot: AdminBotItem) => {
    setActionInProgressBotId(bot.id);
    try {
      const res = await api.adminRestartBot(bot.id);
      addToast('success', res.message);
      await loadAdminData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to restart bot');
    } finally {
      setActionInProgressBotId(null);
    }
  };

  const handleAdminStopBot = async (bot: AdminBotItem) => {
    setActionInProgressBotId(bot.id);
    try {
      const res = await api.adminStopBot(bot.id);
      addToast('success', res.message);
      await loadAdminData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to stop bot');
    } finally {
      setActionInProgressBotId(null);
    }
  };

  const handleViewBotLogs = async (bot: AdminBotItem) => {
    setLoadingLogs(true);
    try {
      const res = await api.getAdminBotLogs(bot.id, 200);
      setSelectedBotLogs({ bot, logs: res.logs || [] });
    } catch (e: any) {
      addToast('error', e.message || 'Failed to fetch bot logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Refund Action
  const handleConfirmRefund = async () => {
    if (!orderToRefund) return;
    setRefunding(true);
    try {
      const res = await api.refundOrder(orderToRefund.order_id, refundReason || 'Administrator approved refund');
      addToast('success', res.message);
      setOrderToRefund(null);
      setRefundReason('');
      await loadAdminData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
    }
  };

  // Pricing Actions
  const handleSavePricing = async () => {
    if (!editingPricing) return;
    setSavingPricing(true);
    try {
      const updated = await api.updateAdminPricingConfig(editingPricing);
      setPricingConfig(updated);
      setEditingPricing(JSON.parse(JSON.stringify(updated)));
      addToast('success', 'Dynamic pricing configuration updated on server successfully');
    } catch (e: any) {
      addToast('error', e.message || 'Failed to update pricing configuration');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleResetPricing = async () => {
    if (!window.confirm('Are you sure you want to reset pricing to factory default settings?')) return;
    setSavingPricing(true);
    try {
      const def = await api.resetAdminPricingConfig();
      setPricingConfig(def);
      setEditingPricing(JSON.parse(JSON.stringify(def)));
      addToast('success', 'Pricing configuration reset to default values');
    } catch (e: any) {
      addToast('error', e.message || 'Failed to reset pricing configuration');
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">TeleBot Host Cluster Administration & Security Portal</h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono px-2 py-0.5 rounded uppercase font-bold">
                  Strict Admin Auth
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative multi-tenant orchestration, sandboxing control, financial ledger, and pricing engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh all metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 text-xs font-semibold overflow-x-auto shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'bots'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Cluster Bots ({bots.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Pricing Config</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'payments'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments & Refunds ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'system'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>VPS Health & Hardware</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-[#24A1DE] text-[#0088cc] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 text-xs bg-slate-50/50">
          {loading && !stats ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#24A1DE] mx-auto" />
              <p className="text-slate-500 font-medium">Querying cluster telemetry and secure relational store...</p>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {/* ======================================================== */}
              {activeTab === 'metrics' && stats && (
                <div className="space-y-6">
                  {/* Top Overview Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Total Users</span>
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="text-emerald-600 font-semibold">{stats.activeUsers} active</span>
                        <span>•</span>
                        <span className="text-amber-600 font-semibold">{stats.suspendedUsers} suspended</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Active Bots / Containers</span>
                        <Bot className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-700">
                        {stats.activeBots} <span className="text-sm font-normal text-slate-400">/ {stats.totalBots}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="text-slate-600">{stats.stoppedBots} stopped</span>
                        {stats.errorBots ? (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-semibold">{stats.errorBots} errors</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Subscriptions</span>
                        <Zap className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="text-2xl font-bold text-sky-800">{stats.activeSubscriptions}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="text-sky-600">{stats.trialSubscriptions} trials</span>
                        <span>•</span>
                        <span className="text-slate-400">{stats.expiredSubscriptions} expired</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Gross Revenue</span>
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-2xl font-bold text-indigo-900">₹{stats.totalRevenueINR.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="text-slate-600">~${stats.totalRevenueUSD} USD</span>
                        <span>•</span>
                        <span className="text-emerald-600">{stats.successfulPaymentsCount} paid</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Storage Breakdown Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Financial Summary */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>Payments & Revenue Ledger</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('payments')}
                          className="text-[#24A1DE] hover:underline text-[11px] font-semibold"
                        >
                          View all orders →
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="text-[11px] text-emerald-700 font-medium">Successful</div>
                          <div className="text-lg font-bold text-emerald-950">{stats.successfulPaymentsCount}</div>
                        </div>
                        <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                          <div className="text-[11px] text-rose-700 font-medium">Failed</div>
                          <div className="text-lg font-bold text-rose-950">{stats.failedPaymentsCount}</div>
                        </div>
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="text-[11px] text-amber-700 font-medium">Refunded</div>
                          <div className="text-lg font-bold text-amber-950">{stats.refundedPaymentsCount}</div>
                        </div>
                      </div>
                      <div className="text-slate-500 text-[11px] flex justify-between pt-1">
                        <span>Total Refunded Amount:</span>
                        <span className="font-semibold text-slate-800">₹{stats.totalRefundedAmountINR.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Storage Usage Summary */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                          <HardDrive className="w-4 h-4 text-sky-600" />
                          <span>Cluster Storage Allocation</span>
                        </div>
                        <span className="text-slate-500 text-[11px] font-mono">
                          {stats.storageUsage.totalFilesCount} customer files
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-slate-700 font-medium">
                          <span>Storage Utilized:</span>
                          <span className="font-bold text-slate-900">
                            {stats.storageUsage.totalUsedMB} MB / {stats.storageUsage.totalAllocatedGB} GB allocated
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#24A1DE] h-2 rounded-full transition-all"
                            style={{ width: `${Math.max(2, stats.storageUsage.percentageUsed)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>{stats.storageUsage.percentageUsed}% quota utilized</span>
                          <span className="text-emerald-600 font-semibold">NVMe Gen4 IOPS Optimal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Region Node Availability */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#24A1DE]" />
                        <span>VPS Cluster Node Health</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Automatic load balancing across edge nodes
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {stats.vpsNodes.map((node) => (
                        <div key={node.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                node.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                              }`}
                            />
                            <div>
                              <div className="font-bold text-slate-900">{node.region}</div>
                              <div className="text-slate-500 text-[11px] font-mono">
                                Node: {node.id} {node.ip ? `(${node.ip})` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="font-semibold text-slate-700">{node.botsCount} bots running</div>
                              <div className="text-[11px] text-slate-400">Node Load: {node.loadPercent}%</div>
                            </div>
                            <span
                              className={`px-2.5 py-1 font-bold rounded-lg uppercase text-[10px] ${
                                node.status === 'online'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {node.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: USER MANAGEMENT */}
              {/* ======================================================== */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name, email, username..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                      />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Showing {filteredUsers.length} of {users.length} registered users
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">User Profile</th>
                          <th className="p-3.5">Telegram</th>
                          <th className="p-3.5">Subscription Plan</th>
                          <th className="p-3.5">Bots (Active/Total)</th>
                          <th className="p-3.5">Account Status</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No users found matching "{userSearch}"
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {u.id === currentAdmin?.id ? (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                                      You
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-slate-400 text-[11px]">{u.email}</div>
                              </td>
                              <td className="p-3.5 font-mono text-slate-600">{u.telegramUsername || '—'}</td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded font-medium border border-sky-200">
                                  {u.subscription?.planName || u.planName || 'Free Trial'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-emerald-700">{u.runningBots}</span>
                                <span className="text-slate-400"> / {u.totalBots}</span>
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] inline-flex items-center gap-1 ${
                                    u.status === 'suspended'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {u.status === 'suspended' ? (
                                    <>
                                      <UserX className="w-3 h-3" /> Suspended
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> Active
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                    u.role === 'admin'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleViewUserDetail(u.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                  title="View Account Details"
                                >
                                  View
                                </button>
                                {u.status === 'suspended' ? (
                                  <button
                                    onClick={() => handleRestoreUser(u)}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                                    title="Restore Suspended Account"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setUserToSuspend(u)}
                                    disabled={u.role === 'admin'}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={u.role === 'admin' ? 'Cannot suspend admin' : 'Suspend Account'}
                                  >
                                    Suspend
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRoleToggle(u.id, u.role)}
                                  disabled={u.id === currentAdmin?.id}
                                  className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: BOTS MANAGEMENT */}
              {/* ======================================================== */}
              {activeTab === 'bots' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search bots or owner..."
                          value={botSearch}
                          onChange={(e) => setBotSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                        />
                      </div>
                      <select
                        value={botStatusFilter}
                        onChange={(e) => setBotStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="running">Running</option>
                        <option value="stopped">Stopped</option>
                        <option value="error">Error</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Showing {filteredBots.length} of {bots.length} cluster bots
                    </div>
                  </div>

                  {/* Bots Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Bot Identifier</th>
                          <th className="p-3.5">Owner Account</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Resource Usage</th>
                          <th className="p-3.5">Uptime / Restarts</th>
                          <th className="p-3.5 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBots.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              No bots match your current search/filter.
                            </td>
                          </tr>
                        ) : (
                          filteredBots.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-900">{b.name}</div>
                                <div className="text-slate-400 text-[11px] font-mono">@{b.username}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                  Framework: {b.framework}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-800">{b.owner.name}</div>
                                <div className="text-slate-400 text-[11px]">{b.owner.email}</div>
                                {b.owner.status === 'suspended' ? (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold uppercase">
                                    Owner Suspended
                                  </span>
                                ) : null}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] inline-flex items-center gap-1 ${
                                    b.status === 'running'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : b.status === 'error'
                                      ? 'bg-rose-100 text-rose-800'
                                      : b.status === 'paused'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {b.status}
                                </span>
                                {b.last_error_friendly ? (
                                  <div className="text-[10px] text-rose-600 mt-1 line-clamp-1" title={b.last_error_friendly}>
                                    {b.last_error_friendly}
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-3.5">
                                <div className="text-slate-700 font-medium">CPU: {b.cpu_usage || 0}%</div>
                                <div className="text-slate-500 text-[11px]">RAM: {b.memory_usage_mb || 0} MB</div>
                                <div className="text-slate-400 text-[10px]">Disk: {b.storage_usage_mb || 0} MB</div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-medium text-slate-800">
                                  {b.status === 'running' ? `${Math.floor((b.uptime_seconds || 0) / 3600)}h ${Math.floor(((b.uptime_seconds || 0) % 3600) / 60)}m` : '0m'}
                                </div>
                                <div className="text-slate-400 text-[11px]">Restarts: {b.restart_count || 0}</div>
                              </td>
                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleViewBotLogs(b)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> Logs
                                </button>
                                {b.status === 'running' ? (
                                  <button
                                    onClick={() => handleAdminStopBot(b)}
                                    disabled={actionInProgressBotId === b.id}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Square className="w-3 h-3" /> Stop
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => handleAdminRestartBot(b)}
                                  disabled={actionInProgressBotId === b.id || b.owner.status === 'suspended'}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                                  title={b.owner.status === 'suspended' ? 'Cannot start bot of suspended owner' : 'Restart bot container'}
                                >
                                  <RotateCcw className="w-3 h-3" /> Restart
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: PRICING CONFIGURATION */}
              {/* ======================================================== */}
              {activeTab === 'pricing' && editingPricing && (
                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-sky-50 border border-sky-200 p-4 rounded-xl gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-sm">Authoritative Dynamic Pricing Engine</div>
                      <div className="text-slate-600 text-[11px]">
                        Live updates take effect immediately for customer checkouts and subscription quote calculations.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetPricing}
                        disabled={savingPricing}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reset Defaults
                      </button>
                      <button
                        onClick={handleSavePricing}
                        disabled={savingPricing}
                        className="px-4 py-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingPricing ? 'Publishing...' : 'Save & Publish Rates'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Core Base Rates */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <label className="font-bold text-slate-700 block">Base Rate Per Active Bot (INR / mo)</label>
                      <input
                        type="number"
                        value={editingPricing.basePricePerBotMonthlyINR}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            basePricePerBotMonthlyINR: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono text-sm focus:bg-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block">Standard baseline: ₹49/mo</span>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <label className="font-bold text-slate-700 block">INR to USD Conversion Rate</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingPricing.inrToUsdRate}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            inrToUsdRate: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono text-sm focus:bg-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block">Used for international USD conversions</span>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <label className="font-bold text-slate-700 block">Platform Tax Rate / GST (%)</label>
                      <input
                        type="number"
                        value={editingPricing.taxRatePercent}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            taxRatePercent: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono text-sm focus:bg-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block">Government GST (Standard: 18%)</span>
                    </div>
                  </div>

                  {/* Bot Pricing Tiers (Presets) */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">Bot Preset Pricing Tiers</div>
                      <span className="text-[11px] text-slate-500">Enable/disable or adjust monthly pricing for preset bot tiers</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {editingPricing.botPricingTiers?.map((tier, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                            tier.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{tier.label}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={tier.enabled !== false}
                                onChange={(e) => {
                                  const newTiers = [...editingPricing.botPricingTiers];
                                  newTiers[idx].enabled = e.target.checked;
                                  setEditingPricing({ ...editingPricing, botPricingTiers: newTiers });
                                }}
                                className="rounded text-[#24A1DE]"
                              />
                              <span>Enabled</span>
                            </label>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block">Monthly Price (INR)</label>
                            <input
                              type="number"
                              value={tier.monthlyPriceINR}
                              onChange={(e) => {
                                const newTiers = [...editingPricing.botPricingTiers];
                                newTiers[idx].monthlyPriceINR = Number(e.target.value);
                                setEditingPricing({ ...editingPricing, botPricingTiers: newTiers });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white rounded border border-slate-300 font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Storage Pricing Tiers */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">Database & Disk Storage Add-on Tiers</div>
                      <span className="text-[11px] text-slate-500">Pricing for customer disk quotas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {editingPricing.storageTiersINR.map((tier, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                            tier.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{tier.label}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={tier.enabled !== false}
                                onChange={(e) => {
                                  const newTiers = [...editingPricing.storageTiersINR];
                                  newTiers[idx].enabled = e.target.checked;
                                  setEditingPricing({ ...editingPricing, storageTiersINR: newTiers });
                                }}
                                className="rounded text-[#24A1DE]"
                              />
                              <span>Enabled</span>
                            </label>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block">Monthly Cost (INR)</label>
                            <input
                              type="number"
                              value={tier.monthlyCostINR}
                              onChange={(e) => {
                                const newTiers = [...editingPricing.storageTiersINR];
                                newTiers[idx].monthlyCostINR = Number(e.target.value);
                                setEditingPricing({ ...editingPricing, storageTiersINR: newTiers });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white rounded border border-slate-300 font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duration Pricing & Discounts */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">Duration Discounts (%)</div>
                      <span className="text-[11px] text-slate-500">Incentivize multi-month customer commitments</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {editingPricing.durationDiscounts.map((d, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                            d.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{d.label}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={d.enabled !== false}
                                onChange={(e) => {
                                  const newD = [...editingPricing.durationDiscounts];
                                  newD[idx].enabled = e.target.checked;
                                  setEditingPricing({ ...editingPricing, durationDiscounts: newD });
                                }}
                                className="rounded text-[#24A1DE]"
                              />
                              <span>Active</span>
                            </label>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block">Discount %</label>
                            <input
                              type="number"
                              value={d.discountPercent}
                              onChange={(e) => {
                                const newD = [...editingPricing.durationDiscounts];
                                newD[idx].discountPercent = Number(e.target.value);
                                setEditingPricing({ ...editingPricing, durationDiscounts: newD });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white rounded border border-slate-300 font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Size Limits Pricing */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">File Size Upload Limit Options</div>
                      <span className="text-[11px] text-slate-500">Configure tier pricing for script upload sizes</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {editingPricing.fileSizeTierCostsINR.map((f, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                            f.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{f.label}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={f.enabled !== false}
                                onChange={(e) => {
                                  const newF = [...editingPricing.fileSizeTierCostsINR];
                                  newF[idx].enabled = e.target.checked;
                                  setEditingPricing({ ...editingPricing, fileSizeTierCostsINR: newF });
                                }}
                                className="rounded text-[#24A1DE]"
                              />
                              <span>Active</span>
                            </label>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block">Monthly Cost (INR)</label>
                            <input
                              type="number"
                              value={f.monthlyCostINR}
                              onChange={(e) => {
                                const newF = [...editingPricing.fileSizeTierCostsINR];
                                newF[idx].monthlyCostINR = Number(e.target.value);
                                setEditingPricing({ ...editingPricing, fileSizeTierCostsINR: newF });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white rounded border border-slate-300 font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 5: PAYMENTS & REFUNDS */}
              {/* ======================================================== */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search order ID, email, tx ID..."
                          value={paymentSearch}
                          onChange={(e) => setPaymentSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                        />
                      </div>
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="success">Successful</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Showing {filteredOrders.length} of {orders.length} transaction records
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Order ID & Date</th>
                          <th className="p-3.5">Customer</th>
                          <th className="p-3.5">Plan / Details</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Payment Method / IDs</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No payment records found matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((o) => (
                            <tr key={o.order_id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5">
                                <div className="font-mono font-bold text-slate-900">{o.order_id}</div>
                                <div className="text-slate-400 text-[11px]">
                                  {new Date(o.created_at).toLocaleString()}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-800">{o.customer_name}</div>
                                <div className="text-slate-400 text-[11px]">{o.customer_email}</div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-medium text-slate-800">{o.plan_name}</div>
                                <div className="text-slate-400 text-[11px] capitalize">{o.billing_interval}</div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">
                                  {o.currency === 'USD' ? `$${o.total_amount}` : `₹${o.total_amount}`}
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  Subtotal: {o.currency === 'USD' ? `$${o.amount}` : `₹${o.amount}`} + Tax
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="text-slate-700 font-medium capitalize">
                                  {o.payment_method?.replace(/_/g, ' ') || 'Cashfree Gateway'}
                                </div>
                                {o.payment_id ? (
                                  <div className="font-mono text-[10px] text-slate-400" title={o.payment_id}>
                                    Tx: {o.payment_id.slice(0, 16)}...
                                  </div>
                                ) : null}
                                {o.refund_transaction_id ? (
                                  <div className="font-mono text-[10px] text-amber-700 font-semibold">
                                    Refund Tx: {o.refund_transaction_id}
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                    o.status === 'success'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : o.status === 'failed'
                                      ? 'bg-rose-100 text-rose-800'
                                      : o.status === 'refunded'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {o.status}
                                </span>
                                {o.failure_reason ? (
                                  <div className="text-[10px] text-rose-600 mt-1 max-w-xs">{o.failure_reason}</div>
                                ) : null}
                                {o.refund_reason ? (
                                  <div className="text-[10px] text-amber-700 mt-1 max-w-xs">{o.refund_reason}</div>
                                ) : null}
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {o.status === 'success' ? (
                                  <button
                                    onClick={() => setOrderToRefund(o)}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Issue Refund
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 6: SYSTEM HEALTH & HARDWARE TELEMETRY */}
              {/* ======================================================== */}
              {activeTab === 'system' && systemHealth && (
                <div className="space-y-6">
                  {/* Host Machine Specifications */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <Server className="w-5 h-5 text-[#24A1DE]" />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{systemHealth.vpsHost.hostname}</div>
                          <div className="text-[11px] text-slate-500">{systemHealth.vpsHost.datacenter}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase text-[10px]">
                          Host Online
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-slate-500 font-medium">Operating System</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{systemHealth.vpsHost.os}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-slate-500 font-medium">Uptime & Kernel</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{systemHealth.vpsHost.uptime}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{systemHealth.vpsHost.kernel}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-slate-500 font-medium">Sandboxing Engine</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{systemHealth.vpsHost.cgroupsVersion}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-slate-500 font-medium">IPv4 Network Ingress</div>
                        <div className="font-mono font-semibold text-slate-900 mt-0.5">{systemHealth.vpsHost.ipAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Resource Gauges (CPU, RAM, Disk, Containers) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CPU */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-blue-600" /> CPU Usage
                        </span>
                        <span className="text-xs font-bold text-blue-700">{systemHealth.cpu.usagePercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${systemHealth.cpu.usagePercent}%` }}
                        />
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div className="line-clamp-1" title={systemHealth.cpu.model}>
                          {systemHealth.cpu.model}
                        </div>
                        <div>Cores: {systemHealth.cpu.totalCores} Total ({systemHealth.cpu.allocatedCores} allocated)</div>
                        <div>Load Averages: {systemHealth.cpu.loadAverages.join(', ')}</div>
                      </div>
                    </div>

                    {/* RAM */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-emerald-600" /> RAM Memory
                        </span>
                        <span className="text-xs font-bold text-emerald-700">{systemHealth.memory.usagePercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${systemHealth.memory.usagePercent}%` }}
                        />
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div>
                          Used: {systemHealth.memory.usedMB} MB / {systemHealth.memory.totalMB} MB
                        </div>
                        <div>Free: {systemHealth.memory.freeMB} MB</div>
                        <div>Buffers / Cached: {systemHealth.memory.buffersCachedMB} MB</div>
                      </div>
                    </div>

                    {/* NVMe Disk */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <HardDrive className="w-4 h-4 text-indigo-600" /> NVMe SSD
                        </span>
                        <span className="text-xs font-bold text-indigo-700">{systemHealth.disk.usagePercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${systemHealth.disk.usagePercent}%` }}
                        />
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div>
                          Used: {systemHealth.disk.usedGB} GB / {systemHealth.disk.totalGB} GB
                        </div>
                        <div>Read: {systemHealth.disk.readIOPS}</div>
                        <div className="text-emerald-600 font-semibold">{systemHealth.disk.healthStatus}</div>
                      </div>
                    </div>

                    {/* Containers & Worker */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-600" /> Sandboxes
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                          Worker Online
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                        <div className="flex justify-between">
                          <span>Running Containers:</span>
                          <span className="font-bold text-slate-900">{systemHealth.containers.totalRunning}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Worker IPC Latency:</span>
                          <span className="font-mono text-emerald-600 font-bold">{systemHealth.worker.latencyMs} ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tasks Processed:</span>
                          <span className="font-mono text-slate-900">{systemHealth.worker.tasksProcessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kernel OOM Kills:</span>
                          <span className="text-emerald-600 font-semibold">0 (Zero crashes)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 7: AUDIT TRAIL */}
              {/* ======================================================== */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Security & Administrative Audit Trail</div>
                      <div className="text-slate-500 text-[11px]">
                        Immutable server-side record of administrative actions, account suspensions, and refunds.
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{auditLogs.length} logged events</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Timestamp</th>
                          <th className="p-3.5">Action Code</th>
                          <th className="p-3.5">Actor / Administrator</th>
                          <th className="p-3.5">Target</th>
                          <th className="p-3.5">Action Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              No security audit events recorded.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/70">
                              <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                    log.action.includes('suspend')
                                      ? 'bg-rose-100 text-rose-800'
                                      : log.action.includes('refund')
                                      ? 'bg-amber-100 text-amber-800'
                                      : log.action.includes('restore') || log.action.includes('success')
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-800">{log.actor.name}</div>
                                <div className="text-slate-400 text-[10px]">{log.actor.email}</div>
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono text-slate-600 uppercase text-[10px]">
                                  {log.target_type || 'System'}
                                </span>
                                {log.targetUser ? (
                                  <div className="text-[11px] text-slate-700 font-medium">{log.targetUser.name}</div>
                                ) : log.target_id ? (
                                  <div className="text-[10px] font-mono text-slate-400">{log.target_id}</div>
                                ) : null}
                              </td>
                              <td className="p-3.5 font-mono text-[11px] text-slate-600 max-w-md">
                                {log.details ? (
                                  <pre className="whitespace-pre-wrap text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL 1: USER ACCOUNT DETAIL */}
        {/* ======================================================== */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">{selectedUserDetail.user.name}</h4>
                    <p className="text-xs text-slate-400">User ID: {selectedUserDetail.user.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 text-xs">
                {/* Account info cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">Account Status</div>
                    <div
                      className={`font-bold mt-1 ${
                        selectedUserDetail.user.status === 'suspended' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {selectedUserDetail.user.status?.toUpperCase() || 'ACTIVE'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">Subscription</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {selectedUserDetail.subscription?.plan_name || 'Free Trial'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">Total Bots</div>
                    <div className="font-bold text-slate-900 mt-1">{selectedUserDetail.bots.length} registered</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 font-medium">Orders Count</div>
                    <div className="font-bold text-slate-900 mt-1">{selectedUserDetail.orders.length} orders</div>
                  </div>
                </div>

                {/* Suspension Details if any */}
                {selectedUserDetail.user.status === 'suspended' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Account Currently Suspended
                    </div>
                    <div>Reason: {selectedUserDetail.user.suspendedReason || 'Administrative suspension'}</div>
                    <div className="text-[10px] text-rose-700">
                      Suspended at: {new Date(selectedUserDetail.user.suspendedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Bots list */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-sm">User Bots ({selectedUserDetail.bots.length})</div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedUserDetail.bots.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">No bots created by this user.</div>
                    ) : (
                      selectedUserDetail.bots.map((b: any) => (
                        <div key={b.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-800">{b.name}</span>
                            <span className="text-slate-400 font-mono ml-2">@{b.username}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                              b.status === 'running'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Orders History */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-sm">
                    Orders & Billing ({selectedUserDetail.orders.length})
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedUserDetail.orders.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">No payment history found.</div>
                    ) : (
                      selectedUserDetail.orders.map((o: any) => (
                        <div key={o.order_id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="font-mono font-semibold text-slate-800">{o.order_id}</div>
                            <div className="text-slate-400 text-[10px]">
                              {o.plan_name} • {new Date(o.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">₹{o.total_amount}</div>
                            <span
                              className={`px-1.5 py-0.2 rounded uppercase text-[9px] font-bold ${
                                o.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'refunded'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: SUSPEND USER DIALOG */}
        {/* ======================================================== */}
        {userToSuspend && (
          <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-100 rounded-full">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">Suspend User Account</h4>
                  <p className="text-xs text-slate-500">
                    {userToSuspend.name} ({userToSuspend.email})
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-1">
                <div className="font-bold">Important Impact:</div>
                <div>
                  Suspending this user will immediately terminate all active bot containers owned by them and prevent
                  further logins.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Reason for Suspension</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Violation of bot hosting terms of service / abusive spam traffic"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setUserToSuspend(null);
                    setSuspendReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSuspend}
                  disabled={suspending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {suspending ? 'Suspending...' : 'Confirm Account Suspension'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: ISSUE REFUND DIALOG */}
        {/* ======================================================== */}
        {orderToRefund && (
          <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-3 bg-amber-100 rounded-full">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">Issue Payment Refund</h4>
                  <p className="text-xs text-slate-500">Order #{orderToRefund.order_id}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{orderToRefund.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Refund Amount:</span>
                  <span className="font-bold text-emerald-700">
                    {orderToRefund.currency === 'USD' ? `$${orderToRefund.total_amount}` : `₹${orderToRefund.total_amount}`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Refund Justification / Reason</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g., Customer requested cancellation within 24h SLA / accidental duplicate payment"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setOrderToRefund(null);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRefund}
                  disabled={refunding}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {refunding ? 'Processing Refund...' : 'Approve & Issue Refund'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 4: BOT LOGS VIEWER */}
        {/* ======================================================== */}
        {selectedBotLogs && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-slate-950 w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#24A1DE]/20 text-[#24A1DE] rounded-lg">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Live Container Logs: {selectedBotLogs.bot.name} (@{selectedBotLogs.bot.username})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Owner: {selectedBotLogs.bot.owner.name} ({selectedBotLogs.bot.owner.email})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBotLogs(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-slate-900/60">
                {selectedBotLogs.logs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500">No logs found for this bot container.</div>
                ) : (
                  selectedBotLogs.logs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className={`p-1.5 rounded flex items-start gap-2.5 ${
                        log.level === 'error'
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                          : log.level === 'warn'
                          ? 'bg-amber-950/30 text-amber-300'
                          : 'text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-slate-500 shrink-0 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1 rounded shrink-0 ${
                          log.level === 'error'
                            ? 'bg-rose-900 text-white'
                            : log.level === 'warn'
                            ? 'bg-amber-900 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
                <span>Showing last {selectedBotLogs.logs.length} entries</span>
                <button
                  onClick={() => setSelectedBotLogs(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
                >
                  Close Logs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
