import {
  Bug,
  ListTodo,
  BookOpen,
  Clock,
  User,
  Search,
  Plus,
} from "lucide-react";
import type { Issue, IssueType, IssuePriority, IssueStatus } from "../../types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../../types";

interface IssueListProps {
  issues: Issue[];
  isLoading?: boolean;
  onIssueClick?: (key: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onToggle?: (key: string) => void;
  onSelectAll?: (keys: string[]) => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onCreateIssue?: () => void;
}

// Helper to get relative time

// Type icons and colors
const typeConfig: Record<IssueType, { icon: typeof Bug; color: string }> = {
  Bug: { icon: Bug, color: "text-red-500" },
  Task: { icon: ListTodo, color: "text-blue-500" },
  Story: { icon: BookOpen, color: "text-green-500" },
};

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

function PriorityIndicator({ priority }: { priority: IssuePriority | null }) {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority];
  if (!config) return <span className="text-xs text-gray-400">{priority}</span>;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${config.colorClass}`}
      title={priority}
    >
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus | null }) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  const colorClass =
    config?.colorClass ||
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  const label = config?.label || status;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ${colorClass}`}
    >
      {label}
    </span>
  );
}

function TypeIcon({ type }: { type: IssueType | null }) {
  if (!type) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return <Icon className={`w-4 h-4 ${config.color}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Desktop table row
function IssueRow({
  issue,
  onClick,
  selectable,
  isSelected,
  onToggle,
}: {
  issue: Issue;
  onClick?: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`group hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${
        isSelected ? "bg-relay-orange/5 dark:bg-relay-orange/10" : ""
      }`}
    >
      {/* Checkbox */}
      {selectable && (
        <td className="px-4 py-3 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-relay-orange focus:ring-relay-orange cursor-pointer"
          />
        </td>
      )}
      {/* Type + Key */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <TypeIcon type={issue.type} />
          <span className="font-mono text-sm font-medium text-relay-orange">
            {issue.key}
          </span>
        </div>
      </td>

      {/* Summary */}
      <td className="px-4 py-3">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-md group-hover:text-relay-orange transition-colors">
          {issue.summary}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={issue.status} />
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityIndicator priority={issue.priority} />
      </td>

      {/* Reporter */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {issue.relayReporter ? (
            <>
              {issue.relayReporter.avatar ? (
                <img
                  src={issue.relayReporter.avatar}
                  alt={issue.relayReporter.name || ""}
                  className="w-6 h-6 rounded-full ring-1 ring-relay-orange/20"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-relay-orange/10 flex items-center justify-center ring-1 ring-relay-orange/20">
                  <User className="w-3 h-3 text-relay-orange" />
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
                {issue.relayReporter.name || issue.relayReporter.email}
              </span>
            </>
          ) : (
            <>
              {issue.reporter?.avatar ? (
                <img
                  src={issue.reporter.avatar}
                  alt={issue.reporter.name || ""}
                  className="w-6 h-6 rounded-full grayscale opacity-70"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                {issue.reporter?.name || issue.reporter?.email || "Unknown"}
              </span>
            </>
          )}
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(issue.created)}
        </div>
      </td>
    </tr>
  );
}

// Mobile card
function IssueCard({
  issue,
  onClick,
  selectable,
  isSelected,
  onToggle,
}: {
  issue: Issue;
  onClick?: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "border-relay-orange bg-relay-orange/5 dark:bg-relay-orange/10"
          : ""
      }`}
    >
      {/* Header: Checkbox + Type + Key + Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-relay-orange focus:ring-relay-orange cursor-pointer"
            />
          )}
          <TypeIcon type={issue.type} />
          <span className="font-mono text-sm font-medium text-relay-orange">
            {issue.key}
          </span>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
        {issue.summary}
      </p>

      {/* Footer: Priority + Reporter + Time */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <PriorityIndicator priority={issue.priority} />
          <div className="flex items-center gap-1">
            {issue.relayReporter ? (
              <>
                {issue.relayReporter.avatar ? (
                  <img
                    src={issue.relayReporter.avatar}
                    alt={issue.relayReporter.name || ""}
                    className="w-5 h-5 rounded-full ring-1 ring-relay-orange/20"
                  />
                ) : (
                  <User className="w-4 h-4 text-relay-orange" />
                )}
                <span className="truncate max-w-[100px] font-medium text-gray-900 dark:text-gray-100">
                  {issue.relayReporter.name?.split(" ")[0] || "Unknown"}
                </span>
              </>
            ) : (
              <>
                {issue.reporter?.avatar ? (
                  <img
                    src={issue.reporter.avatar}
                    alt={issue.reporter.name || ""}
                    className="w-5 h-5 rounded-full grayscale opacity-70"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
                <span className="truncate max-w-[100px]">
                  {issue.reporter?.name?.split(" ")[0] || "Unknown"}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(issue.created)}
        </div>
      </div>
    </div>
  );
}

export function IssueList({
  issues,
  isLoading,
  onIssueClick,
  selectable,
  selectedKeys,
  onToggle,
  onSelectAll,
  hasFilters,
  onClearFilters,
  onCreateIssue,
}: IssueListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          {hasFilters ? (
            <Search className="w-8 h-8 text-gray-400" />
          ) : (
            <ListTodo className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          {hasFilters ? "No matching issues" : "No relay-app issues found"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md px-4">
          {hasFilters
            ? "Try adjusting your filters or search criteria to find what you're looking for."
            : 'Relay only shows issues with the "relay-app" label or containing "Relay App" in the description.'}
        </p>
        {!hasFilters && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 max-w-sm px-4">
            Create issues through Relay to have them appear here, or add the
            "relay-app" label to existing Jira issues.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Clear filters
            </button>
          )}
          {onCreateIssue && (
            <button
              onClick={onCreateIssue}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-relay-gradient rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Issue
            </button>
          )}
        </div>
      </div>
    );
  }

  const allSelected =
    issues.length > 0 && issues.every((issue) => selectedKeys?.has(issue.key));
  const someSelected = issues.some((issue) => selectedKeys?.has(issue.key));

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all visible issues
      onSelectAll?.([]);
    } else {
      // Select all visible issues
      onSelectAll?.(issues.map((issue) => issue.key));
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-relay-orange focus:ring-relay-orange cursor-pointer"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Issue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <IssueRow
                key={issue.key}
                issue={issue}
                onClick={() => onIssueClick?.(issue.key)}
                selectable={selectable}
                isSelected={selectedKeys?.has(issue.key)}
                onToggle={() => onToggle?.(issue.key)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {issues.map((issue) => (
          <IssueCard
            key={issue.key}
            issue={issue}
            onClick={() => onIssueClick?.(issue.key)}
            selectable={selectable}
            isSelected={selectedKeys?.has(issue.key)}
            onToggle={() => onToggle?.(issue.key)}
          />
        ))}
      </div>
    </>
  );
}
