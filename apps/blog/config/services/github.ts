import 'server-only';

import { blogServerEnv } from '../server-env';

export const githubAboutConfig = {
    username: 'your-username',
    token: blogServerEnv.githubToken,
} as const;

export const isGitHubAboutEnabled = Boolean(githubAboutConfig.token);
