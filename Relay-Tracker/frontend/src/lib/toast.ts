import { useEffect, useState } from 'react';
import { ERROR_DURATIONS, SUCCESS_DURATION, INFO_DURATION, type ErrorCategory } from './errors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;  // Never auto-dismiss
  errorCategory?: ErrorCategory;  // For error-specific styling
  copyableText?: string;  // Text that can be copied (e.g., email)
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Get default duration based on toast type and error category
 */
function getDefaultDuration(type: ToastType, errorCategory?: ErrorCategory): number {
  if (type === 'success') return SUCCESS_DURATION;
  if (type === 'info') return INFO_DURATION;
  if (type === 'error' && errorCategory) {
    return ERROR_DURATIONS[errorCategory];
  }
  // Default warning/error duration
  return 5000;
}

// Toast event system
let toastId = 0;
const listeners: Set<(toast: ToastData) => void> = new Set();
const removeListeners: Set<(id: string) => void> = new Set();

export function showToast(toast: Omit<ToastData, 'id'>) {
  const id = `toast-${++toastId}`;
  // Set default duration based on type and category
  const duration = toast.persistent
    ? 0
    : toast.duration ?? getDefaultDuration(toast.type, toast.errorCategory);
  const fullToast: ToastData = { ...toast, id, duration };
  listeners.forEach(listener => listener(fullToast));
  return id;
}

/**
 * Show a success toast
 */
export function showSuccess(title: string, message?: string) {
  return showToast({ type: 'success', title, message });
}

/**
 * Show an error toast with optional category for specific styling
 */
export function showError(
  title: string,
  message?: string,
  options?: { errorCategory?: ErrorCategory; persistent?: boolean; copyableText?: string }
) {
  return showToast({
    type: 'error',
    title,
    message,
    errorCategory: options?.errorCategory,
    persistent: options?.persistent ?? (options?.errorCategory === 'whitelist' || options?.errorCategory === 'auth'),
    copyableText: options?.copyableText,
  });
}

/**
 * Show an info toast
 */
export function showInfo(title: string, message?: string) {
  return showToast({ type: 'info', title, message });
}

/**
 * Show a warning toast
 */
export function showWarning(title: string, message?: string) {
  return showToast({ type: 'warning', title, message });
}

export function removeToast(id: string) {
  removeListeners.forEach(listener => listener(id));
}

export function subscribeToToasts(
  onAdd: (toast: ToastData) => void,
  onRemove: (id: string) => void
) {
  listeners.add(onAdd);
  removeListeners.add(onRemove);

  return () => {
    listeners.delete(onAdd);
    removeListeners.delete(onRemove);
  };
}

// Hook for managing toasts - defined here to avoid fast refresh issues
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts(
      (toast) => setToasts(prev => [...prev, toast]),
      (id) => setToasts(prev => prev.filter(t => t.id !== id))
    );

    return unsubscribe;
  }, []);

  const remove = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, remove };
}
