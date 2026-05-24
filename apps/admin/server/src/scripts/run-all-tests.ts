#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestResult {
    name: string;
    passed: boolean;
    output?: string;
    error?: string;
}

const testResults: TestResult[] = [];

// 运行单个测试脚本
function runScript(scriptPath: string, name: string): Promise<TestResult> {
    return new Promise((resolve) => {
        const child = spawn('npx', ['ts-node', scriptPath], {
            stdio: 'pipe',
            cwd: process.cwd(),
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                name,
                passed: code === 0,
                output,
                error: errorOutput,
            });
        });

        child.on('error', (error) => {
            resolve({
                name,
                passed: false,
                error: error.message,
            });
        });
    });
}

// 运行所有测试
async function runAllTests() {
    console.log('🧪 开始运行错误处理系统的完整测试套件...\n');
    console.log('='.repeat(60));

    const scriptDir = __dirname;

    const tests = [
        {
            name: '功能测试',
            script: path.join(scriptDir, 'test-error-handling.ts'),
            description: '测试所有装饰器和错误类型的功能',
        },
        {
            name: '性能测试',
            script: path.join(scriptDir, 'benchmark-error-handling.ts'),
            description: '测试装饰器的性能开销',
        },
    ];

    console.log('📋 测试计划:');
    tests.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test.name} - ${test.description}`);
    });
    console.log();

    // 逐个运行测试
    for (const test of tests) {
        console.log(`🔄 正在运行: ${test.name}...`);
        console.log('-'.repeat(40));

        const startTime = Date.now();
        const result = await runScript(test.script, test.name);
        const duration = Date.now() - startTime;

        testResults.push(result);

        if (result.passed) {
            console.log(`✅ ${test.name} 通过 (${duration}ms)`);
        } else {
            console.log(`❌ ${test.name} 失败 (${duration}ms)`);
            if (result.error) {
                console.log(`错误: ${result.error}`);
            }
        }

        console.log();
    }

    // 输出测试结果汇总
    console.log('='.repeat(60));
    console.log('📊 测试结果汇总:');
    console.log('='.repeat(60));

    const passedTests = testResults.filter((r) => r.passed);
    const failedTests = testResults.filter((r) => !r.passed);

    console.log(`✅ 通过的测试: ${passedTests.length}/${testResults.length}`);
    console.log(`❌ 失败的测试: ${failedTests.length}/${testResults.length}`);
    console.log(`📈 通过率: ${Math.round((passedTests.length / testResults.length) * 100)}%`);

    if (failedTests.length > 0) {
        console.log('\n失败的测试详情:');
        failedTests.forEach((test) => {
            console.log(`\n❌ ${test.name}:`);
            if (test.error) {
                console.log(`   错误: ${test.error}`);
            }
            if (test.output) {
                console.log(`   输出: ${test.output.substring(0, 200)}...`);
            }
        });
    }

    // 最终评估
    console.log('\n' + '='.repeat(60));
    console.log('🎯 最终评估:');
    console.log('='.repeat(60));

    if (passedTests.length === testResults.length) {
        console.log('🎉 所有测试都通过了！');
        console.log('\n✨ 错误处理系统状态: 优秀');
        console.log('✅ 功能完整性: 100%');
        console.log('✅ 性能表现: 良好');
        console.log('✅ 可靠性: 高');
        console.log('\n🚀 系统已准备好投入生产环境！');
    } else if (passedTests.length >= testResults.length * 0.8) {
        console.log('⚠️  大部分测试通过，但仍有问题需要解决。');
        console.log('\n📋 建议:');
        console.log('1. 修复失败的测试');
        console.log('2. 检查错误处理逻辑');
        console.log('3. 验证装饰器配置');
    } else {
        console.log('❌ 多个测试失败，系统存在严重问题。');
        console.log('\n🔧 急需解决:');
        console.log('1. 检查错误处理架构');
        console.log('2. 验证装饰器实现');
        console.log('3. 确认类型定义正确');
        console.log('4. 测试中间件集成');
    }

    // 生成测试报告
    generateTestReport();

    // 退出码
    process.exit(failedTests.length > 0 ? 1 : 0);
}

// 生成测试报告
function generateTestReport() {
    const reportPath = path.join(__dirname, '../logs/test-report.json');

    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: testResults.length,
            passed: testResults.filter((r) => r.passed).length,
            failed: testResults.filter((r) => !r.passed).length,
            passRate: Math.round(
                (testResults.filter((r) => r.passed).length / testResults.length) * 100,
            ),
        },
        results: testResults,
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
        },
    };

    try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 测试报告已保存到: ${reportPath}`);
    } catch (error) {
        console.log(
            `\n⚠️  无法保存测试报告: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

// 处理中断信号
process.on('SIGINT', () => {
    console.log('\n\n⚠️  测试被中断');
    generateTestReport();
    process.exit(1);
});

// 运行测试
if (require.main === module) {
    runAllTests().catch((error) => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}
