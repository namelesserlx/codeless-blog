import 'server-only';

import { cache } from 'react';
import { siteConfig } from '@/config/site-config';

function normalizeSiteUrl(value: string) {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    return withProtocol.replace(/\/+$/, '');
}

export const getSiteUrl = cache(async () => {
    return normalizeSiteUrl(siteConfig.publicUrl);
});
