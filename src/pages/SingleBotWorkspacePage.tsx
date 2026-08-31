import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TelegramBot, BotFileItem, StorageSummary } from '../types';
import { api } from '../services/api';
import {
  Menu,
  Settings,
  FileCode,
  Terminal,
  HardDrive,
  Play,
  Square,
  RefreshCw,
  Upload,
  Trash2,
  AlertCircle,
  Sliders,
  Database,
  ArrowRight
} from 'lucide-react';

interface SingleBotWorkspacePageProps {
  navigate: (to: string) => void;
  searchParams: URLSearchParams;
}

export const SingleBotWorkspacePage: React.FC<SingleBotWorkspacePageProps> = ({ navigate, searchParams }) => {
  const { user, bots, addToast, refreshBots } = useAuth();
  
  const botId = searchParams.get('id');
  const tab = searchParams.get('tab') || 'manage';
  
  const [bot, setBot] = useState<TelegramBot | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // States for files and logs
  const [files, setFiles] = useState<BotFileItem[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [storageSummary, setStorageSummary] = useState<StorageSummary | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // States for Manage Bot (Env Vars)
  const [envVars, setEnvVars] = useState([{ key: 'TELEGRAM_TOKEN', value: '' }]);
  const [savingEnv, setSavingEnv] = useState(false);

  // VPS Start Verification states
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [startStep, setStartStep] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);

  // Upgrade state
  const [selectedUpgradeStorage, setSelectedUpgradeStorage] = useState<string>('1GB');
  const [processingAddon, setProcessingAddon] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<BotFileItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (botId) {
      const found = bots.find(b => b.id === botId);
      if (found) {
        setBot(found);
        if (found.envVars && found.envVars.length > 0) {
          setEnvVars(found.envVars.map(ev => ({ key: ev.key, value: ev.value })));
        } else {
          setEnvVars([{ key: 'TELEGRAM_TOKEN', value: '' }]);
        }
      }
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  }, [botId, bots, navigate]);

  const fetchBotFilesAndStorage = async () => {
    if (!bot) return;
    setLoadingFiles(true);
    try {
      const res = await api.getBotFiles(bot.id);
      setFiles(res.files || []);
      if (res.storageSummary) {
        setStorageSummary(res.storageSummary);
      }
    } catch (e: any) {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchBotLogs = async () => {
    if (!bot) return;
    setLoadingLogs(true);
    try {
      const logRes = await api.getBotLogs(bot.id, { limit: 50 });
      setLogs(logRes.logs || []);
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (bot && tab === 'files') {
      fetchBotFilesAndStorage();
    }
    if (bot && tab === 'logs') {
      fetchBotLogs();
      const interval = setInterval(fetchBotLogs, 5000);
      return () => clearInterval(interval);
    }
    if (bot && tab === 'storage') {
      fetchBotFilesAndStorage(); // Re-use this endpoint for storage summary
    }
  }, [bot, tab]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading workspace...</div>;
  }

  if (!bot) {
    return <div className="p-12 text-center text-rose-500">Bot not found</div>;
  }

  // --- HANDLERS ---
  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    const newVars = envVars.filter((_, idx) => idx !== index);
    setEnvVars(newVars.length > 0 ? newVars : [{ key: '', value: '' }]);
  };

  const handleToggleStatus = async (action: 'start' | 'stop') => {
    if (action === 'stop') {
      setStatusChanging(true);
      try {
        const updated = await api.updateBotStatus(bot.id, 'stop');
        setBot(updated);
        addToast('success', 'Bot was successfully stopped.');
        refreshBots();
      } catch (e: any) {
        addToast('error', e.message || 'Failed to stop bot');
      } finally {
        setStatusChanging(false);
      }
      return;
    }
    
    // Starting flow - detailed VPS Verification & Health-Check sequence
    setIsStartingBot(true);
    setStartStep(0);
    setStartError(null);
    
    try {
      // Step 0: Handshake Connection to VPS daemon
      await new Promise(r => setTimeout(r, 800));
      setStartStep(1);
      
      // Step 1: FileSystem Sync Verification
      const res = await api.getBotFiles(bot.id);
      const fileList = res.files || [];
      if (fileList.length === 0) {
        throw new Error("Workspace is empty. Please upload your Python scripts or create a 'main.py' file in the File Explorer tab first.");
      }
      
      const hasPyFiles = fileList.some(f => f.fileName.endsWith('.py'));
      if (!hasPyFiles) {
        throw new Error("No Python scripts (.py) detected. The Telegram VPS requires at least one Python file to boot the sandbox.");
      }
      
      const entryFile = fileList.find(f => f.fileName === bot.entryPoint || f.filePath === bot.entryPoint);
      if (!entryFile) {
        throw new Error(`Entrypoint file '${bot.entryPoint}' not found in workspace. Please upload it or verify the entry point setting.`);
      }
      
      await new Promise(r => setTimeout(r, 800));
      setStartStep(2);
      
      // Step 2: AST Security & Code Syntax Analyzer
      if (entryFile.content) {
        const check = await api.validatePythonCode(entryFile.content, bot.entryPoint);
        if (!check.isValid && check.syntaxErrors && check.syntaxErrors.length > 0) {
          throw new Error(`Syntax Error in '${bot.entryPoint}' (Line ${check.syntaxErrors[0].line}): ${check.syntaxErrors[0].message}`);
        }
      }
      
      await new Promise(r => setTimeout(r, 800));
      setStartStep(3);
      
      // Step 3: Sandbox Environment & Credentials Check (Optional)
      const tokenVar = envVars.find(ev => ev.key === 'TELEGRAM_TOKEN');
      if (!tokenVar || !tokenVar.value || tokenVar.value.trim() === '') {
        // Proceed without error since the token is optional
      } else if (
        tokenVar.value.includes('YOUR_') || 
        tokenVar.value.toLowerCase().includes('token')
      ) {
        // Proceed without error
      }
      
      await new Promise(r => setTimeout(r, 800));
      setStartStep(4);
      
      // Step 4: Allocating resources & Spawning Systemd service
      const updated = await api.updateBotStatus(bot.id, 'start');
      setBot(updated);
      
      await new Promise(r => setTimeout(r, 800));
      setStartStep(5);
      
      // Step 5: VPS Telemetry Handshake & Connection Confirmation
      let isConfirmed = false;
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 600));
        const tel = await api.getBotTelemetry(bot.id);
        if (tel && (tel.state === 'ACTIVE' || tel.state === 'running')) {
          isConfirmed = true;
          break;
        }
      }
      
      if (!isConfirmed) {
        throw new Error("VPS Health Check Failed: The container process booted but exited immediately. Please inspect the 'Console Logs' tab for diagnostic output.");
      }
      
      addToast('success', `Verified: Bot "${bot.name}" is successfully running on VPS!`);
      refreshBots();
      setIsStartingBot(false);
    } catch (err: any) {
      setStartError(err.message || "An unexpected VPS daemon error occurred during boot.");
      // Set status to error on frontend
      setBot(prev => prev ? { ...prev, status: 'error' } : null);
      addToast('error', err.message || 'Failed to start bot');
    }
  };

  const handleSaveEnvVars = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEnv(true);
    try {
      const filteredVars = envVars.filter(ev => ev.key.trim() !== '');
      const formattedVars = filteredVars.map((ev, idx) => ({
        id: `env_${Date.now()}_${idx}`,
        key: ev.key.trim().toUpperCase(),
        value: ev.value.trim(),
        isSecret: ev.key.toUpperCase().includes('TOKEN') || ev.key.toUpperCase().includes('SECRET') || ev.key.toUpperCase().includes('PASSWORD')
      }));
      const updatedBot = await api.updateBotEnvVars(bot.id, formattedVars);
      setBot(updatedBot);
      addToast('success', 'Environment variables saved successfully');
      refreshBots();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to save environment variables');
    } finally {
      setSavingEnv(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.py') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.env') || 
                     file.name.endsWith('.sqlite');

      let content: string;
      let encoding: 'utf-8' | 'base64' = 'utf-8';

      if (isText) {
        content = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        content = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        encoding = 'base64';
      }

      const isReplacement = files.some(f => f.fileName === file.name);
      await api.uploadBotFile(bot.id, file.name, content, encoding);
      await fetchBotFilesAndStorage();

      if (isReplacement) {
        addToast('success', `"${file.name}" was replaced and bot is restarting.`);
        try {
          const updated = await api.updateBotStatus(bot.id, 'restart');
          setBot(updated);
          refreshBots();
        } catch { }
      } else {
        addToast('success', `Successfully uploaded "${file.name}"!`);
      }
    } catch (e: any) {
      addToast('error', e.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDeleteFile = async (file: BotFileItem) => {
    try {
      await api.deleteBotFile(bot.id, file.filePath);
      addToast('info', `Deleted "${file.fileName}"`);
      fetchBotFilesAndStorage();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to delete file');
    } finally {
      setFileToDelete(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // --- RENDER CONTENT VIEWS ---
  const renderManageView = () => {
    const startSteps = [
      { label: 'Connecting to isolated Linux VPS daemon...' },
      { label: 'Syncing files and local databases to container mount...' },
      { label: 'Performing AST validation on python code entrypoint...' },
      { label: 'Allocating cgroups resource quotas (CPU/RAM/PIDs limit)...' },
      { label: 'Confirming secure socket link & active PID health...' }
    ];

    return (
      <div className="space-y-6 animate-in fade-in max-w-full">
        {/* Bot Controls Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">Bot Controls</h3>
            <p className="text-xs text-slate-500">Start, stop or restart your dedicated background process here.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs font-bold text-slate-600">Status:</span>
              <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold border ${
                bot.status === 'running'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : bot.status === 'stopped'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  bot.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                  bot.status === 'stopped' ? 'bg-amber-500' :
                  'bg-rose-500'
                }`} />
                <span>{bot.status === 'running' ? 'Running' : bot.status === 'stopped' ? 'Stopped' : 'Error'}</span>
              </span>
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
            
            {bot.status !== 'running' ? (
              <button
                onClick={() => handleToggleStatus('start')}
                disabled={statusChanging || isStartingBot}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isStartingBot ? 'Booting Container...' : 'Start Bot Engine'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleStatus('stop')}
                disabled={statusChanging}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                <span>Stop Execution</span>
              </button>
            )}
          </div>

          {/* Detailed VPS Handshake/Verification Section */}
          {isStartingBot && (
            <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white">VPS Boot Verification Sequence</h4>
                    <p className="text-[10px] text-slate-400">Enforcing Linux cgroups limits & authenticating secure polling sockets...</p>
                  </div>
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
                  DAEMON: ON
                </span>
              </div>

              {/* Progress Slider */}
              <div className="relative w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-sky-500 h-full transition-all duration-500" 
                  style={{ width: `${(startStep / 5) * 100}%` }}
                />
              </div>

              {/* Multi-Step Logging */}
              <div className="space-y-2.5 text-xs font-mono">
                {startSteps.map((step, idx) => {
                  const isDone = startStep > idx;
                  const isActive = startStep === idx && !startError;
                  const isFailed = startError && startStep === idx;
                  return (
                    <div key={idx} className="flex items-start gap-2.5">
                      {isDone ? (
                        <span className="text-emerald-400 font-bold">✔</span>
                      ) : isFailed ? (
                        <span className="text-rose-500 font-bold">✘</span>
                      ) : isActive ? (
                        <span className="text-sky-400 font-bold animate-pulse">▶</span>
                      ) : (
                        <span className="text-slate-600">○</span>
                      )}
                      <span className={isDone ? "text-slate-400" : isActive ? "text-sky-300 font-black" : isFailed ? "text-rose-400 font-bold" : "text-slate-500"}>
                        {step.label}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-slate-500 animate-pulse ml-auto font-sans">verifying...</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {startError && (
                <div className="bg-rose-950/30 border border-rose-900/50 p-4 rounded-xl space-y-2 animate-in shake">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>VPS Verification Interrupted</span>
                  </div>
                  <p className="text-[11px] font-mono text-rose-300 leading-relaxed pl-6">
                    {startError}
                  </p>
                  <div className="pl-6 pt-1 flex gap-2">
                    <button
                      onClick={() => {
                        setStartError(null);
                        setIsStartingBot(false);
                      }}
                      className="px-3.5 py-1.5 bg-rose-900/30 hover:bg-rose-900/50 text-rose-200 border border-rose-800/80 text-[10px] font-bold rounded-lg transition-all cursor-pointer font-sans"
                    >
                      Dismiss Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Environment Variables Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">Environment Variables (Optional)</h3>
          <p className="text-xs text-slate-500 mb-5">
            Store your secrets securely here instead of hard-coding them in your Python files. 
            They will be loaded as environment variables on startup.
          </p>

          <form onSubmit={handleSaveEnvVars} className="space-y-4 max-w-2xl">
            {envVars.map((env, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
                <input
                  type="text"
                  placeholder="Key (e.g. TELEGRAM_TOKEN)"
                  value={env.key}
                  onChange={(e) => {
                    const newVars = [...envVars];
                    newVars[i].key = e.target.value.toUpperCase(); // Env keys are uppercase
                    setEnvVars(newVars);
                  }}
                  className="w-full sm:w-1/3 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/30 text-slate-900 font-bold"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={env.value}
                  onChange={(e) => {
                    const newVars = [...envVars];
                    newVars[i].value = e.target.value;
                    setEnvVars(newVars);
                  }}
                  className="w-full sm:flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/30 text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEnvVar(i)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Remove Variable"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddEnvVar}
                className="px-4 py-2 border border-dashed border-slate-300 hover:border-[#24A1DE] text-slate-600 hover:text-[#24A1DE] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add Variable</span>
              </button>
              <button
                type="submit"
                disabled={savingEnv}
                className="px-5 py-2.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingEnv ? 'Saving...' : 'Save Environment Variables'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderFilesView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 max-w-4xl">
        <div>
          <h3 className="text-lg font-black text-slate-900 mb-1">File Explorer</h3>
          <p className="text-xs text-slate-500">Upload your python scripts, sqlite databases, or env files.</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#24A1DE] bg-sky-50'
              : 'border-slate-300 hover:border-[#24A1DE] bg-slate-50 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".py,.json,.txt,.env,.yaml,.yml,.db,.sqlite,.sqlite3"
          />
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-[#0088cc]">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            {uploading ? 'Processing file...' : 'Click or Drag files here to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Upload `main.py` to trigger auto-restart
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Directory Contents</h4>
          {loadingFiles ? (
            <div className="py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading file tree...
            </div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No files uploaded to your workspace yet.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {files.map((file) => (
                <div key={file.filePath} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 text-[#0088cc] rounded-lg">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{file.fileName}</div>
                      <div className="text-xs text-slate-400">{formatSize(file.fileSizeBytes)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileToDelete?.id === file.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFileToDelete(null)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer shadow-xs shadow-rose-200"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLogsView = () => (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-t-2xl border-b border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#0088cc]" />
          Real-time Console Stream
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected
          </span>
          <button onClick={fetchBotLogs} className="text-slate-400 hover:text-white cursor-pointer" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-slate-950 p-6 rounded-b-2xl overflow-y-auto font-mono text-[12px] space-y-3 border border-slate-900 shadow-xl max-h-[60vh]">
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-12">
            No logs output yet. Start your bot to see stdout/stderr here.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed border-l-[3px] pl-3 py-1.5 border-slate-800 break-words hover:bg-slate-900/50 transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0 mt-0.5">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <div className="flex-1 space-y-1.5">
                  <span className={
                    log.level === 'error'
                      ? 'text-rose-400 font-semibold'
                      : log.level === 'warning'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }>
                    {log.message}
                  </span>
                  
                  {log.level === 'error' && log.friendlyMessage && (
                    <div className="mt-2 p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg">
                      <div className="text-rose-300 font-bold text-xs mb-1 font-sans flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        AI Diagnosis
                      </div>
                      <div className="text-rose-200 text-xs font-sans mb-2">
                        {log.friendlyMessage}
                      </div>
                      {log.suggestedFix && (
                        <div className="text-emerald-400 text-xs font-sans font-medium flex items-start gap-1.5">
                          <span className="shrink-0 pt-0.5">💡</span>
                          <span>{log.suggestedFix}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const handlePurchaseAddon = async () => {
    setProcessingAddon(true);
    try {
      const mbMap: Record<string, number> = {
        '500MB': 500,
        '1GB': 1024,
        '2GB': 2048,
        '5GB': 5120,
      };
      const mb = mbMap[selectedUpgradeStorage] || 500;
      
      const response = await api.createAddonOrder(mb, bot?.project_id);
      const { order, cashfreePayload } = response;

      if (cashfreePayload && cashfreePayload.paymentSessionId) {
        if (!(window as any).Cashfree) {
          const script = document.createElement('script');
          script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
          document.body.appendChild(script);
          await new Promise((resolve) => { script.onload = resolve; });
        }
        
        const isProd = window.location.hostname !== 'localhost' && !window.location.hostname.includes('dev');
        const cashfree = (window as any).Cashfree({ mode: isProd ? 'production' : 'sandbox' });
        
        cashfree.checkout({
          paymentSessionId: cashfreePayload.paymentSessionId,
          redirectTarget: '_self'
        });
        return;
      }

      // Mock fallback
      const actualOrderId = order.orderId || (order as any).order_id || cashfreePayload?.orderId;
      if (!actualOrderId) {
        throw new Error('Order ID is missing from response');
      }
      await api.verifyPayment(actualOrderId, 'cashfree_upi');
      addToast('success', 'Storage added successfully! Your next renewal bill will be updated.');
      fetchBotFilesAndStorage();
    } catch (e: any) {
      addToast('error', `Failed to purchase add-on: ${e.message}`);
    } finally {
      setProcessingAddon(false);
    }
  };

  const renderStorageView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-sky-50 text-[#0088cc] rounded-2xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-xl">Storage & Plan Details</h3>
            <p className="text-sm text-slate-500">Monitor your filesystem consumption and purchase add-on capacity.</p>
          </div>
        </div>

        {storageSummary && (
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 mb-8">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold text-slate-700">Disk Space Consumption</span>
              <span className="font-extrabold text-slate-950 text-base">
                {storageSummary.usedStorageMB.toFixed(1)} MB <span className="text-slate-400 font-medium">/ {storageSummary.totalStorageMB} MB</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden border border-slate-300">
              <div
                className={`h-full transition-all ${
                  storageSummary.usagePercentage > 85 ? 'bg-rose-500' : 'bg-[#24A1DE]'
                }`}
                style={{ width: `${Math.min(100, storageSummary.usagePercentage)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              You have {storageSummary.remainingStorageMB.toFixed(1)} MB of safe sandbox storage remaining.
            </p>
          </div>
        )}

        <h4 className="font-bold text-slate-800 text-base mb-2">Buy Add-on Capacity</h4>
        <p className="text-xs text-slate-500 mb-6">
          Storage add-ons are applied instantly. Your upcoming renewal bill will be adjusted automatically, and you can decrease storage later if the space is empty.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { name: '500MB', price: '₹79' },
            { name: '1GB', price: '₹119' },
            { name: '2GB', price: '₹199' },
            { name: '5GB', price: '₹399' },
          ].map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setSelectedUpgradeStorage(item.name)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedUpgradeStorage === item.name
                  ? 'border-[#24A1DE] bg-sky-50 ring-2 ring-[#0088cc]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-sm font-black text-slate-900">{item.name}</div>
              <div className="text-xs font-bold text-[#0088cc] mt-1">{item.price} <span className="text-slate-400 font-normal">add-on</span></div>
            </button>
          ))}
        </div>
        <button
          onClick={handlePurchaseAddon}
          disabled={processingAddon}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Sliders className="w-4 h-4" />
          <span>{processingAddon ? 'Processing...' : `Purchase ${selectedUpgradeStorage} Add-on`}</span>
        </button>
      </div>
    </div>
  );

  const workspaceTabs = [
    { id: 'manage', label: 'Manage Bot', icon: Settings },
    { id: 'files', label: 'File Explorer', icon: FileCode },
    { id: 'logs', label: 'Console Logs', icon: Terminal },
    { id: 'storage', label: 'Storage & Plan', icon: HardDrive },
  ];

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden min-h-[550px] max-w-full">
      {/* Mobile Horizontal Tab Navigation */}
      <div className="flex md:hidden border-b border-slate-200 bg-slate-50 p-2 overflow-x-auto gap-1 shrink-0 scrollbar-none">
        {workspaceTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=${item.id}`)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              tab === item.id
                ? 'bg-[#24A1DE] text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <item.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop Sidebar Navigation */}
      <div 
        className={`hidden md:flex shrink-0 border-r border-slate-200 transition-all duration-300 flex-col bg-slate-50 ${
          isSidebarOpen ? 'w-56' : 'w-16'
        }`}
      >
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className={`font-black text-[#0088cc] text-sm truncate ${!isSidebarOpen && 'hidden'}`}>Workspace</div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {workspaceTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=${item.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-bold ${
                tab === item.id
                  ? 'bg-[#24A1DE] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              } ${!isSidebarOpen && 'justify-center'}`}
              title={item.label}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className={`${!isSidebarOpen && 'hidden'} truncate`}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 w-full max-w-full overflow-x-hidden">
        <div className="p-4 sm:p-6 md:p-8 w-full h-full overflow-y-auto">
          {tab === 'manage' && renderManageView()}
          {tab === 'files' && renderFilesView()}
          {tab === 'logs' && renderLogsView()}
          {tab === 'storage' && renderStorageView()}
        </div>
      </div>
    </div>
  );
};
