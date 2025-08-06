import { useState, useEffect } from "react";
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
  TrendingUp, Calendar, Plus, User, Crown, Shield, UserCheck, Mail,
  Eye, Clock, X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { handleError, showSuccess } from "@/lib/errorHandler";
import ConsoleLayout from "@/components/console-layout";
import { useAuth } from "@/contexts/AuthContext";

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
  id: number;
  name: string;
  email: string;
  role: "admin" | "developer" | "analyst" | "viewer" | "owner";
  status: "active" | "pending" | "inactive";
  lastActive: string;
  invitedBy: string;
}

interface PendingInvite {
  pid: string;
  target_type: string;
  target_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function AppSettings() {
  const { token, selectedAppId } = useAuth();

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

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "developer" | "analyst" | "viewer" | "owner">("viewer");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Load members when app selected
  useEffect(() => {
    async function loadMembers() {
      if (!selectedAppId) return;
      try {
        const res = await fetch(`/api/apps/${selectedAppId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        // Map Nova response to TeamMember shape
        const raw = await res.json();
        const mapped = raw.map((m: any) => ({
          id: m.user_id,
          name: m.full_name ?? m.name ?? m.email,
          email: m.email,
          role: m.role,
          status: m.status ?? 'active',
          lastActive: m.last_active ?? 'Never',
          invitedBy: m.invited_by ?? ''
        }));
        setTeamMembers(mapped);
      } catch (err: any) {
        console.error('Load members error:', err);
        handleError(err, 'load team members');
      }
    }

    async function loadPendingInvites() {
      if (!selectedAppId) return;
      try {
        const res = await fetch(`/api/apps/${selectedAppId}/pending-invites`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (!res.ok) {
          // If it's a 404 or other error that might indicate no pending invites endpoint, just set empty array
          if (res.status === 404) {
            setPendingInvites([]);
            return;
          }
          throw new Error(await res.text());
        }
        
        const text = await res.text();
        if (!text.trim()) {
          // Handle empty response
          setPendingInvites([]);
          return;
        }
        
        try {
          const invites = JSON.parse(text);
          setPendingInvites(Array.isArray(invites) ? invites : []);
        } catch (jsonError) {
          console.warn('Failed to parse pending invites JSON:', text);
          setPendingInvites([]);
        }
      } catch (err: any) {
        console.error('Load pending invites error:', err);
        // Don't show error for pending invites - just set empty array and continue
        setPendingInvites([]);
      }
    }

    loadMembers();
    loadPendingInvites();
  }, [selectedAppId]);

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
          showSuccess("File Uploaded", "File uploaded successfully");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileDelete = (fileId: number) => {
    setKbFiles(prev => prev.filter(f => f.id !== fileId));
    showSuccess("File Deleted", "File deleted successfully");
  };

  const handleSlackConnect = () => {
    setSlackConnected(true);
    showSuccess("Slack Connected", "Slack integration connected successfully");
  };

  const handleInviteMember = () => {
    if (!selectedAppId) return;
    fetch(`/api/apps/${selectedAppId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole })
    })
    .then(async res => { 
      if (!res.ok) throw new Error(await res.text());
      return res.json(); 
    })
    .then(() => {
      showSuccess("Invitation Sent", `Invitation sent to ${inviteEmail}`);
      setInviteEmail(""); setInviteRole("viewer"); setInviteDialogOpen(false);
      
      // Reload both members and pending invites
      return Promise.all([
        fetch(`/api/apps/${selectedAppId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/apps/${selectedAppId}/pending-invites`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
    })
    .then(([membersRes, invitesRes]) => Promise.all([
      membersRes.json(), 
      invitesRes.ok ? invitesRes.text() : Promise.resolve('')
    ]))
    .then(([membersData, invitesText]) => {
      const mapped = membersData.map((m: any) => ({
        id: m.user_id,
        name: m.full_name ?? m.name ?? m.email,
        email: m.email,
        role: m.role,
        status: m.status ?? 'active',
        lastActive: m.last_active ?? 'Never',
        invitedBy: m.invited_by ?? ''
      }));
      setTeamMembers(mapped);
      
      // Handle pending invites response safely
      if (invitesText.trim()) {
        try {
          const invitesData = JSON.parse(invitesText);
          setPendingInvites(Array.isArray(invitesData) ? invitesData : []);
        } catch (jsonError) {
          console.warn('Failed to parse pending invites after invite:', jsonError);
          setPendingInvites([]);
        }
      } else {
        setPendingInvites([]);
      }
    })
    .catch(err => {
      console.error('Invite error:', err);
      handleError(err, 'send invitation');
    });
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!selectedAppId) return;
    try {
      const res = await fetch(`/api/apps/${selectedAppId}/revoke-invite/${inviteId}`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Revoke invite failed');
      setPendingInvites(prevInvites => prevInvites.filter(invite => invite.pid !== inviteId));
      showSuccess("Invitation Revoked", "Pending invitation has been revoked");
    } catch (err: any) {
      handleError(err, "revoke invitation");
    }
  };

  const handleRemoveMember = (memberId: number) => {
    if (!selectedAppId) return;
    fetch(`/api/apps/${selectedAppId}/members/${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => { if (!res.ok) throw new Error('Remove failed'); })
    .then(() => {
      showSuccess("Member Removed", "Team member removed successfully");
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    })
    .catch(err => {
      console.error('Remove member error:', err);
      handleError(err, 'remove team member');
    });
  };

  const handleRoleChange = (memberId: number, newRole: "admin" | "developer" | "analyst" | "viewer" | "owner") => {
    if (!selectedAppId) return;
    fetch(`/api/apps/${selectedAppId}/members/${memberId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: newRole })
    })
    .then(async res => { if (!res.ok) throw new Error(await res.text()); return res.json(); })
    .then(() => {
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showSuccess("Role Updated", "Role updated successfully");
    })
    .catch(err => {
      console.error('Role change error:', err);
      handleError(err, 'update member role');
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Crown className="w-4 h-4" />;
      case "developer": return <UserCheck className="w-4 h-4" />;
      case "analyst": return <Shield className="w-4 h-4" />;
      case "viewer": return <Eye className="w-4 h-4" />;
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
            <span className="text-foreground">App Settings</span>
          </div>
          <h1 className="text-2xl font-semibold">App Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage app-specific settings and integrations.
          </p>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage team access and permissions for this project.
                    </CardDescription>
                  </div>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join this project.
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invite-role">Role</Label>
                          <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner - Full access</SelectItem>
                              <SelectItem value="admin">Admin - Full access</SelectItem>
                              <SelectItem value="developer">Developer - Manage integrations</SelectItem>
                              <SelectItem value="analyst">Analyst - Create and edit experiments and campaigns</SelectItem>
                              <SelectItem value="viewer">Viewer - View insights</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Invitation
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
                      <TableHead className="w-[50px]">Actions</TableHead>
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
                          <Select
                            value={member.role}
                            onValueChange={(value: any) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <div className="flex items-center space-x-1">
                                {getRoleIcon(member.role)}
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="developer">Developer</SelectItem>
                              <SelectItem value="analyst">Analyst</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
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

            {/* Pending Invites Section - Only show if there are pending invites */}
            {pendingInvites.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Pending Invitations ({pendingInvites.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map(invite => {
                        const createdDate = new Date(invite.created_at).toLocaleDateString();
                        const expiresDate = new Date(invite.expires_at).toLocaleDateString();
                        const isExpiringSoon = new Date(invite.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours
                        
                        return (
                          <TableRow key={invite.pid}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>{invite.email.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">{invite.email}</span>
                                  <span className="text-sm text-muted-foreground">Status: {invite.status}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{invite.role}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{createdDate}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm ${isExpiringSoon ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                {expiresDate}
                                {isExpiringSoon && ' (Soon)'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancelInvite(invite.pid)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>



        </Tabs>
      </div>
    </ConsoleLayout>
  );
}