import { ArrowRight, User, History } from 'lucide-react';
import type { IssueHistoryItem } from '../../types';

interface ActivityTimelineProps {
  history: IssueHistoryItem[];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

// Get a friendly label for the field name
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    status: 'Status',
    priority: 'Priority',
    assignee: 'Assignee',
    summary: 'Summary',
    description: 'Description',
    issuetype: 'Type',
    resolution: 'Resolution',
    labels: 'Labels',
    components: 'Components',
    fixVersions: 'Fix Version',
  };
  return labels[field.toLowerCase()] || field;
}

// Get color for the change type
function getFieldColor(field: string): string {
  const colors: Record<string, string> = {
    status: 'text-blue-500',
    priority: 'text-orange-500',
    assignee: 'text-purple-500',
  };
  return colors[field.toLowerCase()] || 'text-gray-500';
}

function ActivityItem({ item }: { item: IssueHistoryItem }) {
  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-3 bottom-0 w-px bg-gray-200 dark:bg-gray-700 last:hidden" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <History className="w-3 h-3 text-gray-500" />
      </div>

      {/* Content */}
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {item.author?.avatar ? (
            <img
              src={item.author.avatar}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <User className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.author?.name || item.author?.email || 'Someone'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeTime(item.created)}
          </span>
        </div>

        {/* Changes */}
        <div className="space-y-1">
          {item.items.map((change, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${getFieldColor(change.field)}`}>
                {getFieldLabel(change.field)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">changed</span>
              {change.from && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">from</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                    {change.from}
                  </span>
                </>
              )}
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-0.5 rounded bg-relay-orange/10 text-relay-orange text-xs font-medium">
                {change.to || 'None'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ history }: ActivityTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
          <History className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No activity recorded yet
        </p>
      </div>
    );
  }

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return (
    <div className="relative">
      {sortedHistory.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </div>
  );
}
