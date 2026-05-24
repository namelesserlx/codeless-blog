'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { modalCloseButtonClassName } from '@/components/ui/close-button';
import { MapPin, Calendar, X, Tag } from 'lucide-react';
import { cn } from '@/lib/shared/utils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard } from 'swiper/modules';
import type { PhotoModalProps } from '../_lib/photo-modal';

import 'swiper/css';
export type { PhotoModalData, PhotoModalProps } from '../_lib/photo-modal';

interface ViewportSize {
    width: number;
    height: number;
}

/**
 * 照片详情模态框组件
 */
export function PhotoModal({ photo, isOpen, onClose, onPrev, onNext }: PhotoModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });

    const images = useMemo(() => {
        return photo ? (Array.isArray(photo.src) ? photo.src : [photo.src]) : [];
    }, [photo]);

    const hasMultipleImages = images.length > 1;
    const currentImageSrc = images[currentImageIndex] ?? images[0] ?? '';
    const isMobile = viewportSize.width > 0 ? viewportSize.width < 768 : false;
    const initialImageIndex = (() => {
        const candidate = photo?.initialImageIndex ?? 0;
        if (!Number.isFinite(candidate)) {
            return 0;
        }

        return Math.min(Math.max(candidate, 0), Math.max(images.length - 1, 0));
    })();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updateViewport = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);

        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        setCurrentImageIndex(initialImageIndex);
    }, [initialImageIndex, photo?.viewerKey]);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 250);
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleClose();
            if (event.key === 'ArrowLeft') onPrev();
            if (event.key === 'ArrowRight') onNext();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            const scrollY = window.scrollY;
            const originalOverflow = document.body.style.overflow;
            const originalPosition = document.body.style.position;
            const originalTop = document.body.style.top;
            const originalWidth = document.body.style.width;

            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                document.body.style.top = originalTop;
                document.body.style.width = originalWidth;
                window.scrollTo(0, scrollY);
            };
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClose, isOpen, onNext, onPrev]);

    if (!shouldRender || !photo) {
        return null;
    }

    const handleImageLoad = (imageSrc: string) => {
        setLoadedImages((prev) => {
            if (prev.has(imageSrc)) {
                return prev;
            }

            return new Set(prev).add(imageSrc);
        });
    };

    const formattedDate = (() => {
        const parsedDate = new Date(photo.date);

        if (Number.isNaN(parsedDate.getTime())) {
            return photo.date;
        }

        return parsedDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    })();

    const stageBounds = (() => {
        const width = viewportSize.width || 390;
        const height = viewportSize.height || 844;

        if (isMobile) {
            const maxWidth = Math.max(280, width);
            const maxHeight = Math.min(Math.max(width / 1.05, 340), Math.max(height * 0.48, 360));

            return {
                maxWidth,
                maxHeight,
                shellHeight: maxHeight + 44,
            };
        }

        const sidebarWidth = width >= 1280 ? 400 : 360;
        const maxWidth = Math.min(1100, Math.max(420, width - sidebarWidth - 72));
        const maxHeight = Math.min(Math.max(height - 140, 360), 820);

        return {
            maxWidth,
            maxHeight,
            shellHeight: maxHeight + 32,
        };
    })();

    const fixedStageSize = {
        width: stageBounds.maxWidth,
        height: stageBounds.maxHeight,
    };

    const renderMediaFrame = (imageSrc: string, index: number) => {
        const isLoaded = loadedImages.has(imageSrc);
        const frameStyle = isMobile
            ? { width: '100%', height: `${fixedStageSize.height}px` }
            : {
                  width: `${fixedStageSize.width}px`,
                  height: `${fixedStageSize.height}px`,
              };

        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="relative overflow-hidden rounded-[24px]" style={frameStyle}>
                    {!isLoaded && <div className="animate-shimmer absolute inset-0" />}

                    <Image
                        src={imageSrc}
                        alt={`${photo.alt} - ${index + 1}`}
                        fill
                        className={cn(
                            'object-contain transition-all duration-300',
                            isLoaded ? 'opacity-100' : 'opacity-0',
                        )}
                        preload={index === currentImageIndex}
                        sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1400px) calc(100vw - 520px), 980px"
                        onLoad={() => handleImageLoad(imageSrc)}
                    />
                </div>
            </div>
        );
    };

    const detailContent = (
        <div className="space-y-5">
            <div>
                <Badge variant="secondary" className="mb-3 text-xs">
                    {photo.category}
                </Badge>
                <h2 className="mb-3 text-2xl font-bold tracking-tight lg:text-3xl">
                    {photo.title}
                </h2>
                {photo.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        {photo.description}
                    </p>
                )}
            </div>

            <div className="grid gap-3">
                {photo.location && (
                    <div className="rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">地点</p>
                                <p className="truncate font-medium">{photo.location}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">拍摄日期</p>
                            <p className="font-medium">{formattedDate}</p>
                        </div>
                    </div>
                </div>

                {photo.tags.length > 0 && (
                    <div className="rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">标签</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {photo.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/[0.05] dark:text-white/90"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 bg-black/92',
                isAnimating ? 'modal-overlay-enter' : 'modal-overlay-exit',
            )}
            onClick={handleClose}
        >
            <div className="hidden h-full items-center justify-center p-4 md:flex">
                <div
                    className={cn(
                        'relative overflow-hidden rounded-[24px] bg-[#111827] shadow-2xl',
                        isAnimating ? 'modal-content-enter' : 'modal-content-exit',
                    )}
                    style={{
                        width: `${Math.min(
                            (viewportSize.width || 1440) - 32,
                            fixedStageSize.width + 380,
                        )}px`,
                    }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn('absolute top-4 right-4 z-10', modalCloseButtonClassName)}
                        onClick={handleClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="grid grid-cols-[minmax(0,1fr)_380px]">
                        <div
                            className="relative flex items-center justify-center overflow-hidden rounded-l-[24px] bg-[#111827]"
                            style={{ minHeight: `${fixedStageSize.height}px` }}
                        >
                            <div
                                className="relative flex w-full items-center justify-center"
                                style={{ minHeight: `${fixedStageSize.height}px` }}
                            >
                                {hasMultipleImages ? (
                                    <Swiper
                                        key={`desktop-${photo.viewerKey ?? photo.id}`}
                                        modules={[Keyboard]}
                                        initialSlide={initialImageIndex}
                                        spaceBetween={0}
                                        slidesPerView={1}
                                        keyboard={{ enabled: true }}
                                        onSlideChange={(swiper) =>
                                            setCurrentImageIndex(swiper.activeIndex)
                                        }
                                        className="w-full"
                                    >
                                        {images.map((imageSrc, index) => (
                                            <SwiperSlide
                                                key={`${imageSrc}-${index}`}
                                                className="!flex w-full items-center justify-center"
                                            >
                                                {renderMediaFrame(imageSrc, index)}
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                ) : (
                                    renderMediaFrame(currentImageSrc, 0)
                                )}
                            </div>

                            {hasMultipleImages && (
                                <div className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/58 px-3 py-1 text-sm text-white backdrop-blur-md">
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            )}
                        </div>

                        <aside className="rounded-r-[24px] border-l border-border/20 bg-background px-8 py-8">
                            {detailContent}
                        </aside>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    'relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background md:hidden',
                    isAnimating ? 'modal-content-enter' : 'modal-content-exit',
                )}
                onClick={(event) => event.stopPropagation()}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-[max(env(safe-area-inset-top),1rem)] right-4 z-10 bg-transparent text-white transition-[background-color,color] duration-200 hover:bg-white/16 hover:text-white active:bg-white/20"
                    onClick={handleClose}
                >
                    <X className="h-5 w-5" />
                </Button>

                <div
                    className="relative shrink-0 overflow-hidden bg-[#111827]"
                    style={{ minHeight: `${fixedStageSize.height}px` }}
                >
                    <div
                        className="relative flex w-full items-center justify-center"
                        style={{ minHeight: `${fixedStageSize.height}px` }}
                    >
                        {hasMultipleImages ? (
                            <Swiper
                                key={`mobile-${photo.viewerKey ?? photo.id}`}
                                modules={[Keyboard]}
                                initialSlide={initialImageIndex}
                                spaceBetween={0}
                                slidesPerView={1}
                                keyboard={{ enabled: true }}
                                onSlideChange={(swiper) => setCurrentImageIndex(swiper.activeIndex)}
                                className="w-full"
                            >
                                {images.map((imageSrc, index) => (
                                    <SwiperSlide
                                        key={`${imageSrc}-${index}`}
                                        className="!flex w-full items-center justify-center"
                                    >
                                        {renderMediaFrame(imageSrc, index)}
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        ) : (
                            renderMediaFrame(currentImageSrc, 0)
                        )}
                    </div>

                    {hasMultipleImages && (
                        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/58 px-3 py-1 text-sm text-white backdrop-blur-md">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    )}
                </div>

                <div
                    className="relative flex flex-none flex-col overflow-hidden rounded-t-[30px] border-t border-border/20 bg-background px-5 pt-4"
                    style={{
                        maxHeight: `calc(100dvh - ${fixedStageSize.height}px)`,
                        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
                    }}
                >
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border/70" />
                    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                        {detailContent}
                    </div>
                </div>
            </div>
        </div>
    );
}
