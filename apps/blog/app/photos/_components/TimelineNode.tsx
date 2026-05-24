'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { Images, MapPin } from 'lucide-react';
import { cn } from '@/lib/shared/utils';
import { useIntersectionObserver } from '@/components/photo/useIntersectionObserver';
import type { PhotoGroupSummary } from '../_lib/photo-utils';

interface Photo {
    id: string;
    imageUrl: string;
    title: string;
    dateKey: string;
    dateLabel: string;
    year: string;
    location: string;
    category: string;
    description: string;
}

interface TimelineNodeProps {
    dateLabel: string;
    summary: PhotoGroupSummary;
    photos: Photo[];
    index: number;
    isLeft: boolean;
    onPhotoClick: (photo: Photo) => void;
}

export function TimelineNode({
    dateLabel,
    summary,
    photos,
    index,
    isLeft,
    onPhotoClick,
}: TimelineNodeProps) {
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredPhotoIndex, setHoveredPhotoIndex] = useState<number | null>(null);

    // 使用 Intersection Observer 实现懒加载
    const { ref, isVisible } = useIntersectionObserver({
        threshold: 0.1,
        rootMargin: '200px', // 提前200px开始加载
        triggerOnce: true, // 只触发一次，提升性能
    });

    const handleImageLoad = (photoId: string, naturalWidth: number, naturalHeight: number) => {
        setLoadedImages((prev) => {
            if (prev.has(photoId)) {
                return prev;
            }

            return new Set(prev).add(photoId);
        });

        const nextRatio = naturalWidth / naturalHeight;

        if (!Number.isFinite(nextRatio) || nextRatio <= 0) {
            return;
        }

        setImageRatios((prev) => {
            if (prev[photoId] === nextRatio) {
                return prev;
            }

            return { ...prev, [photoId]: nextRatio };
        });
    };

    const getCardSize = (photo: Photo, photoIndex: number) => {
        const ratio = imageRatios[photo.id] ?? 1.22;
        const variation = 1 + ((photoIndex % 4) - 1.5) * 0.045;
        const sideScale = isLeft ? 0.98 : 1.02;
        const targetArea = 96000 * variation * sideScale;

        let width = Math.sqrt(targetArea * ratio);
        let height = width / ratio;

        const scaleDown = Math.min(1, 420 / width, 360 / height);
        width *= scaleDown;
        height *= scaleDown;

        const scaleUp = Math.max(160 / width, 140 / height, 1);
        width *= scaleUp;
        height *= scaleUp;

        return {
            width: Math.round(width),
            height: Math.round(height),
        };
    };

    const getStackTransform = (photoIndex: number, total: number) => {
        const { width } = getCardSize(photos[photoIndex], photoIndex);

        if (!isHovered) {
            const totalSpread = Math.min(50, 15 * total);
            const startAngle = -totalSpread / 2;
            const angleStep = total > 1 ? totalSpread / (total - 1) : 0;
            const rotation = startAngle + angleStep * photoIndex;

            const radius = 15 + total * 2;
            const offsetX = Math.sin((rotation * Math.PI) / 180) * radius;
            const offsetY = -Math.cos((rotation * Math.PI) / 180) * radius * 0.5 + photoIndex * 2;

            const stackCenterOffset = isLeft ? -150 - width / 2 : 150 + width / 2;
            const isFocused = hoveredPhotoIndex === photoIndex;

            return {
                x: stackCenterOffset + offsetX,
                y: offsetY,
                rotate: rotation,
                scale: isFocused ? 1.12 : 1,
                zIndex: isFocused ? 100 : total - photoIndex,
            };
        }

        let offsetBeforeCurrent = 0;
        for (let i = 0; i < photoIndex; i++) {
            offsetBeforeCurrent += getCardSize(photos[i], i).width + 20;
        }

        const totalWidth = photos.reduce(
            (sum, photo, i) => sum + getCardSize(photo, i).width + 20,
            -20,
        );
        const startX = -totalWidth / 2;
        const finalX = startX + offsetBeforeCurrent + width / 2;
        const isFocused = hoveredPhotoIndex === photoIndex;

        return {
            x: finalX,
            y: 0,
            rotate: 0,
            scale: isFocused ? 1.05 : 1,
            zIndex: isFocused ? 100 : photoIndex + 1,
        };
    };

    const maxHeight = Math.max(...photos.map((photo, i) => getCardSize(photo, i).height));
    const hasMultiple = photos.length > 1;
    const stageMinHeight = maxHeight + 180;

    const renderInfo = (className: string, pillsClassName: string) => (
        <motion.div
            className={cn('flex flex-col gap-3', className)}
            animate={{
                y: isHovered ? 0 : 12,
                opacity: isHovered ? 1 : 0.76,
            }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
        >
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{dateLabel}</h2>

            <div className={cn('flex flex-wrap gap-2', pillsClassName)}>
                {summary.locationLabel && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{summary.locationLabel}</span>
                    </div>
                )}

                {summary.categoryLabel && (
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                        {summary.categoryLabel}
                    </div>
                )}

                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                    <Images className="h-3.5 w-3.5" />
                    <span>{summary.countLabel}</span>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="relative isolate mb-24 w-full lg:mb-28" ref={ref}>
            {/* 骨架屏占位符 - 在节点未进入视口时显示 */}
            {!isVisible ? (
                <motion.div
                    className="relative w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    style={{ minHeight: `${stageMinHeight}px` }}
                >
                    <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2 pt-2">
                        {/* 骨架圆点 */}
                        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
                    </div>

                    <div className="relative w-full pt-24 lg:pt-32">
                        <div
                            className="relative w-full overflow-visible"
                            style={{ minHeight: `${stageMinHeight - 72}px` }}
                        >
                            <div className="absolute top-1/2 left-1/2 h-0 w-0 -translate-y-1/2">
                                {/* 骨架照片卡片 */}
                                {photos.map((_, photoIndex) => {
                                    const { width, height } = getCardSize(
                                        photos[photoIndex],
                                        photoIndex,
                                    );
                                    const transform = getStackTransform(photoIndex, photos.length);

                                    return (
                                        <div
                                            key={photoIndex}
                                            className="absolute animate-pulse rounded-2xl border-4 border-[#e2e8f0] bg-white shadow-2xl dark:border-[#4a5568] dark:bg-[#2d3748]"
                                            style={{
                                                width: `${width}px`,
                                                height: `${height}px`,
                                                left: `-${width / 2}px`,
                                                top: `-${height / 2}px`,
                                                transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotate}deg)`,
                                                zIndex: transform.zIndex,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                // 实际内容 - 只有在进入视口时才渲染
                <motion.div
                    className="relative w-full"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.6,
                        delay: index * 0.12,
                        ease: [0.25, 0.1, 0.25, 1],
                    }}
                    style={{ minHeight: `${stageMinHeight}px` }}
                >
                    {/* 左侧信息区域 */}
                    {isLeft && (
                        <div className="absolute top-0 right-1/2 hidden w-1/2 pr-12 lg:block lg:pr-20">
                            <div className="pt-8">
                                {renderInfo('items-end text-right', 'justify-end')}
                            </div>
                        </div>
                    )}

                    {/* 右侧信息区域 */}
                    {!isLeft && (
                        <div className="absolute top-0 left-1/2 hidden w-1/2 pl-12 lg:block lg:pl-20">
                            <div className="pt-8">
                                {renderInfo('items-start text-left', 'justify-start')}
                            </div>
                        </div>
                    )}

                    {/* 中间轴圆点 - 固定在屏幕中央 */}
                    <div className="absolute top-0 left-1/2 z-20 flex -translate-x-1/2 justify-center pt-2">
                        {/* 连接线 */}
                        <motion.div
                            className={cn(
                                'absolute top-1/2 h-0.5 w-10 -translate-y-1/2 lg:w-16',
                                isLeft
                                    ? 'right-[calc(100%+8px)] origin-right bg-linear-to-r'
                                    : 'left-[calc(100%+8px)] origin-left bg-linear-to-l',
                                'from-primary via-primary/55 to-transparent',
                            )}
                            animate={{
                                opacity: isHovered ? 1 : 0.6,
                                scaleX: isHovered ? 1.18 : 1,
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />

                        <div className="relative flex h-5 w-5 items-center justify-center">
                            <motion.div
                                className="absolute inset-0 rounded-full bg-primary/30 blur-[2px]"
                                animate={{
                                    scale: isHovered ? 1.95 : 1.15,
                                    opacity: isHovered ? 0.8 : 0.4,
                                }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />

                            <motion.div
                                className="relative h-5 w-5 rounded-full bg-primary shadow-[0_0_24px_rgba(56,189,248,0.45)] shadow-primary/60"
                                animate={{
                                    scale: isHovered ? 1.22 : 1,
                                }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                <motion.div
                                    className="absolute inset-[3px] rounded-full border border-white/20"
                                    animate={{
                                        opacity: isHovered ? 0.7 : 0.4,
                                    }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                            </motion.div>

                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full bg-primary/35"
                                        initial={{ scale: 1, opacity: 0.5 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                            duration: 1.1,
                                            repeat: Infinity,
                                            ease: 'easeOut',
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 照片区域 - 围绕中心线定位 */}
                    <div className="relative w-full pt-24 lg:pt-32">
                        {/* 移动端标题 */}
                        <div className="mb-5 px-4 lg:hidden">
                            {renderInfo('items-start text-left', 'justify-start')}
                        </div>

                        {/* 照片堆叠容器 - 以屏幕中心为参考点 */}
                        <div
                            className="relative isolate w-full overflow-visible"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => {
                                setIsHovered(false);
                                setHoveredPhotoIndex(null);
                            }}
                            style={{
                                minHeight: `${stageMinHeight - 64}px`,
                            }}
                        >
                            {/* 固定参考点 - 屏幕中心 */}
                            <div
                                className="absolute top-1/2 left-1/2 h-0 w-0 -translate-y-1/2"
                                style={{ zIndex: 10 }}
                            >
                                {photos.map((photo, photoIndex) => {
                                    const transform = getStackTransform(photoIndex, photos.length);
                                    const { width, height } = getCardSize(photo, photoIndex);

                                    return (
                                        <motion.div
                                            key={photo.id}
                                            className="absolute cursor-pointer"
                                            style={{
                                                width: `${width}px`,
                                                height: `${height}px`,
                                                left: `-${width / 2}px`,
                                                top: `-${height / 2}px`,
                                            }}
                                            animate={{
                                                x: transform.x,
                                                y: transform.y,
                                                rotate: transform.rotate,
                                                scale: transform.scale,
                                                zIndex: transform.zIndex,
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                ease: [0.34, 1.56, 0.64, 1],
                                            }}
                                            whileHover={{
                                                y: transform.y - 8,
                                                transition: { duration: 0.2, ease: 'easeOut' },
                                            }}
                                            onHoverStart={() => setHoveredPhotoIndex(photoIndex)}
                                            onHoverEnd={() => {
                                                if (hoveredPhotoIndex === photoIndex) {
                                                    setHoveredPhotoIndex(null);
                                                }
                                            }}
                                            onClick={() => onPhotoClick(photo)}
                                        >
                                            <div
                                                className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-[#e2e8f0] bg-white shadow-2xl will-change-transform dark:border-[#4a5568] dark:bg-[#2d3748]"
                                                style={{
                                                    boxShadow:
                                                        hoveredPhotoIndex === photoIndex
                                                            ? '0 25px 50px -12px rgba(66, 153, 225, 0.5)'
                                                            : '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                                                    transition: 'box-shadow 0.3s ease-out',
                                                }}
                                            >
                                                {/* 加载骨架屏 */}
                                                {!loadedImages.has(photo.id) && (
                                                    <div className="animate-shimmer absolute inset-0" />
                                                )}

                                                {/* 图片 */}
                                                <div className="relative h-full w-full overflow-hidden">
                                                    <Image
                                                        src={photo.imageUrl}
                                                        alt={photo.title}
                                                        fill
                                                        preload={index === 0 && photoIndex === 0}
                                                        className={`h-full w-full object-cover transition-all duration-500 ${
                                                            loadedImages.has(photo.id)
                                                                ? 'opacity-100'
                                                                : 'opacity-0'
                                                        }`}
                                                        style={{
                                                            transform:
                                                                hoveredPhotoIndex === photoIndex
                                                                    ? 'scale(1.04)'
                                                                    : 'scale(1)',
                                                            transition: 'transform 0.5s ease-out',
                                                        }}
                                                        onLoad={(event) =>
                                                            handleImageLoad(
                                                                photo.id,
                                                                event.currentTarget.naturalWidth,
                                                                event.currentTarget.naturalHeight,
                                                            )
                                                        }
                                                        sizes="(max-width: 1024px) 70vw, 380px"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 提示文字 */}
                        {hasMultiple && (
                            <div className="mt-6 px-4 lg:px-0">
                                <motion.p
                                    className={cn(
                                        'pointer-events-none flex min-h-5 items-center gap-2 text-xs text-muted-foreground lg:min-h-6 lg:text-sm',
                                        isLeft ? 'lg:justify-start' : 'lg:justify-end',
                                    )}
                                    animate={{
                                        opacity: isHovered ? 0 : 0.6,
                                        y: isHovered ? -6 : 0,
                                    }}
                                    transition={{ duration: 0.24, ease: 'easeOut' }}
                                >
                                    <motion.span
                                        className="inline-block h-2 w-2 rounded-full bg-primary"
                                        animate={{
                                            scale: isHovered ? 1 : [1, 1.3, 1],
                                            opacity: isHovered ? 0 : 1,
                                        }}
                                        transition={
                                            isHovered
                                                ? { duration: 0.18, ease: 'easeOut' }
                                                : {
                                                      duration: 2,
                                                      repeat: Infinity,
                                                      ease: 'easeInOut',
                                                  }
                                        }
                                    />
                                    悬停展开查看全部 · 扇形堆叠布局
                                </motion.p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
