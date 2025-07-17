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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  FileText, 
  Sliders, 
  Zap,
  Search,
  X,
} from "lucide-react";
import { useLocation } from "wouter";

const experienceSchema = z.object({
  name: z.string().min(1, "Experience name is required"),
  description: z.string().optional(),
  selectedObjects: z
    .array(z.string())
    .min(1, "Please select at least one object"),
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

export default function ExperienceWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [experienceName, setExperienceName] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const form = useForm<ExperienceForm>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      selectedObjects: [],
    },
  });

  // Fetch available objects (not in any experience) from API
  const { data: objectsData = [] } = useQuery<any[]>({
    queryKey: ["/api/objects/available"],
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

  const steps = [
    {
      number: 1,
      title: "Basic Info",
      description: "Name and description",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      number: 2,
      title: "Select Objects",
      description: "Choose objects to include",
      icon: <Layers className="w-4 h-4" />,
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

  const handleObjectSelect = (objectId: string, checked: boolean) => {
    if (checked && !selectedObjects.includes(objectId)) {
      setSelectedObjects([...selectedObjects, objectId]);
    } else if (!checked && selectedObjects.includes(objectId)) {
      setSelectedObjects(selectedObjects.filter((id) => id !== objectId));
    }
  };

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

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return experienceName.trim().length > 0;
      case 2:
        return selectedObjects.length > 0;
      default:
        return false;
    }
  };

  const onSubmit = async () => {
    try {
      const data = {
        name: experienceName,
        description: experienceDescription,
        selectedObjects,
        status: "active",
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
                Create a new experience with selected objects
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
            <Progress value={(currentStep / 2) * 100} className="h-2" />
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
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">
                    Experience Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter the basic information for your experience
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="experience-name" className="text-base font-medium">
                      Experience Name
                    </Label>
                    <Input
                      id="experience-name"
                      placeholder="e.g., Enhanced Onboarding Experience"
                      value={experienceName}
                      onChange={(e) => setExperienceName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="experience-description" className="text-base font-medium">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="experience-description"
                      placeholder="Describe this experience..."
                      value={experienceDescription}
                      onChange={(e) => setExperienceDescription(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Select Objects */}
            {currentStep === 2 && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-heading">
                        Select Objects
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choose objects to include in your experience
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
                            <Search className="w-4 h-4 text-muted-foreground" />
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
                            <Search className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">
                            No objects found
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {searchQuery 
                              ? `No objects match your search "${searchQuery}". Try a different search term.`
                              : "No available objects found. All objects may already be in use by other experiences."
                            }
                          </p>
                          {searchQuery && (
                            <Button
                              variant="outline"
                              onClick={() => setSearchQuery("")}
                            >
                              Clear search
                            </Button>
                          )}
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
                                    <div className="text-sm text-muted-foreground">
                                      {object.type}
                                    </div>
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
                  <Button
                    type="submit"
                    disabled={!canProceed() || createExperience.isPending}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {createExperience.isPending
                      ? "Creating..."
                      : "Create Experience"}
                  </Button>
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
