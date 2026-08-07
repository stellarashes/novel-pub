import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { BookOpen, KeyRound, Mail, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowLeft, User } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, resetPasswordForEmail, updatePassword, loading, errorMsg, setErrorMsg } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset_new'>('signin');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user opened page via Supabase password reset link (#access_token=... or type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
      setAuthMode('reset_new');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (authMode === 'forgot') {
      if (!email.trim()) return;
      setIsSubmitting(true);
      const success = await resetPasswordForEmail(email.trim());
      setIsSubmitting(false);
      if (success) {
        setSuccessMsg(
          isSupabaseConfigured
            ? `Password reset link sent to ${email.trim()}. Please check your email inbox.`
            : 'Password reset request received. (Local demo mode)'
        );
      }
      return;
    }

    if (authMode === 'reset_new') {
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      setIsSubmitting(true);
      const success = await updatePassword(password);
      setIsSubmitting(false);
      if (success) {
        setSuccessMsg('Your password has been successfully updated! You may now sign in.');
        setAuthMode('signin');
        setPassword('');
        setConfirmPassword('');
      }
      return;
    }

    if (!email.trim()) return;
    setIsSubmitting(true);

    if (authMode === 'signin') {
      await login(email.trim(), password);
    } else {
      if (!nickname.trim() || nickname.trim().length < 3) {
        setErrorMsg('Please enter a nickname (at least 3 characters).');
        setIsSubmitting(false);
        return;
      }
      await register(email.trim(), password, nickname.trim());
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/15 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4 shadow-xl shadow-indigo-500/10">
            <BookOpen className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome to NovelPub
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Read, upload, and publish web novels with fine scroll tracking and paragraph inline comments.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isSupabaseConfigured ? 'Connected to Live Supabase Auth & PostgreSQL' : 'Local Demo Storage Mode'}
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Toggle Tabs (Signin / Signup) */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                onClick={() => { setAuthMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'signin'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Mode Title if Forgot or Reset */}
          {authMode === 'forgot' && (
            <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Reset Password</h2>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          )}

          {authMode === 'reset_new' && (
            <div className="mb-6 border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Set New Password</h2>
              <p className="text-xs text-slate-400 mt-1">Enter your new account password below.</p>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Nickname Field (Signup only) */}
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Unique Nickname (Public Display Name)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. ShadowReader99"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Must be unique. Displayed on reviews and comments instead of your email.
                </span>
              </div>
            )}

            {/* Email Field (Signin, Signup, Forgot) */}
            {authMode !== 'reset_new' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="reader@novelpub.dev"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            {/* Password Field (Signin, Signup, Reset New) */}
            {authMode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {authMode === 'reset_new' ? 'New Password' : 'Password'} {isSupabaseConfigured ? '*' : '(Optional in demo mode)'}
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required={isSupabaseConfigured || authMode === 'reset_new'}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password Field (Reset New) */}
            {authMode === 'reset_new' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {authMode === 'signin' && 'Sign In & Enter Library'}
                    {authMode === 'signup' && 'Create Account'}
                    {authMode === 'forgot' && 'Send Password Reset Email'}
                    {authMode === 'reset_new' && 'Update Password'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          {!isSupabaseConfigured && authMode === 'signin' && (
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <span className="text-xs text-slate-500 block mb-2">Quick Demo Accounts:</span>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => login('admin@novelpub.dev', 'password')}
                  className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                >
                  🔑 Admin Demo
                </button>
                <button
                  onClick={() => login('reader@novelpub.dev', 'password')}
                  className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                >
                  📖 Reader Demo
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
