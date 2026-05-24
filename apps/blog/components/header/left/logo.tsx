import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Logo() {
    return (
        <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-foreground transition-opacity hover:opacity-85"
            aria-label="返回首页"
        >
            <Avatar>
                <AvatarImage src="/apple-touch-icon.png" alt="CodeLess's Blog" />
                <AvatarFallback>CodeLess</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline md:text-base lg:text-xl">CodeLess&apos;s Blog</span>
        </Link>
    );
}
