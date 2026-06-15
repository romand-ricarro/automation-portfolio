// API URL: empty string = same origin (production), set VITE_API_URL for local dev
const API_URL = import.meta.env.VITE_API_URL ?? "";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    // Handle empty baseUrl (same-origin) by using window.location.origin
    const base = this.baseUrl || window.location.origin;
    const url = new URL(`${base}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token if available
    const token = localStorage.getItem("relay_id_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "An error occurred" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  }

  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_URL);

// Health check
export async function checkHealth(): Promise<{ status: string }> {
  return api.get<{ status: string }>("/api/health");
}

// Issues API
import type { Issue, IssueFilters } from "../types";

export interface IssuesResponse {
  issues: Issue[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchIssues(
  filters: IssueFilters = {},
  options: { refresh?: boolean } = {},
): Promise<IssuesResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
  };

  // Convert arrays to comma-separated strings with ! prefix if in is_not mode
  if (filters.status?.length) {
    const values = filters.status.map((s) =>
      filters.filterModes?.status === "is_not" ? `!${s}` : s,
    );
    params.status = values.join(",");
  }
  if (filters.priority?.length) {
    const values = filters.priority.map((p) =>
      filters.filterModes?.priority === "is_not" ? `!${p}` : p,
    );
    params.priority = values.join(",");
  }
  if (filters.type?.length) {
    const values = filters.type.map((t) =>
      filters.filterModes?.type === "is_not" ? `!${t}` : t,
    );
    params.type = values.join(",");
  }
  if (filters.tool?.length) {
    const values = filters.tool.map((t) =>
      filters.filterModes?.tool === "is_not" ? `!${t}` : t,
    );
    params.tool = values.join(",");
  }
  if (filters.reporter) {
    params.reporter = filters.reporter;
  }
  if (filters.relayReporter) {
    params.relay_reporter = filters.relayReporter;
  }

  // Add refresh param to bypass backend cache
  if (options.refresh) {
    params.refresh = true;
  }

  return api.get<IssuesResponse>("/api/issues", params);
}

export async function fetchIssue(key: string): Promise<Issue> {
  return api.get<Issue>(`/api/issues/${key}`);
}

// Base fields common to all issue types
interface CreateIssueBase {
  summary: string;
  priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
}

// Bug-specific fields
export interface CreateBugData extends CreateIssueBase {
  type: "Bug";
  details?: string; // Optional for fallback
  stepsToReproduce: string; // Required
  expectedResult: string; // Required
  actualResult: string; // Required
  attachmentLinks: string; // Mandatory for Bug reports
}

// Story-specific fields
export interface CreateStoryData extends CreateIssueBase {
  type: "Story";
  problemDescription: string; // Required
  proposedSolution?: string;
  acceptanceCriteria: string; // Required
  scope?: string;
  attachmentLinks?: string; // Optional for Stories
}

// Task-specific fields
export interface CreateTaskData extends CreateIssueBase {
  type: "Task";
  taskDescription: string; // Required
  notes?: string;
  links?: string;
  attachmentLinks?: string; // Optional for Tasks
}

// Union type for all issue creation data
export type CreateIssueData = CreateBugData | CreateStoryData | CreateTaskData;

export async function createIssue(
  data: CreateIssueData,
): Promise<{ key: string; self: string }> {
  return api.post<{ key: string; self: string }>("/api/issues", data);
}

export async function updateIssue(
  key: string,
  data: Partial<Issue>,
): Promise<{ key: string }> {
  return api.put<{ key: string }>(`/api/issues/${key}`, data);
}

export async function addComment(
  key: string,
  body: string,
): Promise<{ id: string; body: string; created: string }> {
  return api.post<{ id: string; body: string; created: string }>(
    `/api/issues/${key}/comments`,
    { body },
  );
}

// Admin API
import type { UserRole, AuthUser } from "../context/auth-context";

export async function fetchUsers(): Promise<AuthUser[]> {
  const data = await api.get<{ users: AuthUser[]; total: number }>(
    "/api/auth/users",
  );
  return data.users;
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ message: string }> {
  return api.put<{ message: string }>(`/api/auth/users/${userId}/role`, {
    role,
  });
}

// Bulk Operations API
import type { IssueStatus, IssuePriority } from "../types";

export async function bulkUpdateIssueStatus(
  issueKeys: string[],
  status: IssueStatus,
): Promise<{ updated: number; failed: string[] }> {
  return api.post<{ updated: number; failed: string[] }>(
    "/api/issues/bulk/status",
    {
      issue_keys: issueKeys,
      status,
    },
  );
}

export async function bulkUpdateIssuePriority(
  issueKeys: string[],
  priority: IssuePriority,
): Promise<{ updated: number; failed: string[] }> {
  return api.post<{ updated: number; failed: string[] }>(
    "/api/issues/bulk/priority",
    {
      issue_keys: issueKeys,
      priority,
    },
  );
}

// Whitelist API
import type { WhitelistEmail } from "../types";

export async function fetchWhitelistedEmails(): Promise<WhitelistEmail[]> {
  const data = await api.get<{ emails: WhitelistEmail[]; total: number }>(
    "/api/whitelist",
  );
  return data.emails;
}

export async function addEmailToWhitelist(
  email: string,
  notes?: string,
): Promise<WhitelistEmail> {
  const data = await api.post<{ success: boolean; email: WhitelistEmail }>(
    "/api/whitelist",
    { email, notes },
  );
  return data.email;
}

export async function removeEmailFromWhitelist(emailId: number): Promise<void> {
  await api.delete(`/api/whitelist/${emailId}`);
}

export async function checkEmailWhitelisted(email: string): Promise<boolean> {
  const data = await api.get<{ email: string; whitelisted: boolean }>(
    `/api/whitelist/check/${encodeURIComponent(email)}`,
  );
  return data.whitelisted;
}
