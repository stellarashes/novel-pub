import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, role?: UserRole) => void;
  register: (email: string) => void;
  logout: () => void;
  toggleRole: () => void;
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
    // Default logged in user for seamless testing experience
    return {
      id: 'user-admin-1',
      email: 'admin@novelpub.dev',
      role: 'admin',
      created_at: new Date().toISOString()
    };
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const login = (email: string, role: UserRole = 'normal') => {
    const user: UserProfile = {
      id: `user-${email.split('@')[0]}-${Date.now().toString(36)}`,
      email,
      role,
      created_at: new Date().toISOString()
    };
    setCurrentUser(user);
  };

  const register = (email: string) => {
    login(email, 'normal');
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleRole = () => {
    if (!currentUser) return;
    const newRole: UserRole = currentUser.role === 'admin' ? 'normal' : 'admin';
    setCurrentUser({ ...currentUser, role: newRole });
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      register,
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
