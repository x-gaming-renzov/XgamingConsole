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
import { Search, Plus, Target } from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import PersonalisationForm from "@/components/personalisation-form";

interface Personalisation {
  pid: string;
  name: string;
  description: string;
  experience: { pid: string; name: string };
}

export default function Personalisations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPersonalisationForm, setShowPersonalisationForm] = useState(false);

  const { data: personalisations, isLoading } = useQuery<Personalisation[]>({
    queryKey: ["/api/personalisations"],
  });

  const filteredPersonalisations =
    personalisations?.filter((exp) => {
      const matchesSearch =
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
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
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Personalisations
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your personalised experiences
              </p>
            </div>
            <Button onClick={() => setShowPersonalisationForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Personalisation
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search personalisations..."
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

          {/* Personalisations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Personalised Experiences</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPersonalisations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Experience</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPersonalisations.map((personalisation) => (
                      <TableRow
                        key={personalisation.pid}
                        className="group hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() =>
                          (window.location.href = `/experiences/${personalisation.experience.pid}/personalisations`)
                        }
                      >
                        <TableCell>
                          <div className="font-medium">{personalisation.name}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {personalisation.description || "No description"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {personalisation.experience.name || ""}
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
                    No personalised personalisations found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first personalisation to start optimizing conversion
                  </p>
                  <Button onClick={() => setShowPersonalisationForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Personalisation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ConsoleLayout>

      <PersonalisationForm
        open={showPersonalisationForm}
        onOpenChange={setShowPersonalisationForm}
        onSuccess={() => {
            // queryClient.invalidateQueries({ queryKey: [`/api/experiences/${experienceId}`] });
        }}
      />
    </>
  );
}
