import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  DynamicPlanConfig,
  PricingCalculationResult,
  UpgradeQuoteResult,
  DBPricingConfig,
} from '../../types';
import {
  ArrowRight,
  Sparkles,
  RefreshCw,
  Tag,
  Check,
  ChevronDown,
  Info,
  ShieldCheck,
  Bot,
  HardDrive,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface CustomPlanConfiguratorProps {
  navigate: (path: string) => void;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export interface StoragePlanTier {
  id: string;
  name: string;
  storageMB: number;
  priceINR: number;
  priceUSD: number;
  badge?: string;
  description: string;
}

export const STORAGE_PLANS: StoragePlanTier[] = [
  {
    id: 'starter_200mb',
    name: '200 MB',
    storageMB: 200,
    priceINR: 49,
    priceUSD: 0.59,
    badge: 'Starter',
    description: 'Perfect for basic utility scripts & small Telegram bots',
  },
  {
    id: 'plan_500mb',
    name: '500 MB',
    storageMB: 500,
    priceINR: 79,
    priceUSD: 0.95,
    description: 'Great for bots with SQLite databases & logging',
  },
  {
    id: 'plan_1gb',
    name: '1 GB',
    storageMB: 1024,
    priceINR: 119,
    priceUSD: 1.45,
    badge: 'Popular',
    description: 'Ideal for media caching, JSON stores, and high activity',
  },
  {
    id: 'plan_2gb',
    name: '2 GB',
    storageMB: 2048,
    priceINR: 199,
    priceUSD: 2.39,
    description: 'For heavy media, audio bots, and multiple SQLite DBs',
  },
  {
    id: 'plan_5gb',
    name: '5 GB',
    storageMB: 5120,
    priceINR: 399,
    priceUSD: 4.79,
    badge: 'Pro',
    description: 'Maximum storage capacity for large scale bot applications',
  },
];

export const CustomPlanConfigurator: React.FC<CustomPlanConfiguratorProps> = ({
  navigate,
  title = 'Select Storage Plan & Upgrade',
  subtitle = 'Choose the right storage capacity for your Telegram bot. Storage add-ons and plan extensions apply automatically.',
  showHeader = true,
}) => {
  const { user, currency, addToast } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter_200mb');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');

  const [pricingConfig, setPricingConfig] = useState<DBPricingConfig | null>(null);
  const [calculation, setCalculation] = useState<PricingCalculationResult | null>(null);
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuoteResult | null>(null);
  const [isUpgradeMode, setIsUpgradeMode] = useState<boolean>(false);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(true);

  const activePlan = STORAGE_PLANS.find((p) => p.id === selectedPlanId) || STORAGE_PLANS[0];

  useEffect(() => {
    let mounted = true;
    api
      .getPricingConfig()
      .then((cfg) => {
        if (mounted) setPricingConfig(cfg);
      })
      .catch((err) => {
        console.error('Failed to load pricing config:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchAuthoritativeQuote = useCallback(async () => {
    setLoadingQuote(true);
    try {
      const targetConfig: DynamicPlanConfig = {
        activeBotCount: 1,
        totalBotSlots: 3,
        maxPythonFileSizeMB: 200,
        dbStorageMB: activePlan.storageMB,
        durationDays,
      };

      const priceResult = await api.calculateDynamicPlanPrice({
        activeBotCount: 1,
        maxPythonFileSizeMB: 200,
        dbStorageMB: activePlan.storageMB,
        durationDays,
        couponCode: appliedCoupon || undefined,
      });
      setCalculation(priceResult);

      if (user && user.subscription && user.subscription.status === 'active') {
        try {
          const upQuote = await api.getUpgradeQuote(targetConfig);
          setUpgradeQuote(upQuote);
          if (upQuote.currentSubscription && upQuote.currentSubscription.daysRemaining > 0) {
            setIsUpgradeMode(true);
          }
        } catch {
          setUpgradeQuote(null);
          setIsUpgradeMode(false);
        }
      } else {
        setUpgradeQuote(null);
        setIsUpgradeMode(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing quote:', err);
    } finally {
      setLoadingQuote(false);
    }
  }, [activePlan.storageMB, durationDays, appliedCoupon, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuthoritativeQuote();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchAuthoritativeQuote]);

  const handleApplyCoupon = () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (trimmed === 'TELEHOST20' || trimmed === 'FIRSTBOT') {
      setAppliedCoupon(trimmed);
      addToast('success', `Coupon ${trimmed} applied!`);
    } else if (trimmed === '') {
      setAppliedCoupon('');
    } else {
      addToast('error', 'Invalid coupon code. Try TELEHOST20 for 20% off.');
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon('');
  };

  const handleProceedToCheckout = () => {
    const configPayload: DynamicPlanConfig = {
      activeBotCount: 1,
      totalBotSlots: 3,
      maxPythonFileSizeMB: 200,
      dbStorageMB: activePlan.storageMB,
      durationDays,
    };

    const encoded = encodeURIComponent(JSON.stringify(configPayload));
    const url = `/checkout?dynamic=true&config=${encoded}&coupon=${encodeURIComponent(
      appliedCoupon
    )}&isUpgrade=${isUpgradeMode ? 'true' : 'false'}`;
    navigate(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {showHeader && (
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0088cc] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bot Storage Plans</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>
      )}

      {isUpgradeMode && upgradeQuote && upgradeQuote.currentSubscription && (
        <div className="bg-slate-900 text-white rounded-xl p-3 sm:p-4 border border-slate-800 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-[#24A1DE] shrink-0" />
            <span>
              <strong>Subscription Upgrade Active:</strong> Remaining credit of{' '}
              <strong className="text-emerald-400">
                ₹{upgradeQuote.unusedCreditINR}
              </strong>{' '}
              ({upgradeQuote.currentSubscription.daysRemaining} days left) will be automatically deducted.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols): Storage Plan Cards */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#0088cc]" />
            <span>Choose Storage Capacity</span>
          </h3>

          <div className="space-y-3">
            {STORAGE_PLANS.map((tier) => {
              const isSelected = selectedPlanId === tier.id;
              const displayPrice = `₹${tier.priceINR}`;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedPlanId(tier.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[#24A1DE] bg-sky-50/60 ring-2 ring-[#0088cc]/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#24A1DE] bg-[#24A1DE]' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">{tier.name} Storage</span>
                          {tier.badge && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              tier.badge === 'Popular'
                                ? 'bg-sky-100 text-[#0088cc] border border-sky-200'
                                : tier.badge === 'Starter'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}>
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg sm:text-xl font-black text-[#0088cc]">{displayPrice}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Flat Plan Rate</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Order Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-lg space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#24A1DE]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">PLAN SUMMARY</h3>
              </div>
              {loadingQuote && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-300">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Selected Storage:</span>
                <span className="font-extrabold text-white">{activePlan.name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Bot Execution:</span>
                <span className="font-bold text-emerald-400">24/7 Dedicated Server</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Crash Recovery:</span>
                <span className="font-bold text-white">Auto Watchdog Enabled</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Bandwidth:</span>
                <span className="font-bold text-emerald-400">Unlimited</span>
              </div>
            </div>

            {/* Price Adjustments & Coupon */}
            <div className="space-y-1.5 text-xs pt-1">
              {calculation && (
                <>
                  {isUpgradeMode && upgradeQuote && upgradeQuote.creditAppliedINR > 0 && (
                    <div className="flex justify-between text-emerald-300 font-bold bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/50">
                      <span>Prorated Upgrade Credit:</span>
                      <span>-₹{upgradeQuote.creditAppliedINR}</span>
                    </div>
                  )}
                  {calculation.couponDiscountINR > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Coupon Discount ({appliedCoupon}):</span>
                      <span>-₹{calculation.couponDiscountINR}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. TELEHOST20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#24A1DE]"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-1.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 font-medium">TOTAL PAYABLE</span>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-white">
                  ₹{isUpgradeMode && upgradeQuote
                    ? upgradeQuote.totalPayableINR
                    : activePlan.priceINR}
                </span>
                <span className="text-[10px] text-slate-400 block">All inclusive price</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={loadingQuote}
              id="btn-proceed-checkout"
              className="w-full py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isUpgradeMode ? 'Upgrade & Pay' : 'Continue to Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Storage Allocation • 24/7 Watchdog Recovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
