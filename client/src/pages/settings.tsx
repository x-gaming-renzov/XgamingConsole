import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import ConsoleLayout from "@/components/console-layout";
import { 
  User, 
  Key, 
  CreditCard, 
  FileText, 
  Slack, 
  Copy, 
  RotateCcw, 
  Upload, 
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield
} from "lucide-react";

interface SettingsTabProps {
  activeTab: string;
}

export default function Settings() {
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

  // Billing state
  const [billing] = useState({
    remainingCredits: 7500,
    totalCredits: 10000,
    estimatedDaysLeft: 23,
    currentPlan: "Pro",
    planPrice: 199,
    lastFourDigits: "4242",
    billingEmail: "billing@company.com"
  });

  // Knowledge Base state
  const [kbFiles, setKbFiles] = useState([
    { id: 1, name: "Game Design Bible.pdf", tokens: 15420, status: "Ready", category: "Design Bible", visibility: "Org-wide" },
    { id: 2, name: "Tutorial Guidelines.md", tokens: 8230, status: "Processing", category: "Tutorial", visibility: "Private" },
    { id: 3, name: "Onboarding Flow.txt", tokens: 4150, status: "Failed", category: "Tutorial", visibility: "Org-wide" }
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Integrations state
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackConfig, setSlackConfig] = useState({
    workspace: "Gaming Studio",
    channel: "#alerts",
    events: {
      failures: true,
      autoRollout: false,
      weeklySummary: true
    }
  });

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

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast({ description: "File uploaded successfully" });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileDelete = (fileId: number) => {
    setKbFiles(prev => prev.filter(f => f.id !== fileId));
    toast({ description: "File deleted successfully" });
  };

  const handleSlackConnect = () => {
    setSlackConnected(true);
    toast({ description: "Slack integration connected successfully" });
  };



  return (
    <ConsoleLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Profile</span>
          </div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Profile changes save instantly except password.
          </p>
        </div>

        {/* Horizontal Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Slack className="w-4 h-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="space-y-6">

            {/* Account Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg">{profile.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profile.displayName}
                      onChange={(e) => handleProfileSave("displayName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <div className="pt-2">
                      <Badge variant="secondary">{profile.role}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password</Label>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* Locale Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Locale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Select value={profile.timezone} onValueChange={(value) => handleProfileSave("timezone", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={profile.dateFormat} onValueChange={(value) => handleProfileSave("dateFormat", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={profile.language} disabled>
                    <SelectTrigger className="bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">More languages coming soon</p>
                </div>
              </CardContent>
            </Card>

            {/* API Key Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Primary API Key</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      value={showApiKey ? apiKey : "pk_live_••••••••••••••••••••••••••••••••"}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleApiKeyRotate}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rotating key breaks SDK until updated in code
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="space-y-6">
            {/* Credits Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credit Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold">{billing.remainingCredits.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">of {billing.totalCredits.toLocaleString()} credits</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{billing.estimatedDaysLeft} days</div>
                    <div className="text-sm text-muted-foreground">estimated remaining</div>
                  </div>
                  <div>
                    <Badge className="text-sm">{billing.currentPlan} · ${billing.planPrice}/mo</Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={(billing.remainingCredits / billing.totalCredits) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Usage chart coming soon</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">•••• •••• •••• {billing.lastFourDigits}</div>
                    <div className="text-sm text-muted-foreground">Expires 12/26</div>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
                <div>
                  <Label htmlFor="billingEmail">Billing Email</Label>
                  <Input
                    id="billingEmail"
                    value={billing.billingEmail}
                    onChange={() => {}}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recharge Credits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recharge Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { amount: 1000, price: 19 },
                    { amount: 5000, price: 89 },
                    { amount: 10000, price: 169 }
                  ].map((option) => (
                    <Card key={option.amount} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold">+{option.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground mb-3">credits</div>
                        <Button className="w-full">
                          Buy ${option.price}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Up to 100 files or 25 MB total in beta.
              </AlertDescription>
            </Alert>

            {/* Upload Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-sm font-medium">Drop files here or click to upload</div>
                  <div className="text-xs text-muted-foreground">PDF, MD, TXT (max 10 MB each)</div>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.md,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                        <SelectItem value="design">Design Bible</SelectItem>
                        <SelectItem value="guidelines">Guidelines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                </div>
              </CardContent>
            </Card>

            {/* Documents Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {kbFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {file.tokens.toLocaleString()} tokens · {file.category} · {file.visibility}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          file.status === "Ready" ? "default" :
                          file.status === "Processing" ? "secondary" : "destructive"
                        }>
                          {file.status === "Ready" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {file.status === "Processing" && <Clock className="h-3 w-3 mr-1" />}
                          {file.status === "Failed" && <XCircle className="h-3 w-3 mr-1" />}
                          {file.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="space-y-6">
            {/* Slack Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Slack className="h-5 w-5" />
                  <span>Slack</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!slackConnected ? (
                  <div className="text-center p-8">
                    <Slack className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <div className="text-lg font-medium mb-2">Connect to Slack</div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Send live alerts & summaries to your team
                    </div>
                    <Button onClick={handleSlackConnect}>
                      <Slack className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <span className="font-medium">{slackConfig.workspace}</span>
                      </div>
                      <Button variant="destructive" size="sm">
                        Disconnect
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor="slackChannel">Channel</Label>
                      <Select value={slackConfig.channel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="#alerts">#alerts</SelectItem>
                          <SelectItem value="#general">#general</SelectItem>
                          <SelectItem value="#experiments">#experiments</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bot must be invited to channel after connection
                      </p>
                    </div>

                    <div>
                      <Label className="text-base font-medium mb-3 block">Event Notifications</Label>
                      <div className="space-y-3">
                        {[
                          { key: "failures", label: "Silent-push failure", default: true },
                          { key: "autoRollout", label: "Experience auto-rollout", default: false },
                          { key: "weeklySummary", label: "Weekly summary", default: true }
                        ].map((event) => (
                          <div key={event.key} className="flex items-center justify-between">
                            <Label>{event.label}</Label>
                            <Switch
                              checked={slackConfig.events[event.key as keyof typeof slackConfig.events]}
                              onCheckedChange={(checked) =>
                                setSlackConfig(prev => ({
                                  ...prev,
                                  events: { ...prev.events, [event.key]: checked }
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}