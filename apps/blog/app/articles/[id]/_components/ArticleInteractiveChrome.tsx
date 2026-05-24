'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArticleActions } from './ArticleActions';
import { ArticleTableOfContents } from './TableOfContents';
import { ArticleViewAndTimeTracker } from './ArticleViewAndTimeTracker';
import type { ArticleHeading } from '../toc';

interface ArticleInteractiveChromeProps {
    articleId: string;
    title: string;
    headings: ArticleHeading[];
    initialCommentCount?: number;
    isPreview: boolean;
}

export function ArticleInteractiveChrome({
    articleId,
    title,
    headings,
    initialCommentCount,
    isPreview,
}: ArticleInteractiveChromeProps) {
    const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
    const hasHeadings = headings.length > 0;

    if (isPreview) {
        return null;
    }

    return (
        <>
            {hasHeadings ? (
                <Sheet open={isMobileTocOpen} onOpenChange={setIsMobileTocOpen}>
                    <SheetContent
                        side="right"
                        className="flex w-[82vw] flex-col pr-0 sm:w-[350px] lg:hidden"
                    >
                        <SheetHeader className="mb-6 border-b border-border/50 pb-4">
                            <SheetTitle className="text-xl font-semibold text-foreground">
                                目录
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto pr-6 pb-6 pl-0.5">
                            <ArticleTableOfContents
                                headings={headings}
                                className="p-0"
                                onNavigate={() => setIsMobileTocOpen(false)}
                                showTitle={false}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            ) : null}

            <ArticleViewAndTimeTracker articleId={articleId} />
            <ArticleActions
                articleId={articleId}
                initialCommentCount={initialCommentCount}
                title={title}
                onToc={hasHeadings ? () => setIsMobileTocOpen(true) : undefined}
            />
        </>
    );
}
