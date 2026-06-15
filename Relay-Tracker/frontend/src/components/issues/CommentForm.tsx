import { useState, forwardRef } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>;
}

export const CommentForm = forwardRef<HTMLTextAreaElement, CommentFormProps>(
  function CommentForm({ onSubmit }, ref) {
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedBody = body.trim();
      if (!trimmedBody) return;

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(trimmedBody);
        setBody('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add comment');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            ref={ref}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            rows={3}
            disabled={isSubmitting}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-relay-orange/50 focus:border-relay-orange resize-none disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">M</kbd> to focus
            {' • '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">↵</kbd> to submit
          </p>

          <button
            type="submit"
            disabled={!body.trim() || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-relay-gradient rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Sending...' : 'Comment'}
          </button>
        </div>
      </form>
    );
  }
);
