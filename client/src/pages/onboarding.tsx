import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, updateUserAndRoute } from "@/lib/auth";

const appCreateSchema = z.object({
  name: z.string().min(2, "App name must be at least 2 characters"),
  description: z.string().optional(),
});

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const form = useForm<z.infer<typeof appCreateSchema>>({
    resolver: zodResolver(appCreateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createAppMutation = useMutation({
    mutationFn: async (data: z.infer<typeof appCreateSchema>) => {
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
        await updateUserAndRoute(updatedUser, newTokens);
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

  const handleCreateApp = (data: z.infer<typeof appCreateSchema>) => {
    createAppMutation.mutate(data);
  };

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
            Let's set up your first mobile game app to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateApp)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Dragon Quest Mobile" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of your game..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={createAppMutation.isPending}
              >
                {createAppMutation.isPending ? "Creating App..." : "Create App & Continue →"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>You can create additional apps later from your dashboard</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}