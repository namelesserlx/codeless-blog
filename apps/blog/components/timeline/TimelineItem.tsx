import React from 'react';

interface TimelineItemProps {
    children: React.ReactNode;
    dotColor?: 'primary' | 'green' | 'amber' | 'red' | 'blue';
    className?: string;
}

export function TimelineItem({
    children,
    dotColor = 'primary',
    className = '',
}: TimelineItemProps) {
    // 根据颜色属性设置点的样式
    const getDotStyles = () => {
        switch (dotColor) {
            case 'green':
                return 'bg-green-500 shadow-green-500/20';
            case 'amber':
                return 'bg-amber-500 shadow-amber-500/20';
            case 'red':
                return 'bg-red-500 shadow-red-500/20';
            case 'blue':
                return 'bg-blue-500 shadow-blue-500/20';
            case 'primary':
            default:
                return 'bg-primary shadow-primary/20';
        }
    };

    return (
        <div className={`relative pl-10 ${className}`}>
            <div
                className={`absolute left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${getDotStyles()}`}
            >
                <div className="h-3 w-3 rounded-full bg-white"></div>
            </div>
            {children}
        </div>
    );
}
