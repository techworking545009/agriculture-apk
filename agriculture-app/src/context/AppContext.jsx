import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  language: 'en',
  currency: 'PKR',
  theme: 'light',
  readOnlyMode: false,
  privacyMode: false,
  targetProfitGoal: 100000,
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('agri_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Auth listener - with proper cleanup to prevent multiple listeners
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    // Cleanup: unsubscribe on unmount
    return () => unsubscribe();
  }, []); // Empty deps - only run once

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('agri_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isRTL = settings.language === 'ur';

  const t = useCallback((key) => {
    const translations = {
      en: {
        signIn: 'Sign In',
        createAccount: 'Create Account',
        welcomeBack: 'Welcome Back',
        joinUs: 'Join Us',
        emailAddress: 'Email Address',
        password: 'Password',
        forgot: 'Forgot?',
        resetPassword: 'Reset Password',
        backToLogin: 'Back to Login',
        sendResetLink: 'Send Reset Link',
        enterCredentials: 'Enter your credentials to continue',
        startJourney: 'Start your farming journey today',
        enterEmailReset: 'Enter your email to receive a reset link',
        google: 'Google',
        github: 'GitHub',
        orContinueWith: 'or continue with',
        dontHaveAccount: "Don't have an account? Sign up",
        alreadyHaveAccount: 'Already have an account? Sign in',
        tryQuickDemo: 'Try Quick Demo',
        futureFarmManagement: 'Future Farm Management',
        dashboard: 'Dashboard',
        crops: 'Crops',
        expenses: 'Expenses',
        sales: 'Sales',
        inventory: 'Inventory',
        weather: 'Weather',
        aiAdvisor: 'AI Advisor',
        analytics: 'Analytics',
        reports: 'Reports',
        budget: 'Budget',
        settings: 'Settings',
        appInfo: 'App Info',
        addExpense: 'Add Expense',
        addSale: 'Add Sale',
        totalExpenses: 'Total Expenses',
        totalRevenue: 'Total Revenue',
        netProfit: 'Net Profit',
        weatherForecast: 'Weather Forecast',
        wind: 'Wind',
        humidity: 'Humidity',
        feelsLike: 'Feels Like',
        pressure: 'Pressure',
        typeMessage: 'Type your question in Urdu or English...',
        loadMore: 'Load More',
        noCropsFound: 'No Crops Found',
        addFirstCrop: 'Add your first crop to get started',
        cropName: 'Crop Name',
        cropType: 'Crop Type',
        optional: 'optional',
        stockLevel: 'Stock Level',
        reorderPoint: 'Reorder Point',
        addCropTitle: 'Add New Crop',
        editCropTitle: 'Edit Crop',
        signOut: 'Sign Out',
      },
      ur: {
        signIn: 'سائن ان',
        createAccount: 'اکاؤنٹ بنائیں',
        welcomeBack: 'خوش آمدید',
        joinUs: 'ہمارے ساتھ شامل ہوں',
        emailAddress: 'ای میل پتہ',
        password: 'پاسورڈ',
        forgot: 'بھول گئے؟',
        resetPassword: 'پاسورڈ ری سیٹ',
        backToLogin: 'لاگ ان پر واپس',
        sendResetLink: 'ری سیٹ لنک بھیجیں',
        enterCredentials: 'جاری رکھنے کے لیے اپنی تفصیلات درج کریں',
        startJourney: 'آج اپنا کاشتکاری سفر شروع کریں',
        enterEmailReset: 'ری سیٹ لنک کے لیے ای میل درج کریں',
        google: 'گوگل',
        github: 'گٹ ہب',
        orContinueWith: 'یا جاری رکھیں',
        dontHaveAccount: 'اکاؤنٹ نہیں ہے؟ سائن اپ کریں',
        alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟ سائن ان کریں',
        tryQuickDemo: 'ڈیمو آزمائیں',
        futureFarmManagement: 'مستقبل کی کاشتکاری',
        dashboard: 'ڈیش بورڈ',
        crops: 'فصلیں',
        expenses: 'اخراجات',
        sales: 'فروخت',
        inventory: 'انوینٹری',
        weather: 'موسم',
        aiAdvisor: 'اے آئی مشیر',
        analytics: 'تجزیہ',
        reports: 'رپورٹس',
        budget: 'بجٹ',
        settings: 'ترتیبات',
        appInfo: 'ایپ کی معلومات',
        addExpense: 'خرچ شامل کریں',
        addSale: 'فروخت شامل کریں',
        totalExpenses: 'کل اخراجات',
        totalRevenue: 'کل آمدنی',
        netProfit: 'خالص منافع',
        weatherForecast: 'موسمی پیشن گوئی',
        wind: 'ہوا',
        humidity: 'نمی',
        feelsLike: 'محسوس درجہ',
        pressure: 'دباؤ',
        typeMessage: 'اردو یا انگریزی میں سوال لکھیں...',
        loadMore: 'مزید لوڈ کریں',
        noCropsFound: 'کوئی فصل نہیں ملی',
        addFirstCrop: 'شروع کرنے کے لیے اپنی پہلی فصل شامل کریں',
        cropName: 'فصل کا نام',
        cropType: 'فصل کی قسم',
        optional: 'اختیاری',
        stockLevel: 'اسٹاک سطح',
        reorderPoint: 'دوبارہ آرڈر نقطہ',
        addCropTitle: 'نئی فصل شامل کریں',
        editCropTitle: 'فصل میں ترمیم کریں',
        signOut: 'سائن آؤٹ',
      }
    };
    return translations[settings.language]?.[key] || translations.en[key] || key;
  }, [settings.language]);

  const formatCurrency = useCallback((amount, currency = settings.currency) => {
    try {
      if (isNaN(amount)) return '0';
      const num = Number(amount);
      if (currency === 'PKR') return `₨${num.toLocaleString('en-PK')}`;
      if (currency === 'USD') return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (currency === 'EUR') return `€${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${num.toLocaleString()}`;
    } catch {
      return String(amount);
    }
  }, [settings.currency]);

  return (
    <AppContext.Provider value={{
      user,
      authLoading,
      settings,
      updateSettings,
      isRTL,
      t,
      formatCurrency,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
