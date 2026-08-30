import React from 'react';
import { XCircle, ArrowRight, RotateCw, HelpCircle, Send } from 'lucide-react';

interface PaymentFailedPageProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
}

export const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ navigate, searchParams }) => {
  const error = searchParams.get('error') || 'TRANSACTION_DECLINED';
  const reason = decodeURIComponent(searchParams.get('reason') || 'Bank or Payment Gateway timed out.');

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl text-center space-y-6">
        {/* Failed Icon */}
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
          <XCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Payment Failed</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            We couldn't process your transaction. No money was deducted from your account.
          </p>
        </div>

        {/* Error diagnosis box */}
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-left space-y-1.5 text-xs text-rose-900">
          <div className="font-bold flex items-center justify-between">
            <span>Error Code:</span>
            <span className="font-mono text-rose-800 uppercase">{error}</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">{reason}</p>
        </div>

        {/* Suggestions */}
        <div className="text-left text-xs text-slate-600 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="font-bold text-slate-800">Troubleshooting Steps:</div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
            <li>Verify your UPI app (Google Pay/PhonePe) has approved the mandate</li>
            <li>Ensure international/online transactions are enabled on your card</li>
            <li>Try an alternate payment method or UPI QR code</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Try Checkout Again</span>
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Contact Support Desk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
