import { User, MessageSquare } from "lucide-react";
import type { IssueComment } from "../../types";

interface CommentListProps {
  comments: IssueComment[];
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

function CommentItem({ comment }: { comment: IssueComment }) {
  // Check if comment is from Relay (has the old footer pattern or the new header pattern)
  const hasOldFooter = comment.body?.includes("— Posted via Relay");
  const hasNewHeader = comment.body?.match(/^\*\*.+ \(Relay\):\*\*\n\n/);
  const isFromRelay = hasOldFooter || !!hasNewHeader;

  let displayBody = comment.body || "";
  if (hasOldFooter) {
    displayBody = displayBody.replace(/\n\n_— Posted via Relay by .+_$/, "");
  }
  if (hasNewHeader) {
    displayBody = displayBody.replace(/^\*\*.+ \(Relay\):\*\*\n\n/, "");
  }

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {comment.author?.avatar ? (
        <img
          src={comment.author.avatar}
          alt={comment.author.name || ""}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {comment.author?.name || comment.author?.email || "Unknown"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeTime(comment.created)}
          </span>
          {isFromRelay && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-relay-orange/10 text-relay-orange">
              via Relay
            </span>
          )}
          {!isFromRelay && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              via Jira
            </span>
          )}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {displayBody}
        </div>
      </div>
    </div>
  );
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to comment!
        </p>
      </div>
    );
  }

  // Sort comments by date (newest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
