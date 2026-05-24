import { ArrowUpRight } from 'lucide-react';
import { getGitHubAboutData } from '@/components/about/github-data';
import { isGitHubAboutEnabled } from '@/config/services/github';

const MAX_VISIBLE_PROJECTS = 3;

export function ProjectsSectionFallback() {
    return (
        <div className="flex flex-col border-t border-slate-200 dark:border-slate-800/50">
            {Array.from({ length: MAX_VISIBLE_PROJECTS }).map((_, index) => (
                <div
                    key={index}
                    className="flex flex-col justify-between border-b border-slate-200 py-10 md:flex-row md:items-center dark:border-slate-800/50"
                >
                    <div className="mb-4 space-y-4 md:mb-0 md:w-1/3">
                        <div className="h-8 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="flex gap-3">
                            <div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-900" />
                            <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-900" />
                        </div>
                    </div>
                    <div className="space-y-3 pr-8 md:w-1/2">
                        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-900" />
                        <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-900" />
                    </div>
                    <div className="mt-6 flex justify-end md:mt-0">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export async function ProjectsSection() {
    if (!isGitHubAboutEnabled) {
        return null;
    }

    const data = await getGitHubAboutData();
    const projects = data.projects.slice(0, MAX_VISIBLE_PROJECTS);

    if (projects.length === 0) {
        return (
            <div className="flex flex-col border-t border-slate-200 dark:border-slate-800/50">
                <div className="border-b border-slate-200 py-10 text-sm text-slate-500 dark:border-slate-800/50 dark:text-slate-400">
                    暂无可展示的 GitHub 公开仓库数据。
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col border-t border-slate-200 dark:border-slate-800/50">
            {projects.map((project) => (
                <a
                    href={project.link}
                    key={project.id}
                    className="group flex flex-col justify-between border-b border-slate-200 py-10 transition-colors md:flex-row md:items-center dark:border-slate-800/50"
                >
                    <div className="mb-4 md:mb-0 md:w-1/3">
                        <h3 className="text-2xl font-medium text-slate-900 transition-colors group-hover:text-sky-500 md:text-3xl dark:text-white">
                            {project.title}
                        </h3>
                        {project.tags.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-3">
                                {project.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="font-mono text-xs text-slate-400 dark:text-slate-500"
                                    >
                                        {`//${tag}`}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="pr-8 text-sm leading-relaxed text-slate-600 md:w-1/2 md:text-base dark:text-slate-400">
                        {project.description}
                    </div>

                    <div className="mt-6 flex justify-end md:mt-0 md:w-auto">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-sky-500 group-hover:bg-sky-500 group-hover:text-white dark:border-slate-800">
                            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
}
