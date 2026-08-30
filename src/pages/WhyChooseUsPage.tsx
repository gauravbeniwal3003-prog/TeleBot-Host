import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  RefreshCw,
  Database,
  Terminal,
  Globe,
  Lock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface WhyChooseUsPageProps {
  navigate: (path: string) => void;
}

export const WhyChooseUsPage: React.FC<WhyChooseUsPageProps> = ({ navigate }) => {
  const { user } = useAuth();

  const features = [
    {
      icon: <RefreshCw className="w-5 h-5 text-[#0088cc]" />,
      bg: 'bg-sky-50',
      title: '24/7 Automatic Restart',
      description: 'Your bot stays online round the clock. If it crashes, TeleBot Host automatically restarts it in seconds.',
    },
    {
      icon: <Database className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50',
      title: 'Persistent Database Storage',
      description: 'Safe storage for SQLite databases, JSON state, and media files that survive server reboots.',
    },
    {
      icon: <Terminal className="w-5 h-5 text-[#0088cc]" />,
      bg: 'bg-sky-50',
      title: 'Real-Time Console Logs',
      description: 'Monitor stdout, stderr, process events, and crash logs directly from your browser or mobile dashboard.',
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      title: 'High Bandwidth & Low Latency',
      description: 'Ultra-fast Telegram Bot API communication with unlimited message bandwidth and instant webhooks.',
    },
    {
      icon: <Lock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      title: 'Encrypted Token Security',
      description: 'Bot tokens and API keys are protected with AES-256 encryption in isolated Linux sandboxes.',
    },
    {
      icon: <Layers className="w-5 h-5 text-slate-700" />,
      bg: 'bg-slate-100',
      title: '1-Click Bot Controls',
      description: 'Start, stop, pause, or switch bots instantly on phone or desktop with simple control buttons.',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-bold text-[#0088cc]">
            <Zap className="w-3.5 h-3.5" />
            <span>TeleBot Host Infrastructure</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Why Choose TeleBot Host?
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Dedicated cloud hosting designed for 24/7 Telegram bot stability without server configuration.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#24A1DE] transition-all space-y-3"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                {item.icon}
              </div>
              <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Highlight Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-600 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Maintenance Needed</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Ready to host your bot on TeleBot Host?
            </h2>
            <p className="text-xs text-slate-500">
              Start your free trial now. Upload python script and launch in under a minute.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-200 cursor-pointer"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
