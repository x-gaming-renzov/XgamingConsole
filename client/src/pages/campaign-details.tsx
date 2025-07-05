import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Edit2, 
  MoreVertical, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package,
  Play,
  Pause,
  Archive,
  Copy,
  BarChart3,
  Target,
  Calendar,
  Activity
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";

interface CampaignDetail {
  id: number;
  name: string;
  utmSource: string;
  status: "Active" | "Scheduled" | "Ended" | "Paused";
  startDate: string;
  endDate?: string;
  metrics: {
    installs7d: number;
    avgD0Retention: number;
    avgD1Retention: number;
    revenue7d: number;
  };
  experiences: {
    id: string;
    name: string;
    segment: string;
    splitPercent: number;
    uplift: number;
    status: "Active" | "Rolling out" | "Paused";
  }[];
  segments: {
    name: string;
    trafficPercent: number;
  }[];
  boundObjects: {
    id: string;
    name: string;
    type: string;
  }[];
  history: {
    id: string;
    date: string;
    event: string;
  }[];
}

export default function CampaignDetails() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for now - will be replaced with API call
  const campaignData: CampaignDetail = {
    id: parseInt(campaignId || "1"),
    name: "Q1 Acquisition Push",
    utmSource: "facebook",
    status: "Active",
    startDate: "2025-07-05T09:00:00Z",
    endDate: undefined,
    metrics: {
      installs7d: 1247,
      avgD0Retention: 58,
      avgD1Retention: 40,
      revenue7d: 2450
    },
    experiences: [
      {
        id: "exp1",
        name: "Enhanced Onboarding",
        segment: "All players",
        splitPercent: 50,
        uplift: 4.1,
        status: "Active"
      },
      {
        id: "exp2", 
        name: "VIP Tutorial",
        segment: "High-Tier iOS",
        splitPercent: 70,
        uplift: 6.0,
        status: "Rolling out"
      }
    ],
    segments: [
      { name: "High-Tier iOS", trafficPercent: 42 },
      { name: "TikTok Users", trafficPercent: 28 },
      { name: "Returning Players", trafficPercent: 15 }
    ],
    boundObjects: [
      { id: "obj1", name: "Tutorial Config", type: "Configuration" },
      { id: "obj2", name: "Reward Amounts", type: "Economy" },
      { id: "obj3", name: "UI Layout", type: "Interface" }
    ],
    history: [
      { id: "h1", date: "2025-07-10T09:00:00Z", event: "Split changed: VIP Tutorial 25 → 50%" },
      { id: "h2", date: "2025-07-05T09:00:00Z", event: "Campaign started (Scheduled)" },
      { id: "h3", date: "2025-07-01T15:22:00Z", event: "Campaign created" }
    ]
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "Scheduled":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "Paused":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Paused</Badge>;
      case "Ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link>
            <span>/</span>
            <span className="text-foreground">{campaignData.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/campaigns">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold">{campaignData.name}</h1>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-mono text-sm text-muted-foreground">{campaignData.utmSource}</span>
                  {getStatusBadge(campaignData.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  User-acquisition stream • Live since {formatDate(campaignData.startDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Tab A - Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Installs 7d</p>
                      <p className="text-2xl font-bold">{campaignData.metrics.installs7d.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg D0 Retention</p>
                      <p className="text-2xl font-bold">{campaignData.metrics.avgD0Retention}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg D1 Retention</p>
                      <p className="text-2xl font-bold">{campaignData.metrics.avgD1Retention}%</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue 7d</p>
                      <p className="text-2xl font-bold">${campaignData.metrics.revenue7d.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Experience Allocation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Experience Allocation</CardTitle>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Split
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6">
                    <div className="flex h-full rounded-full overflow-hidden">
                      <div className="bg-gray-400 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: '30%' }}>
                        Control 30%
                      </div>
                      <div className="bg-blue-500 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: '50%' }}>
                        Enhanced Onboarding 50%
                      </div>
                      <div className="bg-purple-500 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: '20%' }}>
                        VIP Tutorial 20%
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hover for detailed split information • Rolling 7-day average
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Top Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Top Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {campaignData.segments.map((segment, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1">
                      {segment.name} ({segment.trafficPercent}% of installs)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bound Objects */}
            <Card>
              <CardHeader>
                <CardTitle>Bound Objects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaignData.boundObjects.map((object) => (
                    <div key={object.id} className="flex items-center justify-between p-2 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{object.name}</p>
                          <p className="text-xs text-muted-foreground">{object.type}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab B - Experiences */}
          <TabsContent value="experiences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Experiences in Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experience</TableHead>
                      <TableHead>Segment / Audience</TableHead>
                      <TableHead>Split %</TableHead>
                      <TableHead>Uplift (Δ D1)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignData.experiences.map((experience) => (
                      <TableRow key={experience.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{experience.name}</TableCell>
                        <TableCell>{experience.segment}</TableCell>
                        <TableCell>{experience.splitPercent}%</TableCell>
                        <TableCell className="text-green-600">+{experience.uplift}%</TableCell>
                        <TableCell>
                          {getStatusBadge(experience.status)}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Adjust Split
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab C - Schedule */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Window</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="text-lg font-medium">{formatDate(campaignData.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="text-lg font-medium">
                      {campaignData.endDate ? formatDate(campaignData.endDate) : "No end date set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Campaign has been running for 5 days</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Timeline information is managed by your marketing team and reflects actual campaign launch dates.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Campaign Released</p>
                      <p className="text-xs text-muted-foreground">{formatDate(campaignData.startDate)}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>
                  </div>
                  
                  {campaignData.endDate ? (
                    <div className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Scheduled End</p>
                        <p className="text-xs text-muted-foreground">{formatDate(campaignData.endDate)}</p>
                      </div>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4 p-3 border border-dashed border-border rounded-lg">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">No End Date Scheduled</p>
                        <p className="text-xs text-muted-foreground">Campaign will run indefinitely</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Schedule Information</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Campaign dates reflect when your marketing team released the campaign. 
                        Contact your team lead to update timeline information.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab D - History */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaignData.history.map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-3 border border-border rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}