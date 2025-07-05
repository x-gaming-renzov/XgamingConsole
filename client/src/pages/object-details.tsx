import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  Copy, 
  Edit, 
  Archive, 
  Plus, 
  Layers, 
  FileText, 
  Sliders,
  Users,
  Clock,
  Activity,
  TrendingUp
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";

interface ObjectDetails {
  id: number;
  name: string;
  type: "Level" | "Popup" | "Param";
  description: string;
  flags: Array<{
    key: string;
    type: "text" | "number" | "boolean";
    defaultValue: any;
    description: string;
    min?: number;
    max?: number;
  }>;
  stats: {
    variants: number;
    usedByExperiences: number;
    players7d: number;
    lastModified: string;
  };
}

interface Experience {
  id: number;
  name: string;
  campaign: string;
  status: "Active" | "Draft" | "Completed";
  variants: string[];
  split: number;
  launchDate: string;
}

interface HistoryEntry {
  id: number;
  date: string;
  version: string;
  action: string;
  details: string;
}

export default function ObjectDetails() {
  const [, params] = useRoute("/objects/:id");
  const objectId = params?.id;
  const [description, setDescription] = useState("");
  const [showVariantValues, setShowVariantValues] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<"all" | "active" | "completed" | "draft">("all");

  const { data: objectDetails, isLoading } = useQuery<ObjectDetails>({
    queryKey: ["/api/objects", objectId],
    enabled: !!objectId
  });

  const { data: experiences = [] } = useQuery<Experience[]>({
    queryKey: ["/api/objects", objectId, "usage"],
    enabled: !!objectId
  });

  const { data: history = [] } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/objects", objectId, "history"],
    enabled: !!objectId
  });

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
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Popup":
        return "bg-green-100 text-green-800 border-green-200";
      case "Param":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredExperiences = experiences.filter(exp => {
    if (experienceFilter === "all") return true;
    return exp.status.toLowerCase() === experienceFilter;
  });

  if (isLoading) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  if (!objectDetails) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Object not found</h3>
            <p className="text-muted-foreground mb-4">The object you're looking for doesn't exist.</p>
            <Link href="/objects">
              <Button>Back to Objects</Button>
            </Link>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/objects" className="hover:text-foreground">Objects</Link>
          <span>/</span>
          <span className="text-foreground">{objectDetails.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/objects">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-foreground">{objectDetails.name}</h1>
                <Badge variant="outline" className={getTypeColor(objectDetails.type)}>
                  <span className="flex items-center space-x-1">
                    {getTypeIcon(objectDetails.type)}
                    <span>{objectDetails.type}</span>
                  </span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last sync {objectDetails.stats.lastModified}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                Manage parameters and track where this object is personalised
              </p>
            </div>
          </div>
          <Link href={`/experiences/new?object=${objectDetails.id}`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Experience
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{objectDetails.stats.variants}</div>
                      <div className="text-sm text-muted-foreground">Variants defined</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{objectDetails.stats.usedByExperiences}</div>
                      <div className="text-sm text-muted-foreground">Experiences using</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{objectDetails.stats.players7d.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Players affected (7d)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">10 Jul</div>
                      <div className="text-sm text-muted-foreground">Last modified</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={description || objectDetails.description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this object..."
                  className="min-h-[100px]"
                  maxLength={300}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {(description || objectDetails.description || "").length}/300 characters
                  </span>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href={`/experiences/new?object=${objectDetails.id}`}>
                    <Button className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Experience
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Object
                  </Button>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Object
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Parameters</h3>
                <p className="text-sm text-muted-foreground">
                  Configure the flags that can be modified in this object
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-variants"
                  checked={showVariantValues}
                  onCheckedChange={setShowVariantValues}
                />
                <Label htmlFor="show-variants" className="text-sm">
                  Show current variant values
                </Label>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter (key)</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objectDetails.flags.map((flag, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {flag.key}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(flag.key)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{flag.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{String(flag.defaultValue)}</code>
                        </TableCell>
                        <TableCell>
                          {flag.min !== undefined ? flag.min : "—"}
                        </TableCell>
                        <TableCell>
                          {flag.max !== undefined ? flag.max : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {flag.description}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" disabled>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Usage</h3>
                <p className="text-sm text-muted-foreground">
                  Experiences that use this object
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={experienceFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExperienceFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={experienceFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExperienceFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={experienceFilter === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExperienceFilter("draft")}
                >
                  Draft
                </Button>
                <Button
                  variant={experienceFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExperienceFilter("completed")}
                >
                  Completed
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {filteredExperiences.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Variants in this object</TableHead>
                        <TableHead>Split %</TableHead>
                        <TableHead>Launch date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExperiences.map((experience) => (
                        <TableRow key={experience.id} className="cursor-pointer hover:bg-accent/50">
                          <TableCell className="font-medium">{experience.name}</TableCell>
                          <TableCell>{experience.campaign}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                experience.status === "Active" ? "default" :
                                experience.status === "Draft" ? "secondary" : "outline"
                              }
                            >
                              {experience.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {experience.variants.map((variant, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {variant}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{experience.split}%</TableCell>
                          <TableCell className="text-muted-foreground">
                            {experience.launchDate}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {experienceFilter === "all" 
                        ? "This object isn't in any Experience yet"
                        : `No ${experienceFilter} experiences found`
                      }
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {experienceFilter === "all" 
                        ? "Create one to start testing."
                        : "Try selecting a different filter."
                      }
                    </p>
                    {experienceFilter === "all" && (
                      <Link href={`/experiences/new?object=${objectDetails.id}`}>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Experience
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">History</h3>
              <p className="text-sm text-muted-foreground">
                Timeline of changes to this object
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                {history.length > 0 ? (
                  <div className="space-y-6">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="flex space-x-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          {index < history.length - 1 && (
                            <div className="w-px h-12 bg-border mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{entry.date}</span>
                            <Badge variant="outline" className="text-xs">
                              {entry.version}
                            </Badge>
                          </div>
                          <div className="text-sm text-foreground">{entry.action}</div>
                          <div className="text-sm text-muted-foreground">{entry.details}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No history available</h3>
                    <p className="text-muted-foreground">
                      History tracking will begin with the next manifest update.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ConsoleLayout>
  );
}