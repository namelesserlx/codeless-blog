'use client';

import { useEffect, useRef, useState } from 'react';

const TAGS = [
    'React',
    'Next.js',
    'TypeScript',
    'JavaScript',
    'Koa',
    'TailwindCSS',
    'Node.js',
    'Vite',
    'Webpack',
    'Framer Motion',
    'CSS3',
    'HTML5',
    'Git',
    'Docker',
    'Redux',
    'Zustand',
    'Figma',
    'Vercel',
    'MySQL',
    'MongoDB',
    'Redis',
];

interface GlobePoint {
    x: number;
    y: number;
    z: number;
    tag: string;
    scale: number;
    opacity: number;
}

export function TagGlobe() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [points, setPoints] = useState<GlobePoint[]>([]);
    const rotationRef = useRef({ x: 0, y: 0 });
    const velocityRef = useRef({ x: 0.003, y: 0.003 });
    const isDraggingRef = useRef(false);
    const previousPointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const radius = 160;
        const total = TAGS.length;
        const basePoints = TAGS.map((tag, index) => {
            const phi = Math.acos(-1 + (2 * index) / total);
            const theta = Math.sqrt(total * Math.PI) * phi;

            return {
                x: radius * Math.cos(theta) * Math.sin(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(phi),
                tag,
            };
        });

        let animationFrameId = 0;

        const animate = () => {
            if (!isDraggingRef.current) {
                velocityRef.current.x *= 0.95;
                velocityRef.current.y *= 0.95;

                if (Math.abs(velocityRef.current.y) < 0.002) {
                    velocityRef.current.y = Math.sign(velocityRef.current.y || 1) * 0.002;
                }

                if (Math.abs(velocityRef.current.x) < 0.0001) {
                    velocityRef.current.x = 0;
                }
            }

            rotationRef.current.x += velocityRef.current.x;
            rotationRef.current.y += velocityRef.current.y;

            const cosX = Math.cos(rotationRef.current.x);
            const sinX = Math.sin(rotationRef.current.x);
            const cosY = Math.cos(rotationRef.current.y);
            const sinY = Math.sin(rotationRef.current.y);

            const projected = basePoints
                .map((point) => {
                    const x1 = point.x * cosY - point.z * sinY;
                    const z1 = point.z * cosY + point.x * sinY;
                    const y2 = point.y * cosX - z1 * sinX;
                    const z2 = z1 * cosX + point.y * sinX;
                    const scale = 300 / (300 + z2);
                    const opacity = 0.2 + 0.8 * ((radius - z2) / (2 * radius));

                    return {
                        x: x1 * scale,
                        y: y2 * scale,
                        z: z2,
                        tag: point.tag,
                        scale,
                        opacity,
                    };
                })
                .sort((left, right) => right.z - left.z);

            setPoints(projected);
            animationFrameId = window.requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        previousPointerRef.current = { x: event.clientX, y: event.clientY };

        if (containerRef.current) {
            try {
                containerRef.current.setPointerCapture(event.pointerId);
            } catch {
                // Ignore browsers that do not support pointer capture.
            }
        }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) {
            return;
        }

        if (event.pointerType === 'mouse' && event.buttons === 0) {
            isDraggingRef.current = false;
            return;
        }

        const deltaX = event.clientX - previousPointerRef.current.x;
        const deltaY = event.clientY - previousPointerRef.current.y;

        velocityRef.current.y = deltaX * 0.005;
        velocityRef.current.x = deltaY * 0.005;
        previousPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = false;

        if (containerRef.current) {
            try {
                if (containerRef.current.hasPointerCapture(event.pointerId)) {
                    containerRef.current.releasePointerCapture(event.pointerId);
                }
            } catch {
                // Ignore browsers that do not support pointer capture.
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative mx-auto flex aspect-square w-full max-w-[400px] cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {points.map((point) => (
                <div
                    key={point.tag}
                    className="pointer-events-none absolute font-mono font-medium whitespace-nowrap text-sky-500 select-none dark:text-sky-400"
                    style={{
                        transform: `translate3d(${point.x}px, ${point.y}px, 0) scale(${point.scale})`,
                        opacity: point.opacity,
                        zIndex: Math.round(point.scale * 100),
                        filter: `blur(${Math.max(0, (1 - point.opacity) * 2)}px)`,
                    }}
                >
                    {point.tag}
                </div>
            ))}
        </div>
    );
}
