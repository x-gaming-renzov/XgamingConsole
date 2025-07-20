import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package } from "lucide-react";
import ExperienceSelector from "./experience-selector";

interface PersonalisationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function PersonalisationForm({ open, onOpenChange, onSuccess }: PersonalisationFormProps) {
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Query for experience objects when experience is selected
  const { data: objects = [], isLoading: isLoadingObjects } = useQuery({
    queryKey: [`/api/experiences/${selectedExperienceId}/objects`],
    queryFn: async () => {
      console.log("query")
      const response = await apiRequest('GET', `/api/experiences/${selectedExperienceId}/objects`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    enabled: !!selectedExperienceId,
  });

  // Function to generate initial form data
  const getInitialFormData = () => {
    const initialVariants: Record<string, { 
      variant_id?: string;
      name?: string; 
      config?: Record<string, any>;
    }> = {};
    
    // Initialize all objects with "new" mode as default
    objects.forEach((object: any) => {
      initialVariants[object.pid] = {
        name: '',
        config: {}
      };
    });

    return {
      name: '',
      description: '',
      variants: initialVariants
    };
  };

  const [formData, setFormData] = useState(() => getInitialFormData());

  // Reset form data when the form opens or closes or objects change
  useEffect(() => {
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setSelectedExperienceId('');
  }, [open]);

  const handleExperienceChange = (experienceId: string, experience: any) => {
    setSelectedExperienceId(experienceId);
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

  // Validate variants
  const missingVariants = objects.filter((object: any) => {
    const variant = formData.variants[object.pid];
    if (!variant) return true;

    return !variant.name?.trim();
  });

  console.log("formData", formData, missingVariants)

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a personalisation name');
      return;
    }

    if (!selectedExperienceId) {
      alert('Please select an experience');
      return;
    }

    if (objects.length === 0) {
      alert('No objects available to create variants');
      return;
    }


    
    if (missingVariants.length > 0) {
      alert(`Please configure variants for: ${missingVariants.map((obj: any) => obj.feature_flag.name).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Transform form data to API format
      const variants: Record<string, {name: string, config: Record<string, any>}> = {}

      objects.forEach((object: any) => {
        const variant = formData.variants[object.pid];

        variants[object.pid] = {
          name: variant.name?.trim() || '',
          config: variant.config || object.default_variant || {}
        };
      });

      const response = await apiRequest("POST", `/api/experiences/personalisations`, {
        name: formData.name,
        description: formData.description,
        variants: variants
      });

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[45vw] min-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New Personalisation</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <div className="space-y-6">
            {/* Experience Selection - First */}
            <ExperienceSelector
              value={selectedExperienceId}
              onValueChange={handleExperienceChange}
              disabled={isSubmitting}
              required={true}
              label="Select Experience"
              placeholder="Search and select an experience..."
            />
            
            {/* Name Field */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Personalisation Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter personalisation name"
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Description Field */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for this personalisation"
                className="mt-2"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Objects to Configure */}
            <div>
              <Label className="text-sm font-medium mb-4 block">
                Objects to Configure
                {selectedExperienceId && objects.length > 0 && (
                  <span> ({objects.length} object{objects.length !== 1 ? 's' : ''})</span>
                )}
              </Label>
              
              {!selectedExperienceId ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Please select an experience to configure objects
                  </p>
                </div>
              ) : isLoadingObjects ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading objects...
                  </p>
                </div>
              ) : objects.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No objects found in this experience
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {objects.map(({pid: objectId, feature_flag: object}: {pid: string, feature_flag: any}) => (
                    <div key={objectId} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{object.name}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Variant Name</Label>
                            <Input
                              value={formData.variants[objectId]?.name || ''}
                              onChange={(e) => handleVariantNameChange(objectId, e.target.value)}
                              placeholder="Enter variant name"
                              disabled={isSubmitting}
                            />
                          </div>
                          
                          {Object.keys(object.keys_config || {}).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Configuration</Label>
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(object.keys_config || {}).map(([key, config]: [string, any]) => (
                                  <div key={key}>
                                    <Label className="text-sm font-medium text-foreground">{key}</Label>
                                    {config.type === 'boolean' ? (
                                      <Select
                                        value={formData.variants[objectId]?.config?.[key]?.toString() || ''}
                                        onValueChange={(value) => {
                                          const boolValue = value === 'true';
                                          handleVariantConfigChange(objectId, key, boolValue);
                                        }}
                                        disabled={isSubmitting}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder={`Default: ${String(config.default)}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="true">True</SelectItem>
                                          <SelectItem value="false">False</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        type={config.type === 'number' ? 'number' : 'text'}
                                        placeholder={`Default: ${String(config.default)}`}
                                        value={formData.variants[objectId]?.config?.[key]}
                                        onChange={(e) => {
                                          const value = config.type === 'number' ? 
                                            Number(e.target.value) : 
                                            e.target.value;
                                          handleVariantConfigChange(objectId, key, value);
                                        }}
                                        className="text-sm mt-1"
                                        disabled={isSubmitting}
                                      />
                                    )}
                                    {config.description && (
                                      <p className="text-xs text-muted-foreground italic mt-1">{config.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || !selectedExperienceId || objects.length === 0}
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
        </div>
      </SheetContent>
    </Sheet>
  );
} 