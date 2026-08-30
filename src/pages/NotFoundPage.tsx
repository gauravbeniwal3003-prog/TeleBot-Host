import React from 'react';
import { BrandLogo } from '../components/common/BrandLogo';
import { AlertTriangle, Home, Bot, BookOpen, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  navigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-sky-50 text-[#0088cc] rounded-full flex items-center justify-center mx-auto ring-8 ring-sky-50/50">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
          <p className="text-xs text-slate-500">
            The page you are looking for has been moved, renamed, or does not exist.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <button
            onClick={() => navigate('/')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-700 flex flex-col items-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4 text-[#0088cc]" />
            <span>Home</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-700 flex flex-col items-center gap-1.5 transition-colors"
          >
            <Bot className="w-4 h-4 text-[#0088cc]" />
            <span>Dashboard</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
      </div>
    </div>
  );
};
