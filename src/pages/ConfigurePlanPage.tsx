import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomPlanConfigurator } from '../components/common/CustomPlanConfigurator';
import { Sliders, Zap, ShieldCheck, ArrowRight, Bot, HardDrive, FileCode } from 'lucide-react';

interface ConfigurePlanPageProps {
  navigate: (path: string) => void;
}

export const ConfigurePlanPage: React.FC<ConfigurePlanPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const sub = user?.subscription;

  const currentBots = sub?.activeBotCount || 1;
  const currentSlots = sub?.totalBotSlots || 3;
  const currentStorageMB = sub?.dbStorageMB || 50;
  const currentFileSizeMB = sub?.maxPythonFileSizeMB || 0.5;

  return (
    <div className="space-y-6 pb-12 text-slate-900 max-w-6xl mx-auto">
      {/* Current Active Plan Limits Bar */}
      {sub && (
        <div className="bg-gradient-to-r from-[#0088cc]/10 via-sky-50 to-[#0088cc]/5 border border-[#0088cc]/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-[#0088cc] uppercase tracking-wider">
                Current Plan Limits Overview
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-white/80 px-3 py-1 rounded-full border border-slate-200">
              Prorated Upgrade Credit Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                <Bot className="w-3.5 h-3.5 text-[#0088cc]" /> Active Bots
              </span>
              <div className="font-extrabold text-slate-900 text-sm">
                {currentBots} Active <span className="text-slate-400 font-normal text-xs">({currentSlots} slots)</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-purple-600" /> Database Storage
              </span>
              <div className="font-extrabold text-slate-900 text-sm">
                {currentStorageMB} MB
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Plan Status
              </span>
              <div className="font-extrabold text-emerald-700 text-sm">
                Active 24/7
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Upgrade Configurator */}
      <CustomPlanConfigurator
        navigate={navigate}
        title="Upgrade Storage & Hosting Limits"
        subtitle="Select your target storage capacity plan. Instant upgrade credits apply automatically for active subscriptions."
        showHeader={true}
      />
    </div>
  );
};


