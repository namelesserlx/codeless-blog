import { env } from './env';

type OAuthSource = string | undefined;

function resolveSource(source?: OAuthSource) {
    return source === 'next' ? 'next' : 'admin';
}

function requireValue(key: string, value: string | undefined) {
    if (!value) {
        throw new Error(`缺少环境变量: ${key}`);
    }

    return value;
}

export function getGithubOAuthConfig(source?: OAuthSource) {
    const resolvedSource = resolveSource(source);
    const config = resolvedSource === 'next' ? env.oauth.github.blog : env.oauth.github.admin;

    return {
        clientId: requireValue(config.clientIdKey, config.clientId),
        clientSecret: requireValue(config.clientSecretKey, config.clientSecret),
        redirectUri: config.redirectUri,
    };
}

export function getGoogleOAuthConfig(source?: OAuthSource) {
    const resolvedSource = resolveSource(source);
    const config = resolvedSource === 'next' ? env.oauth.google.blog : env.oauth.google.admin;

    return {
        clientId: requireValue(config.clientIdKey, config.clientId),
        clientSecret: requireValue(config.clientSecretKey, config.clientSecret),
        redirectUri: config.redirectUri,
    };
}
