import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChevronLeft, 
  Users,
  Target,
  Calendar,
  Edit2,
  ExternalLink
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import ExperienceForm from "@/components/experience-form";
import { apiRequest } from "@/lib/queryClient";

interface SegmentDetails {
  id: string;
  name: string;
  description: string;
  rule_config: {
    conditions: Array<{
      field: string;
      operator: string;
      value: string | string[] | number | boolean;
    }>;
  };
  createdAt: string;
  modifiedAt: string;
  experience_segments: ExperienceSegment[];
}

interface ExperienceSegment {
  pid: string;
  target_percentage: number;
  experience: Experience;
  personalisations: PersonalisationMapping[];
  priority: number;
  created_at: string;
  modified_at: string;
}

interface Experience {
  pid: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'completed' | 'paused';
  created_at: string;
  modified_at: string;
}

interface PersonalisationMapping {
  pid: string;
  personalisation_id: string;
  target_percentage: number;
  personalisation: Personalisation;
}

interface Personalisation {
  pid: string;
  name: string;
  description: string;
  is_default: boolean;
  last_updated_at: string;
  created_at: string;
}

export default function SegmentDetails() {
  const [, params] = useRoute("/segments/:id");
  const segmentId = params?.id;

  const { data: segmentDetails, isLoading, error } = useQuery<SegmentDetails>({
    queryKey: [`/api/segments/${segmentId}`],
    queryFn: async () => {
      if (!segmentId) throw new Error("Segment ID is required");
      const response = await apiRequest("GET", `/api/segments/${segmentId}`);
      return await response.json();
    },
    enabled: !!segmentId
  });

  console.log("segmentDetails", segmentDetails)

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paused":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
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

  if (error || !segmentDetails) {
    return (
      <ConsoleLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Segment not found</h3>
            <p className="text-muted-foreground mb-4">The segment you're looking for doesn't exist or has been removed.</p>
            <Link href="/segments">
              <Button variant="outline">Back to Segments</Button>
            </Link>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/segments">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              </Link>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">{segmentDetails.name}</h1>
                </div>
                <p className="text-muted-foreground">
                  {segmentDetails.description || "No description provided"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Segment Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Rules</span>
            </CardTitle>
          </CardHeader>
                     <CardContent>
             {segmentDetails.rule_config?.conditions && segmentDetails.rule_config.conditions.length > 0 ? (
               <div className="space-y-2">
                 {segmentDetails.rule_config.conditions.map((condition, index) => (
                   <div key={index} className="flex items-center space-x-3 py-2 px-3 bg-muted/30 rounded-lg">
                     {index > 0 && (
                       <Badge variant="outline" className="text-xs font-medium">
                         AND
                       </Badge>
                     )}
                     <div className="flex items-center space-x-2 text-sm">
                       <span className="font-medium text-foreground">{condition.field}</span>
                       <span className="text-muted-foreground">{condition.operator}</span>
                       <span className="font-medium text-foreground">
                         {Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value)}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No rules defined for this segment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associated Experiences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Experiences</span>
                <Badge variant="outline" className="ml-2">
                  {segmentDetails.experience_segments?.length || 0}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentDetails.experience_segments && segmentDetails.experience_segments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Experience</TableHead>
                    <TableHead className="w-1/4">Description</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20">Target %</TableHead>
                    <TableHead className="w-1/3">Personalizations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentDetails.experience_segments.map((experienceSegment) => (
                    <TableRow key={experienceSegment.pid} className="hover:bg-muted/30">
                      <TableCell className="w-1/4">
                        <div className="flex items-center space-x-2">
                          <Link href={`/experiences/${experienceSegment.experience.pid}`} className="flex items-center">
                            <span className="font-medium">{experienceSegment.experience.name}</span>
                            <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent ml-2">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="w-1/4">
                        <span className="text-sm text-muted-foreground">
                          {experienceSegment.experience.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell className="w-20">
                        <Badge variant="outline" className={getStatusColor(experienceSegment.experience.status)}>
                          {experienceSegment.experience.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-20">
                        <span className="font-medium">{experienceSegment.target_percentage}%</span>
                      </TableCell>
                      <TableCell className="w-1/3">
                        <div className="flex flex-wrap gap-4">
                          {experienceSegment.personalisations && experienceSegment.personalisations.length > 0 ? (
                            <>
                              {experienceSegment.personalisations
                                .filter(personalisationMapping => !personalisationMapping.personalisation.is_default)
                                .map((personalisationMapping, index) => (
                                  <div key={index} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                                    {personalisationMapping.personalisation.name}
                                    <span className="ml-1 text-blue-600 font-bold">({personalisationMapping.target_percentage}%)</span>
                                  </div>
                                ))}
                              {experienceSegment.personalisations.filter(p => !p.personalisation.is_default).length > 3 && (
                                <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{experienceSegment.personalisations.filter(p => !p.personalisation.is_default).length - 3} more
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No personalizations</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No experiences yet</h3>
                <p className="text-sm mb-4">
                  This segment hasn't been used in any experiences yet.
                </p>
                <ExperienceForm trigger={<Button>Create Experience</Button>} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
} 