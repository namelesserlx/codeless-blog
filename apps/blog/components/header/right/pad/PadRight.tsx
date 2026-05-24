import { MobileSearch } from '@/components/search/MobileSearch';
import { SearchCommand } from '@/components/search/SearchCommand';
import { UserAction } from '@/components/actions/user';

export function PadRight() {
    return (
        <div className="hidden items-center gap-1.5 md:flex xl:gap-2 2xl:hidden">
            <div className="hidden md:block xl:hidden">
                <MobileSearch />
            </div>
            <div className="hidden xl:block">
                <SearchCommand />
            </div>
            <UserAction />
        </div>
    );
}
