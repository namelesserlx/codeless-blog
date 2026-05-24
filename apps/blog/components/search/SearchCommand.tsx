'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Search as SearchIcon } from 'lucide-react';

const SearchModal = dynamic(() => import('./SearchModal').then((module) => module.SearchModal), {
    ssr: false,
});

export function SearchCommand() {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex h-8 w-[70px] cursor-pointer items-center justify-between rounded-full border border-input/50 bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                aria-label="搜索 (⌘K)"
            >
                <div className="flex items-center gap-1.5">
                    <SearchIcon className="h-3.5 w-3.5" />
                    <span className="font-normal">⌘K</span>
                </div>
            </button>
            <SearchModal open={open} setOpen={setOpen} />
        </>
    );
}
