import { Suspense } from 'react';
import { HeroSection } from './home/HeroSection';
import { HomeBackground } from './home/HomeBackground';
import { HomeProjectsSectionFallback } from './home/HomeProjectsSection';
import { HomeProjectsServerSection } from './home/HomeProjectsServerSection';
import { LatestArticlesSection } from './home/LatestArticlesSection';
import { SidebarSection } from './home/SidebarSection';
import type { HomePageContentProps } from './home/types';

export function HomePageContent({ homeStats, articles, sidebarData }: HomePageContentProps) {
    return (
        <div className="relative min-h-full overflow-hidden">
            <HomeBackground />

            <div className="container mx-auto max-w-6xl px-4 py-12 md:px-8">
                <HeroSection homeStats={homeStats} />

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <LatestArticlesSection articles={articles} />
                    <SidebarSection sidebarData={sidebarData} />
                </div>

                <Suspense fallback={<HomeProjectsSectionFallback />}>
                    <HomeProjectsServerSection />
                </Suspense>
            </div>
        </div>
    );
}
