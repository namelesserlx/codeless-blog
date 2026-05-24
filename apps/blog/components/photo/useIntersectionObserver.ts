'use client';
import { useEffect, useState, useRef } from 'react';

interface UseIntersectionObserverOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export function useIntersectionObserver(options: UseIntersectionObserverOptions = {}) {
    const {
        threshold = 0.1,
        rootMargin = '200px', // 提前200px开始加载
        triggerOnce = true,
    } = options;

    const [isVisible, setIsVisible] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // 如果已经触发过且设置了只触发一次，直接返回
        if (triggerOnce && hasTriggered) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const visible = entry.isIntersecting;
                setIsVisible(visible);

                if (visible && triggerOnce) {
                    setHasTriggered(true);
                }
            },
            {
                threshold,
                rootMargin,
            },
        );

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [threshold, rootMargin, triggerOnce, hasTriggered]);

    return { ref, isVisible: isVisible || hasTriggered };
}
