import { SearchCommand } from '@/components/search/SearchCommand';
import { UserAction } from '@/components/actions/user';

export function PcRight() {
    return (
        <div className="hidden items-center gap-1.5 xl:gap-2 2xl:flex">
            <SearchCommand />
            <UserAction />
        </div>
    );
}
