import { publicEnv } from './public-env';

export const siteConfig = {
    publicUrl: publicEnv.urls.blog,
} as const;

export function getConfiguredSiteUrl() {
    return siteConfig.publicUrl;
}
