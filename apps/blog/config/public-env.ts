function optionalString(value: string | undefined) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function requiredString(value: string | undefined, name: string) {
    const trimmed = optionalString(value);

    if (!trimmed) {
        throw new Error(`[env] Missing required environment variable: ${name}`);
    }

    return trimmed;
}

function publicUrl(value: string | undefined, name: string) {
    const requiredValue = requiredString(value, name);
    const withProtocol = /^https?:\/\//i.test(requiredValue)
        ? requiredValue
        : `https://${requiredValue}`;

    return withProtocol.replace(/\/+$/u, '');
}

const urls = {
    blog: publicUrl(process.env.BLOG_PUBLIC_URL, 'BLOG_PUBLIC_URL'),
    admin: publicUrl(process.env.ADMIN_PUBLIC_URL, 'ADMIN_PUBLIC_URL'),
    api: publicUrl(process.env.API_PUBLIC_URL, 'API_PUBLIC_URL'),
} as const;

const oauth = {
    githubClientId: optionalString(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID),
    googleClientId: optionalString(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    callbackUrl: `${urls.blog}/auth/callback`,
} as const;

export const publicEnv = {
    app: {
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
    },
    urls,
    oauth,
} as const;
