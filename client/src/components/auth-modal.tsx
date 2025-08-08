import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
});

interface AuthModalProps {
  open: boolean;
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthModal({ open, mode, onClose, onSwitchMode }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, setTokens } = useAuth();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      company: "",
    },
  });

  // Reset forms when mode changes or modal opens
  useEffect(() => {
    if (open) {
      loginForm.reset();
      signupForm.reset();
    }
  }, [open, mode, loginForm, signupForm]);

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        // Set tokens in auth store
        setTokens(data.access_token, data.refresh_token);
        
        // Get user info
        const userResponse = await apiRequest("GET", "/api/auth/me");
        const userData = await userResponse.json();
        
        // Login will automatically handle routing
        login(userData, data.access_token);
        
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
        onClose();
      } catch (error) {
        console.error('Failed to get user info:', error);
        toast({
          title: "Login warning",
          description: "Logged in but couldn't load user info. Please refresh the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof signupSchema>) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        // Set tokens in auth store
        setTokens(data.access_token, data.refresh_token);
        
        // Get user info
        const userResponse = await apiRequest("GET", "/api/auth/me");
        const userData = await userResponse.json();
        
        // Login will automatically handle routing (new users will go to onboarding)
        login(userData, data.access_token);
        
        toast({
          title: "Account created!",
          description: "Welcome to Xgaming Nova. Your account has been created successfully.",
        });
        onClose();
      } catch (error) {
        console.error('Failed to get user info:', error);
        toast({
          title: "Signup warning",
          description: "Account created but couldn't load user info. Please refresh the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const handleSignup = (data: z.infer<typeof signupSchema>) => {
    signupMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Welcome Back' : 'Get Started'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' 
              ? 'Sign in to your Xgaming Nova account' 
              : 'Create your account to start experimenting'
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'login' ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email" 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your password" 
                        type="password" 
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
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email" 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Create a password" 
                        type="password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your full name" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game/Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your game or company" 
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
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-primary hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
