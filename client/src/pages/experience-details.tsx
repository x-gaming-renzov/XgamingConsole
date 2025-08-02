import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface ExperienceDetails {
  pid: string;
  name: string;
  description: string;
  status: string;

  // Features structure based on API
  features: Array<{
    pid: string;
    feature_flag: {
      pid: string;
      name: string;
      description: string;
      keys_config: Record<string, {
        type: string;
        description: string;
        default: any;
      }>;
      default_variant: Record<string, any>;
      type: string;
      is_active: boolean;
    };
  }>;
  
  // Variants structure based on API
  variants: Array<{
    pid: string;
    name: string;
    description: string;
    is_default: boolean;
    last_updated_at: string;
    feature_variants: Array<{
      experience_feature_id: string;
            name: string;
            config: Record<string, any>;
    }>;
  }>;
}

export default function ExperienceDetails() {
  const { experienceId } = useParams();
  const [location] = useLocation();
  
  // Parse URL parameters to get tab selection
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || "objects");
  const [showVariantForm, setShowVariantForm] = useState<string | null>(null);
  const [showDefaultVariants, setShowDefaultVariants] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  // Update activeTab when URL changes
  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === "objects" || tabFromUrl === "variants")) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { data: experience, isLoading } = useQuery<ExperienceDetails>({
    queryKey: [`/api/experiences/${experienceId}`],
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

  // Create a mapping from experience_feature_id to feature flag for variants display
  const experienceFeatureMap = new Map<string, { name: string; pid: string }>();

  (experience?.features || []).forEach(feature => {
    experienceFeatureMap.set(feature.pid, { 
      name: feature.feature_flag.name, 
      pid: feature.feature_flag.pid 
    });
  });

  // Filter variants based on showDefaultVariants state
  const filteredVariants = (experience?.variants || []).filter(variant => {
    if (showDefaultVariants) {
      return true; // Show all
    }
    return !variant.is_default; // Hide default variants
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
            <TabsTrigger className="px-6" value="objects">Objects</TabsTrigger>
            <TabsTrigger className="px-6" value="variants">Variants</TabsTrigger>
          </TabsList>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Objects</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {(experience.features || []).map((feature, index) => (
              <Card key={index} className="overflow-hidden h-fit">
                <CardHeader className="pb-6">
                    <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-lg">{feature.feature_flag.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                              {feature.feature_flag.type || 'Generic'}
                          </Badge>
                        </div>
                          <p className="text-sm text-muted-foreground">{feature.feature_flag.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Badge variant={feature.feature_flag.is_active ? "default" : "secondary"}>
                          {feature.feature_flag.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3">
                    {/* Default Configuration */}
                  <div>
                      {/* <Label className="text-sm font-medium mb-3 block">
                        Default Configuration
                      </Label> */}
                    
                      {Object.keys(feature.feature_flag.default_variant || {}).length > 0 ? (
                        <div 
                            className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => toggleObjectExpansion(`default-${feature.pid}`)}
                          >
                            <div className="p-3 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <Settings className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium">
                                  Default Configuration
                                  </span>
                                </div>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                {expandedObjects[`default-${feature.pid}`] ? 
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  }
                                </div>
                              </div>
                            </div>
                            
                          {expandedObjects[`default-${feature.pid}`] && (
                              <div className="p-3 border-t" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-2">
                                {Object.entries(feature.feature_flag.default_variant || {}).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between py-2 bg-muted/30 rounded-lg px-3">
                                        <div className="flex items-center space-x-2">
                                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{key}</code>
                                        </div>
                                        <span className="text-sm font-mono text-muted-foreground" title={String(value)}>
                                      {typeof value === 'string' ? value : JSON.stringify(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                              </div>
                            )}
                      </div>
                    ) : (
                      <div className="p-6 text-center border rounded-lg bg-muted/10">
                        <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                          <p className="text-sm font-medium text-muted-foreground">No default configuration</p>
                          <p className="text-xs text-muted-foreground mt-1">Default values will appear here when configured</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(experience.features || []).length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Objects Configured</h3>
                    <p className="text-sm text-muted-foreground">Objects will appear here when configured.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            </div>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold">Variants</h3>
                {/* Only show toggle if default variants exist */}
                {(experience?.variants || []).some(v => v.is_default) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDefaultVariants(!showDefaultVariants)}
                    className="flex items-center space-x-2"
                  >
                    {showDefaultVariants ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span>{showDefaultVariants ? 'Hide' : 'Show'} Default</span>
                  </Button>
                )}
              </div>
              {/* <Button
                variant="default"
                size="sm"
                onClick={() => setShowVariantForm("new")}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Create Variant</span>
              </Button> */}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filteredVariants.map((variant, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-lg">{variant.name}</CardTitle>
                            {variant.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{variant.description || 'No description'}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-3">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Feature Variants
                      </Label>

                      {(variant.feature_variants || []).length > 0 ? (
                        <div className="space-y-2">
                          {(variant.feature_variants || []).map((featureVariant, fvIndex) => {
                            const featureInfo = experienceFeatureMap.get(featureVariant.experience_feature_id);
                            const variantKey = `${variant.pid}-${featureVariant.experience_feature_id}`;

                            return (
                              <div 
                                key={fvIndex} 
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
                                            {featureInfo?.name || 'Unknown Object'}
                                          </span>
                                          <span className="text-xs text-muted-foreground">→</span>
                                          <span className="text-sm font-medium truncate">{featureVariant.name}</span>
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
                                  <div className="py-3 border-t" onClick={(e) => e.stopPropagation()}>
                                    {Object.keys(featureVariant.config || {}).length > 0 ? (
                                      <div className="space-y-2">
                                        {Object.entries(featureVariant.config || {}).map(([key, value]) => (
                                          <div key={key} className="flex items-center justify-between py-2 bg-muted/30 rounded-lg px-3">
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
                          <p className="text-sm font-medium text-muted-foreground">No feature variants configured</p>
                          <p className="text-xs text-muted-foreground mt-1">Feature variants will appear here when created</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredVariants.length === 0 && (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                        <Settings className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Variants Configured</h3>
                      <p className="text-sm text-muted-foreground">
                        {showDefaultVariants ? 
                          "No variants available." : 
                          "No custom variants configured. Default variants may be hidden."
                        }
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}
