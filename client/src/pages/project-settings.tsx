import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, Trash2, Download, FileText, FileImage, File, 
  Slack, CheckCircle, AlertCircle, DollarSign, CreditCard,
  TrendingUp, Calendar, Plus, User, Crown, Shield, UserCheck, Mail, Eye, Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth, isCurrentUserAdmin } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import ConsoleLayout from "@/components/console-layout";

interface KnowledgeBaseFile {
  id: number;
  name: string;
  tokens: number;
  status: "Ready" | "Processing" | "Failed";
  category: string;
  visibility: "Org-wide" | "Private";
}

interface Transaction {
  id: number;
  credits: number;
  cost: number;
  date: string;
  status: "Completed" | "Failed" | "Pending";
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending" | "inactive";
  lastActive?: string;
  invitedBy?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  invited_by_name: string;
  created_at: string;
}

interface InviteRequest {
  email: string;
  role: "admin" | "member";
}

export default function ProjectSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has admin permissions
  const isAdmin = isCurrentUserAdmin();
  
  // If user is not admin, redirect or show message
  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin or owner permissions to access project settings.",
        variant: "destructive"
      });
    }
  }, [user, isAdmin, toast]);

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

  // Transaction history
  const [transactions] = useState<Transaction[]>([
    { id: 1, credits: 10000, cost: 169, date: "2025-06-01", status: "Completed" },
    { id: 2, credits: 5000, cost: 89, date: "2025-05-15", status: "Completed" },
    { id: 3, credits: 1000, cost: 19, date: "2025-05-01", status: "Completed" },
    { id: 4, credits: 5000, cost: 89, date: "2025-04-05", status: "Completed" },
    { id: 5, credits: 1000, cost: 19, date: "2025-04-05", status: "Failed" }
  ]);

  // Knowledge Base state
  const [kbFiles, setKbFiles] = useState<KnowledgeBaseFile[]>([
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

  // Invitation state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch pending invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invitations/invitations?status=pending");
      return response.json() as Promise<Invitation[]>;
    },
    enabled: isAdmin,
  });

  // For now, we'll show current user as the only "member" 
  // In a real system, you'd have an API to fetch organization members
  const teamMembers: TeamMember[] = user ? [{
    id: user.email, // Using email as ID since we don't have user ID
    name: user.name,
    email: user.email,
    role: user.role as "owner" | "admin" | "member",
    status: "active" as const,
    lastActive: "Now",
    invitedBy: undefined
  }] : [];

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

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (inviteData: InviteRequest) => {
      const response = await apiRequest("POST", "/api/invitations/invite", inviteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setInviteEmail("");
      setInviteRole("member");
      setInviteDialogOpen(false);
      toast({ 
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Send Invitation",
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    }
  });

  // Cancel invitation mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest("DELETE", `/api/invitations/invitations/${invitationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ 
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Cancel Invitation",
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    }
  });

  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast({ 
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive" 
      });
      return;
    }

    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInviteMutation.mutate(invitationId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4" />;
      case "admin": return <Shield className="w-4 h-4" />;
      case "member": return <User className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      case "member": return "Member";
      default: return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "1 day ago";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <FileImage className="w-4 h-4" />;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "inactive": return "outline";
      case "Ready": return "default";
      case "Processing": return "secondary";
      case "Failed": return "destructive";
      default: return "secondary";
    }
  };

  const getTransactionStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed": return "default";
      case "Pending": return "secondary";
      case "Failed": return "destructive";
      default: return "secondary";
    }
  };

  const creditUsagePercentage = ((billing.totalCredits - billing.remainingCredits) / billing.totalCredits) * 100;

  return (
    <ConsoleLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Project Settings</span>
          </div>
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage project-specific settings and integrations.
          </p>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            {/* Only show to admins/owners */}
            {!isAdmin ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Admin Access Required</h3>
                    <p className="text-sm text-muted-foreground">
                      You need admin or owner permissions to manage team members.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Current Members */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Organization Members</CardTitle>
                        <CardDescription>
                          Current members of your organization.
                        </CardDescription>
                      </div>
                      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button disabled={inviteMutation.isPending}>
                            <Plus className="w-4 h-4 mr-2" />
                            {inviteMutation.isPending ? "Sending..." : "Invite Member"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                              Send an invitation to join your organization.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="invite-email">Email Address</Label>
                              <Input
                                id="invite-email"
                                type="email"
                                placeholder="colleague@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                disabled={inviteMutation.isPending}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invite-role">Role</Label>
                              <Select 
                                value={inviteRole} 
                                onValueChange={(value: "admin" | "member") => setInviteRole(value)}
                                disabled={inviteMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin - Full access to organization</SelectItem>
                                  <SelectItem value="member">Member - Standard access</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setInviteDialogOpen(false)}
                              disabled={inviteMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleInviteMember}
                              disabled={inviteMutation.isPending}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Active</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(member.role)}
                                <span className="font-medium">{getRoleDisplayName(member.role)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(member.status) as any}>
                                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {member.lastActive || "Never"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Pending Invitations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Pending Invitations</span>
                    </CardTitle>
                    <CardDescription>
                      Invitations that haven't been accepted yet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {invitationsLoading ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">Loading invitations...</p>
                      </div>
                    ) : invitations.length === 0 ? (
                      <div className="text-center py-6">
                        <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No Pending Invitations</h3>
                        <p className="text-sm text-muted-foreground">
                          All invitations have been accepted or there are none pending.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Invited By</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((invitation) => (
                            <TableRow key={invitation.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs">
                                      {invitation.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{invitation.email}</p>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getRoleIcon(invitation.role)}
                                  <span className="font-medium">{getRoleDisplayName(invitation.role)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {invitation.invited_by_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatRelativeTime(invitation.created_at)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(invitation.expires_at)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  disabled={cancelInviteMutation.isPending}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            {/* Credit Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Credit Balance</span>
                </CardTitle>
                <CardDescription>
                  Track your credit usage and remaining balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{billing.remainingCredits.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Credits Remaining</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{billing.estimatedDaysLeft}</div>
                    <p className="text-sm text-muted-foreground">Days Left</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{billing.currentPlan}</div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usage</span>
                    <span>{(billing.totalCredits - billing.remainingCredits).toLocaleString()} / {billing.totalCredits.toLocaleString()}</span>
                  </div>
                  <Progress value={creditUsagePercentage} className="h-3" />
                </div>

                <div className="flex justify-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Credits
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Purchase Credits</DialogTitle>
                        <DialogDescription>
                          Select a credit package to add to your account.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">1,000 Credits</p>
                              <p className="text-sm text-muted-foreground">Perfect for small teams</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">$19</p>
                              <p className="text-xs text-muted-foreground">$0.019/credit</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">5,000 Credits</p>
                              <p className="text-sm text-muted-foreground">Most popular</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">$89</p>
                              <p className="text-xs text-muted-foreground">$0.018/credit</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">10,000 Credits</p>
                              <p className="text-sm text-muted-foreground">Best value</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">$169</p>
                              <p className="text-xs text-muted-foreground">$0.017/credit</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="w-full">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Continue to Payment
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Manage your payment information and billing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">•••• •••• •••• {billing.lastFourDigits}</p>
                      <p className="text-sm text-muted-foreground">Expires 12/26</p>
                    </div>
                  </div>
                  <Button variant="outline">Update</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Billing Email</p>
                    <p className="text-sm text-muted-foreground">{billing.billingEmail}</p>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  View your recent credit purchases and payments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.credits.toLocaleString()}</TableCell>
                        <TableCell>${transaction.cost}</TableCell>
                        <TableCell>
                          <Badge variant={getTransactionStatusBadgeVariant(transaction.status) as any}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  Upload documents to improve LLM experiment suggestions and citations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Drag and drop files here, or click to browse</p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOC, DOCX, TXT, MD files up to 10MB
                    </p>
                  </div>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="mt-4"
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

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kbFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getFileIcon(file.name)}
                            <span className="font-medium">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.tokens.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(file.status) as any}>
                            {file.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{file.category}</TableCell>
                        <TableCell>{file.visibility}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileDelete(file.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            {/* Slack Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Slack className="w-5 h-5" />
                  <span>Slack Integration</span>
                </CardTitle>
                <CardDescription>
                  Get notifications about experiment status and alerts in Slack.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!slackConnected ? (
                  <div className="text-center py-6">
                    <Slack className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Connect to Slack</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Receive real-time notifications about your experiments directly in Slack.
                    </p>
                    <Button onClick={handleSlackConnect}>
                      Connect Workspace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">Connected to {slackConfig.workspace}</p>
                          <p className="text-sm text-muted-foreground">Channel: {slackConfig.channel}</p>
                        </div>
                      </div>
                      <Button variant="outline">
                        Disconnect
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="slack-channel">Notification Channel</Label>
                        <Input
                          id="slack-channel"
                          value={slackConfig.channel}
                          onChange={(e) => setSlackConfig(prev => ({ ...prev, channel: e.target.value }))}
                          placeholder="#alerts"
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Event Notifications</Label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Experiment Failures</p>
                              <p className="text-sm text-muted-foreground">Get notified when experiments fail</p>
                            </div>
                            <Switch 
                              checked={slackConfig.events.failures}
                              onCheckedChange={(checked) => 
                                setSlackConfig(prev => ({ 
                                  ...prev, 
                                  events: { ...prev.events, failures: checked }
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Auto-rollout Events</p>
                              <p className="text-sm text-muted-foreground">Notifications for automatic rollouts</p>
                            </div>
                            <Switch 
                              checked={slackConfig.events.autoRollout}
                              onCheckedChange={(checked) => 
                                setSlackConfig(prev => ({ 
                                  ...prev, 
                                  events: { ...prev.events, autoRollout: checked }
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Weekly Summary</p>
                              <p className="text-sm text-muted-foreground">Weekly experiment performance summary</p>
                            </div>
                            <Switch 
                              checked={slackConfig.events.weeklySummary}
                              onCheckedChange={(checked) => 
                                setSlackConfig(prev => ({ 
                                  ...prev, 
                                  events: { ...prev.events, weeklySummary: checked }
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other Integrations */}
            <Card>
              <CardHeader>
                <CardTitle>More Integrations</CardTitle>
                <CardDescription>
                  Connect with other tools and services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-muted-foreground">
                  <p>More integrations coming soon...</p>
                  <p className="text-sm mt-2">Request integrations at support@xgamingnova.com</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}