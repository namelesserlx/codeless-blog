import Link from 'next/link';
import { Fragment } from 'react';
import { Mail } from 'lucide-react';
import { FadeInSection } from '@/components/animations/FadeInSection';
import { GitHubIcon as Github } from '@/components/icons/GitHubIcon';
import { AnimatedTitle } from './AnimatedTitle';
import { AnimatedCounter } from './AnimatedCounter';
import type { HomeStats } from './types';

function normalizeAnimatedStat(value: number) {
    if (value >= 1000) {
        const compactValue = value / 1000;
        const decimals = Number.isInteger(compactValue) ? 0 : 1;

        return {
            value: Number(compactValue.toFixed(decimals)),
            suffix: 'k',
            decimals,
        };
    }

    return {
        value,
        suffix: '',
        decimals: 0,
    };
}

function buildHeroStats(homeStats: HomeStats) {
    return [
        { label: '文章', ...normalizeAnimatedStat(homeStats.articleCount) },
        { label: '阅读量', ...normalizeAnimatedStat(homeStats.viewCount) },
        { label: '点赞数', ...normalizeAnimatedStat(homeStats.likeCount) },
    ];
}

interface HeroSectionProps {
    homeStats: HomeStats;
}

export function HeroSection({ homeStats }: HeroSectionProps) {
    const heroStats = buildHeroStats(homeStats);

    return (
        <section className="relative py-16 md:py-24">
            <FadeInSection className="mb-6 inline-block" direction="down" duration={360}>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-linear-to-r from-cyan-100 to-blue-100 px-4 py-2 text-sm text-cyan-700 dark:border-cyan-800 dark:from-cyan-900/30 dark:to-blue-900/30 dark:text-cyan-300">
                    👋 欢迎来到我的博客
                </span>
            </FadeInSection>

            <h1 className="mb-6 text-4xl leading-tight sm:text-5xl lg:text-7xl">
                <span className="inline-block font-[Alfa_Slab_One] text-foreground">
                    你好，我是
                </span>
                <br />
                <AnimatedTitle
                    text={['一名前端开发工程师', '以代码为笔记录人生']}
                    speed={180}
                    deleteSpeed={80}
                    delay={1200}
                    deleteEffect={true}
                    cursor={true}
                    loop={true}
                />
            </h1>

            <FadeInSection
                className="mb-10 max-w-2xl text-lg text-foreground/70"
                direction="left"
                delay={120}
                duration={520}
            >
                <p>
                    🔥记录并分享技术学习的点滴心得。👀希望通过这个博客与大家交流学习，共同进步💪。欢迎关注我的
                    GitHub 和其他社交媒体账号，一起探讨技术问题！
                </p>
            </FadeInSection>

            <FadeInSection
                className="mb-12 flex flex-wrap items-center gap-6"
                direction="up"
                delay={240}
                duration={620}
            >
                {heroStats.map((stat, index) => (
                    <Fragment key={stat.label}>
                        <div className="flex cursor-default flex-col transition-transform duration-200 hover:-translate-y-0.5">
                            <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text font-mono text-3xl font-bold text-transparent">
                                <AnimatedCounter
                                    value={stat.value}
                                    suffix={stat.suffix}
                                    decimals={stat.decimals}
                                />
                            </span>
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        {index < heroStats.length - 1 && <div className="h-10 w-px bg-border" />}
                    </Fragment>
                ))}
            </FadeInSection>

            <FadeInSection
                className="flex flex-wrap gap-4"
                direction="left"
                delay={420}
                duration={720}
            >
                <Link
                    href="https://github.com/your-username"
                    target="_blank"
                    prefetch={false}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium text-muted-foreground transition-all hover:scale-105 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                >
                    <Github className="h-4 w-4" />
                    <span>GitHub</span>
                </Link>
                <Link
                    href="mailto:your-email@example.com"
                    prefetch={false}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium text-muted-foreground transition-all hover:scale-105 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                >
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                </Link>
            </FadeInSection>
        </section>
    );
}
