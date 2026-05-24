import Link from 'next/link';
import { ArrowLeft, FileX } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto max-w-md px-4 text-center">
                <div className="mb-8">
                    <FileX size={64} className="mx-auto text-gray-400 dark:text-gray-600" />
                </div>

                <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    文章不存在
                </h1>

                <p className="mb-8 text-gray-600 dark:text-gray-400">
                    抱歉，您访问的文章可能已被删除或链接地址有误。
                </p>

                <Link
                    href="/articles"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                    <ArrowLeft size={16} />
                    返回文章列表
                </Link>
            </div>
        </div>
    );
}
