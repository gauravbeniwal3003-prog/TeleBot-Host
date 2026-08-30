import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, ShieldCheck, X, Check, Key } from 'lucide-react';

interface ProfileSettingsModalProps {
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ onClose }) => {
  const { user, updateProfile, changePassword, addToast } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [telegramUsername, setTelegramUsername] = useState(user?.telegramUsername || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name,
        telegramUsername: telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`,
      });
    } catch (e: any) {
      addToast('error', e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      addToast('error', 'Password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      addToast('error', e.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#24A1DE]/10 text-[#0088cc] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Account & Security Settings</h3>
              <p className="text-xs text-slate-500">Manage your profile and authentication credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Profile Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1">
              Personal Information
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400">Email is linked to your billing account and cannot be modified.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Telegram Username</label>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>

          {/* Password Change Form */}
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-slate-600" />
              <span>Change Password</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
