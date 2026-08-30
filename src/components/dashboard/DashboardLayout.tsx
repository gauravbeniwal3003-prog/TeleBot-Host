import React, { useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { AdminPanelModal } from './AdminPanelModal';
import {
  LayoutDashboard,
  Bot,
  Sliders,
  CreditCard,
  BookOpen,
  HelpCircle,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Bell,
  Cpu,
  HardDrive,
  ShieldCheck,
  ChevronRight,
  User,
  Zap,
  ExternalLink,
  Settings,
  ShieldAlert,
  Activity
} from 'lucide-react';

interface DashboardLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
  onOpenCreateBot?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPath,
  navigate,
  children,
  onOpenCreateBot,
}) => {
  const {
    user,
    logout,
    bots,
    isAdmin,
    projects,
    activeProjectId,
    setActiveProjectId,
    refreshProjects,
    addToast
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const activeProject = (projects || []).find((p) => p.id === activeProjectId);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await api.createProject(newProjectName.trim());
      await refreshProjects();
      if (res.project) {
        setActiveProjectId(res.project.id);
      }
      setNewProjectName('');
      setShowNewProjectInput(false);
      setProjectDropdownOpen(false);
      addToast('success', `Project "${newProjectName}" created!`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleProjectSelect = (id: string) => {
    setActiveProjectId(id);
    setProjectDropdownOpen(false);
    addToast('success', `Switched to environment: ${(projects || []).find((p) => p.id === id)?.name}`);
  };

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* Unified Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs h-16 shrink-0 z-30 sticky top-0 w-full max-w-full">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div onClick={() => navigate('/dashboard')} className="cursor-pointer">
              <BrandLogo size="md" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline-flex text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Hosting Status: 24/7 Active
            </span>

            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Profile Settings */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 overflow-hidden text-left hover:opacity-80 transition-opacity p-1 sm:p-1.5 rounded-xl border border-slate-100 cursor-pointer"
              title="Edit Profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#24A1DE]/15 text-[#0088cc] flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-slate-700 truncate max-w-[120px]">
                {user?.name || 'Telegram Dev'}
              </span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <ProfileSettingsModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Admin Panel Modal */}
      {showAdminModal && (
        <AdminPanelModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
};
