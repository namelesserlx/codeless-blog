/**
 * 数据库种子脚本
 * 用于初始化开发测试环境的数据
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    BUILTIN_PERMISSION_DEFINITIONS,
    BUILTIN_ROLE_DEFINITIONS,
    resolveBuiltinRolePermissionCodes,
} from '@blog/shared';
import {
    CardType,
    CommentStatus,
    PermissionStatus,
    PermissionType,
    PhotoCategory,
    prisma,
    RoleStatus,
} from '../index';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const SEED_VISITOR_IDS = Array.from(
    { length: 18 },
    (_, index) => `seed-visitor-${String(index + 1).padStart(2, '0')}`,
);

function daysAgo(days: number, hour = 10): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, 0, 0, 0);
    return date;
}

function jsonArray(values: string[]): string {
    return JSON.stringify(values);
}

interface SeedEditorDocument {
    type: 'doc';
    content: unknown[];
}

interface SeedArticle {
    title: string;
    summary: string;
    content: SeedEditorDocument;
    author: 'superAdmin' | 'admin';
    tags: string[];
    cardType: keyof typeof CardType;
    cardImageUrl: string;
    createdAt: {
        daysAgo: number;
        hour: number;
    };
}

function readSeedArticles(): SeedArticle[] {
    const source = readFileSync(resolve(__dirname, 'seed-data/articles.json'), 'utf8');
    return JSON.parse(source) as SeedArticle[];
}

function serializeSeedArticleContent(content: SeedEditorDocument): string {
    if (content.type !== 'doc' || !Array.isArray(content.content)) {
        throw new Error('Seed article content must be a Tiptap JSON document.');
    }

    return JSON.stringify(content);
}

function getRequiredMapValue<T>(map: Map<string, T>, code: string, label: string): T {
    const value = map.get(code);

    if (!value) {
        throw new Error(`${label} not found: ${code}`);
    }

    return value;
}

async function createBuiltinPermissions() {
    const permissionByCode = new Map<string, { id: number; code: string }>();

    for (const definition of BUILTIN_PERMISSION_DEFINITIONS) {
        const parentId = definition.parentCode
            ? getRequiredMapValue(permissionByCode, definition.parentCode, 'Parent permission').id
            : null;

        const permission = await prisma.permission.create({
            data: {
                name: definition.name,
                code: definition.code,
                type: definition.type as PermissionType,
                resource: definition.resource ?? null,
                action: definition.action ?? null,
                sort: definition.sort,
                status: (definition.status ?? PermissionStatus.ACTIVE) as PermissionStatus,
                parentId,
            },
        });

        permissionByCode.set(permission.code, permission);
    }

    return permissionByCode;
}

async function createBuiltinRoles() {
    const roleByCode = new Map<string, { id: number; code: string }>();

    for (const definition of BUILTIN_ROLE_DEFINITIONS) {
        const parentId = definition.parentCode
            ? getRequiredMapValue(roleByCode, definition.parentCode, 'Parent role').id
            : null;

        const role = await prisma.role.create({
            data: {
                name: definition.name,
                code: definition.code,
                description: definition.description,
                level: definition.level,
                status: (definition.status ?? RoleStatus.ACTIVE) as RoleStatus,
                parentId,
            },
        });

        roleByCode.set(role.code, role);
    }

    return roleByCode;
}

async function assignBuiltinRolePermissions(roleByCode: Map<string, { id: number; code: string }>) {
    const allPermissions = await prisma.permission.findMany({
        select: { id: true, code: true },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    const permissionByCode = new Map(
        allPermissions.map((permission) => [permission.code, permission]),
    );
    const allPermissionCodes = allPermissions.map((permission) => permission.code);

    console.log(`共找到 ${allPermissions.length} 个权限`);

    if (allPermissions.length === 0) {
        console.warn('⚠️ 没有找到任何权限数据，请检查权限创建是否成功');
        return;
    }

    for (const roleDefinition of BUILTIN_ROLE_DEFINITIONS) {
        const role = getRequiredMapValue(roleByCode, roleDefinition.code, 'Role');
        const permissionCodes = resolveBuiltinRolePermissionCodes(
            roleDefinition.code,
            allPermissionCodes,
        );
        const rows = permissionCodes.map((code) => ({
            roleId: role.id,
            permissionId: getRequiredMapValue(permissionByCode, code, 'Permission').id,
        }));

        if (rows.length > 0) {
            await prisma.rolePermission.createMany({ data: rows });
        }
    }
}

function buildPostViews(postId: string, buckets: Array<{ daysAgo: number; count: number }>) {
    return buckets.flatMap((bucket) =>
        Array.from({ length: bucket.count }, (_, index) => ({
            postId,
            visitorId: `seed-post-view-${postId.slice(-6)}-${bucket.daysAgo}-${index}`,
            viewedAt: daysAgo(bucket.daysAgo, 0),
        })),
    );
}

function buildSnippetViews(snippetId: string, buckets: Array<{ daysAgo: number; count: number }>) {
    return buckets.flatMap((bucket) =>
        Array.from({ length: bucket.count }, (_, index) => ({
            snippetId,
            visitorId: `seed-snippet-view-${snippetId.slice(-6)}-${bucket.daysAgo}-${index}`,
            viewedAt: daysAgo(bucket.daysAgo, 0),
        })),
    );
}

async function main() {
    try {
        console.log('🚀 开始初始化数据库...');
        console.log('📋 环境信息:');
        console.log('  - NODE_ENV:', process.env.NODE_ENV);
        console.log(
            '  - DATABASE_URL:',
            process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@') || '未设置',
        );

        // 测试数据库连接
        console.log('🔗 测试数据库连接...');
        await prisma.$connect();
        console.log('✅ 数据库连接成功');

        // 清理现有数据（注意删除顺序，避免外键约束问题）
        console.log('🧹 开始清理现有数据...');

        await prisma.rolePermission.deleteMany();
        console.log('  ✓ 已清理角色权限关联');

        await prisma.userRole.deleteMany();
        console.log('  ✓ 已清理用户角色关联');

        await prisma.commentLike.deleteMany();
        await prisma.comment.deleteMany();
        console.log('  ✓ 已清理评论数据');

        await prisma.postReadTime.deleteMany();
        await prisma.postViewDaily.deleteMany();
        await prisma.postLike.deleteMany();
        console.log('  ✓ 已清理文章统计数据');

        await prisma.snippetReadTime.deleteMany();
        await prisma.snippetViewDaily.deleteMany();
        await prisma.snippetLike.deleteMany();
        console.log('  ✓ 已清理片段统计数据');

        await prisma.photo.deleteMany();
        console.log('  ✓ 已清理相册数据');

        await prisma.post.deleteMany();
        console.log('  ✓ 已清理文章数据');

        await prisma.snippet.deleteMany();
        console.log('  ✓ 已清理代码片段数据');

        await prisma.tag.deleteMany();
        console.log('  ✓ 已清理标签数据');

        await prisma.permission.deleteMany();
        console.log('  ✓ 已清理权限数据');

        await prisma.role.deleteMany();
        console.log('  ✓ 已清理角色数据');

        await prisma.user.deleteMany();
        console.log('  ✓ 已清理用户数据');

        console.log('✅ 所有现有数据清理完成');

        // ===== 创建权限数据 =====
        console.log('开始创建权限数据...');
        await createBuiltinPermissions();

        console.log('权限数据创建完成');

        // ===== 创建角色数据 =====
        console.log('开始创建角色数据...');
        const roleByCode = await createBuiltinRoles();
        const superAdminRole = getRequiredMapValue(roleByCode, 'super_admin', 'Role');
        const adminRole = getRequiredMapValue(roleByCode, 'admin', 'Role');
        const userRole = getRequiredMapValue(roleByCode, 'user', 'Role');

        console.log('角色数据创建完成');

        // ===== 分配权限给角色 =====
        console.log('开始分配权限...');
        await assignBuiltinRolePermissions(roleByCode);

        console.log('权限分配完成');

        // ===== 创建用户 =====
        console.log('开始创建用户...');

        // 密码加密
        const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
        const userPassword = await bcrypt.hash('user123', SALT_ROUNDS);

        // 创建超级管理员用户
        const superAdminUser = await prisma.user.create({
            data: {
                username: 'superadmin',
                email: 'superadmin@example.com',
                nickname: '超级管理员',
                password: adminPassword,
                avatar: 'https://joeschmoe.io/api/v1/random',
                status: 'ACTIVE',
            },
        });

        // 创建管理员用户
        const adminUser = await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@example.com',
                nickname: '管理员',
                password: adminPassword,
                avatar: 'https://joeschmoe.io/api/v1/random',
                status: 'ACTIVE',
            },
        });

        // 创建普通用户
        const regularUser = await prisma.user.create({
            data: {
                username: 'test',
                email: 'user@example.com',
                nickname: '测试用户',
                password: userPassword,
                avatar: 'https://joeschmoe.io/api/v1/random',
                status: 'ACTIVE',
            },
        });

        console.log('用户创建完成');

        // ===== 分配角色给用户 =====
        console.log('开始分配角色...');

        await prisma.userRole.createMany({
            data: [
                { userId: superAdminUser.id, roleId: superAdminRole.id },
                { userId: adminUser.id, roleId: adminRole.id },
                { userId: regularUser.id, roleId: userRole.id },
            ],
        });

        console.log('角色分配完成');

        // ===== 创建初始标签 =====
        const tagNames = [
            '技术',
            'JavaScript',
            'React',
            'Next.js',
            'MySQL',
            '学习笔记',
            'TypeScript',
            'Prisma',
            'Docker',
            '性能优化',
            '随笔',
            '工程化',
        ];
        const tags = await Promise.all(
            tagNames.map((name) =>
                prisma.tag.create({
                    data: { name },
                }),
            ),
        );
        const tagMap = Object.fromEntries(tags.map((tag) => [tag.name, tag]));

        console.log('已创建标签');

        // ===== 创建样例文章 =====
        console.log('开始创建文章、评论和历史统计...');
        const articleAuthorIdMap = {
            superAdmin: superAdminUser.id,
            admin: adminUser.id,
        } satisfies Record<SeedArticle['author'], number>;
        const articles = await Promise.all(
            readSeedArticles().map((seedArticle) =>
                prisma.post.create({
                    data: {
                        title: seedArticle.title,
                        summary: seedArticle.summary,
                        content: serializeSeedArticleContent(seedArticle.content),
                        published: true,
                        isDraft: false,
                        authorId: articleAuthorIdMap[seedArticle.author],
                        tags: {
                            connect: seedArticle.tags.map((name) => ({
                                id: tagMap[name].id,
                            })),
                        },
                        cardType: CardType[seedArticle.cardType],
                        cardImageUrl: seedArticle.cardImageUrl,
                        createdAt: daysAgo(
                            seedArticle.createdAt.daysAgo,
                            seedArticle.createdAt.hour,
                        ),
                    },
                }),
            ),
        );

        await prisma.comment.createMany({
            data: [
                {
                    postId: articles[0].id,
                    authorId: regularUser.id,
                    content: '这篇把 Next.js 和 Prisma 的职责边界讲清楚了，特别适合做项目复盘。',
                    status: CommentStatus.PUBLISHED,
                    createdAt: daysAgo(1, 15),
                },
                {
                    postId: articles[0].id,
                    authorId: adminUser.id,
                    content: '后续可以继续补一篇 Prisma migration 在生产环境的处理细节。',
                    status: CommentStatus.PUBLISHED,
                    createdAt: daysAgo(1, 16),
                },
                {
                    postId: articles[2].id,
                    authorId: superAdminUser.id,
                    content: '部署脚本拆阶段以后，排查问题确实清晰很多。',
                    status: CommentStatus.PUBLISHED,
                    createdAt: daysAgo(3, 10),
                },
            ],
        });

        const postViewRows = [
            ...buildPostViews(articles[0].id, [
                { daysAgo: 0, count: 8 },
                { daysAgo: 1, count: 12 },
                { daysAgo: 2, count: 9 },
            ]),
            ...buildPostViews(articles[1].id, [
                { daysAgo: 0, count: 5 },
                { daysAgo: 1, count: 7 },
                { daysAgo: 3, count: 6 },
            ]),
            ...buildPostViews(articles[2].id, [
                { daysAgo: 0, count: 10 },
                { daysAgo: 2, count: 8 },
                { daysAgo: 5, count: 6 },
            ]),
            ...buildPostViews(articles[3].id, [
                { daysAgo: 1, count: 6 },
                { daysAgo: 4, count: 5 },
            ]),
        ];
        await prisma.postViewDaily.createMany({ data: postViewRows });
        await prisma.postReadTime.createMany({
            data: articles.flatMap((article, articleIndex) =>
                SEED_VISITOR_IDS.slice(0, 5).map((visitorId, visitorIndex) => ({
                    postId: article.id,
                    visitorId,
                    seconds: 90 + articleIndex * 35 + visitorIndex * 18,
                })),
            ),
        });
        await prisma.postLike.createMany({
            data: articles.flatMap((article, articleIndex) =>
                SEED_VISITOR_IDS.slice(0, 3 + articleIndex).map((visitorId) => ({
                    postId: article.id,
                    visitorId,
                })),
            ),
        });

        console.log('已创建文章、评论和历史统计');

        // ===== 创建样例片段 =====
        console.log('开始创建片段数据...');
        const snippets = await Promise.all([
            prisma.snippet.create({
                data: {
                    title: 'Next.js 环境变量排查笔记',
                    content:
                        '今天重新梳理了 NEXT_PUBLIC_*、服务端 env、Docker build arg 和运行时 env-file 的边界。结论：先确认变量在浏览器、构建期还是运行期读取，再决定放在哪里。',
                    published: true,
                    isDraft: false,
                    authorId: adminUser.id,
                    images: jsonArray([
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80',
                    ]),
                    createdAt: daysAgo(1, 20),
                },
            }),
            prisma.snippet.create({
                data: {
                    title: '一个部署脚本的小原则',
                    content:
                        '复杂部署不要堆在一个 Deploy 阶段里。拆成 Init、Upload、Build、Restart、Health Check，每一步失败时才能快速定位。',
                    published: true,
                    isDraft: false,
                    authorId: superAdminUser.id,
                    images: jsonArray([
                        'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1000&q=80',
                    ]),
                    createdAt: daysAgo(3, 18),
                },
            }),
            prisma.snippet.create({
                data: {
                    title: 'Redis 指标上报',
                    content:
                        '点赞适合用 Set 表示当前状态；浏览 UV 适合按日期分桶；阅读时长适合 Hash 累加增量。数据结构选对以后，flush 逻辑会简单很多。',
                    published: true,
                    isDraft: false,
                    authorId: adminUser.id,
                    images: jsonArray([]),
                    createdAt: daysAgo(6, 12),
                },
            }),
        ]);

        await prisma.snippetViewDaily.createMany({
            data: [
                ...buildSnippetViews(snippets[0].id, [
                    { daysAgo: 0, count: 6 },
                    { daysAgo: 1, count: 4 },
                ]),
                ...buildSnippetViews(snippets[1].id, [
                    { daysAgo: 1, count: 5 },
                    { daysAgo: 2, count: 3 },
                ]),
                ...buildSnippetViews(snippets[2].id, [{ daysAgo: 2, count: 4 }]),
            ],
        });
        await prisma.snippetReadTime.createMany({
            data: snippets.flatMap((snippet, snippetIndex) =>
                SEED_VISITOR_IDS.slice(0, 4).map((visitorId, visitorIndex) => ({
                    snippetId: snippet.id,
                    visitorId,
                    seconds: 25 + snippetIndex * 15 + visitorIndex * 8,
                })),
            ),
        });
        await prisma.snippetLike.createMany({
            data: snippets.flatMap((snippet, snippetIndex) =>
                SEED_VISITOR_IDS.slice(0, 2 + snippetIndex).map((visitorId) => ({
                    snippetId: snippet.id,
                    visitorId,
                })),
            ),
        });
        await prisma.comment.create({
            data: {
                snippetId: snippets[0].id,
                authorId: regularUser.id,
                content: '这个片段对环境变量排查很有帮助。',
                status: CommentStatus.PUBLISHED,
                createdAt: daysAgo(1, 21),
            },
        });

        console.log('已创建片段数据');

        // ===== 创建样例相册 =====
        console.log('开始创建相册数据...');
        await prisma.photo.createMany({
            data: [
                {
                    title: '傍晚的城市天际线',
                    src: jsonArray([
                        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
                    ]),
                    alt: '傍晚城市建筑与天空',
                    description: '下班路上遇到的一束暖光，适合放进相册测试瀑布流效果。',
                    location: '广州',
                    date: daysAgo(4, 18),
                    tags: jsonArray(['城市', '傍晚', '光影']),
                    category: PhotoCategory.BUILDING,
                },
                {
                    title: '周末咖啡与笔记',
                    src: jsonArray([
                        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80',
                    ]),
                    alt: '咖啡、笔记本和桌面',
                    description: '周末整理项目思路时留下的一张桌面照片。',
                    location: '书房',
                    date: daysAgo(7, 10),
                    tags: jsonArray(['咖啡', '学习', '日常']),
                    category: PhotoCategory.DAILY,
                },
                {
                    title: '山间步道',
                    src: jsonArray([
                        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
                        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80',
                    ]),
                    alt: '山间步道与自然风景',
                    description: '多图相册样例，用于验证相册预览和移动端卡片展示。',
                    location: '从化',
                    date: daysAgo(14, 9),
                    tags: jsonArray(['旅行', '自然', '风景']),
                    category: PhotoCategory.SCENERY,
                },
                {
                    title: '键盘与终端',
                    src: jsonArray([
                        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
                    ]),
                    alt: '键盘和代码终端',
                    description: '给技术类相册分类准备的样例图片。',
                    location: '工作台',
                    date: daysAgo(20, 22),
                    tags: jsonArray(['技术', '终端', '工程化']),
                    category: PhotoCategory.TECHNOLOGY,
                },
            ],
        });

        console.log('已创建相册数据');

        // 显示创建的账号信息
        console.log('\n=== 创建的账号信息 ===');
        console.log('超级管理员账号:');
        console.log('  用户名: superadmin');
        console.log('  邮箱: superadmin@example.com');
        console.log('  密码: admin123');
        console.log('  角色: 超级管理员');

        console.log('\n管理员账号:');
        console.log('  用户名: admin');
        console.log('  邮箱: admin@example.com');
        console.log('  密码: admin123');
        console.log('  角色: 管理员');

        console.log('\n普通用户账号:');
        console.log('  用户名: test');
        console.log('  邮箱: user@example.com');
        console.log('  密码: user123');
        console.log('  角色: 普通用户');

        console.log('\n🎉 === RBAC权限系统初始化完成! ===');
    } catch (error) {
        console.error('❌ 数据库种子脚本运行出错:', error);

        // 详细错误信息
        if (error instanceof Error) {
            console.error('📋 错误详情:', error.message);
            if ('code' in error) {
                console.error('📋 错误代码:', (error as any).code);
            }
            if ('stack' in error) {
                console.error('📋 错误堆栈:', error.stack);
            }
        }

        throw error;
    } finally {
        // 确保数据库连接关闭
        await prisma.$disconnect();
        console.log('🔌 数据库连接已关闭');
    }
}

main().catch((e) => {
    console.error('💥 种子脚本执行失败:', e);
    process.exit(1);
});
