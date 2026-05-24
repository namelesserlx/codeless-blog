function optionalString(value: string | undefined) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function requiredString(value: string | undefined, name: string) {
    if (!value) {
        throw new Error(`缺少 ${name} 环境变量配置`);
    }

    return value;
}

function publicUrl(value: string | undefined, name: string) {
    const requiredValue = requiredString(value, name);
    const withProtocol = /^https?:\/\//i.test(requiredValue)
        ? requiredValue
        : `https://${requiredValue}`;

    return withProtocol.replace(/\/+$/u, '');
}

const urls = {
    blog: publicUrl(import.meta.env.BLOG_PUBLIC_URL, 'BLOG_PUBLIC_URL'),
    admin: publicUrl(import.meta.env.ADMIN_PUBLIC_URL, 'ADMIN_PUBLIC_URL'),
    api: publicUrl(import.meta.env.API_PUBLIC_URL, 'API_PUBLIC_URL'),
} as const;

export const clientEnv = {
    urls,
    oauth: {
        githubClientId: optionalString(import.meta.env.VITE_GITHUB_ID),
        googleClientId: optionalString(import.meta.env.VITE_GOOGLE_ID),
        githubCallbackUrl: `${urls.admin}/auth/github/callback`,
        googleCallbackUrl: `${urls.admin}/auth/google/callback`,
    },
    app: {
        isDevelopment: import.meta.env.MODE === 'development',
    },
} as const;
