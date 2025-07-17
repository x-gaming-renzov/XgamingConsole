import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Target,
  TrendingUp,
  Settings,
  Copy,
  Pause,
  Play,
  Archive,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";

interface Experience {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Active" | "Rolling out" | "Completed" | "Paused";
  createdAt: string;
  organisation_id: string;
  app_id: string;
  segment_count: number;
  feature_flags_count: number;
}

export default function Experiences() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);
  const queryClient = useQueryClient();

  const { data: experiences, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({
      action,
      experienceIds,
    }: {
      action: string;
      experienceIds: string[];
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/experiences/bulk-action",
        {
          action,
          experienceIds,
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      setSelectedExperiences([]); // Clear selection after action
    },
    onError: (error) => {
      console.error("Bulk action failed:", error);
    },
  });

  // Delete mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (experienceIds: string[]) => {
      const response = await apiRequest(
        "POST",
        "/api/experiences/bulk-action",
        {
          action: "delete",
          experienceIds,
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      setSelectedExperiences([]); // Clear selection after action
    },
    onError: (error) => {
      console.error("Bulk delete failed:", error);
    },
  });

  // Bulk action handlers
  const handleBulkAction = (action: string) => {
    if (selectedExperiences.length === 0) return;
    bulkActionMutation.mutate({ action, experienceIds: selectedExperiences });
  };

  const handleBulkDelete = () => {
    if (selectedExperiences.length === 0) return;
    if (
      confirm(
        `Are you sure you want to delete ${
          selectedExperiences.length
        } experience${
          selectedExperiences.length > 1 ? "s" : ""
        }? This action cannot be undone.`
      )
    ) {
      bulkDeleteMutation.mutate(selectedExperiences);
    }
  };

  const filteredExperiences =
    experiences?.filter((exp) => {
      const matchesSearch =
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        exp.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Rolling out":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Paused":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExperiences(filteredExperiences.map((exp) => exp.id));
    } else {
      setSelectedExperiences([]);
    }
  };

  const handleSelectExperience = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedExperiences([...selectedExperiences, id]);
    } else {
      setSelectedExperiences(
        selectedExperiences.filter((expId) => expId !== id)
      );
    }
  };

  return (
    <>
      <ConsoleLayout onQuickExperience={() => setShowQuickPrompt(true)}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Experiences
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your FTUE personalization experiences
              </p>
            </div>
            <Link href="/experiences/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Experience
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="rolling out">Rolling out</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedExperiences.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedExperiences.length} experience
                    {selectedExperiences.length > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("pause")}
                      disabled={
                        bulkActionMutation.isPending ||
                        bulkDeleteMutation.isPending
                      }
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("resume")}
                      disabled={
                        bulkActionMutation.isPending ||
                        bulkDeleteMutation.isPending
                      }
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("archive")}
                      disabled={
                        bulkActionMutation.isPending ||
                        bulkDeleteMutation.isPending
                      }
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={
                        bulkActionMutation.isPending ||
                        bulkDeleteMutation.isPending
                      }
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Experiences Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Experiences</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredExperiences.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedExperiences.length ===
                            filteredExperiences.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Objects</TableHead>
                      <TableHead>Segments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExperiences.map((experience) => (
                      <TableRow key={experience.id}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedExperiences.includes(
                              experience.id
                            )}
                            onCheckedChange={(checked) =>
                              handleSelectExperience(
                                experience.id,
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <div className="font-medium hover:text-primary">
                              {experience.name}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <span className="text-muted-foreground">
                              {experience.description || "No description"}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <span className="text-muted-foreground">
                              {experience.feature_flags_count}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <span className="text-muted-foreground">
                              {experience.segment_count} segments
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <Badge
                              variant="outline"
                              className={getStatusColor(experience.status)}
                            >
                              {experience.status}
                            </Badge>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/experiences/${experience.id}`}
                            className="block w-full"
                          >
                            <span className="text-muted-foreground">
                              {experience.createdAt}
                            </span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No experiences found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first FTUE experience to start optimizing player
                    onboarding
                  </p>
                  <Link href="/experiences/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Experience
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ConsoleLayout>

      <QuickExperiencePrompt
        open={showQuickPrompt}
        onClose={() => setShowQuickPrompt(false)}
      />
    </>
  );
}
