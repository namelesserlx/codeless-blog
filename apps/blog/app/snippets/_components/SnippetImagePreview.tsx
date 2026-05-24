'use client';

import { useState, useEffect, useRef } from 'react';
import { PhotoSlider } from 'react-photo-view';
import { Drawer } from 'vaul';
import { Download, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { SnippetMediaItem } from '../_lib/snippet-types';

interface SnippetImagePreviewProps {
    media: SnippetMediaItem[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

function copyTextWithExecCommand(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    return copied;
}

async function copyTextToClipboard(text: string) {
    if (
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
    ) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    return copyTextWithExecCommand(text);
}

async function shareMediaUrl(url: string) {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
            title: document.title,
            url,
        });
        return 'shared';
    }

    const copied = await copyTextToClipboard(url);
    return copied ? 'copied' : 'failed';
}

export function SnippetImagePreview({
    media,
    initialIndex,
    isOpen,
    onClose,
}: SnippetImagePreviewProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const currentScaleRef = useRef(1);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            currentScaleRef.current = 1;
            setIsDrawerOpen(false);
        }
    }, [initialIndex, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let longPressTimer: ReturnType<typeof setTimeout> | null = null;
        let touchStartX = 0;
        let touchStartY = 0;

        const onContextMenu = (event: Event) => {
            event.preventDefault();
        };

        const onTouchStart = (event: TouchEvent) => {
            if (currentScaleRef.current > 1) {
                return;
            }

            if (event.touches.length === 1) {
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;

                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                }

                longPressTimer = setTimeout(() => {
                    setIsDrawerOpen(true);
                }, 500);
            } else {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        };

        const onTouchMove = (event: TouchEvent) => {
            if (event.touches.length > 1) {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }

                return;
            }

            if (event.touches.length === 1 && longPressTimer) {
                const deltaX = event.touches[0].clientX - touchStartX;
                const deltaY = event.touches[0].clientY - touchStartY;

                if (Math.hypot(deltaX, deltaY) > 10) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        };

        const onTouchEnd = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const originalWebkitTouchCallout = (
            document.body.style as CSSStyleDeclaration & {
                webkitTouchCallout?: string;
            }
        ).webkitTouchCallout;
        const originalWebkitUserSelect = (
            document.body.style as CSSStyleDeclaration & {
                webkitUserSelect?: string;
            }
        ).webkitUserSelect;
        const originalUserSelect = document.body.style.userSelect;

        (
            document.body.style as CSSStyleDeclaration & { webkitTouchCallout?: string }
        ).webkitTouchCallout = 'none';
        (
            document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }
        ).webkitUserSelect = 'none';
        document.body.style.userSelect = 'none';

        document.addEventListener('contextmenu', onContextMenu);
        document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });
        document.addEventListener('touchend', onTouchEnd, { capture: true });
        document.addEventListener('touchcancel', onTouchEnd, { capture: true });

        return () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }

            (
                document.body.style as CSSStyleDeclaration & { webkitTouchCallout?: string }
            ).webkitTouchCallout = originalWebkitTouchCallout;
            (
                document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }
            ).webkitUserSelect = originalWebkitUserSelect;
            document.body.style.userSelect = originalUserSelect;

            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('touchstart', onTouchStart, { capture: true });
            document.removeEventListener('touchmove', onTouchMove, { capture: true });
            document.removeEventListener('touchend', onTouchEnd, { capture: true });
            document.removeEventListener('touchcancel', onTouchEnd, { capture: true });
        };
    }, [isOpen]);

    const handleDownload = async () => {
        const currentMedia = media[currentIndex];

        if (!currentMedia) {
            return;
        }

        try {
            const response = await fetch(currentMedia.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `media-${Date.now()}.${currentMedia.type === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    const handleShare = async () => {
        const currentMedia = media[currentIndex];

        if (!currentMedia) {
            return;
        }

        try {
            const result = await shareMediaUrl(currentMedia.url);

            if (result === 'copied') {
                toast.success('媒体链接已复制');
            } else if (result === 'failed') {
                toast.error('分享失败，请稍后重试');
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }

            console.error('Share failed', error);
            toast.error('分享失败，请稍后重试');
        } finally {
            setIsDrawerOpen(false);
        }
    };

    const handleClose = () => {
        setIsDrawerOpen(false);
        onClose();
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => {
            currentScaleRef.current = 1;
            return Math.max(prev - 1, 0);
        });
    };

    const handleNext = () => {
        setCurrentIndex((prev) => {
            currentScaleRef.current = 1;
            return Math.min(prev + 1, media.length - 1);
        });
    };

    const photoSliderImages = media.map((item) => {
        if (item.type === 'video') {
            return {
                key: item.id,
                render: () => (
                    <div className="flex h-full w-full items-center justify-center">
                        <video
                            src={item.url}
                            poster={item.posterUrl}
                            controls
                            playsInline
                            autoPlay
                            className="max-h-full max-w-full object-contain"
                            onClick={(event) => event.stopPropagation()}
                        />
                    </div>
                ),
            };
        }

        return {
            key: item.id,
            src: item.url,
        };
    });

    const currentMedia = media[currentIndex];
    const isVideoPreview = isOpen && currentMedia?.type === 'video';

    return (
        <>
            {isOpen ? (
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
          .PhotoView-Portal img, .PhotoView-Portal video {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }
        `,
                    }}
                />
            ) : null}
            {isVideoPreview ? (
                <div
                    className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <div className="pointer-events-none absolute top-0 right-0 left-0 z-50 flex h-20 items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-6">
                        <div className="w-10" />

                        {media.length > 1 ? (
                            <div className="text-sm font-medium tracking-widest text-white/80">
                                {currentIndex + 1} / {media.length}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={handleClose}
                            className="pointer-events-auto rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                            aria-label="关闭预览"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {currentIndex > 0 ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                handlePrev();
                            }}
                            className="absolute left-4 z-50 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:left-6 sm:p-3"
                            aria-label="上一项"
                        >
                            <ChevronLeft className="h-5 w-5 sm:h-8 sm:w-8" />
                        </button>
                    ) : null}

                    {currentIndex < media.length - 1 ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleNext();
                            }}
                            className="absolute right-4 z-50 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:right-6 sm:p-3"
                            aria-label="下一项"
                        >
                            <ChevronRight className="h-5 w-5 sm:h-8 sm:w-8" />
                        </button>
                    ) : null}

                    <div
                        className="flex h-full w-full items-center justify-center px-4"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <video
                            src={currentMedia.url}
                            poster={currentMedia.posterUrl}
                            controls
                            playsInline
                            autoPlay
                            className="max-h-[80vh] w-full max-w-4xl object-contain"
                        />
                    </div>
                </div>
            ) : (
                <PhotoSlider
                    images={photoSliderImages}
                    visible={isOpen}
                    onClose={handleClose}
                    index={currentIndex}
                    onIndexChange={setCurrentIndex}
                    maskOpacity={0.95}
                    speed={() => 300}
                    overlayRender={({ scale }) => {
                        currentScaleRef.current = scale;
                        return null;
                    }}
                />
            )}

            <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[9999] bg-black/40" />
                    <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[9999] mt-24 flex h-[fit-content] max-h-[96%] flex-col rounded-t-[10px] bg-[#1c1c1e]">
                        <div className="flex-1 rounded-t-[10px] bg-[#1c1c1e] p-4">
                            <div className="mx-auto mb-6 h-1.5 w-12 flex-shrink-0 rounded-full bg-zinc-600" />

                            <div className="mb-4 flex gap-2">
                                <button
                                    className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-[#2c2c2e] p-4 transition-colors hover:bg-[#3c3c3e]"
                                    onClick={() => {
                                        void handleDownload();
                                        setIsDrawerOpen(false);
                                    }}
                                >
                                    <Download className="h-6 w-6 text-white" />
                                    <span className="text-sm text-white">保存</span>
                                </button>
                                <button
                                    className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-[#2c2c2e] p-4 transition-colors hover:bg-[#3c3c3e]"
                                    onClick={() => {
                                        void handleShare();
                                    }}
                                >
                                    <Share2 className="h-6 w-6 text-white" />
                                    <span className="text-sm text-white">分享</span>
                                </button>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </>
    );
}
