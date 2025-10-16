import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Build headers and attach stored JWT token if present
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";

  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem('vr-theatre-user');
      if (raw) {
        // Zustand persist stores the state object; try to extract token
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token ?? parsed?.token ?? null;
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // ignore localStorage parsing errors and continue without Authorization header
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem('vr-theatre-user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.token ?? parsed?.token ?? null;
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (err) {
      // ignore
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
    },
  },
});
