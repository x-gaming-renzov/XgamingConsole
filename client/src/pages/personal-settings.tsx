import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import ConsoleLayout from "@/components/console-layout";



export default function PersonalSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Profile state
  const [profile, setProfile] = useState({
    displayName: user?.name || "",
    email: user?.email || "",
    role: "Owner",
    timezone: "UTC",
    dateFormat: "DD/MM/YYYY",
    language: "en"
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState("pk_live_1234567890abcdef1234567890abcdef");



  const handleProfileSave = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    toast({ description: "Profile updated successfully" });
  };

  const handleApiKeyRotate = () => {
    toast({ 
      description: "API key rotated successfully. Update your SDK integration.",
      variant: "default"
    });
  };

  const handleApiKeyCopy = () => {
    navigator.clipboard.writeText(apiKey);
    toast({ description: "API key copied to clipboard" });
  };



  return (
    <ConsoleLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Personal Settings</span>
          </div>
          <h1 className="text-2xl font-semibold">Personal Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account preferences and security settings.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <p id="displayName" className="text-foreground">
                      {user?.name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <p id="email" className="text-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </ConsoleLayout>
  );
}