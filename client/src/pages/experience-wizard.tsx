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
import { ChevronLeft, ChevronRight, Layers, FileText, Sliders, Users, Target } from "lucide-react";
import { useLocation } from "wouter";

const experienceSchema = z.object({
  name: z.string().min(1, "Experience name is required"),
  description: z.string().optional(),
  objectId: z.string().min(1, "Please select an object"),
  variants: z.array(z.object({
    name: z.string(),
    values: z.record(z.any())
  })).min(2, "At least 2 variants required"),
  campaignType: z.enum(["existing", "new"]),
  campaignId: z.string().optional(),
  newCampaign: z.object({
    utmSource: z.string(),
    rolloutPercentage: z.number()
  }).optional(),
  trafficSplit: z.number().min(10).max(90)
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

export default function ExperienceWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedObject, setSelectedObject] = useState<GameObject | null>(null);
  
  const form = useForm<ExperienceForm>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      variants: [
        { name: "Control", values: {} },
        { name: "Variant A", values: {} }
      ],
      campaignType: "existing",
      trafficSplit: 50
    }
  });

  // Mock data for objects and campaigns
  const objects: GameObject[] = [
    {
      id: "1",
      name: "Level 5 Tutorial",
      type: "Level",
      flags: [
        { key: "starting_coins", type: "number", defaultValue: 100, description: "Initial coins given to player" },
        { key: "enemy_count", type: "number", defaultValue: 5, description: "Number of enemies in level" },
        { key: "time_limit", type: "number", defaultValue: 120, description: "Time limit in seconds" }
      ]
    },
    {
      id: "2", 
      name: "Welcome Popup",
      type: "Popup",
      flags: [
        { key: "title_text", type: "text", defaultValue: "Welcome!", description: "Popup title" },
        { key: "button_text", type: "text", defaultValue: "Get Started", description: "CTA button text" },
        { key: "show_rewards", type: "boolean", defaultValue: true, description: "Show reward preview" }
      ]
    },
    {
      id: "3",
      name: "Onboarding Flow",
      type: "Param",
      flags: [
        { key: "skip_tutorial", type: "boolean", defaultValue: false, description: "Allow skipping tutorial" },
        { key: "tutorial_steps", type: "number", defaultValue: 7, description: "Number of tutorial steps" }
      ]
    }
  ];

  const campaigns: Campaign[] = [
    { id: "1", name: "Facebook Campaign", utmSource: "facebook", traffic: 1250 },
    { id: "2", name: "Google Ads", utmSource: "google", traffic: 850 },
    { id: "3", name: "TikTok Ads", utmSource: "tiktok", traffic: 420 }
  ];

  const steps = [
    { number: 1, title: "Select Object", description: "Choose the game element to personalize" },
    { number: 2, title: "Define Variants", description: "Set up different versions to test" },
    { number: 3, title: "Choose Campaign", description: "Select target audience" },
    { number: 4, title: "Review & Launch", description: "Final settings and launch" }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Level": return <Layers className="w-4 h-4" />;
      case "Popup": return <FileText className="w-4 h-4" />;
      case "Param": return <Sliders className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  const handleObjectSelect = (objectId: string) => {
    const object = objects.find(o => o.id === objectId);
    setSelectedObject(object || null);
    form.setValue("objectId", objectId);
    
    // Initialize variant values with defaults
    const defaultValues: Record<string, any> = {};
    object?.flags.forEach(flag => {
      defaultValues[flag.key] = flag.defaultValue;
    });
    
    form.setValue("variants", [
      { name: "Control", values: defaultValues },
      { name: "Variant A", values: { ...defaultValues } }
    ]);
  };

  const addVariant = () => {
    const variants = form.getValues("variants");
    const defaultValues: Record<string, any> = {};
    selectedObject?.flags.forEach(flag => {
      defaultValues[flag.key] = flag.defaultValue;
    });
    
    form.setValue("variants", [
      ...variants,
      { name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`, values: defaultValues }
    ]);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = (data: ExperienceForm) => {
    console.log("Creating experience:", data);
    // Here you would typically make an API call
    setLocation("/experiences");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">New Experience</h1>
              <p className="text-muted-foreground">Create a personalized FTUE experience</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/experiences")}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Experiences
            </Button>
          </div>
          
          {/* Progress */}
          <div className="mt-6">
            <Progress value={(currentStep / 4) * 100} className="h-2" />
            <div className="flex justify-between mt-4">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.number 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {step.number}
                  </div>
                  <div className="text-center mt-2">
                    <div className="font-medium text-sm">{step.title}</div>
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
        <div className="max-w-4xl mx-auto">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Select Object */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Object to Personalize</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {objects.map((object) => (
                      <div
                        key={object.id}
                        onClick={() => handleObjectSelect(object.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          form.watch("objectId") === object.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            {getTypeIcon(object.type)}
                          </div>
                          <div>
                            <h3 className="font-medium">{object.name}</h3>
                            <Badge variant="outline">{object.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {object.flags.length} flags available
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {object.flags.slice(0, 2).map(flag => flag.key).join(", ")}
                          {object.flags.length > 2 && "..."}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedObject && (
                    <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                      <h4 className="font-medium mb-2">Preview: {selectedObject.name}</h4>
                      <div className="space-y-2">
                        {selectedObject.flags.map((flag) => (
                          <div key={flag.key} className="flex justify-between text-sm">
                            <span>{flag.key}:</span>
                            <span className="font-mono">{JSON.stringify(flag.defaultValue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Define Variants */}
            {currentStep === 2 && selectedObject && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Define Variants</CardTitle>
                    <Button type="button" variant="outline" onClick={addVariant}>
                      Add Variant
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {form.watch("variants").map((variant, variantIndex) => (
                      <div key={variantIndex} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-4">{variant.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedObject.flags.map((flag) => (
                            <div key={flag.key}>
                              <Label>{flag.key}</Label>
                              <p className="text-xs text-muted-foreground mb-2">{flag.description}</p>
                              {flag.type === "text" && (
                                <Input
                                  defaultValue={flag.defaultValue}
                                  onChange={(e) => {
                                    const variants = form.getValues("variants");
                                    variants[variantIndex].values[flag.key] = e.target.value;
                                    form.setValue("variants", variants);
                                  }}
                                />
                              )}
                              {flag.type === "number" && (
                                <Input
                                  type="number"
                                  defaultValue={flag.defaultValue}
                                  onChange={(e) => {
                                    const variants = form.getValues("variants");
                                    variants[variantIndex].values[flag.key] = parseInt(e.target.value);
                                    form.setValue("variants", variants);
                                  }}
                                />
                              )}
                              {flag.type === "boolean" && (
                                <Select
                                  defaultValue={flag.defaultValue.toString()}
                                  onValueChange={(value) => {
                                    const variants = form.getValues("variants");
                                    variants[variantIndex].values[flag.key] = value === "true";
                                    form.setValue("variants", variants);
                                  }}
                                >
                                  <SelectTrigger>
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Choose Campaign */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={form.watch("campaignType")}
                    onValueChange={(value) => form.setValue("campaignType", value as "existing" | "new")}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="existing" />
                        <Label htmlFor="existing">Pick existing campaign</Label>
                      </div>
                      
                      {form.watch("campaignType") === "existing" && (
                        <div className="ml-6 space-y-3">
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
                                  <div className="text-xs text-muted-foreground">daily traffic</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="new" />
                        <Label htmlFor="new">Quick campaign builder</Label>
                      </div>

                      {form.watch("campaignType") === "new" && (
                        <div className="ml-6 space-y-4">
                          <div>
                            <Label>UTM Source</Label>
                            <Input 
                              placeholder="e.g., facebook"
                              onChange={(e) => form.setValue("newCampaign.utmSource", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Rollout Percentage: {form.watch("newCampaign.rolloutPercentage") || 10}%</Label>
                            <Slider
                              defaultValue={[10]}
                              max={100}
                              step={5}
                              className="mt-2"
                              onValueChange={(value) => form.setValue("newCampaign.rolloutPercentage", value[0])}
                            />
                            <div className="text-sm text-muted-foreground mt-1">
                              Live traffic preview: ~{Math.round((form.watch("newCampaign.rolloutPercentage") || 10) / 100 * 1000)} users/day
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Launch */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review & Launch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="experienceName">Experience Name</Label>
                    <Input
                      id="experienceName"
                      placeholder="e.g., Level 5 Coin Boost Test"
                      {...form.register("name")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this experience..."
                      {...form.register("description")}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-accent/50 rounded-lg">
                        <div className="text-sm font-medium">Object</div>
                        <div className="text-sm text-muted-foreground">{selectedObject?.name}</div>
                      </div>
                      <div className="p-3 bg-accent/50 rounded-lg">
                        <div className="text-sm font-medium">Variants</div>
                        <div className="text-sm text-muted-foreground">{form.watch("variants").length} variants</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Traffic Split: Control vs Variants</Label>
                    <div className="mt-2 mb-4">
                      <Slider
                        value={[form.watch("trafficSplit")]}
                        max={90}
                        min={10}
                        step={5}
                        onValueChange={(value) => form.setValue("trafficSplit", value[0])}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Control: {100 - form.watch("trafficSplit")}%</span>
                      <span>Variants: {form.watch("trafficSplit")}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !form.watch("objectId")) ||
                    (currentStep === 3 && form.watch("campaignType") === "existing" && !form.watch("campaignId"))
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={!form.watch("name")}>
                  <Target className="w-4 h-4 mr-2" />
                  Launch Experience
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}