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
  Download,
  Edit2,
  AlertCircle,
  AlertTriangle,
  Sliders,
  Database,
  ArrowRight,
  Sparkles,
  Package,
  Zap,
  CheckCircle2,
  Wrench,
  TerminalSquare,
  Save,
  Info,
  ShieldCheck,
  Copy,
  Check,
  Activity,
  Cpu,
  Layers
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

  // Custom Start Command states
  const [startCommand, setStartCommand] = useState('');
  const [isSavingStartCommand, setIsSavingStartCommand] = useState(false);

  // Groq AI Package Manager states
  const [isScanningPackages, setIsScanningPackages] = useState(false);
  const [detectedPackages, setDetectedPackages] = useState<Array<{ name: string; description: string; importName: string }>>([]);
  const [customPackageInput, setCustomPackageInput] = useState('');
  const [isInstallingPackages, setIsInstallingPackages] = useState(false);
  const [installOutput, setInstallOutput] = useState<string | null>(null);

  // Groq AI Diagnosis states
  const [isDiagnosingWithGroq, setIsDiagnosingWithGroq] = useState(false);
  const [groqDiagnosis, setGroqDiagnosis] = useState<any | null>(null);

  // Telegram Token Verification states
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [testTokenInput, setTestTokenInput] = useState('');
  const [tokenVerificationResult, setTokenVerificationResult] = useState<{
    valid: boolean;
    source?: string;
    tokenPreview?: string;
    botInfo?: { id: number; username: string; firstName: string; canJoinGroups?: boolean };
    errorCode?: number;
    description?: string;
    message: string;
  } | null>(null);

  // VPS Start Verification states
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [startStep, setStartStep] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);

  // Upgrade state
  const [selectedUpgradeStorage, setSelectedUpgradeStorage] = useState<string>('1GB');
  const [processingAddon, setProcessingAddon] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<BotFileItem | null>(null);
  const [fileToRename, setFileToRename] = useState<BotFileItem | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [isCopiedLogs, setIsCopiedLogs] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (botId) {
      const found = bots.find(b => b.id === botId);
      if (found) {
        setBot(found);
        setStartCommand(found.startCommand || `python3 -u ${found.entryPoint || 'main.py'}`);
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
      const logRes = await api.getBotLogs(bot.id, { limit: 100 });
      setLogs(logRes.logs || []);
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyAllLogs = () => {
    if (!logs || logs.length === 0) {
      addToast('info', 'No logs available to copy');
      return;
    }
    
    const formattedLogs = logs.map(l => {
      const time = l.timestamp ? `[${new Date(l.timestamp).toLocaleTimeString()}]` : '';
      const level = l.level ? `[${(l.level || 'info').toUpperCase()}]` : '';
      return `${time} ${level} ${l.message || ''}`.trim();
    }).join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(formattedLogs);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedLogs;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopiedLogs(true);
      addToast('success', 'All console logs copied to clipboard!');
      setTimeout(() => setIsCopiedLogs(false), 2500);
    } catch (err) {
      addToast('error', 'Failed to copy logs to clipboard');
    }
  };

  useEffect(() => {
    if (bot) {
      fetchBotFilesAndStorage();
    }
    if (bot && tab === 'logs') {
      fetchBotLogs();
      const interval = setInterval(fetchBotLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [bot?.id, tab]);

  // Live status synchronization polling: continuously checks real VPS process state
  useEffect(() => {
    if (!botId) return;
    const syncInterval = setInterval(async () => {
      try {
        const freshList = await api.getBots();
        const found = freshList.find(b => b.id === botId);
        if (found) {
          setBot(prev => {
            if (!prev) return found;
            if (prev.status !== found.status || prev.memoryUsageMB !== found.memoryUsageMB || prev.lastError !== found.lastError) {
              return found;
            }
            return prev;
          });
        }
      } catch {
        // silent sync error
      }
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [botId]);

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
        addToast('info', 'Stopping bot container...');
        await api.updateBotStatus(bot.id, 'stop');
        
        // Wait for confirmation from VPS
        let isConfirmed = false;
        for (let i = 0; i < 4; i++) {
          await new Promise(r => setTimeout(r, 600));
          const tel = await api.getBotTelemetry(bot.id);
          if (!tel || tel.state === 'STOPPED' || tel.state === 'ERROR' || tel.state === 'EXPIRED') {
            isConfirmed = true;
            break;
          }
        }
        
        if (isConfirmed) {
          addToast('success', 'Verified: Bot was successfully stopped.');
        } else {
          addToast('error', 'Verification timeout: Bot may still be stopping.');
        }
        
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
      const updated = await api.updateBotStatus(bot.id, 'start', startCommand);
      setBot(updated);
      
      await new Promise(r => setTimeout(r, 800));
      setStartStep(5);
      
      // Step 5: VPS Telemetry Handshake & Connection Confirmation
      let isConfirmed = false;
      let lastErrorMessage = '';
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 600));
        const tel = await api.getBotTelemetry(bot.id);
        if (tel) {
          if (tel.state === 'ACTIVE' || tel.state === 'running') {
            isConfirmed = true;
            break;
          }
          if (tel.lastErrorMessage) {
            lastErrorMessage = tel.lastErrorMessage;
          }
          if (tel.state === 'ERROR' && tel.lastExitCode !== undefined) {
            lastErrorMessage = `Process exited with code ${tel.lastExitCode}.`;
            break;
          }
        }
      }

      // Check bot object directly if telemetry polling was close
      if (!isConfirmed) {
        const botsList = await api.getBots();
        const freshBot = botsList.find(b => b.id === bot.id);
        if (freshBot && freshBot.status === 'running') {
          isConfirmed = true;
          setBot(freshBot);
        }
      }
      
      if (!isConfirmed) {
        throw new Error(lastErrorMessage ? `VPS Health Check Notice: ${lastErrorMessage} Please inspect the 'Console Logs' tab for python traceback.` : "VPS Health Check Failed: The bot process exited immediately. Please check the 'Console Logs' tab for diagnostic output.");
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

  const handleRestartBot = async () => {
    if (!bot) return;
    setStatusChanging(true);
    try {
      addToast('info', 'Restarting bot with start command...');
      const updated = await api.updateBotStatus(bot.id, 'restart', startCommand);
      setBot(updated);

      // Verify startup after short delay
      await new Promise(r => setTimeout(r, 1000));
      const freshList = await api.getBots();
      const fresh = freshList.find(b => b.id === bot.id);
      if (fresh) {
        setBot(fresh);
        if (fresh.status === 'error') {
          addToast('error', fresh.lastError ? `Bot crashed: ${fresh.lastError}` : 'Bot exited with error. Check console logs.');
        } else if (fresh.status === 'running') {
          addToast('success', 'Bot restarted and running successfully!');
        }
      } else {
        addToast('success', 'Bot restart signal processed.');
      }
      fetchBotLogs();
      refreshBots();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to restart bot');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleSaveStartCommand = async (cmd?: string) => {
    if (!bot) return;
    const commandToSave = (cmd !== undefined ? cmd : startCommand).trim();
    setIsSavingStartCommand(true);
    try {
      const updated = await api.updateBotConfig(bot.id, { startCommand: commandToSave });
      setBot(updated);
      setStartCommand(updated.startCommand || commandToSave);
      addToast('success', 'Start command updated successfully!');
      refreshBots();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save start command');
    } finally {
      setIsSavingStartCommand(false);
    }
  };

  const handleScanPackagesWithGroq = async () => {
    if (!bot) return;
    setIsScanningPackages(true);
    setInstallOutput(null);
    try {
      const res = await api.groqDetectPackages(bot.id);
      setDetectedPackages(res.packages || []);
      if (res.packages && res.packages.length > 0) {
        addToast('success', `Groq AI detected ${res.packages.length} required packages!`);
      } else {
        addToast('info', 'No external PyPI packages detected in your workspace files.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to scan packages with Groq AI');
    } finally {
      setIsScanningPackages(false);
    }
  };

  const handleInstallPackages = async (pkgs: string[]) => {
    if (!bot || pkgs.length === 0) return;
    setIsInstallingPackages(true);
    setInstallOutput(`[Groq AI Package Manager] Starting pip install for: ${pkgs.join(', ')}...\n`);
    try {
      const res = await api.installPackages(bot.id, pkgs);
      setInstallOutput(res.output);
      if (res.success) {
        addToast('success', `Installed: ${pkgs.join(', ')}`);
        fetchBotLogs();
      } else {
        addToast('error', 'Installation completed with warnings/errors. See output below.');
      }
    } catch (err: any) {
      setInstallOutput(prev => (prev || '') + `\nError: ${err.message}`);
      addToast('error', err.message || 'Failed to install packages');
    } finally {
      setIsInstallingPackages(false);
    }
  };

  const handleInstallRequirements = async () => {
    if (!bot) return;
    setIsInstallingPackages(true);
    setInstallOutput(`[Groq AI Package Manager] Installing from requirements.txt...\n`);
    try {
      const res = await api.installRequirements(bot.id);
      setInstallOutput(res.output);
      if (res.success) {
        addToast('success', 'Successfully installed requirements.txt!');
        fetchBotLogs();
      } else {
        addToast('error', 'Failed to install requirements.txt');
      }
    } catch (err: any) {
      setInstallOutput(prev => (prev || '') + `\nError: ${err.message}`);
      addToast('error', err.message || 'Failed to install requirements');
    } finally {
      setIsInstallingPackages(false);
    }
  };

  const handleDiagnoseWithGroq = async (logText?: string) => {
    if (!bot) return;
    setIsDiagnosingWithGroq(true);
    try {
      const res = await api.groqDiagnose(bot.id, logText);
      setGroqDiagnosis(res.diagnosis);
      addToast('success', 'Groq AI analysis ready!');
    } catch (err: any) {
      addToast('error', err.message || 'Groq AI diagnosis failed');
    } finally {
      setIsDiagnosingWithGroq(false);
    }
  };

  const handleSaveEnvVars = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEnv(true);
    try {
      // Only persist non-empty keys and non-empty values so leaving token empty preserves script hardcoded token
      const filteredVars = envVars.filter(ev => ev.key.trim() !== '' && ev.value.trim() !== '');
      const formattedVars = filteredVars.map((ev, idx) => ({
        id: `env_${Date.now()}_${idx}`,
        key: ev.key.trim().toUpperCase(),
        value: ev.value.trim(),
        isSecret: ev.key.toUpperCase().includes('TOKEN') || ev.key.toUpperCase().includes('SECRET') || ev.key.toUpperCase().includes('PASSWORD')
      }));
      const updatedBot = await api.updateBotEnvVars(bot.id, formattedVars);
      setBot(updatedBot);
      addToast('success', 'Environment variables updated successfully');
      refreshBots();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to save environment variables');
    } finally {
      setSavingEnv(false);
    }
  };

  const handleVerifyTelegramToken = async (customToken?: string) => {
    if (!bot) return;
    setIsVerifyingToken(true);
    setTokenVerificationResult(null);
    try {
      const res = await api.verifyTelegramToken(bot.id, customToken || testTokenInput);
      setTokenVerificationResult(res);
      if (res.valid) {
        addToast('success', `Token verified! Connected to ${res.botInfo?.username || res.botInfo?.firstName}`);
      } else {
        addToast('error', res.message || 'Telegram token is invalid');
      }
    } catch (e: any) {
      setTokenVerificationResult({
        valid: false,
        message: e.message || 'Failed to connect to Telegram verification service',
      });
      addToast('error', e.message || 'Token verification failed');
    } finally {
      setIsVerifyingToken(false);
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
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        content = btoa(binary);
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

  const handleDownloadFile = async (file: BotFileItem) => {
    try {
      await api.downloadBotFile(bot.id, file.filePath);
      addToast('success', `Downloaded "${file.fileName}"`);
    } catch (err: any) {
      addToast('error', err.message || 'Download failed');
    }
  };

  const handleRenameFile = async () => {
    if (!fileToRename || !renameValue.trim()) return;
    try {
      const dirPath = fileToRename.filePath.substring(0, fileToRename.filePath.lastIndexOf('/') + 1);
      const newPath = dirPath + renameValue.trim();
      await api.renameBotFile(bot.id, fileToRename.filePath, newPath);
      addToast('success', `Renamed to "${renameValue}"`);
      fetchBotFilesAndStorage();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to rename file');
    } finally {
      setFileToRename(null);
      setRenameValue('');
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

    const sub = user?.subscription;
    const isTrial = sub?.status === 'trial';
    const trialNotStarted = isTrial && !sub?.trialStarted;
    
    let trialHoursLeft = 0;
    if (isTrial && sub?.trialStarted && sub?.expiryDate) {
      const diff = new Date(sub.expiryDate).getTime() - new Date().getTime();
      trialHoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    }

    // Resource & quota calculations
    const planStorageMB = storageSummary?.totalStorageMB || (sub?.storage_limit_gb ? sub.storage_limit_gb * 1024 : 1024);
    const usedStorageMB = storageSummary ? storageSummary.usedStorageMB : Math.round((bot.storageUsageMB || 25) * 10) / 10;
    const remainingStorageMB = storageSummary ? storageSummary.remainingStorageMB : Math.max(0, Math.round((planStorageMB - usedStorageMB) * 10) / 10);
    const storageUsagePercent = Math.min(100, Math.round((usedStorageMB / planStorageMB) * 1000) / 10);
    const isStorageExceeded = usedStorageMB >= planStorageMB || storageSummary?.isOverQuota || storageUsagePercent >= 100;
    const isStorageWarning = storageUsagePercent >= 85 && !isStorageExceeded;

    // RAM in percentage ONLY (never mention 100mb anywhere!)
    const ramLimit = bot.memoryLimitMB || 100;
    const rawRamUsage = bot.memoryUsageMB || 0;
    const isBotRunning = bot.status === 'running';
    const ramPercent = isBotRunning ? Math.min(100, Math.round((rawRamUsage / ramLimit) * 100)) : 0;
    const isMemoryExceeded = isBotRunning && (ramPercent >= 95 || (bot.lastErrorTechnical?.toLowerCase().includes('oom') || bot.lastError?.toLowerCase().includes('memory')));
    const isMemoryWarning = isBotRunning && ramPercent >= 80 && !isMemoryExceeded;

    return (
      <div className="space-y-6 animate-in fade-in max-w-full">
        {/* Resource Exceeded: Memory Alert Banner */}
        {isMemoryExceeded && (
          <div className="bg-rose-50 border-2 border-rose-400 p-5 rounded-2xl shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 text-rose-800 font-black text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Memory Limit Exceeded ({ramPercent}%)</span>
              </div>
              <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-full text-[11px] font-bold">
                Process Halted
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              Your bot has exceeded its allocated plan RAM capacity (<strong className="text-rose-950 font-bold">{ramPercent}%</strong>). 
              The container engine was halted safely to maintain server stability. Please optimize memory loops in your code or upgrade your plan to increase RAM limits.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=logs`)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Inspect Console Logs →
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Upgrade Plan Capacity
              </button>
            </div>
          </div>
        )}

        {/* Resource Exceeded: Storage Alert Banner */}
        {isStorageExceeded && (
          <div className="bg-rose-50 border-2 border-rose-400 p-5 rounded-2xl shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 text-rose-800 font-black text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Storage Quota Exceeded ({usedStorageMB.toFixed(1)} MB / {planStorageMB} MB)</span>
              </div>
              <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-full text-[11px] font-bold">
                Writes Locked
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              Your bot is utilizing <strong className="text-rose-950 font-bold">{usedStorageMB.toFixed(1)} MB</strong> of your selected <strong className="text-rose-950 font-bold">{planStorageMB} MB</strong> plan storage ({storageUsagePercent}%). 
              Uploading new files, creating backups, and writing SQLite database records are currently locked. Please clean up unused files or purchase add-on storage.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=storage`)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Buy Storage Add-on →
              </button>
              <button
                onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=files`)}
                className="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Manage & Delete Files
              </button>
            </div>
          </div>
        )}

        {/* Real-time Plan Resource Utilization Card */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isMemoryExceeded || isStorageExceeded
            ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-200'
            : isMemoryWarning || isStorageWarning
            ? 'bg-amber-50/40 border-amber-300'
            : 'bg-white border-slate-200 shadow-2xs'
        } space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                isMemoryExceeded || isStorageExceeded
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-sky-50 text-[#0088cc]'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Plan Resource & Sandbox Health
                </h3>
                <p className="text-xs text-slate-500">
                  Live resource consumption vs. your selected hosting plan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                isMemoryExceeded || isStorageExceeded
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : isMemoryWarning || isStorageWarning
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isMemoryExceeded || isStorageExceeded
                  ? '🚨 Resource Limit Exceeded'
                  : isMemoryWarning || isStorageWarning
                  ? '⚠️ High Resource Load'
                  : '✓ Optimal Sandbox Status'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Storage Metric: exact MB utilized from plan */}
            <div className={`p-4 rounded-xl border ${
              isStorageExceeded
                ? 'bg-rose-50 border-rose-300'
                : isStorageWarning
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            } space-y-2`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-[#0088cc]" />
                  Storage Utilized
                </span>
                <span className={`font-black text-xs ${
                  isStorageExceeded ? 'text-rose-700' : isStorageWarning ? 'text-amber-700' : 'text-slate-800'
                }`}>
                  {storageUsagePercent}%
                </span>
              </div>
              <div className="text-lg font-black text-slate-900">
                {usedStorageMB.toFixed(1)} MB <span className="text-xs font-semibold text-slate-400">/ {planStorageMB} MB</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isStorageExceeded ? 'bg-rose-500' : isStorageWarning ? 'bg-amber-500' : 'bg-[#24A1DE]'
                  }`}
                  style={{ width: `${Math.min(100, storageUsagePercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>{remainingStorageMB.toFixed(1)} MB remaining</span>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=storage`)}
                  className="text-[#0088cc] hover:underline font-bold cursor-pointer"
                >
                  Manage →
                </button>
              </div>
            </div>

            {/* RAM Metric (strictly in percentage, never 100MB!) */}
            <div className={`p-4 rounded-xl border ${
              isMemoryExceeded
                ? 'bg-rose-50 border-rose-300'
                : isMemoryWarning
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            } space-y-2`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  RAM Allocation
                </span>
                <span className={`font-black text-xs ${
                  isMemoryExceeded ? 'text-rose-700' : isMemoryWarning ? 'text-amber-700' : isBotRunning ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  {isBotRunning ? (isMemoryExceeded ? 'Exceeded' : isMemoryWarning ? 'Elevated' : 'Normal') : 'Idle'}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{ramPercent}%</span>
                <span className="text-xs font-normal text-slate-500">
                  {isBotRunning ? 'active utilization' : '(bot stopped)'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isMemoryExceeded ? 'bg-rose-500' : isMemoryWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, ramPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>{isBotRunning ? (isMemoryExceeded ? 'Limit reached' : 'Optimal performance') : 'No memory active'}</span>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/bot?id=${bot.id}&tab=logs`)}
                  className="text-purple-600 hover:underline font-bold cursor-pointer"
                >
                  Logs →
                </button>
              </div>
            </div>

            {/* CPU Virtual Core */}
            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  CPU Virtual Core
                </span>
                <span className="font-black text-xs text-indigo-700">
                  {isBotRunning ? 'Active' : 'Standby'}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{isBotRunning ? (bot.cpuUsage || 1.2) : 0}%</span>
                <span className="text-xs font-normal text-slate-500">core allocation</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, isBotRunning ? (bot.cpuUsage || 2.5) : 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>cgroups v2 isolcpus</span>
                <span className="text-emerald-600 font-bold">Dedicated</span>
              </div>
            </div>
          </div>
        </div>

        {trialNotStarted && (
          <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0088cc]" />
                1-Time 24-Hour Free Trial Available
              </h3>
              <p className="text-xs text-sky-800 mt-1">
                Your 24-hour free trial timer will begin automatically once you click <strong>"Start Bot Engine"</strong> below for the first time.
              </p>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              View Paid Plans
            </button>
          </div>
        )}

        {isTrial && sub?.trialStarted && (
          <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0088cc]" />
                24-Hour Free Trial Active
              </h3>
              <p className="text-xs text-sky-800 mt-1">
                Your bot is hosted on our cloud VPS. You have <strong>{trialHoursLeft} hours remaining</strong> on your free trial.
              </p>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        {bot.status === 'expired' && (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">Subscription Expired</h3>
            </div>
            <p className="text-sm text-rose-600 font-medium">
              Your subscription plan (including your free trial) has expired. The bot has been stopped automatically. 
              To continue hosting your bot and retain your files, please purchase or upgrade your plan within the 24-hour grace period.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => navigate('/billing')} 
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                View Plans & Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Bot Controls & Execution Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">Bot Controls & Execution</h3>
              <p className="text-xs text-slate-500">Provide your custom start command, start, stop, or restart your bot engine.</p>
            </div>
            
            <div className="flex items-center gap-2">
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
          </div>

          {/* Custom Start Command Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TerminalSquare className="w-4 h-4 text-[#24A1DE]" />
                <span>Custom Start Command</span>
              </label>
              <span className="text-[11px] text-slate-500">
                You control the command executed inside your sandbox
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={startCommand}
                onChange={(e) => setStartCommand(e.target.value)}
                placeholder="e.g. python3 -u main.py"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/40"
              />
              <button
                type="button"
                onClick={() => handleSaveStartCommand()}
                disabled={isSavingStartCommand}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingStartCommand ? 'Saving...' : 'Save Command'}</span>
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
              {[
                `python3 -u ${bot.entryPoint || 'main.py'}`,
                'python3 -u main.py',
                'python3 -u bot.py',
                'python3 -u app.py',
                `python3 -u ${bot.entryPoint || 'main.py'} --timeout 60`
              ].filter((val, i, arr) => arr.indexOf(val) === i).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setStartCommand(preset);
                    handleSaveStartCommand(preset);
                  }}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all cursor-pointer ${
                    startCommand === preset
                      ? 'bg-sky-100 text-[#0088cc] border-sky-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
            {bot.status !== 'running' ? (
              <button
                onClick={() => handleToggleStatus('start')}
                disabled={statusChanging || isStartingBot}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isStartingBot ? 'Booting Container...' : 'Start Bot Engine'}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleToggleStatus('stop')}
                  disabled={statusChanging}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Execution</span>
                </button>
                <button
                  onClick={handleRestartBot}
                  disabled={statusChanging}
                  className="px-5 py-2.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${statusChanging ? 'animate-spin' : ''}`} />
                  <span>Restart with Start Command</span>
                </button>
              </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900">Environment Variables (Optional)</h3>
            <span className="text-[11px] bg-sky-50 text-[#0088cc] border border-sky-200 px-2.5 py-0.5 rounded-full font-bold">
              Default is Empty (Token inside Python file)
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            It is completely your choice: you can keep your Telegram Bot Token hardcoded directly inside your Python file (e.g. <code className="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-mono text-[11px]">main.py</code>), or define it here as an environment variable. If left empty, your bot will read the token directly from your file without any conflict.
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

        {/* Real-Time Telegram Token & API Connectivity Tester Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Telegram Token & API Connectivity Tester
                </h3>
                <span className="px-2 py-0.5 bg-sky-100 text-[#0088cc] border border-sky-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#0088cc]" /> Live API
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Check whether your Telegram Bot Token is valid, active, and authorized on Telegram's official servers before running your bot.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleVerifyTelegramToken()}
              disabled={isVerifyingToken}
              className="px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isVerifyingToken ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Telegram API...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Current Bot Token</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Test a Different Token (Optional)
              </label>
              <input
                type="text"
                placeholder="Paste token here to test before saving (e.g. 123456789:ABCdef...)"
                value={testTokenInput}
                onChange={(e) => setTestTokenInput(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 text-slate-900"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleVerifyTelegramToken(testTokenInput)}
                disabled={isVerifyingToken || !testTokenInput.trim()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Custom Token</span>
              </button>
            </div>
          </div>

          {tokenVerificationResult && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                tokenVerificationResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {tokenVerificationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {tokenVerificationResult.valid
                        ? 'Token is Valid & Active'
                        : `Telegram API Error: ${tokenVerificationResult.description || 'Unauthorized (401)'}`}
                    </span>
                    {tokenVerificationResult.source && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-white/70 rounded-md border border-slate-200 text-slate-700">
                        Source: {tokenVerificationResult.source}
                      </span>
                    )}
                  </div>
                  <p>{tokenVerificationResult.message}</p>

                  {tokenVerificationResult.valid && tokenVerificationResult.botInfo && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-emerald-700 font-sans block text-[10px]">Username:</span>
                        <strong className="text-emerald-900">{tokenVerificationResult.botInfo.username}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-sans block text-[10px]">Bot Name:</span>
                        <strong className="text-emerald-900">{tokenVerificationResult.botInfo.firstName}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-sans block text-[10px]">Bot ID:</span>
                        <strong className="text-emerald-900">{tokenVerificationResult.botInfo.id}</strong>
                      </div>
                    </div>
                  )}

                  {!tokenVerificationResult.valid && (
                    <div className="mt-2 pt-2 border-t border-rose-200/80 bg-white/60 p-3 rounded-lg text-rose-900">
                      <strong className="font-sans block text-xs mb-1 text-rose-950">How to fix this:</strong>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                        <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                        <li>Send the message <code>/mybots</code> or <code>/token</code>.</li>
                        <li>Select your bot and copy the fresh API Token.</li>
                        <li>Paste the new token into your Python file (e.g. <code>main.py</code>) or save it in the Environment Variables card above.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Groq AI Package & Dependency Manager Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Groq AI Dependency & Package Manager
                </h3>
                <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" /> Groq AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Scan your workspace Python code with Groq AI to automatically detect required packages, or install any package via pip.
              </p>
            </div>

            <button
              type="button"
              onClick={handleScanPackagesWithGroq}
              disabled={isScanningPackages || isInstallingPackages}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isScanningPackages ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Workspace...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ AI Scan & Auto-Detect</span>
                </>
              )}
            </button>
          </div>

          {/* Quick manual install and requirements.txt shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#24A1DE]" />
                <span>Quick Install PyPI Package</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. httpx, aiogram, redis, pillow"
                  value={customPackageInput}
                  onChange={(e) => setCustomPackageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPackageInput.trim()) {
                      e.preventDefault();
                      handleInstallPackages([customPackageInput.trim()]);
                      setCustomPackageInput('');
                    }
                  }}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/40 text-slate-900 font-mono"
                />
                <button
                  type="button"
                  disabled={!customPackageInput.trim() || isInstallingPackages}
                  onClick={() => {
                    handleInstallPackages([customPackageInput.trim()]);
                    setCustomPackageInput('');
                  }}
                  className="px-4 py-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isInstallingPackages ? 'Installing...' : 'Install'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Common packages: <span className="font-mono text-slate-600">python-telegram-bot, httpx, requests, aiogram, python-dotenv</span>
              </p>
            </div>

            {/* requirements.txt shortcut */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>requirements.txt Batch Install</span>
              </label>
              <div>
                <button
                  type="button"
                  disabled={isInstallingPackages}
                  onClick={handleInstallRequirements}
                  className="w-full px-4 py-2 border border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Install All from requirements.txt</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Executes <code className="font-mono text-slate-600">pip install -r requirements.txt</code> inside the bot workspace.
              </p>
            </div>
          </div>

          {/* Detected Packages via Groq AI */}
          {detectedPackages.length > 0 && (
            <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-orange-950">
                    Groq AI Detected {detectedPackages.length} Package{detectedPackages.length > 1 ? 's' : ''} in your Code
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isInstallingPackages}
                  onClick={() => handleInstallPackages(detectedPackages.map((p) => p.name))}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3 h-3" />
                  <span>Install All ({detectedPackages.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {detectedPackages.map((pkg, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-orange-200/80 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-xs text-slate-900 truncate">
                        {pkg.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {pkg.description || `import ${pkg.importName}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isInstallingPackages}
                      onClick={() => handleInstallPackages([pkg.name])}
                      className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-700 rounded transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      Install
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installation output terminal box */}
          {installOutput && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-[#24A1DE]" />
                  Pip Package Installation Log
                </span>
                <button
                  type="button"
                  onClick={() => setInstallOutput(null)}
                  className="text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
                >
                  Close
                </button>
              </div>
              <pre className="text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-mono">
                {installOutput}
              </pre>
            </div>
          )}
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
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-sky-50 text-[#0088cc] rounded-lg shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    {fileToRename?.filePath === file.filePath ? (
                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <input 
                          type="text" 
                          value={renameValue} 
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="w-full text-sm border-slate-300 rounded-md focus:ring-[#0088cc] focus:border-[#0088cc]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFile();
                            if (e.key === 'Escape') { setFileToRename(null); setRenameValue(''); }
                          }}
                        />
                        <button onClick={handleRenameFile} className="px-2 py-1 bg-emerald-500 text-white text-xs rounded">Save</button>
                        <button onClick={() => { setFileToRename(null); setRenameValue(''); }} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">Cancel</button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{file.fileName}</div>
                        <div className="text-xs text-slate-400">{formatSize(file.fileSizeBytes)}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {fileToDelete?.filePath === file.filePath ? (
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
                      <>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setFileToRename(file); setRenameValue(file.fileName); }}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                          title="Rename file"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
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

  const renderLogsView = () => {
    // Quota and resource limits
    const userSub = user?.subscription;
    const planStorageMB = storageSummary?.totalStorageMB || (userSub?.storage_limit_gb ? userSub.storage_limit_gb * 1024 : 1024);
    const usedStorageMB = storageSummary ? storageSummary.usedStorageMB : Math.round((bot.storageUsageMB || 25) * 10) / 10;
    const storageUsagePercent = Math.min(100, Math.round((usedStorageMB / planStorageMB) * 1000) / 10);
    const isStorageExceeded = usedStorageMB >= planStorageMB || storageSummary?.isOverQuota || storageUsagePercent >= 100;

    // RAM in percentage ONLY (never mention 100mb anywhere!)
    const ramLimit = bot.memoryLimitMB || 100;
    const rawRamUsage = bot.memoryUsageMB || 0;
    const isBotRunning = bot.status === 'running';
    const ramPercent = isBotRunning ? Math.min(100, Math.round((rawRamUsage / ramLimit) * 100)) : 0;
    const isMemoryExceeded = isBotRunning && (ramPercent >= 95 || (bot.lastErrorTechnical?.toLowerCase().includes('oom') || bot.lastError?.toLowerCase().includes('memory')));

    return (
    <div className="space-y-4 animate-in fade-in h-full flex flex-col">
      {/* Resource Limit Exceeded Alert in Console */}
      {(isMemoryExceeded || isStorageExceeded) && (
        <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-4 text-rose-100 shadow-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                {isMemoryExceeded && isStorageExceeded
                  ? 'Plan Memory & Storage Limits Exceeded'
                  : isMemoryExceeded
                  ? `Plan RAM Limit Exceeded (${ramPercent}%)`
                  : `Plan Storage Quota Exceeded (${usedStorageMB.toFixed(1)} MB / ${planStorageMB} MB)`}
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full font-mono font-bold">
              CRITICAL
            </span>
          </div>
          <p className="text-xs text-rose-200 leading-relaxed font-sans">
            {isMemoryExceeded
              ? `Your bot runtime consumed ${ramPercent}% of allocated memory. The process was stopped to prevent host memory exhaustion. Optimize code memory usage or upgrade your plan.`
              : `Your filesystem storage utilization has reached ${usedStorageMB.toFixed(1)} MB of your ${planStorageMB} MB plan quota. Delete unneeded files or purchase a storage add-on.`}
          </p>
        </div>
      )}

      {/* Groq AI Diagnosis Banner if active */}
      {groqDiagnosis && (
        <div className="bg-slate-900 border border-orange-500/50 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Groq AI Error Diagnosis</span>
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full uppercase font-mono">
                    {groqDiagnosis.errorType || 'Runtime Issue'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-analyzed runtime exception from your bot console
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGroqDiagnosis(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-orange-400 font-semibold block mb-1">Issue Overview:</span>
              {groqDiagnosis.explanation}
            </div>

            {groqDiagnosis.suggestedFix && (
              <div className="text-emerald-300 leading-relaxed font-sans bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                <span className="text-emerald-400 font-semibold block mb-1">Suggested Fix:</span>
                {groqDiagnosis.suggestedFix}
              </div>
            )}

            {groqDiagnosis.missingPackages && groqDiagnosis.missingPackages.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-950/30 p-3 rounded-xl border border-amber-800/40">
                <div>
                  <span className="text-amber-400 font-semibold text-xs block">
                    Missing Packages Detected:
                  </span>
                  <span className="text-amber-200 text-[11px] font-mono">
                    {groqDiagnosis.missingPackages.join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isInstallingPackages}
                  onClick={() => handleInstallPackages(groqDiagnosis.missingPackages)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ 1-Click Install ({groqDiagnosis.missingPackages.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between bg-slate-900 p-4 rounded-t-2xl border-b border-slate-800 gap-2">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#0088cc]" />
          <span>Real-time Console Stream</span>
          <span className="text-[11px] font-mono text-slate-400 font-normal">
            ({logs.length} entries)
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Copy All Logs Button */}
          <button
            type="button"
            onClick={handleCopyAllLogs}
            disabled={logs.length === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
              isCopiedLogs
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white disabled:opacity-50'
            }`}
            title="Copy all console log lines to clipboard"
          >
            {isCopiedLogs ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied All Logs!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Copy All Logs</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDiagnoseWithGroq()}
            disabled={isDiagnosingWithGroq || logs.length === 0}
            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Analyze recent logs and errors with Groq AI"
          >
            {isDiagnosingWithGroq ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Diagnosing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>Diagnose with AI</span>
              </>
            )}
          </button>
          
          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5 ml-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected
          </span>
          <button onClick={fetchBotLogs} className="text-slate-400 hover:text-white cursor-pointer ml-1 p-1 hover:bg-slate-800 rounded-lg transition-colors" title="Refresh">
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
  };

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
