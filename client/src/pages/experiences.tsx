import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Target, TrendingUp, Settings, Copy, Pause, Play, Archive } from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";

interface Experience {
  id: number;
  name: string;
  campaign: string;
  object: string;
  uplift: number;
  status: "Draft" | "Active" | "Rolling out" | "Completed" | "Paused";
  createdAt: string;
  metrics: {
    d0Retention: number;
    d1Retention: number;
    activationRate: number;
    participants: number;
  };
}

export default function Experiences() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedExperiences, setSelectedExperiences] = useState<number[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);

  const { data: experiences, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  const filteredExperiences = experiences?.filter(exp => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.object.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status.toLowerCase() === statusFilter.toLowerCase();
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
      setSelectedExperiences(filteredExperiences.map(exp => exp.id));
    } else {
      setSelectedExperiences([]);
    }
  };

  const handleSelectExperience = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedExperiences([...selectedExperiences, id]);
    } else {
      setSelectedExperiences(selectedExperiences.filter(expId => expId !== id));
    }
  };

  const ExperienceDrawer = ({ experience }: { experience: Experience }) => (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>{experience.name}</span>
          <Badge variant="outline" className={getStatusColor(experience.status)}>
            {experience.status}
          </Badge>
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-accent/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{experience.uplift > 0 ? '+' : ''}{experience.uplift}%</div>
            <div className="text-sm text-muted-foreground">Uplift</div>
          </div>
          <div className="text-center p-4 bg-accent/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{experience.metrics.participants.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Participants</div>
          </div>
          <div className="text-center p-4 bg-accent/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{experience.metrics.d1Retention}%</div>
            <div className="text-sm text-muted-foreground">D1 Retention</div>
          </div>
          <div className="text-center p-4 bg-accent/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{experience.metrics.activationRate}%</div>
            <div className="text-sm text-muted-foreground">Activation</div>
          </div>
        </div>

        {/* Mini Line Chart Placeholder */}
        <div className="h-32 bg-accent/30 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Retention Chart</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Adjust Split
          </Button>
          <Button>
            Roll-out Winner
          </Button>
          <Button variant="outline">
            End Experience
          </Button>
          <Button variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <>
      <ConsoleLayout onQuickExperience={() => setShowQuickPrompt(true)}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Experiences</h1>
          <p className="text-muted-foreground">Manage and monitor your FTUE personalization experiences</p>
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
                {selectedExperiences.length} experience{selectedExperiences.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button variant="outline" size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button variant="outline" size="sm">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiences Table */}
      <Card>
        <CardHeader>
          <CardTitle>Experience Results</CardTitle>
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
                      checked={selectedExperiences.length === filteredExperiences.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Uplift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExperiences.map((experience) => (
                  <TableRow 
                    key={experience.id} 
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setSelectedExperience(experience)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedExperiences.includes(experience.id)}
                        onCheckedChange={(checked) => 
                          handleSelectExperience(experience.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{experience.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{experience.campaign}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{experience.object}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${experience.uplift > 0 ? 'text-green-600' : experience.uplift < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {experience.uplift > 0 ? '+' : ''}{experience.uplift}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(experience.status)}>
                        {experience.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{experience.createdAt}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No experiences found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first FTUE experience to start optimizing player onboarding
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

      {/* Experience Detail Drawer */}
      <Dialog open={selectedExperience !== null} onOpenChange={() => setSelectedExperience(null)}>
        {selectedExperience && <ExperienceDrawer experience={selectedExperience} />}
      </Dialog>
      </div>
      </ConsoleLayout>

      <QuickExperiencePrompt 
        open={showQuickPrompt} 
        onClose={() => setShowQuickPrompt(false)} 
      />
    </>
  );
}