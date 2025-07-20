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

interface ExperienceDetails {
  pid: string;
  name: string;
  description: string;
  status: string;

  // New structure based on updated API
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
    variants: Array<{
      pid: string;
      name: string;
      config: Record<string, any>;
    }>;
  }>;
  
  personalisations: Array<{
    pid: string;
    name: string;
    description: string;
    last_updated_at: string;
    created_at: string;
    feature_variants: Array<{
      pid: string;
      personalisation_id: string;
      feature_variant_id: string;
      created_at: string;
      modified_at: string;
      feature_variant: {
        pid: string;
        name: string;
        config: Record<string, any>;
        created_at: string;
      };
    }>;
    is_default: boolean;
  }>;
  
  experience_segments: Array<{
    pid: string;
    target_percentage: number;
    priority: number;
    segment: {
      pid: string;
      name: string;
      description: string;
      rule_config: Record<string, any>;
    };
    personalisations: Array<{
      pid: string;
      personalisation_id: string;
      personalisation: {
        pid: string;
        name: string;
        description: string;
        is_default: boolean;
        feature_variants: Array<{
          pid: string;
          personalisation_id: string;
          feature_variant_id: string;
          created_at: string;
          modified_at: string;
          feature_variant: {
            pid: string;
            name: string;
            config: Record<string, any>;
            created_at: string;
          };
        }>;
        last_updated_at: string;
        created_at: string;
      };
      target_percentage: number;
    }>;
  }>;
}

export default function ExperienceDetails() {
  const { experienceId } = useParams();
  const [activeTab, setActiveTab] = useState("objects");
  const [showPersonalisationForm, setShowPersonalisationForm] = useState(false);
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState<string | null>(null);
  const [showDefaultPersonalisations, setShowDefaultPersonalisations] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [showMetricsForm, setShowMetricsForm] = useState<boolean>(false);
  const queryClient = useQueryClient();

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



  // Create a mapping from variant ID to parent feature flag
  const variantToFeatureMap = new Map<string, { name: string; pid: string }>();

  (experience?.feature_flags || []).forEach(flag => {
    (flag.variants || []).forEach(variant => {
      variantToFeatureMap.set(variant.pid, { name: flag.name, pid: flag.pid });
    });
  });

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

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Objects</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {(experience.features || []).map(({feature_flag: flag, variants}, index) => (
              <Card key={index} className="overflow-hidden h-fit">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-lg">{flag.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {flag.type || 'Generic'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={flag.is_active ? "default" : "secondary"}>
                        {flag.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3">
                  {/* Variants */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Variants ({variants?.length || 0})
                    </Label>
                    
                    {(variants || []).length > 0 ? (
                      <div className="space-y-2">
                        {(variants || []).map((variant, vIndex) => (
                          <div 
                            key={vIndex} 
                            className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => toggleObjectExpansion(`${flag.pid}-${variant.pid}`)}
                          >
                            <div className="p-3 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{variant.name}</p>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                  {expandedObjects[`${flag.pid}-${variant.pid}`] ? 
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  }
                                </div>
                              </div>
                            </div>
                            
                            {expandedObjects[`${flag.pid}-${variant.pid}`] && (
                              <div className="p-3 border-t" onClick={(e) => e.stopPropagation()}>
                                {Object.keys(variant.config || {}).length > 0 ? (
                                  <div className="space-y-2">
                                    {Object.entries(variant.config || {}).map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between py-2 bg-muted/30 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{key}</code>
                                        </div>
                                        <span className="text-sm font-mono text-muted-foreground" title={String(value)}>
                                          {typeof value === 'string' ? value : String(value)}
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
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border rounded-lg bg-muted/10">
                        <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No variants configured</p>
                        <p className="text-xs text-muted-foreground mt-1">Variants will appear here when created</p>
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
        </div>

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
