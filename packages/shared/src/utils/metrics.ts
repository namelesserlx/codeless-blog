export type ActorId = string;

export interface ActorContext {
    userId?: number | string;
    visitorId?: string;
}

/**
 * 生成用于统计的统一 actorId：
 * - 已登录：u:{userId}
 * - 未登录：v:{visitorId}
 */
export const getActorId = (ctx: ActorContext): ActorId | null => {
    if (ctx.userId !== undefined && ctx.userId !== null) {
        return `u:${String(ctx.userId)}`;
    }
    if (ctx.visitorId) {
        // 为了兼容历史数据，访客直接使用原始 visitorId
        return ctx.visitorId;
    }
    return null;
};

/** 文章阅读时长增量 Hash：field = actorId, value = secondsIncrement */
export const getPostReadTimeKey = (postId: string): string => `post:${postId}:readtime:delta`;

/** 文章点赞 Set：member = actorId */
export const getPostLikeKey = (postId: string): string => `post:${postId}:like`;

/** 文章当日 UV Set：member = actorId */
export const getPostDailyUvKey = (postId: string, date: string): string =>
    `post:${postId}:uv:${date}`;
