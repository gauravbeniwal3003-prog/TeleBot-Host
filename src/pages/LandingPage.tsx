import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  HardDrive,
  Bot
} from 'lucide-react';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does automatic crash restart work?',
      a: 'If an error stops your bot, TeleBot Host automatically restarts it in under 1.5 seconds so your users never experience downtime.',
    },
    {
      q: 'Do I need server knowledge?',
      a: 'No! You only need your Telegram bot token and your Python script. TeleBot Host handles all servers and dependencies automatically.',
    },
    {
      q: 'Can I manage my bot on mobile?',
      a: 'Yes, our web dashboard is fully responsive and optimized for mobile smartphones, tablets, and desktop computers.',
    },
    {
      q: 'Where are database files stored?',
      a: 'Every bot gets persistent storage for SQLite (.db), JSON files, and media.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'UPI (Google Pay, PhonePe, Paytm), Cards, Netbanking, and Crypto.',
    },
  ];

  return (
    <div className="bg-white text-slate-900 overflow-hidden min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-100 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-5">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-[#0088cc]">
              <span className="flex h-2 w-2 rounded-full bg-[#24A1DE] animate-pulse" />
              <span>TeleBot Host Cloud Infrastructure</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Simple Telegram Bot Hosting
            </h1>

            {/* Slogan */}
            <p className="text-lg sm:text-xl font-medium text-[#0088cc] tracking-tight">
              Upload your bot. Start it. Keep it running 24/7.
            </p>

            {/* Supporting Text */}
            <p className="text-xs sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
              Effortlessly host your Python, Node.js, and Go Telegram bots with instant 24/7 uptime and zero server setup.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/register')}
                className="inline-flex items-center gap-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs hover:shadow transition-all cursor-pointer"
                id="btn-hero-start"
              >
                <span>Start Hosting Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer border border-slate-200"
                id="btn-hero-plans"
              >
                <span>View Plans & Pricing</span>
              </button>
            </div>

            {/* Highlights */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>24/7 Auto-Restart</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                <Bot className="w-4 h-4 text-[#0088cc]" />
                <span>Zero Terminal Commands</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <span>Persistent Database</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Mobile Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS RIBBON */}
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">24 / 7</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Always Online</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0088cc]">1-Click</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Python Upload</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Auto</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Crash Recovery</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">∞</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Unlimited Bandwidth</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FAQ SECTION */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-1 mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#0088cc]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 text-xs text-slate-600 border-t border-slate-200/60 pt-3 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. BOTTOM CTA */}
      <section className="py-14 bg-[#24A1DE] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Host Your Bot 24/7?
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 max-w-md mx-auto">
            Get started in seconds with TeleBot Host.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="bg-white text-[#0088cc] hover:bg-slate-50 font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
              id="btn-cta-getstarted"
            >
              Start Hosting Free
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-[#1e8cc3] hover:bg-[#1a7cae] text-white border border-white/20 font-semibold px-5 py-3 rounded-xl text-xs sm:text-sm cursor-pointer"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
