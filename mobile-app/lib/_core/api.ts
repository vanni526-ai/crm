import { getToken } from "@/lib/api-client";

/**
 * 通用 API 调用函数 - 直连 CRM 后端
 */

const CRM_BASE = "https://crm.bdsm.com.cn";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = await getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Auth-Token"] = token;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${CRM_BASE}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        /* not JSON */
      }
      throw new Error(errorMessage || `API call failed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Unknown error occurred");
  }
}

export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);
  return {
    sessionToken: result.app_session_id,
    user: result.user,
  };
}

export async function logout(): Promise<void> {
  try {
    await apiCall<void>("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
}

export async function getMe(): Promise<any> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch {
    return null;
  }
}

export async function establishSession(token: string): Promise<boolean> {
  try {
    const url = `${CRM_BASE}/api/auth/session`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
