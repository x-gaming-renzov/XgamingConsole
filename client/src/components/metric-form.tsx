import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X,
  Plus,
  Trash2,
  BarChart3,
  Settings
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import EventSelector from "./event-selector";
import PropertySelector from "./property-selector";

interface MetricFormProps {
  open: boolean;
  onClose: () => void;
}

interface MetricData {
  name: string;
  description: string;
  type: 'count' | 'aggregation' | 'ratio' | 'retention';
  config: any;
}

interface Filter {
  id: string;
  property: string;
  operator: string;
  value: string;
}

const metricTypes = [
  { value: 'count', label: 'Count Metric', description: 'Count events or unique users' },
  { value: 'aggregation', label: 'Aggregation Metric', description: 'Sum, average, min, or max values' },
  { value: 'ratio', label: 'Ratio Metric', description: 'Conversion rates and ratios' },
  { value: 'retention', label: 'Retention Metric', description: 'User retention analysis' }
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Does not exist' }
];

export default function MetricForm({ open, onClose }: MetricFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<MetricData>({
    name: '',
    description: '',
    type: 'count',
    config: {}
  });
  
  const [filters, setFilters] = useState<Filter[]>([]);
  const [breakdowns, setBreakdowns] = useState<string[]>([]);

  const createMetricMutation = useMutation({
    mutationFn: async (data: MetricData) => {
      const response = await apiRequest("POST", "/api/metrics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'count',
      config: {}
    });
    setFilters([]);
    setBreakdowns([]);
  };

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      property: '',
      operator: 'equals',
      value: ''
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id));
  };

  const updateFilter = (id: string, field: keyof Filter, value: string) => {
    setFilters(filters.map(filter => 
      filter.id === id ? { ...filter, [field]: value } : filter
    ));
  };

  const addBreakdown = () => {
    setBreakdowns([...breakdowns, '']);
  };

  const removeBreakdown = (index: number) => {
    setBreakdowns(breakdowns.filter((_, i) => i !== index));
  };

  const updateBreakdown = (index: number, value: string) => {
    const updated = [...breakdowns];
    updated[index] = value;
    setBreakdowns(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build config based on metric type
    let config: any = {
      time_granularity: 'daily',
      group_by: breakdowns.filter(b => b.trim() !== ''),
      filters: filters.reduce((acc, filter) => {
        if (filter.property && filter.value) {
          acc[filter.property] = {
            operator: filter.operator,
            value: filter.value
          };
        }
        return acc;
      }, {} as any)
    };

    // Add type-specific config
    switch (formData.type) {
      case 'count':
        config.event_name = formData.config.event_name || 'user_login';
        config.distinct = formData.config.distinct || false;
        break;
      case 'aggregation':
        config.event_name = formData.config.event_name || 'purchase';
        config.property = formData.config.property || 'amount';
        config.aggregation = formData.config.aggregation || 'sum';
        break;
      case 'ratio':
        config.numerator = {
          event_name: formData.config.numerator_event || 'purchase',
          filters: {}
        };
        config.denominator = {
          event_name: formData.config.denominator_event || 'user_login',
          filters: {}
        };
        break;
      case 'retention':
        config.initial_event = {
          event_name: formData.config.initial_event || 'user_signup',
          filters: {}
        };
        config.return_event = {
          event_name: formData.config.return_event || 'user_login',
          filters: {}
        };
        config.retention_window = formData.config.retention_window || '7d';
        break;
    }

    createMetricMutation.mutate({
      ...formData,
      config
    });
  };

  const selectedMetricType = metricTypes.find(type => type.value === formData.type);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[45vw] min-w-[700px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Create New Metric</SheetTitle>
              <SheetDescription>
                Define a new metric to track key performance indicators
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Metric Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Active Users"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this metric measures..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Metric Configuration */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Configuration</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Metric Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value, config: {} })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select metric type" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <p className="font-medium">{type.label}</p>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type-specific configuration */}
              <div className="space-y-4">
                {formData.type === 'count' && (
                  <>
                    <EventSelector
                      label="Event Name"
                      value={formData.config.event_name || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, event_name: value }
                      })}
                      placeholder="Search or enter event name"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="distinct"
                        checked={formData.config.distinct || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          config: { ...formData.config, distinct: checked }
                        })}
                      />
                      <Label htmlFor="distinct" className="text-sm">Count unique users only</Label>
                    </div>
                  </>
                )}

                {formData.type === 'aggregation' && (
                  <>
                    <EventSelector
                      label="Event Name"
                      value={formData.config.event_name || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, event_name: value }
                      })}
                      placeholder="Search or enter event name"
                    />
                    <PropertySelector
                      label="Property to Aggregate"
                      value={formData.config.property || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, property: value }
                      })}
                      placeholder="Search or enter property name"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="aggregation">Aggregation Type</Label>
                      <Select
                        value={formData.config.aggregation || ''}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          config: { ...formData.config, aggregation: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select aggregation type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="min">Minimum</SelectItem>
                          <SelectItem value="max">Maximum</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {formData.type === 'ratio' && (
                  <>
                    <EventSelector
                      label="Numerator Event"
                      value={formData.config.numerator_event || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, numerator_event: value }
                      })}
                      placeholder="Search numerator event"
                    />
                    <EventSelector
                      label="Denominator Event"
                      value={formData.config.denominator_event || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, denominator_event: value }
                      })}
                      placeholder="Search denominator event"
                    />
                  </>
                )}

                {formData.type === 'retention' && (
                  <>
                    <EventSelector
                      label="Initial Event"
                      value={formData.config.initial_event || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, initial_event: value }
                      })}
                      placeholder="Search initial event"
                    />
                    <EventSelector
                      label="Return Event"
                      value={formData.config.return_event || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        config: { ...formData.config, return_event: value }
                      })}
                      placeholder="Search return event"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="retention_window">Retention Window</Label>
                      <Select
                        value={formData.config.retention_window || ''}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          config: { ...formData.config, retention_window: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time window" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1d">1 Day</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                          <SelectItem value="14d">14 Days</SelectItem>
                          <SelectItem value="30d">30 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Filters</h3>
              <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                <Plus className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </div>
            
            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No filters added. Click "Add Filter" to add conditions.</p>
            ) : (
              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.id} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <PropertySelector
                          label="Property"
                          value={filter.property}
                          onChange={(value) => updateFilter(filter.id, 'property', value)}
                          placeholder="Search property"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="space-y-2">
                          <Label>Operator</Label>
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="col-span-4">
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                            placeholder="Enter value"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(filter.id)}
                          className="text-destructive hover:text-destructive mb-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Breakdowns Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Breakdowns</h3>
              <Button type="button" variant="outline" size="sm" onClick={addBreakdown}>
                <Plus className="w-4 h-4 mr-2" />
                Add Breakdown
              </Button>
            </div>
            
            {breakdowns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No breakdowns added. Click "Add Breakdown" to group by properties.</p>
            ) : (
              <div className="space-y-3">
                {breakdowns.map((breakdown, index) => (
                  <div key={index} className="flex items-end space-x-3">
                    <div className="flex-1">
                      <PropertySelector
                        label={`Breakdown ${index + 1}`}
                        value={breakdown}
                        onChange={(value) => updateBreakdown(index, value)}
                        placeholder="Search property to group by"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBreakdown(index)}
                      className="text-destructive hover:text-destructive mb-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Submit Section */}
          <div className="flex items-center justify-end space-x-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMetricMutation.isPending || !formData.name}
            >
              {createMetricMutation.isPending ? "Creating..." : "Create Metric"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
} 