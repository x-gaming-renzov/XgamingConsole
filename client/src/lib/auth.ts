import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NovaUser {
  name: string;
  email: string;
  has_apps: boolean;
}

interface AuthState {
  user: NovaUser | null;
  token: string | null;
  refreshToken: string | null;
  login: (user: NovaUser, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  getTokens: () => { accessToken: string | null; refreshToken: string | null };
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user: NovaUser, token: string) => {
        set({ user, token, isAuthenticated: true });
        // Handle routing after login
        handleAuthRouting(user, true);
      },
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ token: accessToken, refreshToken });
      },
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
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        // Redirect to landing page
        window.location.href = '/';
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Centralized routing logic based on auth state
const handleAuthRouting = (user: NovaUser | null, isAuthenticated: boolean) => {
  const currentPath = window.location.pathname;
  
  if (isAuthenticated && user) {
    // User is authenticated, route based on has_apps from user object
    if (user.has_apps) {
      // User has apps, go to console (unless already in a protected route)
      if (currentPath === '/' || currentPath === '/onboarding') {
        window.location.href = '/console';
      }
    } else {
      // User doesn't have apps, go to onboarding (unless already there)
      if (currentPath === '/' || currentPath === '/console') {
        window.location.href = '/onboarding';
      }
    }
  } else {
    // User is not authenticated, go to landing (unless already there)
    if (currentPath !== '/') {
      window.location.href = '/';
    }
  }
};

// Hook for session restoration on app mount
export const useInitializeAuth = () => {
  const { token, isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    // If already authenticated, handle routing immediately
    if (isAuthenticated && user) {
      handleAuthRouting(user, isAuthenticated);
      return;
    }
    
    // Check if we have a persisted session but isAuthenticated is false
    // This can happen if the store was hydrated but isAuthenticated wasn't properly set
    if (token && !isAuthenticated) {
      // Re-validate the session by trying to fetch user info
      const validateSession = async () => {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            useAuth.setState({ 
              user: userData, 
              isAuthenticated: true 
            });
            // Route user after successful validation
            handleAuthRouting(userData, true);
          } else if (response.status === 401) {
            // Try to refresh the token
            const refreshSuccess = await useAuth.getState().refreshAccessToken();
            if (!refreshSuccess) {
              // Refresh failed, logout will handle routing
              useAuth.getState().logout();
            } else {
              // Refresh succeeded, try to get user info again
              const newResponse = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${useAuth.getState().token}`,
                },
              });
              if (newResponse.ok) {
                const userData = await newResponse.json();
                useAuth.setState({ 
                  user: userData, 
                  isAuthenticated: true 
                });
                handleAuthRouting(userData, true);
              }
            }
          } else {
            // Other error, clear the session
            useAuth.getState().logout();
          }
        } catch (error) {
          // Network error or token invalid, clear the session
          useAuth.getState().logout();
        }
      };
      
      validateSession();
    } else if (!token && !isAuthenticated) {
      // No token and not authenticated, ensure we're on landing page
      handleAuthRouting(null, false);
    }
  }, [token, isAuthenticated, user]); // Re-run when auth state changes
};

// Export function for manual routing updates (e.g., after creating first app)
export const updateUserAndRoute = async (userData: NovaUser, newTokens?: { access_token: string; refresh_token: string }) => {
  // Update tokens if provided (happens when switching apps or creating first app)
  if (newTokens) {
    useAuth.getState().setTokens(newTokens.access_token, newTokens.refresh_token);
  }
  
  useAuth.setState({ user: userData });
  handleAuthRouting(userData, true);
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
      
      // Get updated user info
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        useAuth.setState({ user: userData });
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
