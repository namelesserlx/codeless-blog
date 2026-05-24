import '../bootstrap/load-env';
import { spawn } from 'node:child_process';
import { prisma } from '@blog/db';

type SeedResult = 'seeded' | 'skipped';

interface SeedDatabaseIfNeededDeps {
    countUsers: () => Promise<number>;
    runSeed: () => Promise<void>;
    log: (message: string) => void;
}

export async function seedDatabaseIfNeeded({
    countUsers,
    runSeed,
    log,
}: SeedDatabaseIfNeededDeps): Promise<SeedResult> {
    const userCount = await countUsers();

    if (userCount > 0) {
        log(`检测到已有 ${userCount} 个用户，跳过数据库 seed。`);
        return 'skipped';
    }

    log('未检测到用户，开始执行数据库 seed。');
    await runSeed();
    log('数据库 seed 执行完成。');
    return 'seeded';
}

const runSeedCommand = (): Promise<void> =>
    new Promise((resolve, reject) => {
        const child = spawn('pnpm', ['--filter', '@blog/db', 'db:seed:prod'], {
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`数据库 seed 失败，退出码: ${code ?? 'unknown'}`));
        });
    });

async function main() {
    try {
        console.log('🌱 检查是否需要初始化数据库种子数据...');

        await prisma.$connect();
        await seedDatabaseIfNeeded({
            countUsers: () => prisma.user.count(),
            runSeed: runSeedCommand,
            log: (message) => console.log(`[seed] ${message}`),
        });

        console.log('✅ 数据库种子检查完成。');
        process.exit(0);
    } catch (error) {
        console.error('❌ 数据库种子检查失败:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    void main();
}
