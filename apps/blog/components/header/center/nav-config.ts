import { BookOpenText, Camera, Code2, Home, Info, Tags, type LucideIcon } from 'lucide-react';

export type NavLink = {
    href: string;
    label: string;
    icon: LucideIcon;
};

const navLinks: NavLink[] = [
    { href: '/', label: '首页', icon: Home },
    { href: '/articles', label: '博客', icon: BookOpenText },
    { href: '/snippets', label: '片段', icon: Code2 },
    { href: '/tags', label: '标签', icon: Tags },
    { href: '/photos', label: '相册', icon: Camera },
    { href: '/about', label: '关于', icon: Info },
];

const mainNavHrefs = ['/', '/articles', '/snippets', '/tags', '/photos'] as const;
const mainNavTabletHrefs = ['/', '/articles', '/snippets'] as const;
const moreNavHrefs = ['/about'] as const;
const moreNavTabletHrefs = ['/about'] as const;

function pickNavLinks(hrefs: readonly string[]) {
    const hrefSet = new Set(hrefs);
    return navLinks.filter((link) => hrefSet.has(link.href));
}

export const allNavLinks = navLinks;
export const mainNavLinks = pickNavLinks(mainNavHrefs);
export const mainNavLinksTablet = pickNavLinks(mainNavTabletHrefs);
export const moreNavLinks = pickNavLinks(moreNavHrefs);
export const moreNavLinksTablet = pickNavLinks(moreNavTabletHrefs);
