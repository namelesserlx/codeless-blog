declare module '@joyu/node-ip2region' {
    interface SearchResult {
        region: string | null;
        ioCount?: number;
        took: number;
    }

    interface Searcher {
        search(ip: string): Promise<SearchResult>;
        searchWithBuffer(ip: string): SearchResult;
    }

    const ip2region: {
        isValidIp(ip: string): boolean;
        loadVectorIndexFromFile(dbPath: string): Buffer;
        loadContentFromFile(dbPath: string): Buffer;
        newWithFileOnly(dbPath: string): Searcher;
        newWithVectorIndex(dbPath: string, vectorIndex: Buffer): Searcher;
        newWithBuffer(buffer: Buffer): Searcher;
    };

    export = ip2region;
}
