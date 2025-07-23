import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ChartContainer } from "@/components/ui/chart";
import { useForm, useFieldArray } from "react-hook-form";
import { ToastProvider, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import * as RechartsPrimitive from "recharts";

const METRIC_TYPES = [
  { value: "count", label: "Count" },
  { value: "aggregation", label: "Aggregation" },
  { value: "ratio", label: "Ratio" },
  { value: "retention", label: "Retention" },
];

const GRANULARITIES = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "12M" },
];

// Example static event/group options
const EVENT_NAMES = [
  { value: "event_0_login", label: "Login" },
  { value: "event_1_purchase", label: "Purchase" },
  { value: "event_2_logout", label: "Logout" },
];
const GROUP_BY_OPTIONS = [
  { value: "user_id", label: "User" },
  { value: "event_name", label: "Event Name" },
  { value: "device", label: "Device" },
];
const FILTER_KEYS = [
  { value: "user_id", label: "User" },
  { value: "event_name", label: "Event Name" },
  { value: "device", label: "Device" },
];
const FILTER_OPS = [
  { value: "=", label: "=" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

export default function MetricBuilder() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [granularity, setGranularity] = useState("none");

  const form = useForm({
    defaultValues: {
      event_name: EVENT_NAMES[0].value,
      metric_type: METRIC_TYPES[0].value,
      group_by: [],
      filters: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "filters",
  });

  async function onSubmit(values: any) {
    setLoading(true);
    setError(null);
    setChartData([]);
    setShowToast(false);
    try {
      // Convert filters to object
      const filtersObj: Record<string, any> = {};
      for (const f of values.filters) {
        if (f.key && f.op && f.value !== undefined) {
          // For now, only support '='
          if (f.op === "=") filtersObj[f.key] = f.value;
        }
      }
      const res = await fetch("/api/metrics/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: values.event_name,
          metric_type: values.metric_type,
          time_range: timeRange,
          granularity,
          group_by: values.group_by,
          filters: filtersObj,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch metric results");
      const data = await res.json();
      setChartData(data.result || data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToastProvider>
      {showToast && error && (
        <Toast variant="destructive" open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>{error}</ToastDescription>
        </Toast>
      )}
      <div className="flex min-h-screen bg-background">
        {/* Left Panel: Controls & Chart */}
        <div className="w-full md:w-2/3 p-8 flex flex-col gap-6 border-r bg-card/50">
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="font-medium text-muted-foreground mr-2">Time Range:</span>
            {TIME_RANGES.map((tr) => (
              <Button
                key={tr.value}
                variant={timeRange === tr.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(tr.value)}
                type="button"
              >
                {tr.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-4 items-center mb-4">
            <span className="font-medium text-muted-foreground mr-2">Granularity:</span>
            <select
              className="h-10 rounded-md border px-3"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
            >
              {GRANULARITIES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {chartData && chartData.length > 0 ? (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Query Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ value: { label: "Value", color: "#6366f1" } }}
                  >
                    <RechartsPrimitive.LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                      <RechartsPrimitive.XAxis
                        dataKey="period"
                        tickFormatter={(v) =>
                          typeof v === "number"
                            ? new Date(v).toLocaleDateString()
                            : v
                        }
                      />
                      <RechartsPrimitive.YAxis />
                      <RechartsPrimitive.Tooltip />
                      <RechartsPrimitive.Line
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                    </RechartsPrimitive.LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground text-center w-full">
                <div className="mb-2 text-lg font-medium">Select an Event and Run Query</div>
                <div className="text-sm">Results will appear here.</div>
              </div>
            )}
          </div>
        </div>
        {/* Right Panel: Query Builder */}
        <div className="w-full md:w-1/3 p-8 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Query Builder</CardTitle>
              <CardDescription>
                Select metric, event, filters, and group by to build your query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    name="metric_type"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metric Type</FormLabel>
                        <FormControl>
                          <select className="w-full h-10 rounded-md border px-3" {...field}>
                            {METRIC_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="event_name"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <select className="w-full h-10 rounded-md border px-3" {...field}>
                            {EVENT_NAMES.map((ev) => (
                              <option key={ev.value} value={ev.value}>
                                {ev.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="group_by"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group By</FormLabel>
                        <FormControl>
                          <select
                            multiple
                            className="w-full h-20 rounded-md border px-3"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                Array.from(e.target.selectedOptions, (opt) => opt.value)
                              )
                            }
                          >
                            {GROUP_BY_OPTIONS.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Filters</FormLabel>
                      <Button type="button" size="sm" variant="outline" onClick={() => append({ key: "", op: "=", value: "" })}>
                        + Add Filter
                      </Button>
                    </div>
                    {fields.length === 0 && <div className="text-muted-foreground text-sm">No filters</div>}
                    {fields.map((fieldItem, idx) => {
                      const item = fields[idx] as any;
                      return (
                        <div key={fieldItem.id} className="flex gap-2 mb-2 items-center">
                          <select
                            className="h-10 rounded-md border px-2"
                            value={item.key || ""}
                            onChange={e => form.setValue(`filters.${idx}.key`, e.target.value)}
                          >
                            <option value="">Key</option>
                            {FILTER_KEYS.map((k) => (
                              <option key={k.value} value={k.value}>{k.label}</option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-md border px-2"
                            value={item.op || "="}
                            onChange={e => form.setValue(`filters.${idx}.op`, e.target.value)}
                          >
                            {FILTER_OPS.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                          <Input
                            className="h-10"
                            placeholder="Value"
                            value={item.value || ""}
                            onChange={e => form.setValue(`filters.${idx}.value`, e.target.value)}
                          />
                          <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)}>
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading ? "Running..." : "Run Query"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ToastProvider>
  );
}
