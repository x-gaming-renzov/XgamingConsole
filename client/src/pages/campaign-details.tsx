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
  Calendar,
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";

interface CampaignDetail {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Scheduled" | "Ended" | "Paused" | "Draft";
  ruleConfig: {
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    operator: string;
  };
  launchedAt: string;
  organisationId: string;
  appId: string;
  createdAt: string;
  modifiedAt: string;
  experienceCount: number;
  activeExperiences: number;
  experiences: {
    id: string;
    name: string;
    segment: string;
    splitPercent: number;
    uplift: number;
    status: "Active" | "Rolling out" | "Paused";
  }[];
  // Legacy fields for backward compatibility
  utmSource: string;
}

export default function CampaignDetails() {
  const { campaignId } = useParams<{ campaignId: string }>();

  // Fetch campaign details from API
  const { data: campaignData, isLoading, error } = useQuery<CampaignDetail>({
    queryKey: [`/api/campaigns/${campaignId}`],
    enabled: !!campaignId,
  });


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

  if (isLoading) {
    return (
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  if (error) {
    return (
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Campaign</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Failed to load campaign details"}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  if (!campaignData) {
    return (
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Campaign Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The campaign you're looking for doesn't exist or has been deleted.
              </p>
              <Button onClick={() => window.location.href = "/campaigns"}>
                Back to Campaigns
              </Button>
            </div>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

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
                    User-acquisition stream • Live since {formatDate(campaignData.launchedAt)}
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
        <Tabs defaultValue="rules">
          <TabsList>
            {/* <TabsTrigger value="overview">Overview</TabsTrigger> */}
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            {/* <TabsTrigger value="history">History</TabsTrigger> */}
          </TabsList>

          {/* Tab A - Overview */}
          {/* <TabsContent value="overview" className="space-y-6">
            KPI Tiles
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

            Experience Allocation
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

            Top Segments
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

            Bound Objects
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
          </TabsContent> */}

          {/* Tab B - Rules Configuration */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Rules</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Rules determine which users are included in this campaign
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Conditions ({campaignData.ruleConfig.operator})</h4>
                    <div className="space-y-2">
                      {campaignData.ruleConfig.conditions.map((condition: any, index: number) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium">{condition.field}</span>
                            <span className="mx-2 text-muted-foreground">{condition.operator}</span>
                            <span className="font-medium">{condition.value}</span>
                          </div>
                          <Badge variant="outline">{condition.operator}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Rule Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      Users will be included in this campaign if their{" "}
                      <strong>utm_source</strong> equals <strong>"{campaignData.ruleConfig.conditions[0]?.value}"</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab C - Experiences */}
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
                    <p className="text-sm text-muted-foreground">Launch Date</p>
                    <p className="text-lg font-medium">{formatDate(campaignData.launchedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-medium">{campaignData.status}</p>
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
                      <p className="text-sm font-medium">Campaign Launched</p>
                      <p className="text-xs text-muted-foreground">{formatDate(campaignData.launchedAt)}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Current Status</p>
                      <p className="text-xs text-muted-foreground">{campaignData.status}</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
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
          {/* <TabsContent value="history" className="space-y-6">
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
          </TabsContent> */}
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}