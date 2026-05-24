'use client';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/shared/utils';
import Image from 'next/image';
import { Camera, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PhotoRecord } from '@/types/photo';

interface MobilePhotoCardProps {
    photo: PhotoRecord;
    index: number;
    onClick: (photo: PhotoRecord) => void;
}

export default function MobilePhotoCard({ photo, index, onClick }: MobilePhotoCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [imageRatio, setImageRatio] = useState(4 / 3);
    const cardRef = useRef<HTMLDivElement>(null);

    const images = Array.isArray(photo.src) ? photo.src : [photo.src];
    const displayImage = images[0];

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px', threshold: 0.1 },
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={cardRef}
            className={cn(
                'group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 active:scale-[0.98]',
                'border border-slate-200/80 bg-white/78 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/22 dark:shadow-[0_24px_80px_-50px_rgba(2,6,23,0.9)]',
                'animate-fade-in-up',
            )}
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => onClick(photo)}
        >
            <div className="relative overflow-hidden" style={{ aspectRatio: `${imageRatio}` }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.88))]" />
                {isVisible && (
                    <>
                        <Image
                            src={displayImage}
                            alt={`${photo.alt} 背景`}
                            fill
                            aria-hidden="true"
                            className="scale-110 object-cover opacity-25 blur-2xl"
                            loading="lazy"
                            sizes="(max-width: 768px) calc(100vw - 32px), 400px"
                        />
                        <Image
                            src={displayImage}
                            alt={photo.alt}
                            fill
                            preload={index === 0}
                            className={cn(
                                'object-cover transition-all duration-500',
                                isLoaded ? 'opacity-100' : 'opacity-0',
                            )}
                            onLoad={(event) => {
                                const nextRatio =
                                    event.currentTarget.naturalWidth /
                                    event.currentTarget.naturalHeight;

                                if (Number.isFinite(nextRatio) && nextRatio > 0) {
                                    setImageRatio(nextRatio);
                                }

                                setIsLoaded(true);
                            }}
                            sizes="(max-width: 768px) calc(100vw - 32px), 400px"
                        />
                    </>
                )}

                {/* 多图标识 */}
                {images.length > 1 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-xs text-white backdrop-blur-md">
                        <Camera className="h-3 w-3" />
                        {images.length}
                    </div>
                )}

                {/* 渐变遮罩 */}
                {!isLoaded && <div className="animate-shimmer absolute inset-0" />}
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

                {/* 内容 */}
                <div className="absolute right-0 bottom-0 left-0 p-4 text-white">
                    <div className="mb-2 flex items-center gap-2">
                        <Badge className="border-0 bg-white/18 px-2.5 py-1 text-[11px] backdrop-blur-sm">
                            {photo.category}
                        </Badge>
                    </div>
                    <h3 className="line-clamp-1 text-base font-semibold tracking-tight">
                        {photo.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {photo.location}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
