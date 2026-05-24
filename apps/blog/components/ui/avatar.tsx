'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { DEFAULT_AVATAR_SRC, getAvatarInitial, getAvatarSrc } from '@/lib/shared/avatar';
import { cn } from '@/lib/shared/utils';

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
            {...props}
        />
    );
}

type AvatarImageProps = React.ComponentProps<typeof AvatarPrimitive.Image> & {
    fallbackSrc?: string | null;
};

function AvatarImage({
    className,
    src,
    fallbackSrc,
    onLoadingStatusChange,
    ...props
}: AvatarImageProps) {
    const resolvedFallbackSrc = fallbackSrc ? getAvatarSrc(fallbackSrc) : null;
    const resolvedSrc = typeof src === 'string' ? src : resolvedFallbackSrc;
    const [currentSrc, setCurrentSrc] = React.useState(resolvedSrc ?? undefined);

    React.useEffect(() => {
        setCurrentSrc(resolvedSrc ?? undefined);
    }, [resolvedSrc]);

    return (
        <AvatarPrimitive.Image
            data-slot="avatar-image"
            src={currentSrc}
            className={cn('aspect-square size-full object-cover', className)}
            onLoadingStatusChange={(status) => {
                if (
                    status === 'error' &&
                    resolvedFallbackSrc &&
                    currentSrc !== resolvedFallbackSrc
                ) {
                    setCurrentSrc(resolvedFallbackSrc);
                }

                onLoadingStatusChange?.(status);
            }}
            {...props}
        />
    );
}

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, 'children'> & {
    src?: string | null;
    name?: string | null;
    fallback?: string;
    imageAlt?: string;
    imageClassName?: string;
    fallbackClassName?: string;
};

function UserAvatar({
    className,
    src,
    name,
    fallback = '访',
    imageAlt,
    imageClassName,
    fallbackClassName,
    ...props
}: UserAvatarProps) {
    const displayName = name?.trim() || '用户';
    const avatarSrc = getAvatarSrc(src);
    const avatarInitial = getAvatarInitial(displayName, fallback);

    return (
        <Avatar className={cn('h-8 w-8 border border-border', className)} {...props}>
            <AvatarImage
                src={avatarSrc}
                fallbackSrc={DEFAULT_AVATAR_SRC}
                alt={imageAlt ?? `${displayName}的头像`}
                className={imageClassName}
            />
            <AvatarFallback
                className={cn('text-xs font-medium text-muted-foreground', fallbackClassName)}
            >
                {avatarInitial}
            </AvatarFallback>
        </Avatar>
    );
}

function AvatarFallback({
    className,
    ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
    return (
        <AvatarPrimitive.Fallback
            data-slot="avatar-fallback"
            className={cn(
                'flex size-full items-center justify-center rounded-full bg-muted',
                className,
            )}
            {...props}
        />
    );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar };
