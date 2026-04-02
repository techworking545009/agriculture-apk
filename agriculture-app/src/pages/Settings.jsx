import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { LogOut, Settings as SettingsIcon, Shield, Eye, EyeOff, Target, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { t, isRTL, settings, updateSettings } = useApp();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch {
      toast.error('Sign out failed');
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-stone-900">{t('settings')}</h1>

      {/* Language */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-stone-900">{isRTL ? 'زبان' : 'Language'}</h3>
        </div>
        <select
          value={settings.language}
          onChange={(e) => updateSettings({ language: e.target.value })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
        >
          <option value="en">English</option>
          <option value="ur">اردو (Urdu)</option>
        </select>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
        <h3 className="font-bold text-stone-900 mb-4">{isRTL ? 'کرنسی' : 'Currency'}</h3>
        <select
          value={settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
        >
          <option value="PKR">PKR (₨)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="SAR">SAR (﷼)</option>
        </select>
      </div>

      {/* Target Profit */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-stone-900">{isRTL ? 'ہدف منافع' : 'Target Profit Goal'}</h3>
        </div>
        <input
          type="number"
          value={settings.targetProfitGoal || 100000}
          onChange={(e) => updateSettings({ targetProfitGoal: Number(e.target.value) })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          min="0"
        />
        <p className="text-xs text-stone-400 mt-2">{isRTL ? 'ڈیش بورڈ پر پیش رفت دکھاتا ہے' : 'Shows progress on dashboard'}</p>
      </div>

      {/* Privacy & Read-Only Toggles */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-stone-900">{isRTL ? 'پرائیویسی' : 'Privacy & Security'}</h3>
        </div>

        {/* Privacy Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.privacyMode ? <EyeOff className="w-4 h-4 text-stone-500" /> : <Eye className="w-4 h-4 text-stone-500" />}
            <div>
              <p className="text-sm font-semibold text-stone-700">{isRTL ? 'پرائیویسی موڈ' : 'Privacy Mode'}</p>
              <p className="text-xs text-stone-400">{isRTL ? 'مالی اعداد و شمار چھپائیں' : 'Hide financial figures'}</p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
            className={`w-12 h-6 rounded-full transition-all ${settings.privacyMode ? 'bg-emerald-500' : 'bg-stone-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings.privacyMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Read-Only Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-4 h-4 text-stone-500" />
            <div>
              <p className="text-sm font-semibold text-stone-700">{isRTL ? 'صرف پڑھنے کا موڈ' : 'Read-Only Mode'}</p>
              <p className="text-xs text-stone-400">{isRTL ? 'ترمیم یا حذف سے روکتا ہے' : 'Prevents edits and deletions'}</p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ readOnlyMode: !settings.readOnlyMode })}
            className={`w-12 h-6 rounded-full transition-all ${settings.readOnlyMode ? 'bg-amber-500' : 'bg-stone-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings.readOnlyMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Account Info */}
      {auth.currentUser && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <h3 className="font-bold text-stone-900 mb-3">{isRTL ? 'اکاؤنٹ' : 'Account'}</h3>
          <p className="text-sm text-stone-600 mb-1">
            <span className="font-medium">Email:</span> {auth.currentUser.email}
          </p>
          <p className="text-xs text-stone-400">
            {isRTL ? 'رکنیت:' : 'Joined:'} {auth.currentUser.metadata?.creationTime
              ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
      >
        <LogOut className="w-5 h-5" />
        {t('signOut')}
      </button>

      {/* App Info */}
      <div className="text-center text-xs text-stone-400 pb-4">
        <p className="font-bold text-stone-500">My Agriculture v2.0</p>
        <p>© 2025 AgriCommand - Premium Farm Management</p>
      </div>
    </div>
  );
}
