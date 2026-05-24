'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/shared/utils';
import { HeaderDropdownMenu } from './HeaderDropdownMenu';
import { mainNavLinks, mainNavLinksTablet, moreNavLinks, moreNavLinksTablet } from './nav-config';

export function Navigation() {
    const pathname = usePathname();
    const navRef = React.useRef<HTMLDivElement>(null);
    const itemsRef = React.useRef<Map<number, HTMLDivElement>>(new Map());

    const [isTabletView, setIsTabletView] = React.useState(false);

    React.useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsTabletView(width >= 768 && width < 1024);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const currentMainNavLinks = isTabletView ? mainNavLinksTablet : mainNavLinks;
    const currentMoreNavLinks = isTabletView ? moreNavLinksTablet : moreNavLinks;

    const activeIndex = React.useMemo(() => {
        return currentMainNavLinks.findIndex(
            (link) =>
                pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)),
        );
    }, [pathname, currentMainNavLinks]);

    const [sliderStyles, setSliderStyles] = React.useState({
        width: 0,
        left: 0,
        opacity: 0,
    });

    const updateSlider = React.useCallback(() => {
        if (activeIndex >= 0 && itemsRef.current.has(activeIndex) && navRef.current) {
            const item = itemsRef.current.get(activeIndex);

            if (!item) {
                return;
            }

            const itemRect = item.getBoundingClientRect();
            const navRect = navRef.current.getBoundingClientRect();

            setSliderStyles({
                width: itemRect.width,
                left: itemRect.left - navRect.left,
                opacity: 1,
            });

            return;
        }

        if (activeIndex === -1) {
            setSliderStyles((prev) => ({ ...prev, opacity: 0 }));
        }
    }, [activeIndex]);

    React.useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            updateSlider();
        });

        return () => cancelAnimationFrame(frameId);
    }, [updateSlider]);

    const handleLinkClick = React.useCallback(
        (index: number) => {
            if (index === activeIndex) {
                return;
            }

            if (itemsRef.current.has(index) && navRef.current) {
                const item = itemsRef.current.get(index);

                if (!item) {
                    return;
                }

                const itemRect = item.getBoundingClientRect();
                const navRect = navRef.current.getBoundingClientRect();

                setSliderStyles({
                    width: itemRect.width,
                    left: itemRect.left - navRect.left,
                    opacity: 1,
                });
            }
        },
        [activeIndex],
    );

    return (
        <nav className="hidden md:flex">
            <div ref={navRef} className="relative flex items-center space-x-1 lg:space-x-2">
                <div
                    className="pointer-events-none absolute top-0 h-full rounded-lg bg-primary/10 shadow-sm transition-all duration-300 ease-out"
                    style={{
                        width: `${sliderStyles.width}px`,
                        left: `${sliderStyles.left}px`,
                        opacity: sliderStyles.opacity,
                    }}
                />

                {currentMainNavLinks.map((link, index) => {
                    const isActive =
                        pathname === link.href ||
                        (link.href !== '/' && pathname?.startsWith(link.href));

                    return (
                        <div
                            key={link.href}
                            className="relative"
                            ref={(node) => {
                                if (node) {
                                    itemsRef.current.set(index, node);
                                } else {
                                    itemsRef.current.delete(index);
                                }
                            }}
                        >
                            <Link
                                href={link.href}
                                onClick={() => handleLinkClick(index)}
                                className={cn(
                                    'relative z-10 block rounded-lg px-3 py-2 text-sm transition-all duration-200',
                                    isActive
                                        ? 'scale-105 font-semibold text-primary'
                                        : 'font-medium text-muted-foreground hover:scale-102 hover:bg-interactive-hover hover:text-interactive-hover-foreground',
                                )}
                            >
                                {link.label}
                            </Link>
                        </div>
                    );
                })}

                <HeaderDropdownMenu
                    items={currentMoreNavLinks}
                    buttonText="更多"
                    menuWidth="w-40"
                />
            </div>
        </nav>
    );
}
