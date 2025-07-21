import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Console() {
  const [, setLocation] = useLocation();
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLocation("/");
    } else {
      // Redirect to dashboard by default
      setLocation("/dashboard");
    }
  }, [token, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your console...</p>
      </div>
    </div>
  );
}