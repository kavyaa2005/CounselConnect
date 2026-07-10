import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, setUser, setToken, clearSession } from '../lib/auth';
import { api } from '../lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: 'user' | 'doctor';
  phone?: string;
  bio?: string;
  avatar?: string;
  notifications?: Record<string, boolean>;
  privacy?: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updates: Partial<User>) => void;
}

interface RegisterData {
  firstName: string;
  email: string;
  password: string;
  reason?: string;
  sessionType?: string;
  frequency?: string;
  goals?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(getUser());
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    setUserState(res.data.user);
    return res.data.user;
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    setToken(res.data.token);
    setUser(res.data.user);
    setUserState(res.data.user);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearSession();
    setUserState(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setUserState(res.data.user);
    } catch {
      clearSession();
      setUserState(null);
    }
  }, []);

  const updateUserLocal = (updates: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
