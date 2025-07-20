import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  Layers, 
  FileText, 
  Sliders,
  Clock,
  ExternalLink,
  Settings,
  CirclePlay
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";

interface ObjectDetails {
  id: string;
  name: string;
  type: string;
  description: string;
  keys_config: Record<string, {
    type: string;
    description: string;
    default: any;
  }>;
  createdAt: string;
  isActive: boolean;
  defaultVariant: Record<string, any>;
  experiences: {
    experience_id: string;
    experience: {
      pid: string;
      name: string;
      description: string;
      status: string;
    }
  }[];
}



export default function ObjectDetails() {
  const [, params] = useRoute("/objects/:id");
  const objectId = params?.id;

  const { data: objectDetails, isLoading } = useQuery<ObjectDetails>({
    queryKey: [`/api/objects/${objectId}`],
    enabled: !!objectId
  });

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "level":
        return <Layers className="w-4 h-4" />;
      case "popup":
        return <FileText className="w-4 h-4" />;
      case "param":
        return <Sliders className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "level":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "popup":
        return "bg-green-50 text-green-700 border-green-200";
      case "param":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "paused":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/objects">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{objectDetails.name}</h1>
                <Badge variant="outline" className={getTypeColor(objectDetails.type)}>
                  <span className="flex items-center space-x-1">
                    {getTypeIcon(objectDetails.type)}
                    <span>{objectDetails.type}</span>
                  </span>
                </Badge>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${objectDetails.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`text-sm font-medium ${objectDetails.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                    {objectDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground">
                {objectDetails.description || "No description provided"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Object Details */}
            <Card>
              <CardHeader>
                <CardTitle>Object Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                Connected Experience
                {/* {objectDetails.experience && (
                  <div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Connected Experience</Label>
                    </div>
                    <Link href={`/experiences/${objectDetails.experience.pid}`}>
                      <div className="mt-1 rounded-lg py-2 hover:bg-muted/50 cursor-pointer transition-colors group inline-block">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <CirclePlay className="w-5 h-5 text-purple-500 flex-shrink-0" />
                            <span className="font-medium transition-colors">{objectDetails.experience.name}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground transition-colors" />
                          </div>
                          <Badge variant="outline" className={getStatusColor(objectDetails.experience.status)}>
                            {objectDetails.experience.status}
                          </Badge>
                        </div>
                        {objectDetails.experience.description && (
                          <p className="text-sm text-muted-foreground mt-2">{objectDetails.experience.description}</p>
                        )}
                      </div>
                    </Link>
                  </div>
                )} */}

                {/* Object Schema */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Object Schema</Label>
                  <div className="mt-2">
                    {Object.keys(objectDetails.keys_config).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Default Value</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(objectDetails.keys_config).map(([key, config], index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <code className="text-sm bg-muted px-2 py-1 rounded">{key}</code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {config.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{config.default?.toString() || "N/A"}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{config.description || "No description"}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No schema defined for this object
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experiences */}
            <Card>
              <CardHeader>
                <CardTitle>Experiences ({objectDetails.experiences.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {objectDetails.experiences.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {objectDetails.experiences.map(({ experience_id, experience }) => (
                      <Link key={experience.pid} href={`/experiences/${experience.pid}`}>
                        <div className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CirclePlay className="w-5 h-5 text-purple-500 flex-shrink-0" />
                              <div className="flex flex-1 space-x-2">
                                <div>
                                  <div className="flex items-start">
                                    <h4 className="font-medium text-foreground transition-colors">
                                      {experience.name}
                                    </h4>
                                  </div>
                                  {experience.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {experience.description}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Badge variant="outline" className={`${getStatusColor(experience.status)} mt-2 ml-2`}>
                                    {experience.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <CirclePlay className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No experiences found</h3>
                    <p className="text-muted-foreground mb-4">
                      This object is not currently used in any experiences.
                    </p>
                    <Link href="/experiences">
                      <Button variant="outline">
                        Browse Experiences
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}
