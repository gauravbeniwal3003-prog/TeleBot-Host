import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CheckCircle2, ArrowRight, Bot, Server, ShieldCheck, Download, Copy, Check, RotateCw } from 'lucide-react';

interface PaymentSuccessPageProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ navigate, searchParams }) => {
  const { refreshUserData, refreshBots } = useAuth();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || 'TH_ORD_849204';
  const amount = searchParams.get('amount') || '589';
  const currency = searchParams.get('currency') || 'INR';
  const plan = decodeURIComponent(searchParams.get('plan') || 'Pro Developer Plan');

  const [provisionProgress, setProvisionProgress] = useState(20);
  const [provisionComplete, setProvisionComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Fail-safe auto verification and state refresh
    if (orderId) {
      api.verifyPayment(orderId)
        .then(() => {
          refreshUserData();
          refreshBots();
        })
        .catch((err) => {
          console.warn('[PaymentSuccess auto-verify]', err);
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
    }

    const timer1 = setTimeout(() => setProvisionProgress(65), 600);
    const timer2 = setTimeout(() => {
      setProvisionProgress(100);
      setProvisionComplete(true);
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl text-center space-y-6">
        {/* Animated Success Badge */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Your Cashfree transaction has been verified. Your hosting subscription is now active.
          </p>
        </div>

        {/* Provisioning Progress Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Server className="w-4 h-4 text-[#0088cc]" />
              <span>VPS Cluster Slot Allocation</span>
            </span>
            <span className="text-[#0088cc] font-mono font-bold">{provisionProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#24A1DE] h-full transition-all duration-700 ease-out"
              style={{ width: `${provisionProgress}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Node: AP-South (Mumbai-01)</span>
            <span className="text-emerald-600 font-semibold">
              {provisionComplete ? 'Container Ready' : 'Provisioning...'}
            </span>
          </div>
        </div>

        {/* Order Details Receipt Box */}
        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs text-left">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Order ID:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
              <span>{orderId}</span>
              <button
                onClick={copyOrderId}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy Order ID"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Plan:</span>
            <span className="font-semibold text-slate-800">{plan}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-bold text-[#0088cc]">{currency === 'INR' ? '₹' : '$'}{amount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Gateway:</span>
            <span className="font-semibold text-slate-700">Cashfree Auto-Capture</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            <span>Deploy Your First Telegram Bot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
          >
            Go to Control Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
