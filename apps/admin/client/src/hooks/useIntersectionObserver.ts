import { useEffect, useState, useRef, type RefObject } from 'react';

interface UseIntersectionObserverOptions {
    // 可见性阈值，0-1 之间的数值或数组（用于用户自定义回调的触发条件）
    threshold?: number | number[];
    // 根元素，默认为 viewport
    root?: Element | null;
    // 根元素的边距
    rootMargin?: string;
    // 是否立即开始观察
    enabled?: boolean;
    // 可见性变化回调函数（只在达到用户设置的threshold时触发）
    onIntersectionChange?: (intersectionRatio: number, entry: IntersectionObserverEntry) => void;
}

interface IntersectionObserverResult {
    // 当前的可见性比例 (0-1)
    intersectionRatio: number;
    // 是否正在相交
    isIntersecting: boolean;
    // 是否可见（超过阈值）
    isVisible: boolean;
    // 完整的 IntersectionObserverEntry 对象
    entry: IntersectionObserverEntry | null;
}

/**
 * 使用 IntersectionObserver API 监听元素可见性的 Hook
 * @param targetRef 要监听的元素 ref
 * @param options 配置选项
 * @returns 可见性状态信息
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
    targetRef: RefObject<T | null>,
    options: UseIntersectionObserverOptions = {},
): IntersectionObserverResult {
    const {
        threshold = 0,
        root = null,
        rootMargin = '0px',
        enabled = true,
        onIntersectionChange,
    } = options;

    const [intersectionRatio, setIntersectionRatio] = useState<number>(0);
    const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
    const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

    // 存储观察器实例
    const observerRef = useRef<IntersectionObserver | null>(null);
    const onIntersectionChangeRef = useRef(onIntersectionChange);

    useEffect(() => {
        onIntersectionChangeRef.current = onIntersectionChange;
    }, [onIntersectionChange]);

    useEffect(() => {
        const target = targetRef.current;

        if (!enabled || !target) {
            return;
        }

        // 创建观察器 - 使用细粒度的threshold来实时监听
        const realTimeThreshold = Array.from({ length: 101 }, (_, i) => i / 100); // 0, 0.01, 0.02, ..., 1.00

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry) {
                    setIntersectionRatio(entry.intersectionRatio);
                    setIsIntersecting(entry.isIntersecting);
                    setEntry(entry);

                    // 检查是否达到用户设置的阈值，如果达到则调用回调函数
                    const userThresholdValue = Array.isArray(threshold)
                        ? Math.max(...threshold)
                        : threshold;
                    const handleIntersectionChange = onIntersectionChangeRef.current;
                    if (entry.intersectionRatio >= userThresholdValue && handleIntersectionChange) {
                        handleIntersectionChange(entry.intersectionRatio, entry);
                    }
                }
            },
            {
                threshold: realTimeThreshold, // 使用实时监听的阈值
                root,
                rootMargin,
            },
        );

        // 开始观察
        observerRef.current.observe(target);

        // 清理函数
        return () => {
            if (observerRef.current && target) {
                observerRef.current.unobserve(target);
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [targetRef, threshold, root, rootMargin, enabled]);

    // 计算是否可见（基于阈值）
    const thresholdValue = Array.isArray(threshold) ? Math.max(...threshold) : threshold;
    const isVisible = intersectionRatio >= thresholdValue;

    return {
        intersectionRatio,
        isIntersecting,
        isVisible,
        entry,
    };
}

/**
 * 监听多个元素可见性的 Hook
 * @param refs 要监听的元素 ref 数组
 * @param options 配置选项
 * @returns 各元素的可见性状态数组
 */
export function useMultipleIntersectionObserver<T extends Element = HTMLDivElement>(
    refs: RefObject<T | null>[],
    options: UseIntersectionObserverOptions = {},
): IntersectionObserverResult[] {
    const [results, setResults] = useState<IntersectionObserverResult[]>(
        refs.map(() => ({
            intersectionRatio: 0,
            isIntersecting: false,
            isVisible: false,
            entry: null,
        })),
    );

    const { threshold = 0, root = null, rootMargin = '0px', enabled = true } = options;

    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const targets = refs.map((ref) => ref.current).filter(Boolean) as T[];

        if (targets.length === 0) {
            return;
        }

        // 创建观察器
        observerRef.current = new IntersectionObserver(
            (entries) => {
                setResults((prevResults) => {
                    const newResults = [...prevResults];

                    entries.forEach((entry) => {
                        const targetIndex = targets.findIndex((target) => target === entry.target);
                        if (targetIndex !== -1) {
                            const thresholdValue = Array.isArray(threshold)
                                ? Math.max(...threshold)
                                : threshold;

                            newResults[targetIndex] = {
                                intersectionRatio: entry.intersectionRatio,
                                isIntersecting: entry.isIntersecting,
                                isVisible: entry.intersectionRatio >= thresholdValue,
                                entry,
                            };
                        }
                    });

                    return newResults;
                });
            },
            {
                threshold,
                root,
                rootMargin,
            },
        );

        // 观察所有目标元素
        targets.forEach((target) => {
            observerRef.current?.observe(target);
        });

        // 清理函数
        return () => {
            if (observerRef.current) {
                targets.forEach((target) => {
                    observerRef.current?.unobserve(target);
                });
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [refs, threshold, root, rootMargin, enabled]);

    return results;
}
