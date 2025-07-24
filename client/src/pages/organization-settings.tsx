import { useState, useEffect } from "react";
import ConsoleLayout from "@/components/console-layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamMember {
  id: string | number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  invitedBy: string;
}

export default function OrganizationSettings() {
  const { token, fetchOrgs } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const data = await fetchOrgs();
        setOrgs(data);
        if (data.length) setSelectedOrg(data[0].pid);
      } catch (e: any) {
        toast({ description: e.message, variant: 'destructive' });
      }
    }
    loadOrgs();
  }, []);

  useEffect(() => {
    async function loadMembers() {
      if (!selectedOrg) return;
      try {
        const res = await fetch(`/api/orgs/${selectedOrg}/members`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(await res.text());
        const raw = await res.json();
        const mapped = raw.map((m: any) => ({ id: m.user_id, name: m.full_name ?? m.email, email: m.email, role: m.role, status: m.status ?? 'active', lastActive: m.last_active ?? 'Never', invitedBy: m.invited_by ?? '' }));
        setMembers(mapped);
      } catch (e: any) {
        toast({ description: e.message, variant: 'destructive' });
      }
    }
    loadMembers();
  }, [selectedOrg]);

  const handleInvite = async () => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/orgs/${selectedOrg}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ description: `Invited ${inviteEmail}` }); setInviteOpen(false); setInviteEmail('');
      setInviteRole('member');
      // reload
      const memb = await (await fetch(`/api/orgs/${selectedOrg}/members`, { headers: { Authorization: `Bearer ${token}` } })).json();
      setMembers(memb.map((m: any) => ({ id: m.user_id, name: m.full_name ?? m.email, email: m.email, role: m.role })));
    } catch (e: any) {
      toast({ description: e.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (id: string | number) => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/orgs/${selectedOrg}/members/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Remove failed');
      setMembers(members.filter(m => m.id !== id));
      toast({ description: 'Member removed' });
    } catch (e: any) {
      toast({ description: e.message, variant: 'destructive' });
    }
  };
  // Change member role
  const handleRoleChange = async (id: string | number, role: string) => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/orgs/${selectedOrg}/members/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error(await res.text());
      setMembers(members.map(m => m.id === id ? { ...m, role } : m));
      toast({ description: 'Role updated', });
    } catch (e: any) {
      toast({ description: e.message, variant: 'destructive' });
    }
  };

  return (
    <ConsoleLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Settings</span><span className="mx-2">/</span><span className="text-foreground">Organization</span>
            </div>
            <h1 className="text-2xl font-semibold">Organization Settings</h1>
          </div>
          <Select onValueChange={value => setSelectedOrg(value)} value={selectedOrg || ''}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Org" />
            </SelectTrigger>
            <SelectContent>
            {orgs.map(o => <SelectItem key={o.pid} value={o.pid}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Organization Members</CardTitle>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite to Organization</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>Enter email and select role to invite</DialogDescription>
                  <div className="space-y-4">
                    <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={(val: 'admin' | 'member') => setInviteRole(val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInvite}>Send Invite</Button>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{m.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-sm text-muted-foreground">{m.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={value => handleRoleChange(m.id, value)}>
                        <SelectTrigger className="h-auto px-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Button variant="ghost" onClick={()=>handleRemove(m.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
