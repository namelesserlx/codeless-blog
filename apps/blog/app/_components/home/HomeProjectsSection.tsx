import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GitHubIcon as Github } from '@/components/icons/GitHubIcon';
import type { HomeProject } from './types';

const projectAccentMap: Record<string, string> = {
    TypeScript: 'bg-blue-500',
    JavaScript: 'bg-yellow-400',
    CSS: 'bg-pink-500',
    HTML: 'bg-orange-500',
    Vue: 'bg-emerald-500',
    React: 'bg-cyan-500',
    'Node.js': 'bg-green-500',
    Vite: 'bg-violet-500',
};

function formatProjectMetaDate(value: string) {
    return new Date(value).toLocaleDateString('zh-CN');
}

function getProjectLabel(project: HomeProject) {
    return project.tags.find((tag) => projectAccentMap[tag]) || project.tags[0] || 'Open Source';
}

function getProjectColor(label: string) {
    return projectAccentMap[label] || 'bg-slate-400';
}

interface HomeProjectsSectionProps {
    projects: HomeProject[];
}

function HomeProjectsHeader() {
    return (
        <div className="mb-10 flex items-center justify-between">
            <h2 className="relative text-2xl font-bold tracking-tight">
                开源项目
                <span className="absolute -bottom-[17px] left-0 h-0.5 w-1/2 bg-primary"></span>
            </h2>
            <Link
                href="/about"
                className="group flex items-center text-sm text-primary hover:underline"
            >
                查看更多项目
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
        </div>
    );
}

export function HomeProjectsSectionFallback() {
    return (
        <section className="mt-10 border-t border-border/40 py-20">
            <HomeProjectsHeader />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-border/40 bg-card/20 p-6 shadow-sm"
                    >
                        <div className="mb-4 h-6 w-1/2 rounded bg-muted/70" />
                        <div className="mb-3 h-4 w-full rounded bg-muted/50" />
                        <div className="mb-6 h-4 w-4/5 rounded bg-muted/40" />
                        <div className="flex items-center justify-between border-t border-border/30 pt-4">
                            <div className="h-4 w-24 rounded bg-muted/40" />
                            <div className="h-4 w-16 rounded bg-muted/40" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function HomeProjectsSection({ projects }: HomeProjectsSectionProps) {
    return (
        <section className="mt-10 border-t border-border/40 py-20">
            <HomeProjectsHeader />

            {projects.length === 0 ? (
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6 text-sm text-muted-foreground">
                    暂无可展示的 GitHub 公开仓库数据。
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const label = getProjectLabel(project);
                        const color = getProjectColor(label);

                        return (
                            <article
                                key={project.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/80 hover:shadow-[0_0_30px_-10px_rgba(14,165,233,0.3)]"
                            >
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                                <div className="relative z-10">
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <h3 className="text-lg font-bold transition-colors group-hover:text-primary">
                                            <Link
                                                href={project.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="before:absolute before:inset-0"
                                                prefetch={false}
                                            >
                                                {project.title}
                                            </Link>
                                        </h3>
                                        <Github className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                                    </div>
                                    <p className="mb-6 line-clamp-3 text-sm text-muted-foreground">
                                        {project.description || '这个项目暂时还没有补充仓库描述。'}
                                    </p>
                                </div>

                                <div className="relative z-10 mt-auto flex items-center justify-between border-t border-border/40 pt-4 font-mono text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center">
                                            <span
                                                className={`mr-1.5 h-2 w-2 rounded-full ${color} shadow-[0_0_5px_currentColor]`}
                                            />
                                            {label}
                                        </span>
                                        <span className="flex items-center">
                                            <svg
                                                className="mr-1 h-3 w-3"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                                            </svg>
                                            {project.stars}
                                        </span>
                                        <span className="flex items-center">
                                            <svg
                                                className="mr-1 h-3 w-3"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
                                            </svg>
                                            {project.forks}
                                        </span>
                                    </div>
                                    <span>{formatProjectMetaDate(project.updatedAt)}</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
