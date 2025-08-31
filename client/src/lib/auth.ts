import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest, queryClient } from "./queryClient";

interface NovaUser {
  name: string;
  email: string;
  has_apps: boolean;
  role: "owner" | "admin" | "member";
}

interface AuthState {
  user: NovaUser | null;
  token: string | null;
  refreshToken: string | null;
  currentAppId?: string | null;
  login: (user: NovaUser, token: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCurrentAppId: (id: string | null) => void;
  getTokens: () => { accessToken: string | null; refreshToken: string | null };
  refreshAccessToken: () => Promise<boolean>;
  setIsInitializing: (value: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
  token: null,
  refreshToken: null,
  currentAppId: null,
      isAuthenticated: false,
      isInitializing: false,
      login: (user: NovaUser, token: string, refreshToken: string) => {
        set({ user, token, refreshToken, isAuthenticated: true, isInitializing: false });
      },
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ token: accessToken, refreshToken });
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const appId = payload?.app_id || payload?.app || null;
          set({ currentAppId: appId });
        } catch (e) {
          // ignore
        }
      },
      setCurrentAppId: (id: string | null) => set({ currentAppId: id }),
      getTokens: () => {
        const state = get();
        return { accessToken: state.token, refreshToken: state.refreshToken };
      },
      refreshAccessToken: async () => {
        const state = get();
        if (!state.refreshToken) {
          return false;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`,
            },
            body: JSON.stringify({
              refresh_token: state.refreshToken,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            set({ 
              token: data.access_token, 
              refreshToken: data.refresh_token || state.refreshToken 
            });
            return true;
          } else {
            // Refresh token is invalid, logout
            get().logout();
            return false;
          }
        } catch (error) {
          // Network error or refresh failed, logout
          get().logout();
          return false;
        }
      },
      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isInitializing: false });
        // Redirect to landing page
        window.location.href = '/';
      },
      setIsInitializing: (value: boolean) => {
        set({ isInitializing: value });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        token: state.token,
        refreshToken: state.refreshToken,
  currentAppId: state.currentAppId,
      }),
    }
  )
);

// Centralized routing logic based on auth state
const handleAuthRouting = (user: NovaUser | null, isAuthenticated: boolean, forceRoute: boolean = false) => {
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const hasInviteToken = urlParams.has('invite');
  const { isInitializing } = useAuth.getState();
  
  // Don't route while auth is still initializing (unless forced)
  if (isInitializing && !forceRoute) {
    return;
  }
  
  // If user is on signup page with invite token and not forcing route, don't redirect them
  // This allows users to complete signup, but still routes them after successful signup
  if (currentPath === '/signup' && hasInviteToken && !forceRoute) {
    return;
  }
  
  if (isAuthenticated && user) {
    // User is authenticated, route based on has_apps from user object
    if (user.has_apps) {
      // User has apps, go to console (unless already in a protected route)
      if (currentPath === '/' || currentPath === '/onboarding' || currentPath === '/signup') {
        window.location.href = '/console';
      }
    } else {
      // User doesn't have apps, go to onboarding (unless already there)
      if (currentPath === '/' || currentPath === '/console' || currentPath === '/signup') {
        window.location.href = '/onboarding';
      }
    }
  } else {
    // User is not authenticated, go to landing (unless already there or on signup)
    if (currentPath !== '/' && currentPath !== '/signup') {
      window.location.href = '/';
    }
  }
};

// Hook for session restoration on app mount
export const useInitializeAuth = () => {
  const { token, refreshToken, isAuthenticated, user, isInitializing, setIsInitializing } = useAuth();
  
  useEffect(() => {
    // Skip if we're already authenticated and have user data
    if (isAuthenticated && user) {
      // Already have complete auth state, just handle routing
      setIsInitializing(false);
      handleAuthRouting(user, true);
      return;
    }
    
    // If we have tokens but no user data or authentication, fetch user info from backend
    if ((token || refreshToken) && !isAuthenticated && !user) {
      setIsInitializing(true);
      const validateSession = async () => {
        try {
          // Use apiRequest which handles token refresh automatically
          const response = await apiRequest('GET', '/api/auth/me');
          const userData = await response.json();
          
          useAuth.setState({ 
            user: userData, 
            isAuthenticated: true
          });
          setIsInitializing(false);
          // Route user after successful validation
          handleAuthRouting(userData, true, true);
        } catch (error) {
          // apiRequest will have already handled token refresh attempts
          // If we're here, authentication failed completely
          useAuth.getState().logout();
        }
      };
      
      validateSession();
    } else if (!token && !refreshToken) {
      // No tokens at all, ensure we're on landing page
      setIsInitializing(false);
      handleAuthRouting(null, false, true);
    }
  }, [token, refreshToken, isAuthenticated, user, isInitializing, setIsInitializing]); // Re-run when auth state changes
};

// Export function for manual routing updates (e.g., after creating first app)
export const updateUserAndRoute = async (userData: NovaUser, newTokens?: { access_token: string; refresh_token: string }) => {
  // Update tokens if provided (happens when switching apps or creating first app)
  if (newTokens) {
  useAuth.getState().setTokens(newTokens.access_token, newTokens.refresh_token);
  }
  
  useAuth.setState({ user: userData, isAuthenticated: true });
  useAuth.getState().setIsInitializing(false);
  handleAuthRouting(userData, true, true);
};

// Helper function to get current user's role
export const getCurrentUserRole = (): "owner" | "admin" | "member" | null => {
  const user = useAuth.getState().user;
  return user?.role || null;
};

// Helper function to check if current user is admin or owner
export const isCurrentUserAdmin = (): boolean => {
  const role = getCurrentUserRole();
  return role === "owner" || role === "admin";
};

// Function to switch apps (updates tokens with new app_id)
export const switchApp = async (appId: string) => {
  try {
    const response = await fetch('/api/auth/switch-app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useAuth.getState().token}`,
      },
      body: JSON.stringify({ app_id: appId }),
    });

    if (response.ok) {
      const data = await response.json();
      // Update tokens with new app context
      useAuth.getState().setTokens(data.access_token, data.refresh_token);
      // Try to decode app id from token
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const appId = payload?.app_id || payload?.app || null;
        useAuth.getState().setCurrentAppId(appId || null);
      } catch (e) {
        // ignore
      }

      // Get updated user info
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        // Mark authenticated and update user
        useAuth.setState({ user: userData, isAuthenticated: true });
      }

      // Invalidate cached queries so components refetch with the new token
      try {
        queryClient.invalidateQueries();
      } catch (e) {
        // ignore
      }

      return true;
    } else {
      throw new Error('Failed to switch app');
    }
  } catch (error) {
    console.error('App switch failed:', error);
    return false;
  }
};
