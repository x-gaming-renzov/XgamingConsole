import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus,
  Layers, 
  FileText, 
  Sliders, 
  Search,
  X,
} from "lucide-react";

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

interface ExperienceFormProps {
  trigger?: React.ReactNode;
}

export default function ExperienceForm({ trigger }: ExperienceFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [experienceName, setExperienceName] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch available objects from API
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
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to create experience:", error);
    },
  });

  const resetForm = () => {
    setExperienceName("");
    setExperienceDescription("");
    setSelectedObjects([]);
    setSearchQuery("");
  };

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Level":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Popup":
        return "bg-green-50 text-green-700 border-green-200";
      case "Param":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
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

  const canSubmit = () => {
    return experienceName.trim().length > 0 && selectedObjects.length > 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    try {
      const data = {
        name: experienceName,
        description: experienceDescription,
        selectedObjects,
        status: "active",
      };
      
      createExperience.mutate(data);
    } catch (error) {
      console.error("Failed to create experience:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Experience
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Experience</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="experience-name" className="text-sm font-medium">
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
              <Label htmlFor="experience-description" className="text-sm font-medium">
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
          </div>

          {/* Objects Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Select Objects</Label>
                <span className="text-xs text-muted-foreground">
                  ({selectedObjects.length} selected)
                </span>
              </div>
              {selectedObjects.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedObjects([])}
                  className="text-xs h-7 hover:no-underline"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search objects by name, type, or flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Objects Grid */}
            <div className="max-h-80 overflow-y-auto border rounded-lg p-4">
              {filteredObjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? `No objects match "${searchQuery}"`
                      : "No available objects found"
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {filteredObjects.map((object) => (
                    <div
                      key={object.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        selectedObjects.includes(object.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        const isCurrentlySelected = selectedObjects.includes(object.id);
                        handleObjectSelect(object.id, !isCurrentlySelected);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(object.type)}`}>
                            {getTypeIcon(object.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm">{object.name}</h3>
                            <p className="text-xs text-muted-foreground">{object.type}</p>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedObjects.includes(object.id)}
                            onCheckedChange={(checked) =>
                              handleObjectSelect(object.id, checked === true)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={!canSubmit() || createExperience.isPending}
            >
              {createExperience.isPending ? "Creating..." : "Create Experience"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 