import { SearchCommand } from '@/components/search/SearchCommand';

export function SearchWrapper() {
    return (
        <div className="hidden md:block">
            <SearchCommand />
        </div>
    );
}
