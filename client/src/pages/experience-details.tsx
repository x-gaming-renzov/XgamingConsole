import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  id: number;
  name: string;
  status: string;
  description: string;
  campaign: string;
  objects: string[];
  uplift: number;
  participants: number;
  d1Retention: number;
  activation: number;
  startDate: string;
  endDate?: string;
  autoRollout: {
    enabled: boolean;
    upliftThreshold: number;
    minUsers: number;
  };
  campaigns: Array<{
    name: string;
    segment: string;
    experiencePercent: number;
    controlPercent: number;
    users7d: number;
  }>;
  variants: Array<{
    objectName: string;
    variants: Array<{
      name: string;
      parameters: Record<string, any>;
    }>;
  }>;
  metrics: Array<{
    date: string;
    control: number;
    variantA: number;
  }>;
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
  const [variantChanges, setVariantChanges] = useState<Record<string, Record<string, number>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const updateRemoteConfigMutation = useMutation({
    mutationFn: async (parameters: { minerals_needed: Record<string, number>; moves_available: Record<string, number> }) => {
      const response = await apiRequest("PUT", `/api/experiences/${experienceId}/remote-config`, parameters);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
      setVariantChanges({});
      setHasUnsavedChanges(false);
      toast({
        title: "Parameters updated",
        description: "Firebase Remote Config has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update Remote Config parameters.",
        variant: "destructive",
      });
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

  const handleVariantParameterChange = (variantName: string, parameterName: string, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    setVariantChanges(prev => ({
      ...prev,
      [variantName]: {
        ...prev[variantName],
        [parameterName]: numericValue
      }
    }));
    setHasUnsavedChanges(true);
  };

  const getCurrentParameterValue = (variantName: string, parameterName: string, originalValue: any) => {
    return variantChanges[variantName]?.[parameterName] ?? originalValue;
  };

  const handleSaveVariantChanges = () => {
    if (!experience || Object.keys(variantChanges).length === 0) return;
    
    // Only experiment ID 24 supports Remote Config updates
    if (parseInt(experienceId!) !== 24) {
      toast({
        title: "Not supported",
        description: "Remote Config updates are only supported for Game Mechanics Platform Test.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert variant changes to the expected format
    const minerals_needed: Record<string, number> = {};
    const moves_available: Record<string, number> = {};
    
    // First, populate with current values from experience
    experience.variants.forEach(objectVariant => {
      objectVariant.variants.forEach(variant => {
        if (variant.name !== 'Control' && variant.name !== 'default') {
          const platform = variant.name.toLowerCase();
          minerals_needed[platform] = variant.parameters.minerals_needed || 0;
          moves_available[platform] = variant.parameters.moves_available || 0;
        }
      });
    });
    
    // Then apply changes
    Object.entries(variantChanges).forEach(([variantName, changes]) => {
      if (variantName !== 'Control' && variantName !== 'default') {
        const platform = variantName.toLowerCase();
        if (changes.minerals_needed !== undefined) {
          minerals_needed[platform] = changes.minerals_needed;
        }
        if (changes.moves_available !== undefined) {
          moves_available[platform] = changes.moves_available;
        }
      }
    });
    
    updateRemoteConfigMutation.mutate({ minerals_needed, moves_available });
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Uplift</p>
                      <p className="text-2xl font-bold text-green-500">+{experience.uplift || 0}%</p>
                      <p className="text-xs text-muted-foreground">rolling 7d</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="text-2xl font-bold">{experience.participants?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">D1 Retention</p>
                      <p className="text-2xl font-bold">{experience.d1Retention || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Activation</p>
                      <p className="text-2xl font-bold">{experience.activation || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign & Target Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Campaign & Target Distribution</CardTitle>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Split
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(experience.campaigns || []).map((campaign, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-5 gap-4 flex-1">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Segment</p>
                          <p className="font-medium">{campaign.segment}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Experience %</p>
                          <p className="font-medium">{campaign.experiencePercent}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Control %</p>
                          <p className="font-medium">{campaign.controlPercent}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Users 7d</p>
                          <p className="font-medium">{campaign.users7d.toLocaleString()}</p>
                        </div>
                      </div>
                      {experience.autoRollout?.enabled && (
                        <Badge variant="secondary" className="ml-4">Auto-rollout</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Object List Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Objects Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(experience.objects || []).map((object, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => setActiveTab("variants")}
                    >
                      <span className="font-medium">{object}</span>
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schedule & Auto-roll */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Auto-rollout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Starts</p>
                    <p className="font-medium">{new Date(experience.startDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ends</p>
                    <p className="font-medium">{experience.endDate ? new Date(experience.endDate).toLocaleString() : "None"}</p>
                  </div>
                </div>
                {experience.autoRollout?.enabled && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm">
                      <strong>Auto-rollout rule:</strong> Convert to 100% if D1 uplift ≥ {experience.autoRollout?.upliftThreshold || 0}% after {experience.autoRollout?.minUsers?.toLocaleString() || '0'} users.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Variants Configuration</h2>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
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
                  <Button 
                    size="sm" 
                    onClick={handleSaveVariantChanges}
                    disabled={!hasUnsavedChanges || updateRemoteConfigMutation.isPending}
                  >
                    {updateRemoteConfigMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {(experience.variants || []).map((objectVariant, objectIndex) => (
                <AccordionItem key={objectIndex} value={`object-${objectIndex}`}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <span>{objectVariant?.objectName || 'Unnamed Object'} – {(objectVariant?.variants || []).length} variant{(objectVariant?.variants || []).length > 1 ? 's' : ''}</span>
                      {experience.status === "paused" && (
                        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
                      {(objectVariant?.variants || []).map((variant, variantIndex) => (
                        <Card key={variantIndex} className="border-2">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{variant?.name || 'Unnamed Variant'}</span>
                              {experience.status === "paused" && (
                                <Button variant="ghost" size="sm">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(variant?.parameters || {}).map(([param, value]) => {
                                const isControl = variant?.name === 'Control' || variant?.name === 'default';
                                const currentValue = getCurrentParameterValue(variant?.name || '', param, value);
                                
                                return (
                                  <div key={param} className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">
                                      {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      {isControl && <span className="text-xs ml-1">(Control - not editable)</span>}
                                    </label>
                                    {experience.status === "paused" && !isControl && parseInt(experienceId!) === 24 ? (
                                      <Input
                                        type="number"
                                        value={String(currentValue)}
                                        onChange={(e) => {
                                          handleVariantParameterChange(variant?.name || '', param, e.target.value);
                                        }}
                                        className="font-mono text-sm"
                                        min="0"
                                        step="1"
                                      />
                                    ) : (
                                      <div className={`px-3 py-2 rounded border font-mono text-sm ${
                                        isControl ? 'bg-muted border-muted' : 'bg-muted'
                                      }`}>
                                        {String(currentValue)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {Object.keys(variant?.parameters || {}).length === 0 && (
                                <div className="text-sm text-muted-foreground italic">
                                  No parameters configured
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {(experience.variants || []).length === 0 && (
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

          <TabsContent value="performance" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Metrics Chart Placeholder */}
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

            {/* Variant Breakdown Table */}
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
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}