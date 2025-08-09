import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function Console() {
  const [, setLocation] = useLocation();
  const { user, isInitializing, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only redirect if auth is fully initialized and user is authenticated
    if (!isInitializing && isAuthenticated && user) {
      setLocation("/personalisations");
    }
    // For all other cases (initializing, not authenticated, etc), 
    // let handleAuthRouting handle redirects - just show loading
  }, [user, isInitializing, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your console...</p>
      </div>
    </div>
  );
}