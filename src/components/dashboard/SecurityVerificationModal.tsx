import React, { useState } from 'react';
import { SecurityTestReport } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Cpu,
  HardDrive,
  Network,
  Lock,
  Terminal,
  Play,
  CheckCircle2,
  X,
  AlertCircle,
  Zap,
  Server
} from 'lucide-react';

interface SecurityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityVerificationModal: React.FC<SecurityVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = useAuth();
  const [activeTest, setActiveTest] = useState<string>('host_filesystem');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testReport, setTestReport] = useState<SecurityTestReport | null>(null);

  if (!isOpen) return null;

  const testOptions = [
    {
      id: 'host_filesystem',
      title: 'Host Filesystem Isolation Test',
      description: 'Attempts to read `/etc/shadow` and write to `/var/run` on the host OS.',
      attack: 'Malicious read/write syscalls targeting host root paths.',
    },
    {
      id: 'fork_bomb',
      title: 'Fork-Bomb & PID Exhaustion Test',
      description: 'Spawns recursive child processes to starve Linux kernel PID namespace.',
      attack: '`while True: os.fork()` process exhaustion attack.',
    },
    {
      id: 'oom_killer',
      title: 'Out-Of-Memory (OOM) Container Isolation',
      description: 'Allocates infinite bytearrays to exceed container RAM quota.',
      attack: '`bytearray(1024*1024*1024)` memory exhaustion attempt.',
    },
    {
      id: 'subprocess_block',
      title: 'Privileged Subprocess & Shell Escalation',
      description: 'Invokes `ctypes` and `setuid(0)` to gain root kernel privileges.',
      attack: '`libc.setuid(0)` & `pty.spawn` escalation attempt.',
    },
  ];

  const handleRunTest = async (testId: string) => {
    setIsRunningTest(true);
    setActiveTest(testId);
    setTestReport(null);
    try {
      const report = await api.runSecurityTest(testId);
      setTestReport(report);
      addToast('success', `Security test completed: ${report.outcome}`);
    } catch (err: any) {
      addToast('error', err.message || 'Test failed');
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#24A1DE]/20 text-[#24A1DE] rounded-xl border border-[#24A1DE]/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">VPS Container Isolation & Security Architecture</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  KERNEL SANDBOX VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent Docker Container execution · Zero host OS access · cgroups v2 resource policing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Architecture Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Cpu className="w-4 h-4 text-[#0088cc]" /> cgroups v2 CPU & RAM
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hardware CFS bandwidth throttling capped per plan tier with dedicated OOM killer sandbox.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lock className="w-4 h-4 text-emerald-600" /> Rootless & No-New-Privs
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Runs under non-root unmapped UID 10001 with <code>no-new-privileges: true</code> and seccomp filtering.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <HardDrive className="w-4 h-4 text-amber-600" /> Read-Only Root FS
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Container root is immutable read-only; writes restricted solely to <code>/app/storage</code> quota.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Network className="w-4 h-4 text-purple-600" /> Egress Bridge Filter
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Network traffic restricted to Telegram Bot API endpoints (IP 149.154.160.0/20) and customer DB.
              </p>
            </div>
          </div>

          {/* Live Security Testing Lab */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#0088cc]" /> Live Sandbox Attack & Isolation Verification
                </h4>
                <p className="text-xs text-slate-500">
                  Simulate malicious customer scripts to test and verify Linux container boundaries in real-time.
                </p>
              </div>
            </div>

            {/* Test Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-2 cursor-pointer ${
                    activeTest === opt.id
                      ? 'border-[#0088cc] bg-sky-50/40 ring-2 ring-sky-100'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                  onClick={() => setActiveTest(opt.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{opt.title}</span>
                    <button
                      type="button"
                      disabled={isRunningTest}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTest(opt.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isRunningTest && activeTest === opt.id ? 'Running...' : 'Run Test'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600">{opt.description}</p>
                  <div className="font-mono text-[10px] bg-white p-1.5 rounded border border-slate-200 text-slate-700">
                    Attack payload: {opt.attack}
                  </div>
                </div>
              ))}
            </div>

            {/* Test Output & Kernel Sandbox Log */}
            {testReport && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs border border-slate-700 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>TEST REPORT: {testReport.outcome}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px]">
                    {testReport.hostImpact}
                  </span>
                </div>

                <div className="text-slate-300 text-xs">
                  <span className="text-slate-400">Outcome Details: </span>
                  {testReport.details}
                </div>

                <div className="p-3 bg-slate-950 rounded-lg text-[11px] space-y-1 text-slate-400 border border-slate-800/80">
                  <div className="text-slate-500 font-bold flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-[#24A1DE]" /> Sandbox Audit Trail / Kernel Log:
                  </div>
                  <div className="text-emerald-300 whitespace-pre-wrap">{testReport.kernelLog}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Linux VPS Worker Node: Host OS Protected · UID 10001 Isolation Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close Security Lab
          </button>
        </div>
      </div>
    </div>
  );
};
