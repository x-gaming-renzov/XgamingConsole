import { useState, useEffect } from "react";
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
import { 
  ChevronLeft, 
  Plus,
  Package,
  Users,
  Target,
  Eye,
  Settings,
  Clock,
  ChevronDown,
  ChevronRight,
  Trash2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ConsoleLayout from "@/components/console-layout";

interface ExperienceDetails {
  id: string;
  name: string;
  status: string;
  description: string;
  createdAt: string;
  
  // New structure based on updated API
  feature_flags: Array<{
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
    created_at: string;
    modified_at: string;
    variants: Array<{
      pid: string;
      name: string;
      config: Record<string, any>;
      created_at: string;
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
  
  // Counts
  feature_flags_count: number;
  personalisations_count: number;
  segments_count: number;
  user_experience_count: number;
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
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="objects">Objects ({experience.feature_flags_count})</TabsTrigger>
            <TabsTrigger value="personalisations">Personalisations ({experience.personalisations_count})</TabsTrigger>
            <TabsTrigger value="segments">Segments ({experience.segments_count})</TabsTrigger>
          </TabsList>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Feature Objects</h3>
            </div>

            <div className="space-y-4">
              {(experience.feature_flags || []).map((flag, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-3">
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
                        Variants ({flag.variants?.length || 0})
                      </Label>
                      
                      {(flag.variants || []).length > 0 ? (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                          {(flag.variants || []).map((variant, vIndex) => (
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
                                <div className="p-2 border-t" onClick={(e) => e.stopPropagation()}>
                                  {Object.keys(variant.config || {}).length > 0 ? (
                                    <div>
                                      {Object.entries(variant.config || {}).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
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
              
              {(experience.feature_flags || []).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Objects Configured</h3>
                    <p className="text-sm text-muted-foreground">Feature objects will appear here when configured.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Personalisations Tab */}
          <TabsContent value="personalisations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Personalisations</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDefaultPersonalisations(!showDefaultPersonalisations)}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showDefaultPersonalisations ? 'Hide' : 'Show'} Default</span>
                </Button>
                <Badge variant="outline">{filteredPersonalisations.length} personalisations</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPersonalisations.map((personalisation, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-3">
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
                        Variants ({personalisation.feature_variants?.length || 0})
                      </Label>
                      
                      {(personalisation.feature_variants || []).length > 0 ? (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                          {(personalisation.feature_variants || []).map((variant, vIndex) => {
                            const parentFeature = variantToFeatureMap.get(variant.feature_variant.pid);
                            const variantKey = `${personalisation.pid}-${variant.feature_variant.pid}`;
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
                                          <span className="text-xs font-medium text-blue-600 truncate">
                                            {parentFeature?.name || 'Unknown'}
                                          </span>
                                          <span className="text-xs text-muted-foreground">→</span>
                                          <span className="text-sm font-medium truncate">{variant.feature_variant.name}</span>
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
                                    {Object.keys(variant.feature_variant.config || {}).length > 0 ? (
                                      <div>
                                        {Object.entries(variant.feature_variant.config || {}).map(([key, value]) => (
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
              )}
            </div>
          </TabsContent>

          {/* Segments Tab */}
          <TabsContent value="segments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Experience Segments</h3>
              <Badge variant="outline">{experience.experience_segments?.length || 0} segments</Badge>
            </div>

            <div className="space-y-4">
              {(experience.experience_segments || []).map((segment, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{segment.segment.name}</span>
                            <Badge variant="outline">Priority #{segment.priority}</Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{segment.segment.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{segment.target_percentage}%</div>
                        <div className="text-xs text-muted-foreground">Target</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Personalisation Distribution</Label>
                      <div className="mt-2 space-y-2">
                        {(segment.personalisations || []).map((personalisation, pIndex) => (
                          <div key={pIndex} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{personalisation.personalisation.name}</span>
                              {personalisation.personalisation.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <Badge variant="secondary">{personalisation.target_percentage}%</Badge>
                          </div>
                        ))}
                        
                        {(!segment.personalisations || segment.personalisations.length === 0) && (
                          <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                            No personalisations assigned
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Rule Configuration</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(segment.segment.rule_config, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      Segment ID: {segment.segment.pid}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(experience.experience_segments || []).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Segments Assigned</h3>
                    <p className="text-sm text-muted-foreground">Experience segments will appear here when configured.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}

// Personalisation Form Component
function PersonalisationForm({ objects, onClose }: { objects: any[], onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    variants: {} as Record<string, { 
      mode: 'existing' | 'new';
      variant_id?: string;
      name?: string; 
      config?: Record<string, any>;
    }>
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { experienceId } = useParams();

  const handleVariantModeChange = (objectId: string, mode: 'existing' | 'new') => {
    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        [objectId]: {
          mode,
          variant_id: mode === 'existing' ? undefined : prev.variants[objectId]?.variant_id,
          name: mode === 'new' ? prev.variants[objectId]?.name || '' : undefined,
          config: mode === 'new' ? prev.variants[objectId]?.config || {} : undefined,
        }
      }
    }));
  };

  const handleExistingVariantSelect = (objectId: string, variantId: string) => {
    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        [objectId]: {
          ...prev.variants[objectId],
          variant_id: variantId,
        }
      }
    }));
  };

  const handleVariantNameChange = (objectId: string, variantName: string) => {
    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        [objectId]: {
          ...prev.variants[objectId],
          name: variantName,
        }
      }
    }));
  };

  const handleVariantConfigChange = (objectId: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        [objectId]: {
          ...prev.variants[objectId],
          config: {
            ...prev.variants[objectId]?.config,
            [key]: value
          }
        }
      }
    }));
  };


  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a personalisation name');
      return;
    }

    if (objects.length === 0) {
      alert('No objects available to create variants');
      return;
    }

    // Validate variants
    const missingVariants = objects.filter(object => {
      const variant = formData.variants[object.pid];
      if (!variant) return true;
      
      if (variant.mode === 'existing') {
        return !variant.variant_id;
      } else {
        return !variant.name?.trim();
      }
    });
    
    if (missingVariants.length > 0) {
      alert(`Please configure variants for: ${missingVariants.map(obj => obj.name).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Transform form data to API format
      const variants = objects.map(object => {
        const variant = formData.variants[object.pid];
        if (variant.mode === 'existing') {
          return {
            feature_id: object.pid,
            variant_id: variant.variant_id,
          };
        } else {
          return {
            feature_id: object.pid,
            name: variant.name?.trim(),
            config: variant.config || object.default_variant || {}
          };
        }
      });

      const response = await apiRequest("POST", `/api/experiences/${experienceId}/personalisations`, {
        name: formData.name,
        description: formData.description,
        variants: variants
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
        onClose();
      } else {
        throw new Error('Failed to create personalisation');
      }
    } catch (error) {
      console.error('Error creating personalisation:', error);
      alert('Failed to create personalisation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">Create New Personalisation</h3>
        <p className="text-sm text-muted-foreground">
          Configure variants for each object in this experience
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Personalisation Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter personalisation name"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter description (optional)"
            className="mt-1"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Object Variants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Object Variants</Label>
          <Badge variant="outline" className="text-xs">
            {objects.length} object{objects.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        {objects.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No objects found in this experience
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {objects.map((object) => (
              <Card key={object.pid} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Package className="w-4 h-4 text-blue-500" />
                      <div>
                        <CardTitle className="text-sm font-medium">{object.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{object.description || 'No description'}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Variant Mode</Label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={formData.variants[object.pid]?.mode === 'existing' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            handleVariantModeChange(object.pid, 'existing');
                          }}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Use Existing
                        </Button>
                        <Button
                          type="button"
                          variant={formData.variants[object.pid]?.mode === 'new' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleVariantModeChange(object.pid, 'new')}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Create New
                        </Button>
                      </div>
                    </div>

                    {/* Existing Variant Selection */}
                    {formData.variants[object.pid]?.mode === 'existing' && (
                      <div>
                        <Label className="text-sm font-medium">
                          Select Existing Variant
                        </Label>
                                                  <Select
                            value={formData.variants[object.pid]?.variant_id || ''}
                            onValueChange={(value) => handleExistingVariantSelect(object.pid, value)}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {object.variants?.map((variant: any) => (
                                <SelectItem key={variant.pid} value={variant.pid}>
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!object.variants || object.variants.length === 0) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              No existing variants found for this object
                            </p>
                          )}
                      </div>
                    )}

                    {/* New Variant Creation */}
                    {formData.variants[object.pid]?.mode === 'new' && (
                      <div className="space-y-4">
                        {/* Variant Name Input */}
                        <div>
                          <Label className="text-sm font-medium">
                            Variant Name
                          </Label>
                          <Input
                            value={formData.variants[object.pid]?.name || ''}
                            onChange={(e) => handleVariantNameChange(object.pid, e.target.value)}
                            placeholder={`Enter variant name for ${object.name}`}
                            className="mt-1"
                            disabled={isSubmitting}
                          />
                        </div>
                        
                        {/* Configuration Fields */}
                        <div>
                          <Label className="text-sm font-medium">Configuration</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {Object.entries(object.keys_config || {}).map(([key, config]: [string, any]) => (
                              <div key={key} className="space-y-2">
                                <Label className="text-xs font-medium flex items-center justify-between">
                                  <span>{key}</span>
                                  <span className="text-muted-foreground font-normal">
                                    {config.type}
                                  </span>
                                </Label>
                                <Input
                                  type={config.type === 'number' ? 'number' : 'text'}
                                  placeholder={`Default: ${JSON.stringify(config.default)}`}
                                  value={formData.variants[object.pid]?.config?.[key] || ''}
                                  onChange={(e) => {
                                    const value = config.type === 'number' ? 
                                      (e.target.value === '' ? '' : Number(e.target.value)) : 
                                      e.target.value;
                                    handleVariantConfigChange(object.pid, key, value);
                                  }}
                                  className="text-sm"
                                  disabled={isSubmitting}
                                />
                                {config.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {config.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.name.trim() || objects.length === 0}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Personalisation'
          )}
        </Button>
      </div>
    </div>
  );
}

// Segment Form Component
function SegmentForm({ personalisations, onClose }: { personalisations: any[], onClose: () => void }) {
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const [formData, setFormData] = useState({
    segment_id: '',
    target_percentage: 100,
    personalisation_distribution: [] as Array<{
      personalisation_id: string | null;
      personalisation_name: string;
      target_percentage: number;
      is_default: boolean;
    }>
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { experienceId } = useParams();

  // Filter out default personalisations - users can only select custom personalisations
  const customPersonalisations = personalisations.filter(p => !p.is_default);

  // Load available segments on component mount
  useEffect(() => {
    const loadAvailableSegments = async () => {
      try {
        // Use the existing segments API instead of experience-specific API
        const response = await apiRequest("GET", `/api/segments`);
        if (response.ok) {
          const segments = await response.json();
          setAvailableSegments(segments);
        }
      } catch (error) {
        console.error('Failed to load available segments:', error);
      } finally {
        setIsLoadingSegments(false);
      }
    };

    loadAvailableSegments();
  }, [experienceId]);

  const addPersonalisation = () => {
    setFormData(prev => ({
      ...prev,
      personalisation_distribution: [
        ...prev.personalisation_distribution,
        { personalisation_id: '', personalisation_name: '', target_percentage: 0, is_default: false }
      ]
    }));
  };

  const addDefaultPersonalisation = () => {
    setFormData(prev => ({
      ...prev,
      personalisation_distribution: [
        ...prev.personalisation_distribution,
        { personalisation_id: null, personalisation_name: 'Default Experience', target_percentage: 0, is_default: true }
      ]
    }));
  };

  const removePersonalisation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personalisation_distribution: prev.personalisation_distribution.filter((_, i) => i !== index)
    }));
  };

  const updatePersonalisation = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      personalisation_distribution: prev.personalisation_distribution.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const totalPercentage = formData.personalisation_distribution.reduce((sum, item) => sum + item.target_percentage, 0);

  // Validation for duplicate personalisation assignments
  const getDuplicatePersonalisations = () => {
    const usedPersonalisations = new Set<string>();
    const duplicates = new Set<string>();
    const defaultPersonalisationIds = new Set<string>();
    let defaultCount = 0;

    formData.personalisation_distribution.forEach((item) => {
      if (item.is_default) {
        defaultCount++;
      } else if (item.personalisation_id && item.personalisation_id !== '') {
        // Check if this personalisation is actually a default one
        const personalisation = personalisations.find(p => p.pid === item.personalisation_id);
        if (personalisation && personalisation.is_default) {
          defaultPersonalisationIds.add(item.personalisation_id);
        }
        
        if (usedPersonalisations.has(item.personalisation_id)) {
          duplicates.add(item.personalisation_id);
        } else {
          usedPersonalisations.add(item.personalisation_id);
        }
      }
    });

    return { 
      duplicates, 
      hasMultipleDefaults: defaultCount > 1, 
      defaultPersonalisationIds 
    };
  };

  const { duplicates, hasMultipleDefaults, defaultPersonalisationIds } = getDuplicatePersonalisations();
  const hasDuplicates = duplicates.size > 0 || hasMultipleDefaults || defaultPersonalisationIds.size > 0;

  const handleSubmit = async () => {
    if (!formData.segment_id) {
      alert('Please select a segment');
      return;
    }

    if (formData.personalisation_distribution.length === 0) {
      alert('Please add at least one personalisation');
      return;
    }

    if (totalPercentage !== 100) {
      alert(`Total percentage must equal 100%, currently ${totalPercentage}%`);
      return;
    }

    if (hasDuplicates) {
      alert('Please fix duplicate personalisation assignments before proceeding');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", `/api/experiences/${experienceId}/segments`, {
        segment_id: formData.segment_id,
        target_percentage: formData.target_percentage,
        personalisation_distribution: formData.personalisation_distribution
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
        onClose();
      } else {
        throw new Error('Failed to create segment assignment');
      }
    } catch (error) {
      console.error('Error creating segment assignment:', error);
      alert('Failed to create segment assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Segment Selection */}
      <div>
        <Label htmlFor="segment_id" className="text-sm font-medium">Select Segment</Label>
        {isLoadingSegments ? (
          <div className="flex items-center space-x-2 mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-muted-foreground">Loading segments...</span>
          </div>
        ) : (
          <Select
            value={formData.segment_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, segment_id: value }))}
            disabled={isSubmitting}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a segment" />
            </SelectTrigger>
            <SelectContent>
              {availableSegments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Target Percentage */}
      <div>
        <Label htmlFor="target_percentage" className="text-sm font-medium">Target Percentage</Label>
        <Input
          id="target_percentage"
          type="number"
          value={formData.target_percentage}
          onChange={(e) => setFormData(prev => ({ ...prev, target_percentage: Number(e.target.value) }))}
          min="0"
          max="100"
          className="mt-1"
          disabled={isSubmitting}
        />
      </div>

      {/* Personalisation Distribution */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Personalisation Distribution</Label>
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addPersonalisation}
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Personalisation
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addDefaultPersonalisation}
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Default
            </Button>
          </div>
        </div>
        
        {/* Validation Messages */}
        {hasDuplicates && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">Assignment Issues:</p>
            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
              {duplicates.size > 0 && (
                <li>Some personalisations are assigned multiple times</li>
              )}
              {hasMultipleDefaults && (
                <li>Only one default personalisation can be assigned per segment</li>
              )}
              {defaultPersonalisationIds.size > 0 && (
                <li>Default personalisations cannot be selected as regular personalisations. Use "Add Default" button instead.</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          {formData.personalisation_distribution.map((item, index) => {
            const isDuplicate = item.is_default 
              ? hasMultipleDefaults 
              : (item.personalisation_id && (duplicates.has(item.personalisation_id) || defaultPersonalisationIds.has(item.personalisation_id)));
            
            return (
              <div key={index} className={`flex items-center space-x-3 p-3 border rounded-lg ${
                isDuplicate ? 'bg-red-50' : ''
              }`}>
                <div className="flex-1">
                  {item.is_default ? (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Default</Badge>
                      <span className="text-sm font-medium">{item.personalisation_name}</span>
                      {hasMultipleDefaults && (
                        <span className="text-xs text-red-600">(Duplicate default)</span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Select
                        value={item.personalisation_id || ''}
                        onValueChange={(value) => {
                          const personalisation = customPersonalisations.find(p => p.pid === value);
                          updatePersonalisation(index, 'personalisation_id', value);
                          updatePersonalisation(index, 'personalisation_name', personalisation?.name || '');
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select personalisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {customPersonalisations.length > 0 ? (
                            customPersonalisations.map((personalisation) => (
                              <SelectItem key={personalisation.pid} value={personalisation.pid}>
                                {personalisation.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              No custom personalisations available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {item.personalisation_id && duplicates.has(item.personalisation_id) && (
                        <span className="text-xs text-red-600">This personalisation is already assigned</span>
                      )}
                      {item.personalisation_id && defaultPersonalisationIds.has(item.personalisation_id) && (
                        <span className="text-xs text-red-600">This is a default personalisation. Use "Add Default" button instead.</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    value={item.target_percentage}
                    onChange={(e) => updatePersonalisation(index, 'target_percentage', Number(e.target.value))}
                    min="0"
                    max="100"
                    placeholder="%"
                    disabled={isSubmitting}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removePersonalisation(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Percentage:</span>
            <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPercentage}%
            </span>
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              Total must equal 100%
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || totalPercentage !== 100 || hasDuplicates}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Assignment'
          )}
        </Button>
      </div>
    </div>
  );
}
