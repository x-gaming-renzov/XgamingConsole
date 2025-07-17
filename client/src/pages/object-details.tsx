import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  Copy, 
  Plus, 
  Layers, 
  FileText, 
  Sliders,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Settings
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import { apiRequest } from "@/lib/queryClient";

interface ObjectDetails {
  id: string;
  name: string;
  type: string;
  description: string;
  keys_config: Record<string, {
    type: string;
    description: string;
    default: any;
  }>;
  variants: Array<{
    pid: string;
    name: string;
    config: Record<string, any>;
  }>;
  createdAt: string;
  isActive: boolean;
  defaultVariant: Record<string, any>;
  experience?: {
    pid: string;
    name: string;
    description: string;
    status: string;
    created_at: string;
    modified_at: string;
  };
}

interface VariantFormData {
  name: string;
  config: Record<string, any>;
}

export default function ObjectDetails() {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/objects/:id");
  const objectId = params?.id;
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [showVariantForm, setShowVariantForm] = useState(false);

  const { data: objectDetails, isLoading } = useQuery<ObjectDetails>({
    queryKey: [`/api/objects/${objectId}`],
    enabled: !!objectId
  });

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "level":
        return <Layers className="w-4 h-4" />;
      case "popup":
        return <FileText className="w-4 h-4" />;
      case "param":
        return <Sliders className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "level":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "popup":
        return "bg-green-50 text-green-700 border-green-200";
      case "param":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "paused":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const toggleVariantExpansion = (variantId: string) => {
    setExpandedVariants(prev => ({
      ...prev,
      [variantId]: !prev[variantId]
    }));
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

  // Sort variants to show default first
  const allVariants = objectDetails?.variants.sort((a, b) => {
    if (a.name === "default") return -1;
    if (b.name === "default") return 1;
    return 0;
  }) || [];

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

  if (!objectDetails) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Object not found</h3>
            <p className="text-muted-foreground mb-4">The object you're looking for doesn't exist.</p>
            <Link href="/objects">
              <Button>Back to Objects</Button>
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
            <Link href="/objects">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{objectDetails.name}</h1>
                <Badge variant="outline" className={getTypeColor(objectDetails.type)}>
                  <span className="flex items-center space-x-1">
                    {getTypeIcon(objectDetails.type)}
                    <span>{objectDetails.type}</span>
                  </span>
                </Badge>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${objectDetails.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`text-sm font-medium ${objectDetails.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                    {objectDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground">
                {objectDetails.description || "No description provided"}
              </p>
            </div>
          </div>
          <Dialog open={showVariantForm} onOpenChange={(open) => {
            setShowVariantForm(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="pb-4">
                <DialogTitle>Create New Variant</DialogTitle>
              </DialogHeader>
              
              <VariantForm 
                objectId={objectDetails.id} 
                object={objectDetails} 
                onClose={() => setShowVariantForm(false)} 
                onSuccess={() => {
                  setShowVariantForm(false);
                  queryClient.invalidateQueries({ queryKey: [`/api/objects/${objectDetails.id}`] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Object Details */}
            <Card>
              <CardHeader>
                <CardTitle>Object Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connected Experience */}
                {objectDetails.experience && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Connected Experience</Label>
                    <Link href={`/experiences/${objectDetails.experience.pid}`}>
                      <div className="mt-1 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="flex items-center space-x-2 hover:text-primary">
                                <span className="font-medium transition-colors">{objectDetails.experience.name}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground transition-colors" />
                              </div>
                              <Badge variant="outline" className={getStatusColor(objectDetails.experience.status)}>
                                {objectDetails.experience.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                Created: {formatDate(objectDetails.experience.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {objectDetails.experience.description && (
                          <p className="text-sm text-muted-foreground mt-2">{objectDetails.experience.description}</p>
                        )}
                      </div>
                    </Link>
                  </div>
                )}

                {/* Object Schema */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Object Schema</Label>
                  <div className="mt-2">
                    {Object.keys(objectDetails.keys_config).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Default Value</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(objectDetails.keys_config).map(([key, config], index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <code className="text-sm bg-muted px-2 py-1 rounded">{key}</code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {config.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{config.default?.toString() || "N/A"}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{config.description || "No description"}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No schema defined for this object
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Variants ({objectDetails.variants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {objectDetails.variants.length > 0 ? (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                    {allVariants.map((variant) => {
                      const isExpanded = expandedVariants[variant.pid];
                      const hasConfig = variant.config && Object.keys(variant.config).length > 0;
                      
                      return (
                        <div key={variant.pid} className="border rounded-lg overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleVariantExpansion(variant.pid)}
                          >
                            <div className="flex items-center space-x-3 w-full justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-foreground">{variant.name}</span>
                                {variant.name === "default" && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && hasConfig && (
                            <div className="border-t bg-muted/20 p-4">
                              {/* Content */}
                              <div className="space-y-3">
                                {Object.entries(variant.config).map(([key, value]) => {
                                  return (
                                    <div key={key} className="flex items-center justify-between">
                                      <code className="text-sm bg-muted px-2 py-1 rounded">{key}</code>
                                      <span className="font-mono text-sm">{value?.toString()}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No variants created</h3>
                    <p className="text-muted-foreground mb-4">
                      Create variants to personalize this object for different user experiences.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}

// Variant Form Component
export function VariantForm({ objectId, object, onClose, onSuccess }: { objectId: string, object: any, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    config: {} as Record<string, any>
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Check if variant name already exists for this object
    const existingVariants = object?.variants || [];
    const nameExists = existingVariants.some((variant: any) => 
      variant.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    
    if (nameExists) {
      alert('A variant with this name already exists. Please choose a different name.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", `/api/objects/${objectId}/variants`, {
        name: formData.name,
        config: formData.config
      });

      if (response.ok) {
        onSuccess();
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
            <div key={key} className="space-y-1">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <Label htmlFor={`config-${key}`} className="text-sm font-medium">
                    {key}
                  </Label>
                  {config.description && (
                    <p className="text-xs text-muted-foreground leading-tight">{config.description}</p>
                  )}
                </div>
                
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {config.type}
                  </Badge>
                </div>
                
                <div>
                  {config.type === "boolean" ? (
                    <div className="flex items-center justify-start space-x-2">
                      <input
                        id={`config-${key}`}
                        type="checkbox"
                        checked={formData.config[key] === "true" || formData.config[key] === true}
                        onChange={(e) => handleConfigChange(key, e.target.checked)}
                        className="h-4 w-4 rounded border-border focus:ring-2 focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.config[key] === "true" || formData.config[key] === true ? "True" : "False"}
                      </span>
                    </div>
                  ) : (
                    <Input
                      id={`config-${key}`}
                      type={config.type === "number" ? "number" : "text"}
                      value={formData.config[key] || ""}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                      placeholder={config.default?.toString() || "Enter value"}
                      className="focus:ring-1 focus:ring-primary focus:ring-offset-0 border-border"
                      required
                    />
                  )}
                </div>
              </div>
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

