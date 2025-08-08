import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { useAuth } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function makeRequestWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };

  return await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  let res = await makeRequestWithAuth(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  // If we get 401, try to refresh the token and retry once
  if (res.status === 401) {
    const refreshSuccess = await useAuth.getState().refreshAccessToken();
    
    if (refreshSuccess) {
      // Retry the request with the new token
      res = await makeRequestWithAuth(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    } else {
      // Refresh failed, user will be redirected to login by logout()
      throw new Error('Authentication failed');
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res = await makeRequestWithAuth(queryKey[0] as string);

    // If we get 401, try to refresh the token and retry once
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }

      const refreshSuccess = await useAuth.getState().refreshAccessToken();
      
      if (refreshSuccess) {
        // Retry the request with the new token
        res = await makeRequestWithAuth(queryKey[0] as string);
      } else {
        // Refresh failed, user will be redirected to login by logout()
        throw new Error('Authentication failed');
      }
    }

    // Handle the second 401 if refresh didn't work
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Force logout since refresh didn't help
      useAuth.getState().logout();
      throw new Error('Authentication failed');
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        // Handle authentication errors globally for mutations
        if (error.message === 'Authentication failed' || 
            (error.message && error.message.includes('401'))) {
          useAuth.getState().logout();
        }
      },
    },
  },
});
