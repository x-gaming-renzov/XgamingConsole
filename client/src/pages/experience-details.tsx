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
  Edit2, 
  Play, 
  Pause, 
  Copy, 
  Archive,
  Settings,
  Plus,
  Package,
  Users,
  Target,
  Eye,
  Trash2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    }
  });

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
      case "active": return null;
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
        { label: "Archive", icon: Archive }
      ];
      default: return [];
    }
  };

  // Filter personalisations based on showDefaultPersonalisations state
  const filteredPersonalisations = (experience?.personalisations || []).filter(personalisation => {
    if (showDefaultPersonalisations) {
      return true; // Show all
    }
    return !personalisation.is_default; // Hide default personalisations
  });

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
                <h1 className="text-xl font-bold cursor-pointer hover:text-primary">
                  {experience.name}
                </h1>
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

      {/* Experience Overview */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Experience Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Objects</p>
                    <p className="text-2xl font-bold">{experience.feature_flags_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Personalisations</p>
                    <p className="text-2xl font-bold">{experience.personalisations_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Segments</p>
                    <p className="text-2xl font-bold">{experience.segments_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Users</p>
                    <p className="text-2xl font-bold">{experience.user_experience_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Description:</strong> {experience.description || 'No description'}</p>
            <p><strong>Created:</strong> {new Date(experience.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {getStatusText(experience.status)}</p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="objects">Objects</TabsTrigger>
            <TabsTrigger value="personalisations">Personalisations</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
          </TabsList>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Feature Flags (Objects)</h3>
            </div>

            <div className="grid gap-4">
              {(experience.feature_flags || []).map((flag, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Package className="w-5 h-5 text-blue-500" />
                        <span>{flag.name}</span>
                        <Badge variant={flag.is_active ? "default" : "secondary"}>
                          {flag.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm text-muted-foreground">{flag.description || 'No description'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <p className="text-sm text-muted-foreground">{flag.type || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Configuration</Label>
                        <div className="mt-2 space-y-2">
                          {Object.entries(flag.keys_config || {}).map(([key, config]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{key}</p>
                                <p className="text-sm text-muted-foreground">{config.description || 'No description'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono">{config.type}</p>
                                <p className="text-xs text-muted-foreground">Default: {JSON.stringify(config.default)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Variants Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Variants</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowVariantForm(flag.pid)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Variant
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(flag.variants || []).map((variant, vIndex) => (
                            <div key={vIndex} className="p-3 bg-muted rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-medium">{variant.name}</p>
                                <Badge variant="outline">Variant</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(variant.config || {}).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                Created: {new Date(variant.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                          
                          {(!flag.variants || flag.variants.length === 0) && (
                            <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                              No variants created yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(experience.feature_flags || []).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Objects Configured</h3>
                    <p className="text-sm text-muted-foreground">Objects (feature flags) will appear here when configured.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Personalisations Tab */}
          <TabsContent value="personalisations" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-semibold">Personalisations</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDefaultPersonalisations(!showDefaultPersonalisations)}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showDefaultPersonalisations ? 'Hide' : 'Show'} Default</span>
                </Button>
              </div>
              <Dialog open={showPersonalisationForm} onOpenChange={setShowPersonalisationForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Personalisation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <PersonalisationForm 
                    objects={experience.feature_flags} 
                    onClose={() => setShowPersonalisationForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredPersonalisations.map((personalisation, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings className="w-5 h-5 text-purple-500" />
                        <span>{personalisation.name}</span>
                        {personalisation.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm text-muted-foreground">{personalisation.description || 'No description'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Variants</Label>
                        <div className="mt-2 space-y-2">
                          {(personalisation.feature_variants || []).map((variant, vIndex) => (
                            <div key={vIndex} className="p-3 bg-muted rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-medium">{variant.feature_variant.name}</p>
                                <Badge variant="outline">Variant</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(variant.feature_variant.config || {}).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(personalisation.created_at).toLocaleDateString()} • 
                        Updated: {new Date(personalisation.last_updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredPersonalisations.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      {showDefaultPersonalisations 
                        ? "No Personalisations Yet" 
                        : "No Custom Personalisations"
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {showDefaultPersonalisations 
                        ? "Create personalisations to customize user experiences." 
                        : "Create personalisations to customize user experiences. Click 'Show Default' to see auto-generated default personalisations."
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
              <Dialog open={showSegmentForm} onOpenChange={setShowSegmentForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Segment Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Segment Assignment</DialogTitle>
                  </DialogHeader>
                  <SegmentForm 
                    personalisations={experience.personalisations} 
                    onClose={() => setShowSegmentForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {(experience.experience_segments || []).map((segment, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Target className="w-5 h-5 text-green-500" />
                        <span>{segment.segment.name}</span>
                        <Badge variant="outline">Priority #{segment.priority}</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-muted-foreground">{segment.segment.description || 'No description'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Target Percentage</Label>
                          <p className="text-sm text-muted-foreground">{segment.target_percentage}%</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Personalisation Distribution</Label>
                        <div className="mt-2 space-y-2">
                          {(segment.personalisations || []).map((personalisation, pIndex) => (
                            <div key={pIndex} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <span className="font-medium">{personalisation.personalisation.name}</span>
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
                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(segment.segment.rule_config, null, 2)}
                        </pre>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Segment ID: {segment.segment.pid}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(experience.experience_segments || []).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Segments Assigned</h3>
                    <p className="text-sm text-muted-foreground">Create segment assignments to target specific user groups.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Variant Form Modal */}
      {showVariantForm && (
        <Dialog open={!!showVariantForm} onOpenChange={() => setShowVariantForm(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Variant</DialogTitle>
            </DialogHeader>
            <VariantForm 
              objectId={showVariantForm}
              object={experience.feature_flags.find(f => f.pid === showVariantForm)}
              onClose={() => setShowVariantForm(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
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

// Variant Form Component
function VariantForm({ objectId, object, onClose }: { objectId: string, object: any, onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    config: {} as Record<string, any>
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { experienceId } = useParams();

  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a variant name');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", `/api/objects/${objectId}/variants`, {
        name: formData.name,
        config: formData.config
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
        onClose();
      } else {
        throw new Error('Failed to create variant');
      }
    } catch (error) {
      console.error('Error creating variant:', error);
      alert('Failed to create variant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium">
          Variant Name
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter variant name"
          className="mt-1"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Configuration</Label>
        <div className="grid grid-cols-1 gap-4 mt-2">
          {Object.entries(object?.keys_config || {}).map(([key, config]: [string, any]) => (
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
                value={formData.config[key] || ''}
                onChange={(e) => {
                  const value = config.type === 'number' ? 
                    (e.target.value === '' ? '' : Number(e.target.value)) : 
                    e.target.value;
                  handleConfigChange(key, value);
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
          disabled={isSubmitting || !formData.name.trim()}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Variant'
          )}
        </Button>
      </div>
    </div>
  );
}