import React from 'react';
import { clsx } from 'clsx';

export const LoadingSpinner: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ className, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const spinner = (
        <div className={clsx(
            "relative",
            sizeClasses[size],
            className
        )}>
            {/* Outer ring */}
            <div className={clsx(
                "absolute inset-0 rounded-full border-2 border-primary/20 dark:border-primary/10",
                sizeClasses[size]
            )} />
            {/* Spinning gradient arc */}
            <div className={clsx(
                "absolute inset-0 rounded-full border-2 border-transparent animate-spin",
                sizeClasses[size]
            )}
                style={{
                    borderTopColor: '#6366f1',
                    borderRightColor: '#a855f7',
                }}
            />
        </div>
    );

    // When className is provided, render inline without wrapper padding
    if (className) return spinner;

    return (
        <div className="flex items-center justify-center p-8">
            {spinner}
        </div>
    );
};
