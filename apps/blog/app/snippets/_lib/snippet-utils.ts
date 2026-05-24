import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { PublishedSnippet } from '@/lib/server/db';
import type { SnippetAuthor, SnippetListItem, SnippetMediaItem } from './snippet-types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export const SNIPPETS_PAGE_TITLE = "片段 | CodeLess's Blog";
export const SNIPPETS_PAGE_DESCRIPTION = '在这里分享生活中的闪念、日常与碎碎念。';

export function getSnippetAuthorName(author?: SnippetAuthor | null) {
    return author?.nickname || author?.username || '匿名';
}

export function stripSnippetText(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

export function buildSnippetExcerpt({
    title,
    content,
}: {
    title?: string | null;
    content: string;
}) {
    const source = stripSnippetText(content) || stripSnippetText(title || '');

    if (!source) {
        return '来自片段页的一则短内容更新。';
    }

    return source.length > 120 ? `${source.slice(0, 117)}...` : source;
}

export function formatSnippetRelativeTime(value: string | Date) {
    return dayjs(value).fromNow();
}

function getSnippetVideoPoster(images: string[]) {
    return images.find((url) => url.trim().length > 0);
}

export function buildSnippetMedia(
    images: string[],
    videos: string[],
    videoPoster?: string | null,
): SnippetMediaItem[] {
    const videoPosterUrl = videoPoster || getSnippetVideoPoster(images);

    if (videos.length > 0) {
        return videos.map((url, index) => ({
            id: `video-${index}-${url}`,
            type: 'video' as const,
            url,
            posterUrl: videoPosterUrl,
            aspectRatio: 16 / 9,
        }));
    }

    return [
        ...images.map((url, index) => ({
            id: `image-${index}-${url}`,
            type: 'image' as const,
            url,
            aspectRatio: 1,
        })),
    ];
}

export function serializeSnippet(snippet: PublishedSnippet): SnippetListItem {
    return {
        id: snippet.id,
        title: snippet.title,
        content: snippet.content,
        excerpt: buildSnippetExcerpt(snippet),
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt,
        relativeCreatedAt: formatSnippetRelativeTime(snippet.createdAt),
        author: snippet.author,
        media: buildSnippetMedia(snippet.images, snippet.videos, snippet.videoPoster),
        likesCount: snippet.likesCount,
        commentsCount: snippet.commentsCount,
        viewsCount: snippet.viewsCount,
    };
}

export function buildSnippetAnchor(id: string) {
    return `snippet-${id}`;
}
