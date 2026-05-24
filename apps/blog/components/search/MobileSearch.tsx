'use client';

import dynamic from 'next/dynamic';
import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';

const SearchModal = dynamic(() => import('./SearchModal').then((module) => module.SearchModal), {
    ssr: false,
});

export function MobileSearch() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-primary"
                aria-label="搜索"
                onClick={() => {
                    setOpen(true);
                }}
            >
                <SearchIcon size={24} />
            </button>
            <SearchModal open={open} setOpen={setOpen} />
        </>
    );
}
