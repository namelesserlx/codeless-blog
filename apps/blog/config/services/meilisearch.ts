import 'server-only';

import { blogServerEnv } from '../server-env';

const meiliHost = blogServerEnv.meilisearch.url;
const meiliSearchKey = blogServerEnv.meilisearch.searchKey;

export const meiliSearchConfig = {
    host: meiliHost,
    apiKey: meiliSearchKey,
    isConfigured: Boolean(meiliHost && meiliSearchKey),
    articleIndexName: 'articles',
} as const;
