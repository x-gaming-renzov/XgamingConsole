import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layers, FileText, Sliders, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";

interface GameObject {
  id: number;
  name: string;
  type: "Level" | "Popup" | "Param";
  flags: Array<{
    key: string;
    type: "text" | "number" | "boolean";
    defaultValue: any;
    description: string;
  }>;
  lastUsed: string;
  description: string;
}

interface ManifestInfo {
  version: string;
  isStale: boolean;
  lastSync: string;
}

export default function Objects() {
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);
  
  const { data: objects, isLoading } = useQuery<GameObject[]>({
    queryKey: ["/api/objects"],
  });

  const { data: manifest } = useQuery<ManifestInfo>({
    queryKey: ["/api/manifest/info"],
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

  return (
    <>
      <ConsoleLayout onQuickExperience={() => setShowQuickPrompt(true)}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objects</h1>
          <p className="text-muted-foreground">Manage flagged game objects that can be personalized</p>
        </div>

      </div>

      {/* Sync Banner */}
      {manifest && (
        <Alert className={manifest.isStale ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "border-green-500 bg-green-50 dark:bg-green-950/20"}>
          <AlertCircle className={`h-4 w-4 ${manifest.isStale ? "text-orange-600" : "text-green-600"}`} />
          <AlertDescription className={manifest.isStale ? "text-orange-800 dark:text-orange-200" : "text-green-800 dark:text-green-200"}>
            <div className="flex items-center justify-between">
              <span>
                Manifest version {manifest.version} • Last sync: {manifest.lastSync}
                {manifest.isStale && " • Stale (>7 days old)"}
              </span>
              {manifest.isStale && (
                <Button variant="outline" size="sm" className="ml-4">
                  Sync Now
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Objects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Game Objects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : objects && objects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Object</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objects.map((object) => (
                  <TableRow 
                    key={object.id} 
                    className="group hover:bg-accent/50 cursor-pointer"
                    onClick={() => window.location.href = `/objects/${object.id}`}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{object.name}</div>
                        <div className="text-sm text-muted-foreground">{object.description}</div>
                      </div>
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
                      <span className="font-medium">{Array.isArray(object.flags) ? object.flags.length : 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{object.lastUsed || "Never"}</span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Link href={`/experiences/new?object=${object.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Experience
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No flagged objects yet</h3>
              <p className="text-muted-foreground mb-4">
                We haven't received any flagged objects yet. Push a new build with the Pulse manifest to see levels & pop-ups here.
              </p>
              <Button variant="outline">
                View SDK Documentation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Object Types Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Level Objects</h3>
                <p className="text-sm text-muted-foreground">Level parameters, rewards, difficulty</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Modify level progression, starting resources, enemy spawn rates, and completion rewards.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Popup Objects</h3>
                <p className="text-sm text-muted-foreground">UI elements, dialogs, notifications</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Customize onboarding popups, welcome messages, tutorial tooltips, and promotional banners.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sliders className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Parameter Objects</h3>
                <p className="text-sm text-muted-foreground">Feature flags, config values</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Toggle features, adjust game balance, control monetization settings, and AB test new mechanics.
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
      </ConsoleLayout>
      
      <QuickExperiencePrompt 
        open={showQuickPrompt} 
        onClose={() => setShowQuickPrompt(false)} 
      />
    </>
  );
}