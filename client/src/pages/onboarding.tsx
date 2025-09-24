import { useEffect, useState } from "react";
// Embedded YouTube walkthrough (video ID 7iB4n5WD2Qw) also used in sample-try page.
// Replace the ID in both places if the demo video changes.
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, updateUserAndRoute } from "@/lib/auth";
import unitySample from "@/static/unity_sample_app.json";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [attemptedCreate, setAttemptedCreate] = useState(false);
  const [launchReady, setLaunchReady] = useState(false);
  const [pendingTokens, setPendingTokens] = useState<null | { access_token: string; refresh_token: string; app_id: string }>(null);

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
      setAttemptedCreate(true);
      // Update user state and tokens - new app creation returns new tokens with app_id
      if (user) {
        // We intentionally DO NOT set has_apps=true yet to avoid auto-routing. Will set on launch button click.
        const updatedUser = { ...user, has_apps: false };
        const newTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token
        };
        // Set tokens locally first so subsequent apiRequest calls use the new app-scoped token
        useAuth.getState().setTokens(newTokens.access_token, newTokens.refresh_token, data.app.id);

        // After setting tokens, fetch SDK credentials and sync sample data before routing away
        try {
          const credsResp = await apiRequest('GET', '/api/auth/sdk-credentials');
          const creds = await credsResp.json();
          const apiKey = creds?.api_key;

          if (apiKey) {
            const syncResp = await fetch('/api/feature-flags/sync-nova-objects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(unitySample),
            });

            if (!syncResp.ok) {
              const txt = await syncResp.text();
              console.warn('Sync failed:', syncResp.status, txt);
              toast({ title: 'Sync failed', description: 'Failed to sync sample objects. See console for details.' });
            } else {
              toast({ title: 'Sample data synced', description: 'Experiences and objects were synced to your new app.' });
            }
          } else {
            console.warn('No SDK API key available after app creation');
          }
        } catch (err: any) {
          console.error('Error syncing sample data:', err);
        }

        // Store tokens & app id for later finalization when user clicks the launch button
        setPendingTokens({ access_token: newTokens.access_token, refresh_token: newTokens.refresh_token, app_id: data.app.id });
        // Mark UI ready for manual launch
        setLaunchReady(true);
      }
    },
    onError: (error) => {
      // Allow retry after failure
      setAttemptedCreate(false);
      toast({
        title: "Failed to create app",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Extract payload and helper for creating the sample app
  const sampleAppPayload = {
    name: `${user?.name}'s sample app`,
    description: "Clone of vampire survival game in unity",
  };

  const createSampleApp = () => {
    setAttemptedCreate(true);
    createAppMutation.mutate(sampleAppPayload);
  };

  // Automatically create app when component mounts
  useEffect(() => {
    if (
      user &&
      !user.has_apps &&
      !attemptedCreate &&
      createAppMutation.status !== 'pending' &&
      !createAppMutation.isSuccess
    ) {
      createSampleApp();
    }
  }, [user, createAppMutation, attemptedCreate]);

  // If user already has apps (e.g. navigated here manually) allow immediate launch
  useEffect(() => {
    if (user?.has_apps) {
      setLaunchReady(true);
    }
  }, [user]);

  const handleLaunch = async () => {
    if (!user) return;
    // If user already has apps just navigate
    if (user.has_apps) {
      setLocation('/console');
      return;
    }
    if (pendingTokens) {
      const updatedUser = { ...user, has_apps: true } as typeof user;
      await updateUserAndRoute(updatedUser, { access_token: pendingTokens.access_token, refresh_token: pendingTokens.refresh_token }, pendingTokens.app_id);
    } else {
      // Fallback: just navigate
      setLocation('/console');
    }
  };

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
              {createAppMutation.status === 'pending'
                ? "Creating your sample app..."
                : createAppMutation.isError
                  ? "Something went wrong. Please try again."
                  : launchReady
                    ? "Sample app is ready!"
                    : "Almost ready!"
              }
            </p>
            {/* Quick embedded walkthrough while user waits */}
            <div className="space-y-2 pt-2">
              <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-black">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/7iB4n5WD2Qw"
                  title="Sample App Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <a
                href="https://www.youtube.com/watch?v=7iB4n5WD2Qw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                Watch on YouTube ↗
              </a>
            </div>
            {createAppMutation.isError && (
              <button 
                onClick={createSampleApp}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Retry
              </button>
            )}
            <div className="pt-2">
              {(!launchReady || createAppMutation.status === 'pending') && !createAppMutation.isError && (
                <Button disabled variant="secondary" className="w-full justify-center">
                  Setting things up...
                </Button>
              )}
              {launchReady && !createAppMutation.isError && (
                <Button onClick={handleLaunch} className="w-full justify-center">
                  🚀 Take me to Nova
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}