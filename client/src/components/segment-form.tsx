import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  X,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SegmentRule {
  field: string;
  operator: string;
  value: string | string[] | number | boolean;
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

const OPERATORS = {
  string: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "in", label: "is one of" },
    { value: "not_in", label: "is not one of" },
    { value: "contains", label: "contains" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" }
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "less_than", label: "less than" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than_or_equal", label: "less than or equal" },
    { value: "greater_than_or_equal", label: "greater than or equal" }
  ],
  boolean: [
    { value: "equals", label: "is" }
  ],
  enum: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "in", label: "is one of" },
    { value: "not_in", label: "is not one of" }
  ]
};

interface SegmentFormProps {
  open: boolean;
  onClose: () => void;
}

export default function SegmentForm({ open, onClose }: SegmentFormProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: [{
      field: "",
      operator: "",
      value: ""
    }] as SegmentRule[]
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: "",
      description: "",
      rules: []
    });
  };

  // Reset form when the form opens or closes
  useEffect(() => {
    resetForm();
  }, [open]);

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, {
        field: "",
        operator: "",
        value: ""
      }]
    }));
  };

  const updateRule = (index: number, field: keyof SegmentRule, value: any) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const getAttributeByKey = (key: string) => {
    return ATTRIBUTES.find(attr => attr.key === key);
  };

  const getOperatorsForAttribute = (attributeKey: string) => {
    const attribute = getAttributeByKey(attributeKey);
    if (!attribute) return [];
    return OPERATORS[attribute.type] || [];
  };

  const formatRulesDisplay = (rules: SegmentRule[]) => {
    if (!rules || rules.length === 0) {
      return "No rules defined";
    }

    const formatCondition = (rule: SegmentRule) => {
      const attr = getAttributeByKey(rule.field);
      const value = Array.isArray(rule.value) ? rule.value.join(", ") : rule.value;
      return `${attr?.label || rule.field} ${rule.operator} ${value}`;
    };

    return rules
      .filter(rule => rule.field && rule.operator && rule.value)
      .map(formatCondition)
      .join(" AND ");
  };

  const createSegment = useMutation({
    mutationFn: async (segmentData: any) => {
      const response = await apiRequest("POST", "/api/segments/", segmentData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to create segment:", error);
    }
  });

  const transformRulesToBackendFormat = (rules: SegmentRule[]) => {
    const conditions = rules
      .filter(rule => rule.field && rule.operator && rule.value)
      .map(rule => ({
        field: rule.field,
        operator: rule.operator,
        value: rule.value
      }));

    return { conditions };
  };

  const saveSegment = () => {
    const ruleConfig = transformRulesToBackendFormat(formData.rules);
    const segmentData = {
      name: formData.name,
      description: formData.description,
      rule_config: ruleConfig,
      organisation_id: "default-org",
      app_id: "default-app"
    };
    createSegment.mutate(segmentData);
  };

  const canProceedStep = () => {
    switch (step) {
      case 1: return formData.name.trim().length > 0;
      case 2: return formData.rules.some(rule => rule.field && rule.operator && rule.value);
      case 3: return formData.name.trim().length > 0 && formData.rules.some(rule => rule.field && rule.operator && rule.value);
      default: return false;
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Segment</DialogTitle>
          <DialogTitle>
            <div className="flex items-center mt-4 mb-2">
                {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                    {stepNumber}
                    </div>
                    {stepNumber < 3 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />}
                </div>
                ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="segment-name">Segment Name</Label>
                    <Input
                      id="segment-name"
                      placeholder="e.g., High-Value iOS Users"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment-description">Description (Optional)</Label>
                    <Textarea
                      id="segment-description"
                      placeholder="Describe what this segment represents..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Define Rules */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Define Rules</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Select attributes that define this player group.
                </p>
              </div>

              <div className="space-y-4">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/25">
                    <Select 
                      value={rule.field} 
                      onValueChange={(value) => updateRule(index, "field", value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(
                          ATTRIBUTES.reduce((acc, attr) => {
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
                      disabled={!rule.field}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForAttribute(rule.field).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1">
                      {rule.field && getAttributeByKey(rule.field)?.type === "enum" ? (
                        <Select 
                          value={Array.isArray(rule.value) ? rule.value[0] : rule.value as string} 
                          onValueChange={(value) => updateRule(index, "value", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAttributeByKey(rule.field)?.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : rule.field && getAttributeByKey(rule.field)?.type === "boolean" ? (
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

                <Button variant="outline" onClick={addRule} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Save */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Review & Save</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Review your segment configuration before saving.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-32">Name</td>
                      <td className="px-4 py-3 text-sm font-medium">{formData.name}</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-32">Description</td>
                      <td className="px-4 py-3 text-sm">
                        {formData.description || <span className="text-muted-foreground italic">No description</span>}
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-32 align-top">Rules</td>
                      <td className="px-4 py-3">
                        {formData.rules.filter(rule => rule.field && rule.operator && rule.value).length > 0 ? (
                          <div className="space-y-2">
                            {formData.rules
                              .filter(rule => rule.field && rule.operator && rule.value)
                              .map((rule, index) => {
                                const attr = getAttributeByKey(rule.field);
                                const value = Array.isArray(rule.value) ? rule.value.join(", ") : rule.value;
                                return (
                                  <div key={index} className="flex items-center space-x-2 text-sm">
                                    <span className="font-medium">{attr?.label || rule.field}</span>
                                    <span className="text-muted-foreground">{rule.operator}</span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">No rules defined</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-border mt-2">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step > 1 ? "Previous" : "Cancel"}
          </Button>
          
          <div className="flex space-x-2">
            {step === 3 ? (
              <Button 
                onClick={saveSegment}
                disabled={!canProceedStep() || createSegment.isPending}
              >
                {createSegment.isPending ? "Saving..." : "Save Segment"}
              </Button>
            ) : (
              <Button 
                onClick={() => setStep(step + 1)}
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
  );
} 