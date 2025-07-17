import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";

interface SegmentExperienceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personalisations: any[];
}

export default function SegmentExperienceForm({ open, onOpenChange, personalisations }: SegmentExperienceFormProps) {
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const [formData, setFormData] = useState({
    segment_id: '',
    target_percentage: 100,
    personalisation_distribution: [
      { personalisation_id: '', personalisation_name: '', target_percentage: 100, is_default: false }
    ] as Array<{
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

  // Check if default is already added
  const hasDefault = formData.personalisation_distribution.some(item => item.is_default);

  // Reset form when opened
  const resetForm = () => {
    setFormData({
      segment_id: '',
      target_percentage: 100,
      personalisation_distribution: [
        { personalisation_id: '', personalisation_name: '', target_percentage: 100, is_default: false }
      ]
    });
    setIsSubmitting(false);
  };

  // Reset form when component opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // Load available segments on component mount
  useEffect(() => {
    const loadAvailableSegments = async () => {
      try {
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

  // Check if all personalisation rows are properly configured
  const hasIncompletePersonalisations = formData.personalisation_distribution.some(item => 
    !item.is_default && (!item.personalisation_id || item.personalisation_id === '')
  );

  // Check if form has minimum required data
  const hasMinimumData = formData.segment_id && formData.personalisation_distribution.length > 0;

  // Check if all percentage values are valid
  const hasValidPercentages = formData.personalisation_distribution.every(item => 
    item.target_percentage >= 0 && item.target_percentage <= 100
  );

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

  // Overall form validation
  const isFormValid = hasMinimumData && 
                     hasValidPercentages && 
                     !hasIncompletePersonalisations && 
                     !hasDuplicates && 
                     totalPercentage === 100;

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
        onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[45vw] min-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Segment Experience</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
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
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a segment" />
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

            {/* Target Percentage with Slider */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Target Percentage</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  value={[formData.target_percentage]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, target_percentage: value[0] }))}
                  max={100}
                  min={0}
                  step={5}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <div className="relative w-24">
                  <Input
                    type="number"
                    value={formData.target_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_percentage: Number(e.target.value) }))}
                    min="0"
                    max="100"
                    step="5"
                    className="pr-6"
                    disabled={isSubmitting}
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Personalisation Distribution */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium">Personalisation Distribution</Label>
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
                  {!hasDefault && (
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
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {formData.personalisation_distribution.map((item, index) => {
                  const isDuplicate = item.is_default 
                    ? hasMultipleDefaults 
                    : (item.personalisation_id && (duplicates.has(item.personalisation_id) || defaultPersonalisationIds.has(item.personalisation_id)));
                  
                  return (
                    <div key={index} className={`flex items-center space-x-3 py-2 ${
                      isDuplicate ? 'bg-red-50 px-3 rounded-md' : ''
                    }`}>
                      <div className="flex-1">
                        {item.is_default ? (
                          <div className="flex items-center space-x-2 px-2">
                            <span className="text-sm font-medium">{item.personalisation_name}</span>
                            {hasMultipleDefaults && (
                              <span className="text-xs text-red-600">(Duplicate default)</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <Select
                              value={item.personalisation_id || ''}
                              onValueChange={(value) => {
                                const personalisation = customPersonalisations.find(p => p.pid === value);
                                updatePersonalisation(index, 'personalisation_id', value);
                                updatePersonalisation(index, 'personalisation_name', personalisation?.name || '');
                              }}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="h-9">
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
                              <div className="text-xs text-red-600 mt-1">This personalisation is already assigned</div>
                            )}
                            {item.personalisation_id && defaultPersonalisationIds.has(item.personalisation_id) && (
                              <div className="text-xs text-red-600 mt-1">This is a default personalisation. Use "Add Default" button instead.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="relative w-24">
                        <Input
                          type="number"
                          value={item.target_percentage}
                          onChange={(e) => updatePersonalisation(index, 'target_percentage', Number(e.target.value))}
                          min="0"
                          max="100"
                          className="h-9 pr-6"
                          disabled={isSubmitting}
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removePersonalisation(index)}
                        disabled={isSubmitting}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Percentage Display */}
            <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center px-3">
                    <span className="text-sm font-medium">Total Percentage</span>
                    <span className={`text-lg font-semibold ${
                    totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {totalPercentage}%
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 mt-0 border-t">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isFormValid}
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
        </div>
      </SheetContent>
    </Sheet>
  );
} 