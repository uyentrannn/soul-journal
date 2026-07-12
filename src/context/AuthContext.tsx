import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authMode: 'login' | 'signup' | 'reset';
  setAuthMode: (mode: 'login' | 'signup' | 'reset') => void;
  handleLogin: (showToast: (msg: string) => void) => Promise<void>;
  handleSignUp: (showToast: (msg: string) => void) => Promise<void>;
  handleResetPassword: (showToast: (msg: string) => void) => Promise<void>;
  handleUpdatePassword: (showToast: (msg: string) => void) => Promise<void>;
  handleLogout: (showToast: (msg: string) => void, onClearLocal: () => void | Promise<void>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(err => {
      console.error("Supabase session error:", err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (showToast: (msg: string) => void) => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail || !authPassword) {
      showToast('Please enter email and password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      showToast('Welcome back! ♡');
      setAuthPassword('');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignUp = async (showToast: (msg: string) => void) => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail || !authPassword) {
      showToast('Please enter email and password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      showToast('Check your email for confirmation! ♡');
      setAuthPassword('');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async (showToast: (msg: string) => void, onClearLocal: () => void | Promise<void>) => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await onClearLocal();
      showToast('Logged out. ♡');
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      showToast('Logout failed. ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetPassword = async (showToast: (msg: string) => void) => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail) {
      showToast('Please enter your email. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast('Password reset email sent! ♡');
      setAuthMode('login');
      setAuthPassword('');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePassword = async (showToast: (msg: string) => void) => {
    if (!isSupabaseConfigured) return;
    if (!authPassword) {
      showToast('Please enter a new password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: authPassword
      });
      if (error) throw error;
      showToast('Password updated successfully! ♡');
      setAuthMode('login');
      setAuthPassword('');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isSyncing,
      setIsSyncing,
      authEmail,
      setAuthEmail,
      authPassword,
      setAuthPassword,
      authMode,
      setAuthMode,
      handleLogin,
      handleSignUp,
      handleResetPassword,
      handleUpdatePassword,
      handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
