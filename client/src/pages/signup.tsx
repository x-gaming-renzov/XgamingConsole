import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield } from "lucide-react";

const createSignupSchema = (isInvite: boolean) => z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: isInvite 
    ? z.string().optional() 
    : z.string().min(2, "Company name must be at least 2 characters"),
  invite_token: z.string().optional(),
});

interface InviteInfo {
  valid: boolean;
  organisation_name?: string;
  invited_by_name?: string;
  role?: string;
  email?: string;
}

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, setTokens } = useAuth();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);

  const signupSchema = createSignupSchema(inviteInfo?.valid || false);
  
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      company: "",
      invite_token: "",
    },
  });

  // Extract invite token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite');
    if (token) {
      setInviteToken(token);
      validateInviteToken(token);
    }
  }, []);

  // Function to validate invite token
  const validateInviteToken = async (token: string) => {
    setIsValidatingInvite(true);
    try {
      const response = await fetch(`/api/invitations/validate-invite/${token}`);
      if (response.ok) {
        const data = await response.json();
        setInviteInfo(data);
        
        if (data.valid) {
          // Pre-fill form with invitation data
          form.reset({
            email: data.email || "",
            password: "",
            name: "",
            company: "",
            invite_token: token,
          });
          
          toast({
            title: "Invitation Found",
            description: `You've been invited to join ${data.organisation_name}`,
          });
        } else {
          toast({
            title: "Invalid Invitation",
            description: "This invitation link is invalid or has expired.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Failed to validate invite token:', error);
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const signupData = {
        ...data,
        company: inviteInfo?.valid ? null : data.company,  // Explicitly null for invited users
        invite_token: inviteToken || data.invite_token || undefined,
      };
      const response = await apiRequest("POST", "/api/auth/register", signupData);
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        // Get user info with the new token directly
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await userResponse.json();
        
        // Login will automatically handle routing (new users will go to onboarding)
        login(userData, data.access_token, data.refresh_token);
        
        toast({
          title: "Account created!",
          description: inviteInfo?.valid 
            ? `Welcome to ${inviteInfo.organisation_name}! Your account has been created successfully.`
            : "Welcome to Xgaming Nova. Your account has been created successfully.",
        });
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

  const handleSignup = (data: any) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Xgaming Nova</span>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLocation('/')}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Home
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {inviteInfo?.valid ? "Join Your Team" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {inviteInfo?.valid 
                ? "Complete your registration to get started"
                : "Start experimenting with Xgaming Nova"
              }
            </p>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {inviteInfo?.valid ? "Accept Invitation" : "Sign Up"}
            </CardTitle>
            <CardDescription>
              {inviteInfo?.valid 
                ? `You've been invited to join ${inviteInfo.organisation_name}`
                : "Fill in your details to create your account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Loading state for invite validation */}
            {isValidatingInvite && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Validating invitation...
                </AlertDescription>
              </Alert>
            )}

            {/* Show invitation info if available */}
            {inviteInfo?.valid && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{inviteInfo.invited_by_name}</strong> has invited you to join{" "}
                  <strong>{inviteInfo.organisation_name}</strong> as a <strong>{inviteInfo.role}</strong>.
                </AlertDescription>
              </Alert>
            )}

            {/* Show error if invite is invalid */}
            {inviteInfo && !inviteInfo.valid && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This invitation is invalid or has expired. You can still create a new account.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your email" 
                          type="email" 
                          {...field}
                          disabled={inviteInfo?.valid && !!inviteInfo.email}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                {/* Only show company field for self-signup, not for invited users */}
                {!inviteInfo?.valid && (
                  <FormField
                    control={form.control}
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
                )}
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending 
                    ? "Creating account..." 
                    : inviteInfo?.valid 
                      ? "Accept Invitation" 
                      : "Create Account"
                  }
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation('/')}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
