// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "user" | "sqa" | "admin";
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  discord_notifications: boolean;
  theme: "light" | "dark" | "system";
  created_at: string;
}

// Issue types
export type Tool =
  | "AI"
  | "Curator"
  | "Metadata"
  | "AutoEat"
  | "Himera"
  | "Mobile App"
  | "MenuCurator"
  | "Reports";
export type IssueType = "Bug" | "Task" | "Story";
export type IssuePriority = "Highest" | "High" | "Medium" | "Low" | "Lowest";
export type IssueStatus =
  | "Open"
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done"
  | "Resolved"
  | "Cancelled"
  | "Closed"
  | (string & {});

export type FilterMode = "is" | "is_not";

export interface FilterModes {
  status: FilterMode;
  priority: FilterMode;
  type: FilterMode;
  tool: FilterMode;
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; colorClass: string }
> = {
  "FOR SQA INVESTIGATION": {
    label: "For SQA Investigation",
    colorClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  "SQA INVESTIGATION": {
    label: "SQA Investigation",
    colorClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  REOPENED: {
    label: "Reopened",
    colorClass:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  "TO DO": {
    label: "To Do",
    colorClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  "SELECTED FOR DEVELOPMENT": {
    label: "Selected for Development",
    colorClass:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  "IN PROGRESS": {
    label: "In Progress",
    colorClass: "bg-blue-600 text-white dark:bg-blue-600 dark:text-white",
  },
  "DEV COMPLETE": {
    label: "Dev Complete",
    colorClass:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  "DEPLOYED TO DEV": {
    label: "Deployed To Dev",
    colorClass:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  },
  QA: {
    label: "QA",
    colorClass:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  "QA IN PROGRESS": {
    label: "QA IN Progress",
    colorClass: "bg-amber-600 text-white dark:bg-amber-600 dark:text-white",
  },
  "QA PASSED": {
    label: "QA Passed",
    colorClass: "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white",
  },
  SANITY: {
    label: "Sanity",
    colorClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  DONE: {
    label: "Done",
    colorClass:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelled",
    colorClass:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

export const PRIORITY_CONFIG: Record<
  IssuePriority,
  { label: string; icon: string; colorClass: string }
> = {
  Highest: {
    label: "Highest",
    icon: "⬆️",
    colorClass: "text-red-600 dark:text-red-400",
  },
  High: {
    label: "High",
    icon: "🔼",
    colorClass: "text-orange-500 dark:text-orange-400",
  },
  Medium: {
    label: "Medium",
    icon: "⏺️",
    colorClass: "text-yellow-500 dark:text-yellow-400",
  },
  Low: {
    label: "Low",
    icon: "🔽",
    colorClass: "text-gray-500 dark:text-gray-400",
  },
  Lowest: {
    label: "Lowest",
    icon: "⬇️",
    colorClass: "text-slate-400 dark:text-slate-500",
  },
};

export interface IssueUser {
  email: string | null;
  name: string | null;
  avatar: string | null;
}

export interface Issue {
  key: string;
  summary: string;
  description?: string;
  type: IssueType | null;
  priority: IssuePriority | null;
  status: IssueStatus | null;
  reporter: IssueUser | null;
  assignee: IssueUser | null;
  created: string;
  updated: string;
  attachments?: Attachment[];
  comments?: IssueComment[];
  history?: IssueHistoryItem[];
  relayReporter?: IssueUser | null;
}

export interface IssueHistoryItem {
  id: string;
  author: IssueUser | null;
  created: string;
  items: Array<{
    field: string;
    from: string | null;
    to: string | null;
  }>;
}

export interface Attachment {
  id: string;
  filename: string;
  content: string; // Download URL
  size: number;
  mimeType: string;
  created: string;
  author: IssueUser | null;
  storage?: "jira" | "r2";
}

export interface IssueComment {
  id: string;
  author: IssueUser | null;
  body: string;
  created: string;
  updated: string;
}

// API types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Filter types
export interface IssueFilters {
  status?: IssueStatus[];
  priority?: IssuePriority[];
  type?: IssueType[];
  reporter?: string;
  search?: string;
  tool?: Tool[];
  page?: number;
  limit?: number;
  filterModes?: FilterModes;
  relayReporter?: string;
}

// Whitelist types
export interface WhitelistEmail {
  id: number;
  email: string;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  added_by_name?: string | null;
}
