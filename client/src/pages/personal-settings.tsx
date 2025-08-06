import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Copy } from "lucide-react";
import { showSuccess, showInfo } from "@/lib/errorHandler";
import { useAuth } from "@/lib/auth";
import ConsoleLayout from "@/components/console-layout";



export default function PersonalSettings() {
  const { user } = useAuth();

  // Profile state
  const [profile, setProfile] = useState({
    displayName: "",
    email: ""
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState("pk_live_1234567890abcdef1234567890abcdef");



  const handleProfileSave = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    showSuccess("Profile Updated", "Profile updated successfully");
  };

  const handleApiKeyRotate = () => {
    showSuccess("API Key Rotated", "API key rotated successfully. Update your SDK integration.");
  };

  const handleApiKeyCopy = () => {
    navigator.clipboard.writeText(apiKey);
    showInfo("Copied", "API key copied to clipboard");
  };



  // Fetch current user on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setProfile({ displayName: data.full_name || '', email: data.email || '' });
      })
      .catch(() => {});
  }, []);
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
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      onBlur={(e) => handleProfileSave("displayName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      onBlur={(e) => handleProfileSave("email", e.target.value)}
                    />
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