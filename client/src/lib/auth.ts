import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  login: (user: NovaUser, token: string, refreshToken: string) => void;
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
      login: (user: NovaUser, token: string, refreshToken: string) => {
        set({ user, token, refreshToken, isAuthenticated: true });
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
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Centralized routing logic based on auth state
const handleAuthRouting = (user: NovaUser | null, isAuthenticated: boolean, forceRoute: boolean = false) => {
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const hasInviteToken = urlParams.has('invite');
  
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
  const { token, refreshToken, isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    // Skip if we're already authenticated and have user data
    if (isAuthenticated && user) {
      // Already have complete auth state, just handle routing
      handleAuthRouting(user, true);
      return;
    }
    
    // If we have tokens but no user data or authentication, fetch user info from backend
    if ((token || refreshToken) && !isAuthenticated && !user) {
      const validateSession = async () => {
        try {
          // Try with current token first
          let currentToken = token;
          let response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
            },
          });
          
          // If token expired, try to refresh
          if (response.status === 401 && refreshToken) {
            const refreshSuccess = await useAuth.getState().refreshAccessToken();
            if (refreshSuccess) {
              currentToken = useAuth.getState().token;
              response = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${currentToken}`,
                },
              });
            } else {
              // Refresh failed, logout
              useAuth.getState().logout();
              return;
            }
          }
          
          if (response.ok) {
            const userData = await response.json();
            useAuth.setState({ 
              user: userData, 
              isAuthenticated: true 
            });
            // Route user after successful validation
            handleAuthRouting(userData, true);
          } else {
            // Failed to get user data, clear session
            useAuth.getState().logout();
          }
        } catch (error) {
          // Network error or other issues, clear session
          useAuth.getState().logout();
        }
      };
      
      validateSession();
    } else if (!token && !refreshToken) {
      // No tokens at all, ensure we're on landing page
      handleAuthRouting(null, false);
    }
  }, [token, refreshToken, isAuthenticated, user]); // Re-run when auth state changes
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
