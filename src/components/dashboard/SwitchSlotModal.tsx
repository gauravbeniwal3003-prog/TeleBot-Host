import React, { useState } from 'react';
import { TelegramBot } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowRightLeft, Bot, X, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SwitchSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBot: TelegramBot | null;
  allBots: TelegramBot[];
  maxActiveBots: number;
  onSuccess: () => void;
}

export const SwitchSlotModal: React.FC<SwitchSlotModalProps> = ({
  isOpen,
  onClose,
  targetBot,
  allBots,
  maxActiveBots,
  onSuccess,
}) => {
  const { addToast } = useAuth();
  const [selectedFromBotId, setSelectedFromBotId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !targetBot) return null;

  const runningBots = allBots.filter((b) => b.id !== targetBot.id && (b.status === 'running' || b.status === 'paused'));

  const handleSwitch = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.switchActiveBot(targetBot.id, selectedFromBotId || undefined);
      addToast('success', res.message || `Swapped active slot successfully.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to swap active slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 text-[#0088cc] rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Switch Active Bot Slot</h3>
              <p className="text-xs text-slate-500">
                Plan limit: {maxActiveBots} simultaneous active running bots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-sky-800">
              <Bot className="w-4 h-4 text-[#0088cc]" /> Target to Activate:
            </p>
            <p className="text-sm font-bold text-slate-800">{targetBot.name} ({targetBot.username})</p>
            <p className="text-slate-600">
              Activating this bot will start its isolated container in a dedicated active runtime slot.
            </p>
          </div>

          {runningBots.length >= maxActiveBots ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>All {maxActiveBots} active slots are currently in use. Select which running bot to pause/stop:</span>
              </div>

              <div className="space-y-2">
                {runningBots.map((bot) => (
                  <label
                    key={bot.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedFromBotId === bot.id
                        ? 'border-[#0088cc] bg-sky-50/50 ring-2 ring-sky-100'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="fromBot"
                        value={bot.id}
                        checked={selectedFromBotId === bot.id}
                        onChange={() => setSelectedFromBotId(bot.id)}
                        className="text-[#0088cc] focus:ring-[#0088cc]"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{bot.name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{bot.username}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800">
                      Running ({bot.cpuUsage}% CPU)
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                You have available active slots ({runningBots.length}/{maxActiveBots} used). This bot can be activated directly!
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSwitch}
              disabled={isSubmitting || (runningBots.length >= maxActiveBots && !selectedFromBotId && runningBots.length > 0)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Swapping Slots...' : 'Activate Bot in Slot'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
