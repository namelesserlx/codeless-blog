'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { CalendarDays, Images } from 'lucide-react';
import type { PhotoRecord } from '@/types/photo';
import MobilePhotoCard from './MobilePhotoCard';
import type { PhotoModalProps } from '../_lib/photo-modal';
import { formatPhotoDate, getImageCount, toPhotoModalData } from '../_lib/photo-utils';

const PhotoModal = dynamic<PhotoModalProps>(
    () => import('./PhotoModal').then((mod) => mod.PhotoModal),
    { ssr: false },
);

interface MobilePhotoTimelineProps {
    photos: PhotoRecord[];
}

export default function MobilePhotoTimeline({ photos }: MobilePhotoTimelineProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

    const groupedPhotos = useMemo(() => {
        const groups: Record<string, PhotoRecord[]> = {};

        photos.forEach((photo) => {
            if (!groups[photo.date]) {
                groups[photo.date] = [];
            }

            groups[photo.date].push(photo);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [photos]);

    const handlePrev = () => {
        if (!selectedPhoto || photos.length === 0) {
            return;
        }

        const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
        setSelectedPhoto(photos[nextIndex]);
    };

    const handleNext = () => {
        if (!selectedPhoto || photos.length === 0) {
            return;
        }

        const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
        const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
        setSelectedPhoto(photos[nextIndex]);
    };

    return (
        <>
            <div className="container mx-auto px-4 pb-16 md:hidden">
                <div className="space-y-8">
                    {groupedPhotos.map(([date, items], groupIndex) => {
                        const imageCount = getImageCount(items);

                        return (
                            <section key={date} className="space-y-4">
                                <div className="flex items-start justify-between gap-4 px-1">
                                    <div className="min-w-0">
                                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-primary/80 backdrop-blur-sm">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            <span>第 {groupIndex + 1} 个时间点</span>
                                        </div>
                                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                            {formatPhotoDate(date)}
                                        </h2>
                                    </div>

                                    <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                                        <Images className="h-3.5 w-3.5" />
                                        <span>{imageCount} 张</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {items.map((photo, index) => (
                                        <MobilePhotoCard
                                            key={photo.id}
                                            photo={photo}
                                            index={groupIndex * 10 + index}
                                            onClick={setSelectedPhoto}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {selectedPhoto ? (
                <PhotoModal
                    photo={toPhotoModalData(selectedPhoto)}
                    isOpen={Boolean(selectedPhoto)}
                    onClose={() => setSelectedPhoto(null)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            ) : null}
        </>
    );
}
