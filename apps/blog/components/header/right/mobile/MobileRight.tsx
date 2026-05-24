import { MobileSearch } from '@/components/search/MobileSearch';
import { MobileNav } from '@/components/header/center/MobileNav';

export function MobileRight() {
    return (
        <div className="flex items-center gap-1.5 md:hidden">
            <MobileSearch />
            <MobileNav />
        </div>
    );
}
