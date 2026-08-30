import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { ConfigurePlanPage } from './pages/ConfigurePlanPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { SingleBotWorkspacePage } from './pages/SingleBotWorkspacePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { BillingAndPlansPage } from './pages/BillingAndPlansPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ContactPage } from './pages/ContactPage';
import { WhyChooseUsPage } from './pages/WhyChooseUsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Toast icons
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 text-xs animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-950 ring-1 ring-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-white border-rose-200 text-rose-950 ring-1 ring-rose-500/20'
              : 'bg-white border-sky-200 text-sky-950 ring-1 ring-sky-500/20'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#0088cc] shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function MainRouter() {
  const { user } = useAuth();
  // Simple, robust path & search params management
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    return new URLSearchParams(window.location.search);
  });

  const navigate = (to: string) => {
    const [pathPart, queryPart] = to.split('?');
    const newPath = pathPart || '/';
    const newParams = new URLSearchParams(queryPart || '');

    window.history.pushState({}, '', to);
    setCurrentPath(newPath);
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

    const isDashboardRoute =
      currentPath.startsWith('/dashboard') ||
      currentPath === '/dashboard' ||
      Boolean(user && ['/configure', '/pricing', '/billing', '/docs', '/contact'].includes(currentPath));

    const renderInnerPage = () => {
      if (currentPath === '/dashboard/bot') {
        return <SingleBotWorkspacePage navigate={navigate} searchParams={searchParams} />;
      }
      
      switch (currentPath) {
        case '/':
          return <LandingPage navigate={navigate} />;
        case '/pricing':
          return user ? <BillingAndPlansPage navigate={navigate} /> : <PricingPage navigate={navigate} />;
        case '/billing':
          return <BillingAndPlansPage navigate={navigate} />;
        case '/configure':
          return <ConfigurePlanPage navigate={navigate} />;
        case '/login':
          return <LoginPage navigate={navigate} />;
        case '/register':
          return <RegisterPage navigate={navigate} />;
        case '/dashboard':
          return <DashboardOverviewPage navigate={navigate} />;
        case '/checkout':
          return <CheckoutPage navigate={navigate} searchParams={searchParams} />;
        case '/payment-success':
          return <PaymentSuccessPage navigate={navigate} searchParams={searchParams} />;
        case '/payment-failed':
          return <PaymentFailedPage navigate={navigate} searchParams={searchParams} />;
        case '/docs':
          return <DocumentationPage navigate={navigate} />;
        case '/terms':
          return <TermsPage navigate={navigate} />;
        case '/privacy':
          return <PrivacyPage navigate={navigate} />;
        case '/contact':
          return <ContactPage navigate={navigate} />;
        case '/why-choose-us':
          return <WhyChooseUsPage navigate={navigate} />;
        default:
          return <NotFoundPage navigate={navigate} />;
      }
    };

  if (isDashboardRoute) {
    return (
      <DashboardLayout currentPath={currentPath} navigate={navigate}>
        {renderInnerPage()}
        <ToastContainer />
      </DashboardLayout>
    );
  }

  const isAuthRoute = currentPath === '/login' || currentPath === '/register';
  const showFooter = currentPath === '/';
  const showNavbar = !isAuthRoute;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased">
      {showNavbar && <Navbar currentPath={currentPath} navigate={navigate} />}
      <main className="flex-1 flex flex-col">
        {renderInnerPage()}
      </main>
      {showFooter && <Footer navigate={navigate} />}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
