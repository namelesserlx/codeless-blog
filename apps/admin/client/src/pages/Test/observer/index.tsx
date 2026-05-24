import styles from './index.module.less';
import videoUrl from './assents/test1.mp4';
import imageUrl1 from './assents/test2.webp';
import imageUrl2 from './assents/test3.jpg';
import { useRef, useState, useCallback, useMemo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

function ObserverTest() {
    const videoRef = useRef<HTMLDivElement>(null);
    const imageListRef = useRef<HTMLDivElement>(null);
    const [shouldScale, setShouldScale] = useState(false);

    // 可见性变化回调
    const handleIntersectionChange = useCallback((intersectionRatio: number) => {
        if (intersectionRatio > 0.1) {
            console.log('当前可见性-可见:', intersectionRatio);
            setShouldScale(true);
        } else {
            console.log('当前可见性-不可见:', intersectionRatio);
            setShouldScale(false);
        }
    }, []);

    // 使用hook监听可见性
    const { intersectionRatio, isVisible } = useIntersectionObserver(imageListRef, {
        threshold: 0.1,
        onIntersectionChange: handleIntersectionChange,
    });

    // 根据可见性计算video的垂直位置
    const videoStyle = useMemo(() => {
        // 当 intersectionRatio 从 0 增加到 0.5 时，video 逐渐垂直居中
        // intersectionRatio 为 0 时，translateY 为 0（初始位置）
        // intersectionRatio 为 0.1 时，translateY 为 10%（垂直居中）
        const progress = Math.min(intersectionRatio / 0.1, 1); // 限制在 0-1 之间
        const translateY = progress * 10; // 最大偏移 10%（垂直居中）

        return {
            transform: `translateY(${translateY}%)`,
            transition: 'transform 0.3s ease-out',
        };
    }, [intersectionRatio]);

    const handleScroll = useCallback(() => {
        console.log('滚动中 - 当前可见性:', intersectionRatio, '是否可见:', isVisible);
        if (!isVisible) {
            setShouldScale(false);
        }
    }, [intersectionRatio, isVisible]);

    return (
        <div className={styles.observerContainer} onScroll={handleScroll}>
            <div className={styles.videoContainer} ref={videoRef} style={videoStyle}>
                <video src={videoUrl} />
            </div>
            <div
                className={`${styles.imageListContainer} ${shouldScale ? styles.scale : ''}`}
                ref={imageListRef}
            >
                <img src={imageUrl1} alt="测试图片1" />
                <img src={imageUrl2} alt="测试图片2" />
            </div>
        </div>
    );
}

export { ObserverTest as Component };
