import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/shared/utils';
import styles from './fade-in-section.module.css';

const directionClassMap = {
    left: styles.slideLeft,
    right: styles.slideRight,
    up: styles.slideUp,
    down: styles.slideDown,
} as const;

interface FadeInSectionProps {
    children: ReactNode;
    className?: string;
    direction?: 'left' | 'right' | 'up' | 'down';
    delay?: number;
    duration?: number;
}

export function FadeInSection({
    children,
    className,
    direction = 'left',
    delay = 0,
    duration = 800,
}: FadeInSectionProps) {
    const directionClass = directionClassMap[direction];

    const style: CSSProperties = {
        animationDuration: `${duration}ms`,
    };

    if (delay > 0) {
        style.animationDelay = `${delay}ms`;
    }

    return (
        <div className={cn(styles.base, directionClass, className)} style={style}>
            {children}
        </div>
    );
}
