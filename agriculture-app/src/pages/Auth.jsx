import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { Leaf, ArrowRight, ArrowLeft, Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Auth() {
  const { t, isRTL, settings, updateSettings } = useApp();
  const [view, setView] = useState('landing'); // landing | login | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Countdown timer for lock - uses ref to avoid infinite loops
  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockUntil(null);
        setTimeLeft(0);
        setAttempts(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      } else {
        setTimeLeft(left);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [lockUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (view === 'login' && lockUntil && Date.now() < lockUntil) {
      toast.error(`Too many attempts. Try again in ${timeLeft}s`);
      return;
    }

    setLoading(true);
    try {
      if (view === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully!');
      } else if (view === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        toast.success('Password reset email sent!');
        setView('login');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
        setAttempts(0);
      }
    } catch (err) {
      let msg = 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
          const until = Date.now() + 1800000;
          setLockUntil(until);
          msg = 'Too many failed attempts. Locked for 30 minutes.';
        } else {
          msg = `Invalid credentials. ${3 - newAttempts} attempts remaining.`;
        }
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email already in use';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address';
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, 'demo@agri.smart', 'demo123');
      toast.success('Welcome to the demo!');
    } catch {
      try {
        await createUserWithEmailAndPassword(auth, 'demo@agri.smart', 'demo123');
        toast.success('Demo account created & logged in!');
      } catch {
        toast.error('Demo login failed. Please create your own account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-900 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[128px] opacity-20 animate-pulse bg-emerald-600" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[128px] opacity-15 bg-teal-600" style={{ animationDelay: '2s' }} />

      {/* Language switcher */}
      <div className="absolute top-6 right-6 z-50">
        <select
          value={settings.language}
          onChange={(e) => updateSettings({ language: e.target.value })}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none cursor-pointer"
        >
          <option value="en" className="bg-stone-900">English</option>
          <option value="ur" className="bg-stone-900">اردو (Urdu)</option>
        </select>
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        {view === 'landing' ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Leaf className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">My Agriculture</h1>
            <p className="text-stone-300 mb-10 text-lg">{t('futureFarmManagement')}</p>
            <div className="space-y-4">
              <button
                onClick={() => setView('login')}
                className="w-full py-4 bg-white/10 border border-white/20 rounded-xl text-white font-bold text-lg backdrop-blur-md hover:bg-white/20 transition-all flex items-center justify-center gap-3"
              >
                {t('signIn')} <ForwardArrow className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('signup')}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-bold text-lg shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                {t('createAccount')}
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="text-sm text-stone-400 hover:text-white transition-colors flex items-center justify-center gap-2 w-full"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {t('tryQuickDemo')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <button
              onClick={() => setView('landing')}
              className="mb-6 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <BackArrow className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-white mb-2">
              {t(view === 'login' ? 'welcomeBack' : view === 'signup' ? 'joinUs' : 'resetPassword')}
            </h2>
            <p className="text-stone-300 mb-8">
              {t(view === 'login' ? 'enterCredentials' : view === 'signup' ? 'startJourney' : 'enterEmailReset')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block">
                  {t('emailAddress')}
                </label>
                <div className="relative">
                  <Mail className={`absolute top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-black/20 border border-white/10 rounded-xl py-3.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              {view !== 'forgot' && (
                <div className="space-y-2">
                  <div className={`flex justify-between items-center px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      {t('password')}
                    </label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot')} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                        {t('forgot')}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`absolute top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 ${isRTL ? 'right-4' : 'left-4'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-black/20 border border-white/10 rounded-xl py-3.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${isRTL ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10'}`}
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-stone-400 hover:text-white ${isRTL ? 'left-4' : 'right-4'}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (view === 'login' && !!lockUntil)}
                className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (view === 'login' && lockUntil) ? (
                  `Wait (${timeLeft}s)`
                ) : (
                  t(view === 'login' ? 'signIn' : view === 'signup' ? 'createAccount' : 'sendResetLink')
                )}
              </button>
            </form>

            {view === 'forgot' && (
              <div className="mt-6 text-center">
                <button onClick={() => setView('login')} className="text-sm text-stone-400 hover:text-white transition-colors">
                  {t('backToLogin')}
                </button>
              </div>
            )}

            {view !== 'forgot' && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                  className="text-sm text-stone-400 hover:text-white transition-colors"
                >
                  {t(view === 'login' ? 'dontHaveAccount' : 'alreadyHaveAccount')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
