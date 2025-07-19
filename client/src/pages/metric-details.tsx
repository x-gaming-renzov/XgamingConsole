import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Calculator,
  Repeat,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import ConsoleLayout from "@/components/console-layout";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { apiRequest } from "@/lib/queryClient";

interface Metric {
  pid: string;
  name: string;
  description: string;
  type: "count" | "aggregation" | "ratio" | "retention";
  config: any;
}

interface MetricData {
  period: string;
  value: number;
  trend?: number;
  metadata?: any;
}

const getMetricTypeIcon = (type: string) => {
  switch (type) {
    case "count":
      return <Users className="w-5 h-5" />;
    case "aggregation":
      return <Calculator className="w-5 h-5" />;
    case "ratio":
      return <TrendingUp className="w-5 h-5" />;
    case "retention":
      return <Repeat className="w-5 h-5" />;
    default:
      return <BarChart3 className="w-5 h-5" />;
  }
};

const formatMetricType = (type: string) => {
  switch (type) {
    case "count":
      return "Count Metric";
    case "aggregation":
      return "Aggregation Metric";
    case "ratio":
      return "Ratio Metric";
    case "retention":
      return "Retention Metric";
    default:
      return "Unknown Type";
  }
};

export default function MetricDetails() {
  const [, params] = useRoute("/metrics/:id");
  const metricId = params?.id;

  const [timeRange, setTimeRange] = useState("7d");
  const [granularity, setGranularity] = useState("daily");

  const { data: metric, isLoading: metricLoading } = useQuery<Metric>({
    queryKey: [`/api/metrics/${metricId}`],
    enabled: !!metricId,
  });

  const { data: metricData, isLoading: dataLoading, refetch } = useQuery<MetricData[]>({
    queryKey: [`/api/metrics/compute`, metricId, timeRange, granularity],
    enabled: !!metricId && !!metric,
    queryFn: async () => {
      if (!metric || !metric.type || !metric.config) {
        throw new Error("Metric data not available");
      }
      
      const response = await apiRequest("POST", `/api/metrics/compute`, {
        type: metric.type,
        config: metric.config,
        timeRange,
        granularity,
      });
      return response.json();
    }
  });

  console.log("metricData", metricData);
  const currentValue = metricData?.[metricData.length - 1]?.value || 0;
  const previousValue = metricData?.[metricData.length - 2]?.value || 0;
  const percentChange = previousValue
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0;

  const formatValue = (value: number) => {
    if (metric && metric.type === "ratio") {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const renderChart = () => {
    if (!metricData || metricData.length === 0 || !metric) {
      return (
        <div className="flex items-center justify-center h-80 text-muted-foreground">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <p className="font-medium text-sm">No data available</p>
              <p className="text-xs opacity-75">Try adjusting your time range or check back later</p>
            </div>
          </div>
        </div>
      );
    }

    const chartType =
      metric.type === "retention"
        ? "area"
        : metric.type === "ratio"
        ? "line"
        : "line";

    // Enhanced date formatting for different granularities
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      if (granularity === "hourly") {
        return date.toLocaleTimeString("en-US", { 
          hour: "2-digit", 
          minute: "2-digit",
          hour12: false 
        });
      } else if (granularity === "monthly") {
        return date.toLocaleDateString("en-US", { 
          month: "short", 
          year: "numeric" 
        });
      } else if (granularity === "weekly") {
        return `Week ${Math.ceil(date.getDate() / 7)}, ${date.toLocaleDateString("en-US", { month: "short" })}`;
      }
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });
    };

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        const date = new Date(label);
        return (
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {date.toLocaleDateString("en-US", { 
                weekday: "short",
                month: "short", 
                day: "numeric", 
                year: "numeric" 
              })}
              {granularity === "hourly" && ` at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: "hsl(var(--primary))" }}
              />
              <span className="text-sm text-muted-foreground">Value:</span>
              <span className="text-sm font-semibold text-foreground">
                {formatValue(data.value)}
              </span>
            </div>
          </div>
        );
      }
      return null;
    };

    // Common chart props
    const commonProps = {
      data: metricData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    if (chartType === "area") {
      return (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="2 4" 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.2}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis 
                tickFormatter={formatValue}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#areaGradient)"
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === "line") {
      return (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid 
                strokeDasharray="2 4" 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.2}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis 
                tickFormatter={formatValue}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 5, 
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...commonProps}>
            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="hsl(var(--muted-foreground))" 
              strokeOpacity={0.2}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis 
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (metricLoading) {
    return (
      <ConsoleLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ConsoleLayout>
    );
  }

  if (!metric) {
    return (
      <ConsoleLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Metric not found</h2>
          <p className="text-muted-foreground mb-4">
            The metric you're looking for doesn't exist.
          </p>
          <Link href="/metrics">
            <Button variant="outline">Back to Metrics</Button>
          </Link>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/metrics">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{metric?.name || "Unknown"}</h1>
                <Badge variant="outline">
                  {metric ? formatMetricType(metric.type) : "Unknown Type"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {metric.description || "No description provided"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Description */}
        {metric?.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Metric Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-80">{renderChart()}</div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Metric Type</h4>
                <p className="text-sm text-muted-foreground">
                  {metric ? formatMetricType(metric.type) : "Unknown Type"}
                </p>
              </div>
              {metric?.config && (
                <div className="md:col-span-2">
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(metric.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
