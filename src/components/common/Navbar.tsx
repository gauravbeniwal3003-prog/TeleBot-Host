import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Terminal, Cpu, ShieldCheck, ArrowRight, DollarSign, IndianRupee, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, currency, setCurrency } = useAuth();

  const desktopNavLinks = [
    { label: 'Main Landing Page', path: '/' },
    { label: 'Pricing', path: '/pricing' },
  ];

  const sideMenuLinks = [
    { label: 'Main Landing Page', path: '/' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Why Choose Us', path: '/why-choose-us' },
  ];

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => handleNavClick('/')}
            className="cursor-pointer transition-opacity hover:opacity-90"
            id="brand-logo-nav"
          >
            <BrandLogo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {desktopNavLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.path)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#0088cc] bg-sky-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <button
                onClick={() => handleNavClick('/dashboard')}
                className="inline-flex items-center gap-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all cursor-pointer"
                id="btn-nav-dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('/login')}
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  id="btn-nav-login"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleNavClick('/register')}
                  className="inline-flex items-center gap-1.5 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-xs hover:shadow transition-all cursor-pointer"
                  id="btn-nav-getstarted"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Off-Canvas Corner Drawer Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sheet docked to top right corner */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl p-5 flex flex-col justify-between md:hidden animate-in slide-in-from-right duration-200 border-l border-slate-200">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {sideMenuLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.path)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      currentPath === link.path ? 'bg-sky-50 text-[#0088cc]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              {user ? (
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className="w-full flex items-center justify-center gap-2 bg-[#24A1DE] text-white py-3 rounded-xl text-sm font-medium shadow-xs cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNavClick('/login')}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => handleNavClick('/register')}
                    className="w-full text-center py-2.5 rounded-xl bg-[#24A1DE] text-white font-medium shadow-xs text-xs cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};
