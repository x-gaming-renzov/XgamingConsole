import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  Zap
} from "lucide-react";
import { useLocation } from "wouter";

const experienceSchema = z.object({
  name: z.string().min(1, "Experience name is required"),
  description: z.string().optional(),
  selectedObjects: z.array(z.string()).min(1, "Please select at least one object"),
  objectVariants: z.record(z.object({
    variants: z.array(z.object({
      name: z.string(),
      values: z.record(z.any())
    })).min(1, "At least 1 variant required")
  })),
  trafficSplit: z.number().min(0).max(100),
  campaignType: z.enum(["existing", "new"]),
  campaignId: z.string().optional(),
  newCampaign: z.object({
    name: z.string(),
    utmSource: z.string(),
    dailyTraffic: z.number()
  }).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRollout: z.object({
    enabled: z.boolean(),
    upliftThreshold: z.number(),
    minUsers: z.number()
  }).optional()
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
    variants: Array<{
      name: string;
      values: Record<string, any>;
    }>;
  };
}

export default function ExperienceWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objectVariants, setObjectVariants] = useState<ObjectVariants>({});
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [campaignType, setCampaignType] = useState<"existing" | "new">("existing");
  const [campaignId, setCampaignId] = useState<string>("");
  const [experienceName, setExperienceName] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRollout, setAutoRollout] = useState({
    enabled: false,
    upliftThreshold: 5,
    minUsers: 1000
  });
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    utmSource: "",
    dailyTraffic: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [saveMode, setSaveMode] = useState<"save" | "launch">("launch");
  
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
        minUsers: 1000
      }
    }
  });

  // Mock data for objects and campaigns
  const objects: GameObject[] = useMemo(() => [
    {
      id: "level_5_tutorial",
      name: "Level 5 Tutorial",
      type: "Level",
      flags: [
        { key: "starting_coins", type: "number", defaultValue: 100, description: "Initial coins given to player" },
        { key: "enemy_count", type: "number", defaultValue: 5, description: "Number of enemies in level" },
        { key: "time_limit", type: "number", defaultValue: 120, description: "Time limit in seconds" }
      ]
    },
    {
      id: "welcome_popup", 
      name: "Welcome Popup",
      type: "Popup",
      flags: [
        { key: "title_text", type: "text", defaultValue: "Welcome!", description: "Popup title" },
        { key: "button_text", type: "text", defaultValue: "Get Started", description: "CTA button text" },
        { key: "show_rewards", type: "boolean", defaultValue: true, description: "Show reward preview" }
      ]
    },
    {
      id: "onboarding_flow",
      name: "Onboarding Flow",
      type: "Param",
      flags: [
        { key: "skip_tutorial", type: "boolean", defaultValue: false, description: "Allow skipping tutorial" },
        { key: "tutorial_steps", type: "number", defaultValue: 7, description: "Number of tutorial steps" }
      ]
    },
    {
      id: "reward_system",
      name: "Reward System",
      type: "Param",
      flags: [
        { key: "daily_bonus", type: "number", defaultValue: 50, description: "Daily bonus coins" },
        { key: "streak_multiplier", type: "number", defaultValue: 1.5, description: "Streak bonus multiplier" }
      ]
    },
    {
      id: "ui_theme",
      name: "UI Theme",
      type: "Popup",
      flags: [
        { key: "theme_name", type: "text", defaultValue: "default", description: "Theme identifier" },
        { key: "use_animations", type: "boolean", defaultValue: true, description: "Enable UI animations" }
      ]
    }
  ], []);

  const campaigns: Campaign[] = [
    { id: "facebook_ads", name: "Facebook Campaign", utmSource: "facebook", traffic: 1250 },
    { id: "google_ads", name: "Google Ads", utmSource: "google", traffic: 850 },
    { id: "tiktok_ads", name: "TikTok Ads", utmSource: "tiktok", traffic: 420 },
    { id: "instagram_ads", name: "Instagram Ads", utmSource: "instagram", traffic: 680 }
  ];

  const steps = [
    { number: 1, title: "Select Objects", description: "Choose objects to personalize", icon: <Layers className="w-4 h-4" /> },
    { number: 2, title: "Configure Variants", description: "Define versions for each object", icon: <Beaker className="w-4 h-4" /> },
    { number: 3, title: "Traffic Split", description: "Set experience percentage", icon: <Sliders className="w-4 h-4" /> },
    { number: 4, title: "Target & Schedule", description: "Choose campaign and timing", icon: <Target className="w-4 h-4" /> },
    { number: 5, title: "Review & Launch", description: "Final review and deployment", icon: <Zap className="w-4 h-4" /> }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Level": return <Layers className="w-4 h-4" />;
      case "Popup": return <FileText className="w-4 h-4" />;
      case "Param": return <Sliders className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  const handleObjectSelect = (objectId: string, checked: boolean) => {
    if (checked && !selectedObjects.includes(objectId)) {
      // Add object
      const newSelectedObjects = [...selectedObjects, objectId];
      const object = objects.find(o => o.id === objectId);
      
      if (object) {
        const defaultValues: Record<string, any> = {};
        object.flags.forEach(flag => {
          defaultValues[flag.key] = flag.defaultValue;
        });
        
        const newObjectVariants = {
          ...objectVariants,
          [objectId]: {
            variants: [
              { name: "Control", values: defaultValues },
              { name: "Variant A", values: { ...defaultValues } }
            ]
          }
        };
        
        setSelectedObjects(newSelectedObjects);
        setObjectVariants(newObjectVariants);
      }
    } else if (!checked && selectedObjects.includes(objectId)) {
      // Remove object
      const newSelectedObjects = selectedObjects.filter(id => id !== objectId);
      const newObjectVariants = { ...objectVariants };
      delete newObjectVariants[objectId];
      
      setSelectedObjects(newSelectedObjects);
      setObjectVariants(newObjectVariants);
    }
  };

  const addVariant = (objectId: string) => {
    const object = objects.find(o => o.id === objectId);
    if (object && objectVariants[objectId]) {
      const defaultValues: Record<string, any> = {};
      object.flags.forEach(flag => {
        defaultValues[flag.key] = flag.defaultValue;
      });
      
      const existingVariants = objectVariants[objectId].variants;
      const nextLetter = String.fromCharCode(65 + existingVariants.length - 1);
      
      const newObjectVariants = {
        ...objectVariants,
        [objectId]: {
          variants: [
            ...existingVariants,
            { name: `Variant ${nextLetter}`, values: defaultValues }
          ]
        }
      };
      
      setObjectVariants(newObjectVariants);
    }
  };

  const removeVariant = (objectId: string, variantIndex: number) => {
    if (objectVariants[objectId] && objectVariants[objectId].variants.length > 1) {
      const newVariants = [...objectVariants[objectId].variants];
      newVariants.splice(variantIndex, 1);
      
      const newObjectVariants = {
        ...objectVariants,
        [objectId]: { variants: newVariants }
      };
      
      setObjectVariants(newObjectVariants);
    }
  };

  const updateVariantValue = (objectId: string, variantIndex: number, flagKey: string, value: any) => {
    if (objectVariants[objectId] && objectVariants[objectId].variants[variantIndex]) {
      const newVariants = [...objectVariants[objectId].variants];
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        values: {
          ...newVariants[variantIndex].values,
          [flagKey]: value
        }
      };
      
      const newObjectVariants = {
        ...objectVariants,
        [objectId]: { variants: newVariants }
      };
      
      setObjectVariants(newObjectVariants);
    }
  };

  const getTotalCombinations = () => {
    let total = 1;
    Object.values(objectVariants).forEach(objectVariant => {
      total *= objectVariant.variants.length;
    });
    return total;
  };

  const filteredObjects = objects.filter(object => 
    object.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    object.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    object.flags.some(flag => 
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const nextStep = () => {
    if (currentStep < 5) {
      // If on step 2 and user chose "Save", jump to step 5
      if (currentStep === 2 && saveMode === "save") {
        setCurrentStep(5);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedObjects.length > 0;
      case 2:
        return selectedObjects.every(objId => {
          const variants = objectVariants[objId];
          return variants && variants.variants.length > 0;
        });
      case 3:
        return getTotalCombinations() <= 8;
      case 4:
        return campaignType === "new" || campaignId;
      case 5:
        return experienceName.length > 0;
      default:
        return false;
    }
  };

  const onSubmit = () => {
    const data = {
      name: experienceName,
      description: experienceDescription,
      selectedObjects,
      objectVariants,
      trafficSplit,
      campaignType,
      campaignId,
      newCampaign,
      startDate,
      endDate,
      autoRollout
    };
    console.log("Creating experience:", data);
    setLocation("/experiences");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">Create Experience</h1>
              <p className="text-muted-foreground">Create a personalized FTUE experience</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/experiences")}>
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    currentStep >= step.number 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep >= step.number ? step.icon : step.number}
                  </div>
                  <div className="text-center mt-2 max-w-20">
                    <div className="font-medium text-xs">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
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
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            
            {/* Step 1: Select Objects */}
            {currentStep === 1 && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-heading">Select Objects to Personalize</CardTitle>
                      <p className="text-sm text-muted-foreground">Choose multiple objects to compose your experience</p>
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
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                              Found {filteredObjects.length} object{filteredObjects.length === 1 ? '' : 's'}
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
                            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium mb-2">No objects found</h3>
                          <p className="text-muted-foreground mb-4">
                            No objects match your search "{searchQuery}". Try a different search term.
                          </p>
                          <Button variant="outline" onClick={() => setSearchQuery("")}>
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
                                const isCurrentlySelected = selectedObjects.includes(object.id);
                                handleObjectSelect(object.id, !isCurrentlySelected);
                              }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    {getTypeIcon(object.type)}
                                  </div>
                                  <div>
                                    <h3 className="font-medium">{object.name}</h3>
                                    <Badge variant="outline" className="mt-1">{object.type}</Badge>
                                  </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedObjects.includes(object.id)}
                                    onCheckedChange={(checked) => handleObjectSelect(object.id, checked === true)}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {object.flags.length} flags available
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {object.flags.slice(0, 3).map(flag => flag.key).join(", ")}
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
                      <CardTitle className="text-lg font-heading">Selected Objects ({selectedObjects.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedObjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No objects selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedObjects.map((objectId) => {
                            const object = objects.find(o => o.id === objectId);
                            return (
                              <div key={objectId} className="flex items-center justify-between p-2 bg-accent/50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                                    {getTypeIcon(object?.type || "Level")}
                                  </div>
                                  <span className="text-sm font-medium">{object?.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleObjectSelect(objectId, false)}
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
                  <CardTitle className="font-heading">Configure Variants</CardTitle>
                  <p className="text-sm text-muted-foreground">Define different versions for each selected object</p>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {selectedObjects.map((objectId, index) => {
                      const object = objects.find(o => o.id === objectId);
                      const variants = objectVariants[objectId];
                      
                      return (
                        <AccordionItem key={objectId} value={objectId}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                {getTypeIcon(object?.type || "Level")}
                              </div>
                              <div className="text-left">
                                <div className="font-medium">{object?.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {variants?.variants.length || 0} variants
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-4">
                              {variants?.variants.map((variant, variantIndex) => (
                                <div key={variantIndex} className="border rounded-lg p-4 bg-accent/20">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium">{variant.name}</h4>
                                    <div className="flex items-center space-x-2">
                                      {variants.variants.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeVariant(objectId, variantIndex)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {object?.flags.map((flag) => (
                                      <div key={flag.key}>
                                        <Label className="text-xs font-medium">{flag.key}</Label>
                                        <p className="text-xs text-muted-foreground mb-2">{flag.description}</p>
                                        {flag.type === "text" && (
                                          <Input
                                            value={variant.values[flag.key] || flag.defaultValue}
                                            onChange={(e) => updateVariantValue(objectId, variantIndex, flag.key, e.target.value)}
                                            className="h-8"
                                          />
                                        )}
                                        {flag.type === "number" && (
                                          <Input
                                            type="number"
                                            value={variant.values[flag.key] || flag.defaultValue}
                                            onChange={(e) => updateVariantValue(objectId, variantIndex, flag.key, parseFloat(e.target.value) || 0)}
                                            className="h-8"
                                          />
                                        )}
                                        {flag.type === "boolean" && (
                                          <Select
                                            value={(variant.values[flag.key] ?? flag.defaultValue).toString()}
                                            onValueChange={(value) => updateVariantValue(objectId, variantIndex, flag.key, value === "true")}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="true">True</SelectItem>
                                              <SelectItem value="false">False</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              
                              {variants && variants.variants.length < 3 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addVariant(objectId)}
                                  className="w-full"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Variant
                                </Button>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Traffic Split */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Traffic Split</CardTitle>
                  <p className="text-sm text-muted-foreground">How many new players should experience the new version?</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Experience Traffic</Label>
                    <div className="space-y-4">
                      <Slider
                        value={[trafficSplit]}
                        onValueChange={(value) => setTrafficSplit(value[0])}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0% (Full Control)</span>
                        <span className="font-medium text-foreground">{trafficSplit}% Experience</span>
                        <span>100% (Full Experience)</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium mb-4 block">Total Combinations</Label>
                    <div className="bg-accent/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Total Combinations</span>
                        <Badge variant={getTotalCombinations() > 8 ? "destructive" : "default"}>
                          {getTotalCombinations()}
                        </Badge>
                      </div>
                      {getTotalCombinations() > 8 && (
                        <Alert className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Too many combinations ({getTotalCombinations()}). Please reduce variants or objects to 8 or fewer.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {selectedObjects.map(objectId => {
                          const object = objects.find(o => o.id === objectId);
                          const variants = objectVariants[objectId];
                          return (
                            <div key={objectId} className="flex justify-between">
                              <span>{object?.name}</span>
                              <span>{variants?.variants.length || 0} variants</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Target & Schedule */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Target & Schedule</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose your campaign and set release conditions</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Select Campaign</Label>
                    <RadioGroup
                      value={campaignType}
                      onValueChange={(value) => setCampaignType(value as "existing" | "new")}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label htmlFor="existing">Use existing campaign</Label>
                        </div>
                        
                        {campaignType === "existing" && (
                          <div className="ml-6 space-y-2">
                            {campaigns.map((campaign) => (
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
                                    <div className="font-medium">{campaign.name}</div>
                                    <div className="text-sm text-muted-foreground">{campaign.utmSource}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">{campaign.traffic.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground">daily users</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new" />
                          <Label htmlFor="new">Create new campaign</Label>
                        </div>
                        
                        {campaignType === "new" && (
                          <div className="ml-6 space-y-4 p-4 border rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="campaign-name">Campaign Name</Label>
                                <Input
                                  id="campaign-name"
                                  placeholder="e.g., Summer Launch"
                                  value={newCampaign.name}
                                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="utm-source">UTM Source</Label>
                                <Input
                                  id="utm-source"
                                  placeholder="e.g., facebook, google"
                                  value={newCampaign.utmSource}
                                  onChange={(e) => setNewCampaign({ ...newCampaign, utmSource: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="daily-traffic">Expected Daily Traffic</Label>
                              <Input
                                id="daily-traffic"
                                type="number"
                                placeholder="1000"
                                value={newCampaign.dailyTraffic || ""}
                                onChange={(e) => setNewCampaign({ ...newCampaign, dailyTraffic: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium mb-4 block">Schedule (Optional)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id="auto-rollout"
                        checked={autoRollout.enabled}
                        onCheckedChange={(checked) => setAutoRollout({ ...autoRollout, enabled: checked })}
                      />
                      <Label htmlFor="auto-rollout" className="text-base font-medium">Auto-rollout</Label>
                    </div>
                    
                    {autoRollout.enabled && (
                      <div className="ml-6 space-y-4 p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="uplift-threshold">Uplift Threshold (%)</Label>
                            <Input
                              id="uplift-threshold"
                              type="number"
                              placeholder="5"
                              value={autoRollout.upliftThreshold}
                              onChange={(e) => setAutoRollout({ ...autoRollout, upliftThreshold: parseInt(e.target.value) || 5 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="min-users">Minimum Users</Label>
                            <Input
                              id="min-users"
                              type="number"
                              placeholder="1000"
                              value={autoRollout.minUsers}
                              onChange={(e) => setAutoRollout({ ...autoRollout, minUsers: parseInt(e.target.value) || 1000 })}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Automatically increase traffic when uplift reaches threshold with sufficient users
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review & Launch or Save */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    {saveMode === "save" ? "Save Experience" : "Review & Launch"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {saveMode === "save" 
                      ? "Save your experience for later use" 
                      : "Final review before deployment"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Experience Name</Label>
                    <Input
                      placeholder="e.g., Enhanced Onboarding Experience"
                      value={experienceName}
                      onChange={(e) => setExperienceName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-4 block">Description (Optional)</Label>
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
                        {selectedObjects.map(objectId => {
                          const object = objects.find(o => o.id === objectId);
                          const variants = objectVariants[objectId];
                          return (
                            <div key={objectId} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                              <span className="text-sm">{object?.name}</span>
                              <Badge variant="outline">{variants?.variants.length} variants</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Combinations:</span>
                          <span className="font-medium">{getTotalCombinations()}</span>
                        </div>
                        {saveMode === "launch" && (
                          <>
                            <div className="flex justify-between">
                              <span>Traffic Split:</span>
                              <span className="font-medium">{trafficSplit}% experience</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Campaign:</span>
                              <span className="font-medium">
                                {campaignType === "existing" 
                                  ? campaigns.find(c => c.id === campaignId)?.name || "Select campaign"
                                  : "New campaign"}
                              </span>
                            </div>
                            {autoRollout.enabled && (
                              <div className="flex justify-between">
                                <span>Auto-rollout:</span>
                                <span className="font-medium">
                                  {autoRollout.upliftThreshold}% @ {autoRollout.minUsers} users
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {saveMode === "save" && (
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="font-medium text-muted-foreground">Draft</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {saveMode === "launch" && (
                    <>
                      <Separator />

                      <div className="bg-accent/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Deployment Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          You're about to deploy this experience to{" "}
                          <span className="font-medium text-foreground">
                            {campaignType === "existing" 
                              ? campaigns.find(c => c.id === campaignId)?.name || "selected campaign"
                              : "new campaign"}
                          </span>{" "}
                          with a <span className="font-medium text-foreground">{trafficSplit}% split</span>
                          {startDate && (
                            <span> starting <span className="font-medium text-foreground">{new Date(startDate).toLocaleDateString()}</span></span>
                          )}
                          .
                        </p>
                      </div>
                    </>
                  )}

                  {saveMode === "save" && (
                    <>
                      <Separator />

                      <div className="bg-accent/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Save Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          Your experience "{experienceName || "Untitled Experience"}" will be saved as a draft with{" "}
                          <span className="font-medium text-foreground">{selectedObjects.length} object{selectedObjects.length === 1 ? '' : 's'}</span>{" "}
                          and <span className="font-medium text-foreground">{getTotalCombinations()} variant combination{getTotalCombinations() === 1 ? '' : 's'}</span>.
                          You can launch it later by configuring campaign settings.
                        </p>
                      </div>
                    </>
                  )}
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
                {currentStep === 2 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSaveMode("save");
                        nextStep();
                      }}
                      disabled={!canProceed()}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setSaveMode("launch");
                        nextStep();
                      }}
                      disabled={!canProceed()}
                    >
                      Save & Launch
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : currentStep === 5 ? (
                  <>
                    {saveMode === "save" ? (
                      <Button
                        type="submit"
                        disabled={!canProceed()}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                      >
                        Save Experience
                      </Button>
                    ) : (
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
                          disabled={!canProceed()}
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Launch Experience
                        </Button>
                      </>
                    )}
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