import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { Mail, Lock, ArrowRight, Send, Shield } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (e: any) {
      setErrorMessage(e.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-7 sm:p-9 rounded-2xl border border-slate-200 shadow-md">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div onClick={() => navigate('/')} className="cursor-pointer inline-block">
            <BrandLogo size="lg" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
            Sign In
          </h2>
          <p className="text-xs text-slate-500">
            Access your 24/7 Telegram bot hosting dashboard
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setErrorMessage('Demo password reset link dispatched to account email.')}
                className="text-[11px] text-[#0088cc] hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-[#24A1DE] focus:ring-0"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="btn-login-submit"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          No account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-[#0088cc] font-bold hover:underline cursor-pointer"
          >
            Create free account
          </button>
        </div>
      </div>
    </div>
  );
};
