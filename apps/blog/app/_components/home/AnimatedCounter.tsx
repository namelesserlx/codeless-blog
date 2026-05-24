'use client';

import { useEffect, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    suffix?: string;
    decimals?: number;
}

export function AnimatedCounter({ value, suffix = '', decimals = 0 }: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

        let animationFrame = 0;
        let hasStarted = false;

        const startAnimation = () => {
            if (hasStarted) {
                return;
            }

            hasStarted = true;
            const startedAt = performance.now();
            const duration = 900;

            const tick = (now: number) => {
                const progress = Math.min((now - startedAt) / duration, 1);
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                element.textContent = `${formatter.format(value * easedProgress)}${suffix}`;

                if (progress < 1) {
                    animationFrame = window.requestAnimationFrame(tick);
                }
            };

            animationFrame = window.requestAnimationFrame(tick);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    startAnimation();
                    observer.disconnect();
                }
            },
            { threshold: 0.2 },
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }
        };
    }, [decimals, suffix, value]);

    return <span ref={ref}>0{suffix}</span>;
}
