import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; icon: React.ReactNode; border: string }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        icon: <XCircle className="w-5 h-5 text-red-500" />,
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Info className="w-5 h-5 text-blue-500" />,
    },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isLeaving, setIsLeaving] = useState(false);
    const style = toastStyles[toast.type];

    useEffect(() => {
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsLeaving(true);
                setTimeout(() => onClose(toast.id), 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.duration, onClose]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => onClose(toast.id), 300);
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ${style.bg} ${style.border} ${
                isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
        >
            <div className="flex-shrink-0">{style.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.title}</p>
                {toast.message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
                )}
            </div>
            <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};

// Hook for managing toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...toast, id }]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const showSuccess = (title: string, message?: string) => {
        return addToast({ type: 'success', title, message });
    };

    const showError = (title: string, message?: string) => {
        return addToast({ type: 'error', title, message, duration: 8000 });
    };

    const showWarning = (title: string, message?: string) => {
        return addToast({ type: 'warning', title, message });
    };

    const showInfo = (title: string, message?: string) => {
        return addToast({ type: 'info', title, message });
    };

    return {
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };
};
