import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Target, 
  Users, 
  Sparkles, 
  Check, 
  Plus,
  Trash2,
  Wand2,
  Zap,
  ArrowRight,
  X,
  BarChart3,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import ExperienceSelector from "@/components/experience-selector";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ExperienceVariant {
  name: string;
  description: string;
  is_default: boolean;
  target_percentage: number;
  feature_variants: Record<string, { 
    name: string; 
    config: Record<string, any>;
    pid?: string; // Feature variant PID for existing variants
  }>;
  // PID for existing variant (edit mode only)
  variantPid?: string; // ExperienceVariant.pid for matching existing variants
}

interface PersonalisationFormData {
  name: string;
  description: string;
  experienceId: string;
  rollout_percentage: number;
  rule_config: {
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
      type: string;
    }>;
  };
  experience_variants: ExperienceVariant[];
  selected_metrics: string[];
  segments: { segment_id: string; rule_config: Record<string, any> }[];
}

interface PersonalisationFormProps {
  mode?: 'create' | 'edit';
  personalisationId?: string;
}

export default function PersonalisationForm({ 
  mode = 'create', 
  personalisationId 
}: PersonalisationFormProps = {}) {
  const [location, setLocation] = useLocation();
  const isEditMode = mode === 'edit';
  const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [reassign, setReassign] = useState(false);
  
  const queryClient = useQueryClient();

  // Query to fetch existing personalisation data (for edit mode)
  const { data: personalisationData, isLoading: isLoadingPersonalisation } = useQuery({
    queryKey: [`/api/personalisations/${personalisationId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/personalisations/${personalisationId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    },
    enabled: !!personalisationId && isEditMode,
  });

  // Initialize segments in edit mode
  useEffect(() => {
    if (isEditMode && personalisationData) {
      const rules = personalisationData.segment_rules || [];
      setFormData(prev => ({
        ...prev,
        segments: rules.map((sr: any) => ({ segment_id: sr.segment.pid, rule_config: sr.rule_config }))
      }));
    }
  }, [isEditMode, personalisationData]);

  // Parse URL parameters to get preselected experience ID
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedExperienceId = urlParams.get('experienceId');

  const [formData, setFormData] = useState<PersonalisationFormData>({
    name: '',
    description: '',
    experienceId: preselectedExperienceId || '',
    rollout_percentage: 100,
    rule_config: { conditions: [] },
    experience_variants: [],
    selected_metrics: [],
    segments: [],
  });

  // New state for Step 1: selected objects
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);

  // New state for right panel and selected experience
  const [showObjectsPanel, setShowObjectsPanel] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<any>(null);

  // Separate state for experience variants created in step 2
  const [createdVariants, setCreatedVariants] = useState<ExperienceVariant[]>([]);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiModalStep, setAIModalStep] = useState<'prompt' | 'loading'>('prompt');
  const [expandedConfigs, setExpandedConfigs] = useState<Record<string, boolean>>({});


  // Query for experience objects when experience is selected
  const { data: objects = [], isLoading: isLoadingObjects } = useQuery({
    queryKey: [`/api/experiences/${formData.experienceId}/objects`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/experiences/${formData.experienceId}/objects`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    enabled: !!formData.experienceId,
  });

  // Query for all experiences
  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery({
    queryKey: ['/api/experiences'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/experiences');
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
  });

  // Query for all metrics
  const { data: metrics = [], isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/metrics');
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
  });

  // Load existing personalisation data (edit mode)
  useEffect(() => {
    if (isEditMode && personalisationData) {
      // Set basic form fields with metrics properly filtered
      const filteredMetrics = personalisationData.metrics?.map((m: any) => m.metric?.pid).filter(Boolean) || [];
      
      setFormData({
        name: personalisationData.name || '',
        description: personalisationData.description || '',
        experienceId: personalisationData.experience_id || '',
        rollout_percentage: personalisationData.rollout_percentage || 100,
        rule_config: personalisationData.rule_config || { conditions: [] },
        experience_variants: [], // We'll populate createdVariants separately
        selected_metrics: filteredMetrics,
        // Ensure `segments` exists on the form data. Prefer an explicit `segments` array if present,
        // otherwise map from legacy `segment_rules` to the expected shape.
        segments: personalisationData.segments || (personalisationData.segment_rules ? personalisationData.segment_rules.map((sr: any) => ({ segment_id: sr.segment.pid, rule_config: sr.rule_config })) : []),
      });
      
      // Set selected experience
      if (experiences.length > 0 && personalisationData.experience_id) {
        const experience = experiences.find((exp: any) => exp.pid === personalisationData.experience_id);
        if (experience) {
          setSelectedExperience(experience);
          setShowObjectsPanel(true);
        }
      }
      
      // Transform experience variants into our format
      if (personalisationData.experience_variants?.length > 0) {
        const variants = personalisationData.experience_variants.map((variantData: any) => {
          const variant = variantData.experience_variant;
          
          // Format feature variants - transforming array to object keyed by ID
          const featureVariants: Record<string, { name: string; config: Record<string, any>; pid?: string }> = {};
          
          variant.feature_variants?.forEach((fv: any) => {
            featureVariants[fv.experience_feature_id] = {
              name: fv.name || '',
              config: fv.config || {},
              pid: fv.pid // Store feature variant PID for updates
            };
          });
          
          return {
            name: variant.name || '',
            description: variant.description || '',
            is_default: variant.is_default || false,
            target_percentage: variantData.target_percentage || 0, // Note: this is from the outer object
            feature_variants: featureVariants,
            variantPid: variant.pid // ExperienceVariant.pid for matching
          };
        });
        
        setCreatedVariants(variants);
        
        // Collect all unique object IDs from all variants
        const allObjectIds = new Set<string>();
        personalisationData.experience_variants.forEach((variantData: any) => {
          variantData.experience_variant.feature_variants?.forEach((fv: any) => {
            allObjectIds.add(fv.experience_feature_id);
          });
        });
        
        setSelectedObjects(Array.from(allObjectIds));
      }
    }
  }, [isEditMode, personalisationData, experiences]);

  // Auto-open objects panel if experience is pre-selected (create mode)
  useEffect(() => {
    if (!isEditMode && preselectedExperienceId && experiences.length > 0) {
      const preselectedExperience = experiences.find((exp: any) => exp.pid === preselectedExperienceId);
      if (preselectedExperience) {
        setSelectedExperience(preselectedExperience);
        setShowObjectsPanel(true);
      }
    }
  }, [isEditMode, preselectedExperienceId, experiences]);

  // Initialize experience variants when objects load
  useEffect(() => {
    if (objects.length > 0 && createdVariants.length === 0 && selectedObjects.length > 0) {
      const initialFeatureVariants: Record<string, { name: string; config: Record<string, any> }> = {};
      // Only include selected objects
      objects.filter((object: any) => selectedObjects.includes(object.pid)).forEach((object: any) => {
        initialFeatureVariants[object.pid] = {
          name: '',
          config: {}
        };
      });
      
      // Create default experience variant
      const defaultVariant: ExperienceVariant = {
        name: '',
        description: '',
        is_default: false,
        target_percentage: 0,
        feature_variants: initialFeatureVariants
      };
      
      setCreatedVariants([defaultVariant]);
    }
  }, [objects, selectedObjects]);

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
  }, []);

  const handleExperienceChange = (experienceId: string, experience: any) => {
    setShowObjectsPanel(true);

    if (experienceId === selectedExperience?.pid) return;

    setFormData(prev => ({ 
      ...prev, 
      experienceId
    }));
    setSelectedExperience(experience); // Set the full experience object
    setSelectedObjects([]); // Reset selected objects when experience changes
    setCreatedVariants([]); // Reset created variants when experience changes
  };

  const addExperienceVariant = () => {
    if (objects.length === 0 || selectedObjects.length === 0) return;
    
    const initialFeatureVariants: Record<string, { name: string; config: Record<string, any>; pid?: string }> = {};
    // Only include selected objects
    objects.filter((object: any) => selectedObjects.includes(object.pid)).forEach((object: any) => {
      initialFeatureVariants[object.pid] = {
        name: '',
        config: {}
      };
    });
    
    const newVariant: ExperienceVariant = {
      name: '',
      description: '',
      is_default: false,
      target_percentage: 0,
      feature_variants: initialFeatureVariants
    };
    
    setCreatedVariants(prev => [...prev, newVariant]);
  };

  const removeExperienceVariant = (index: number) => {
    setCreatedVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateCreatedVariant = (index: number, field: keyof ExperienceVariant, value: any) => {
    setCreatedVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const handleFeatureVariantNameChange = (variantIndex: number, objectId: string, name: string) => {
    setCreatedVariants(prev => prev.map((variant, i) => 
      i === variantIndex ? {
        ...variant,
        feature_variants: {
          ...variant.feature_variants,
          [objectId]: {
            ...variant.feature_variants[objectId],
            name
          }
        }
      } : variant
    ));
  };

  const handleFeatureVariantConfigChange = (variantIndex: number, objectId: string, key: string, value: any) => {
    // If value is undefined or an empty string, we remove the key from the config entirely
    setCreatedVariants(prev => prev.map((variant, i) => {
      if (i !== variantIndex) return variant;

      const existingFeatureVariant = variant.feature_variants[objectId] || { name: '', config: {} };
      const existingConfig = { ...(existingFeatureVariant.config || {}) };

      if (value === undefined || value === '') {
        delete existingConfig[key];
      } else {
        existingConfig[key] = value;
      }

      return {
        ...variant,
        feature_variants: {
          ...variant.feature_variants,
          [objectId]: {
            ...existingFeatureVariant,
            config: existingConfig
          }
        }
      };
    }));
  };

  const validateStep1 = () => {
    return formData.experienceId && selectedObjects.length > 0;
  };

  const validateStep2 = () => {
    if (selectedObjects.length === 0) return false;
    if (createdVariants.length === 0) return false;
    
    // Check if all created variants have names
    const invalidVariants = createdVariants.filter((variant) => {
      if (!variant.name.trim()) return true;
      
      // Check if all feature variants have names (only for selected objects)
      const missingFeatureVariants = objects.filter((object: any) => {
        if (!selectedObjects.includes(object.pid)) return false; // Skip non-selected objects
        const featureVariant = variant.feature_variants[object.pid];
        return !featureVariant || !featureVariant.name?.trim();
      });
      
      return missingFeatureVariants.length > 0;
    });
    
    return invalidVariants.length === 0;
  };

  const validateStep3 = () => {
    // Check if total target percentage equals 100%
    const totalPercentage = createdVariants.reduce((sum, variant) => sum + variant.target_percentage, 0);
    return totalPercentage === 100;
  };

  const validateStep4 = () => {
    // At least one metric should be selected or user can proceed without metrics
    return true; // Optional step
  };

  const validateStep5 = () => {
    return formData.name.trim() !== '';
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    } else if (currentStep === 4 && validateStep4()) {
      setCurrentStep(5);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 5) {
      setCurrentStep(4);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare experience variants according to backend schema
      const experienceVariants = createdVariants.map((variant) => {
        const isExistingVariant = isEditMode && variant.variantPid;
        
        const experienceVariant: any = {
          name: variant.name,
          description: variant.description,
          is_default: variant.is_default,
          feature_variants: objects
            .filter((object: any) => selectedObjects.includes(object.pid)) // Only include selected objects
            .map((object: any) => {
              const featureVariant = variant.feature_variants[object.pid];

              return {
                experience_feature_id: object.pid,
                name: featureVariant?.name || '',
                config: featureVariant?.config || {},
                ...(featureVariant?.pid && { pid: featureVariant.pid })
              };
            }),
          ...(isExistingVariant && { pid: variant.variantPid })
        };

        return {
          experience_variant: experienceVariant,
          target_percentage: variant.target_percentage
        };
      });


      // Filter out any null values from selected_metrics
      const cleanedMetrics = formData.selected_metrics.filter(Boolean);

      const payload = {
        name: formData.name,
        description: formData.description,
        experience_id: formData.experienceId,
        rule_config: formData.rule_config,
        rollout_percentage: formData.rollout_percentage,
        selected_metrics: cleanedMetrics,
  experience_variants: experienceVariants,
  segments: formData.segments,
        ...(isEditMode && { reassign: reassign })
      };

      // Use different endpoints for create vs edit
      const response = isEditMode 
        ? await apiRequest("PATCH", `/api/personalisations/${personalisationId}`, payload)
        : await apiRequest("POST", `/api/personalisations`, payload);

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} personalisation`);
      }

      // Invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/personalisations'] });
      
      // Invalidate detailed personalisations for the current experience
      queryClient.invalidateQueries({ 
        queryKey: [`/api/personalisations/personalised-experiences/${formData.experienceId}`] 
      });
      
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: [`/api/personalisations/${personalisationId}`] });
      }
      
      setLocation('/personalisations');
      
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} personalisation:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} personalisation. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAIModal = () => {
    setAIPrompt('');
    setAIModalStep('prompt');
    setShowAIModal(true);
  };

  const handleReloadMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
  };

  // Show loading for edit mode
  if (isEditMode && isLoadingPersonalisation) {
    return (
      <ConsoleLayout>
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
            </div>
            <p className="text-muted-foreground">Loading personalisation data...</p>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="flex-1 p-6 pb-0">
        <div className="h-full max-h-[calc(80vh+8px)] overflow-y-auto">
          {/* Header */}
          <div className="flex mb-8 items-center justify-between flex-col gap-8 xl:flex-row">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-14 h-14 bg-gradient-to-r from-primary/20 via-primary/10 to-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center justify-center shadow-inner">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {isEditMode ? 'Edit Personalisation' : 'Create Personalisation'}
                  </h1>
                  <p className="text-muted-foreground">
                    {isEditMode ? 'Edit previously created personalisations' : 'Build magical experiences for your players'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Step Navigation moved to top right */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-500 shadow-md ${
                  currentStep >= 1 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25' 
                    : 'bg-white/70 dark:bg-gray-800/70 text-muted-foreground backdrop-blur-sm'
                }`}>
                  {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                </div>
                <div>
                  <p className="text-xs font-medium">Experience</p>
                </div>
              </div>
              <ArrowRight className={`w-3 h-3 transition-colors duration-300 ${
                currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-500 shadow-md ${
                  currentStep >= 2 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25' 
                    : 'bg-white/70 dark:bg-gray-800/70 text-muted-foreground backdrop-blur-sm'
                }`}>
                  {currentStep > 2 ? <Check className="w-3 h-3" /> : '2'}
                </div>
                <div>
                  <p className="text-xs font-medium">Variants</p>
                </div>
              </div>
              <ArrowRight className={`w-3 h-3 transition-colors duration-300 ${
                currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-500 shadow-md ${
                  currentStep >= 3 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25' 
                    : 'bg-white/70 dark:bg-gray-800/70 text-muted-foreground backdrop-blur-sm'
                }`}>
                  {currentStep > 3 ? <Check className="w-3 h-3" /> : '3'}
                </div>
                <div>
                  <p className="text-xs font-medium">Target Users</p>
                </div>
              </div>
              <ArrowRight className={`w-3 h-3 transition-colors duration-300 ${
                currentStep >= 4 ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-500 shadow-md ${
                  currentStep >= 4 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25' 
                    : 'bg-white/70 dark:bg-gray-800/70 text-muted-foreground backdrop-blur-sm'
                }`}>
                  {currentStep > 4 ? <Check className="w-3 h-3" /> : '4'}
                </div>
                <div>
                  <p className="text-xs font-medium">Metrics</p>
                </div>
              </div>
              <ArrowRight className={`w-3 h-3 transition-colors duration-300 ${
                currentStep >= 5 ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-500 shadow-md ${
                  currentStep >= 5 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25' 
                    : 'bg-white/70 dark:bg-gray-800/70 text-muted-foreground backdrop-blur-sm'
                }`}>
                  5
                </div>
                <div>
                  <p className="text-xs font-medium">Finalize</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 pt-0 space-y-8">
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Step 1: Experience Selection */}
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Choose Your Experience
                  </h2>
                  <p className="text-muted-foreground">
                    Select an experience and choose which objects you want to personalize
                  </p>
                </div>

                {/* Experience Cards Grid */}
                <div className="mb-8">
                  {isLoadingExperiences ? (
                    <div className="text-center py-12">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                        <div className="absolute inset-0 animate-pulse">
                          <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-full mx-auto"></div>
                        </div>
                      </div>
                      <p className="text-muted-foreground">Loading experiences...</p>
                    </div>
                  ) : experiences.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-primary/20 backdrop-blur-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-primary/70" />
                      </div>
                      <p className="text-muted-foreground text-lg">No experiences found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {experiences.map((experience: any) => (
                        <Card 
                          key={experience.pid}
                          className={`cursor-pointer transition-all duration-300 ${
                            formData.experienceId === experience.pid
                              ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-green-400 shadow-lg'
                              : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white/95 dark:hover:bg-gray-800/70 border-white/30'
                          } backdrop-blur-sm`}
                          onClick={() => handleExperienceChange(experience.pid, experience)}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${
                                formData.experienceId === experience.pid
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                  : 'bg-green-100 dark:bg-green-900/30'
                              }`}>
                                <Package className={`w-5 h-5 ${
                                  formData.experienceId === experience.pid
                                    ? 'text-white'
                                    : 'text-green-600 dark:text-green-400'
                                }`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className={`text-base mb-1 line-clamp-1 ${
                                  formData.experienceId === experience.pid
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-foreground'
                                }`}>
                                  {experience.name}
                                </CardTitle>
                                <p className={`text-xs line-clamp-2 ${
                                  formData.experienceId === experience.pid
                                    ? 'text-green-600 dark:text-green-300'
                                    : 'text-muted-foreground'
                                }`}>
                                  {experience.description || 'No description'}
                                </p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                formData.experienceId === experience.pid
                                  ? 'bg-green-500 border-green-500 shadow-lg'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {formData.experienceId === experience.pid && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side Panel for Object Selection */}
                {showObjectsPanel && formData.experienceId && (
                  <Sheet open={!!(showObjectsPanel && formData.experienceId)} onOpenChange={setShowObjectsPanel}>
                    <SheetContent side="right" className="w-[45vw] min-w-[700px] overflow-y-auto">
                      {/* Panel Header */}
                      <SheetHeader className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Select Objects to Personalize
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Choose which objects within "{selectedExperience?.name}" you want to personalize
                            </p>
                          </div>
                        </div>
                      </SheetHeader>

                      <div className="flex items-center justify-between mb-4 h-9">
                        <p className="text-sm text-muted-foreground">
                          {selectedObjects.length} of {objects.length} objects selected
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedObjects([])}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Clear All
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedObjects(objects.map(({pid}: {pid: string}) => pid))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Select All
                          </Button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div className="pb-6 h-full -mr-2 overflow-y-auto max-h-[calc(90vh-170px)]">
                        {isLoadingObjects ? (
                          <div className="text-center py-12">
                            <div className="relative">
                              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                              <div className="absolute inset-0 animate-pulse">
                                <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-full mx-auto"></div>
                              </div>
                            </div>
                            <p className="text-muted-foreground">Loading objects...</p>
                          </div>
                        ) : objects.length === 0 ? (
                          <div className="text-center py-12 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-primary/20 backdrop-blur-sm">
                            <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Package className="w-8 h-8 text-primary/70" />
                            </div>
                            <p className="text-muted-foreground text-lg">No objects found in this experience</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {objects.map(({pid: objectId, feature_flag: object}: {pid: string, feature_flag: any}) => (
                                <Card 
                                  key={objectId} 
                                  className={`p-4 h-fit cursor-pointer transition-all duration-300 hover:shadow-lg ${
                                    selectedObjects.includes(objectId)
                                      ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-green-400'
                                      : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white/95 dark:hover:bg-gray-700/95'
                                  } backdrop-blur-sm`}
                                  onClick={() => {
                                    setSelectedObjects(prev => 
                                      prev.includes(objectId)
                                        ? prev.filter(id => id !== objectId)
                                        : [...prev, objectId]
                                    );
                                  }}
                                >
                                  <CardHeader className="p-0 mb-4">
                                    <div className="flex items-start space-x-3">
                                      <div className={`p-2 rounded-lg ${
                                        selectedObjects.includes(objectId)
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                          : 'bg-green-100 dark:bg-green-900/30'
                                      }`}>
                                        <Package className={`w-5 h-5 ${
                                          selectedObjects.includes(objectId)
                                            ? 'text-white'
                                            : 'text-green-600 dark:text-green-400'
                                        }`} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <CardTitle className={`text-base mb-1 line-clamp-1 ${
                                          selectedObjects.includes(objectId)
                                            ? 'text-green-800 dark:text-green-200'
                                            : 'text-foreground'
                                        }`}>
                                          {object.name}
                                        </CardTitle>
                                        <p className={`text-xs line-clamp-2 ${
                                          selectedObjects.includes(objectId)
                                            ? 'text-green-600 dark:text-green-300'
                                            : 'text-muted-foreground'
                                        }`}>
                                          {object.description || 'No description'}
                                        </p>
                                      </div>
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        selectedObjects.includes(objectId)
                                          ? 'bg-green-500 border-green-500 shadow-lg'
                                          : 'border-gray-300 dark:border-gray-600'
                                      }`}>
                                        {selectedObjects.includes(objectId) && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  
                                  <CardContent className="p-0">
                                    <div className="bg-gradient-to-br from-primary/5 to-blue-600/5 rounded-lg p-3 border border-primary/10">
                                      <div className="space-y-2">
                                        {Object.keys(object.keys_config || {}).length > 0 ? (
                                          Object.keys(object.keys_config || {}).slice(0, 4).map((key) => (
                                            <div key={key} className="flex items-center justify-between">
                                              <span className="text-xs text-muted-foreground truncate">{key}</span>
                                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                                {object.keys_config[key].type}
                                              </Badge>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-xs text-muted-foreground">No configuration keys</div>
                                        )}
                                        {Object.keys(object.keys_config || {}).length > 4 && (
                                          <div className="text-xs text-muted-foreground">
                                            +{Object.keys(object.keys_config || {}).length - 4} more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Panel Footer */}
                      <div className="flex space-x-3 justify-end pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowObjectsPanel(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            setShowObjectsPanel(false);
                            setCurrentStep(currentStep + 1);
                          }}
                          disabled={selectedObjects.length === 0}
                          className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white"
                        >
                          Confirm Selection
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                {/* Experience Variants */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <Label className="text-lg font-semibold">
                      Experience Variants
                      {createdVariants.length > 0 && (
                        <span className="ml-2 text-muted-foreground font-normal">({createdVariants.length} variant{createdVariants.length !== 1 ? 's' : ''})</span>
                      )}
                    </Label>
                    <Button 
                      onClick={addExperienceVariant}
                      variant="outline"
                      className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                      disabled={selectedObjects.length === 0 || isSubmitting}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                  
                  {selectedObjects.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-primary/20 backdrop-blur-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-primary/70" />
                      </div>
                      <p className="text-muted-foreground text-lg">No objects selected for personalization</p>
                      <p className="text-sm text-muted-foreground mt-2">Please go back to Step 1 and select objects to personalize</p>
                    </div>
                  ) : createdVariants.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-primary/20 backdrop-blur-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-primary/70" />
                      </div>
                      <p className="text-muted-foreground text-lg mb-4">No experience variants created yet</p>
                      <Button 
                        onClick={addExperienceVariant}
                        variant="outline"
                        className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Variant
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {createdVariants.map((variant, variantIndex) => (
                        <div key={variantIndex} className="relative bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 backdrop-blur-sm border border-white/30 rounded-xl p-6 shadow-sm">
                          {/* Remove Button */}
                          {createdVariants.length > 1 ? 
                            <div className="absolute right-2 top-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExperienceVariant(variantIndex)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition-colors"
                                disabled={createdVariants.length === 1 || isSubmitting}
                                title={createdVariants.length === 1 ? "Cannot remove the last variant" : "Remove this variant"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          : null}

                          {/* Variant Details */}
                          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            <div>
                              <Label className="text-sm font-medium">Variant Name *</Label>
                              <Input
                                value={variant.name}
                                onChange={(e) => updateCreatedVariant(variantIndex, 'name', e.target.value)}
                                placeholder="Enter variant name"
                                className="mt-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20"
                                disabled={isSubmitting}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <Input
                                value={variant.description}
                                onChange={(e) => updateCreatedVariant(variantIndex, 'description', e.target.value)}
                                placeholder="Describe this variant"
                                className="mt-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>

                          {/* Object Configurations - Only for selected objects */}
                          <div>
                            <div className="flex items-center space-x-2 mb-6">
                              <div className="h-px bg-gradient-to-r from-primary/20 to-blue-600/20 flex-1"></div>
                              <Label className="text-sm font-semibold text-foreground px-3 bg-white/50 dark:bg-gray-800/50 rounded-full">Object Configurations</Label>
                              <div className="h-px bg-gradient-to-r from-blue-600/20 to-primary/20 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {objects
                                .filter(({pid: objectId}: {pid: string}) => selectedObjects.includes(objectId))
                                .map(({pid: objectId, feature_flag: object}: {pid: string, feature_flag: any}) => (
                                <Card key={objectId} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-white/30">
                                  <CardHeader className="pb-6">
                                    <div className="flex items-start space-x-3">
                                      <div className="p-1.5 bg-primary/10 rounded-lg">
                                        <Package className="w-6 h-6 text-primary" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <CardTitle className="text-base text-foreground mb-1">
                                          {object.name}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{object.description || 'No description'}</p>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  
                                  <CardContent className="space-y-4">
                                    {/* Feature Variant Name */}
                                    <div>
                                      <Label className="text-xs font-medium">Feature Variant Name *</Label>
                                      <Input
                                        value={variant.feature_variants[objectId]?.name || ''}
                                        onChange={(e) => handleFeatureVariantNameChange(variantIndex, objectId, e.target.value)}
                                        placeholder="Enter feature name"
                                        className="mt-1 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm"
                                        disabled={isSubmitting}
                                      />
                                    </div>

                                    {/* Configuration */}
                                    {Object.keys(object.keys_config || {}).length > 0 && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(object.keys_config || {}).map(([key, config]: [string, any]) => (
                                          <div key={key} className="space-y-1">
                                            <Label className="text-xs font-medium text-foreground">{key}</Label>
                                            {config.description && (
                                              <p className="text-xs text-muted-foreground">{config.description}</p>
                                            )}
                                            {config.type === 'boolean' ? (
                                              <Select
                                                value={variant.feature_variants[objectId]?.config?.[key]?.toString() || ''}
                                                onValueChange={(value) => {
                                                  const boolValue = value === 'true';
                                                  handleFeatureVariantConfigChange(variantIndex, objectId, key, boolValue);
                                                }}
                                                disabled={isSubmitting}
                                              >
                                                <SelectTrigger className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm">
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
                                                value={
                                                  variant.feature_variants[objectId]?.config?.[key] ?? ''
                                                }
                                                onChange={(e) => {
                                                  const raw = e.target.value;
                                                  if (config.type === 'number') {
                                                    if (raw === '') {
                                                      handleFeatureVariantConfigChange(variantIndex, objectId, key, undefined);
                                                    } else {
                                                      const num = Number(raw);
                                                      handleFeatureVariantConfigChange(variantIndex, objectId, key, isNaN(num) ? undefined : num);
                                                    }
                                                  } else {
                                                    if (raw === '') {
                                                      handleFeatureVariantConfigChange(variantIndex, objectId, key, undefined);
                                                    } else {
                                                      handleFeatureVariantConfigChange(variantIndex, objectId, key, raw);
                                                    }
                                                  }
                                                }}
                                                className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm"
                                                disabled={isSubmitting}
                                              />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                {/* Header Section */}
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Target Users
                  </h2>
                  <p className="text-sm text-muted-foreground">Define targeting rules and configure variant distribution</p>
                </div>

                {/* Segments Dropdown + Selected List (new UI) */}
                <div className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <Label className="text-lg font-semibold">Segments</Label>
                  </div>

                  <div className="mb-4">
                    {isLoadingSegments ? (
                      <div className="text-sm text-muted-foreground">Loading segments...</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Select
                          onValueChange={(val) => {
                            const segId = val;
                            const seg = availableSegments.find(s => (s.id || s.pid) === segId);
                            if (!seg) return;
                            setFormData(prev => {
                              if (prev.segments.some(x => x.segment_id === segId)) return prev;
                              return { ...prev, segments: [...prev.segments, { segment_id: segId, rule_config: seg.rule_config || {} }] };
                            });
                          }}
                        >
                          <SelectTrigger className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 w-64">
                            <SelectValue placeholder="Select a segment to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSegments.map((seg: any) => (
                              <SelectItem key={seg.id || seg.pid} value={seg.id || seg.pid}>{seg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">Choose one or more segments to include</div>
                      </div>
                    )}
                  </div>

                  {/* Selected segments list */}
                  <div className="space-y-3">
                    {formData.segments && formData.segments.length > 0 ? (
                      formData.segments.map((sr, idx) => {
                        const segObj = availableSegments.find(s => (s.id || s.pid) === sr.segment_id) || { name: sr.segment_id, rule_config: sr.rule_config };
                        const conditions = sr.rule_config?.conditions || segObj.rule_config?.conditions || [];
                        return (
                          <div key={sr.segment_id} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/10 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-foreground">{segObj.name}</div>
                                  {segObj.description && <div className="text-xs text-muted-foreground">{segObj.description}</div>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, segments: prev.segments.filter(s => s.segment_id !== sr.segment_id) }))}
                                  className="ml-4 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                                  aria-label={`Remove segment ${segObj.name}`}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </div>

                              {/* Rules preview */}
                              <div className="mt-2 text-xs font-mono text-muted-foreground">
                                {conditions && conditions.length > 0 ? (
                                  conditions.slice(0,3).map((c: any, i: number) => (
                                    <div key={i}>{`${c.field} ${c.operator} ${Array.isArray(c.value) ? c.value.join(', ') : c.value}`}</div>
                                  ))
                                ) : (
                                  <div className="text-xs text-muted-foreground">No rules defined</div>
                                )}
                                {conditions && conditions.length > 3 && (
                                  <div className="text-xs text-muted-foreground">+{conditions.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">No segments selected</div>
                    )}
                  </div>
                </div>

                {/* Targeting Rules */}
                <div className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <Label className="text-lg font-semibold">Targeting Rules</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Define conditions to control which users see this personalisation (optional)
                  </p>

                  {formData.rule_config.conditions.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No targeting conditions yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Add conditions to control which users see this personalisation
                      </p>
                      <Button 
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            rule_config: {
                              ...prev.rule_config,
                              conditions: [{ field: '', operator: 'equals', value: '', type: 'text' }]
                            }
                          }));
                        }}
                        variant="outline"
                        className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Condition
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.rule_config.conditions.map((condition, index) => (
                        <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20 p-4">
                          <div className="flex items-center">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs font-medium mb-1 block">Field</Label>
                                <Input
                                  placeholder="e.g. country, age"
                                  value={condition.field}
                                  onChange={(e) => {
                                    const updatedConditions = formData.rule_config.conditions.map((c, i) =>
                                      i === index ? { ...c, field: e.target.value } : c
                                    );
                                    setFormData(prev => ({
                                      ...prev,
                                      rule_config: { ...prev.rule_config, conditions: updatedConditions }
                                    }));
                                  }}
                                  className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm"
                                  disabled={isSubmitting}
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium mb-1 block">Operator</Label>
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) => {
                                    const updatedConditions = formData.rule_config.conditions.map((c, i) =>
                                      i === index ? { ...c, operator: value } : c
                                    );
                                    setFormData(prev => ({
                                      ...prev,
                                      rule_config: { ...prev.rule_config, conditions: updatedConditions }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm">
                                    <SelectValue placeholder="Select operator" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_equals">Not Equals</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                    <SelectItem value="less_than">Less Than</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="in">In</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium mb-1 block">Value</Label>
                                {condition.type === 'boolean' ? (
                                  <Select
                                    value={condition.value?.toString() || ''}
                                    onValueChange={(value) => {
                                      const boolValue = value === 'true';
                                      const updatedConditions = formData.rule_config.conditions.map((c, i) =>
                                        i === index ? { ...c, value: boolValue.toString() } : c
                                      );
                                      setFormData(prev => ({
                                        ...prev,
                                        rule_config: { ...prev.rule_config, conditions: updatedConditions }
                                      }));
                                    }}
                                    disabled={isSubmitting}
                                  >
                                    <SelectTrigger className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm">
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">True</SelectItem>
                                      <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    type={condition.type === 'number' ? 'number' : 'text'}
                                    placeholder={condition.type === 'number' ? 'Enter number' : 'Enter value'}
                                    value={condition.value}
                                    onChange={(e) => {
                                      const value = condition.type === 'number' ? 
                                        Number(e.target.value) : 
                                        e.target.value;
                                      const updatedConditions = formData.rule_config.conditions.map((c, i) =>
                                        i === index ? { ...c, value: value.toString() } : c
                                      );
                                      setFormData(prev => ({
                                        ...prev,
                                        rule_config: { ...prev.rule_config, conditions: updatedConditions }
                                      }));
                                    }}
                                    className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm"
                                    disabled={isSubmitting}
                                  />
                                )}
                              </div>
                            </div>

                            <div className="mt-6">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    rule_config: {
                                      ...prev.rule_config,
                                      conditions: prev.rule_config.conditions.filter((_, i) => i !== index)
                                    }
                                  }));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50/70 dark:hover:bg-red-900/30 ml-2"
                              >
                                <Trash2 className="w-6 h-6" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Condition Button - Below conditions */}
                      <div className="pt-2">
                        <Button 
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              rule_config: {
                                ...prev.rule_config,
                                conditions: [
                                  ...prev.rule_config.conditions,
                                  { field: '', operator: 'equals', value: '', type: 'text' }
                                ]
                              }
                            }));
                          }}
                          variant="outline"
                          className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Condition
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Variant Distribution & Rollout Percentage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Variant Distribution */}
                  <div className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <Label className="text-lg font-semibold">Variant Distribution</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Set what percentage of users see each experience variant
                    </p>
                    
                    <div className="space-y-4">
                      {createdVariants.map((variant, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{variant.name || `Variant ${index + 1}`}</h4>
                          </div>
                          <div className="flex items-center space-x-3 w-32">
                            <Input
                              type="number"
                              value={variant.target_percentage}
                              onChange={(e) => {
                                const updatedVariants = createdVariants.map((v, i) => 
                                  i === index ? { ...v, target_percentage: Math.max(0, Math.min(100, Number(e.target.value))) } : v
                                );
                                setCreatedVariants(updatedVariants);
                              }}
                              min="0"
                              max="100"
                              className="text-center bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20 text-sm"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm font-medium text-foreground">%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Percentage Display */}
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Distribution</span>
                        <span className={`text-lg font-semibold ${
                          createdVariants.reduce((sum, v) => sum + v.target_percentage, 0) === 100 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {createdVariants.reduce((sum, v) => sum + v.target_percentage, 0)}%
                        </span>
                      </div>
                      {createdVariants.reduce((sum, v) => sum + v.target_percentage, 0) !== 100 && (
                        <p className="text-xs text-red-600 mt-2">
                          Total percentage must equal 100% to proceed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rollout Percentage */}
                  <div className="h-fit bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">%</span>
                      </div>
                      <Label className="text-lg font-semibold">Rollout Percentage</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      What percentage of users should see this personalisation?
                    </p>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[formData.rollout_percentage]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, rollout_percentage: value[0] }))}
                        max={100}
                        min={0}
                        step={5}
                        className="flex-1"
                        disabled={isSubmitting}
                      />
                      <div className="w-20">
                        <Input
                          type="number"
                          value={formData.rollout_percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, rollout_percentage: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                          min="0"
                          max="100"
                          className="text-center bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/20"
                          disabled={isSubmitting}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                {/* Header Section */}
                                 <div className="flex items-center justify-between">
                   <div>
                     <h2 className="text-2xl font-bold text-foreground">
                       Configure Metrics
                     </h2>
                     <p className="text-sm text-muted-foreground">Select metrics to track the success of your personalisation</p>
                   </div>
                   <div className="flex space-x-3">
                     <Button
                       variant="ghost"
                       onClick={handleReloadMetrics}
                       disabled={isLoadingMetrics}
                       className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                     >
                       <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                       Reload
                     </Button>
                     <Button
                       variant="outline"
                       onClick={() => window.open('/metrics/builder', '_blank')}
                       className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                     >
                       <Plus className="w-4 h-4 mr-2" />
                       Create New
                     </Button>
                   </div>
                 </div>

                {/* Metrics Selection */}
                {isLoadingMetrics ? (
              <div className="text-center py-12">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                      <div className="absolute inset-0 animate-pulse">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-full mx-auto"></div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">Loading metrics...</p>
                  </div>
                ) : metrics.length === 0 ? (
                                     <div className="text-center py-12 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border-2 border-dashed border-primary/20 backdrop-blur-sm">
                     <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                       <BarChart3 className="w-8 h-8 text-primary/70" />
                     </div>
                     <h3 className="text-lg font-medium mb-2">No metrics found</h3>
                     <p className="text-muted-foreground mb-4">
                       Create your first metric to track personalisation performance or try reloading if you expect to see metrics
                     </p>
                     <div className="flex justify-center space-x-3">
                       <Button
                         variant="ghost"
                         onClick={handleReloadMetrics}
                         disabled={isLoadingMetrics}
                         className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                       >
                         <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                         Reload
                       </Button>
                       <Button
                         variant="outline"
                         onClick={() => window.open('/metrics/builder', '_blank')}
                         className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
                       >
                         <Plus className="w-4 h-4 mr-2" />
                         Create First Metric
                       </Button>
              </div>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {metrics.map((metric: any) => (
                                             <Card 
                         key={metric.pid}
                         className={`group cursor-pointer transition-all duration-300 ${
                           formData.selected_metrics.includes(metric.pid)
                             ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-green-400 shadow-lg'
                             : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white/95 dark:hover:bg-gray-800/70 border-white/30'
                         } backdrop-blur-sm`}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            selected_metrics: prev.selected_metrics.includes(metric.pid)
                              ? prev.selected_metrics.filter(id => id !== metric.pid)
                              : [...prev.selected_metrics, metric.pid]
                          }));
                        }}
                      >
                                                 <CardHeader className="pb-4">
                           <div className="flex items-start space-x-3">
                             <div className={`p-2 rounded-lg ${
                               formData.selected_metrics.includes(metric.pid)
                                 ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                 : 'bg-blue-100 dark:bg-blue-900/30'
                             }`}>
                               <BarChart3 className={`w-5 h-5 ${
                                 formData.selected_metrics.includes(metric.pid)
                                   ? 'text-white'
                                   : 'text-blue-600 dark:text-blue-400'
                               }`} />
                             </div>
                             <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2">
                                 <CardTitle className={`text-base mb-1 line-clamp-1 ${
                                   formData.selected_metrics.includes(metric.pid)
                                     ? 'text-green-800 dark:text-green-200'
                                     : 'text-foreground'
                                 }`}>
                                   {metric.name}
                                 </CardTitle>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     window.open(`/metrics/builder?id=${metric.pid}`, '_blank');
                                   }}
                                   className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 hover:bg-white/50 dark:hover:bg-gray-700/50"
                                 >
                                   <ExternalLink className="w-3 h-3" />
                                 </Button>
                               </div>
                               <p className={`text-xs line-clamp-2 ${
                                 formData.selected_metrics.includes(metric.pid)
                                   ? 'text-green-600 dark:text-green-300'
                                   : 'text-muted-foreground'
                               }`}>
                                 {metric.description || 'No description'}
                               </p>
                             </div>
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                               formData.selected_metrics.includes(metric.pid)
                                 ? 'bg-green-500 border-green-500 shadow-lg'
                                 : 'border-gray-300 dark:border-gray-600'
                             }`}>
                               {formData.selected_metrics.includes(metric.pid) && (
                                 <Check className="w-3 h-3 text-white" />
                               )}
                             </div>
                           </div>
                         </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-8">
                {/* Header Section */}
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Review & Finalize
                  </h2>
                  <p className="text-sm text-muted-foreground">Name your personalisation and review all settings before {isEditMode ? 'updating' : 'creating'}</p>
                </div>

                {/* Personalisation Name and Description */}
                <div className="grid grid-cols-2 gap-6 w-2/3">
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
                      className="mt-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description"
                      className="mt-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                
                {/* Apply to Existing Users Option (Edit mode only) */}
                {isEditMode && (
                  <div className="w-full rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 p-4">
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-amber-800 dark:text-amber-400">Apply to Existing Users</h3>
                        </div>
                        <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                          <p className="mb-2">Choose how this update affects users who are already experiencing this personalisation:</p>
                          
                          <div className="flex items-start space-x-2 mt-3">
                            <Checkbox
                              id="reassign"
                              checked={reassign} 
                              onCheckedChange={(checked) => setReassign(checked === true)} 
                            />
                            <div>
                              <label 
                                htmlFor="reassign" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-amber-800 dark:text-amber-300"
                              >
                                Apply changes to existing users
                              </label>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                If checked, all users will get the latest variants immediately. Old variants will be overwritten.
                                <span className="font-bold"> This action cannot be reversed.</span>
                              </p>
                              {reassign && (
                                <div className="mt-2 p-2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
                                  ⚠️ Warning: Enabling this option will immediately update the experience for all users currently in this personalisation.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="space-y-6">
                  {/* Experience Card */}
                  <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        Experience Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Selected Experience - Minimal */}
                        <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                          <span className="text-sm text-muted-foreground">Selected Experience:</span>
                          <span className="font-semibold text-foreground">{selectedExperience?.name}</span>
                        </div>

                        {/* Experience Variants */}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-4">Experience Variants</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {createdVariants.map((variant, variantIndex) => (
                              <div key={variantIndex} className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-semibold text-foreground text-base">{variant.name || `Variant ${variantIndex + 1}`}</h4>
                                  <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-300 font-medium px-2.5 py-1">
                                    {variant.target_percentage}%
                                  </Badge>
                                </div>
                                
                                {variant.description && (
                                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{variant.description}</p>
                                )}

                                {/* Object Variants for this Experience Variant */}
                                <div className="space-y-2.5">
                                  {objects
                                    .filter((obj: any) => selectedObjects.includes(obj.pid))
                                    .map((obj: any, objIndex: number) => {
                                      const featureVariant = variant.feature_variants[obj.pid];
                                      const configKey = `${variantIndex}-${obj.pid}`;
                                      const isExpanded = expandedConfigs[configKey] || false;
                                      
                                      const toggleExpanded = () => {
                                        setExpandedConfigs(prev => ({
                                          ...prev,
                                          [configKey]: !prev[configKey]
                                        }));
                                      };

                                      return (
                                        <div key={obj.pid} className="bg-white/80 dark:bg-gray-700/80 rounded-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
                                          <div 
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white dark:hover:bg-gray-700/90 transition-all duration-150"
                                            onClick={toggleExpanded}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-foreground truncate">{obj.feature_flag?.name}</span>
                                                  <span className="text-xs text-muted-foreground">→</span>
                                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">{featureVariant?.name || 'Default'}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                          </div>
                                          {isExpanded && featureVariant?.config && Object.keys(featureVariant.config).length > 0 && (
                                            <div className="px-3 pb-3 border-t border-gray-200/50 dark:border-gray-600/50 bg-gray-50/50 dark:bg-gray-800/50">
                                              <div className="pt-3 space-y-2">
                                                {Object.entries(featureVariant.config).map(([key, value]) => (
                                                  <div key={key} className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{key}</span>
                                                    <code className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs text-foreground font-mono border border-gray-200 dark:border-gray-600">
                                                      {String(value)}
                                                    </code>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audience Card */}
                  <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        Audience Targeting
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">Rollout Percentage</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Percentage</span>
                              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formData.rollout_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${formData.rollout_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-semibold text-purple-900 dark:text-purple-100">Targeting Rules</h3>
                          </div>
                          {formData.rule_config.conditions.length === 0 ? (
                            <div className="text-center py-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <p className="text-sm text-muted-foreground">No targeting conditions</p>
                              <p className="text-xs text-muted-foreground mt-1">All users will be eligible</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {formData.rule_config.conditions.map((condition, index) => (
                                <div key={index} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">{condition.field}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{condition.operator}</span>
                                      <span className="font-medium text-foreground">{condition.value}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Metrics Card */}
                  <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-white/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                          <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        Selected Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formData.selected_metrics.length === 0 ? (
                        <div className="text-center py-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-sm text-muted-foreground">No metrics selected</p>
                          <p className="text-xs text-muted-foreground mt-1">You can track performance by adding metrics in step 4</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {metrics
                            .filter((metric: any) => formData.selected_metrics.includes(metric.pid))
                            .map((metric: any) => (
                              <div key={metric.pid} className="group relative bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-4 hover:shadow-md hover:border-emerald-300/50 dark:hover:border-emerald-600/50 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                      <BarChart3 className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-foreground truncate">{metric.name}</p>
                                      <Badge variant="secondary" className="mt-1 text-xs bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-300">
                                        {metric.type || 'Metric'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`/metrics/builder?id=${metric.pid}`, '_blank')}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex-shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="flex items-center space-x-3">
            {currentStep === 1 && (
              <Button
                type="button"
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white font-bold shadow-2xl hover:shadow-violet-500/25 transition-all duration-500 transform hover:scale-[1.05] active:scale-[1] overflow-hidden border border-violet-400/30"
                onClick={handleOpenAIModal}
                disabled={isLoadingAI}
                style={{
                  boxShadow: '0 20px 40px -12px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Animated orb background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                  <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-pink-300/20 rounded-full blur-lg animate-pulse animation-delay-300"></div>
                </div>
                
                {/* Premium shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 blur-sm"></div>
                
                {/* Magic sparkle trail */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full animate-ping animation-delay-100"></div>
                  <div className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping animation-delay-500"></div>
                  <div className="absolute top-1/2 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-ping animation-delay-700"></div>
                </div>
                
                <div className="relative flex items-center gap-3">
                  <div className="relative">
                  <Sparkles className="w-6 h-6 text-yellow-500 group-hover:animate-pulse transition-all duration-700 drop-shadow-sm" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full blur opacity-0 group-hover:opacity-30 group-hover:animate-pulse transition-all duration-300"></div>
                  </div>
                  <span className="text-base font-bold tracking-wide drop-shadow-sm">
                    Get AI Suggestion
                  </span>
                </div>
              </Button>
            )}
            {(currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) && (
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/20 hover:bg-white/90 dark:hover:bg-gray-700/90"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Link href="/personalisations">
              <Button variant="ghost" className="hover:bg-white/50 dark:hover:bg-gray-800/50 backdrop-blur-sm">
                Cancel
              </Button>
            </Link>
            
            {currentStep === 1 ? (
              <Button 
                onClick={handleNext}
                disabled={!validateStep1()}
                className="bg-gradient-to-r from-primary via-primary to-blue-600 hover:from-primary/90 hover:via-primary/90 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : currentStep === 2 ? (
              <Button 
                onClick={handleNext}
                disabled={!validateStep2()}
                className="bg-gradient-to-r from-primary via-primary to-blue-600 hover:from-primary/90 hover:via-primary/90 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : currentStep === 3 ? (
              <Button 
                onClick={handleNext}
                disabled={!validateStep3()}
                className="bg-gradient-to-r from-primary via-primary to-blue-600 hover:from-primary/90 hover:via-primary/90 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : currentStep === 4 ? (
              <Button 
                onClick={handleNext}
                disabled={!validateStep4()}
                className="bg-gradient-to-r from-primary via-primary to-blue-600 hover:from-primary/90 hover:via-primary/90 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !validateStep5()}
                className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 hover:from-green-700 hover:via-teal-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[140px] group"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    {isEditMode ? 'Complete Edit' : 'Create Magic'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestion Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-lg">
          {aiModalStep === 'prompt' ? (
            <>
              <DialogHeader>
                <DialogTitle>Describe your personalisation</DialogTitle>
                <DialogDescription>
                  Tell the AI what you want to personalize, for whom, and how. The more details you provide, the better the suggestion!
                </DialogDescription>
              </DialogHeader>
              <textarea
                className="w-full mt-4 p-3 rounded-lg border border-muted bg-background text-foreground min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={aiPrompt}
                onChange={e => setAIPrompt(e.target.value)}
                placeholder="e.g. Personalize onboarding for new players with a fun tutorial and rewards"
                rows={4}
                autoFocus
              />
              <DialogFooter className="mt-4">
                <Button
                  onClick={async () => {
                    setAIModalStep('loading');
                    setIsLoadingAI(true);
                    try {
                      const response = await apiRequest('POST', '/api/recommendations/get-ai-recommendations', { userPrompt: aiPrompt });
                      if (!response.ok) throw new Error('Failed to fetch AI recommendation');
                      const data = await response.json();
                      // Find experience by name
                      const exp = experiences.find((e: any) => e.name === data.experience_name);
                      if (!exp) throw new Error('Experience not found');
                      // Fetch objects for this experience if not already loaded
                      let expObjects: any[] = [];
                      if (exp.pid === formData.experienceId && objects.length > 0) {
                        expObjects = objects;
                      } else {
                        const objectsResp = await apiRequest('GET', `/api/experiences/${exp.pid}/objects`);
                        expObjects = objectsResp.ok ? await objectsResp.json() : [];
                      }
                      // Map feature_name to object pid
                      const selectedObjectPids = data.experience_variant.feature_variants
                        .map((fv: any) => {
                          const obj = expObjects.find((o: any) => o.feature_flag?.name === fv.feature_name);
                          return obj?.pid;
                        })
                        .filter(Boolean);
                      // Build createdVariants
                      const featureVariants: Record<string, { name: string; config: any; pid?: string }> = {};
                      data.experience_variant.feature_variants.forEach((fv: any) => {
                        const obj = expObjects.find((o: any) => o.feature_flag?.name === fv.feature_name);
                        if (obj) {
                          featureVariants[obj.pid] = {
                            name: fv.variant_name,
                            config: fv.config,
                          };
                        }
                      });
                      setFormData((prev) => ({
                        ...prev,
                        name: data.name,
                        description: data.description,
                        experienceId: exp.pid,
                        rule_config: data.rule_config,
                      }));
                      setSelectedExperience(exp);
                      setSelectedObjects(selectedObjectPids);
                      setCreatedVariants([
                        {
                          name: data.experience_variant.name,
                          description: data.experience_variant.description,
                          is_default: false,
                          target_percentage: 100,
                          feature_variants: featureVariants
                        },
                      ]);
                      setShowAIModal(false);
                      setAIModalStep('prompt');
                      setShowObjectsPanel(true);
                    } catch (err: any) {
                      alert(err.message || 'Failed to get AI suggestion');
                      setAIModalStep('prompt');
                    } finally {
                      setIsLoadingAI(false);
                    }
                  }}
                  disabled={!aiPrompt.trim() || isLoadingAI}
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 animate-spin-slow">
                <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />
              </div>
              <div className="text-lg font-semibold text-center">AI is thinking...<br />Generating your magical personalisation</div>
              <div className="mt-4 animate-pulse text-muted-foreground">This may take a few seconds</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ConsoleLayout>
  );
}