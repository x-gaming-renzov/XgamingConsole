import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { Experiment, InsertExperiment } from "@shared/schema";

export function useExperiments(projectId: number) {
  return useQuery({
    queryKey: ["/api/experiments", { projectId }],
    queryFn: async () => {
      const response = await fetch(`/api/experiments?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }
      return response.json();
    },
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertExperiment & { projectId: number }) => {
      const response = await apiRequest("POST", "/api/experiments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    },
  });
}

export function useUpdateExperiment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Experiment> }) => {
      const response = await apiRequest("PUT", `/api/experiments/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    },
  });
}

export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/experiments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    },
  });
}
