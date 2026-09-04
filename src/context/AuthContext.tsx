import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, TelegramBot } from '../types';
import { api } from '../services/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  currency: 'INR' | 'USD';
  setCurrency: (c: 'INR' | 'USD') => void;
  toasts: Toast[];
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  login: (email: string, pass?: string) => Promise<void>;
  loginTelegram: (username?: string, email?: string) => Promise<void>;
  register: (name: string, email: string, pass?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateProfile: (data: { name?: string; telegramUsername?: string; avatarUrl?: string }) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  bots: TelegramBot[];
  refreshBots: (projId?: string) => Promise<void>;
  projects: any[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem('telehost_active_project_id');
  });
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);
    if (id) {
      localStorage.setItem('telehost_active_project_id', id);
    } else {
      localStorage.removeItem('telehost_active_project_id');
    }
  };

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshUserData = async () => {
    try {
      const u = await api.getCurrentUser();
      setUser(u);
      return u;
    } catch (e) {
      console.error('Error loading user:', e);
      setUser(null);
      return null;
    }
  };

  const refreshProjects = async () => {
    try {
      const res = await api.getProjects();
      const projs = res.projects || [];
      setProjects(projs);
      if (projs.length > 0) {
        const match = projs.find((p: any) => p.id === activeProjectId);
        if (!match) {
          setActiveProjectId(projs[0].id);
        }
      } else {
        setActiveProjectId(null);
      }
    } catch (e) {
      console.error('Error loading projects:', e);
      setProjects([]);
      setActiveProjectId(null);
    }
  };

  const refreshBots = async (projId?: string) => {
    try {
      const targetProjId = projId || activeProjectId || undefined;
      const b = await api.getBots(targetProjId);
      setBots(b);
    } catch (e) {
      console.error('Error loading bots:', e);
      setBots([]);
    }
  };

  // Re-fetch bots whenever the active project changes
  useEffect(() => {
    if (user && activeProjectId) {
      refreshBots(activeProjectId);
    }
  }, [activeProjectId, user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = await refreshUserData();
      if (currentUser) {
        await refreshProjects();
        await refreshBots();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, pass?: string) => {
    const u = await api.login(email, pass);
    setUser(u);
    await refreshProjects();
    await refreshBots();
    addToast('success', `Welcome back, ${u.name}!`);
  };

  const loginTelegram = async (username?: string, email?: string) => {
    const u = await api.loginTelegram(username, email);
    setUser(u);
    await refreshProjects();
    await refreshBots();
    addToast('success', `Authenticated as ${u.name}`);
  };

  const register = async (name: string, email: string, pass?: string) => {
    const u = await api.register(name, email, pass);
    setUser(u);
    await refreshProjects();
    await refreshBots();
    addToast('success', `Account created successfully! Your 24-hour free trial starts when you host your bot.`);
  };

  const updateProfile = async (data: { name?: string; telegramUsername?: string; avatarUrl?: string }) => {
    const u = await api.updateProfile(data);
    setUser(u);
    addToast('success', 'Profile updated successfully.');
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    await api.changePassword(currentPass, newPass);
    addToast('success', 'Password updated successfully.');
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setBots([]);
    addToast('info', 'Logged out successfully.');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        currency,
        setCurrency,
        toasts,
        addToast,
        removeToast,
        login,
        loginTelegram,
        register,
        logout,
        refreshUserData,
        updateProfile,
        changePassword,
        bots,
        refreshBots,
        projects,
        activeProjectId,
        setActiveProjectId,
        refreshProjects,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
