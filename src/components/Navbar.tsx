import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, PlusCircle, LogOut, Shield, User, Search, Sparkles, KeyRound } from 'lucide-react';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateModal: () => void;
  onNavigateHome: () => void;
  onOpenChangePasswordModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  onOpenCreateModal,
  onNavigateHome,
  onOpenChangePasswordModal
}) => {
  const { currentUser, logout, toggleRole } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              NovelPub
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              v1.0
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by title, author, genre, or tags..."
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {/* Action Controls & User Account */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <>
              {/* Create Novel Button */}
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-3.5 py-2 rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Novel</span>
              </button>

              {/* User Nickname Tag */}
              <span className="text-xs font-semibold text-slate-300 hidden md:inline border border-slate-800 bg-slate-950 px-2.5 py-1.5 rounded-xl">
                @{currentUser.nickname || currentUser.email.split('@')[0]}
              </span>

              {/* Role Indicator / Admin Preview Mode Switcher */}
              {currentUser.dbRole === 'admin' ? (
                <button
                  onClick={toggleRole}
                  title="Admin user: Click to toggle preview view mode between Admin and Normal"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="capitalize">{currentUser.role === 'admin' ? 'Admin' : 'Normal (Preview)'}</span>
                  <Sparkles className="w-3 h-3 opacity-60 ml-0.5" />
                </button>
              ) : (
                <div
                  title="Standard User Account"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 select-none"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Normal</span>
                </div>
              )}

              {/* Change Password Button */}
              <button
                onClick={onOpenChangePasswordModal}
                title="Change Account Password"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
