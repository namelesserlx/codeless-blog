import ip2region from '@joyu/node-ip2region';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const UNKNOWN_ADDRESS = '未知ip';

interface Ip2RegionSearcher {
    search(ip: string): Promise<{ region: string | null }>;
}

let searcher: Ip2RegionSearcher | null = null;
let loadedDbPath: string | null = null;

const getIp2RegionDbPath = (): string | undefined => {
    return env.geoip.xdbPath;
};

const getSearcher = (): Ip2RegionSearcher | null => {
    const databasePath = getIp2RegionDbPath();
    if (!databasePath) {
        return null;
    }

    if (searcher && loadedDbPath === databasePath) {
        return searcher;
    }

    try {
        const buffer = ip2region.loadContentFromFile(databasePath);
        searcher = ip2region.newWithBuffer(buffer) as Ip2RegionSearcher;
        loadedDbPath = databasePath;
        return searcher;
    } catch (error) {
        searcher = null;
        loadedDbPath = null;
        logger.warn('ip2region xdb 数据库加载失败', {
            databasePath,
            error,
        });
        return null;
    }
};

const formatIp2Region = (region: string | null): string => {
    if (!region) {
        return UNKNOWN_ADDRESS;
    }

    const address = region
        .split('|')
        .map((item) => item.trim())
        .filter((item) => item && item !== '0' && !/^[A-Z]{2}$/u.test(item))
        .join(' ');

    return address || UNKNOWN_ADDRESS;
};

export const queryGeoIpAddress = async (ip: string): Promise<string> => {
    if (!ip2region.isValidIp(ip)) {
        return UNKNOWN_ADDRESS;
    }

    const currentSearcher = getSearcher();
    if (!currentSearcher) {
        return UNKNOWN_ADDRESS;
    }

    try {
        const result = await currentSearcher.search(ip);
        return formatIp2Region(result.region);
    } catch (error) {
        logger.warn('ip2region 查询失败', {
            ip,
            error,
        });
        return UNKNOWN_ADDRESS;
    }
};
