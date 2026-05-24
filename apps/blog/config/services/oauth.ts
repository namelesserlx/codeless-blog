import { publicEnv } from '../public-env';

export const oauthPublicConfig = {
    redirectUrl: publicEnv.oauth.callbackUrl,
    github: {
        clientId: publicEnv.oauth.githubClientId,
    },
    google: {
        clientId: publicEnv.oauth.googleClientId,
    },
} as const;
