import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, updateUserAndRoute } from "@/lib/auth";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const createAppMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest("POST", "/api/auth/apps", data);
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "App created!",
        description: "Your app has been created successfully. Welcome to Nova!",
      });
      // Update user state and tokens - new app creation returns new tokens with app_id
      if (user) {
        const updatedUser = { ...user, has_apps: true };
        const newTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token
        };
        await updateUserAndRoute(updatedUser, newTokens, data.app.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create app",
        description: error.message,
        variant: "destructive",
      });
    }, 
  });

  // Automatically create app when component mounts
  useEffect(() => {
    if (user && !user.has_apps && !createAppMutation.isPending && !createAppMutation.isSuccess) {
      createAppMutation.mutate({
        name: "SampleUnityApp",
        description: "Clone of vampire survival game in unity"
      });
    }
  }, [user, createAppMutation]);

  // Redirect if user already has apps
  if (user?.has_apps) {
    setLocation("/console");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🎮 Welcome to Nova!</CardTitle>
          <CardDescription>
            Setting up your first mobile game app...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
            <p className="text-muted-foreground">
              {createAppMutation.isPending 
                ? "Creating your sample app..." 
                : createAppMutation.isError 
                  ? "Something went wrong. Please try again."
                  : "Almost ready!"
              }
            </p>
            {createAppMutation.isError && (
              <button 
                onClick={() => createAppMutation.mutate({
                  name: "SampleUnityApp",
                  description: "Clone of vampire survival game in unity"
                })}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Retry
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}