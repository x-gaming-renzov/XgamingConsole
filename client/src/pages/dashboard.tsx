import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";

interface DashboardMetrics {
  activeExperiences: number;
  avgD0Retention: number;
  avgD1Retention: number;
  activationRate: number;
  campaignsNeedAttention: boolean;
  activeCampaigns: Array<{
    id: number;
    label: string;
    utmSource: string;
    d1Highest: number;
    d1Lowest: number;
    newUsersToday: number;
    activeExperiences: number;
    status: "Active" | "Paused" | "Draft";
  }>;
}

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/metrics/overview"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your FTUE experiences and campaign performance</p>
        </div>
        <Link href="/experiences/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Experience
          </Button>
        </Link>
      </div>

      {/* Alert Strip */}
      {metrics?.campaignsNeedAttention && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Campaigns need attention — some are underperforming on Day-1 retention.{" "}
            <Link href="/campaigns?filter=needs_attention" className="underline font-medium">
              View Campaigns
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Experiences</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.activeExperiences || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+{metrics?.activeExperiences || 0}</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg D0 Retention</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.avgD0Retention || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+2.1%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg D1 Retention</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.avgD1Retention || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+4.2%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activation Rate</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.activationRate || 0}%</p>
                <p className="text-xs text-muted-foreground">% who reach Level 2</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+1.8%</span> from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Campaigns</CardTitle>
            <Link href="/campaigns">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {metrics?.activeCampaigns && metrics.activeCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="space-y-3">
                    {/* Campaign Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{campaign.label}</h4>
                          <p className="text-xs text-muted-foreground">{campaign.utmSource}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={campaign.status === "Active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    {/* D1 Retention Range */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">D1 Retention Range</span>
                        <span className="font-medium">
                          {campaign.d1Lowest}% - {campaign.d1Highest}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full" 
                          style={{ width: `${(campaign.d1Highest / 100) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-accent/30 rounded">
                        <div className="font-bold text-foreground">{campaign.newUsersToday.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">New Users Today</div>
                      </div>
                      <div className="text-center p-2 bg-accent/30 rounded">
                        <div className="font-bold text-foreground">{campaign.activeExperiences}</div>
                        <div className="text-xs text-muted-foreground">Active Experiences</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No active campaigns</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to start acquiring users and testing experiences
              </p>
              <Link href="/campaigns">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </ConsoleLayout>
  );
}