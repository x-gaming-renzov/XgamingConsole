import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  Sliders,
  Users,
  Target,
  X,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  Wine,
  Beaker,
  Zap,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";
import { FlagVariant } from "server/types";

const experienceSchema = z.object({
  name: z.string().min(1, "Experience name is required"),
  description: z.string().optional(),
  selectedObjects: z
    .array(z.string())
    .min(1, "Please select at least one object"),
  objectVariants: z.record(
    z.object({
      variants: z
        .array(
          z.object({
            name: z.string(),
            values: z.record(z.any()),
          })
        )
        .min(1, "At least 1 variant required"),
    })
  ),
  trafficSplit: z.number().min(0).max(100),
  campaignType: z.enum(["existing", "new"]),
  campaignId: z.string().optional(),
  newCampaign: z
    .object({
      name: z.string(),
      utmSource: z.string(),
      dailyTraffic: z.number(),
    })
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRollout: z
    .object({
      enabled: z.boolean(),
      upliftThreshold: z.number(),
      minUsers: z.number(),
    })
    .optional(),
});

type ExperienceForm = z.infer<typeof experienceSchema>;

interface GameObject {
  id: string;
  name: string;
  type: "Level" | "Popup" | "Param";
  flags: Array<{
    key: string;
    type: "text" | "number" | "boolean";
    defaultValue: any;
    description: string;
  }>;
}

interface Campaign {
  id: string;
  name: string;
  utmSource: string;
  traffic: number;
}

interface ObjectVariants {
  [objectId: string]: {
    name: string;
    values: Record<string, any>;
  };
}

export default function ExperienceWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objectVariants, setObjectVariants] = useState<ObjectVariants>({});
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [campaignType, setCampaignType] = useState<"existing" | "new">(
    "existing"
  );
  const [campaignId, setCampaignId] = useState<string>("");
  const [experienceName, setExperienceName] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [variantSelectionMode, setVariantSelectionMode] = useState<{
    [objectId: string]: "existing" | "new";
  }>({});
  const [availableVariants, setAvailableVariants] = useState<{
    [objectId: string]: FlagVariant[];
  }>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRollout, setAutoRollout] = useState({
    enabled: false,
    upliftThreshold: 5,
    minUsers: 1000,
  });
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    utmSource: "",
    dailyTraffic: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignSearchQuery, setCampaignSearchQuery] = useState("");

  // Step 4: Target Audience & Traffic Split states
  const [targetAudience, setTargetAudience] = useState<"all" | "segments">(
    "all"
  );
  const [selectedSegments, setSelectedSegments] = useState<
    Array<{
      id: string;
      name: string;
      split: number;
      estimatedUsers: number;
    }>
  >([]);
  const [segmentSearchQuery, setSegmentSearchQuery] = useState("");

  // Check for AI analysis data in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisParam = urlParams.get("analysis");

    if (analysisParam) {
      try {
        const analysis = JSON.parse(decodeURIComponent(analysisParam));

        // Log the analysis data received from OpenAI
        console.log("Experience Wizard received analysis:", analysis);

        // Prefill form with AI analysis data
        setExperienceName(analysis.name || "");
        setExperienceDescription(analysis.description || "");

        // Store suggested object names for mapping when objects are loaded
        if (analysis.suggestedObjects && analysis.suggestedObjects.length > 0) {
          // Store suggested object names to map them when objects are fetched
          sessionStorage.setItem(
            "aiSuggestedObjects",
            JSON.stringify(analysis.suggestedObjects)
          );
        }

        // Set campaign information
        if (analysis.campaign) {
          setNewCampaign({
            name: analysis.campaign.name || "",
            utmSource: analysis.campaign.utmSource || "",
            dailyTraffic: 1000, // Default value
          });
          setCampaignType("new");
        }

        // Set target audience based on analysis
        if (analysis.targetAudience && analysis.targetAudience.segments) {
          setTargetAudience("segments");
          // Note: AI analysis segment prefill is disabled since we need actual segment PIDs
          // The user will need to manually select segments from the available ones
        }

        // Store variant data for later use when objects are loaded
        if (analysis.objectVariants) {
          sessionStorage.setItem(
            "aiObjectVariants",
            JSON.stringify(analysis.objectVariants)
          );
        }

        // Remove analysis parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      } catch (error) {
        console.error("Failed to parse analysis data:", error);
      }
    }
  }, []);

  const form = useForm<ExperienceForm>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      selectedObjects: [],
      objectVariants: {},
      trafficSplit: 50,
      campaignType: "existing",
      autoRollout: {
        enabled: false,
        upliftThreshold: 5,
        minUsers: 1000,
      },
    },
  });

  // Fetch objects from API
  const { data: objectsData = [] } = useQuery<any[]>({
    queryKey: ["/api/objects"],
  });

  const objects: GameObject[] = useMemo(
    () =>
      objectsData.map((obj: any) => ({
        id: obj.id.toString(),
        name: obj.name,
        type: obj.type as "Level" | "Popup" | "Param",
        flags: Array.isArray(obj.flags) ? obj.flags : [],
      })),
    [objectsData]
  );

  // Handle AI suggested objects mapping when objects are loaded
  useEffect(() => {
    const aiSuggestedObjectsStr = sessionStorage.getItem("aiSuggestedObjects");
    if (aiSuggestedObjectsStr && objects.length > 0) {
      try {
        const suggestedObjectNames: string[] = JSON.parse(
          aiSuggestedObjectsStr
        );

        // Map object names to IDs
        const mappedIds = suggestedObjectNames
          .map((name) => objects.find((obj) => obj.name === name)?.id)
          .filter(Boolean) as string[];

        if (mappedIds.length > 0) {
          setSelectedObjects(mappedIds);

          // Get AI-suggested variant values
          const aiObjectVariantsStr =
            sessionStorage.getItem("aiObjectVariants");
          let aiObjectVariants: Record<string, any> = {};
          if (aiObjectVariantsStr) {
            try {
              aiObjectVariants = JSON.parse(aiObjectVariantsStr);
            } catch (error) {
              console.error("Failed to parse AI object variants:", error);
            }
          }

          // Create variants for selected objects using AI suggestions or defaults
          const variants: ObjectVariants = {};
          mappedIds.forEach((objId) => {
            const obj = objects.find((o) => o.id === objId);
            const objName = obj?.name;
            const aiVariants = objName
              ? (aiObjectVariants as any)[objName]
              : null;

            if (aiVariants && aiVariants.treatment) {
              // Use AI-suggested variant values
              variants[objId] = {
                name: "Treatment",
                values: aiVariants.treatment,
              };
            } else {
              // Fallback to default values based on object flags
              const treatmentValues: Record<string, any> = {};

              if (obj?.flags) {
                obj.flags.forEach((flag) => {
                  // For treatment, modify the value based on flag type
                  if (flag.type === "boolean") {
                    treatmentValues[flag.key] = !flag.defaultValue;
                  } else if (flag.type === "number") {
                    treatmentValues[flag.key] = flag.defaultValue * 2; // Double the value
                  } else {
                    treatmentValues[flag.key] = flag.defaultValue;
                  }
                });
              } else {
                // Default fallback
                treatmentValues.enabled = true;
              }

              variants[objId] = {
                name: "Treatment",
                values: treatmentValues,
              };
            }
          });
          setObjectVariants(variants);
        }

        // Clear the session storage
        sessionStorage.removeItem("aiSuggestedObjects");
        sessionStorage.removeItem("aiObjectVariants");
      } catch (error) {
        console.error("Failed to parse AI suggested objects:", error);
        sessionStorage.removeItem("aiSuggestedObjects");
      }
    }
  }, [objects]);

  // Fetch campaigns from API
  const { data: campaignsData = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  const campaigns: Campaign[] = useMemo(
    () =>
      campaignsData.map((camp: any) => ({
        id: camp.id.toString(),
        name: camp.name,
        utmSource: camp.utmSource,
        traffic: camp.installs || 0,
      })),
    [campaignsData]
  );

  // Create experience mutation
  const createExperience = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/experiences", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      setLocation("/experiences");
    },
    onError: (error) => {
      console.error("Failed to create experience:", error);
    },
  });

  // Fetch segments from backend
  const { data: segmentsData = [] } = useQuery<any[]>({
    queryKey: ["/api/segments"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/segments?organisation_id=test-org&app_id=test-app"
      );
      return await response.json();
    },
  });

  const availableSegments = segmentsData.map((segment: any) => ({
    id: segment.id,
    name: segment.name,
    estimatedUsers: Math.floor(Math.random() * 10000) + 1000, // Mock estimated users for now
    description: segment.description || "No description",
  }));

  const steps = [
    {
      number: 1,
      title: "Select Objects",
      description: "Choose objects to personalize",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      number: 2,
      title: "Configure Variants",
      description: "Define versions for each object",
      icon: <Beaker className="w-4 h-4" />,
    },
    {
      number: 3,
      title: "Select Campaign",
      description: "Choose campaign and timing",
      icon: <Target className="w-4 h-4" />,
    },
    {
      number: 4,
      title: "Target & Split",
      description: "Set audience and split percentage",
      icon: <Users className="w-4 h-4" />,
    },
    {
      number: 5,
      title: "Review & Launch",
      description: "Final review and deployment",
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Level":
        return <Layers className="w-4 h-4" />;
      case "Popup":
        return <FileText className="w-4 h-4" />;
      case "Param":
        return <Sliders className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  // Removed createVariant mutation - variants are now created by backend

  useEffect(() => {
    const fetchVariantsForObjects = async () => {
      const variantsPromises = selectedObjects.map(async (objectId) => {
        console.log("fetch objectId", objectId);
        if (availableVariants[objectId])
          return { objectId, variants: availableVariants[objectId] };

        try {
          const response = await apiRequest(
            "GET",
            `/api/objects/${objectId}/variants`
          );
          const variants = await response.json();
          return { objectId, variants };
        } catch (error) {
          console.error(
            `Failed to fetch variants for object ${objectId}:`,
            error
          );
          return { objectId, variants: [] };
        }
      });

      const variantsResults = await Promise.all(variantsPromises);
      const variantsMap: { [objectId: string]: FlagVariant[] } = {};

      variantsResults.forEach(({ objectId, variants }) => {
        variantsMap[objectId] = variants;
      });

      setAvailableVariants(variantsMap);
    };

    if (selectedObjects.length > 0) {
      fetchVariantsForObjects();
    }
  }, [selectedObjects]);

  const handleObjectSelect = (objectId: string, checked: boolean) => {
    if (checked && !selectedObjects.includes(objectId)) {
      // Add object
      const newSelectedObjects = [...selectedObjects, objectId];
      const object = objects.find((o) => o.id === objectId);

      if (object) {
        const defaultValues: Record<string, any> = {};
        object.flags.forEach((flag) => {
          defaultValues[flag.key] = flag.defaultValue;
        });

        const newObjectVariants = {
          ...objectVariants,
          [objectId]: {
            name: "New Variant",
            values: defaultValues,
          },
        };

        setSelectedObjects(newSelectedObjects);
        setObjectVariants(newObjectVariants);
      }
    } else if (!checked && selectedObjects.includes(objectId)) {
      // Remove object
      const newSelectedObjects = selectedObjects.filter(
        (id) => id !== objectId
      );
      const newObjectVariants = { ...objectVariants };
      delete newObjectVariants[objectId];

      setSelectedObjects(newSelectedObjects);
      setObjectVariants(newObjectVariants);
    }
  };

  const updateVariantValue = (
    objectId: string,
    flagKey: string,
    value: any
  ) => {
    if (objectVariants[objectId]) {
      const newObjectVariants = {
        ...objectVariants,
        [objectId]: {
          ...objectVariants[objectId],
          values: {
            ...objectVariants[objectId].values,
            [flagKey]: value,
          },
        },
      };

      setObjectVariants(newObjectVariants);
    }
  };

  const getTotalCombinations = () => {
    // Since we only have one variant per object now, total is always 1
    return selectedObjects.length > 0 ? 1 : 0;
  };

  // Segment helper functions
  const addSegment = (segment: {
    id: string;
    name: string;
    estimatedUsers: number;
  }) => {
    const newSegment = {
      id: segment.id,
      name: segment.name,
      split: 50,
      estimatedUsers: segment.estimatedUsers,
    };
    setSelectedSegments([...selectedSegments, newSegment]);
  };
  console.log("segments", segmentsData);

  const removeSegment = (segmentId: string) => {
    setSelectedSegments(selectedSegments.filter((s) => s.id !== segmentId));
  };

  const updateSegmentSplit = (segmentId: string, split: number) => {
    setSelectedSegments(
      selectedSegments.map((s) => (s.id === segmentId ? { ...s, split } : s))
    );
  };

  const copySegmentSplit = (baseSplit: number) => {
    setSelectedSegments(
      selectedSegments.map((s) => ({ ...s, split: baseSplit }))
    );
  };

  const equalizeSegmentSplits = () => {
    setSelectedSegments(selectedSegments.map((s) => ({ ...s, split: 50 })));
  };

  const filteredSegments = availableSegments.filter(
    (segment) =>
      !selectedSegments.some((s) => s.id === segment.id) &&
      segment.name.toLowerCase().includes(segmentSearchQuery.toLowerCase())
  );

  const filteredObjects = objects.filter(
    (object) =>
      object.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      object.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      object.flags.some(
        (flag) =>
          flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          flag.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
      campaign.utmSource
        .toLowerCase()
        .includes(campaignSearchQuery.toLowerCase())
  );

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedObjects.length > 0;
      case 2:
        return selectedObjects.every((objId) => {
          const variant = objectVariants[objId];
          return variant && variant.name.trim().length > 0;
        });
      case 3:
        return campaignType === "new" || campaignId;
      case 4:
        if (targetAudience === "all") {
          return true; // Global traffic split is always valid
        } else {
          // Segments mode: need at least one segment with valid splits
          return (
            selectedSegments.length > 0 &&
            selectedSegments.every((s) => s.split >= 0 && s.split <= 100)
          );
        }
      case 5:
        return experienceName.length > 0;
      default:
        return false;
    }
  };

  const saveDraft = () => {
    const draftData = {
      name: experienceName || `Draft ${new Date().toLocaleDateString()}`,
      description: experienceDescription || "Experience draft",
      priority: null,
      status: "draft" as const,
      
      // Transform object variants to the expected format
      objectVariants: Object.keys(objectVariants).reduce((acc, objectId) => {
        const variant = objectVariants[objectId];
        acc[objectId] = {
          name: variant.name,
          values: variant.values
        };
        return acc;
      }, {} as Record<string, { name: string; values: Record<string, any> }>),

      // Transform segments for the API
      selectedSegments: selectedSegments.map((segment) => ({
        segment_id: segment.id,
        name: segment.name,
        target_percentage: segment.split,
        estimated_users: segment.estimatedUsers,
      })),

      // Campaign handling
      campaignId: campaignType === "existing" ? campaignId : null,
      newCampaign:
        campaignType === "new"
          ? {
              name: newCampaign.name,
              description: `Campaign for ${experienceName || 'Draft'}`,
              ruleConfig: {
                conditions: [
                  {
                    field: "utm_source",
                    operator: "equals",
                    value: newCampaign.utmSource,
                  },
                ],
                operator: "AND",
              },
              launchedAt: null,
            }
          : null,

      // Target percentage for this experience in the campaign
      targetPercentage: targetAudience === "all" ? trafficSplit : 100,
    };
    console.log("Saving draft...", draftData);
    createExperience.mutate(draftData);
  };

  const onSubmit = async () => {
    try {
      // Prepare data for API
      const data = {
        name: experienceName,
        description: experienceDescription,
        priority: null, // Let system auto-assign
        status: "active" as const,
        
        // Transform object variants to the expected format
        objectVariants: Object.keys(objectVariants).reduce((acc, objectId) => {
          const variant = objectVariants[objectId];
          acc[objectId] = {
            name: variant.name,
            values: variant.values
          };
          return acc;
        }, {} as Record<string, { name: string; values: Record<string, any> }>),

        // Transform segments for the API
        selectedSegments: selectedSegments.map((segment) => ({
          segment_id: segment.id,
          name: segment.name,
          target_percentage: segment.split,
          estimated_users: segment.estimatedUsers,
        })),

        // Campaign handling
        campaignId: campaignType === "existing" ? campaignId : null,
        newCampaign:
          campaignType === "new"
            ? {
                name: newCampaign.name,
                description: `Campaign for ${experienceName}`,
                ruleConfig: {
                  conditions: [
                    {
                      field: "utm_source",
                      operator: "equals",
                      value: newCampaign.utmSource,
                    },
                  ],
                  operator: "AND",
                },
                launchedAt: null, // Let system set current time
              }
            : null,

        // Target percentage for this experience in the campaign
        targetPercentage: targetAudience === "all" ? trafficSplit : 100,
      };
      
      console.log("Creating experience:", data);
      createExperience.mutate(data);
    } catch (error) {
      console.error("Failed to create experience:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">
                Create Experience
              </h1>
              <p className="text-muted-foreground">
                Create a personalized FTUE experience
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/experiences")}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Experiences
            </Button>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <Progress value={(currentStep / 5) * 100} className="h-2" />
            <div className="flex justify-between mt-4">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep >= step.number
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep >= step.number ? step.icon : step.number}
                  </div>
                  <div className="text-center mt-2 max-w-20">
                    <div className="font-medium text-xs">{step.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {/* Step 1: Select Objects */}
            {currentStep === 1 && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-heading">
                        Select Objects to Personalize
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choose multiple objects to compose your experience
                      </p>
                    </CardHeader>
                    <CardContent>
                      {/* Search Bar */}
                      <div className="mb-6">
                        <div className="relative">
                          <Input
                            placeholder="Search objects by name, type, or flags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                              className="w-4 h-4 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                          {searchQuery && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute inset-y-0 right-0 pr-3 h-full"
                              onClick={() => setSearchQuery("")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {searchQuery && (
                            <p className="text-xs text-muted-foreground">
                              Found {filteredObjects.length} object
                              {filteredObjects.length === 1 ? "" : "s"}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground ml-auto">
                            {selectedObjects.length} selected
                          </p>
                        </div>
                      </div>

                      {filteredObjects.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg
                              className="w-8 h-8 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium mb-2">
                            No objects found
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            No objects match your search "{searchQuery}". Try a
                            different search term.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery("")}
                          >
                            Clear search
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredObjects.map((object) => (
                            <div
                              key={object.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                                selectedObjects.includes(object.id)
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => {
                                const isCurrentlySelected =
                                  selectedObjects.includes(object.id);
                                handleObjectSelect(
                                  object.id,
                                  !isCurrentlySelected
                                );
                              }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    {getTypeIcon(object.type)}
                                  </div>
                                  <div>
                                    <h3 className="font-medium">
                                      {object.name}
                                    </h3>
                                    <Badge variant="outline" className="mt-1">
                                      {object.type}
                                    </Badge>
                                  </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedObjects.includes(
                                      object.id
                                    )}
                                    onCheckedChange={(checked) =>
                                      handleObjectSelect(
                                        object.id,
                                        checked === true
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {object.flags.length} flags available
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {object.flags
                                  .slice(0, 3)
                                  .map((flag) => flag.key)
                                  .join(", ")}
                                {object.flags.length > 3 && "..."}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sticky sidebar */}
                <div className="w-64 sticky top-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">
                        Selected Objects ({selectedObjects.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedObjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No objects selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedObjects.map((objectId) => {
                            const object = objects.find(
                              (o) => o.id === objectId
                            );
                            return (
                              <div
                                key={objectId}
                                className="flex items-center justify-between p-2 bg-accent/50 rounded-lg"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                                    {getTypeIcon(object?.type || "Level")}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {object?.name}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleObjectSelect(objectId, false)
                                  }
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 2: Configure Variants */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    Configure Variants
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Create a single variant for each selected object
                  </p>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {selectedObjects.map((objectId, index) => {
                      const object = objects.find((o) => o.id === objectId);
                      const variant = objectVariants[objectId];

                      return (
                        <AccordionItem key={objectId} value={objectId}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                {getTypeIcon(object?.type || "Level")}
                              </div>
                              <div className="text-left">
                                <div className="font-medium">
                                  {object?.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Variant configuration
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-4">
                              {/* Variant Configuration */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">
                                    Variant Configuration
                                  </Label>
                                </div>

                                {variant && (
                                  <div className="border rounded-lg p-4 bg-accent/20">
                                    <div className="flex items-center justify-between mb-4">
                                      <div>
                                        <Input
                                          value={variant.name}
                                          onChange={(e) => {
                                            setObjectVariants((prev) => ({
                                              ...prev,
                                              [objectId]: {
                                                ...prev[objectId],
                                                name: e.target.value,
                                              },
                                            }));
                                          }}
                                          className="font-medium w-48"
                                          placeholder="Variant name"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {object?.flags.map((flag) => (
                                        <div key={flag.key}>
                                          <Label className="text-xs font-medium">
                                            {flag.key}
                                          </Label>
                                          <p className="text-xs text-muted-foreground mb-2">
                                            {flag.description}
                                          </p>
                                          {flag.type === "text" && (
                                            <Input
                                              value={
                                                variant.values[flag.key] ||
                                                flag.defaultValue
                                              }
                                              onChange={(e) =>
                                                updateVariantValue(
                                                  objectId,
                                                  flag.key,
                                                  e.target.value
                                                )
                                              }
                                              className="h-8"
                                            />
                                          )}
                                          {flag.type === "number" && (
                                            <Input
                                              type="number"
                                              value={
                                                variant.values[flag.key] ||
                                                flag.defaultValue
                                              }
                                              onChange={(e) =>
                                                updateVariantValue(
                                                  objectId,
                                                  flag.key,
                                                  parseFloat(e.target.value) ||
                                                    0
                                                )
                                              }
                                              className="h-8"
                                            />
                                          )}
                                          {flag.type === "boolean" && (
                                            <Select
                                              value={(
                                                variant.values[flag.key] ??
                                                flag.defaultValue
                                              ).toString()}
                                              onValueChange={(value) =>
                                                updateVariantValue(
                                                  objectId,
                                                  flag.key,
                                                  value === "true"
                                                )
                                              }
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="true">
                                                  True
                                                </SelectItem>
                                                <SelectItem value="false">
                                                  False
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Select Campaign */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    Select Campaign
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose your campaign and set release conditions
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <RadioGroup
                      value={campaignType}
                      onValueChange={(value) =>
                        setCampaignType(value as "existing" | "new")
                      }
                    >
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label htmlFor="existing">
                            Use existing campaign
                          </Label>
                        </div>

                        {campaignType === "existing" && (
                          <div className="ml-6 space-y-4">
                            {/* Search bar */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search campaigns..."
                                value={campaignSearchQuery}
                                onChange={(e) =>
                                  setCampaignSearchQuery(e.target.value)
                                }
                                className="pl-9"
                              />
                            </div>

                            {/* Campaign list */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {filteredCampaigns.map((campaign) => (
                                <div
                                  key={campaign.id}
                                  onClick={() => setCampaignId(campaign.id)}
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    campaignId === campaign.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">
                                        {campaign.name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {campaign.utmSource}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">
                                        {campaign.traffic.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        daily users
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {filteredCampaigns.length === 0 &&
                                campaignSearchQuery && (
                                  <div className="text-center py-4 text-muted-foreground">
                                    <p>
                                      No campaigns found matching "
                                      {campaignSearchQuery}"
                                    </p>
                                    <Button
                                      variant="outline"
                                      onClick={() => setCampaignSearchQuery("")}
                                      className="mt-2"
                                    >
                                      Clear search
                                    </Button>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new" />
                          <Label htmlFor="new">Create new campaign</Label>
                        </div>

                        {campaignType === "new" && (
                          <div className="ml-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="campaign-name">
                                  Campaign Name
                                </Label>
                                <Input
                                  id="campaign-name"
                                  placeholder="e.g., Summer Promotion"
                                  value={newCampaign.name}
                                  onChange={(e) =>
                                    setNewCampaign({
                                      ...newCampaign,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="utm-source">UTM Source</Label>
                                <Input
                                  id="utm-source"
                                  placeholder="e.g., facebook, google"
                                  value={newCampaign.utmSource}
                                  onChange={(e) =>
                                    setNewCampaign({
                                      ...newCampaign,
                                      utmSource: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="daily-traffic">
                                Expected Daily Traffic
                              </Label>
                              <Input
                                id="daily-traffic"
                                type="number"
                                placeholder="1000"
                                value={newCampaign.dailyTraffic || ""}
                                onChange={(e) =>
                                  setNewCampaign({
                                    ...newCampaign,
                                    dailyTraffic: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Target Audience & Traffic Split */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    Target Audience & Traffic Split
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose your audience and set experience percentages
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Target Audience Selection */}
                  <div>
                    <Label className="text-base font-medium mb-4 block">
                      Target Audience
                    </Label>
                    <RadioGroup
                      value={targetAudience}
                      onValueChange={(value: "all" | "segments") =>
                        setTargetAudience(value)
                      }
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="all" id="all-players" />
                        <Label
                          htmlFor="all-players"
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <span className="font-medium">
                            All players in campaign
                          </span>
                          <div className="group relative">
                            <svg
                              className="w-4 h-4 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <path d="M12 17h.01" />
                            </svg>
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-10">
                              Applies to every new player coming from this
                              campaign
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="segments"
                          id="specific-segments"
                        />
                        <Label
                          htmlFor="specific-segments"
                          className="font-medium cursor-pointer"
                        >
                          Specific segments
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* All Players Mode */}
                  {targetAudience === "all" && (
                    <div>
                      <Label className="text-base font-medium mb-4 block">
                        Traffic Split
                      </Label>
                      <div className="space-y-4">
                        <Slider
                          value={[trafficSplit]}
                          onValueChange={(value) => setTrafficSplit(value[0])}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{100 - trafficSplit}% (Control)</span>
                          <span className="font-medium text-foreground">
                            {trafficSplit}% Experience
                          </span>
                          <span>100% (Full Experience)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specific Segments Mode */}
                  {targetAudience === "segments" && (
                    <div className="space-y-4">
                      {/* Add Segment Dropdown */}
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          Selected Segments
                        </Label>
                        <Select
                          value=""
                          onValueChange={(segmentId) => {
                            const segment = availableSegments.find(
                              (s) => s.id === segmentId
                            );
                            if (segment) {
                              addSegment(segment);
                              setSegmentSearchQuery("");
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add Segment ⌄" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Search saved segments..."
                                value={segmentSearchQuery}
                                onChange={(e) =>
                                  setSegmentSearchQuery(e.target.value)
                                }
                                className="mb-2"
                              />
                            </div>
                            {filteredSegments.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                {segmentSearchQuery
                                  ? "No segments found"
                                  : "No more segments available"}
                              </div>
                            ) : (
                              filteredSegments.map((segment) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {segment.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ≈{" "}
                                      {(segment.estimatedUsers / 1000).toFixed(
                                        1
                                      )}
                                      k users
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Segments Table */}
                      {selectedSegments.length === 0 ? (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Add at least one segment or switch back to 'All
                            players'.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="border rounded-lg">
                          <div className="grid grid-cols-12 gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
                            <div className="col-span-6">Segment</div>
                            <div className="col-span-3">Experience %</div>
                            <div className="col-span-2">Users</div>
                            <div className="col-span-1"></div>
                          </div>
                          {selectedSegments.map((segment) => (
                            <div
                              key={segment.id}
                              className="grid grid-cols-12 gap-4 p-3 items-center border-b last:border-b-0"
                            >
                              <div className="col-span-6">
                                <div className="font-medium">
                                  {segment.name}
                                </div>
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={segment.split}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    if (value >= 0 && value <= 100) {
                                      updateSegmentSplit(segment.id, value);
                                    }
                                  }}
                                  className={`w-16 text-center ${
                                    segment.split < 0 || segment.split > 100
                                      ? "border-destructive"
                                      : ""
                                  }`}
                                />
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground">
                                ≈ {(segment.estimatedUsers / 1000).toFixed(1)}k
                                {segment.estimatedUsers < 100 && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-1 bg-yellow-100 text-yellow-800 text-xs"
                                  >
                                    Low traffic
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSegment(segment.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Helper Buttons */}
                      {selectedSegments.length > 0 && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const firstSplit =
                                selectedSegments[0]?.split || 50;
                              copySegmentSplit(firstSplit);
                            }}
                            className="text-xs"
                          >
                            Copy split ⟲
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={equalizeSegmentSplits}
                            className="text-xs"
                          >
                            Equalize ◒
                          </Button>
                        </div>
                      )}

                      {selectedSegments.length > 0 && (
                        <div className="text-xs text-muted-foreground italic">
                          Experience will be shown to selected % of each
                          segment; others stay in Control.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review & Launch */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    Review & Launch
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Final review before deployment
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">
                      Experience Name
                    </Label>
                    <Input
                      placeholder="e.g., Enhanced Onboarding Experience"
                      value={experienceName}
                      onChange={(e) => setExperienceName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-4 block">
                      Description (Optional)
                    </Label>
                    <Textarea
                      placeholder="Describe this experience..."
                      value={experienceDescription}
                      onChange={(e) => setExperienceDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Selected Objects</h4>
                      <div className="space-y-2">
                        {selectedObjects.map((objectId) => {
                          const object = objects.find((o) => o.id === objectId);
                          const variant = objectVariants[objectId];
                          return (
                            <div
                              key={objectId}
                              className="flex items-center justify-between p-2 bg-accent/30 rounded"
                            >
                              <span className="text-sm">{object?.name}</span>
                              <Badge variant="outline">
                                {variant ? "1 variant" : "No variant"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Traffic Split:</span>
                          <span className="font-medium">
                            {trafficSplit}% experience
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Combinations:</span>
                          <span className="font-medium">
                            {getTotalCombinations()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Campaign:</span>
                          <span className="font-medium">
                            {campaignType === "existing"
                              ? campaigns.find((c) => c.id === campaignId)
                                  ?.name || "Select campaign"
                              : "New campaign"}
                          </span>
                        </div>
                        {autoRollout.enabled && (
                          <div className="flex justify-between">
                            <span>Auto-rollout:</span>
                            <span className="font-medium">
                              {autoRollout.upliftThreshold}% @{" "}
                              {autoRollout.minUsers} users
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-accent/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Deployment Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      You're about to deploy this experience to{" "}
                      <span className="font-medium text-foreground">
                        {campaignType === "existing"
                          ? campaigns.find((c) => c.id === campaignId)?.name ||
                            "selected campaign"
                          : "new campaign"}
                      </span>{" "}
                      with a{" "}
                      <span className="font-medium text-foreground">
                        {trafficSplit}% split
                      </span>
                      {startDate && (
                        <span>
                          {" "}
                          starting{" "}
                          <span className="font-medium text-foreground">
                            {new Date(startDate).toLocaleDateString()}
                          </span>
                        </span>
                      )}
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-3">
                {currentStep === 5 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => console.log("Saving draft...")}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      disabled={!canProceed() || createExperience.isPending}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {createExperience.isPending
                        ? "Launching..."
                        : "Launch Experience"}
                    </Button>
                  </>
                ) : currentStep === 2 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={selectedObjects.length === 0}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed()}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
