import React from 'react';

interface TimelineProps {
    children: React.ReactNode;
    className?: string;
}

export function Timeline({ children, className = '' }: TimelineProps) {
    return (
        <div className={`relative ${className}`}>
            <div className="absolute top-0 bottom-0 left-[15px] w-0.5 bg-primary/20 dark:bg-primary/10" />
            <div className="space-y-6">{children}</div>
        </div>
    );
}
