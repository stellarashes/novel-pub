import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (email: string, password?: string, nickname?: string) => Promise<boolean>;
  resetPasswordForEmail: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleRole: () => Promise<void>;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'novel_pub_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load auth user:', e);
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUserProfile(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncUserProfile(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync user profile from Supabase 'profiles' table
  const syncUserProfile = async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        const actualRole: UserRole = (profile.role as UserRole) || 'normal';
        const fallbackNick = profile.nickname || email.split('@')[0];
        const userProf: UserProfile = {
          id: profile.id,
          email: profile.email || email,
          nickname: fallbackNick,
          role: actualRole,
          dbRole: actualRole,
          created_at: profile.created_at || new Date().toISOString()
        };
        setCurrentUser(userProf);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProf));
      } else if (error && error.code === 'PGRST116') {
        // Profile row does not exist yet -> create default profile
        const defaultRole: UserRole = 'normal';
        const fallbackNick = email.split('@')[0];
        const newProfile: UserProfile = {
          id: userId,
          email,
          nickname: fallbackNick,
          role: defaultRole,
          dbRole: defaultRole,
          created_at: new Date().toISOString()
        };
        await supabase.from('profiles').insert({ id: userId, email, nickname: fallbackNick, role: defaultRole });
        setCurrentUser(newProfile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
      } else if (error) {
        console.error('Error querying profile table:', error);
      }
    } catch (err: any) {
      console.error('Failed to sync user profile exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    setErrorMsg(null);
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      if (!password) {
        setErrorMsg('Password is required for Supabase authentication.');
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return false;
      }

      if (data.user) {
        await syncUserProfile(data.user.id, data.user.email || email);
        return true;
      }
    } else {
      // Local Mock Auth Fallback
      const isDemoAdmin = email.toLowerCase().includes('admin');
      const role: UserRole = isDemoAdmin ? 'admin' : 'normal';
      const fallbackNick = email.split('@')[0];
      const user: UserProfile = {
        id: `user-${email.split('@')[0]}-${Date.now().toString(36)}`,
        email: email.trim(),
        nickname: isDemoAdmin ? 'AdminUser' : fallbackNick,
        role,
        dbRole: role,
        created_at: new Date().toISOString()
      };
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setLoading(false);
      return true;
    }

    setLoading(false);
    return false;
  };

  const register = async (email: string, password?: string, nickname?: string): Promise<boolean> => {
    setErrorMsg(null);
    setLoading(true);

    const cleanNick = (nickname || email.split('@')[0]).trim();

    if (cleanNick.length < 3) {
      setErrorMsg('Nickname must be at least 3 characters long.');
      setLoading(false);
      return false;
    }

    if (isSupabaseConfigured && supabase) {
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        setLoading(false);
        return false;
      }

      // Globally unique case-insensitive nickname check
      const { data: existingNick } = await supabase
        .from('profiles')
        .select('id')
        .ilike('nickname', cleanNick)
        .maybeSingle();

      if (existingNick) {
        setErrorMsg(`The nickname "${cleanNick}" is already taken. Please choose another.`);
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return false;
      }

      if (data.user) {
        // All new user accounts strictly default to 'normal' role in database
        const newProfile: UserProfile = {
          id: data.user.id,
          email: email.trim(),
          nickname: cleanNick,
          role: 'normal',
          dbRole: 'normal',
          created_at: new Date().toISOString()
        };

        await supabase.from('profiles').insert({ id: data.user.id, email: email.trim(), nickname: cleanNick, role: 'normal' });
        setCurrentUser(newProfile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
        setLoading(false);
        return true;
      }
    } else {
      // Local Mock Register Fallback
      return login(email, password);
    }

    setLoading(false);
    return false;
  };

  const resetPasswordForEmail = async (email: string): Promise<boolean> => {
    setErrorMsg(null);
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return false;
      }
    }

    setLoading(false);
    return true;
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    setErrorMsg(null);
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return false;
      }
    }

    setLoading(false);
    return true;
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const toggleRole = async () => {
    if (!currentUser) return;
    // Strictly prevent normal users from toggling to admin mode!
    if (currentUser.dbRole !== 'admin') {
      alert('Only Admin users can toggle preview modes.');
      return;
    }

    // Admins can toggle active viewing mode between 'admin' and 'normal' (for previewing reader mode)
    const newRole: UserRole = currentUser.role === 'admin' ? 'normal' : 'admin';
    const updated = { ...currentUser, role: newRole };

    setCurrentUser(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      errorMsg,
      setErrorMsg,
      login,
      register,
      resetPasswordForEmail,
      updatePassword,
      logout,
      toggleRole,
      isAuthenticated: currentUser !== null
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
