'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';

interface RouteLoadingProps {
    title?: string;
    variant?: 'home' | 'articles' | 'snippets' | 'tags' | 'photos' | 'about';
}

export function RouteLoading({ title = '正在加载' }: RouteLoadingProps) {
    const shouldReduceMotion = useReducedMotion();
    const logoAnimation = shouldReduceMotion
        ? { opacity: 0.22 }
        : {
              opacity: [0.14, 0.3, 0.14],
              filter: [
                  'saturate(0.7) brightness(0.78)',
                  'saturate(0.95) brightness(0.94)',
                  'saturate(0.7) brightness(0.78)',
              ],
          };
    const haloAnimation = shouldReduceMotion
        ? { opacity: 0.02 }
        : { opacity: [0.015, 0.06, 0.015] };

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={title}
            className="flex min-h-[14rem] flex-col items-center justify-center bg-background px-4 py-8"
        >
            <div className="flex flex-col items-center justify-center">
                <motion.div
                    className="relative flex items-center justify-center"
                    animate={logoAnimation}
                    transition={{
                        duration: 1.9,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-x-10 top-1/2 h-6 -translate-y-1/2 rounded-full bg-sky-400/25 blur-2xl dark:bg-cyan-300/20"
                        animate={haloAnimation}
                        transition={{
                            duration: 1.9,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <Image
                        src="/logo-text-light.png"
                        alt="CodeLess's Blog"
                        width={867}
                        height={128}
                        priority
                        className="relative h-7 w-auto opacity-70 drop-shadow-[0_0_6px_rgba(34,211,238,0.1)] sm:h-8 dark:hidden"
                    />
                    <Image
                        src="/logo-text-dark.png"
                        alt="CodeLess's Blog"
                        width={867}
                        height={128}
                        priority
                        className="relative hidden h-7 w-auto opacity-70 drop-shadow-[0_0_6px_rgba(34,211,238,0.08)] sm:h-8 dark:block"
                    />
                </motion.div>
            </div>
        </div>
    );
}
