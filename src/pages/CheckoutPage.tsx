import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  DynamicPlanConfig,
  PricingCalculationResult,
  UpgradeQuoteResult,
  HostingPlan,
} from '../types';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  Building,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

interface CheckoutPageProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ navigate, searchParams }) => {
  const { user, currency } = useAuth();

  const isDynamic = searchParams.get('dynamic') === 'true';
  const isUpgradeParam = searchParams.get('isUpgrade') === 'true';
  const initialCoupon = searchParams.get('coupon') || '';
  const planIdParam = searchParams.get('plan') || 'pro';
  const billingParam = (searchParams.get('billing') as 'monthly' | 'yearly') || 'monthly';

  const [dynamicConfig, setDynamicConfig] = useState<DynamicPlanConfig | null>(null);
  const [calculation, setCalculation] = useState<PricingCalculationResult | null>(null);
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuoteResult | null>(null);
  const [isUpgrade, setIsUpgrade] = useState<boolean>(isUpgradeParam);

  const [planName, setPlanName] = useState('Pro Plan');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(billingParam);

  // Form state
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [selectedMethod, setSelectedMethod] = useState<'cashfree_upi' | 'cashfree_card' | 'cashfree_netbanking' | 'crypto'>('cashfree_upi');
  const [processing, setProcessing] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingPrice(true);

    if (isDynamic) {
      const configStr = searchParams.get('config');
      if (configStr) {
        try {
          const cfg: DynamicPlanConfig = JSON.parse(decodeURIComponent(configStr));
          if (active) {
            setDynamicConfig(cfg);
            setPlanName(`Custom VPS (${cfg.activeBotCount} Bots)`);
          }

          api
            .calculateDynamicPlanPrice({
              activeBotCount: cfg.activeBotCount,
              maxPythonFileSizeMB: cfg.maxPythonFileSizeMB,
              dbStorageMB: cfg.dbStorageMB,
              durationDays: cfg.durationDays,
              couponCode: appliedCoupon || undefined,
            })
            .then(async (calcRes) => {
              if (!active) return;
              setCalculation(calcRes);

              if (user && isUpgradeParam) {
                try {
                  const quote = await api.getUpgradeQuote(cfg);
                  if (active) {
                    setUpgradeQuote(quote);
                    setIsUpgrade(Boolean(quote.currentSubscription && quote.creditAppliedINR > 0));
                  }
                } catch {
                  // ignore
                }
              }
            })
            .finally(() => {
              if (active) setLoadingPrice(false);
            });
        } catch (e) {
          console.error('Failed to parse config:', e);
          if (active) setLoadingPrice(false);
        }
      }
    } else {
      api.getPlans().then((plans) => {
        if (!active) return;
        const foundPlan = plans.find((p) => p.id === planIdParam) || plans[0] || {
          id: 'starter',
          name: 'Starter Bot Plan',
          botSlots: 1,
          maxPythonFileSizeMB: 1,
          databaseStorageMB: 100,
        };
        setPlanName(foundPlan.name);

        const fixedConfig: DynamicPlanConfig = {
          activeBotCount: foundPlan.botSlots || 1,
          totalBotSlots: (foundPlan.botSlots || 1) * 3,
          maxPythonFileSizeMB: foundPlan.maxPythonFileSizeMB || 1,
          dbStorageMB: foundPlan.databaseStorageMB || 250,
          durationDays: billingInterval === 'yearly' ? 365 : 30,
        };
        setDynamicConfig(fixedConfig);

        api
          .calculateDynamicPlanPrice({
            activeBotCount: fixedConfig.activeBotCount,
            maxPythonFileSizeMB: fixedConfig.maxPythonFileSizeMB,
            dbStorageMB: fixedConfig.dbStorageMB,
            durationDays: fixedConfig.durationDays,
            couponCode: appliedCoupon || undefined,
          })
          .then((calcRes) => {
            if (active) setCalculation(calcRes);
          })
          .finally(() => {
            if (active) setLoadingPrice(false);
          });
      });
    }

    return () => {
      active = false;
    };
  }, [isDynamic, searchParams, planIdParam, billingInterval, appliedCoupon, user, isUpgradeParam]);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'TELEHOST20' || code === 'FIRSTBOT') {
      setAppliedCoupon(code);
    } else if (code === '') {
      setAppliedCoupon('');
    } else {
      alert('Invalid coupon code. Try TELEHOST20 for 20% off.');
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setAppliedCoupon('');
  };

  const subtotalINR = calculation ? calculation.subtotalINR : 0;
  const discountINR = calculation ? calculation.couponDiscountINR : 0;
  const upgradeCreditINR = isUpgrade && upgradeQuote ? upgradeQuote.creditAppliedINR : 0;
  const taxINR = isUpgrade && upgradeQuote ? upgradeQuote.taxINR : calculation ? calculation.taxAmountINR : 0;
  const totalAmountINR = isUpgrade && upgradeQuote ? upgradeQuote.totalPayableINR : calculation ? calculation.finalPriceINR : 0;

  const totalAmount = totalAmountINR;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail) {
      alert('Please enter your email.');
      return;
    }

    setProcessing(true);
    try {
      const order = await api.createCheckoutOrder({
        planId: isDynamic ? 'dynamic_custom' : planIdParam,
        planName,
        billingInterval,
        currency,
        customerName: customerName || 'Developer',
        customerEmail,
        customerPhone,
        couponCode: appliedCoupon || undefined,
        dynamicConfig: dynamicConfig || undefined,
        isUpgrade,
      });

      await api.verifyPayment(order.orderId, selectedMethod);

      navigate(
        `/payment-success?orderId=${order.orderId}&amount=${order.totalAmount}&currency=${currency}&plan=${encodeURIComponent(
          planName
        )}`
      );
    } catch (err: any) {
      alert(`Payment error: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>
          <p className="text-xs text-slate-500">
            Instant activation · 256-bit encrypted checkout
          </p>
        </div>

        {/* Upgrade alert */}
        {isUpgrade && upgradeQuote && upgradeQuote.currentSubscription && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Upgrade Credit:</strong> ₹{upgradeQuote.creditAppliedINR} applied from remaining {upgradeQuote.currentSubscription.daysRemaining} days.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Columns (7 cols): Details & Payment */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Customer info */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                1. Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Developer Name"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                2. Payment Method
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* UPI */}
                <div
                  onClick={() => setSelectedMethod('cashfree_upi')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all bg-white flex items-center justify-between ${
                    selectedMethod === 'cashfree_upi'
                      ? 'border-[#24A1DE] ring-1 ring-[#24A1DE] bg-sky-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900">UPI / QR</div>
                      <div className="text-[10px] text-slate-500">GPay, PhonePe, Paytm</div>
                    </div>
                  </div>
                  {selectedMethod === 'cashfree_upi' && <CheckCircle2 className="w-4 h-4 text-[#0088cc]" />}
                </div>

                {/* Cards */}
                <div
                  onClick={() => setSelectedMethod('cashfree_card')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all bg-white flex items-center justify-between ${
                    selectedMethod === 'cashfree_card'
                      ? 'border-[#24A1DE] ring-1 ring-[#24A1DE] bg-sky-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0088cc]" />
                    <div>
                      <div className="font-bold text-slate-900">Card</div>
                      <div className="text-[10px] text-slate-500">Visa, Master, RuPay</div>
                    </div>
                  </div>
                  {selectedMethod === 'cashfree_card' && <CheckCircle2 className="w-4 h-4 text-[#0088cc]" />}
                </div>

                {/* Netbanking */}
                <div
                  onClick={() => setSelectedMethod('cashfree_netbanking')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all bg-white flex items-center justify-between ${
                    selectedMethod === 'cashfree_netbanking'
                      ? 'border-[#24A1DE] ring-1 ring-[#24A1DE] bg-sky-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-bold text-slate-900">Netbanking</div>
                      <div className="text-[10px] text-slate-500">All Indian Banks</div>
                    </div>
                  </div>
                  {selectedMethod === 'cashfree_netbanking' && <CheckCircle2 className="w-4 h-4 text-[#0088cc]" />}
                </div>

                {/* Crypto */}
                <div
                  onClick={() => setSelectedMethod('crypto')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all bg-white flex items-center justify-between ${
                    selectedMethod === 'crypto'
                      ? 'border-[#24A1DE] ring-1 ring-[#24A1DE] bg-sky-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-900">Crypto / TON</div>
                      <div className="text-[10px] text-slate-500">TON, USDT, BTC</div>
                    </div>
                  </div>
                  {selectedMethod === 'crypto' && <CheckCircle2 className="w-4 h-4 text-[#0088cc]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Order Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-sm text-slate-900">Order Summary</h3>
                <span className="text-[10px] font-mono text-[#0088cc] bg-sky-50 px-2 py-0.5 rounded font-bold">
                  {dynamicConfig?.durationDays || 30} Days
                </span>
              </div>

              {dynamicConfig && (
                <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Plan</span>
                    <strong className="text-slate-800">{planName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Active Slots</span>
                    <strong className="text-slate-800">{dynamicConfig.activeBotCount} Bots</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Storage</span>
                    <strong className="text-slate-800">{dynamicConfig.dbStorageMB >= 1024 ? `${dynamicConfig.dbStorageMB / 1024} GB` : `${dynamicConfig.dbStorageMB} MB`}</strong>
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 uppercase font-mono"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotalINR}</span>
                </div>

                {isUpgrade && upgradeCreditINR > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-1.5 rounded">
                    <span>Credit:</span>
                    <span>-₹{upgradeCreditINR}</span>
                  </div>
                )}

                {discountINR > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{discountINR}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total:</span>
                  <span className="text-[#0088cc]">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePay}
                disabled={processing || loadingPrice}
                className="w-full py-2.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                id="btn-confirm-payment"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {processing ? 'Processing...' : `Pay ₹${totalAmount}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
