import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusIcon, XIcon, PlayIcon, BarChart3Icon, ChevronLeft, CheckIcon, ChevronDownIcon } from "lucide-react";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import ConsoleLayout from "@/components/console-layout";
import { apiRequest } from "@/lib/queryClient";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type MetricType = "count" | "aggregation" | "ratio" | "retention";

enum KeySource {
  EVENT_PROPERTIES = "event_properties",
  USER_PROFILE = "user_profile"
}

interface FilterType {
  key: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=";
  value: string;
  source: KeySource;
}

interface GroupByType {
  key: string;
  source: KeySource;
}

interface EventSchema {
  pid: string;
  event_name: string;
  event_schema: Record<string, any>;
}

interface EventProperty {
  key: string;
  type: string;
  description: string;
}

interface UserProfileKey {
  pid: string;
  key: string;
  type: string;
  description: string;
}

interface FormData {
  event_name?: string;
  distinct?: boolean;
  property?: string;
  aggregation?: "sum" | "avg" | "min" | "max";
  numerator_event?: string;
  denominator_event?: string;
  initial_event?: string;
  return_event?: string;
  retention_window?: string;
}

// Constants
const TIME_RANGES = [
  { value: "1h", label: "1H", description: "Last Hour" },
  { value: "24h", label: "24H", description: "Last 24 Hours" },
  { value: "7d", label: "7D", description: "Last 7 Days" },
  { value: "30d", label: "30D", description: "Last 30 Days" },
  { value: "90d", label: "90D", description: "Last 90 Days" },
];

const GRANULARITIES = [
  { value: "none", label: "Total", description: "No time breakdown" },
  { value: "hourly", label: "Hourly", description: "Break down by hour" },
  { value: "daily", label: "Daily", description: "Break down by day" },
  { value: "weekly", label: "Weekly", description: "Break down by week" },
  { value: "monthly", label: "Monthly", description: "Break down by month" },
];

const METRIC_TYPES = [
  { value: "count", label: "Count", description: "Count events or unique users" },
  { value: "aggregation", label: "Aggregation", description: "Sum, average, min, max of properties" },
  { value: "ratio", label: "Ratio", description: "Compare two events (conversion rates)" },
  { value: "retention", label: "Retention", description: "User retention analysis" },
];

const AGGREGATION_TYPES = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const RETENTION_WINDOWS = [
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function MetricBuilder() {
  // Get metric ID from URL params if editing
  const urlParams = new URLSearchParams(window.location.search);
  const metricId = urlParams.get('id');
  const isEditing = !!metricId;

  const [metricType, setMetricType] = useState<MetricType>("count");
  const [timeRange, setTimeRange] = useState("30d");
  const [granularity, setGranularity] = useState("daily");
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [filters, setFilters] = useState<FilterType[]>([]);
  const [groupByItems, setGroupByItems] = useState<GroupByType[]>([]);
  const [metricName, setMetricName] = useState("");
  const [metricDescription, setMetricDescription] = useState("");
  
  // Command selector states
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [propertySelectorOpen, setPropertySelectorOpen] = useState(false);
  const [initialEventSelectorOpen, setInitialEventSelectorOpen] = useState(false);
  const [returnEventSelectorOpen, setReturnEventSelectorOpen] = useState(false);
  const [groupBySelectorOpen, setGroupBySelectorOpen] = useState<number | null>(null);
  const [filterKeySelectorOpen, setFilterKeySelectorOpen] = useState<number | null>(null);
  
  // Search states for key selectors
  const [groupBySearchTerms, setGroupBySearchTerms] = useState<{[key: number]: string}>({});
  const [filterSearchTerms, setFilterSearchTerms] = useState<{[key: number]: string}>({});
  
  // Individual search terms for different dropdowns
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  
  // Debounced search terms
  const debouncedEventSearch = useDebounce(eventSearchTerm, 300);
  const debouncedPropertySearch = useDebounce(propertySearchTerm, 300);

  // Form data state - moved up to be used in queries
  const [formData, setFormData] = useState<FormData>({
    event_name: "",
    distinct: false,
    property: "",
    aggregation: "sum",
    numerator_event: "",
    denominator_event: "",
    initial_event: "",
    return_event: "",
    retention_window: "7d",
  });
  
  const { toast } = useToast();

  // Fetch existing metric data if editing
  const { data: existingMetric, isLoading: metricLoading } = useQuery({
    queryKey: [`/api/metrics/${metricId}`],
    enabled: isEditing,
  });

  // Fetch events schema
  const { data: eventsSchema = [] } = useQuery<EventSchema[]>({
    queryKey: ["/api/metrics/events-schema"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/metrics/events-schema");
      if (!response.ok) {
        throw new Error(`Failed to fetch events schema: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Fetch user profile keys
  const { data: userProfileKeys = [] } = useQuery<UserProfileKey[]>({
    queryKey: ["/api/metrics/user-profile-keys"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/metrics/user-profile-keys");
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile keys: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Search events with debounced term
  const { data: searchedEvents = [] } = useQuery<EventSchema[]>({
    queryKey: ["/api/metrics/events-schema/search", debouncedEventSearch],
    queryFn: async () => {
      if (!debouncedEventSearch.trim()) return eventsSchema;
      
      const response = await apiRequest("GET", `/api/metrics/events-schema?search=${encodeURIComponent(debouncedEventSearch)}`);
      if (!response.ok) {
        return eventsSchema; // Fallback to cached data on error
      }
      return response.json();
    },
    enabled: !!debouncedEventSearch.trim(),
  });

  // Search user profile keys for group by and filters
  const { data: searchedUserKeys = [] } = useQuery<UserProfileKey[]>({
    queryKey: ["/api/metrics/user-profile-keys/search", debouncedPropertySearch],
    queryFn: async () => {
      if (!debouncedPropertySearch.trim()) return userProfileKeys;
      
      const response = await apiRequest("GET", `/api/metrics/user-profile-keys?search=${encodeURIComponent(debouncedPropertySearch)}`);
      if (!response.ok) {
        return userProfileKeys; // Fallback to cached data on error
      }
      return response.json();
    },
    enabled: !!debouncedPropertySearch.trim(),
  });

  // Extract properties from selected event schema (frontend only)
  const eventProperties: EventProperty[] = React.useMemo(() => {
    if (!formData.event_name) return [];
    
    const selectedEvent = eventsSchema.find(event => event.event_name === formData.event_name);
    if (!selectedEvent || !selectedEvent.event_schema?.properties) return [];
    
    const properties: EventProperty[] = [];
    Object.entries(selectedEvent.event_schema.properties).forEach(([key, value]: [string, any]) => {
      const propType = value?.type || 'string';
      const description = value?.description || '';
      properties.push({
        key,
        type: propType,
        description
      });
    });
    
    return properties;
  }, [eventsSchema, formData.event_name]);

  // Helper functions to prepare data for UI
  const getEventOptions = () => {
    const events = debouncedEventSearch.trim() ? searchedEvents : eventsSchema;
    return events.map(event => ({
      value: event.event_name,
      label: event.event_name.replace(/event_\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  };

  const getPropertyOptions = () => {
    return eventProperties.map(prop => ({
      value: prop.key,
      label: prop.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: prop.type,
      description: prop.description
    }));
  };

  const getKeyOptions = (searchTerm: string = '') => {
    // Use searched data if search term exists, otherwise use cached data
    const keys = searchTerm.trim() ? searchedUserKeys : userProfileKeys;
    
    const profileKeys = keys
      .filter(key => 
        !searchTerm || 
        key.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
              .map(key => ({
          value: key.key,
          label: key.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: key.type === 'str' ? 'string' : key.type === 'int' ? 'integer' : key.type === 'bool' ? 'boolean' : key.type,
          source: KeySource.USER_PROFILE
        }));
    
    // Only include event properties for count & aggregation (single event types)
    if (metricType === 'count' || metricType === 'aggregation') {
      const eventKeys = eventProperties
        .filter(prop => 
          !searchTerm || 
          prop.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prop.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(prop => ({
          value: prop.key,
          label: prop.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: prop.type === 'str' ? 'string' : prop.type === 'int' ? 'integer' : prop.type === 'bool' ? 'boolean' : prop.type,
          source: KeySource.EVENT_PROPERTIES
        }));
      
      return [...eventKeys, ...profileKeys];
    }
    
    // For ratio & retention, only show profile keys (multiple events involved)
    return profileKeys;
  };
  
  // Auto re-run queries when time range or granularity changes
  useEffect(() => {
    if (!loading && chartData !== null && !hasError) {
      onSubmit();
    }
  }, [timeRange, granularity]);

  // Populate form when editing existing metric
  useEffect(() => {
    if (existingMetric && isEditing && typeof existingMetric === 'object') {
      const metric = existingMetric as any; // Type assertion for API response
      setMetricName(metric.name || "");
      setMetricDescription(metric.description || "");
      setMetricType(metric.type || "count");
      
      // Populate form data based on metric type and config
      const config = metric.config || {};
      
      // Set time range and granularity from config if available
      if (config.time_range) setTimeRange(config.time_range);
      if (config.granularity) setGranularity(config.granularity);
      
      // Populate filters
      if (config.filters) {
        const filterArray = Object.entries(config.filters).map(([key, filterData]) => {
          const data = filterData as any;
          return {
            key,
            op: (data.op || "=") as "=" | "!=" | ">" | "<" | ">=" | "<=",
            value: data.value,
            source: (data.source || KeySource.USER_PROFILE) as KeySource
          };
        });
        setFilters(filterArray);
      }
      
      // Populate group by
      if (config.group_by && Array.isArray(config.group_by)) {
        const groupByArray = config.group_by.map((item: any) => {
          return { 
            key: item.key, 
            source: (item.source || KeySource.USER_PROFILE) as KeySource
          };
        });
        setGroupByItems(groupByArray);
      }
      
      // Populate metric-specific form data
      const newFormData = { ...formData };
      
      const eventOptions = getEventOptions();
      const defaultEvent = eventOptions.length > 0 ? eventOptions[0].value : "";
      
      switch (metric.type) {
        case "count":
          newFormData.event_name = config.event_name || defaultEvent;
          newFormData.distinct = config.distinct || false;
          break;
        case "aggregation":
          newFormData.event_name = config.event_name || defaultEvent;
          newFormData.property = config.property || "";
          newFormData.aggregation = config.aggregation || "sum";
          break;
        case "ratio":
          newFormData.numerator_event = config.numerator?.event_name || defaultEvent;
          newFormData.denominator_event = config.denominator?.event_name || (eventOptions.length > 1 ? eventOptions[1].value : defaultEvent);
          break;
        case "retention":
          newFormData.initial_event = config.initial_event?.event_name || defaultEvent;
          newFormData.return_event = config.return_event?.event_name || defaultEvent;
          newFormData.retention_window = config.retention_window || "7d";
          break;
      }
      
      setFormData(newFormData);
      
      // Auto-run query for existing metrics
      setTimeout(async () => {
        try {
          const result = await computeMetric(metric.type, config);
          setChartData(Array.isArray(result) ? result : result.result || []);
          console.log("Chart data:", result);
        } catch (error) {
          console.error("Error loading existing metric data:", error);
          setHasError(true);
        }
      }, 100); // Small delay to ensure form state is updated
    }
  }, [existingMetric, isEditing]);

  // Function to generate full date range for chart
  const generateFullDateRange = (data: any[]) => {
    if (!data || data.length === 0) return [];

    // Parse time range to get the number of days/hours
    const parseTimeRange = (range: string) => {
      const match = range.match(/(\d+)([hdwmy])/);
      if (!match) return { amount: 30, unit: 'd' };
      return { amount: parseInt(match[1]), unit: match[2] };
    };

    const { amount, unit } = parseTimeRange(timeRange);
    const now = new Date();
    const fullRange: any[] = [];

    // Generate date range based on granularity
    let startDate = new Date(now);
    let step = 1;
    let dateUnit: 'hour' | 'day' | 'week' | 'month' = 'day';

    switch (unit) {
      case 'h':
        startDate.setHours(now.getHours() - amount);
        dateUnit = granularity === 'hourly' ? 'hour' : 'day';
        step = granularity === 'hourly' ? 1 : 24;
        break;
      case 'd':
        startDate.setDate(now.getDate() - amount);
        dateUnit = granularity === 'hourly' ? 'hour' : 'day';
        step = granularity === 'hourly' ? 1 : 1;
        break;
      case 'w':
        startDate.setDate(now.getDate() - (amount * 7));
        dateUnit = granularity === 'weekly' ? 'week' : 'day';
        break;
      case 'm':
        startDate.setMonth(now.getMonth() - amount);
        dateUnit = granularity === 'monthly' ? 'month' : 'day';
        break;
    }

    // Create the full range
    const current = new Date(startDate);
    
    // Create a more robust data mapping
    const dataMap = new Map();
    data.forEach(item => {
      const itemDate = typeof item.period === 'number' ? new Date(item.period) : new Date(item.period);
      let key;
      
      if (granularity === 'hourly') {
        key = itemDate.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      } else if (granularity === 'weekly') {
        // Use Monday of the week as key
        const monday = new Date(itemDate);
        monday.setDate(itemDate.getDate() - itemDate.getDay() + 1);
        key = monday.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = itemDate.toISOString().substring(0, 7); // YYYY-MM
      } else {
        key = itemDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      dataMap.set(key, item.value);
    });

    while (current <= now) {
      let periodKey;
      
      if (granularity === 'hourly') {
        periodKey = current.toISOString().substring(0, 13);
      } else if (granularity === 'weekly') {
        const monday = new Date(current);
        monday.setDate(current.getDate() - current.getDay() + 1);
        periodKey = monday.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        periodKey = current.toISOString().substring(0, 7);
      } else {
        periodKey = current.toISOString().split('T')[0];
      }

      fullRange.push({
        period: current.getTime(),
        value: dataMap.get(periodKey) || 0
      });

      // Increment based on granularity
      if (granularity === 'hourly') {
        current.setHours(current.getHours() + 1);
      } else if (granularity === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (granularity === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    return fullRange;
  };

  // Get full range data for display
  const fullRangeData = (chartData && chartData.length > 0) ? generateFullDateRange(chartData) : [];

  const form = useForm({
    defaultValues: formData,
  });

  // Update form data
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle filter management
  const addFilter = () => {
    setFilters([...filters, { key: "", op: "=", value: "", source: KeySource.USER_PROFILE }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof FilterType, value: string | KeySource) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  // Handle group by management
  const addGroupBy = () => {
    setGroupByItems([...groupByItems, { key: "", source: KeySource.USER_PROFILE }]);
  };

  const removeGroupBy = (index: number) => {
    setGroupByItems(groupByItems.filter((_, i) => i !== index));
  };

  const updateGroupBy = (index: number, value: string) => {
    const newGroupBy = [...groupByItems];
    // Find the source of the selected key
    const selectedKey = getKeyOptions(groupBySearchTerms[index] || '').find(key => key.value === value);
    newGroupBy[index] = { 
      key: value, 
      source: selectedKey?.source || KeySource.USER_PROFILE
    };
    setGroupByItems(newGroupBy);
  };

  // Convert filters array to enhanced object for backend
  const getFiltersObject = () => {
    const filtersObj: Record<string, { value: string; source: KeySource; op: string }> = {};
    filters.forEach(filter => {
      if (filter.key && filter.value) {
        filtersObj[filter.key] = {
          value: filter.value,
          source: filter.source,
          op: filter.op
        };
      }
    });
    return filtersObj;
  };

  // Get group by array with source information for backend
  const getGroupByArray = () => {
    return groupByItems
      .filter(item => item.key !== "")
      .map(item => ({
        key: item.key,
        source: item.source
      }));
  };

  const computeMetric = async (metricType: MetricType, config: any) => {
    const requestBody = {
      type: metricType,
      config: config,
    };

    console.log("Sending request:", requestBody);

    setLoading(true);

    const response = await apiRequest("POST", "/api/metrics/compute", requestBody);

    setLoading(false);

    if (!response.ok) {
      throw new Error(`Failed to compute metric: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Submit handler
  async function onSubmit(e?: React.FormEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setHasError(false); // Clear any previous error state
    
    try {
      // Prepare config based on metric type
      let config: any = {
        time_range: timeRange,
        granularity,
        group_by: getGroupByArray(),
        filters: getFiltersObject(),
      };

      // Add metric-specific fields
      switch (metricType) {
        case "count":
          config.event_name = formData.event_name;
          config.distinct = formData.distinct || false;
          break;
        case "aggregation":
          config.event_name = formData.event_name;
          config.property = formData.property;
          config.aggregation = formData.aggregation;
          break;
        case "ratio":
          config.numerator = {
            event_name: formData.numerator_event,
            filters: {},
          };
          config.denominator = {
            event_name: formData.denominator_event,
            filters: {},
          };
          break;
        case "retention":
          config.initial_event = {
            event_name: formData.initial_event,
            filters: {},
          };
          config.return_event = {
            event_name: formData.return_event,
            filters: {},
          };
          config.retention_window = formData.retention_window;
          break;
      }

      const result = await computeMetric(metricType, config);
      setChartData(Array.isArray(result) ? result : result.result || []);
    } catch (error: any) {
      console.error("Metric computation error:", error);
      setHasError(true); // Set error state to prevent infinite loop
      toast({
        title: "Error",
        description: error.message || "Failed to compute metric",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Save metric function
  async function saveMetric() {
    if (!metricName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a metric name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Prepare config based on metric type
      let config: any = {
          time_range: timeRange,
          granularity,
        group_by: getGroupByArray(),
        filters: getFiltersObject(),
      };

      // Add metric-specific fields
      switch (metricType) {
        case "count":
          config.event_name = formData.event_name;
          config.distinct = formData.distinct || false;
          break;
        case "aggregation":
          config.event_name = formData.event_name;
          config.property = formData.property;
          config.aggregation = formData.aggregation;
          break;
        case "ratio":
          config.numerator = {
            event_name: formData.numerator_event,
            filters: {},
          };
          config.denominator = {
            event_name: formData.denominator_event,
            filters: {},
          };
          break;
        case "retention":
          config.initial_event = {
            event_name: formData.initial_event,
            filters: {},
          };
          config.return_event = {
            event_name: formData.return_event,
            filters: {},
          };
          config.retention_window = formData.retention_window;
          break;
      }

      const metricData = {
        name: metricName,
        description: metricDescription,
        type: metricType,
        config,
      };

      console.log("Saving metric:", metricData);

      let response;
      if (isEditing) {
        // Update existing metric
        response = await apiRequest("PUT", `/api/metrics/${metricId}`, metricData);
      } else {
        // Create new metric
        response = await apiRequest("POST", "/api/metrics", metricData);
      }

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'save'} metric: ${response.statusText}`);
      }

      toast({
        title: "Success",
        description: `Metric ${isEditing ? 'updated' : 'saved'} successfully`,
      });

      // Navigate back to metrics page
      window.location.href = '/metrics';
    } catch (error: any) {
      console.error("Save metric error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save metric",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const chartConfig = {
    value: {
      label: "Metric Value",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  // Show loading state while fetching existing metric
  if (isEditing && metricLoading) {
    return (
      <ConsoleLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading metric data...</p>
          </div>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="flex-1 flex flex-col h-screen bg-background">
        {/* Fixed Header */}
        <div className="flex-none bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/metrics'}
                className="mr-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3Icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {isEditing ? 'Edit Metric' : 'Metric Builder'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? 'Update and analyze your metric' : 'Build and analyze custom metrics'}
                </p>
              </div>
            </div>
            
            {/* Save Metric Button */}
              <Button
              className="px-6 py-2 bg-primary text-white hover:bg-primary/90 font-medium"
              onClick={saveMetric}
              disabled={loading || metricLoading}
            >
              {isEditing ? 'Update Metric' : 'Save Metric'}
            </Button>
          </div>
        </div>

        {/* Metric Details Row */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Metric Name</Label>
              <Input 
                placeholder="Enter metric name"
                className="h-9"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-sm font-medium text-foreground">Description</Label>
              <Input 
                placeholder="Describe what this metric measures"
                className="h-9"
                value={metricDescription}
                onChange={(e) => setMetricDescription(e.target.value)}
              />
              </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 pb-6 overflow-hidden">
          {/* Left Panel - Metric Configuration */}
          <div className="flex flex-col">
            <Card className="flex-1">
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Metric Type</Label>
                  <Select value={metricType} onValueChange={(value) => setMetricType(value as MetricType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select metric type">
                        {METRIC_TYPES.find(type => type.value === metricType)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                            {METRIC_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="py-1">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  {/* Metric-specific Configuration */}
                  {metricType === "count" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Event</Label>
                        <Popover open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={eventSelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.event_name 
                                ? getEventOptions().find((event) => event.value === formData.event_name)?.label 
                                : "Select event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search events..." 
                                value={eventSearchTerm}
                                onValueChange={setEventSearchTerm}
                              />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("event_name", currentValue);
                                        setEventSelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.event_name === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="distinct"
                          checked={formData.distinct || false}
                          onChange={(e) => updateFormData("distinct", e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="distinct" className="text-sm">Count unique users</Label>
                      </div>
                    </div>
                  )}

                  {metricType === "aggregation" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Event</Label>
                        <Popover open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={eventSelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.event_name 
                                ? getEventOptions().find((event) => event.value === formData.event_name)?.label 
                                : "Select event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search events..." 
                                value={eventSearchTerm}
                                onValueChange={setEventSearchTerm}
                              />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("event_name", currentValue);
                                        setEventSelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.event_name === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Property</Label>
                        <Popover open={propertySelectorOpen} onOpenChange={setPropertySelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={propertySelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.property 
                                ? getPropertyOptions().find((prop) => prop.value === formData.property)?.label 
                                : "Select property..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search properties..." 
                                value={propertySearchTerm}
                                onValueChange={setPropertySearchTerm}
                              />
                              <CommandList>
                                <CommandEmpty>No properties found.</CommandEmpty>
                                <CommandGroup>
                                  {getPropertyOptions().map((prop) => (
                                    <CommandItem
                                      key={prop.value}
                                      value={prop.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("property", currentValue);
                                        setPropertySelectorOpen(false);
                                      }}
                                    >
                                      <div className="flex flex-col flex-1">
                                        <span>{prop.label}</span>
                                        {prop.description && (
                                          <span className="text-xs text-muted-foreground">{prop.description}</span>
                                        )}
                                      </div>
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.property === prop.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Aggregation</Label>
                        <Select 
                          value={formData.aggregation || "sum"}
                          onValueChange={(value) => updateFormData("aggregation", value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select aggregation" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGGREGATION_TYPES.map((agg) => (
                              <SelectItem key={agg.value} value={agg.value}>
                                {agg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {metricType === "ratio" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Numerator Event</Label>
                        <Popover open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={eventSelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.numerator_event 
                                ? getEventOptions().find((event) => event.value === formData.numerator_event)?.label 
                                : "Select numerator event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search events..." />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("numerator_event", currentValue);
                                        setEventSelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.numerator_event === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Denominator Event</Label>
                        <Popover open={propertySelectorOpen} onOpenChange={setPropertySelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={propertySelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.denominator_event 
                                ? getEventOptions().find((event) => event.value === formData.denominator_event)?.label 
                                : "Select denominator event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search events..." />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("denominator_event", currentValue);
                                        setPropertySelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.denominator_event === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  {metricType === "retention" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Initial Event</Label>
                        <Popover open={initialEventSelectorOpen} onOpenChange={setInitialEventSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={initialEventSelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.initial_event 
                                ? getEventOptions().find((event) => event.value === formData.initial_event)?.label 
                                : "Select initial event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search events..." />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("initial_event", currentValue);
                                        setInitialEventSelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.initial_event === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Return Event</Label>
                        <Popover open={returnEventSelectorOpen} onOpenChange={setReturnEventSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={returnEventSelectorOpen}
                              className="mt-1 w-full justify-between"
                            >
                              {formData.return_event 
                                ? getEventOptions().find((event) => event.value === formData.return_event)?.label 
                                : "Select return event..."
                              }
                              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search events..." />
                              <CommandList>
                                <CommandEmpty>No events found.</CommandEmpty>
                                <CommandGroup>
                                  {getEventOptions().map((event) => (
                                    <CommandItem
                                      key={event.value}
                                      value={event.value}
                                      onSelect={(currentValue) => {
                                        updateFormData("return_event", currentValue);
                                        setReturnEventSelectorOpen(false);
                                      }}
                                    >
                                      {event.label}
                                      <CheckIcon
                                        className={`ml-auto h-4 w-4 ${
                                          formData.return_event === event.value ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Retention Window</Label>
                        <Select 
                          value={formData.retention_window || "7d"}
                          onValueChange={(value) => updateFormData("retention_window", value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select retention window" />
                          </SelectTrigger>
                          <SelectContent>
                            {RETENTION_WINDOWS.map((window) => (
                              <SelectItem key={window.value} value={window.value}>
                                {window.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Group By */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Group By</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addGroupBy}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Group
                      </Button>
                    </div>
                    {groupByItems.length === 0 && (
                      <div className="text-sm text-muted-foreground py-2">No grouping applied</div>
                    )}
                    <div className="space-y-2">
                      {groupByItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Popover open={groupBySelectorOpen === index} onOpenChange={(open) => {
                            setGroupBySelectorOpen(open ? index : null);
                            if (!open) {
                              // Clear search term when closing
                              setGroupBySearchTerms(prev => ({...prev, [index]: ''}));
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={groupBySelectorOpen === index}
                                className="w-full justify-between"
                              >
                                {item.key 
                                  ? getKeyOptions(groupBySearchTerms[index] || '').find((key) => key.value === item.key)?.label || item.key
                                  : "Select field..."
                                }
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search keys..." 
                                  value={groupBySearchTerms[index] || ''}
                                  onValueChange={(value) => setGroupBySearchTerms(prev => ({...prev, [index]: value}))}
                                />
                                <CommandList>
                                  <CommandEmpty>No keys found.</CommandEmpty>
                                  {(metricType === 'count' || metricType === 'aggregation') && (
                                    <CommandGroup heading="Event Properties">
                                      {getKeyOptions(groupBySearchTerms[index] || '').filter(key => key.source === KeySource.EVENT_PROPERTIES).map((key) => (
                                        <CommandItem
                                          key={`event-${key.value}`}
                                          value={key.value}
                                          onSelect={(currentValue) => {
                                            updateGroupBy(index, currentValue);
                                            setGroupBySelectorOpen(null);
                                            setGroupBySearchTerms(prev => ({...prev, [index]: ''}));
                                          }}
                                        >
                                          <div className="flex flex-col flex-1">
                                            <span>{key.label}</span>
                                            <span className="text-xs text-muted-foreground">{key.type}</span>
                                          </div>
                                          <CheckIcon
                                            className={`ml-auto h-4 w-4 ${
                                              item.key === key.value ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="User Profile">
                                    {getKeyOptions(groupBySearchTerms[index] || '').filter(key => key.source === KeySource.USER_PROFILE).map((key) => (
                                      <CommandItem
                                        key={`profile-${key.value}`}
                                        value={key.value}
                                        onSelect={(currentValue) => {
                                          updateGroupBy(index, currentValue);
                                          setGroupBySelectorOpen(null);
                                          setGroupBySearchTerms(prev => ({...prev, [index]: ''}));
                                        }}
                                      >
                                        <div className="flex flex-col flex-1">
                                          <span>{key.label}</span>
                                          <span className="text-xs text-muted-foreground">{key.type}</span>
                                        </div>
                                        <CheckIcon
                                          className={`ml-auto h-4 w-4 ${
                                            item.key === key.value ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeGroupBy(index)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filters */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Filters</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addFilter}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Filter
                      </Button>
                    </div>
                    {filters.length === 0 && (
                      <div className="text-sm text-muted-foreground py-2">No filters applied</div>
                    )}
                    <div>
                      {filters.map((filter, index) => (
                        <div key={index} className="space-y-2">
                          {/* Field Selector - Full Width */}
                          <div className="flex gap-2 items-start">
                            <div className="flex-1 space-y-2">
                              <Popover open={filterKeySelectorOpen === index} onOpenChange={(open) => {
                                setFilterKeySelectorOpen(open ? index : null);
                                if (!open) {
                                  // Clear search term when closing
                                  setFilterSearchTerms(prev => ({...prev, [index]: ''}));
                                }
                              }}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={filterKeySelectorOpen === index}
                                    className="w-full justify-between"
                                  >
                                    {filter.key 
                                      ? getKeyOptions(filterSearchTerms[index] || '').find((key) => key.value === filter.key)?.label || filter.key
                                      : "Select field..."
                                    }
                                    <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Search keys..." 
                                      value={filterSearchTerms[index] || ''}
                                      onValueChange={(value) => setFilterSearchTerms(prev => ({...prev, [index]: value}))}
                                    />
                                    <CommandList>
                                      <CommandEmpty>No keys found.</CommandEmpty>
                                      {(metricType === 'count' || metricType === 'aggregation') && (
                                        <CommandGroup heading="Event Properties">
                                          {getKeyOptions(filterSearchTerms[index] || '').filter(key => key.source === KeySource.EVENT_PROPERTIES).map((key) => (
                                            <CommandItem
                                              key={`event-${key.value}`}
                                              value={key.value}
                                              onSelect={(currentValue) => {
                                                const selectedKey = getKeyOptions(filterSearchTerms[index] || '').find(key => key.value === currentValue);
                                                updateFilter(index, "key", currentValue);
                                                updateFilter(index, "source", selectedKey?.source || KeySource.USER_PROFILE);
                                                setFilterKeySelectorOpen(null);
                                                setFilterSearchTerms(prev => ({...prev, [index]: ''}));
                                              }}
                                            >
                                              <div className="flex flex-col flex-1">
                                                <span>{key.label}</span>
                                                <span className="text-xs text-muted-foreground">{key.type}</span>
                                              </div>
                                              <CheckIcon
                                                className={`ml-auto h-4 w-4 ${
                                                  filter.key === key.value ? "opacity-100" : "opacity-0"
                                                }`}
                                              />
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      )}
                                      <CommandGroup heading="User Profile">
                                        {getKeyOptions(filterSearchTerms[index] || '').filter(key => key.source === KeySource.USER_PROFILE).map((key) => (
                                          <CommandItem
                                              key={`profile-${key.value}`}
                                              value={key.value}
                                              onSelect={(currentValue) => {
                                                const selectedKey = getKeyOptions(filterSearchTerms[index] || '').find(key => key.value === currentValue);
                                                updateFilter(index, "key", currentValue);
                                                updateFilter(index, "source", selectedKey?.source || KeySource.USER_PROFILE);
                                                setFilterKeySelectorOpen(null);
                                                setFilterSearchTerms(prev => ({...prev, [index]: ''}));
                                              }}
                                          >
                                            <div className="flex flex-col flex-1">
                                              <span>{key.label}</span>
                                              <span className="text-xs text-muted-foreground">{key.type}</span>
                                            </div>
                                            <CheckIcon
                                              className={`ml-auto h-4 w-4 ${
                                                filter.key === key.value ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {/* Operator, Value, and Remove Button Row */}
                              <div className="flex gap-2 items-center">
                                <Select
                                  value={filter.op}
                                  onValueChange={(value) => updateFilter(index, "op", value as any)}
                                >
                                  <SelectTrigger className="w-16">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="!=">≠</SelectItem>
                                    <SelectItem value=">">{">"}</SelectItem>
                                    <SelectItem value="<">{"<"}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="flex-1"
                                  placeholder="Value"
                                  value={filter.value}
                                  onChange={(e) => updateFilter(index, "value", e.target.value)}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFilter(index)}
                              className="mt-2"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => {
                        setHasError(false); // Clear error state on manual retry
                        onSubmit(e);
                      }} 
                      disabled={loading} 
                      className="flex-1 text-white"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      {loading ? "Running..." : hasError ? "Retry Query" : "Run Query"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardContent className="p-4 flex flex-col h-full">
                {/* Time Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Time Range</Label>
                      <div className="flex flex-wrap gap-1">
                        {TIME_RANGES.map((range) => (
                          <Button
                            key={range.value}
                            variant={timeRange === range.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTimeRange(range.value)}
                            className="text-xs h-7"
                          >
                            {range.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-32">
                    <Label className="text-sm font-medium mb-2 block">Granularity</Label>
                    <Select value={granularity} onValueChange={setGranularity}>
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRANULARITIES.map((gran) => (
                          <SelectItem key={gran.value} value={gran.value}>
                            {gran.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1 min-h-[400px]">
                  {/* Loading State */}
                  {loading ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Running Query</h3>
                          <p className="text-sm text-muted-foreground">
                            Analyzing your {metricType} data...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : hasError ? (
                    /* Error State */
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto">
                          <div className="w-10 h-10 text-red-500">⚠️</div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Query failed</h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            There was an error running your query. Please check your configuration and try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : !chartData ? (
                    /* Initial State - Query Not Run Yet */
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                          <BarChart3Icon className="h-10 w-10 text-primary/60" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Ready to analyze</h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Configure your metric settings and click "Run Query" to see beautiful analytics
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : chartData.length === 0 ? (
                    /* No Data State */
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                          <BarChart3Icon className="h-10 w-10 text-muted-foreground/60" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">No data found</h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            No results for the selected criteria. Try adjusting your filters or time range.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : granularity === "none" ? (
                    /* Total Value Display for "none" granularity */
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Total {metricType.charAt(0).toUpperCase() + metricType.slice(1)}
                          </h3>
                          <div className="text-6xl font-bold text-primary">
                            {chartData[0]?.value?.toLocaleString() || '0'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-6 max-w-md mx-auto">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-sm text-muted-foreground">
                              {timeRange} period • Total aggregation
                            </span>
                            <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Chart Data Available State */
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={fullRangeData}
                          margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="50%" stopColor="#22c55e" stopOpacity={0.1} />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge> 
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          
                          <CartesianGrid 
                            strokeDasharray="1 3" 
                            stroke="#374151"
                            strokeOpacity={1}
                            horizontal={true}
                            vertical={true}
                          />
                          
                          <XAxis
                            dataKey="period"
                            tick={{ 
                              fontSize: 12, 
                              fill: "#9CA3AF",
                              fontWeight: 500
                            }}
                            tickLine={{ stroke: "#4B5563", strokeWidth: 1 }}
                            axisLine={{ stroke: "#4B5563", strokeWidth: 1 }}
                            tickMargin={8}
                            height={40}
                            tickFormatter={(value) => {
                              if (typeof value === "number") {
                                return new Date(value).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                });
                              }
                              return value;
                            }}
                          />
                          
                          <YAxis
                            tick={{ 
                              fontSize: 12, 
                              fill: "#9CA3AF",
                              fontWeight: 500
                            }}
                            tickLine={{ stroke: "#4B5563", strokeWidth: 1 }}
                            axisLine={{ stroke: "#4B5563", strokeWidth: 1 }}
                            tickMargin={8}
                            width={50}
                            tickFormatter={(value) => {
                              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                              return value.toString();
                            }}
                          />
                          
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg p-3">
                                    <div className="text-xs text-gray-400 mb-1">
                                      {typeof label === "number" 
                                        ? new Date(label).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                          })
                                        : label
                                      }
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      <span className="text-sm font-medium">
                                        {payload[0].value?.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            cursor={{ stroke: "#22c55e", strokeWidth: 1, strokeDasharray: "4 4" }}
                          />
                          
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#22c55e"
                            strokeWidth={3}
                            fill="url(#chartGradient)"
                            dot={{ 
                              r: 0,
                              fill: "#22c55e",
                              strokeWidth: 0
                            }}
                            activeDot={{ 
                              r: 6, 
                              fill: "#22c55e",
                              stroke: "#ffffff",
                              strokeWidth: 3,
                              filter: "url(#glow)"
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}