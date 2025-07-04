import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Trophy, Lightbulb, Target, Users, ArrowUp, ArrowDown } from "lucide-react";

interface TopExperience {
  id: number;
  name: string;
  campaign: string;
  uplift: number;
  confidence: number;
  participants: number;
}

interface CampaignHealth {
  campaign: string;
  d1Delta: number;
  status: "Good" | "Warning" | "Critical";
}

interface InsightIdea {
  id: number;
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  effort: "Low" | "Medium" | "High";
  category: "Onboarding" | "Retention" | "Monetization";
}

export default function Insights() {
  const { data: topExperiences, isLoading: loadingTop } = useQuery<TopExperience[]>({
    queryKey: ["/api/insights/top-experiences"],
  });

  const { data: campaignHealth, isLoading: loadingHealth } = useQuery<CampaignHealth[]>({
    queryKey: ["/api/insights/campaign-health"],
  });

  const { data: ideas, isLoading: loadingIdeas } = useQuery<InsightIdea[]>({
    queryKey: ["/api/insights/ideas"],
  });

  const getHealthColor = (status: string) => {
    switch (status) {
      case "Good":
        return "bg-green-100 text-green-800 border-green-200";
      case "Warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-muted-foreground">Performance analysis and optimization recommendations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Experiences Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Top Performing Experiences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : topExperiences && topExperiences.length > 0 ? (
              <div className="space-y-4">
                {topExperiences.map((experience, index) => (
                  <div key={experience.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{experience.name}</div>
                        <div className="text-sm text-muted-foreground">{experience.campaign}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-600">+{experience.uplift}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {experience.participants.toLocaleString()} participants
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No performance data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Health Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Campaign Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : campaignHealth && campaignHealth.length > 0 ? (
              <div className="space-y-3">
                {campaignHealth.map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <div className="font-medium">{campaign.campaign}</div>
                      <div className="text-sm text-muted-foreground">D1 Retention Delta</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {campaign.d1Delta > 0 ? (
                          <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${campaign.d1Delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {campaign.d1Delta > 0 ? '+' : ''}{campaign.d1Delta}%
                        </span>
                      </div>
                      <Badge variant="outline" className={getHealthColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No campaign data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ideas Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <span>Optimization Ideas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIdeas ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : ideas && ideas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Idea</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Effort</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ideas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{idea.title}</div>
                        <div className="text-sm text-muted-foreground">{idea.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{idea.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getImpactColor(idea.impact)}>
                        {idea.impact}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEffortColor(idea.effort)}>
                        {idea.effort}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button className="text-primary hover:underline text-sm">
                        Create Experience
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Optimization Ideas</h3>
              <p className="text-muted-foreground mb-4">
                Ideas will appear here based on your campaign performance and player behavior patterns
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Test different reward amounts in Level 5</p>
                <p>• Optimize tutorial skip rates for experienced players</p>
                <p>• A/B test welcome popup messaging</p>
                <p>• Experiment with onboarding flow length</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Experience Uplift</p>
                <p className="text-2xl font-bold text-foreground">+7.2%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+1.4%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Winners Rolled Out</p>
                <p className="text-2xl font-bold text-foreground">12</p>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+3</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Players Reached</p>
                <p className="text-2xl font-bold text-foreground">45.2K</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-primary">+12.8K</span> this week
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}