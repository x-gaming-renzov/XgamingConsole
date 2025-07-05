import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ConsoleLayout from "@/components/console-layout";
import QuickExperiencePrompt from "@/components/quick-experience-prompt";
import { 
  Plus, 
  Users, 
  Settings,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  Edit2,
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  Wrench
} from "lucide-react";

interface Segment {
  id: string;
  name: string;
  rulesSummary: string;
  avgDailyUsers: number;
  usedIn: string[];
  isAdvanced: boolean;
  rules: SegmentRule[];
  metrics?: {
    d1Retention: number;
    d7Retention: number;
    activation: number;
    activeExperiences: number;
    growthPercent: number;
  };
  experiences?: Experience[];
  pastOutcomes?: PastOutcome[];
}

interface Experience {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  splitPercent: number;
  uplift: number;
}

interface PastOutcome {
  id: string;
  name: string;
  uplift: number;
  completedDate: string;
}

interface SegmentRule {
  attribute: string;
  operator: string;
  value: string | string[];
  group: "and" | "or";
}

interface AttributeDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "enum";
  category: string;
  options?: string[];
}

const ATTRIBUTES: AttributeDefinition[] = [
  // Acquisition
  { key: "utm_source", label: "UTM Source", type: "enum", category: "Acquisition", options: ["facebook", "google", "tiktok", "instagram", "organic"] },
  { key: "utm_campaign", label: "UTM Campaign", type: "string", category: "Acquisition" },
  { key: "ad_group", label: "Ad Group", type: "string", category: "Acquisition" },
  { key: "creative_id", label: "Creative ID", type: "string", category: "Acquisition" },
  
  // User Tier
  { key: "tier", label: "Player Tier", type: "enum", category: "User Tier", options: ["newbie", "mid-core", "pro"] },
  
  // Geography
  { key: "country", label: "Country", type: "enum", category: "Geography", options: ["US", "CA", "GB", "DE", "FR", "JP", "KR", "BR"] },
  { key: "region", label: "Region", type: "string", category: "Geography" },
  
  // Device / App
  { key: "device_os", label: "Device OS", type: "enum", category: "Device", options: ["iOS", "Android"] },
  { key: "app_version", label: "App Version", type: "string", category: "Device" },
  
  // Lifecycle
  { key: "install_age_days", label: "Install Age (Days)", type: "number", category: "Lifecycle" },
  { key: "first_session_date", label: "First Session Date", type: "string", category: "Lifecycle" },
  { key: "returning_player", label: "Returning Player", type: "boolean", category: "Lifecycle" }
];

const ADVANCED_ATTRIBUTES: AttributeDefinition[] = [
  { key: "level_number", label: "Level Number", type: "number", category: "Game Progress" },
  { key: "difficulty_setting", label: "Difficulty Setting", type: "enum", category: "Game Settings", options: ["easy", "normal", "hard"] },
  { key: "tutorial_completed", label: "Tutorial Completed", type: "boolean", category: "Game Progress" }
];

const OPERATORS = {
  string: [
    { value: "=", label: "equals" },
    { value: "≠", label: "not equals" },
    { value: "IN", label: "is one of" },
    { value: "NOT IN", label: "is not one of" }
  ],
  number: [
    { value: "=", label: "equals" },
    { value: "≠", label: "not equals" },
    { value: "<", label: "less than" },
    { value: ">", label: "greater than" },
    { value: "≤", label: "less than or equal" },
    { value: "≥", label: "greater than or equal" }
  ],
  boolean: [
    { value: "=", label: "is" }
  ],
  enum: [
    { value: "=", label: "equals" },
    { value: "≠", label: "not equals" },
    { value: "IN", label: "is one of" },
    { value: "NOT IN", label: "is not one of" }
  ]
};

export default function Segments() {
  const [showQuickPrompt, setShowQuickPrompt] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: "1",
      name: "High-Tier iOS",
      rulesSummary: "tier = pro AND device_os = iOS",
      avgDailyUsers: 3250,
      usedIn: ["Enhanced Onboarding", "VIP Tutorial"],
      isAdvanced: false,
      rules: [
        { attribute: "tier", operator: "=", value: "pro", group: "and" },
        { attribute: "device_os", operator: "=", value: "iOS", group: "and" }
      ],
      metrics: {
        d1Retention: 68,
        d7Retention: 42,
        activation: 85,
        activeExperiences: 2,
        growthPercent: 1.8
      },
      experiences: [
        { id: "exp1", name: "Enhanced Onboarding", status: "active", splitPercent: 70, uplift: 12.3 },
        { id: "exp2", name: "VIP Tutorial", status: "active", splitPercent: 50, uplift: 8.7 }
      ],
      pastOutcomes: [
        { id: "past1", name: "Premium Welcome Flow", uplift: 18.2, completedDate: "2025-06-15" },
        { id: "past2", name: "Elite Badge System", uplift: 14.5, completedDate: "2025-05-20" },
        { id: "past3", name: "Exclusive Content", uplift: 9.1, completedDate: "2025-04-10" }
      ]
    },
    {
      id: "2", 
      name: "TikTok (utm_source)",
      rulesSummary: "utm_source = tiktok",
      avgDailyUsers: 1850,
      usedIn: ["Social Media Onboarding"],
      isAdvanced: false,
      rules: [
        { attribute: "utm_source", operator: "=", value: "tiktok", group: "and" }
      ],
      metrics: {
        d1Retention: 42,
        d7Retention: 28,
        activation: 67,
        activeExperiences: 1,
        growthPercent: 3.2
      },
      experiences: [
        { id: "exp3", name: "Social Media Onboarding", status: "active", splitPercent: 60, uplift: 5.4 }
      ],
      pastOutcomes: [
        { id: "past4", name: "TikTok Creator Flow", uplift: 7.8, completedDate: "2025-06-01" },
        { id: "past5", name: "Viral Features Test", uplift: 4.2, completedDate: "2025-05-15" }
      ]
    },
    {
      id: "3",
      name: "Level-5 Retries ≥ 3",
      rulesSummary: "level_number = 5 AND retry_count ≥ 3",
      avgDailyUsers: 420,
      usedIn: [],
      isAdvanced: true,
      rules: [
        { attribute: "level_number", operator: "=", value: "5", group: "and" }
      ],
      metrics: {
        d1Retention: 35,
        d7Retention: 18,
        activation: 45,
        activeExperiences: 0,
        growthPercent: -2.1
      },
      experiences: [],
      pastOutcomes: [
        { id: "past6", name: "Difficulty Helper", uplift: 8.9, completedDate: "2025-05-30" }
      ]
    }
  ]);

  const [showBuilder, setShowBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [builderData, setBuilderData] = useState({
    name: "",
    rules: [] as SegmentRule[],
    showAdvanced: false,
    estimate: null as number | null
  });

  const resetBuilder = () => {
    setBuilderStep(1);
    setBuilderData({
      name: "",
      rules: [],
      showAdvanced: false,
      estimate: null
    });
  };

  const addRule = (group: "and" | "or" = "and") => {
    setBuilderData(prev => ({
      ...prev,
      rules: [...prev.rules, {
        attribute: "",
        operator: "",
        value: "",
        group
      }]
    }));
  };

  const updateRule = (index: number, field: keyof SegmentRule, value: any) => {
    setBuilderData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeRule = (index: number) => {
    setBuilderData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const getAvailableAttributes = () => {
    const base = ATTRIBUTES;
    return builderData.showAdvanced ? [...base, ...ADVANCED_ATTRIBUTES] : base;
  };

  const getAttributeByKey = (key: string) => {
    return getAvailableAttributes().find(attr => attr.key === key);
  };

  const getOperatorsForAttribute = (attributeKey: string) => {
    const attribute = getAttributeByKey(attributeKey);
    if (!attribute) return [];
    return OPERATORS[attribute.type] || [];
  };

  const formatRulesDisplay = (rules: SegmentRule[]) => {
    if (rules.length === 0) return "";
    
    const groups: { and: SegmentRule[], or: SegmentRule[] } = { and: [], or: [] };
    rules.forEach(rule => {
      if (rule.attribute && rule.operator && rule.value) {
        groups[rule.group].push(rule);
      }
    });

    const formatRule = (rule: SegmentRule) => {
      const attr = getAttributeByKey(rule.attribute);
      const value = Array.isArray(rule.value) ? rule.value.join(", ") : rule.value;
      return `${attr?.label || rule.attribute} ${rule.operator} ${value}`;
    };

    let display = groups.and.map(formatRule).join(" AND ");
    if (groups.or.length > 0) {
      display += (display ? " OR " : "") + groups.or.map(formatRule).join(" OR ");
    }
    
    return display;
  };

  const estimateSegmentSize = async () => {
    // Simulate API call for segment size estimation
    await new Promise(resolve => setTimeout(resolve, 1000));
    const estimate = Math.floor(Math.random() * 5000) + 500;
    setBuilderData(prev => ({ ...prev, estimate }));
  };

  const saveSegment = () => {
    const newSegment: Segment = {
      id: Date.now().toString(),
      name: builderData.name,
      rulesSummary: formatRulesDisplay(builderData.rules),
      avgDailyUsers: builderData.estimate || 0,
      usedIn: [],
      isAdvanced: builderData.showAdvanced,
      rules: builderData.rules
    };
    
    setSegments(prev => [...prev, newSegment]);
    setShowBuilder(false);
    resetBuilder();
  };

  const deleteSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  const openSegmentDetail = (segment: Segment) => {
    setSelectedSegment(segment);
    setEditedName(segment.name);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedSegment(null);
    setEditingName(false);
  };

  const handleNameEdit = () => {
    if (selectedSegment && editedName.trim()) {
      setSegments(prev => prev.map(seg => 
        seg.id === selectedSegment.id ? { ...seg, name: editedName.trim() } : seg
      ));
      setSelectedSegment(prev => prev ? { ...prev, name: editedName.trim() } : null);
      setEditingName(false);
    }
  };

  const canProceedStep = () => {
    switch (builderStep) {
      case 1: return builderData.name.trim().length > 0;
      case 2: return builderData.rules.some(rule => rule.attribute && rule.operator && rule.value);
      case 3: return builderData.estimate !== null;
      default: return false;
    }
  };

  return (
    <>
      <ConsoleLayout onQuickExperience={() => setShowQuickPrompt(true)}>
        <div className="p-6 space-y-6">
          {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Segments</h1>
          <p className="text-muted-foreground">Define player groups for targeted experiences</p>
        </div>
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button onClick={resetBuilder}>
              <Plus className="w-4 h-4 mr-2" />
              New Segment
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Empty State */}
      {segments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No segments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create one to target an Experience at the right audience.
            </p>
            <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
              <DialogTrigger asChild>
                <Button onClick={resetBuilder}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Segment
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Segments Table */}
      {segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {segments.map((segment) => (
                <div 
                  key={segment.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openSegmentDetail(segment)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium">{segment.name}</h3>
                      {segment.isAdvanced && (
                        <div className="relative group">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 p-1 bg-popover border border-border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Advanced segment
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      {segment.rulesSummary}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-muted-foreground">
                        <Users className="w-4 h-4 inline mr-1" />
                        {segment.avgDailyUsers.toLocaleString()} avg daily users
                      </span>
                      {segment.usedIn.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Used in:</span>
                          {segment.usedIn.map((exp, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSegmentDetail(segment);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSegment(segment.id);
                      }}
                      disabled={segment.usedIn.length > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Builder Modal */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Segment</DialogTitle>
            <div className="flex items-center space-x-4 mt-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    builderStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {step}
                  </div>
                  {step < 3 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="mt-6">
            {/* Step 1: Name */}
            {builderStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="segment-name">Segment Name</Label>
                  <Input
                    id="segment-name"
                    placeholder="e.g., High-Value iOS Users"
                    value={builderData.name}
                    onChange={(e) => setBuilderData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Define Rules */}
            {builderStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Define Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Select attributes that define this player group.
                  </p>
                </div>

                {/* Rule Builder */}
                <div className="space-y-4">
                  {builderData.rules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                      {index > 0 && (
                        <Select 
                          value={rule.group} 
                          onValueChange={(value: "and" | "or") => updateRule(index, "group", value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="and">AND</SelectItem>
                            <SelectItem value="or">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Select 
                        value={rule.attribute} 
                        onValueChange={(value) => updateRule(index, "attribute", value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(
                            getAvailableAttributes().reduce((acc, attr) => {
                              if (!acc[attr.category]) acc[attr.category] = [];
                              acc[attr.category].push(attr);
                              return acc;
                            }, {} as Record<string, AttributeDefinition[]>)
                          ).map(([category, attrs]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                {category}
                              </div>
                              {attrs.map((attr) => (
                                <SelectItem key={attr.key} value={attr.key}>
                                  {attr.label}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={rule.operator} 
                        onValueChange={(value) => updateRule(index, "operator", value)}
                        disabled={!rule.attribute}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorsForAttribute(rule.attribute).map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex-1">
                        {rule.attribute && getAttributeByKey(rule.attribute)?.type === "enum" ? (
                          <Select 
                            value={Array.isArray(rule.value) ? rule.value[0] : rule.value as string} 
                            onValueChange={(value) => updateRule(index, "value", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAttributeByKey(rule.attribute)?.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : rule.attribute && getAttributeByKey(rule.attribute)?.type === "boolean" ? (
                          <Select 
                            value={rule.value as string} 
                            onValueChange={(value) => updateRule(index, "value", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Enter value"
                            value={rule.value as string}
                            onChange={(e) => updateRule(index, "value", e.target.value)}
                          />
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => addRule("and")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add AND Rule
                    </Button>
                    <Button variant="outline" onClick={() => addRule("or")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add OR Group
                    </Button>
                  </div>
                </div>

                {/* Advanced Toggle */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={builderData.showAdvanced}
                        onCheckedChange={(checked) => setBuilderData(prev => ({ ...prev, showAdvanced: checked }))}
                      />
                      <Label>Include object parameters</Label>
                      <div className="relative group">
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-popover border border-border rounded-md shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Use only if you need to target by level or flag parameters.
                        </div>
                      </div>
                    </div>
                  </div>
                  {builderData.showAdvanced && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Advanced segments use game-specific parameters. Ensure your manifest is up to date.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Save */}
            {builderStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Review & Save</h3>
                  <p className="text-sm text-muted-foreground">
                    Review your segment rules and save when ready.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">{builderData.name}</h4>
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatRulesDisplay(builderData.rules)}
                  </p>
                </div>

                <div className="space-y-4">
                  <Button onClick={estimateSegmentSize} disabled={builderData.estimate !== null}>
                    Get Size Estimate
                  </Button>
                  
                  {builderData.estimate !== null && (
                    <Alert>
                      <Users className="w-4 h-4" />
                      <AlertDescription>
                        ≈ {((builderData.estimate / 5000) * 100).toFixed(1)}% of daily players ({builderData.estimate.toLocaleString()} users)
                        <div className="text-xs text-muted-foreground mt-1">
                          Calculated from last 7 days of log-ins.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {builderData.estimate !== null && builderData.estimate < 100 && (
                    <Alert>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Small segment size may affect experiment reliability. Consider broadening your criteria.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => builderStep > 1 ? setBuilderStep(builderStep - 1) : setShowBuilder(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {builderStep > 1 ? "Previous" : "Cancel"}
            </Button>
            
            <div className="flex space-x-2">
              {builderStep === 3 ? (
                <Button 
                  onClick={saveSegment}
                  disabled={!canProceedStep()}
                >
                  Save Segment
                </Button>
              ) : (
                <Button 
                  onClick={() => setBuilderStep(builderStep + 1)}
                  disabled={!canProceedStep()}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
        </Dialog>
        </div>
      </ConsoleLayout>
      
      <QuickExperiencePrompt 
        open={showQuickPrompt} 
        onClose={() => setShowQuickPrompt(false)} 
      />

      {/* Segment Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[480px] overflow-y-auto">
          {selectedSegment && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {editingName ? (
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={handleNameEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameEdit();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        className="text-lg font-semibold"
                        autoFocus
                      />
                    ) : (
                      <span className="text-lg font-semibold">{selectedSegment.name}</span>
                    )}
                    {selectedSegment.isAdvanced && (
                      <Wrench className="w-4 h-4 text-muted-foreground" title="Advanced segment" />
                    )}
                    {!editingName && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingName(true)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </SheetTitle>
                <div className="text-sm font-mono text-muted-foreground">
                  {selectedSegment.rulesSummary}
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span>📈 {selectedSegment.avgDailyUsers.toLocaleString()} avg daily users</span>
                  {selectedSegment.metrics && (
                    <span className={`${selectedSegment.metrics.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedSegment.metrics.growthPercent >= 0 ? '+' : ''}{selectedSegment.metrics.growthPercent}% vs last wk
                    </span>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="edit-rules">Edit Rules</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Key Metrics */}
                    {selectedSegment.metrics && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Key Metrics (last 7 days)</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Card>
                            <CardContent className="p-3">
                              <div className="text-2xl font-bold">{selectedSegment.metrics.d1Retention}%</div>
                              <div className="text-xs text-muted-foreground">Avg D1 Retention</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-3">
                              <div className="text-2xl font-bold">{selectedSegment.metrics.d7Retention}%</div>
                              <div className="text-xs text-muted-foreground">Avg D7 Retention</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-3">
                              <div className="text-2xl font-bold">{selectedSegment.metrics.activation}%</div>
                              <div className="text-xs text-muted-foreground">Avg Activation</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-3">
                              <div className="text-2xl font-bold">{selectedSegment.metrics.activeExperiences}</div>
                              <div className="text-xs text-muted-foreground">Active Experiences</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Active Experiences */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Experiences</h3>
                      {selectedSegment.experiences && selectedSegment.experiences.length > 0 ? (
                        <div className="space-y-2">
                          {selectedSegment.experiences.map((exp) => (
                            <Card key={exp.id} className="cursor-pointer hover:bg-muted/50">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-sm">{exp.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {exp.splitPercent}% split • +{exp.uplift}% uplift
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={exp.status === 'active' ? 'default' : exp.status === 'completed' ? 'secondary' : 'outline'}
                                  >
                                    {exp.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No experiences use this segment yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Past Outcomes */}
                    {selectedSegment.pastOutcomes && selectedSegment.pastOutcomes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Past Outcomes</h3>
                        <div className="space-y-2">
                          {selectedSegment.pastOutcomes
                            .sort((a, b) => b.uplift - a.uplift)
                            .map((outcome) => (
                              <div key={outcome.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div className="text-sm">{outcome.name}</div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-green-600">+{outcome.uplift}%</span>
                                  <span className="text-xs text-muted-foreground">{new Date(outcome.completedDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Segment Size Trend */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Segment Size Trend</h3>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-center h-16 text-muted-foreground">
                            <BarChart3 className="w-8 h-8 mr-2" />
                            <span className="text-sm">28-day trend chart</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Create Experience CTA */}
                    <div className="pt-4">
                      <Button className="w-full" onClick={() => {
                        setShowQuickPrompt(true);
                        closeDrawer();
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Experience
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="edit-rules" className="space-y-6 mt-6">
                    {/* Live Estimate */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Live Estimate</h3>
                        <Button variant="outline" size="sm" onClick={estimateSegmentSize}>
                          <Activity className="w-4 h-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold">{selectedSegment.avgDailyUsers.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">estimated daily users</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Rule Builder */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Edit Rules</h3>
                      <div className="text-sm text-muted-foreground mb-4">
                        Modify the rules that define this segment. Changes will affect all future traffic.
                      </div>
                      
                      {/* Simplified rule display for now */}
                      <div className="space-y-3">
                        {selectedSegment.rules.map((rule, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <div className="flex items-center space-x-2 text-sm">
                                {index > 0 && (
                                  <Badge variant="outline" className="uppercase">
                                    {rule.group}
                                  </Badge>
                                )}
                                <span className="font-mono">{rule.attribute}</span>
                                <span>{rule.operator}</span>
                                <span className="font-medium">{rule.value}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Save Changes */}
                    <div className="flex space-x-2">
                      <Button className="flex-1">
                        Save Changes
                      </Button>
                      <Button variant="outline">
                        Reset
                      </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-border">
                      <div className="text-sm font-medium text-red-600 mb-2">Danger Zone</div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={selectedSegment.usedIn.length > 0}
                        onClick={() => {
                          if (window.confirm('This segment is not used in any active experience. Delete permanently?')) {
                            deleteSegment(selectedSegment.id);
                            closeDrawer();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Segment
                      </Button>
                      {selectedSegment.usedIn.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Cannot delete: used in {selectedSegment.usedIn.length} active experience(s)
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}