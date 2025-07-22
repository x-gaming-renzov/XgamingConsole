import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// JWT payload structure
interface JWTPayload {
  exp: number;
  sub: string;
  roles?: string[];
}

interface AuthContextType {
  token: string | null;
  selectedAppId: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<any>;
  fetchMe: () => Promise<{ user: any; projects: any[] }>;
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
    const savedToken = localStorage.getItem('auth_token');
    const savedApp = localStorage.getItem('selected_app');
    if (savedToken) {
      try {
        const payload: JWTPayload = jwtDecode(savedToken);
        if (payload.exp * 1000 > Date.now()) {
          setToken(savedToken);
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
    const res = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Registration failed');
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Login failed');
    }
    const data = await res.json();
    // Nova returns { access_token, token_type }
    const newToken = data.token ?? data.access_token;
    if (!newToken) {
      throw new Error('Authentication token not returned');
    }
    persistToken(newToken);
    console.log('AuthContext: persisted token to localStorage:', newToken);
    return data;
  };

  const fetchMe = async (): Promise<{ user: any; projects: any[] }> => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Fetch current user failed');
    }
    return res.json();
  };

  const fetchOrgs = async (): Promise<any[]> => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/orgs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Fetch orgs failed');
    }
    return res.json();
  };

  const fetchApps = async (): Promise<any[]> => {
    if (!token) throw new Error('No token');
    const res = await fetch(`/api/apps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Fetch projects failed');
    }
    return res.json();
  };

  const selectApp = async (appId: string) => {
    if (!token) throw new Error('No token');
    try {
      const res = await fetch(`/api/auth/token/app/${appId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Switch app failed');
      }
      const data = await res.json();
      const newToken = data.token ?? data.access_token;
      if (!newToken) throw new Error('No token returned on app switch');
      // persist new app-scoped token
      persistToken(newToken);
      setSelectedAppId(appId);
      localStorage.setItem('selected_app', appId);
    } catch (e) {
      console.error('Error switching app:', e);
      throw e;
    }
  };

  const logout = () => {
    setToken(null);
    setSelectedAppId(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('selected_app');
    window.location.href = '/';
  };

  const value = {
    token,
    selectedAppId,
    register,
    login,
    fetchOrgs,
    fetchMe,
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
