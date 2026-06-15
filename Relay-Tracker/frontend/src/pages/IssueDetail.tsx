import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Bug,
  ListTodo,
  BookOpen,
  Clock,
  User,
  Calendar,
  Link2,
  MoreHorizontal,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MainLayout, showToast } from "../components";
import { fetchIssue, addComment } from "../lib/api";

import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import type { Issue, IssueType } from "../types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../types";

// Components
import { CommentList } from "../components/issues/CommentList";
import { CommentForm } from "../components/issues/CommentForm";
import { ActivityTimeline } from "../components/issues/ActivityTimeline";
import { DescriptionRenderer } from "../components/issues/DescriptionRenderer";
import { AttachmentGrid } from "../components/issues/AttachmentGrid";

interface IssueDetailPageProps {
  issueKey: string;
  onBack: () => void;
  // Sequential navigation props
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Type icons and colors
const typeConfig: Record<
  IssueType,
  { icon: typeof Bug; color: string; bgColor: string }
> = {
  Bug: {
    icon: Bug,
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  Task: {
    icon: ListTodo,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  Story: {
    icon: BookOpen,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

// Helper to format date

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  );
}

export function IssueDetailPage({
  issueKey,
  onBack,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: IssueDetailPageProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "activity">(
    "comments"
  );
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, itemName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
      showToast({
        type: "success",
        title: "Copied!",
        message: `${itemName} copied to clipboard`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Unable to copy to clipboard",
      });
    }
    setIsMoreMenuOpen(false);
  };

  // Load issue
  const loadIssue = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await fetchIssue(issueKey);
        setIssue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issue");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [issueKey]
  );

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  // Auto-refresh every 30 seconds when tab is active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        interval = setInterval(() => loadIssue(true), 30000);
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Start polling if visible
    if (document.visibilityState === "visible") {
      interval = setInterval(() => loadIssue(true), 30000);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadIssue]);

  // Handle add comment
  const handleAddComment = async (body: string) => {
    await addComment(issueKey, body);
    await loadIssue(true);
  };

  // Ref for comment form focus
  const commentFormRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcuts
  // R - Refresh
  useKeyboardShortcut("r", () => loadIssue(true));

  // M - Focus comment box
  useKeyboardShortcut("m", () => {
    commentFormRef.current?.focus();
    setActiveTab("comments");
  });

  // J - Next issue
  useKeyboardShortcut("j", () => {
    if (hasNext && onNext) onNext();
  });

  // K - Previous issue
  useKeyboardShortcut("k", () => {
    if (hasPrevious && onPrevious) onPrevious();
  });

  // Escape - Go back to list
  useKeyboardShortcut("Escape", onBack);

  // Get Jira URL
  const jiraUrl = `${
    import.meta.env.VITE_JIRA_URL || "https://jira.atlassian.net"
  }/browse/${issueKey}`;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto">
          <LoadingSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (error || !issue) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error || "Issue not found"}</p>
            <button
              onClick={onBack}
              className="text-relay-orange hover:underline"
            >
              Go back to issues
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const TypeIcon = issue.type ? typeConfig[issue.type]?.icon : Bug;
  const typeColor = issue.type
    ? typeConfig[issue.type]?.color
    : "text-gray-500";
  const typeBgColor = issue.type
    ? typeConfig[issue.type]?.bgColor
    : "bg-gray-100";

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to list (Esc)"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>

            {/* Sequential Navigation */}
            {(hasPrevious || hasNext) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous issue (K)"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next issue (J)"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${typeBgColor}`}>
                <TypeIcon className={`w-5 h-5 ${typeColor}`} />
              </div>
              <span className="font-mono text-lg font-semibold text-relay-orange">
                {issue.key}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadIssue(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <a
              href={jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Jira
            </a>

            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                  {/* Copy Issue Key */}
                  <button
                    onClick={() => copyToClipboard(issueKey, "Issue key")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copiedItem === "Issue key" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    Copy issue key
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={() =>
                      copyToClipboard(window.location.href, "Link")
                    }
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copiedItem === "Link" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Copy link
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  {/* Open in Jira */}
                  <a
                    href={jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Jira
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {issue.summary}
              </h1>

              {/* Description */}
              {issue.description && (
                <DescriptionRenderer description={issue.description} />
              )}
            </div>

            {/* Attachments */}
            {issue.attachments && issue.attachments.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Attachments ({issue.attachments.length})
                </h2>
                <AttachmentGrid attachments={issue.attachments} />
              </div>
            )}

            {/* Tabs: Comments / Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              {/* Tab headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "comments"
                      ? "text-relay-orange border-b-2 border-relay-orange"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Comments ({issue.comments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "activity"
                      ? "text-relay-orange border-b-2 border-relay-orange"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Activity ({issue.history?.length || 0})
                </button>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === "comments" ? (
                  <div className="space-y-6">
                    <CommentForm
                      ref={commentFormRef}
                      onSubmit={handleAddComment}
                    />
                    <CommentList comments={issue.comments || []} />
                  </div>
                ) : (
                  <ActivityTimeline history={issue.history || []} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Details
              </h2>

              <div className="space-y-4">
                {/* Status - Read-only */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  {issue.status && STATUS_CONFIG[issue.status] ? (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        STATUS_CONFIG[issue.status].colorClass
                      }`}
                    >
                      {STATUS_CONFIG[issue.status].label}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {issue.status || "Unknown"}
                    </span>
                  )}
                </div>

                {/* Priority - Read-only */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Priority
                  </span>
                  {issue.priority && PRIORITY_CONFIG[issue.priority] ? (
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        PRIORITY_CONFIG[issue.priority].colorClass
                      }`}
                    >
                      <span>{PRIORITY_CONFIG[issue.priority].icon}</span>
                      <span>{PRIORITY_CONFIG[issue.priority].label}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {issue.priority || "Unknown"}
                    </span>
                  )}
                </div>

                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Type
                  </span>
                  <div className="flex items-center gap-2">
                    <TypeIcon className={`w-4 h-4 ${typeColor}`} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {issue.type || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Reporter (Jira Service Account) */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Jira Reporter
                  </span>
                  <div className="flex items-center gap-2">
                    {issue.reporter?.avatar ? (
                      <img
                        src={issue.reporter.avatar}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {issue.reporter?.name || "Service Account"}
                    </span>
                  </div>
                </div>

                {/* Relay Reporter - The actual human from the DB */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Relay Reporter
                  </span>
                  <div className="flex items-center gap-2">
                    {issue.relayReporter ? (
                      <>
                        {issue.relayReporter.avatar ? (
                          <img
                            src={issue.relayReporter.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-relay-orange/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-relay-orange" />
                          </div>
                        )}
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold text-relay-orange">
                            {issue.relayReporter.name || "Unknown"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Not linked
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Assignee
                  </span>
                  <div className="flex items-center gap-2">
                    {issue.assignee ? (
                      <>
                        {issue.assignee.avatar ? (
                          <img
                            src={issue.assignee.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {issue.assignee.name || issue.assignee.email}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dates card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Dates
              </h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(issue.created)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Updated
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {formatRelativeTime(issue.updated)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
