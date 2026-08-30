import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SupportTicket } from '../types';
import {
  HelpCircle,
  Send,
  Mail,
  Clock,
  CheckCircle2,
  Headphones,
  ShieldCheck
} from 'lucide-react';

interface ContactPageProps {
  navigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ navigate }) => {
  const { addToast } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('bot_crash');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      addToast('error', 'Please fill in subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await api.submitSupportTicket({
        subject,
        category,
        priority,
        message,
      });
      setSubmittedTicketId(ticket.id);
      addToast('success', `Support ticket ${ticket.id} submitted!`);
      setSubject('');
      setMessage('');
    } catch (e) {
      addToast('error', 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-slate-900 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0088cc] bg-sky-50 px-3 py-0.5 rounded-full inline-block border border-sky-100">
            Support Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Contact & Support
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm">
            24/7 technical assistance for your Telegram bot containers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Quick Channels */}
          <div className="space-y-4">
            {/* Telegram Channel */}
            <div className="p-5 bg-gradient-to-br from-[#24A1DE] to-[#0077b5] rounded-xl text-white shadow-md space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Send className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Telegram Direct</h3>
                  <p className="text-[11px] text-sky-100">&lt; 5 min response</p>
                </div>
              </div>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-[#0088cc] hover:bg-slate-50 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
              >
                <span>Open @TeleBotHostSupport</span>
                <Send className="w-3 h-3" />
              </a>
            </div>

            {/* SLA Info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>Response Times</span>
              </div>
              <div className="space-y-1.5 text-slate-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Telegram Live:</span>
                  <span className="font-bold text-emerald-600">&lt; 5m</span>
                </div>
                <div className="flex justify-between">
                  <span>Tickets:</span>
                  <span className="font-bold text-slate-800">&lt; 15m</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-bold text-slate-800">&lt; 2h</span>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500" />
              <div>
                <div className="font-bold text-slate-900">Email</div>
                <div className="text-slate-500 text-[11px]">support@telegrambots.io</div>
              </div>
            </div>
          </div>

          {/* Right Column: Ticket Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Submit Support Ticket</h3>
                <p className="text-xs text-slate-500">Provide bot ID or issue summary.</p>
              </div>

              {submittedTicketId && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ticket <strong>{submittedTicketId}</strong> received. Team notified.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs bg-white"
                    >
                      <option value="bot_crash">Bot Crash / Auto-restart</option>
                      <option value="billing">Billing & Plans</option>
                      <option value="webhook_failure">Webhook SSL</option>
                      <option value="db_connection">Storage & DB</option>
                      <option value="general">General Question</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical (Bot Down)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide error message, bot name, or logs..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
