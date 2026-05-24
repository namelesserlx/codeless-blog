#!/usr/bin/env ts-node

import { ServiceErrorHandler, Performance } from '../utils/decorators';
import { ValidationError, UserError, ErrorCode } from '../types/errors';

// 不使用装饰器的传统服务
class TraditionalService {
    async getUserById(id: number) {
        try {
            if (!id) {
                throw new Error('用户ID不能为空');
            }

            if (id === 999) {
                throw new Error('用户不存在');
            }

            return {
                id,
                username: `user${id}`,
                email: `user${id}@test.com`,
            };
        } catch (error) {
            console.error('获取用户失败', error);
            throw new Error('获取用户失败');
        }
    }

    async createUser(userData: { username?: string }) {
        try {
            if (!userData.username) {
                throw new Error('用户名不能为空');
            }

            // 模拟异步操作
            await new Promise((resolve) => setTimeout(resolve, 1));

            return {
                id: Math.floor(Math.random() * 1000),
                ...userData,
            };
        } catch (error) {
            console.error('创建用户失败', error);
            throw new Error('创建用户失败');
        }
    }
}

// 使用装饰器的现代服务
class ModernService {
    @ServiceErrorHandler
    async getUserById(id: number) {
        if (!id) {
            throw new ValidationError('用户ID不能为空');
        }

        if (id === 999) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        return {
            id,
            username: `user${id}`,
            email: `user${id}@test.com`,
        };
    }

    @ServiceErrorHandler
    @Performance
    async createUser(userData: { username?: string }) {
        if (!userData.username) {
            throw new ValidationError('用户名不能为空');
        }

        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 1));

        return {
            id: Math.floor(Math.random() * 1000),
            ...userData,
        };
    }
}

// 性能测试函数
async function benchmark(name: string, fn: () => Promise<void>, iterations: number = 1000) {
    const startTime = process.hrtime.bigint();

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
        try {
            await fn();
            successCount++;
        } catch (error) {
            errorCount++;
        }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
    const avgTime = duration / iterations;

    console.log(`📊 ${name}:`);
    console.log(`   总时间: ${duration.toFixed(2)}ms`);
    console.log(`   平均时间: ${avgTime.toFixed(3)}ms`);
    console.log(`   成功次数: ${successCount}`);
    console.log(`   失败次数: ${errorCount}`);
    console.log(`   吞吐量: ${Math.round(iterations / (duration / 1000))} ops/sec\n`);

    return {
        name,
        totalTime: duration,
        avgTime,
        successCount,
        errorCount,
        throughput: Math.round(iterations / (duration / 1000)),
    };
}

// 内存使用监控
function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        rss: Math.round((used.rss / 1024 / 1024) * 100) / 100, // MB
        heapTotal: Math.round((used.heapTotal / 1024 / 1024) * 100) / 100, // MB
        heapUsed: Math.round((used.heapUsed / 1024 / 1024) * 100) / 100, // MB
        external: Math.round((used.external / 1024 / 1024) * 100) / 100, // MB
    };
}

async function runBenchmarks() {
    console.log('🚀 开始错误处理性能基准测试...\n');

    const iterations = 10000;
    const traditionalService = new TraditionalService();
    const modernService = new ModernService();

    console.log('初始内存使用:', getMemoryUsage());
    console.log('='.repeat(50));

    // 测试成功场景
    console.log('🎯 测试成功场景 (每次测试 10,000 次调用)\n');

    const traditional_success = await benchmark(
        '传统方式 - 成功执行',
        async () => {
            await traditionalService.getUserById(Math.floor(Math.random() * 900) + 1);
        },
        iterations,
    );

    const modern_success = await benchmark(
        '装饰器方式 - 成功执行',
        async () => {
            await modernService.getUserById(Math.floor(Math.random() * 900) + 1);
        },
        iterations,
    );

    // 测试错误场景
    console.log('❌ 测试错误场景 (每次测试 1,000 次调用)\n');

    const errorIterations = 1000;

    const traditional_error = await benchmark(
        '传统方式 - 错误处理',
        async () => {
            await traditionalService.getUserById(0);
        },
        errorIterations,
    );

    const modern_error = await benchmark(
        '装饰器方式 - 错误处理',
        async () => {
            await modernService.getUserById(0);
        },
        errorIterations,
    );

    // 测试混合场景
    console.log('🔀 测试混合场景 (成功:失败 = 8:2, 每次测试 5,000 次调用)\n');

    const mixedIterations = 5000;

    const traditional_mixed = await benchmark(
        '传统方式 - 混合场景',
        async () => {
            const id = Math.random() < 0.8 ? Math.floor(Math.random() * 900) + 1 : 0;
            await traditionalService.getUserById(id);
        },
        mixedIterations,
    );

    const modern_mixed = await benchmark(
        '装饰器方式 - 混合场景',
        async () => {
            const id = Math.random() < 0.8 ? Math.floor(Math.random() * 900) + 1 : 0;
            await modernService.getUserById(id);
        },
        mixedIterations,
    );

    console.log('最终内存使用:', getMemoryUsage());
    console.log('='.repeat(50));

    // 性能对比分析
    console.log('📈 性能对比分析:\n');

    function comparePerformance(traditional: any, modern: any, scenario: string) {
        const overhead = ((modern.avgTime - traditional.avgTime) / traditional.avgTime) * 100;
        const throughputChange =
            ((modern.throughput - traditional.throughput) / traditional.throughput) * 100;

        console.log(`${scenario}:`);
        console.log(`   装饰器开销: ${overhead > 0 ? '+' : ''}${overhead.toFixed(2)}%`);
        console.log(
            `   吞吐量变化: ${throughputChange > 0 ? '+' : ''}${throughputChange.toFixed(2)}%`,
        );

        if (Math.abs(overhead) < 5) {
            console.log('   ✅ 性能影响可忽略不计');
        } else if (overhead < 15) {
            console.log('   ⚠️  性能有轻微影响，但可接受');
        } else {
            console.log('   ❌ 性能影响较大');
        }
        console.log();
    }

    comparePerformance(traditional_success, modern_success, '成功场景');
    comparePerformance(traditional_error, modern_error, '错误场景');
    comparePerformance(traditional_mixed, modern_mixed, '混合场景');

    // 总结
    console.log('📋 总结:');
    console.log('================');
    console.log('装饰器方式相比传统方式的优势:');
    console.log('✅ 代码更简洁，无需重复的 try-catch');
    console.log('✅ 错误处理更统一，易于维护');
    console.log('✅ 更好的错误分类和状态码映射');
    console.log('✅ 自动的日志记录和性能监控');
    console.log('✅ 更好的类型安全性');

    const avgOverhead =
        [
            ((modern_success.avgTime - traditional_success.avgTime) / traditional_success.avgTime) *
                100,
            ((modern_error.avgTime - traditional_error.avgTime) / traditional_error.avgTime) * 100,
            ((modern_mixed.avgTime - traditional_mixed.avgTime) / traditional_mixed.avgTime) * 100,
        ].reduce((a, b) => a + b) / 3;

    console.log(`\n平均性能开销: ${avgOverhead > 0 ? '+' : ''}${avgOverhead.toFixed(2)}%`);

    if (Math.abs(avgOverhead) < 5) {
        console.log('🎉 装饰器的性能开销微乎其微，可以放心使用！');
    } else if (avgOverhead < 15) {
        console.log('✅ 装饰器有轻微性能开销，但考虑到代码质量提升，完全值得！');
    } else {
        console.log('⚠️  装饰器有一定性能开销，需要权衡使用。');
    }
}

// 运行基准测试
if (require.main === module) {
    runBenchmarks().catch((error) => {
        console.error('基准测试运行失败:', error);
        process.exit(1);
    });
}
