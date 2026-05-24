'use client';

import { useEffect, useRef } from 'react';

type ParticleRecord = {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
};

type LegacyMediaQueryList = MediaQueryList & {
    addListener?: (listener: () => void) => void;
    removeListener?: (listener: () => void) => void;
};

function createParticle(width: number, height: number): ParticleRecord {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 1 - 0.5,
        color: `rgba(6, 182, 212, ${Math.random() * 0.5})`,
    };
}

function updateParticle(particle: ParticleRecord, width: number, height: number) {
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    if (particle.x > width) {
        particle.x = 0;
    } else if (particle.x < 0) {
        particle.x = width;
    }

    if (particle.y > height) {
        particle.y = 0;
    } else if (particle.y < 0) {
        particle.y = height;
    }
}

function drawParticles(context: CanvasRenderingContext2D, particles: ParticleRecord[]) {
    for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
    }
}

export function Particles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const canvasElement = canvas;
        const canvasContext = context;

        let animationFrameId = 0;
        let particles: ParticleRecord[] = [];

        const resize = () => {
            canvasElement.width = window.innerWidth;
            canvasElement.height = window.innerHeight;
        };
        const init = (count: number) => {
            particles = Array.from({ length: count }, () =>
                createParticle(canvasElement.width, canvasElement.height),
            );
        };

        const animate = () => {
            canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
            for (let index = 0; index < particles.length; index += 1) {
                updateParticle(particles[index], canvasElement.width, canvasElement.height);
            }
            drawParticles(canvasContext, particles);
            animationFrameId = window.requestAnimationFrame(animate);
        };

        const renderStaticParticles = () => {
            window.cancelAnimationFrame(animationFrameId);
            canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
            init(36);
            drawParticles(canvasContext, particles);
        };

        const motionMediaQuery = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ) as LegacyMediaQueryList;
        const syncMotionPreference = () => {
            resize();

            if (motionMediaQuery.matches) {
                renderStaticParticles();
                return;
            }

            init(100);
            animationFrameId = window.requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        const supportsModernMediaQueryEvents =
            typeof MediaQueryList !== 'undefined' && 'addEventListener' in MediaQueryList.prototype;

        if (supportsModernMediaQueryEvents) {
            motionMediaQuery.addEventListener('change', syncMotionPreference);
        } else {
            motionMediaQuery.addListener(syncMotionPreference);
        }
        syncMotionPreference();

        return () => {
            window.removeEventListener('resize', resize);
            if (supportsModernMediaQueryEvents) {
                motionMediaQuery.removeEventListener('change', syncMotionPreference);
            } else {
                motionMediaQuery.removeListener(syncMotionPreference);
            }
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0 opacity-50"
            aria-hidden="true"
        />
    );
}
