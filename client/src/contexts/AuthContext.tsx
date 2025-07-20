import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// Types for token payload (expand as needed)
interface JWTPayload {
  exp: number;
  sub: string;
  roles?: string[];
}

interface AuthContextType {
  token: string | null;
  selectedAppId: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  fetchOrgs: () => Promise<any[]>;
  fetchApps: () => Promise<any[]>;
  selectApp: (appPid: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('auth_token');
    const savedApp = localStorage.getItem('selected_app');
    if (saved) {
      try {
        const payload: JWTPayload = jwtDecode(saved);
        if (payload.exp * 1000 > Date.now()) {
          setToken(saved);
          if (savedApp) setSelectedAppId(savedApp);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch {
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  const persistToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
  };

  const register = async (email: string, password: string) => {
    await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(res => {
      if (!res.ok) throw new Error('Registration failed');
    });
  };

  const login = async (username: string, password: string) => {
    const res = await fetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    persistToken(data.access_token);
  };

  const fetchOrgs = async (): Promise<any[]> => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/v1/auth/organisations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Fetch orgs failed');
    return res.json();
  };

  const fetchApps = async (): Promise<any[]> => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/v1/auth/apps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Fetch apps failed');
    return res.json();
  };

  const selectApp = async (appPid: string) => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/v1/auth/token/app/${appPid}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Select app failed');
    const data = await res.json();
    persistToken(data.access_token);
    setSelectedAppId(appPid);
    localStorage.setItem('selected_app', appPid);
    // redirect to dashboard after selecting app
    window.location.href = '/dashboard';
  };

  const logout = () => {
    setToken(null);
    setSelectedAppId(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('selected_app');
    // redirect to landing (login/register) on logout
    window.location.href = '/';
  };

  const value = {
    token,
    selectedAppId,
    register,
    login,
    fetchOrgs,
    fetchApps,
    selectApp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
