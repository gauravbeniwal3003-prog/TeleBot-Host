import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Shield, Zap, Terminal, Activity, Send, Heart } from 'lucide-react';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => navigate('/')}
              className="cursor-pointer inline-block"
            >
              <BrandLogo size="md" textColor="text-white" />
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Dedicated cloud infrastructure for high-performance Telegram bots. Built for Python, Node.js, and Go developers with automated failover, webhooks, and zero maintenance.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All Systems 99.99% Operational
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">
                  Pricing & Plans
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">
                  Control Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">
                  Bot Manager
                </button>
              </li>
            </ul>
          </div>

          {/* Developer Docs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Frameworks & Docs</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
                  Aiogram 3.x (Python)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
                  Telethon & Pyrogram
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
                  Telegraf & Grammy (JS)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
                  Webhooks vs Long Polling
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">
                  SQLite & Postgres Setup
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Trust & Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">
                  24/7 Support & Contact
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#24A1DE] transition-colors inline-flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Telegram Community
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} TeleBot Host Cloud Infrastructure. All rights reserved.
          </p>
          <p className="text-slate-400 text-center sm:text-right">
            Independent cloud hosting platform. Not affiliated with or endorsed by Telegram FZ-LLC.
          </p>
        </div>
      </div>
    </footer>
  );
};
