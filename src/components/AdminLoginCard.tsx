import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, Link, Copy, Check } from 'lucide-react';
import { AdminSession, login } from '../services/api';

interface AdminLoginCardProps {
  onLoginSuccess: (user: AdminSession) => void;
  onBackToStore: () => void;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyAdminLink = () => {
    try {
      const adminUrl = window.location.origin + window.location.pathname + '?page=admin';
      navigator.clipboard.writeText(adminUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Real login — authenticates against the backend (bcrypt-hashed password + JWT),
  // replacing the old hardcoded/localStorage password check.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email।');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password।');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (rememberMe) {
        localStorage.setItem(
          'amarshop_admin_session',
          JSON.stringify({ isLoggedIn: true, adminName: user.name, loginTime: new Date().toISOString() })
        );
      }
      onLoginSuccess(user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'লগইন করা যায়নি, আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#f2f7f4] via-[#f8faf9] to-[#edf4f0] font-bengali">
      <div className="w-full max-w-md">
        {/* Top Floating Back Button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00503a] hover:text-[#003828] bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer border border-emerald-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Secure Gateway
          </span>
        </div>

        {/* 🛡️ Main Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 border border-emerald-100/80 relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-100/40 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Header / Logo Badge */}
            <div className="text-center space-y-3 mb-7">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006a4e] via-[#00503a] to-[#003828] text-white shadow-md shadow-emerald-900/20 border border-emerald-400/30">
                <ShieldCheck className="w-8 h-8 text-[#9ef4d0]" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#191c1d] tracking-tight">
                  Admin Panel Login
                </h1>
                <p className="text-xs text-[#3f4944] mt-1 font-medium">
                  Enter your credentials to control Admin panel and manage the store.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Admin Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#191c1d]">
                  Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="admin@gmail.com"
                    className="w-full pl-10 pr-3.5 py-3 text-sm bg-[#f8faf9] focus:bg-white rounded-xl border border-gray-200 focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15 outline-none transition-all duration-200 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#191c1d]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="password"
                    className="w-full pl-10 pr-10 py-3 text-sm bg-[#f8faf9] focus:bg-white rounded-xl border border-gray-200 focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15 outline-none transition-all duration-200 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                    title={showPassword ? 'Hide' : 'See'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox & Helper */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#00503a] rounded border-gray-300 focus:ring-[#00503a] accent-[#00503a] cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="admin-login-submit-btn"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-[#006a4e] via-[#00503a] to-[#003828] hover:opacity-95 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#9ef4d0]" />
                    <span>Log In</span>
                  </>
                )}
              </button>
            </form>

            {/* Direct Admin Link Notification */}
   
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500 font-medium">
          <p>© Shopora Security Panel • All Rights Reserved by Robiul Hridoy</p>
        </div>
      </div>
    </div>
  );
};
