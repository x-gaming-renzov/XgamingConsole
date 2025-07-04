import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TestTube, TrendingUp, Target, CheckCircle } from "lucide-react";

interface DashboardOverviewProps {
  projectId: number;
}

export default function DashboardOverview({ projectId }: DashboardOverviewProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard", { projectId }],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'draft':
        return 'bg-gray-500/10 text-gray-500';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <TestTube className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <TestTube className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Personalizations</p>
                <p className="text-2xl font-bold text-foreground">{analytics?.activeExperiments || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+{analytics?.activeExperiments || 0}</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Day-1 Retention</p>
                <p className="text-2xl font-bold text-foreground">{analytics?.avgCompletionRate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+4.2%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Activation Rate</p>
                <p className="text-2xl font-bold text-foreground">{analytics?.dayOneRetention || 0}%</p>
                <p className="text-xs text-muted-foreground">% who reach Level 2</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+1.8%</span> from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Personalizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Personalizations</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.recentExperiments?.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentExperiments.map((experiment: any) => (
                <div key={experiment.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <TestTube className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{experiment.name}</h3>
                      <p className="text-sm text-muted-foreground">{experiment.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge className={getStatusColor(experiment.status)}>
                        {getStatusIcon(experiment.status)}
                        <span className="ml-1 capitalize">{experiment.status}</span>
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {experiment.type?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No experiments yet</h3>
              <p className="text-muted-foreground">
                Create your first FTUE experiment to start optimizing your player onboarding
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
