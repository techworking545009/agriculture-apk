import React, { useState } from 'react';
import {
  LayoutDashboard, Sprout, DollarSign, TrendingUp, Package,
  Cloud, Bot, BarChart2, FileText, PiggyBank, Settings, Info,
  Menu, X, Leaf, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, labelEn: 'Dashboard', labelUr: 'ڈیش بورڈ' },
  { key: 'crops', icon: Sprout, labelEn: 'Crops', labelUr: 'فصلیں' },
  { key: 'expenses', icon: DollarSign, labelEn: 'Expenses', labelUr: 'اخراجات' },
  { key: 'sales', icon: TrendingUp, labelEn: 'Sales', labelUr: 'فروخت' },
  { key: 'weather', icon: Cloud, labelEn: 'Weather', labelUr: 'موسم' },
  { key: 'aiAdvisor', icon: Bot, labelEn: 'AI Advisor', labelUr: 'اے آئی مشیر' },
  { key: 'settings', icon: Settings, labelEn: 'Settings', labelUr: 'ترتیبات' },
];

export default function Layout({ children, activeTab, setActiveTab }) {
  const { isRTL } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-stone-50 flex ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-stone-100 flex flex-col ${
          sidebarOpen
            ? 'translate-x-0'
            : (isRTL ? 'translate-x-full' : '-translate-x-full')
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-sm">My Agriculture</h1>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest">Farm Management</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ key, icon: Icon, labelEn, labelUr }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-100'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                <span className="flex-1">{isRTL ? labelUr : labelEn}</span>
                {isActive && <ChevronRight className={`w-4 h-4 text-white/70 ${isRTL ? 'rotate-180' : ''}`} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 text-center">
          <p className="text-[10px] text-stone-400">v2.0 — AgriCommand</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-stone-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-stone-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-stone-600" />
          </button>
          <h2 className="font-bold text-stone-900 text-base">
            {NAV_ITEMS.find(n => n.key === activeTab)?.[isRTL ? 'labelUr' : 'labelEn'] || ''}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 lg:hidden z-30 px-2 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.slice(0, 6).map(({ key, icon: Icon, labelEn, labelUr }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                  isActive ? 'text-emerald-600' : 'text-stone-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                <span className="text-[9px] font-bold">
                  {isRTL ? labelUr.split(' ')[0] : labelEn.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
