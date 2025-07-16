import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  Edit2, 
  Play, 
  Pause, 
  Copy, 
  Archive,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Settings,
  Download,
  Plus
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

interface ExperienceDetails {
  id: string;
  name: string;
  status: string;
  description: string;
  priority: number;
  organisation_id: string;
  app_id: string;
  createdAt: string;
  endDate?: string;
  segments: Array<{
    pid: string;
    name: string;
    description: string;
    target_percentage: number;
    rule_config: any;
    created_at: string;
  }>;
  feature_variants: Array<{
    pid: string;
    name: string;
    config: Record<string, any>;
    created_at: string;
  }>;
  campaigns: Array<{
    pid: string;
    name: string;
    description: string;
    status: string;
    rule_config: any;
    launched_at: string;
    target_percentage: number;
    created_at: string;
  }>;
  segment_count: number;
  feature_variant_count: number;
  user_experience_count: number;
  campaign_count: number;
  history: Array<{
    date: string;
    event: string;
    by: string;
    type: 'created' | 'launched' | 'split_changed' | 'rolled_out' | 'paused' | 'resumed';
  }>;
}

export default function ExperienceDetails() {
  const { experienceId } = useParams();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  const { data: experience, isLoading } = useQuery<ExperienceDetails>({
    queryKey: [`/api/experiences/${experienceId}`],
  });

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await apiRequest("PUT", `/api/experiences/${experienceId}`, {
        name: newName
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
      setIsEditingName(false);
    }
  });

  const handleNameEdit = () => {
    if (experience) {
      setEditedName(experience.name);
      setIsEditingName(true);
    }
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== experience?.name) {
      updateNameMutation.mutate(editedName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "draft": return "bg-gray-500";
      case "paused": return "bg-yellow-500";
      case "completed": return "bg-gray-400";
      case "rolling_out": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "draft": return "Draft";
      case "paused": return "Paused";
      case "completed": return "Completed";
      case "rolling_out": return "Rolling out";
      default: return "Unknown";
    }
  };

  const getPrimaryAction = (status: string) => {
    switch (status) {
      case "draft": return { label: "Launch", icon: Play };
      case "active": return null; // No primary action when active
      case "rolling_out": return { label: "Pause Roll-out", icon: Pause };
      case "paused": return { label: "Resume", icon: Play };
      case "completed": return { label: "Duplicate", icon: Copy };
      default: return { label: "Edit", icon: Edit2 };
    }
  };

  const getSecondaryActions = (status: string) => {
    switch (status) {
      case "active": return [
        { label: "Pause", icon: Pause },
        { label: "Archive", icon: Archive }
      ];
      case "paused": return [
        { label: "Adjust Split", icon: Settings },
        { label: "Archive", icon: Archive }
      ];
      default: return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-muted-foreground">Experience not found</h2>
            <Link href="/experiences">
              <Button variant="outline" className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Experiences
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryAction = getPrimaryAction(experience.status);
  const secondaryActions = getSecondaryActions(experience.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/experiences">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Experiences
                </Button>
              </Link>
              <div className="text-muted-foreground">/</div>
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNameSave();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="text-xl font-bold"
                      autoFocus
                    />
                  </div>
                ) : (
                  <h1 
                    className="text-xl font-bold cursor-pointer hover:text-primary"
                    onClick={handleNameEdit}
                  >
                    {experience.name}
                  </h1>
                )}
                <Badge className={`${getStatusColor(experience.status)} text-white`}>
                  {getStatusText(experience.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {primaryAction && (
                <Button>
                  <primaryAction.icon className="w-4 h-4 mr-2" />
                  {primaryAction.label}
                </Button>
              )}
              {secondaryActions.map((action, index) => (
                <Button key={index} variant="outline">
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            {/* <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Priority</p>
                      <p className="text-2xl font-bold text-green-500">#{experience.priority}</p>
                      <p className="text-xs text-muted-foreground">experience order</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">User Experiences</p>
                      <p className="text-2xl font-bold">{experience.user_experience_count?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Segments</p>
                      <p className="text-2xl font-bold">{experience.segment_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Variants</p>
                      <p className="text-2xl font-bold">{experience.feature_variant_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Campaigns</p>
                      <p className="text-2xl font-bold">{experience.campaign_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segments Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Segments & Target Distribution</CardTitle>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Split
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(experience.segments || []).map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="font-medium">{segment.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="font-medium">{segment.description || 'No description'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Target %</p>
                          <p className="font-medium">{segment.target_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Created</p>
                          <p className="font-medium">{new Date(segment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(experience.segments || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No segments configured for this experience</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(experience.campaigns || []).map((campaign, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-5 gap-4 flex-1">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <Badge className={`mt-1 ${
                            campaign.status === 'active' ? 'bg-green-500' :
                            campaign.status === 'paused' ? 'bg-yellow-500' :
                            campaign.status === 'draft' ? 'bg-gray-500' :
                            'bg-gray-400'
                          } text-white`}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">UTM Source</p>
                          <p className="font-medium">
                            {campaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Target %</p>
                          <p className="font-medium">{campaign.target_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Launched</p>
                          <p className="font-medium">{new Date(campaign.launched_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="font-medium">{campaign.description || 'No description'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(experience.campaigns || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No campaigns configured for this experience</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Feature Variants Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(experience.feature_variants || []).map((variant, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => setActiveTab("variants")}
                    >
                      <span className="font-medium">{variant.name}</span>
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </div>
                  ))}
                  {(experience.feature_variants || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No feature variants configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Experience Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(experience.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="font-medium">#{experience.priority}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{experience.description || 'No description'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Campaign Configuration</h2>
              {experience.status === "paused" && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Campaign
                  </Button>
                  <Button size="sm">Save Changes</Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {(experience.campaigns || []).map((campaign, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span>{campaign.name}</span>
                        <Badge className={`${
                          campaign.status === 'active' ? 'bg-green-500' :
                          campaign.status === 'paused' ? 'bg-yellow-500' :
                          campaign.status === 'draft' ? 'bg-gray-500' :
                          'bg-gray-400'
                        } text-white`}>
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Badge>
                      </div>
                      {experience.status === "paused" && (
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <div className="bg-muted px-3 py-2 rounded border text-sm">
                            {campaign.description || 'No description provided'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Target Percentage</label>
                          <div className="bg-muted px-3 py-2 rounded border text-sm font-mono">
                            {campaign.target_percentage}%
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Launched At</label>
                          <div className="bg-muted px-3 py-2 rounded border text-sm">
                            {new Date(campaign.launched_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Rule Configuration</label>
                          <div className="bg-muted px-3 py-2 rounded border text-sm font-mono max-h-32 overflow-y-auto">
                            {JSON.stringify(campaign.rule_config, null, 2)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">UTM Source</label>
                          <div className="bg-muted px-3 py-2 rounded border text-sm">
                            {campaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Created: {new Date(campaign.created_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(experience.campaigns || []).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Campaigns Configured</h3>
                    <p className="text-sm">This experience is not associated with any campaigns.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Variants Configuration</h2>
              {experience.status === "paused" && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Variant
                  </Button>
                  <Button size="sm">Save Changes</Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {(experience.feature_variants || []).map((variant, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{variant.name}</span>
                      {experience.status === "paused" && (
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(variant.config || {}).map(([param, value]) => (
                        <div key={param} className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">
                            {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          {experience.status === "paused" ? (
                            <Input
                              value={String(value)}
                              onChange={(e) => {
                                // Handle parameter updates when paused
                                console.log(`Updating ${param} to ${e.target.value}`);
                              }}
                              className="font-mono text-sm"
                            />
                          ) : (
                            <div className="bg-muted px-3 py-2 rounded border font-mono text-sm">
                              {JSON.stringify(value, null, 2)}
                            </div>
                          )}
                        </div>
                      ))}
                      {Object.keys(variant.config || {}).length === 0 && (
                        <div className="text-sm text-muted-foreground italic">
                          No configuration parameters
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Created: {new Date(variant.created_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(experience.feature_variants || []).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Variants Configured</h3>
                    <p className="text-sm">Add variants to start testing different configurations.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* <TabsContent value="performance" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            Metrics Chart Placeholder
            <Card>
              <CardHeader>
                <CardTitle>D1 Retention Trend (14 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/20 rounded border-2 border-dashed">
                  <p className="text-muted-foreground">Performance chart will be implemented here</p>
                </div>
              </CardContent>
            </Card>

            Variant Breakdown Table
            <Card>
              <CardHeader>
                <CardTitle>Variant Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Variant</th>
                        <th className="text-left p-3">Users</th>
                        <th className="text-left p-3">D1 Retention</th>
                        <th className="text-left p-3">Uplift</th>
                        <th className="text-left p-3">p-value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3 font-medium">Control</td>
                        <td className="p-3">4,871</td>
                        <td className="p-3">38.2%</td>
                        <td className="p-3">-</td>
                        <td className="p-3">-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">Variant A</td>
                        <td className="p-3">4,871</td>
                        <td className="p-3">42.4%</td>
                        <td className="p-3 text-green-600 font-medium">+4.2%</td>
                        <td className="p-3">0.032</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold">Experience History</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {(experience.history || []).map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          event?.type === 'created' ? 'bg-gray-400' :
                          event?.type === 'launched' ? 'bg-green-500' :
                          event?.type === 'split_changed' ? 'bg-blue-500' :
                          event?.type === 'rolled_out' ? 'bg-purple-500' :
                          event?.type === 'paused' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{event?.event || 'Unknown event'}</p>
                          <p className="text-sm text-muted-foreground">
                            {event?.date ? new Date(event.date).toLocaleString() : 'Unknown date'}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">by {event?.by || 'Unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>
      </div>
    </div>
  );
}