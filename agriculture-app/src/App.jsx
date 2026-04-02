import React, { useState, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

// Lazy load pages for better performance
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Crops = lazy(() => import('./pages/Crops'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Sales = lazy(() => import('./pages/Sales'));
const Weather = lazy(() => import('./pages/Weather'));
const AIAdvisor = lazy(() => import('./pages/AIAdvisor'));
const Settings = lazy(() => import('./pages/Settings'));

const PAGE_SPINNER = (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
  </div>
);

function AppContent() {
  const { user, authLoading } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2s2-3 7-3c0 0-5 2-5 6 0 0-4 2-10 2 0 0-2-4 4-7 0 0 2 1 2 4 0 0 2-2 5-3 3-1 6 0 6 0z"/>
            </svg>
          </div>
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-stone-400 text-sm">Loading My Agriculture...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-stone-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>}>
        <Auth />
      </Suspense>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'crops': return <Crops />;
      case 'expenses': return <Expenses />;
      case 'sales': return <Sales />;
      case 'weather': return <Weather />;
      case 'aiAdvisor': return <AIAdvisor />;
      case 'settings': return <Settings />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={PAGE_SPINNER}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '14px',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#fff' },
            style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
            style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
          },
        }}
      />
    </AppProvider>
  );
}
