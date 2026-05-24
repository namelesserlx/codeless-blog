'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './typewriter-effect.module.css';

interface AnimatedTitleProps {
    text: string | string[];
    speed?: number;
    deleteSpeed?: number;
    delay?: number;
    deleteEffect?: boolean;
    cursor?: boolean;
    loop?: boolean;
}

export function AnimatedTitle({
    text,
    speed = 200,
    deleteSpeed = 80,
    delay = 1200,
    deleteEffect = true,
    cursor = true,
    loop = true,
}: AnimatedTitleProps) {
    const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
    const [displayText, setDisplayText] = useState(textArray[0] || '');
    const [isTyping, setIsTyping] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(textArray[0]?.length || 0);
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [hasCompletedCycle, setHasCompletedCycle] = useState(false);
    const [animationStarted, setAnimationStarted] = useState(false);
    const containerRef = useRef<HTMLSpanElement>(null);

    const actualDeleteSpeed = deleteSpeed || speed / 2;

    useEffect(() => {
        const startAnimation = () => {
            setTimeout(() => {
                setAnimationStarted(true);
            }, delay + 800);
        };

        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(startAnimation, { timeout: 2500 });
        } else {
            setTimeout(startAnimation, 2000);
        }
    }, [delay]);

    useEffect(() => {
        if (!animationStarted) return;

        let timer: NodeJS.Timeout | null = null;
        const currentText = textArray[currentTextIndex];

        if (!isTyping && !isDeleting && displayText === currentText && displayText.length > 0) {
            timer = setTimeout(() => {
                setIsDeleting(true);
            }, delay);
        } else if (isDeleting) {
            if (displayText.length > 0) {
                timer = setTimeout(() => {
                    setDisplayText((prev) => prev.substring(0, prev.length - 1));
                }, actualDeleteSpeed);
            } else {
                setIsDeleting(false);
                setIsTyping(true);
                setCurrentPosition(0);

                if (textArray.length > 1) {
                    setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
                } else if (loop) {
                    setCurrentTextIndex(0);
                }

                if (!hasCompletedCycle && deleteEffect) {
                    setHasCompletedCycle(true);
                }
            }
        } else if (isTyping) {
            const nextText = textArray[currentTextIndex];
            if (currentPosition < nextText.length) {
                timer = setTimeout(() => {
                    setDisplayText((prev) => prev + nextText[currentPosition]);
                    setCurrentPosition((prev) => prev + 1);
                }, speed);
            } else {
                setIsTyping(false);
                if (loop || (deleteEffect && !hasCompletedCycle)) {
                    timer = setTimeout(() => {
                        setIsDeleting(true);
                    }, delay);
                }
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [
        animationStarted,
        currentPosition,
        delay,
        displayText,
        isDeleting,
        isTyping,
        loop,
        speed,
        textArray,
        currentTextIndex,
        deleteEffect,
        hasCompletedCycle,
        actualDeleteSpeed,
    ]);

    return (
        <span ref={containerRef} className="relative inline-block will-change-contents">
            <span className="animate-gradient-shift relative inline-block bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                {displayText}
                {cursor && (
                    <span
                        className={styles.cursor}
                        style={{
                            backgroundColor: 'rgb(59, 130, 246)',
                            display: 'inline-block',
                            height: '1em',
                            width: '0.1em',
                            marginLeft: '0.25em',
                            verticalAlign: 'baseline',
                            transform: 'translateY(0.1em)',
                        }}
                    />
                )}
            </span>
            <span
                className="pointer-events-none absolute inset-0 animate-pulse bg-linear-to-r from-cyan-400/30 via-blue-500/30 to-purple-600/30 blur-2xl"
                aria-hidden="true"
            >
                {displayText}
            </span>
            <div
                className="animate-underline-expand absolute right-0 -bottom-2 left-0 h-1 rounded-full bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-0"
                style={{ animationDelay: '0.8s' }}
            />
        </span>
    );
}
