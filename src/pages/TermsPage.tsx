import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface TermsPageProps {
  navigate: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ navigate }) => {
  return (
    <div className="bg-white text-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0088cc]">
            Legal Agreement
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Terms and Conditions of Service</h1>
          <p className="text-xs text-slate-500">Last updated: February 2025</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By creating an account, subscribing to any hosting plan, or using the TeleBot Host platform, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you must discontinue using our services immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Description of Service</h2>
            <p>
              TeleBot Host provides cloud-based virtual private server (VPS) runtime environments, process watchdogs, persistent storage, and network routing designed specifically for running Telegram bot applications. TeleBot Host is an independent infrastructure provider and is not affiliated with, sponsored by, or endorsed by Telegram FZ-LLC.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Acceptable Use Policy</h2>
            <p>
              You agree not to use TeleBot Host infrastructure for any prohibited activities, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Sending unsolicited bulk spam or unauthorized advertisements to Telegram users or groups</li>
              <li>Hosting malicious software, phishing bots, crypto scams, or credential theft tools</li>
              <li>Launching denial-of-service (DDoS) attacks or port scanning external networks</li>
              <li>Violating the official Telegram Terms of Service and Telegram Bot API Guidelines</li>
            </ul>
            <p className="pt-1">
              Violation of this policy will result in immediate termination of the offending bot container and permanent account suspension without refund.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Billing, Renewals & Cashfree Payments</h2>
            <p>
              All payments are processed securely through certified payment gateways including Cashfree Payments. Subscriptions are billed on a recurring monthly or yearly cycle depending on your selection. You may cancel your subscription at any time via your dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Service Level Agreement (SLA) & Uptime</h2>
            <p>
              TeleBot Host guarantees a 99.9% monthly container node uptime target. In the event of scheduled cluster maintenance, advance notice will be provided via your account dashboard and official Telegram status channel.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TeleBot Host shall not be liable for any indirect, incidental, or consequential damages resulting from downtime, Telegram API rate limits, or data loss. We strongly recommend regular backups of persistent databases.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => navigate('/privacy')}
            className="text-xs font-semibold text-[#0088cc] hover:underline"
          >
            Read our Privacy Policy →
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            Have legal questions? Contact us
          </button>
        </div>
      </div>
    </div>
  );
};
