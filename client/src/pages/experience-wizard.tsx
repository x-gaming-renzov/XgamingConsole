import { useState } from "react";
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
  name: z.string().min(1, "Cocktail name is required"),
  description: z.string().optional(),
  selectedObjects: z.array(z.string()).min(1, "Please select at least one ingredient"),
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
  const objects: GameObject[] = [
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
  ];

  const campaigns: Campaign[] = [
    { id: "facebook_ads", name: "Facebook Campaign", utmSource: "facebook", traffic: 1250 },
    { id: "google_ads", name: "Google Ads", utmSource: "google", traffic: 850 },
    { id: "tiktok_ads", name: "TikTok Ads", utmSource: "tiktok", traffic: 420 },
    { id: "instagram_ads", name: "Instagram Ads", utmSource: "instagram", traffic: 680 }
  ];

  const steps = [
    { number: 1, title: "Select Ingredients", description: "Choose objects to personalize", icon: <Layers className="w-4 h-4" /> },
    { number: 2, title: "Configure Variants", description: "Define versions for each ingredient", icon: <Beaker className="w-4 h-4" /> },
    { number: 3, title: "Traffic Split", description: "Set experience percentage", icon: <Sliders className="w-4 h-4" /> },
    { number: 4, title: "Target & Schedule", description: "Choose palate and timing", icon: <Target className="w-4 h-4" /> },
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
    let newSelectedObjects: string[];
    let newObjectVariants = { ...objectVariants };
    
    if (checked) {
      newSelectedObjects = [...selectedObjects, objectId];
      
      // Initialize variants for newly selected objects
      const object = objects.find(o => o.id === objectId);
      if (object) {
        const defaultValues: Record<string, any> = {};
        object.flags.forEach(flag => {
          defaultValues[flag.key] = flag.defaultValue;
        });
        
        newObjectVariants[objectId] = {
          variants: [
            { name: "Control", values: defaultValues },
            { name: "Variant A", values: { ...defaultValues } }
          ]
        };
      }
    } else {
      newSelectedObjects = selectedObjects.filter(id => id !== objectId);
      delete newObjectVariants[objectId];
    }
    
    setSelectedObjects(newSelectedObjects);
    setObjectVariants(newObjectVariants);
    form.setValue("selectedObjects", newSelectedObjects);
    form.setValue("objectVariants", newObjectVariants);
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
      form.setValue("objectVariants", newObjectVariants);
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
      form.setValue("objectVariants", newObjectVariants);
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
      form.setValue("objectVariants", newObjectVariants);
    }
  };

  const getTotalCombinations = () => {
    let total = 1;
    Object.values(objectVariants).forEach(objectVariant => {
      total *= objectVariant.variants.length;
    });
    return total;
  };

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
        return selectedObjects.every(objId => {
          const variants = objectVariants[objId];
          return variants && variants.variants.length > 0;
        });
      case 3:
        return getTotalCombinations() <= 8;
      case 4:
        const formData = form.getValues();
        return formData.campaignType === "new" || formData.campaignId;
      case 5:
        return form.watch("name").length > 0;
      default:
        return false;
    }
  };

  const onSubmit = (data: ExperienceForm) => {
    console.log("Creating cocktail:", data);
    setLocation("/experiences");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">Craft Cocktail</h1>
              <p className="text-muted-foreground">Create a personalized FTUE experience</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/experiences")}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Cocktails
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            
            {/* Step 1: Select Objects */}
            {currentStep === 1 && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Card className="mixology-card">
                    <CardHeader>
                      <CardTitle className="font-heading">Select Ingredients to Personalize</CardTitle>
                      <p className="text-sm text-muted-foreground">Choose multiple objects to compose your cocktail experience</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {objects.map((object) => (
                          <div
                            key={object.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                              selectedObjects.includes(object.id)
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => handleObjectSelect(object.id, !selectedObjects.includes(object.id))}
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
                              <Checkbox
                                checked={selectedObjects.includes(object.id)}
                                onChange={() => {}}
                                className="mt-1"
                              />
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
                    </CardContent>
                  </Card>
                </div>
                
                {/* Sticky sidebar */}
                <div className="w-64 sticky top-6">
                  <Card className="mixology-card">
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">Selected Ingredients ({selectedObjects.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedObjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No ingredients selected
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
              <Card className="mixology-card">
                <CardHeader>
                  <CardTitle className="font-heading">Configure Variants</CardTitle>
                  <p className="text-sm text-muted-foreground">Define different versions for each selected ingredient</p>
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
                                            defaultValue={variant.values[flag.key] || flag.defaultValue}
                                            onChange={(e) => updateVariantValue(objectId, variantIndex, flag.key, e.target.value)}
                                            className="h-8"
                                          />
                                        )}
                                        {flag.type === "number" && (
                                          <Input
                                            type="number"
                                            defaultValue={variant.values[flag.key] || flag.defaultValue}
                                            onChange={(e) => updateVariantValue(objectId, variantIndex, flag.key, parseFloat(e.target.value))}
                                            className="h-8"
                                          />
                                        )}
                                        {flag.type === "boolean" && (
                                          <Select
                                            defaultValue={(variant.values[flag.key] ?? flag.defaultValue).toString()}
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
              <Card className="mixology-card">
                <CardHeader>
                  <CardTitle className="font-heading">Traffic Split</CardTitle>
                  <p className="text-sm text-muted-foreground">How many new players should taste the new cocktail?</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Experience Traffic</Label>
                    <div className="space-y-4">
                      <Slider
                        value={[form.watch("trafficSplit")]}
                        onValueChange={(value) => form.setValue("trafficSplit", value[0])}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0% (Full Control)</span>
                        <span className="font-medium text-foreground">{form.watch("trafficSplit")}% Experience</span>
                        <span>100% (Full Experience)</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium mb-4 block">Recipe Combinations</Label>
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
                            Too many combinations ({getTotalCombinations()}). Please reduce variants or ingredients to 8 or fewer.
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
              <Card className="mixology-card">
                <CardHeader>
                  <CardTitle className="font-heading">Target & Schedule</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose your palate and set release conditions</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Select Palate</Label>
                    <RadioGroup
                      value={form.watch("campaignType")}
                      onValueChange={(value) => form.setValue("campaignType", value as "existing" | "new")}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label htmlFor="existing">Use existing palate</Label>
                        </div>
                        
                        {form.watch("campaignType") === "existing" && (
                          <div className="ml-6 space-y-2">
                            {campaigns.map((campaign) => (
                              <div
                                key={campaign.id}
                                onClick={() => form.setValue("campaignId", campaign.id)}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  form.watch("campaignId") === campaign.id
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
                                    <div className="text-xs text-muted-foreground">daily guests</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new" />
                          <Label htmlFor="new">Create new palate</Label>
                        </div>
                        
                        {form.watch("campaignType") === "new" && (
                          <div className="ml-6 space-y-4 p-4 border rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="campaign-name">Palate Name</Label>
                                <Input
                                  id="campaign-name"
                                  placeholder="e.g., Summer Launch"
                                  onChange={(e) => {
                                    const newCampaign = form.getValues("newCampaign") || { name: "", utmSource: "", dailyTraffic: 0 };
                                    form.setValue("newCampaign", { ...newCampaign, name: e.target.value });
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor="utm-source">UTM Source</Label>
                                <Input
                                  id="utm-source"
                                  placeholder="e.g., facebook, google"
                                  onChange={(e) => {
                                    const newCampaign = form.getValues("newCampaign") || { name: "", utmSource: "", dailyTraffic: 0 };
                                    form.setValue("newCampaign", { ...newCampaign, utmSource: e.target.value });
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="daily-traffic">Expected Daily Traffic</Label>
                              <Input
                                id="daily-traffic"
                                type="number"
                                placeholder="1000"
                                onChange={(e) => {
                                  const newCampaign = form.getValues("newCampaign") || { name: "", utmSource: "", dailyTraffic: 0 };
                                  form.setValue("newCampaign", { ...newCampaign, dailyTraffic: parseInt(e.target.value) || 0 });
                                }}
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
                          onChange={(e) => form.setValue("startDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="datetime-local"
                          onChange={(e) => form.setValue("endDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id="auto-rollout"
                        checked={form.watch("autoRollout")?.enabled || false}
                        onCheckedChange={(checked) => {
                          const autoRollout = form.getValues("autoRollout") || { enabled: false, upliftThreshold: 5, minUsers: 1000 };
                          form.setValue("autoRollout", { ...autoRollout, enabled: checked });
                        }}
                      />
                      <Label htmlFor="auto-rollout" className="text-base font-medium">Auto-rollout</Label>
                    </div>
                    
                    {form.watch("autoRollout")?.enabled && (
                      <div className="ml-6 space-y-4 p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="uplift-threshold">Uplift Threshold (%)</Label>
                            <Input
                              id="uplift-threshold"
                              type="number"
                              placeholder="5"
                              defaultValue={form.watch("autoRollout")?.upliftThreshold || 5}
                              onChange={(e) => {
                                const autoRollout = form.getValues("autoRollout") || { enabled: true, upliftThreshold: 5, minUsers: 1000 };
                                form.setValue("autoRollout", { ...autoRollout, upliftThreshold: parseInt(e.target.value) || 5 });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="min-users">Minimum Users</Label>
                            <Input
                              id="min-users"
                              type="number"
                              placeholder="1000"
                              defaultValue={form.watch("autoRollout")?.minUsers || 1000}
                              onChange={(e) => {
                                const autoRollout = form.getValues("autoRollout") || { enabled: true, upliftThreshold: 5, minUsers: 1000 };
                                form.setValue("autoRollout", { ...autoRollout, minUsers: parseInt(e.target.value) || 1000 });
                              }}
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

            {/* Step 5: Review & Launch */}
            {currentStep === 5 && (
              <Card className="mixology-card">
                <CardHeader>
                  <CardTitle className="font-heading">Review & Launch</CardTitle>
                  <p className="text-sm text-muted-foreground">Final review before deployment</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-4 block">Cocktail Name</Label>
                    <Input
                      placeholder="e.g., Enhanced Onboarding Mix"
                      value={form.watch("name") || ""}
                      onChange={(e) => form.setValue("name", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-4 block">Description (Optional)</Label>
                    <Textarea
                      placeholder="Describe this cocktail experience..."
                      value={form.watch("description") || ""}
                      onChange={(e) => form.setValue("description", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Selected Ingredients</h4>
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
                          <span>Traffic Split:</span>
                          <span className="font-medium">{form.watch("trafficSplit")}% experience</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Combinations:</span>
                          <span className="font-medium">{getTotalCombinations()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Palate:</span>
                          <span className="font-medium">
                            {form.watch("campaignType") === "existing" 
                              ? campaigns.find(c => c.id === form.watch("campaignId"))?.name || "Select palate"
                              : "New palate"}
                          </span>
                        </div>
                        {form.watch("autoRollout")?.enabled && (
                          <div className="flex justify-between">
                            <span>Auto-rollout:</span>
                            <span className="font-medium">
                              {form.watch("autoRollout")?.upliftThreshold}% @ {form.watch("autoRollout")?.minUsers} users
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
                      You're about to deploy this cocktail experience to{" "}
                      <span className="font-medium text-foreground">
                        {form.watch("campaignType") === "existing" 
                          ? campaigns.find(c => c.id === form.watch("campaignId"))?.name || "selected palate"
                          : "new palate"}
                      </span>{" "}
                      with a <span className="font-medium text-foreground">{form.watch("trafficSplit")}% split</span>
                      {form.watch("startDate") && (
                        <span> starting <span className="font-medium text-foreground">{new Date(form.watch("startDate")!).toLocaleDateString()}</span></span>
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
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                    >
                      <Wine className="w-4 h-4 mr-2" />
                      Launch Cocktail
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