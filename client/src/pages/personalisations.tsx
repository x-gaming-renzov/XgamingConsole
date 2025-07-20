import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Target,
  Sparkles,
  Users,
  TrendingUp,
  Gamepad2,
  Zap,
  ChevronRight,
  Calendar,
  BarChart3,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import PersonalisationForm from "@/components/personalisation-form";
import { useLocation } from "wouter";

interface Experience {
  pid: string;
  name: string;
  description: string;
  status: string;
  features: { pid: string }[];
  variants: { pid: string }[];
}

interface Personalisation {
  pid: string;
  name: string;
  description: string;
  experience_id: string;
  priority: number;
  rollout_percentage: number;
  rule_config: {
    conditions?: Array<{
      field: string;
      operator: string;
      value: string;
      type: string;
    }>;
  };
  experience_variants: Array<{
    target_percentage: number;
    experience_variant: {
      name: string;
      description: string;
      is_default: boolean;
    };
  }>;
}

export default function Personalisations() {
  const [activeExperience, setActiveExperience] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPersonalisationForm, setShowPersonalisationForm] = useState(false);
  const [expandedPersonalisations, setExpandedPersonalisations] = useState<Record<string, boolean>>({});
  const [, setLocation] = useLocation();

  // Fetch experiences for vertical tabs
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  // Fetch personalisations for active experience
  const { data: personalisations = [], isLoading: personalisationsLoading } = useQuery<Personalisation[]>({
    queryKey: [`/api/personalisations/personalised-experiences/${activeExperience}`],
    enabled: !!activeExperience,
  });

  
  // Set first experience as active when experiences load
  useEffect(() => {
    if (experiences.length > 0 && !activeExperience) {
      setActiveExperience(experiences[0].pid);
    }
  }, [experiences, activeExperience]);

  // Sort personalisations by priority desc and filter by search
  const filteredPersonalisations = personalisations
    .sort((a, b) => b.priority - a.priority)
    .filter((personalisation) =>
      personalisation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      personalisation.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getExperienceStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": return "bg-green-500";
      case "draft": return "bg-gray-400";
      case "paused": return "bg-yellow-500";
      case "completed": return "bg-purple-500";
      default: return "bg-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const togglePersonalisationExpansion = (personalisationId: string) => {
    setExpandedPersonalisations(prev => ({
      ...prev,
      [personalisationId]: !prev[personalisationId]
    }));
  };

  const handleCreatePersonalisation = () => {
    if (activeExperience) {
      setLocation(`/create-personalisation?experienceId=${activeExperience}`);
    } else {
      setLocation('/create-personalisation');
    }
  };

  // Color variables for variant distribution
  const getVariantColor = (index: number) => {
    const colors = [
      'bg-primary',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500'
    ];
    return colors[index] || 'bg-gray-500';
  };

  return (
    <>
      <ConsoleLayout>
        <div className="flex-1">
          {/* Hero Header */}
          <div className="relative overflow-hidden">
            <div className="relative p-6">
          <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
            <div>
                      <h1 className="text-4xl font-bold text-foreground">
                Personalisations
              </h1>
                      <p className="text-lg text-muted-foreground mt-1">
                        Create magical experiences that adapt to your players
              </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8 pt-0">
            <div className="flex gap-4 h-[calc(100vh-250px)]">
              {/* Vertical Experience Tabs */}
              <div className="w-80 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Experiences</h3>
                </div>
                
                <div className="space-y-3">
                  {experiencesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    experiences.map((experience) => (
                      <Card
                        key={experience.pid}
                        className={`group cursor-pointer border transition-all duration-200 ${
                          activeExperience === experience.pid
                            ? "border-green-500 bg-green-50 shadow-md dark:bg-green-950/30"
                            : "border-slate-200/60 bg-blue-50/60 hover:border-slate-300/80 hover:shadow-md hover:bg-blue-100/80 dark:border-slate-700/40 dark:bg-blue-950/20 dark:hover:border-slate-600/60 dark:hover:bg-blue-900/30"
                        }`}
                        onClick={() => setActiveExperience(experience.pid)}
                      >
                        <CardContent className="p-4 relative">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-8 rounded-full flex-shrink-0 ${
                              activeExperience === experience.pid 
                                ? "bg-green-500" 
                                : `${getExperienceStatusColor(experience.status)} opacity-60 group-hover:opacity-80`
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-medium text-sm truncate ${
                                  activeExperience === experience.pid 
                                    ? "text-green-800 dark:text-green-200" 
                                    : "text-foreground group-hover:text-foreground/90"
                                }`}>
                                  {experience.name}
                                </h4>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                                  activeExperience === experience.pid
                                    ? "bg-green-100 dark:bg-green-900/50"
                                    : "bg-muted/50 group-hover:bg-muted/70"
                                }`}>
                                  <Gamepad2 className={`w-3 h-3 ${
                                    activeExperience === experience.pid
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-muted-foreground group-hover:text-muted-foreground/80"
                                  }`} />
                                </div>
                              </div>
                              {experience.description && (
                                <p className={`text-xs truncate mt-1 ${
                                  activeExperience === experience.pid
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground group-hover:text-muted-foreground/80"
                                }`}>
                                  {experience.description}
                                </p>
                              )}
                            </div>
                            {activeExperience === experience.pid ? (
                              <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <div className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {experiences.length === 0 && !experiencesLoading && (
                  <Card className="p-8 text-center border-dashed border-2">
                    <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Experiences</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first experience to get started
                    </p>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Experience
                    </Button>
                  </Card>
                )}
              </div>

              {/* Vertical Separator */}
              <div className="w-px bg-gradient-to-b from-transparent via-border to-transparent" />

              {/* Personalisations Content */}
              <div className="flex-1 flex flex-col pl-2">
                {/* Fixed Header Section */}
                <div className="space-y-4 pb-4">
                  {/* Search Bar with Create Button */}
          <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search personalisations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 bg-card border-border rounded-xl text-lg shadow-sm"
              />
            </div>
                    <Button
                       onClick={handleCreatePersonalisation}
                       variant="outline"
                       className="h-12 px-6 bg-green-50 hover:bg-green-100 text-green-800 hover:text-green-900 border border-green-500 hover:border-green-600 shadow-sm hover:shadow-md font-semibold transition-all duration-200 dark:bg-green-950/30 dark:text-green-500 dark:hover:text-green-600 dark:border-green-700 dark:hover:border-green-800"
                       disabled={!activeExperience}
                     >
                       <Plus className="w-4 h-4 mr-2" />
                       Create Personalisation
                     </Button>
          </div>

                  {/* Header */}
                  {activeExperience && (
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">
                        Personalisations
                      </h3>
                      <Badge variant="outline" className="px-3 py-1">
                        {filteredPersonalisations.length} results
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Scrollable Personalisations List */}
                {activeExperience ? (
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-4">

                    {personalisationsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                        ))}
                </div>
              ) : filteredPersonalisations.length > 0 ? (
                      <div className="space-y-4">
                    {filteredPersonalisations.map((personalisation) => (
                          <Card
                            key={personalisation.pid}
                            className="border border-2 border-slate-700/30 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 dark:border-slate-800"
                          >
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                {/* Header */}
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                      <h4 className="text-lg font-semibold">
                                        {personalisation.name}
                                      </h4>
                                      {personalisation.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {personalisation.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-lg font-bold text-primary">
                                            {personalisation.rollout_percentage}%
                                          </span>
                                          <span className="text-sm text-muted-foreground">Rollout</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          Priority #{personalisation.priority}
                                        </Badge>
                                      </div>
                                  </div>
                                </div>

                                {/* Experience Variants Distribution */}
                                {personalisation.experience_variants.length > 0 && (
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-medium text-muted-foreground">Variant Distribution</h5>
                                    <div className="relative">
                                      <div className="w-full bg-muted rounded-full h-8 flex overflow-hidden relative">
                                        {personalisation.experience_variants.map((variant, index) => (
                                          <div
                                            key={index}
                                            className={`h-8 flex items-center justify-center text-white text-xs font-medium relative cursor-pointer hover:opacity-90 transition-opacity ${getVariantColor(index)}`}
                                            style={{ width: `${variant.target_percentage}%` }}
                                            onClick={() => setLocation(`/experiences/${personalisation.experience_id}?tab=variants`)}
                                          >
                                            {variant.target_percentage > 15 && (
                                               <div className="flex items-center space-x-1 px-3 py-1 bg-black/20 rounded-md backdrop-blur-sm">
                                                 <span className="font-bold text-xs leading-none">
                                                   {variant.experience_variant.name}
                                                 </span>
                                                 <div className="w-px h-3 bg-white/30"></div>
                                                 <span className="text-xs font-extrabold leading-none">
                                                   {variant.target_percentage}%
                                                 </span>
                                               </div>
                                             )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* Fallback labels for small segments */}
                                      <div className="flex items-center justify-start space-x-4 mt-4">
                                        {personalisation.experience_variants
                                          .filter(variant => variant.target_percentage <= 15)
                                          .map((variant, index) => (
                                            <div key={index} className="flex items-center space-x-1 text-xs">
                                              <div 
                                                className={`w-2 h-2 rounded-full ${getVariantColor(personalisation.experience_variants.indexOf(variant))}`}
                                              />
                                              <span 
                                                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                                onClick={() => setLocation(`/experiences/${personalisation.experience_id}?tab=variants`)}
                                              >
                                                {variant.experience_variant.name} {variant.target_percentage}%
                                              </span>
                                            </div>
                                          ))
                                        }
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Bottom Row - Targeting Rules and Metrics */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Targeting Rules Section */}
                                  <div className="h-fit border border-blue-200/50 bg-blue-50/30 rounded-xl dark:border-blue-800/30 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                                    <div 
                                      className="flex items-center cursor-pointer p-3"
                                      onClick={() => togglePersonalisationExpansion(personalisation.pid)}
                                    >
                                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-3" />
                                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                        Targeting Rules
                          </span>
                                      <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400">
                                        {personalisation.rule_config?.conditions?.length || 0}
                                      </Badge>
                                      {expandedPersonalisations[personalisation.pid] ? (
                                        <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />
                                      )}
                                    </div>
                                    
                                    {expandedPersonalisations[personalisation.pid] && (
                                      <div className="border-t border-blue-200/50 dark:border-blue-800/30">
                                        <div className="space-y-0">
                                          {personalisation.rule_config?.conditions?.map((condition, index) => (
                                            <div key={index} className="flex items-center space-x-3 py-3 px-4 border-b border-blue-200/30 last:border-b-0 dark:border-blue-800/20">
                                              <span className="text-sm font-medium text-foreground">{condition.field}</span>
                                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400">
                                                {condition.operator}
                                              </Badge>
                                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{condition.value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Performance Metrics Section */}
                                  <div className="h-fit border border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-100/50 rounded-xl dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 transition-colors">
                                    <div 
                                      className="flex items-center cursor-pointer p-3"
                                      onClick={() => togglePersonalisationExpansion(`metrics-${personalisation.pid}`)}
                                    >
                                      <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-3" />
                                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        Metrics
                          </span>
                                      <Badge variant="outline" className="ml-2 text-xs border-emerald-300 text-emerald-600 dark:border-emerald-600 dark:text-emerald-400">
                                        4 KPIs
                                      </Badge>
                                      {expandedPersonalisations[`metrics-${personalisation.pid}`] ? (
                                        <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-auto" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-auto" />
                                      )}
                                    </div>
                                    
                                    {expandedPersonalisations[`metrics-${personalisation.pid}`] && (
                                      <div className="border-t border-emerald-200/50 dark:border-emerald-800/30">
                                        <div className="space-y-0">
                                          {/* Conversion Rate */}
                                          <div className="flex items-center justify-between py-3 px-4 border-b border-emerald-200/30 dark:border-emerald-800/20">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">Conversion</div>
                                                <div className="text-xs text-muted-foreground">vs baseline 12.4%</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-lg font-bold text-foreground">14.8%</div>
                                              <div className="flex items-center space-x-1 justify-end">
                                                <TrendingUp className="w-3 h-3 text-green-500" />
                                                <span className="text-xs font-semibold text-green-600">+2.4%</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Engagement Rate */}
                                          <div className="flex items-center justify-between py-3 px-4 border-b border-emerald-200/30 dark:border-emerald-800/20">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">Engagement</div>
                                                <div className="text-xs text-muted-foreground">vs baseline 63.1%</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-lg font-bold text-foreground">68.2%</div>
                                              <div className="flex items-center space-x-1 justify-end">
                                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                                <span className="text-xs font-semibold text-blue-600">+5.1%</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Session Length */}
                                          <div className="flex items-center justify-between py-3 px-4 border-b border-emerald-200/30 dark:border-emerald-800/20">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">Session</div>
                                                <div className="text-xs text-muted-foreground">vs baseline 4.0 min</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-lg font-bold text-foreground">4.2 min</div>
                                              <div className="flex items-center space-x-1 justify-end">
                                                <TrendingUp className="w-3 h-3 text-purple-500" />
                                                <span className="text-xs font-semibold text-purple-600">+12s</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Users Reached */}
                                          <div className="flex items-center justify-between py-3 px-4">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">Users Reached</div>
                                                <div className="text-xs text-muted-foreground">in last 30 days</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-lg font-bold text-foreground">2.4K</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-12 text-center border-dashed border-2 bg-card/50">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center">
                          <Target className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">No Personalisations Found</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          {searchQuery 
                            ? "No personalisations match your search. Try different keywords."
                            : "Create your first personalisation to start delivering tailored experiences to your players."
                          }
                        </p>
                        <Button 
                          onClick={() => setShowPersonalisationForm(true)}
                          className="bg-primary text-white shadow-lg"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                    Create Personalisation
                  </Button>
                      </Card>
                    )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <Card className="p-12 text-center bg-card/50">
                      <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Select an Experience</h3>
                      <p className="text-muted-foreground">
                        Choose an experience from the sidebar to view its personalisations
                      </p>
                    </Card>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </ConsoleLayout>

      <PersonalisationForm
        open={showPersonalisationForm}
        onOpenChange={setShowPersonalisationForm}
        onSuccess={() => {
          // Refresh personalisations for the active experience
        }}
      />
    </>
  );
}
