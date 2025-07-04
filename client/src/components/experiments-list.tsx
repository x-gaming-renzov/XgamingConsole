import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube, MoreHorizontal, Play, Pause, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExperimentsListProps {
  projectId: number;
}

export default function ExperimentsList({ projectId }: ExperimentsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const { data: experiments, isLoading } = useQuery({
    queryKey: ["/api/experiments", { projectId }],
    queryFn: async () => {
      const response = await fetch(`/api/experiments?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }
      return response.json();
    },
  });

  const updateExperimentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PUT", `/api/experiments/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Experiment updated",
        description: "The experiment has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update experiment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'experiment-status-running';
      case 'completed':
        return 'experiment-status-completed';
      case 'draft':
        return 'experiment-status-draft';
      case 'paused':
        return 'experiment-status-paused';
      default:
        return 'experiment-status-draft';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3" />;
      case 'completed':
        return <StopCircle className="w-3 h-3" />;
      case 'paused':
        return <Pause className="w-3 h-3" />;
      default:
        return <TestTube className="w-3 h-3" />;
    }
  };

  const handleStatusChange = (experimentId: number, newStatus: string) => {
    updateExperimentMutation.mutate({
      id: experimentId,
      updates: { status: newStatus },
    });
  };

  const getFilteredExperiments = () => {
    if (!experiments) return [];
    
    switch (activeTab) {
      case 'running':
        return experiments.filter((exp: any) => exp.status === 'running');
      case 'completed':
        return experiments.filter((exp: any) => exp.status === 'completed');
      case 'draft':
        return experiments.filter((exp: any) => exp.status === 'draft');
      default:
        return experiments;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="text-center p-4 bg-background rounded-lg">
                      <Skeleton className="h-4 w-20 mb-2 mx-auto" />
                      <Skeleton className="h-6 w-12 mx-auto" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filteredExperiments = getFilteredExperiments();

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="running">Running</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {filteredExperiments.length > 0 ? (
            filteredExperiments.map((experiment: any) => (
              <Card key={experiment.id} className="gaming-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <TestTube className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{experiment.name}</h3>
                        <p className="text-sm text-muted-foreground">{experiment.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(experiment.status)}>
                        {getStatusIcon(experiment.status)}
                        <span className="ml-1 capitalize">{experiment.status}</span>
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Traffic Split</p>
                      <p className="text-xl font-bold text-foreground">{experiment.trafficSplit}</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Target Audience</p>
                      <p className="text-xl font-bold text-foreground">
                        {experiment.targetAudience.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="text-xl font-bold text-foreground">
                        {experiment.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">
                          {experiment.variants?.variantA?.name || "Variant A"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">
                          {experiment.variants?.variantB?.name || "Variant B"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {experiment.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(experiment.id, 'running')}
                          disabled={updateExperimentMutation.isPending}
                        >
                          Start Test
                        </Button>
                      )}
                      {experiment.status === 'running' && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusChange(experiment.id, 'completed')}
                          disabled={updateExperimentMutation.isPending}
                        >
                          Stop Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <TestTube className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
                No {activeTab === 'all' ? '' : activeTab} personalizations found
              </h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === 'all' 
                  ? "Create your first FTUE personalization to optimize onboarding"
                  : `No personalizations in ${activeTab} state. Create a new personalization to get started.`
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
