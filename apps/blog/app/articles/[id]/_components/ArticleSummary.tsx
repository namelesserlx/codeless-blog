import { Sparkles } from 'lucide-react';

interface ArticleSummaryProps {
    summary: string;
}

export function ArticleSummary({ summary }: ArticleSummaryProps) {
    return (
        <section className="rounded-3xl border border-sky-100 bg-linear-to-r from-sky-50 to-white px-6 py-5 shadow-[0_20px_60px_-40px_rgba(14,165,233,0.55)] dark:border-sky-500/20 dark:from-sky-500/10 dark:to-transparent dark:shadow-none">
            <div className="mb-3 flex items-center gap-2 text-sky-600 dark:text-sky-300">
                <Sparkles size={18} />
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    AI 摘要
                </h2>
            </div>
            <p className="text-[15px] leading-7 text-gray-700 dark:text-gray-300">{summary}</p>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                自动生成，仅作为阅读前的快速参考。
            </p>
        </section>
    );
}
