import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminPanelModal } from '../components/dashboard/AdminPanelModal';
import { ShieldAlert, Lock, ArrowLeft, LogIn, LayoutDashboard } from 'lucide-react';

interface AdminPageProps {
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ navigate }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#24A1DE] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Verifying administrator credentials...</p>
      </div>
    );
  }

  // If the user is signed in with an admin account, directly open the full Admin Panel!
  if (user && (isAdmin || user.role === 'admin')) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 animate-in fade-in">
        <AdminPanelModal embedded={true} navigate={navigate} />
      </div>
    );
  }

  // If the user is NOT signed in with an admin account, show the restricted unauthorized screen
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-in zoom-in-95">
      <div className="bg-white max-w-lg w-full rounded-3xl border-2 border-rose-300 shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Top Warning Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-red-500 to-rose-700" />

        {/* Warning Icon Badge */}
        <div className="w-20 h-20 bg-rose-100 border-2 border-rose-200 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* 403 Badge */}
        <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-black tracking-widest uppercase mb-3">
          403 Access Denied
        </span>

        {/* Main Heading requested by user */}
        <h1 className="text-3xl sm:text-4xl font-black text-rose-950 tracking-tight mb-3">
          Fuck You
        </h1>

        {/* Description */}
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6 font-medium">
          You do not have permission to access the <strong>Admin Control Panel</strong>. This private control terminal is strictly reserved for verified platform administrators.
        </p>

        {/* User Account Status Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-8 text-xs text-left font-mono">
          <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Current Session Status</div>
          <div className="text-slate-800 flex items-center justify-between">
            <span>Account:</span>
            <span className="font-bold text-slate-900">{user?.email || 'Not Logged In (Guest)'}</span>
          </div>
          <div className="text-slate-800 flex items-center justify-between mt-1">
            <span>Role:</span>
            <span className="font-bold text-rose-600 uppercase">{user?.role || 'None'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {!user ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-5 bg-[#0088cc] hover:bg-[#24A1DE] text-white rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Admin Account</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 px-5 bg-[#0088cc] hover:bg-[#24A1DE] text-white rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to User Dashboard</span>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
