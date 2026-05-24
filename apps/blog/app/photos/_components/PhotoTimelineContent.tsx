import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { TimelineNode } from './TimelineNode';
import { Camera, Loader2 } from 'lucide-react';
import type { PhotoRecord } from '@/types/photo';
import type { PhotoModalData, PhotoModalProps } from '../_lib/photo-modal';
import { formatPhotoDate, getPhotoGroupSummary } from '../_lib/photo-utils';

const PhotoModal = dynamic<PhotoModalProps>(
    () => import('./PhotoModal').then((mod) => mod.PhotoModal),
    { ssr: false },
);

export { type PhotoModalData, type PhotoModalProps } from '../_lib/photo-modal';

/**
 * 时间线展示用的照片接口
 */
interface TimelinePhoto {
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

/**
 * TimeContent 组件属性
 */
interface TimeContentProps {
    photos: PhotoRecord[];
    loading: boolean;
    totalCount: number;
}

/**
 * 时光相册时间线内容组件
 */
export default function TimeContent({ photos: apiPhotos, loading, totalCount }: TimeContentProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<TimelinePhoto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 转换 API 数据为时间线展示格式
    const timelinePhotos = useMemo(() => {
        const transformedPhotos: TimelinePhoto[] = [];

        apiPhotos.forEach((apiPhoto) => {
            const dateParts = apiPhoto.date.split('-');
            const formattedDate = formatPhotoDate(apiPhoto.date);

            // 为每张图片创建一个 TimelinePhoto 对象
            apiPhoto.src.forEach((imageUrl, imageIndex) => {
                transformedPhotos.push({
                    id: `${apiPhoto.id}-${imageIndex}`,
                    imageUrl: imageUrl,
                    title: apiPhoto.title,
                    dateKey: apiPhoto.date,
                    dateLabel: formattedDate,
                    year: dateParts[0],
                    location: apiPhoto.location,
                    category: apiPhoto.category,
                    description: apiPhoto.description,
                });
            });
        });

        return transformedPhotos;
    }, [apiPhotos]);

    // 按日期分组照片
    const groupedPhotos = useMemo(() => {
        const groups: { [key: string]: TimelinePhoto[] } = {};

        timelinePhotos.forEach((photo) => {
            if (!groups[photo.dateKey]) {
                groups[photo.dateKey] = [];
            }

            groups[photo.dateKey].push(photo);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [timelinePhotos]);

    // 处理照片点击事件
    const handlePhotoClick = (photo: TimelinePhoto) => {
        setSelectedPhoto(photo);
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // 上一张
    const handlePrev = () => {
        if (!selectedPhoto) return;
        const currentIndex = timelinePhotos.findIndex((p) => p.id === selectedPhoto.id);
        if (currentIndex > 0) {
            setSelectedPhoto(timelinePhotos[currentIndex - 1]);
        } else {
            setSelectedPhoto(timelinePhotos[timelinePhotos.length - 1]);
        }
    };

    // 下一张
    const handleNext = () => {
        if (!selectedPhoto) return;
        const currentIndex = timelinePhotos.findIndex((p) => p.id === selectedPhoto.id);
        if (currentIndex < timelinePhotos.length - 1) {
            setSelectedPhoto(timelinePhotos[currentIndex + 1]);
        } else {
            setSelectedPhoto(timelinePhotos[0]);
        }
    };

    // 将 TimelinePhoto 转换为 PhotoModalData
    const getPhotoModalData = (photo: TimelinePhoto | null): PhotoModalData | null => {
        if (!photo) return null;

        const [apiPhotoIdRaw, imageIndexRaw] = photo.id.split('-');
        const apiPhotoId = parseInt(apiPhotoIdRaw, 10);
        const initialImageIndex = parseInt(imageIndexRaw ?? '0', 10);
        const apiPhoto = apiPhotos.find((ap) => ap.id === apiPhotoId);

        if (!apiPhoto) return null;

        return {
            id: apiPhoto.id,
            src: apiPhoto.src,
            alt: apiPhoto.alt,
            title: apiPhoto.title,
            description: apiPhoto.description,
            location: apiPhoto.location,
            date: apiPhoto.date,
            tags: apiPhoto.tags,
            category: apiPhoto.category,
            createdAt: apiPhoto.createdAt,
            initialImageIndex: Number.isFinite(initialImageIndex) ? initialImageIndex : 0,
            viewerKey: photo.id,
        };
    };

    // 加载状态
    if (loading) {
        return (
            <div className="container mx-auto px-4 pb-12">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    // 空状态
    if (timelinePhotos.length === 0) {
        return (
            <div className="container mx-auto px-4 pb-12">
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="text-center">
                        <Camera className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-semibold">该分类暂无照片</h3>
                        <p className="text-muted-foreground">请尝试选择其他分类或上传新照片</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <main className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
                <div className="relative mt-12 lg:mt-16">
                    {/* 固定的中心时间线 */}
                    <div className="absolute top-0 bottom-0 left-1/2 z-0 w-0.5 -translate-x-1/2 bg-linear-to-b from-primary via-border to-border" />

                    {/* 时间线节点 */}
                    {groupedPhotos.map(([date, photos], index) => (
                        <TimelineNode
                            key={date}
                            dateLabel={photos[0]?.dateLabel ?? formatPhotoDate(date)}
                            summary={getPhotoGroupSummary(photos)}
                            photos={photos}
                            index={index}
                            isLeft={index % 2 === 0}
                            onPhotoClick={handlePhotoClick}
                        />
                    ))}

                    {/* 时间线底部装饰 */}
                    <div className="relative z-10 flex justify-center">
                        <div className="h-5 w-5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                    </div>
                </div>

                {/* 统计信息 */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-8 rounded-lg bg-card/80 p-6 shadow-lg backdrop-blur-sm">
                        <div>
                            <div className="text-2xl font-bold text-primary">{totalCount}</div>
                            <div className="text-sm text-muted-foreground">张照片</div>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div>
                            <div className="text-2xl font-bold text-primary">
                                {groupedPhotos.length}
                            </div>
                            <div className="text-sm text-muted-foreground">个时间点</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* 照片详情弹窗 */}
            {isModalOpen && selectedPhoto ? (
                <PhotoModal
                    photo={getPhotoModalData(selectedPhoto)}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            ) : null}
        </>
    );
}
