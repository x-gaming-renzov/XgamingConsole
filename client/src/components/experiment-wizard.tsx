import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const experimentSchema = z.object({
  name: z.string().min(2, "Experiment name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  type: z.string().min(1, "Please select an experiment type"),
  targetAudience: z.string().min(1, "Please select a target audience"),
  trafficSplit: z.string().min(1, "Please select traffic split"),
  variants: z.object({
    variantA: z.object({
      name: z.string().min(1, "Variant A name is required"),
      description: z.string().min(1, "Variant A description is required"),
    }),
    variantB: z.object({
      name: z.string().min(1, "Variant B name is required"),
      description: z.string().min(1, "Variant B description is required"),
    }),
  }),
  metrics: z.array(z.string()).min(1, "Please select at least one metric"),
});

interface ExperimentWizardProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
}

export default function ExperimentWizard({ open, onClose, projectId }: ExperimentWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof experimentSchema>>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      targetAudience: "all_new_users",
      trafficSplit: "50/50",
      variants: {
        variantA: {
          name: "Control",
          description: "",
        },
        variantB: {
          name: "Test",
          description: "",
        },
      },
      metrics: [],
    },
  });

  const createExperiment = useMutation({
    mutationFn: async (data: z.infer<typeof experimentSchema>) => {
      const response = await apiRequest("POST", "/api/experiments", {
        ...data,
        projectId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Experiment created!",
        description: "Your experiment has been created successfully.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create experiment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof experimentSchema>) => {
    createExperiment.mutate(data);
  };

  const availableMetrics = [
    "tutorial_completion_rate",
    "day_1_retention",
    "time_to_first_level",
    "session_duration",
    "conversion_rate",
    "user_engagement",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New FTUE Experiment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Experiment Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experiment Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Tutorial Skip Button Position Test" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what you're testing and why..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Experiment Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experiment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experiment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding Flow</SelectItem>
                      <SelectItem value="tutorial">Tutorial Content</SelectItem>
                      <SelectItem value="rewards">Welcome Rewards</SelectItem>
                      <SelectItem value="ui">UI/UX Elements</SelectItem>
                      <SelectItem value="level">First Level Experience</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Targeting */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all_new_users">All New Users</SelectItem>
                        <SelectItem value="returning_users">Returning Users</SelectItem>
                        <SelectItem value="premium_users">Premium Users</SelectItem>
                        <SelectItem value="casual_players">Casual Players</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trafficSplit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traffic Split</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select split" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="50/50">50% / 50%</SelectItem>
                        <SelectItem value="75/25">75% / 25%</SelectItem>
                        <SelectItem value="90/10">90% / 10%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Experiment Variants</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Variant A (Control)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField
                      control={form.control}
                      name="variants.variantA.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Variant name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="variants.variantA.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the control variant..." 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Variant B (Test)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField
                      control={form.control}
                      name="variants.variantB.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Variant name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="variants.variantB.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the test variant..." 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Success Metrics */}
            <FormField
              control={form.control}
              name="metrics"
              render={() => (
                <FormItem>
                  <FormLabel>Success Metrics</FormLabel>
                  <div className="grid md:grid-cols-2 gap-4">
                    {availableMetrics.map((metric) => (
                      <FormField
                        key={metric}
                        control={form.control}
                        name="metrics"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={metric}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(metric)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, metric])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== metric
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {metric.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createExperiment.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createExperiment.isPending ? "Creating..." : "Create Experiment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
