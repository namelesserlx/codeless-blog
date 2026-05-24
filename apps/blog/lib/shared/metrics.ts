import { getActorId, type ActorId } from '@blog/shared';

export interface RequestActorOptions {
    visitorId?: string;
}

/**
 * 从请求中解析出用于统计的 actorId：
 * - 当前仅基于 visitorId 生成 actorId
 */
export const getActorIdFromRequest = ({ visitorId }: RequestActorOptions): ActorId | null =>
    getActorId({ visitorId });

/** 文章阅读时长增量 Hash：field = actorId, value = secondsIncrement */
export const getPostReadTimeKey = (postId: string): string => `post:${postId}:readtime:delta`;

/** 文章点赞 Set：member = actorId */
export const getPostLikeKey = (postId: string): string => `post:${postId}:like`;

/** 文章当日 UV Set：member = actorId */
export const getPostDailyUvKey = (postId: string, date: string): string =>
    `post:${postId}:uv:${date}`;
