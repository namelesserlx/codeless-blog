#!/usr/bin/env ts-node

import {
    BusinessError,
    UserError,
    ValidationError,
    ErrorCode,
    HTTP_STATUS_MAP,
} from '../types/errors';
import {
    ServiceErrorHandler,
    ControllerErrorHandler,
    Performance,
    ValidateParams,
    Retry,
} from '../utils/decorators';

// 测试结果记录
interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const testResults: TestResult[] = [];

// 测试工具函数
function test(name: string, testFn: () => Promise<void> | void) {
    return async () => {
        try {
            await testFn();
            testResults.push({ name, passed: true });
            console.log(`✅ ${name}`);
        } catch (error) {
            testResults.push({
                name,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
            });
            console.log(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
        }
    };
}

// 断言函数
function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `期望: ${expected}, 实际: ${actual}`);
    }
}

function assertInstanceOf(obj: any, constructor: any, message?: string) {
    if (!(obj instanceof constructor)) {
        throw new Error(message || `期望 ${obj} 是 ${constructor.name} 的实例`);
    }
}

// 测试用的服务类
class TestUserService {
    @ServiceErrorHandler
    async getUserById(id: number) {
        if (!id) {
            throw new ValidationError('用户ID不能为空');
        }

        if (id === 999) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (id === 500) {
            throw new Error('数据库连接失败');
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

        if (userData.username === 'admin') {
            throw new UserError(ErrorCode.USERNAME_EXISTS);
        }

        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
            id: Math.floor(Math.random() * 1000),
            ...userData,
        };
    }

    @ValidateParams((args) => {
        const [email] = args;
        if (!email || !email.includes('@')) {
            throw new Error('无效的邮箱地址');
        }
    })
    @ServiceErrorHandler
    async getUserByEmail(email: string) {
        return {
            id: 1,
            email,
            username: 'testuser',
        };
    }

    private attemptCount = 0;

    @Retry({ times: 3, delay: 10 })
    @ServiceErrorHandler
    async unstableOperation() {
        this.attemptCount++;
        if (this.attemptCount < 3) {
            throw new Error('网络错误');
        }
        return 'success';
    }

    resetAttempts() {
        this.attemptCount = 0;
    }
}

// 测试用的控制器类
class TestUserController {
    private userService = new TestUserService();

    @ControllerErrorHandler
    async getUser(ctx: any) {
        const id = parseInt(ctx.params.id);
        const user = await this.userService.getUserById(id);
        ctx.body = { success: true, data: user };
    }

    @ControllerErrorHandler
    async createUser(ctx: any) {
        const userData = ctx.request.body;
        const user = await this.userService.createUser(userData);
        ctx.body = { success: true, data: user, message: '用户创建成功' };
    }
}

// 执行测试
async function runTests() {
    console.log('🧪 开始测试错误处理系统...\n');

    // 1. 测试自定义错误类型
    await test('BusinessError 应该正确创建', () => {
        const error = new BusinessError(ErrorCode.USER_NOT_FOUND, '自定义消息');

        assertEqual(error.code, ErrorCode.USER_NOT_FOUND);
        assertEqual(error.message, '自定义消息');
        assertEqual(error.statusCode, HTTP_STATUS_MAP[ErrorCode.USER_NOT_FOUND]);
        assertEqual(error.name, 'BusinessError');
    })();

    await test('UserError 应该继承 BusinessError', () => {
        const error = new UserError(ErrorCode.USERNAME_EXISTS);

        assertInstanceOf(error, BusinessError);
        assertEqual(error.code, ErrorCode.USERNAME_EXISTS);
        assertEqual(error.statusCode, 400);
    })();

    await test('ValidationError 应该使用默认错误码', () => {
        const error = new ValidationError('验证失败');

        assertEqual(error.code, ErrorCode.VALIDATION_ERROR);
        assertEqual(error.message, '验证失败');
        assertEqual(error.statusCode, 400);
    })();

    // 2. 测试服务层装饰器
    const userService = new TestUserService();

    await test('服务层 - 成功执行应该返回结果', async () => {
        const result = await userService.getUserById(123);
        assertEqual(result.id, 123);
        assertEqual(result.username, 'user123');
    })();

    await test('服务层 - 业务异常应该直接抛出', async () => {
        try {
            await userService.getUserById(999);
            throw new Error('应该抛出异常');
        } catch (error) {
            assertInstanceOf(error, UserError);
            assertEqual(error.code, ErrorCode.USER_NOT_FOUND);
        }
    })();

    await test('服务层 - 未知错误应该包装为 BusinessError', async () => {
        try {
            await userService.getUserById(500);
            throw new Error('应该抛出异常');
        } catch (error) {
            assertInstanceOf(error, BusinessError);
            assertEqual(error.code, ErrorCode.UNKNOWN_ERROR);
        }
    })();

    await test('服务层 - 验证错误应该正确处理', async () => {
        try {
            await userService.getUserById(0);
            throw new Error('应该抛出异常');
        } catch (error) {
            assertInstanceOf(error, ValidationError);
            assertEqual(error.message, '用户ID不能为空');
        }
    })();

    // 3. 测试性能监控装饰器
    await test('性能监控 - 应该正常执行并记录时间', async () => {
        const user = await userService.createUser({ username: 'testuser' });
        assert(user.id > 0, '应该返回有效的用户ID');
        assertEqual(user.username, 'testuser');
    })();

    // 4. 测试参数验证装饰器
    await test('参数验证 - 有效参数应该正常执行', async () => {
        const user = await userService.getUserByEmail('test@example.com');
        assertEqual(user.email, 'test@example.com');
    })();

    await test('参数验证 - 无效参数应该抛出验证错误', async () => {
        try {
            await userService.getUserByEmail('invalid-email');
            throw new Error('应该抛出异常');
        } catch (error) {
            assertInstanceOf(error, BusinessError);
            assertEqual(error.code, ErrorCode.VALIDATION_ERROR);
        }
    })();

    // 5. 测试重试装饰器
    await test('重试机制 - 应该重试并最终成功', async () => {
        userService.resetAttempts();
        const result = await userService.unstableOperation();
        assertEqual(result, 'success');
    })();

    // 6. 测试控制器装饰器
    const controller = new TestUserController();

    await test('控制器 - 成功执行应该设置响应', async () => {
        const ctx = {
            params: { id: '123' },
            body: null,
        };

        await controller.getUser(ctx);
        assert(ctx.body !== null, '应该设置响应体');
        assert(ctx.body.success === true, '应该返回成功状态');
        assertEqual(ctx.body.data.id, 123);
    })();

    await test('控制器 - 错误应该重新抛出', async () => {
        const ctx = {
            params: { id: '999' },
            body: null,
            method: 'GET',
            url: '/users/999',
            query: {},
            request: { body: {} },
            ip: '127.0.0.1',
            get: () => 'test-agent',
            state: { user: { id: 1 } },
        };

        try {
            await controller.getUser(ctx);
            throw new Error('应该抛出异常');
        } catch (error) {
            assertInstanceOf(error, UserError);
        }
    })();

    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log('================');

    const passed = testResults.filter((r) => r.passed).length;
    const total = testResults.length;

    console.log(`✅ 通过: ${passed}/${total}`);
    console.log(`❌ 失败: ${total - passed}/${total}`);

    if (total - passed > 0) {
        console.log('\n失败的测试:');
        testResults
            .filter((r) => !r.passed)
            .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log(`\n整体通过率: ${Math.round((passed / total) * 100)}%`);

    if (passed === total) {
        console.log('\n🎉 所有测试通过！错误处理系统工作正常。');
    } else {
        console.log('\n⚠️  部分测试失败，请检查错误处理系统。');
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    runTests().catch((error) => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}

export { runTests };
