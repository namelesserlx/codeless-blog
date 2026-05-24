import { Suspense } from 'react';
import { Terminal } from 'lucide-react';
import { AboutParticles, AboutTagGlobe } from './Interactive';
import { getGitHubAboutData } from '@/components/about/github-data';
import { isGitHubAboutEnabled } from '@/config/services/github';
import { GithubSection, GithubSectionFallback } from './GithubSection';
import { ProjectsSection, ProjectsSectionFallback } from './ProjectsSection';

const growthPath = [
    {
        title: 'Web基础学习',
        date: '2022~2023',
        description:
            '系统学习 HTML、CSS、JavaScript 等 Web 基础能力，持续搭建练习项目，逐步建立对页面结构、交互实现与前端工程化的完整认知。',
    },
    {
        title: '项目实践进阶',
        date: '2024-2025',
        description:
            '开始围绕真实场景持续完成页面搭建、组件封装与交互联调，在一次次项目练习中提升代码规范、问题拆解与落地能力。',
    },
    {
        title: '工程化持续沉淀',
        date: '2025-至今',
        description:
            '逐步把关注点从页面实现扩展到性能优化、体验细节与项目可维护性，持续沉淀更稳定的前端工程化思路与实践方式。',
    },
    {
        title: 'AI Agent 学习探索',
        date: '2025-至今',
        description:
            '持续关注 AI Agent、RAG 与智能协作相关实践，尝试把大模型能力融入开发流程，探索更高效的人机协同方式。',
    },
];

export function AboutPage() {
    if (isGitHubAboutEnabled) {
        void getGitHubAboutData();
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 pt-24 selection:bg-sky-500/30 dark:bg-[#0a0a0a]">
            <AboutParticles />

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0ea5e91a_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e91a_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:4rem_4rem]" />
            <div className="pointer-events-none absolute top-0 left-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[128px] dark:bg-sky-500/20" />
            <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[128px] dark:bg-blue-500/20" />

            <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">
                <section className="mb-24 origin-top">
                    <div className="space-y-6">
                        <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-sm text-sky-600 dark:text-sky-400">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                            <span>{'console.log("Hello, World!");'}</span>
                        </div>

                        <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                            前端开发 <br />
                            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-blue-500">
                                工程师.
                            </span>
                        </h1>

                        <p className="max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl dark:text-slate-400">
                            在学习与生活之间，整理所学，记录所感，留下一点真实的生长痕迹。
                        </p>
                    </div>
                </section>

                <section className="mb-24 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111]">
                        <div className="flex items-center border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#1a1a1a]">
                            <div className="flex space-x-2">
                                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="mx-auto flex items-center space-x-2 font-mono text-xs text-slate-500">
                                <Terminal size={14} />
                                <span>codeless@macbook-pro:~</span>
                            </div>
                        </div>

                        <div className="space-y-4 p-6 font-mono text-sm text-slate-700 md:text-base dark:text-slate-300">
                            <div className="flex items-start space-x-2">
                                <span className="text-sky-500">➜</span>
                                <span className="text-blue-500">~</span>
                                <span className="text-slate-800 dark:text-slate-200">
                                    cat whoami.json
                                </span>
                            </div>
                            <div className="space-y-2 pl-4 text-slate-600 dark:text-slate-400">
                                <p>{'{'}</p>
                                <p className="pl-4">
                                    <span className="text-sky-600 dark:text-sky-300">
                                        {'"name"'}
                                    </span>
                                    :{' '}
                                    <span className="text-emerald-600 dark:text-emerald-300">
                                        {'"CodeLess"'}
                                    </span>
                                    ,
                                </p>
                                <p className="pl-4">
                                    <span className="text-sky-600 dark:text-sky-300">
                                        {'"role"'}
                                    </span>
                                    :{' '}
                                    <span className="text-emerald-600 dark:text-emerald-300">
                                        {'"Frontend Developer"'}
                                    </span>
                                    ,
                                </p>
                                <p className="pl-4">
                                    <span className="text-sky-600 dark:text-sky-300">
                                        {'"location"'}
                                    </span>
                                    :{' '}
                                    <span className="text-emerald-600 dark:text-emerald-300">
                                        {'"guangzhou, China"'}
                                    </span>
                                    ,
                                </p>
                                <p className="pl-4">
                                    <span className="text-sky-600 dark:text-sky-300">
                                        {'"email"'}
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-300">
                                        {'"your-email@example.com"'}
                                    </span>
                                </p>
                                <p>{'}'}</p>
                            </div>

                            <div className="flex items-start space-x-2 pt-4">
                                <span className="animate-pulse text-sky-500">_</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        <h3 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
                            技术栈星球
                        </h3>
                        <AboutTagGlobe />
                    </div>
                </section>

                {isGitHubAboutEnabled ? (
                    <>
                        <section
                            className="mb-24"
                            style={{ contentVisibility: 'auto', containIntrinsicSize: '640px' }}
                        >
                            <Suspense fallback={<GithubSectionFallback />}>
                                <GithubSection />
                            </Suspense>
                        </section>

                        <section
                            className="mb-32"
                            style={{ contentVisibility: 'auto', containIntrinsicSize: '1200px' }}
                        >
                            <div className="mb-16">
                                <h2 className="text-5xl font-bold tracking-tighter text-slate-900 md:text-7xl dark:text-white">
                                    Projects<span className="text-sky-500">.</span>
                                </h2>
                                <p className="mt-4 font-mono text-sm tracking-widest text-slate-500 uppercase">
                                    开源项目与实验
                                </p>
                            </div>

                            <Suspense fallback={<ProjectsSectionFallback />}>
                                <ProjectsSection />
                            </Suspense>
                        </section>
                    </>
                ) : null}

                <section
                    className="mb-32"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '1100px' }}
                >
                    <div className="mb-16">
                        <h2 className="text-5xl font-bold tracking-tighter text-slate-900 md:text-7xl dark:text-white">
                            Journey<span className="text-sky-500">.</span>
                        </h2>
                        <p className="mt-4 font-mono text-sm tracking-widest text-slate-500 uppercase">
                            技术成长路径
                        </p>
                    </div>

                    <div className="flex flex-col border-t border-slate-200 dark:border-slate-800/50">
                        {growthPath.map((item) => (
                            <div
                                key={`${item.title}-${item.date}`}
                                className="group grid grid-cols-1 gap-4 border-b border-slate-200 py-10 md:grid-cols-4 dark:border-slate-800/50"
                            >
                                <div className="col-span-1 pt-1">
                                    <span className="font-mono text-sm tracking-widest text-slate-400 uppercase dark:text-slate-500">
                                        {item.date}
                                    </span>
                                </div>

                                <div className="col-span-3 md:pl-8">
                                    <h3 className="mb-2 text-2xl font-medium text-slate-900 transition-colors group-hover:text-sky-500 md:text-3xl dark:text-white">
                                        {item.title}
                                    </h3>
                                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base dark:text-slate-400">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
