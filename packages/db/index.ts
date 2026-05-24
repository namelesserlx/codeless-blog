import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function createPrismaAdapter() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required before creating Prisma Client.');
    }

    const parsedUrl = new URL(databaseUrl);

    if (parsedUrl.protocol !== 'mysql:') {
        throw new Error(
            `Unsupported DATABASE_URL protocol for Prisma MariaDB adapter: ${parsedUrl.protocol}`,
        );
    }

    const database = parsedUrl.pathname.replace(/^\//, '');

    if (!database) {
        throw new Error('DATABASE_URL must include a database name.');
    }

    return new PrismaMariaDb({
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        database,
    });
}

// 实现了单例模式的核心逻辑
export const prisma =
    globalForPrisma.prisma ?? new PrismaClient({ adapter: createPrismaAdapter() });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from './generated/prisma/client';
