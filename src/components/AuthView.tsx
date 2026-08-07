import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, KeyRound, Mail, Sparkles, UserCheck, Shield } from 'lucide-react';
import { UserRole } from '../types';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (isLogin) {
      login(email.trim(), role);
    } else {
      register(email.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Glows */}
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
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Toggle Tabs */}
          <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Role Picker for Demo Testing */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Initial Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('normal')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    role === 'normal'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Normal User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    role === 'admin'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin User
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isLogin ? 'Sign In & Enter Library' : 'Register Account'}
            </button>
          </form>

          {/* Preset Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-500 block mb-2">Quick Demo Accounts:</span>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => login('admin@novelpub.dev', 'admin')}
                className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                🔑 Admin Demo
              </button>
              <button
                onClick={() => login('reader@novelpub.dev', 'normal')}
                className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                📖 Reader Demo
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
