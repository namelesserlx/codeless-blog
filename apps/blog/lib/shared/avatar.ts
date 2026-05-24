export const DEFAULT_AVATAR_SRC = '/images/default-avatar.svg';

const LEGACY_PLACEHOLDER_AVATAR_PATTERNS = [/joeschmoe\.io\/api\/v1\/random/iu];

export function getAvatarSrc(avatar?: string | null): string {
    const normalizedAvatar = avatar?.trim();

    if (
        !normalizedAvatar ||
        normalizedAvatar === 'null' ||
        normalizedAvatar === 'undefined' ||
        LEGACY_PLACEHOLDER_AVATAR_PATTERNS.some((pattern) => pattern.test(normalizedAvatar))
    ) {
        return DEFAULT_AVATAR_SRC;
    }

    return normalizedAvatar;
}

export function getAvatarInitial(name?: string | null, fallback = '访'): string {
    return name?.trim().charAt(0) || fallback;
}
