import React, { useCallback, useEffect, useState } from 'react';
import { StoreContactSettings, StoreSettingsConfig } from '../../types';
import { initialStoreSettings } from '../../data/mockData';
import {
  fetchStoreContactSettingsApi,
  updateStoreContactSettingsApi,
} from '../../services/api';
import {
  Settings,
  Truck,
  CreditCard,
  PhoneCall,
  Save,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Building,
  MessageCircle,
  Copy,
  Check
} from 'lucide-react';

export const AdminStoreSettings: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('amarshop_store_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialStoreSettings;
  });
  const [contactSettings, setContactSettings] =
    useState<StoreContactSettings>({
      hotlineNumber: '',
      whatsappNumber: '',
      storeAddress: '',
    });
  const [isContactLoading, setIsContactLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Admin security credentials state
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('amarshop_admin_credentials');
      if (saved) return JSON.parse(saved).username || 'admin';
    } catch (e) {
      console.log(e);
    }
    return 'admin';
  });
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadContactSettings = useCallback(async () => {
    setIsContactLoading(true);
    setContactError(null);
    try {
      setContactSettings(await fetchStoreContactSettingsApi());
    } catch (error) {
      setContactError(
        error instanceof Error
          ? error.message
          : 'Could not load store contact information.',
      );
    } finally {
      setIsContactLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContactSettings();
  }, [loadContactSettings]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setContactError(null);
    try {
      localStorage.setItem(
        'amarshop_store_settings',
        JSON.stringify({
          ...settings,
          supportPhone: contactSettings.hotlineNumber,
          supportWhatsapp: contactSettings.whatsappNumber,
          storeAddress: contactSettings.storeAddress,
        }),
      );
      const savedContactSettings =
        await updateStoreContactSettingsApi(contactSettings);
      setContactSettings(savedContactSettings);
      showFeedback('Store settings saved successfully!');
    } catch (error) {
      setContactError(
        error instanceof Error
          ? error.message
          : 'Could not save store contact information.',
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() && !newPassword.trim()) return;

    const credentials = {
      username: newUsername.trim() || adminUser,
      password: newPassword.trim() || '123456',
    };
    localStorage.setItem('amarshop_admin_credentials', JSON.stringify(credentials));
    setAdminUser(credentials.username);
    setNewUsername('');
    setNewPassword('');
    showFeedback('Admin credentials updated successfully!');
  };

  const handleCopyAdminUrl = () => {
    try {
      const url = window.location.origin + window.location.pathname + '?page=admin';
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-[#191c1d] font-montserrat">
            Store Settings
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Shipping fees, MFS Merchant accounts, Customer support channels & Security
          </p>
        </div>

        {feedbackMsg && (
          <div className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-3.5 py-1.5 rounded-xl border border-[#00503a]/20 animate-in fade-in flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form (2 cols) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-6">
          {/* 1. Configurable Shipping Fees */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00503a] flex items-center justify-center">
                <Truck className="w-4 h-4 text-[#006a4e]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#191c1d]">
                  Delivery & Shipping Fee Configuration
                </h3>
                <p className="text-[11px] text-gray-500">
                  Regional delivery charges across Bangladesh (tk)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Inside Dhaka
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={settings.shippingInsideDhaka}
                    onChange={(e) =>
                      setSettings({ ...settings, shippingInsideDhaka: Number(e.target.value) })
                    }
                    className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-montserrat font-bold focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">tk</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-montserrat">Standard: 70 tk</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Sub-Dhaka / Savar
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={settings.shippingSubDhaka}
                    onChange={(e) =>
                      setSettings({ ...settings, shippingSubDhaka: Number(e.target.value) })
                    }
                    className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-montserrat font-bold focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">tk</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-montserrat">Standard: 100 tk</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Outside Dhaka
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={settings.shippingOutsideDhaka}
                    onChange={(e) =>
                      setSettings({ ...settings, shippingOutsideDhaka: Number(e.target.value) })
                    }
                    className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-montserrat font-bold focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">tk</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-montserrat">Standard: 130 tk</p>
              </div>
            </div>
          </div>

          {/* 2. MFS Merchant Accounts */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#191c1d]">
                  MFS Merchant Accounts (bKash, Nagad)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Mobile Financial Services account numbers for customer payments
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>bKash Merchant / Personal Number</span>
                </label>
                <input
                  type="text"
                  value={settings.bkashMerchant}
                  onChange={(e) => setSettings({ ...settings, bkashMerchant: e.target.value })}
                  placeholder="01700-000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Nagad Merchant / Personal Number</span>
                </label>
                <input
                  type="text"
                  value={settings.nagadMerchant}
                  onChange={(e) => setSettings({ ...settings, nagadMerchant: e.target.value })}
                  placeholder="01800-000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Steadfast Courier API Integration */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00503a] flex items-center justify-center">
                  <Truck className="w-4 h-4 text-[#00503a]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#191c1d] flex items-center gap-2">
                    <span>Steadfast Courier API Integration</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Automated Dispatch
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Automate 1-click order transmission to Steadfast, consignment ID sync, and live tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Steadfast API Key
                </label>
                <input
                  type="text"
                  value={settings.steadfastApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, steadfastApiKey: e.target.value })}
                  placeholder="e.g. stdf_api_key_xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Steadfast Secret Key
                </label>
                <input
                  type="password"
                  value={settings.steadfastSecretKey || ''}
                  onChange={(e) => setSettings({ ...settings, steadfastSecretKey: e.target.value })}
                  placeholder="••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-bold text-gray-800 text-xs">Test Mode / Sandbox Mode</p>
                  <p className="text-[11px] text-gray-500">
                    When enabled, generates mock tracking codes for testing if live API key is not connected.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.steadfastTestMode ?? true}
                    onChange={(e) => setSettings({ ...settings, steadfastTestMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00503a]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Customer Support Channels */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#191c1d]">
                  Customer Support Channels
                </h3>
                <p className="text-[11px] text-gray-500">
                  Hotline, Official WhatsApp & Store physical address
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Hotline Phone Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={30}
                  value={contactSettings.hotlineNumber}
                  onChange={(e) =>
                    setContactSettings({
                      ...contactSettings,
                      hotlineNumber: e.target.value,
                    })
                  }
                  disabled={isContactLoading || isSavingSettings}
                  placeholder="+880 1700-000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Official WhatsApp Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={30}
                  value={contactSettings.whatsappNumber}
                  onChange={(e) =>
                    setContactSettings({
                      ...contactSettings,
                      whatsappNumber: e.target.value,
                    })
                  }
                  disabled={isContactLoading || isSavingSettings}
                  placeholder="+880 1700-000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">
                  Physical Store Address
                </label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={contactSettings.storeAddress}
                  onChange={(e) =>
                    setContactSettings({
                      ...contactSettings,
                      storeAddress: e.target.value,
                    })
                  }
                  disabled={isContactLoading || isSavingSettings}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>
            </div>
            {isContactLoading && (
              <p role="status" className="text-xs text-gray-500">
                Loading saved contact information...
              </p>
            )}
            {contactError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                <span>{contactError}</span>
                {!isSavingSettings && !isContactLoading && (
                  <button
                    type="button"
                    onClick={() => void loadContactSettings()}
                    className="shrink-0 font-bold underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isContactLoading || isSavingSettings}
              className="flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#9ef4d0]" />
              <span>{isSavingSettings ? 'Saving...' : 'Save Store Settings'}</span>
            </button>
          </div>
        </form>

        {/* Right 1 Col: Admin Security Credentials & Secret Access Link */}
        <div className="space-y-6">
          {/* Admin Security Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#191c1d]">Change Admin Credentials</h3>
                <p className="text-[11px] text-gray-500">Current User: {adminUser}</p>
              </div>
            </div>

            <form onSubmit={handleSaveSecurity} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">New Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={adminUser}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Discreet Access Link Info */}
          <div className="bg-[#002b1f] text-white p-6 rounded-2xl shadow-md space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#9ef4d0]" />
              <h4 className="font-bold text-sm">Direct Admin Access URL</h4>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              The admin portal is discreetly accessible anytime via URL parameter. You can bookmark the direct link below:
            </p>

            <button
              type="button"
              onClick={handleCopyAdminUrl}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#9ef4d0]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy ?page=admin Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
