import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package } from "lucide-react";

interface PersonalisationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objects: any[];
}

export default function PersonalisationForm({ open, onOpenChange, objects }: PersonalisationFormProps) {
  // Function to generate initial form data
  const getInitialFormData = () => {
    const initialVariants: Record<string, { 
      mode: 'existing' | 'new';
      variant_id?: string;
      name?: string; 
      config?: Record<string, any>;
    }> = {};
    
    // Initialize all objects with "new" mode as default
    objects.forEach(object => {
      initialVariants[object.pid] = {
        mode: 'new',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { experienceId } = useParams();

  // Reset form data when the form opens or closes
  useEffect(() => {
    setFormData(getInitialFormData());
    setIsSubmitting(false);
  }, [open, objects]);

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
            {/* Name Field */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Personalisation Name</Label>
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
                Objects to Configure ({objects.length} object{objects.length !== 1 ? 's' : ''})
              </Label>
              
              {objects.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No objects found in this experience
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {objects.map((object) => (
                    <div key={object.pid} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{object.name}</span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Mode Selection with Radio Buttons */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Variant Option</Label>
                          <RadioGroup 
                            value={formData.variants[object.pid]?.mode || 'new'} 
                            onValueChange={(value: 'existing' | 'new') => handleVariantModeChange(object.pid, value)}
                            disabled={isSubmitting}
                            className="flex items-center space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="new" id={`new-${object.pid}`} />
                              <Label htmlFor={`new-${object.pid}`} className="text-sm">Create new variant</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="existing" id={`existing-${object.pid}`} />
                              <Label htmlFor={`existing-${object.pid}`} className="text-sm">Use existing variant</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Existing Variant Selection */}
                        {formData.variants[object.pid]?.mode === 'existing' && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Select Variant</Label>
                            <Select
                              value={formData.variants[object.pid]?.variant_id || ''}
                              onValueChange={(value) => handleExistingVariantSelect(object.pid, value)}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an existing variant" />
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
                              <p className="text-xs text-muted-foreground mt-2">
                                No existing variants available for this object
                              </p>
                            )}
                          </div>
                        )}

                        {/* New Variant Creation */}
                        {formData.variants[object.pid]?.mode === 'new' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Variant Name</Label>
                              <Input
                                value={formData.variants[object.pid]?.name || ''}
                                onChange={(e) => handleVariantNameChange(object.pid, e.target.value)}
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
                                          value={formData.variants[object.pid]?.config?.[key]?.toString() || ''}
                                          onValueChange={(value) => {
                                            const boolValue = value === 'true';
                                            handleVariantConfigChange(object.pid, key, boolValue);
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
                                          value={formData.variants[object.pid]?.config?.[key]}
                                          onChange={(e) => {
                                            const value = config.type === 'number' ? 
                                              Number(e.target.value) : 
                                              e.target.value;
                                            handleVariantConfigChange(object.pid, key, value);
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
                        )}
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
        </div>
      </SheetContent>
    </Sheet>
  );
} 