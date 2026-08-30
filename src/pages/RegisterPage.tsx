import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service & Privacy Policy');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim() || 'Developer', email.trim(), password);
      navigate('/dashboard');
    } catch (e: any) {
      setErrorMessage(e.message || 'Registration failed. Please try again.');
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
            Create Free Account
          </h2>
          <p className="text-xs text-slate-500">
            24-hour free trial starts when your bot is hosted · No card required
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Free trial feature banner */}
        <div className="p-3 bg-sky-50 rounded-xl border border-sky-200/80 text-xs text-sky-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sky-950">
            <ShieldCheck className="w-4 h-4 text-[#0088cc] shrink-0" />
            <span>24-Hour Free Trial Included</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-normal pl-6">
            Timer starts automatically when your bot is hosted for the first time. Includes 1 bot slot & 50MB storage.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Developer Name"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#24A1DE] text-xs text-slate-900"
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

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
            <label className="font-bold text-slate-700 block mb-1">Password</label>
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

          <div className="pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-300 text-[#24A1DE] focus:ring-0"
              />
              <span className="text-[11px]">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-[#0088cc] underline"
                >
                  Terms
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="text-[#0088cc] underline"
                >
                  Privacy
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="btn-register-submit"
          >
            <span>{loading ? 'Creating...' : 'Start Free Trial'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Already registered?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-[#0088cc] font-bold hover:underline cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};
