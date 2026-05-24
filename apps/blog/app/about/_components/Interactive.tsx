'use client';

import dynamic from 'next/dynamic';

const Particles = dynamic(() => import('./Particles').then((module) => module.Particles), {
    ssr: false,
});

const TagGlobe = dynamic(() => import('./TagGlobe').then((module) => module.TagGlobe), {
    ssr: false,
    loading: () => (
        <div className="relative mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center" />
    ),
});

export function AboutParticles() {
    return <Particles />;
}

export function AboutTagGlobe() {
    return <TagGlobe />;
}
