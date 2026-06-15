import { useState, useEffect } from "react";
import { AlertCircle, Clock, CheckCircle2, Loader2, List } from "lucide-react";
import { fetchIssues } from "../../lib/api";
import type { Issue } from "../../types";

interface DashboardIssueListProps {
  onIssueClick: (issueKey: string) => void;
  relayReporterEmail?: string;
  searchQuery?: string;
}

import { STATUS_CONFIG } from "../../types";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  const colorClass =
    config?.colorClass ||
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  const label = config?.label || status;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-sm ${colorClass}`}
    >
      {label}
    </span>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DashboardIssueList({
  onIssueClick,
  relayReporterEmail,
  searchQuery,
}: DashboardIssueListProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecentIssues() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch recent issues, limit to 5
        const response = await fetchIssues({
          limit: 5,
          relayReporter: relayReporterEmail,
          search: searchQuery,
        });
        setIssues(response.issues);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentIssues();
  }, [relayReporterEmail, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-relay-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 px-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {relayReporterEmail ? (
          <>
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <List className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium">
              You haven't reported any issues yet
            </p>
            <p className="text-xs mt-1 opacity-70 italic">
              Click Report Bug to get started!
            </p>
          </>
        ) : searchQuery ? (
          <>
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <List className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium">No issues found</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent issues</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <button
          key={issue.key}
          onClick={() => onIssueClick(issue.key)}
          className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-relay-orange">
                  {issue.key}
                </span>
                <StatusBadge status={issue.status} />
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-relay-orange transition-colors">
                {issue.summary}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(issue.updated)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
