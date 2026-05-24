import { ImageResponse } from 'next/og';
import { getArticleById } from '@/lib/server/db';
import { CardType } from '@blog/shared';

// 图像元数据
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

// 图像生成
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const article = await getArticleById(resolvedParams.id);

    if (!article) {
        // 返回默认图像
        return new ImageResponse(
            <div
                style={{
                    fontSize: 60,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                文章不存在
            </div>,
            {
                ...size,
            },
        );
    }

    const authorName = article.author?.nickname || article.author?.username || '匿名';
    const publishDate = new Date(article.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const tags = article.tags
        .map((tag) => tag.name)
        .slice(0, 3)
        .join(' · ');
    const hasImage = article.cardImageUrl && article.cardImageUrl.trim() !== '';
    const isLargeImage = article.cardType === CardType.LARGE_IMAGE;

    // 如果有图片，使用图片作为背景或主要元素
    if (hasImage) {
        // 大头图（16:9）：图片作为全背景
        if (isLargeImage) {
            return new ImageResponse(
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* 背景图片容器 */}
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                        }}
                    >
                        <img
                            src={article.cardImageUrl!}
                            alt={article.title}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>
                    {/* 渐变遮罩层，确保文字可读性 */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '70%',
                            background:
                                'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%)',
                            display: 'flex',
                        }}
                    />
                    {/* 文字内容 */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '60px 80px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 24,
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontWeight: 600,
                                display: 'flex',
                            }}
                        >
                            {authorName} · {publishDate}
                        </div>
                        <h1
                            style={{
                                fontSize: 64,
                                fontWeight: 800,
                                color: 'white',
                                lineHeight: 1.1,
                                letterSpacing: '-1.5px',
                                margin: 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {article.title}
                        </h1>
                        {article.summary ? (
                            <div
                                style={{
                                    fontSize: 20,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    lineHeight: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {article.summary}
                            </div>
                        ) : (
                            <div style={{ display: 'none' }} />
                        )}
                    </div>
                </div>,
                {
                    ...size,
                },
            );
        } else {
            // 小头图（1:1）：图片在右侧，文字在左侧
            return new ImageResponse(
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        background:
                            'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
                    }}
                >
                    {/* 左侧文字区域 */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '60px 80px',
                            position: 'relative',
                        }}
                    >
                        {/* 标题区域 */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 28,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 600,
                                    letterSpacing: '-0.5px',
                                    display: 'flex',
                                }}
                            >
                                {authorName} · {publishDate}
                            </div>
                            <h1
                                style={{
                                    fontSize: 64,
                                    fontWeight: 800,
                                    color: 'white',
                                    lineHeight: 1.1,
                                    letterSpacing: '-2px',
                                    margin: 0,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {article.title}
                            </h1>
                        </div>

                        {/* 底部信息 */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}
                        >
                            {article.summary ? (
                                <div
                                    style={{
                                        fontSize: 22,
                                        color: 'rgba(255, 255, 255, 0.85)',
                                        lineHeight: 1.5,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {article.summary}
                                </div>
                            ) : (
                                <div style={{ display: 'none' }} />
                            )}
                            {tags ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        fontSize: 18,
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 500,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            background: 'rgba(255, 255, 255, 0.6)',
                                            display: 'flex',
                                        }}
                                    />
                                    {tags}
                                </div>
                            ) : (
                                <div style={{ display: 'none' }} />
                            )}
                        </div>
                    </div>

                    {/* 右侧图片区域 */}
                    <div
                        style={{
                            width: '630px',
                            height: '100%',
                            display: 'flex',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <img
                            src={article.cardImageUrl!}
                            alt={article.title}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'flex',
                            }}
                        />
                    </div>
                </div>,
                {
                    ...size,
                },
            );
        }
    }

    // 没有图片时，使用渐变背景设计
    return new ImageResponse(
        <div
            style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '60px 80px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* 背景装饰 */}
            <div
                style={{
                    position: 'absolute',
                    top: '-100px',
                    right: '-100px',
                    width: '400px',
                    height: '400px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(80px)',
                    display: 'flex',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '-150px',
                    left: '-150px',
                    width: '500px',
                    height: '500px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '50%',
                    filter: 'blur(100px)',
                    display: 'flex',
                }}
            />

            {/* 主要内容 */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'space-between',
                    zIndex: 1,
                }}
            >
                {/* 标题区域 */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 28,
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 600,
                            letterSpacing: '-0.5px',
                            display: 'flex',
                        }}
                    >
                        {authorName} · {publishDate}
                    </div>
                    <h1
                        style={{
                            fontSize: 72,
                            fontWeight: 800,
                            color: 'white',
                            lineHeight: 1.1,
                            letterSpacing: '-2px',
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {article.title}
                    </h1>
                </div>

                {/* 底部信息 */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}
                >
                    {/* 摘要 */}
                    {article.summary ? (
                        <div
                            style={{
                                fontSize: 24,
                                color: 'rgba(255, 255, 255, 0.85)',
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {article.summary}
                        </div>
                    ) : (
                        <div style={{ display: 'none' }} />
                    )}

                    {/* 标签 */}
                    {tags ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontSize: 20,
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontWeight: 500,
                            }}
                        >
                            <div
                                style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    display: 'flex',
                                }}
                            />
                            {tags}
                        </div>
                    ) : (
                        <div style={{ display: 'none' }} />
                    )}
                </div>
            </div>

            {/* 底部装饰线 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                }}
            />
        </div>,
        {
            ...size,
        },
    );
}
