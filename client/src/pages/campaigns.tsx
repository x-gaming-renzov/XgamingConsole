import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Settings, DollarSign, Users, TrendingUp, Package } from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";

interface Campaign {
  id: number;
  name: string;
  utmSource: string;
  utmCampaign: string;
  installs: number;
  d0Retention: number;
  d1Retention: number;
  revenue: number;
  flagBundle: string;
  allocation: number;
  status: "Active" | "Paused" | "Draft";
}

interface CampaignMetrics {
  estRevenue: number;
  totalInstalls: number;
  avgD0Retention: number;
  objectsBound: number;
}

export default function Campaigns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);

  const { data: metrics } = useQuery<CampaignMetrics>({
    queryKey: ["/api/campaigns/metrics"],
  });

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const filteredCampaigns = campaigns?.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.utmSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.utmCampaign.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getRetentionBadge = (retention: number, avg: number) => {
    if (retention >= avg + 5) return { label: "High", variant: "default" as const };
    if (retention < avg - 3) return { label: "Low", variant: "destructive" as const };
    return { label: "Normal", variant: "secondary" as const };
  };

  return (
    <>
      <ConsoleLayout onQuickExperience={() => setShowQuickPrompt(true)}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
              <p className="text-muted-foreground">Manage your user acquisition campaigns and their FTUE experiences</p>
            </div>
        <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="utmSource">UTM Source</Label>
                <Input id="utmSource" placeholder="e.g., facebook" />
              </div>
              <div>
                <Label htmlFor="label">Label (optional)</Label>
                <Input id="label" placeholder="e.g., Q1 Acquisition Campaign" />
              </div>
              <Button className="w-full">Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Est. Revenue</p>
                <p className="text-2xl font-bold text-foreground">${(metrics?.estRevenue || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Installs</p>
                <p className="text-2xl font-bold text-foreground">{(metrics?.totalInstalls || 0).toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg D0 Retention</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.avgD0Retention || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objects Bound</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.objectsBound || 0}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Installs</TableHead>
                  <TableHead>D0 Retention</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Flag Bundle</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const retentionBadge = getRetentionBadge(campaign.d0Retention, metrics?.avgD0Retention || 0);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.utmSource} • {campaign.utmCampaign}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{campaign.installs.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{campaign.d0Retention}%</span>
                          <Badge variant={retentionBadge.variant}>
                            {retentionBadge.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>${campaign.revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {campaign.flagBundle}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.allocation}%</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No campaigns detected</h3>
              <p className="text-muted-foreground mb-4">
                Launch a UA campaign or create one manually to start mapping experiences
              </p>
              <Button onClick={() => setShowNewCampaign(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
        </Card>
        </div>
      </ConsoleLayout>
      
      <QuickExperiencePrompt 
        open={showQuickPrompt} 
        onClose={() => setShowQuickPrompt(false)} 
      />
    </>
  );
}