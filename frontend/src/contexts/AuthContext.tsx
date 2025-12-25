'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User, ProfileStatus } from '@/types';

interface AuthContextType {
  user: User | null;
  profileStatus: ProfileStatus | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfileStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setProfileStatus(data.profileStatus);
    } catch {
      setUser(null);
      setProfileStatus(null);
    }
  }, []);

  const refreshProfileStatus = useCallback(async () => {
    try {
      const status = await api.getProfileStatus();
      setProfileStatus(status);
    } catch {
      // Profile status fetch failed, keep existing
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.getMe();
        setUser(data.user);
        setProfileStatus(data.profileStatus);
      } catch {
        setUser(null);
        setProfileStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    // Fetch profile status after login
    try {
      const status = await api.getProfileStatus();
      setProfileStatus(status);
    } catch {
      setProfileStatus(null);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const data = await api.signup(email, password, name);
    setUser(data.user);
    // New users start with empty profile
    setProfileStatus({
      completed: false,
      completedAt: null,
      sectionsCompleted: [],
      sections: [
        { name: 'role', completed: false, isCore: true },
        { name: 'communication', completed: false, isCore: true },
        { name: 'writingStyle', completed: false, isCore: true },
        { name: 'workingStyle', completed: false, isCore: false },
        { name: 'formatting', completed: false, isCore: false },
        { name: 'personal', completed: false, isCore: false },
      ],
      completionPercentage: 0,
    });
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setProfileStatus(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profileStatus,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        refreshProfileStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
