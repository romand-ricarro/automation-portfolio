import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Info, Copy, ShieldX, WifiOff, Clock } from 'lucide-react';
import type { ToastData } from '../lib/toast';

interface ToastProps extends ToastData {
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

// Special icons for specific error categories
const categoryIcons = {
  whitelist: ShieldX,
  auth: ShieldX,
  network: WifiOff,
  rate_limit: Clock,
};

const colors = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

// Special colors for whitelist/auth errors (amber/orange theme)
const whitelistColors = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';

const iconColors = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const whitelistIconColor = 'text-amber-600 dark:text-amber-400';

export function Toast({
  type,
  title,
  message,
  duration = 5000,
  persistent,
  errorCategory,
  copyableText,
  action,
  onClose
}: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Determine if this is a whitelist/auth error for special styling
  const isWhitelistError = errorCategory === 'whitelist' || errorCategory === 'auth';
  const isRateLimitError = errorCategory === 'rate_limit';

  // Get the appropriate icon
  const Icon = errorCategory && categoryIcons[errorCategory as keyof typeof categoryIcons]
    ? categoryIcons[errorCategory as keyof typeof categoryIcons]
    : icons[type];

  // Handle auto-dismiss
  useEffect(() => {
    // Don't auto-dismiss if duration is 0 or persistent
    if (duration <= 0 || persistent) return;

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, persistent, onClose]);

  // Handle rate limit countdown
  useEffect(() => {
    if (isRateLimitError && message) {
      const match = message.match(/(\d+)\s*second/i);
      if (match) {
        setCountdown(parseInt(match[1], 10));
      }
    }
  }, [isRateLimitError, message]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const handleCopy = async () => {
    if (!copyableText) return;
    try {
      await navigator.clipboard.writeText(copyableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const baseClasses = 'flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300';
  const animationClasses = isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0';
  const colorClasses = isWhitelistError ? whitelistColors : colors[type];
  const iconColorClasses = isWhitelistError ? whitelistIconColor : iconColors[type];

  return (
    <div className={`${baseClasses} ${colorClasses} ${animationClasses}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColorClasses}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isRateLimitError && countdown !== null && countdown > 0
              ? message.replace(/\d+\s*second/i, `${countdown} second${countdown !== 1 ? 's' : ''}`)
              : message}
          </p>
        )}

        {/* Copyable text button */}
        {copyableText && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm font-medium text-relay-orange hover:underline mt-2"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Email'}
          </button>
        )}

        {/* Action button */}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-relay-orange hover:underline mt-2"
          >
            {action.label}
          </button>
        )}

        {/* Whitelist-specific help text */}
        {isWhitelistError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Please contact your administrator to request access.
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  // Limit to 3 visible toasts, queue the rest
  const visibleToasts = toasts.slice(-3);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visibleToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={() => onRemove(toast.id)} />
        </div>
      ))}
      {toasts.length > 3 && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pointer-events-auto">
          +{toasts.length - 3} more notification{toasts.length - 3 > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
