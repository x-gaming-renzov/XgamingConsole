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
  TrendingUp, Calendar, Plus, User, Crown, Shield, UserCheck, Mail, Eye, Clock,
  Code, BarChart2
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
  role: "owner" | "admin" | "developer" | "analyst" | "member";
  status: "active" | "pending" | "inactive";
  lastActive?: string;
  invitedBy?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "developer" | "analyst" | "member";
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  invited_by_name: string;
  created_at: string;
}

interface InviteRequest {
  email: string;
  role: "admin" | "developer" | "analyst" | "member";
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
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "developer" | "analyst">("member");
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

  // Fetch all organization members
  const { data: organizationMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['orgMembers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/users');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch app & org context (Integrations)
  const { data: authContext, isLoading: contextLoading } = useQuery({
    queryKey: ['authContext'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/context');
      return res.json() as Promise<{ organisation_id: string; app_id: string; api_key: string; backend_url: string }>;
    },
    enabled: isAdmin,
  });

  // Map the API response to our TeamMember type
  const teamMembers: TeamMember[] = organizationMembers.map((member: any) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role as "owner" | "admin" | "member" | "developer" | "analyst",
    status: "active" as const,
    lastActive: "Now", // We don't have this info from the API
    invitedBy: undefined
  }));

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
      case "developer": return <Code className="w-4 h-4" />;
      case "analyst": return <BarChart2 className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      case "member": return "Member";
      case "developer": return "Developer";
      case "analyst": return "Analyst";
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
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
                                  <SelectItem value="developer">Developer - Integration access</SelectItem>
                                  <SelectItem value="analyst">Analyst - Create and Launch Experiments</SelectItem>
                                  <SelectItem value="member">Member - Read access</SelectItem>
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
                    {membersLoading ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">Loading organization members...</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
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

                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
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

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Details</CardTitle>
                <CardDescription>Keys and URLs for SDK and API access.</CardDescription>
              </CardHeader>
              <CardContent>
                {contextLoading ? (
                  <p>Loading...</p>
                ) : authContext ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Organisation ID</Label>
                      <Input readOnly value={authContext.organisation_id} />
                    </div>
                    <div>
                      <Label>App ID</Label>
                      <Input readOnly value={authContext.app_id} />
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input readOnly value={authContext.api_key} />
                    </div>
                    <div>
                      <Label>Backend URL</Label>
                      <Input readOnly value={authContext.backend_url} />
                    </div>
                  </div>
                ) : (
                  <p>No integration data available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}