'use client';

import { useMemo, useState, useTransition } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/shared/utils';
import type { PhotoRecord } from '@/types/photo';
import MobilePhotoTimeline from './MobilePhotoTimeline';
import PhotoTimelineContent from './PhotoTimelineContent';

const categories = ['全部', '风景', '动物', '人物', '建筑', '美食', '旅行', '日常'];

interface PhotosPageClientProps {
    initialPhotos: PhotoRecord[];
}

export function PhotosPageClient({ initialPhotos }: PhotosPageClientProps) {
    const [selectedCategory, setSelectedCategory] = useState('全部');
    const [, startTransition] = useTransition();

    const filteredPhotos = useMemo(() => {
        if (selectedCategory === '全部') {
            return initialPhotos;
        }

        return initialPhotos.filter((photo) => photo.category === selectedCategory);
    }, [initialPhotos, selectedCategory]);

    return (
        <div className="min-h-screen bg-linear-to-br from-background via-background/50 to-primary/5">
            <div className="container mx-auto px-4 pt-10 pb-6 md:pt-14 md:pb-8">
                <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                        <Camera className="h-4 w-4" />
                        <span className="text-sm font-medium">Photography</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight md:text-6xl">时光相册</h1>
                    <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                        记录生活中的美好瞬间
                    </p>
                </div>

                <div className="mx-auto max-w-4xl">
                    <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card/75 p-3 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:shadow-[0_24px_80px_-48px_rgba(2,6,23,0.75)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_55%)]" />
                        <div className="relative flex items-center justify-between gap-3 px-2 pb-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">按主题筛选</p>
                                <p className="text-xs text-muted-foreground">
                                    减少重复信息，专注看照片本身
                                </p>
                            </div>
                            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                                {filteredPhotos.length} 张照片
                            </div>
                        </div>

                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
                            {categories.map((category) => {
                                const isActive = selectedCategory === category;

                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() =>
                                            startTransition(() => setSelectedCategory(category))
                                        }
                                        className={cn(
                                            'inline-flex h-auto shrink-0 items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                                            isActive
                                                ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                                                : 'border-border/50 bg-background text-muted-foreground',
                                        )}
                                        aria-pressed={isActive}
                                    >
                                        {category}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden md:block">
                <PhotoTimelineContent
                    photos={filteredPhotos}
                    loading={false}
                    totalCount={filteredPhotos.length}
                />
            </div>

            <MobilePhotoTimeline photos={filteredPhotos} />
        </div>
    );
}
