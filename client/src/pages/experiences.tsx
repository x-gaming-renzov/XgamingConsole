import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";
import ExperienceForm from "@/components/experience-form";

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
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);

  const { data: experiences, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

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
            <ExperienceForm />
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
                      <TableRow 
                        key={experience.id}
                        className="group hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/experiences/${experience.id}`}
                      >
                        <TableCell>
                          <div className="font-medium">
                            {experience.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {experience.description || "No description"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {experience.feature_flags_count} object{experience.feature_flags_count === 1 ? '' : 's'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {experience.segment_count} segment{experience.segment_count === 1 ? '' : 's'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(experience.status)}
                          >
                            {experience.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {experience.createdAt}
                          </span>
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
                  <ExperienceForm trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Experience
                    </Button>
                  } />
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
