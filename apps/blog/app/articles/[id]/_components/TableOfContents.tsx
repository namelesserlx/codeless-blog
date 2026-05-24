'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/shared/utils';

interface Heading {
    level: number;
    text: string;
    id: string;
}

interface ArticleTableOfContentsProps {
    headings: Heading[];
    className?: string;
    onNavigate?: () => void;
    showTitle?: boolean;
}

export function ArticleTableOfContents({
    headings,
    className,
    onNavigate,
    showTitle = true,
}: ArticleTableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (headings.length === 0) {
            return;
        }

        const activationOffset = 300;
        let frameId = 0;

        const updateActiveHeading = () => {
            let nextActiveId = headings[0]?.id ?? '';

            for (const heading of headings) {
                const element = document.getElementById(heading.id);
                if (!element) {
                    continue;
                }

                if (element.getBoundingClientRect().top <= activationOffset) {
                    nextActiveId = heading.id;
                    continue;
                }

                break;
            }

            setActiveId((currentActiveId) =>
                currentActiveId === nextActiveId ? currentActiveId : nextActiveId,
            );
        };

        const handleScroll = () => {
            if (frameId !== 0) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                updateActiveHeading();
                frameId = 0;
            });
        };

        updateActiveHeading();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);

        return () => {
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [headings]);

    const handleHeadingClick = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -104;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({
                top: y,
                behavior: 'smooth',
            });
            onNavigate?.();
        }
    };

    if (headings.length === 0) {
        return null;
    }

    return (
        <div className={cn('transition-colors', className)}>
            {showTitle && (
                <div className="mb-6 flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        目录
                    </h3>
                </div>
            )}

            <nav>
                <ul className="space-y-2.5">
                    {headings.map((heading) => {
                        const isActive = activeId === heading.id;

                        return (
                            <li key={heading.id} className={heading.level > 2 ? 'ml-4' : ''}>
                                <button
                                    type="button"
                                    onClick={() => handleHeadingClick(heading.id)}
                                    className={cn(
                                        '-ml-[2px] w-full border-l-2 pl-3 text-left text-[15px] leading-relaxed transition-colors',
                                        isActive
                                            ? 'border-[#0EA5E9] font-medium text-[#0EA5E9]'
                                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
                                    )}
                                    title={heading.text}
                                >
                                    {heading.text}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}
