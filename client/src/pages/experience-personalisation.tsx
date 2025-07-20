import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PersonalisationForm from "@/components/personalisation-form";
import SegmentExperienceForm from "@/components/segment-experience-form";
import MetricForm from "@/components/metric-form";
import { 
  ChevronLeft, 
  Plus,
  Package,
  Users,
  Target,
  Eye,
  EyeOff,
  Settings,
  Clock,
  ChevronDown,
  ChevronRight,
  Trash2,
  BarChart3
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ConsoleLayout from "@/components/console-layout";

interface ExperiencePersonalisations {
  pid: string;
  name: string;
  description: string;
  status: string;

  personalisations: Array<{
    pid: string;
    name: string;
    description: string;
    is_default: boolean;
    last_updated_at: string;
    variants: Array<{
      pid: string;
      name: string;
      config: Record<string, any>;
      experience_feature: {
        pid: string;
        feature_flag: {
          name: string;
          keys_config: Record<string, any>;
        }
      }
    }>;
  }>;
  
  targeting_rules: Array<{
    pid: string;
    rollout_percentage: number;
    priority: number;
    segments: {
      pid: string;
      name: string;
      description: string;
      rule_config: Record<string, any>;
    }[];
    personalisations: Array<{
      target_percentage: number;
      personalisation: {
        pid: string;
        name: string;
        description: string;
        is_default: boolean;
        last_updated_at: string;
        created_at: string;
      };
    }>;
  }>;
}

export default function ExperiencePersonalisations() {
  const { experienceId } = useParams();
  const [activeTab, setActiveTab] = useState("personalisations");
  const [showPersonalisationForm, setShowPersonalisationForm] = useState(false);
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [showDefaultPersonalisations, setShowDefaultPersonalisations] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [showMetricsForm, setShowMetricsForm] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const { data: experience, isLoading } = useQuery<ExperiencePersonalisations>({
    queryKey: [`/api/experiences/${experienceId}/personalisations`],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-700 border-green-200";
      case "draft": return "bg-gray-50 text-gray-700 border-gray-200";
      case "paused": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed": return "bg-gray-50 text-gray-700 border-gray-200";
      case "rolling_out": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const toggleObjectExpansion = (objectId: string) => {
    setExpandedObjects(prev => ({
      ...prev,
      [objectId]: !prev[objectId]
    }));
  };

  const toggleVariantExpansion = (variantId: string) => {
    setExpandedVariants(prev => ({
      ...prev,
      [variantId]: !prev[variantId]
    }));
  };

  // Single color palette for consistent usage
  const PERSONALISATION_COLORS = [
    'bg-blue-500',
    'bg-purple-500', 
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500'
  ];

  // Filter personalisations based on showDefaultPersonalisations state
  const filteredPersonalisations = (experience?.personalisations || []).filter(personalisation => {
    if (showDefaultPersonalisations) {
      return true; // Show all
    }
    return !personalisation.is_default; // Hide default personalisations
  });

  if (isLoading) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  if (!experience) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Experience not found</h3>
            <p className="text-muted-foreground mb-4">The experience you're looking for doesn't exist.</p>
            <Link href="/experiences">
              <Button>Back to Experiences</Button>
            </Link>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/experiences">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{experience.name}</h1>
                <Badge variant="outline" className={getStatusColor(experience.status)}>
                  {getStatusText(experience.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {experience.description || "No description provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex w-auto space-x-2">
            <TabsTrigger className="px-6" value="personalisations">Personalisations</TabsTrigger>
            <TabsTrigger className="px-6" value="segments">Targeting</TabsTrigger>
          </TabsList>

          {/* Personalisations Tab */}
          <TabsContent value="personalisations" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold">Personalisations</h3>
                {/* Only show toggle if default personalisations exist */}
                {(experience?.personalisations || []).some(p => p.is_default) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDefaultPersonalisations(!showDefaultPersonalisations)}
                    className="flex items-center space-x-2"
                  >
                    {showDefaultPersonalisations ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span>{showDefaultPersonalisations ? 'Hide' : 'Show'} Default</span>
                  </Button>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowPersonalisationForm(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Create Personalisation</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filteredPersonalisations.map((personalisation, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-lg">{personalisation.name}</CardTitle>
                            {personalisation.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{personalisation.description || 'No description'}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-3">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Object Variants
                      </Label>

                      {(personalisation.variants || []).length > 0 ? (
                        <div className="space-y-2">
                          {(personalisation.variants || []).map((variant, vIndex) => {
                            const experienceFeature = variant.experience_feature;
                            const feature = experienceFeature.feature_flag;

                            const variantKey = `${personalisation.pid}-${experienceFeature.pid}`;

                            return (
                              <div 
                                key={vIndex} 
                                className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => toggleVariantExpansion(variantKey)}
                              >
                                <div className="p-3 bg-muted/20">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                                      <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-1">
                                          <span className="text-sm font-medium text-blue-600 truncate">
                                            {feature?.name || 'Unknown'}
                                          </span>
                                          <span className="text-xs text-muted-foreground">→</span>
                                          <span className="text-sm font-medium truncate">{variant.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-2">
                                      {expandedVariants[variantKey] ? 
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      }
                                    </div>
                                  </div>
                                </div>
                                
                                {expandedVariants[variantKey] && (
                                  <div className="p-2 border-t" onClick={(e) => e.stopPropagation()}>
                                    {Object.keys(variant.config || {}).length > 0 ? (
                                      <div>
                                        {Object.entries(variant.config || {}).map(([key, value]) => (
                                          <div key={key} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                              <code className="text-sm bg-muted px-2 py-0.5 rounded">{key}</code>
                                            </div>
                                            <span className="text-sm font-mono text-muted-foreground" title={String(value)}>
                                              {typeof value === 'string' ? value : JSON.stringify(value)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-2">
                                        <p className="text-sm text-muted-foreground">No configuration set</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center border rounded-lg bg-muted/10">
                          <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">No variants configured</p>
                          <p className="text-xs text-muted-foreground mt-1">Variants will appear here when configured</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredPersonalisations.length === 0 && (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                        <Settings className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {showDefaultPersonalisations 
                          ? "No Personalisations Yet" 
                          : "No Custom Personalisations"
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {showDefaultPersonalisations 
                          ? "Personalisations will appear here when configured." 
                          : "Custom personalisations will appear here. Click 'Show Default' to see auto-generated default personalisations."
                        }
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Segments Tab */}
          <TabsContent value="segments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Targeting</h3>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSegmentForm(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Create Targeting Rule</span>
              </Button>
            </div>

            <div className="space-y-4">
              {(experience.targeting_rules || []).map((targetingRule, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-3">
                            {/* <CardTitle className="text-lg">{segment.segment.name}</CardTitle> */}
                            {/* <Label className="text-base font-medium block">
                              Rollout
                            </Label> */}
                            <div className="flex items-center space-x-1">
                              <div className="text-base font-bold text-green-600">{targetingRule.rollout_percentage}%</div>
                              <div className="text-xs text-muted-foreground">coverage</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">Priority #{targetingRule.priority}</Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 pb-4">
                    {/* Personalisation Distribution */}
                    <div className="mb-6">
                      {(targetingRule.personalisations || []).length > 0 ? (
                        <div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div className="flex h-full">
                              {(targetingRule.personalisations || []).map((personalisation, pIndex) => {
                                const bgColor = personalisation.personalisation.is_default ? 'bg-gray-500' : PERSONALISATION_COLORS[pIndex % PERSONALISATION_COLORS.length];

                                if (!personalisation.target_percentage) return;

                                return (
                                  <div
                                    key={pIndex}
                                    className={`${bgColor} h-full flex flex-col items-center justify-center text-xs text-white font-medium px-1`}
                                    style={{ width: `${personalisation.target_percentage}%` }}
                                    title={`${personalisation.personalisation.name}: ${personalisation.target_percentage}%`}
                                  >
                                    <div>{personalisation.target_percentage}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Compact horizontal list */}
                          <div className="flex flex-wrap mt-4 gap-6 text-sm">
                            {(targetingRule.personalisations || []).map((personalisation, pIndex) => {
                              const bgColor = personalisation.personalisation.is_default ? 'bg-gray-500' : PERSONALISATION_COLORS[pIndex % PERSONALISATION_COLORS.length];
                              
                              return (
                                <div key={pIndex} className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                                  <span className="font-medium">{personalisation.personalisation.is_default ? "Default" : personalisation.personalisation.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center border rounded-lg bg-muted/10">
                          <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">No personalisations assigned</p>
                          <p className="text-xs text-muted-foreground mt-1">Personalisation distribution will appear here when configured</p>
                        </div>
                      )}
                    </div>

                    {/* Side by side layout for rules and metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Targeting Rules */}
                      <div className="border rounded-lg overflow-hidden">
                        <div 
                          className={`flex items-center justify-between p-3 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors ${
                            expandedObjects[`targeting-rule-${targetingRule.pid}`] ? '' : 'rounded-lg'
                          }`}
                          onClick={() => toggleObjectExpansion(`targeting-rule-${targetingRule.pid}`)}
                        >
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <Label className="text-sm font-medium cursor-pointer">Targeting Rules</Label>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedObjects[`targeting-rule-${targetingRule.pid}`] ? 
                              <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                        
                        {/* {expandedObjects[`targeting-rule-${targetingRule.pid}`] && (
                          <div className="p-3 border-t bg-muted/10">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-semibold">Segment</p>
                              <p className="text-sm font-medium">{segment.segment.name}</p>
                            </div>
                            {targetingRule.rule_config?.conditions && segment.segment.rule_config.conditions.length > 0 ? (
                              <div className="space-y-2">
                                {segment.segment.rule_config.conditions.map((condition: { field: string; operator: string; value: string | string[] | number | boolean }, condIndex: number) => (
                                  <div key={condIndex} className="flex items-center space-x-3 py-2 px-3">
                                    {condIndex > 0 && (
                                      <Badge variant="outline" className="text-xs font-medium">
                                        AND
                                      </Badge>
                                    )}
                                    <div className="flex items-center space-x-2 text-sm">
                                      <span className="font-medium text-foreground">{condition.field}</span>
                                      <span className="text-muted-foreground">{condition.operator}</span>
                                      <span className="font-medium text-foreground">
                                        {Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">All Users</p>
                              </div>
                            )}
                          </div>
                        )} */}
                      </div>

                      {/* Metrics */}
                      <div className="border rounded-lg overflow-hidden">
                        <div 
                          className={`flex items-center justify-between p-3 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors ${
                            expandedObjects[`metrics-${targetingRule.pid}`] ? '' : 'rounded-lg'
                          }`}
                          onClick={() => toggleObjectExpansion(`metrics-${targetingRule.pid}`)}
                        >
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-orange-500" />
                            <Label className="text-sm font-medium cursor-pointer">Metrics</Label>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedObjects[`metrics-${targetingRule.pid}`] ? 
                              <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                        
                        {expandedObjects[`metrics-${targetingRule.pid}`] && (
                          <div className="p-3 border-t bg-muted/10">
                            <div className="space-y-3">
                              {/* Metric cards */}
                              <div className="space-y-3">
                                {/* Example metric cards that would show when metrics exist */}
                                {true && (
                                  <>
                                    <div className="border rounded-lg p-3 bg-muted">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5"></div>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-white-900 mb-1">Conversion Rate</div>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs text-white-500">Target:</span>
                                              <span className="text-xs font-medium text-white-700">12%</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <div className="text-lg font-bold text-green-600">15.2%</div>
                                          <div className="text-xs text-green-600">+3.2%</div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="border rounded-lg p-3 bg-muted shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1.5"></div>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-white-900 mb-1">Session Duration</div>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs text-white-500">Target:</span>
                                              <span className="text-xs font-medium text-white-700">300s</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <div className="text-lg font-bold text-orange-600">245s</div>
                                          <div className="text-xs text-orange-600">-55s</div>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                                
                                {/* Placeholder when no metrics exist */}
                                {false && (
                                  <div className="text-center py-4">
                                    <p className="text-xs text-muted-foreground">No metrics configured yet</p>
                                    <p className="text-xs text-muted-foreground mt-1">Track conversion rates, engagement, and custom events</p>
                                  </div>
                                )}
                              </div>

                              {/* Add Metric Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMetricsForm(true);
                                }}
                                className="w-full border-dashed hover:border-solid text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Metric
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(experience.targeting_rules || []).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Targeting Rules</h3>
                    <p className="text-sm text-muted-foreground">Create targeting rules to personalise experiences for specific user segments.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Personalisation Side Panel */}
        <PersonalisationForm 
          open={showPersonalisationForm}
          onOpenChange={setShowPersonalisationForm}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
          }}
        />

        {/* Create Segment Experience Side Panel */}
        <SegmentExperienceForm 
          open={showSegmentForm}
          onOpenChange={setShowSegmentForm}
          personalisations={experience?.personalisations || []} 
        />

        {/* Metrics Form */}
        <MetricForm 
          open={showMetricsForm}
          onClose={() => setShowMetricsForm(false)}
        />
      </div>
    </ConsoleLayout>
  );
}
