'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { cn } from '@/lib/shared/utils';
import type { SnippetMediaItem } from '../_lib/snippet-types';

const SnippetImagePreview = dynamic(
    () => import('./SnippetImagePreview').then((module) => module.SnippetImagePreview),
    {
        ssr: false,
        loading: () => null,
    },
);

interface SnippetMediaGridProps {
    media: SnippetMediaItem[];
    excerpt: string;
    prioritizeMedia?: boolean;
}

function getSingleMediaSizes(isPortrait: boolean) {
    return isPortrait
        ? '(max-width: 640px) 66vw, 320px'
        : '(max-width: 640px) calc(100vw - 3rem), 672px';
}

function getGridMediaSizes(count: number) {
    if (count === 2 || count === 4) {
        return '(max-width: 640px) calc((100vw - 3.5rem) / 2), 224px';
    }

    return '(max-width: 640px) calc((100vw - 4rem) / 3), 160px';
}

interface InlineSnippetVideoProps {
    item: SnippetMediaItem;
    className: string;
    prioritizeVideo?: boolean;
}

function InlineSnippetVideo({ item, className, prioritizeVideo = false }: InlineSnippetVideoProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg border border-zinc-200/50 bg-black dark:border-zinc-800/50',
                className,
            )}
        >
            <video
                src={item.url}
                poster={item.posterUrl}
                preload={prioritizeVideo ? 'metadata' : 'none'}
                playsInline
                controls
                disablePictureInPicture
                className="h-full w-full bg-black object-cover"
            />
        </div>
    );
}

export function SnippetMediaGrid({
    media,
    excerpt,
    prioritizeMedia = false,
}: SnippetMediaGridProps) {
    const [previewState, setPreviewState] = useState({
        open: false,
        initialIndex: 0,
    });

    if (media.length === 0) {
        return null;
    }

    const previewMedia = media.filter((item) => item.type === 'image');
    const openImagePreview = (index: number) => {
        const selectedMedia = media[index];
        const imageIndex = previewMedia.findIndex((item) => item.id === selectedMedia?.id);

        if (imageIndex === -1) {
            return;
        }

        setPreviewState({
            open: true,
            initialIndex: imageIndex,
        });
    };

    const count = media.length;
    const isSingle = count === 1;
    const singleMedia = media[0];

    if (isSingle && singleMedia) {
        const isVideo = singleMedia.type === 'video';
        const aspectRatio = singleMedia.aspectRatio || 1;
        const isPortrait = aspectRatio < 1;
        const containerClasses = isPortrait
            ? 'w-2/3 sm:w-1/2 aspect-[3/4]'
            : 'w-full sm:w-4/5 aspect-video';
        const mediaSizes = getSingleMediaSizes(isPortrait);

        if (isVideo) {
            return (
                <InlineSnippetVideo
                    item={singleMedia}
                    className={containerClasses}
                    prioritizeVideo={prioritizeMedia}
                />
            );
        }

        return (
            <>
                <button
                    type="button"
                    onClick={() => openImagePreview(0)}
                    className={cn(
                        'group/item relative cursor-pointer overflow-hidden rounded-lg border border-zinc-200/50 text-left dark:border-zinc-800/50',
                        containerClasses,
                    )}
                    aria-label="打开媒体预览"
                >
                    <div className="relative h-full w-full">
                        <Image
                            src={singleMedia.url}
                            alt={excerpt}
                            fill
                            preload={prioritizeMedia}
                            sizes={mediaSizes}
                            className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                        />
                    </div>
                </button>

                {previewState.open && previewMedia.length > 0 ? (
                    <SnippetImagePreview
                        media={previewMedia}
                        initialIndex={previewState.initialIndex}
                        isOpen={previewState.open}
                        onClose={() => setPreviewState((state) => ({ ...state, open: false }))}
                    />
                ) : null}
            </>
        );
    }

    let gridClasses = 'grid gap-1.5';
    let containerWidth = 'w-full';

    if (count === 2 || count === 4) {
        gridClasses += ' grid-cols-2';
        containerWidth = 'w-2/3';
    } else {
        gridClasses += ' grid-cols-3';
    }

    const mediaSizes = getGridMediaSizes(count);

    return (
        <>
            <div className={containerWidth}>
                <div className={gridClasses}>
                    {media.map((item, index) => {
                        const isVideo = item.type === 'video';
                        const shouldPrioritize = prioritizeMedia && index === 0;

                        if (isVideo) {
                            return (
                                <InlineSnippetVideo
                                    key={item.id}
                                    item={item}
                                    className="aspect-square"
                                    prioritizeVideo={shouldPrioritize}
                                />
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openImagePreview(index)}
                                className="group/item relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-zinc-200/50 text-left dark:border-zinc-800/50"
                                aria-label={`打开第 ${index + 1} 项媒体`}
                            >
                                <Image
                                    src={item.url}
                                    alt={`${excerpt} ${index + 1}`}
                                    fill
                                    preload={shouldPrioritize}
                                    sizes={mediaSizes}
                                    className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            {previewState.open && previewMedia.length > 0 ? (
                <SnippetImagePreview
                    media={previewMedia}
                    initialIndex={previewState.initialIndex}
                    isOpen={previewState.open}
                    onClose={() => setPreviewState((state) => ({ ...state, open: false }))}
                />
            ) : null}
        </>
    );
}
