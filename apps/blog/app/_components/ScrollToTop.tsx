'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/shared/utils';

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();
    const isArticleDetailPage = /^\/articles\/[^/]+$/.test(pathname);

    useEffect(() => {
        const toggleVisibility = () => {
            const documentHeight = document.documentElement.scrollHeight;
            const viewportHeight = window.innerHeight;
            const scrollPosition = window.scrollY;

            const shouldShow = isArticleDetailPage
                ? scrollPosition > 300
                : documentHeight > viewportHeight * 1.5 && scrollPosition > 100;

            if (shouldShow) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        toggleVisibility();

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        window.addEventListener('resize', toggleVisibility);

        return () => {
            window.removeEventListener('scroll', toggleVisibility);
            window.removeEventListener('resize', toggleVisibility);
        };
    }, [isArticleDetailPage]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <>
            {isVisible && (
                <>
                    {isArticleDetailPage && (
                        <AnimatePresence>
                            <motion.div
                                key="article-mobile-scroll-top"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="fixed bottom-6 left-6 z-30 sm:bottom-8 sm:left-8 lg:hidden"
                            >
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-full border border-gray-200 bg-white text-black shadow-md transition-all duration-300 hover:bg-gray-50 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    onClick={scrollToTop}
                                    aria-label="返回顶部"
                                >
                                    <ChevronUp className="h-5 w-5" />
                                </Button>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            'fixed right-6 bottom-6 z-50 rounded-full border border-gray-200 bg-white text-black shadow-md transition-all duration-300 hover:bg-gray-50 hover:shadow-lg sm:right-8 sm:bottom-8 dark:border-gray-700 dark:bg-gray-800 dark:text-white',
                            isArticleDetailPage && 'hidden lg:inline-flex',
                        )}
                        onClick={scrollToTop}
                        aria-label="返回顶部"
                    >
                        <ChevronUp className="h-5 w-5" />
                    </Button>
                </>
            )}
        </>
    );
}
