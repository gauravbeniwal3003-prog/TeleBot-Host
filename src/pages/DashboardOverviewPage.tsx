import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TelegramBot, BotFramework } from '../types';
import { api } from '../services/api';
import {
  Bot,
  PlusCircle,
  HardDrive,
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronRight,
  Code,
  AlertCircle,
  Play,
  Square,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UploadCloud
} from 'lucide-react';

interface DashboardOverviewPageProps {
  navigate: (path: string) => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({ navigate }) => {
  const { user, bots, refreshBots, refreshUserData, activeProjectId, addToast } = useAuth();
  const [actionLoadingBotId, setActionLoadingBotId] = useState<string | null>(null);
  
  // Deploy Wizard page state (replaces modal with full screen state)
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const [deployStep, setDeployStep] = useState<1 | 2 | 3>(1);
  const [selectedStorage, setSelectedStorage] = useState<string>('200MB');
  
  // Bot details form
  const [botName, setBotName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botFramework, setBotFramework] = useState<BotFramework>('telebot');
  const [deployingLoader, setDeployingLoader] = useState(false);

  const handleQuickToggleBot = async (e: React.MouseEvent, bot: TelegramBot) => {
    e.stopPropagation();
    const isRunning = bot.status === 'running';
    const action = isRunning ? 'stop' : 'start';
    setActionLoadingBotId(bot.id);
    try {
      await api.updateBotStatus(bot.id, action);
      addToast('success', isRunning ? `Bot "${bot.name}" stopped.` : `Bot "${bot.name}" started successfully!`);
      await refreshBots();
    } catch (err: any) {
      addToast('error', err.message || `Failed to ${action} bot`);
    } finally {
      setActionLoadingBotId(null);
    }
  };

  const getStorageCost = (size: string) => {
    switch (size) {
      case '200MB': return 49;
      case '500MB': return 79;
      case '1GB': return 119;
      case '2GB': return 199;
      case '5GB': return 399;
      default: return 49;
    }
  };

  const handleFinishPayment = () => {
    setDeployStep(3);
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botName.trim()) {
      addToast('error', 'Please enter a name for your bot');
      return;
    }

    setDeployingLoader(true);
    try {
      const mockUsername = `${botName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_bot`;
      const newBot = await api.createBot({
        name: botName.trim(),
        username: mockUsername,
        framework: botFramework,
        token: botToken.trim(),
        entryPoint: 'main.py',
        projectId: activeProjectId || undefined,
      });

      addToast('success', `Bot "${botName}" deployed successfully!`);
      await refreshBots();
      await refreshUserData();

      // Reset wizard
      setShowDeployWizard(false);
      setDeployStep(1);
      setBotName('');
      setBotToken('');
      setBotFramework('telebot');

      // Instantly open the newly created bot's workspace page
      navigate('/dashboard/bot?id=' + newBot.id + '&tab=manage');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to deploy bot');
    } finally {
      setDeployingLoader(false);
    }
  };

  // STEP-BASED FULL PAGE VIEW FOR BOT DEPLOYMENT
  if (showDeployWizard) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Full Page Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (deployStep > 1) {
                  setDeployStep((prev) => (prev - 1) as 1 | 2 | 3);
                } else {
                  setShowDeployWizard(false);
                }
              }}
              className="p-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900">Deploy New Telegram Bot</h2>
              <p className="text-xs text-slate-500">Fast, reliable, sandboxed 24/7 container execution</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  deployStep === step
                    ? 'bg-[#24A1DE] text-white shadow-xs'
                    : deployStep > step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {deployStep > step ? '✓' : step}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Select Storage Plan */}
        {deployStep === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Select Container Storage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose the storage limit required for your Python bot files, external modules, dynamic cache, and database (e.g. SQLite database). Every plan includes 24/7 high-speed processing with automatic recovery.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {[
                { size: '200MB', price: '₹49/mo', tag: 'Standard Included', desc: 'Perfect for standard Telegram auto-responders & utility scripts.' },
                { size: '500MB', price: '₹79/mo', tag: 'Developer Option', desc: 'Excellent if you need to store logs or smaller user databases.' },
                { size: '1GB', price: '₹119/mo', tag: 'Recommended', desc: 'Includes bot charge. Recommended for media forwarding, extensive asset caching & rich databases.' },
                { size: '2GB', price: '₹199/mo', tag: 'Advanced Power', desc: 'Allows larger python environments, audio processing packages & databases.' },
                { size: '5GB', price: '₹399/mo', tag: 'Enterprise Scale', desc: 'For enterprise level data ingestion, custom machine learning models & assets.' },
              ].map((plan) => (
                <button
                  key={plan.size}
                  type="button"
                  onClick={() => setSelectedStorage(plan.size)}
                  className={`p-5 rounded-xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${
                    selectedStorage === plan.size
                      ? 'border-[#24A1DE] bg-sky-50/45 ring-2 ring-[#0088cc]/25 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 ${selectedStorage === plan.size ? 'bg-sky-100 text-[#0088cc]' : 'bg-slate-50 text-slate-400'}`}>
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>{plan.size} Sandbox Storage</span>
                        {selectedStorage === plan.size && (
                          <span className="text-[9px] bg-[#24A1DE] text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{plan.desc}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-base font-black text-[#0088cc]">{plan.price}</div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{plan.tag}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setDeployStep(2)}
                className="px-6 py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Secure Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Checkout & Simulated Secure Payment */}
        {deployStep === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-sky-50 text-[#0088cc] rounded-2xl flex items-center justify-center mx-auto border border-sky-100">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-base">Payment Activation</h3>
                <p className="text-xs text-slate-500">Your bot container environment will be set up and active immediately upon confirmation.</p>
              </div>
            </div>

            {/* Pricing Summary Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="p-4 bg-slate-50/50 flex justify-between text-xs font-medium text-slate-600">
                <span>Bot Hosting License Slot</span>
                <span className="font-bold text-slate-900">Included</span>
              </div>
              <div className="p-4 bg-slate-50/50 flex justify-between text-xs font-medium text-slate-600">
                <span>{selectedStorage} Sandboxed Space</span>
                <span className="font-bold text-slate-900">₹{getStorageCost(selectedStorage)}.00</span>
              </div>
              <div className="p-4 bg-[#24A1DE]/5 flex justify-between text-sm font-black text-slate-900">
                <span>Total Month-To-Month Charge</span>
                <span className="text-[#0088cc]">₹{getStorageCost(selectedStorage)}.00 / mo</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleFinishPayment}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Payment (₹{getStorageCost(selectedStorage)}) & Activate</span>
              </button>

              <button
                onClick={() => setDeployStep(1)}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Change Storage Plan
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Configure Bot Name & Credentials */}
        {deployStep === 3 && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Setup Your Active Sandbox</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Activation successful! Enter a display name to bind this container workspace to your Telegram application.
              </p>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">Bot Name / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Support Auto Bot"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/30 text-slate-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  Telegram Bot Token (Optional — Default is Empty)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty if token is inside your Python file (e.g. main.py)"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/30 text-slate-900"
                />
                <p className="text-[10px] text-slate-500">
                  Optional. Default is empty. Empty means the token is configured directly inside your Python file.
                </p>
              </div>

              <button
                type="submit"
                disabled={deployingLoader || !botName.trim()}
                className="w-full py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-4"
              >
                {deployingLoader ? (
                  <span>Initializing dedicated server container...</span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Deploy Bot & Start Uploads</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  const sub = user?.subscription;
  const isTrial = sub?.status === 'trial';
  const trialNotStarted = isTrial && !sub?.trialStarted;
  const isExpired = sub?.status === 'expired' || (isTrial && sub?.trialStarted && sub?.expiryDate && new Date(sub.expiryDate) < new Date());
  
  // Calculate trial hours left
  let trialHoursLeft = 0;
  if (isTrial && sub?.trialStarted && sub?.expiryDate) {
    const diff = new Date(sub.expiryDate).getTime() - new Date().getTime();
    trialHoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  }

  // Grace period calculations (24h grace after trial expiry)
  let graceHoursLeft = 0;
  let isPendingDeletion = false;
  if (isExpired && sub?.expiryDate) {
    const elapsedSinceExpiry = new Date().getTime() - new Date(sub.expiryDate).getTime();
    const graceTotalMs = 24 * 60 * 60 * 1000;
    if (elapsedSinceExpiry > graceTotalMs) {
      isPendingDeletion = true;
    } else {
      graceHoursLeft = Math.max(0, Math.floor((graceTotalMs - elapsedSinceExpiry) / (1000 * 60 * 60)));
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Trial Available (Not Started Yet) */}
      {trialNotStarted && (
        <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0088cc]" />
              1-Time 24-Hour Free Trial Available
            </h3>
            <p className="text-xs text-sky-800 mt-1">
              Your 24-hour free trial timer will begin automatically once you deploy and click <strong>"Start Bot"</strong> for the first time.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
          >
            View Paid Plans
          </button>
        </div>
      )}

      {/* 2. Trial Active (Running 24h timer) */}
      {isTrial && sub?.trialStarted && !isExpired && (
        <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0088cc]" />
              24-Hour Free Trial Active
            </h3>
            <p className="text-xs text-sky-800 mt-1">
              Your bot is running on our cloud VPS. You have <strong>{trialHoursLeft} hours remaining</strong> on your free trial.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* 3. Trial Expired (24-Hour Grace Period Active) */}
      {isExpired && !isPendingDeletion && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              24-Hour Free Trial Expired — Action Required
            </h3>
            <p className="text-xs text-amber-900 mt-1">
              Your free trial has ended and bot process halted. You have <strong>{graceHoursLeft} hours</strong> to purchase a plan before your bot files are permanently deleted from the VPS.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
          >
            Purchase Plan Now
          </button>
        </div>
      )}

      {/* 4. Grace Period Expired & Files Purged */}
      {isPendingDeletion && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Trial Grace Period Expired — Bot Files Deleted
            </h3>
            <p className="text-xs text-rose-800 mt-1">
              You did not purchase a plan within 24 hours of trial expiration. Your bot files have been removed from the VPS storage. Purchase a plan to host new bots.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            Purchase Plan
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Welcome back, {user?.name || 'Developer'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your 24/7 active Telegram bots below. Click on any bot to manage files or upgrade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDeployStep(1);
              setShowDeployWizard(true);
            }}
            className="inline-flex items-center gap-1.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Deploy New Bot</span>
          </button>
        </div>
      </div>

      {/* VPS Hardware & Auto-Control Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">VPS Node & Automated System Control</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Ubuntu 24.04.3 LTS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Node: <strong>Intel Xeon Platinum 8168 CPU @ 2.70GHz</strong> (2 vCPUs, 2GB RAM, 30GB NVMe)
              </p>
            </div>
          </div>

          <a
            href={`${(import.meta as any).env?.VITE_API_URL || window.location.origin}/setup-vps.sh`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Code className="w-4 h-4" />
            <span>Download setup-vps.sh</span>
          </a>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            1-Click Automated VPS Installer Command (Run on your Ubuntu 24.04 VPS)
          </label>
          <div className="flex items-center bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto justify-between gap-3">
            <code className="select-all break-all">
              curl -sSL {(import.meta as any).env?.VITE_API_URL || window.location.origin}/setup-vps.sh | bash
            </code>
            <button
              onClick={() => {
                const apiOrigin = (import.meta as any).env?.VITE_API_URL || window.location.origin;
                navigator.clipboard.writeText(`curl -sSL ${apiOrigin}/setup-vps.sh | bash`);
                addToast('success', '1-Click VPS installer command copied to clipboard!');
              }}
              className="px-3 py-1.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-sans text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              Copy Command
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-medium">Container Engine</span>
            <strong className="text-white font-bold">Linux VPS Sandbox</strong>
          </div>
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-medium">Process Isolation</span>
            <strong className="text-emerald-400 font-bold">telebot-runner (UID 10001)</strong>
          </div>
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-medium">Python Frameworks</span>
            <strong className="text-sky-400 font-bold">Pre-baked (aiogram, telethon...)</strong>
          </div>
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-medium">Cashfree Payment</span>
            <strong className="text-purple-400 font-bold">Auto Webhook Active</strong>
          </div>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Your Active Bots ({bots.length})</h3>

        {bots.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0088cc] flex items-center justify-center mx-auto shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">No Bots Active</h4>
              <p className="text-xs text-slate-500">
                Deploy your Telegram python files now on a 24/7 high-speed cloud container. Starts at only ₹49/month.
              </p>
            </div>
            <button
              onClick={() => {
                setDeployStep(1);
                setShowDeployWizard(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#24A1DE] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1e8cc3] transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deploy Your First Bot</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => {
              const isRunning = bot.status === 'running';
              const isLoading = actionLoadingBotId === bot.id;
              return (
                <div
                  key={bot.id}
                  onClick={() => navigate('/dashboard/bot?id=' + bot.id + '&tab=manage')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-[#24A1DE]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-sky-50 text-[#0088cc] rounded-xl group-hover:bg-[#24A1DE] group-hover:text-white transition-colors">
                          <Bot className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-950 group-hover:text-[#0088cc] transition-colors block text-sm">
                            {bot.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">@{bot.username}</span>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                        isRunning
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : bot.status === 'stopped'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          isRunning ? 'bg-emerald-500 animate-pulse' :
                          bot.status === 'stopped' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        <span>{isRunning ? 'Running' : bot.status === 'stopped' ? 'Stopped' : 'Error'}</span>
                      </span>
                    </div>

                    {/* Start / Stop Quick Toggle Button */}
                    <div className="pt-1">
                      {isRunning ? (
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggleBot(e, bot)}
                          disabled={isLoading}
                          className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                          <span>{isLoading ? 'Stopping...' : 'Stop Bot'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleQuickToggleBot(e, bot)}
                          disabled={isLoading}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isLoading ? 'Starting...' : 'Start Bot'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      {bot.storageUsageMB ? `${bot.storageUsageMB.toFixed(1)} MB Used` : 'Dedicated Storage'}
                    </span>
                    <span className="text-[#0088cc] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Workspace</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
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
