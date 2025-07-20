import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layers, FileText, Sliders, AlertCircle, Plus, Activity, Clock } from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";

interface GameObject {
  id: string;
  name: string;
  type: string;
  description: string;
  variants: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  experiences: { experience_id: string }[];
  isActive?: boolean;
}

export default function Objects() {
  const { data: objects, isLoading } = useQuery<GameObject[]>({
    queryKey: ["/api/objects"],
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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Popup":
        return "bg-green-50 text-green-700 border-green-200";
      case "Param":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <>
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Objects</h1>
            </div>
          </div>

          {/* Objects List */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : objects && objects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Object</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Experiences</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objects.map((object) => (
                      <TableRow 
                        key={object.id} 
                        className="group hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/objects/${object.id}`}
                      >
                        <TableCell>
                            <div className="font-medium text-foreground">{object.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground line-clamp-1">{object.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeColor(object.type)}>
                            <span className="flex items-center space-x-1">
                              {getTypeIcon(object.type)}
                              <span>{object.type}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">{object.experiences?.length || 0}</span>
                            <span className="text-sm text-muted-foreground">experiences</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${object.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className={`text-sm font-medium ${object.isActive !== false ? 'text-green-700' : 'text-gray-500'}`}>
                              {object.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No flagged objects yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    We haven't received any flagged objects yet. Push a new build with the Pulse manifest to see levels & pop-ups here.
                  </p>
                  <Button variant="outline">
                    View SDK Documentation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ConsoleLayout>
    </>
  );
}