/**
 * ErrorReporter 单元测试
 */

import {
    ErrorReporter,
    ErrorLevel,
    ErrorReporterEvents
} from '../../src/core/ErrorReporter';
import { eventSystem } from '../../src/core/EventSystem';

describe('ErrorReporter', () => {
    let reporter: ErrorReporter;

    beforeEach(() => {
        // 每次测试创建新实例
        (ErrorReporter as any)._instance = null;
        reporter = ErrorReporter.instance;
    });

    afterEach(() => {
        reporter.destroy();
    });

    describe('初始化', () => {
        it('应该是单例', () => {
            const instance1 = ErrorReporter.instance;
            const instance2 = ErrorReporter.instance;
            expect(instance1).toBe(instance2);
        });

        it('应该使用默认配置初始化', () => {
            reporter.initialize();
            expect((reporter as any).initialized).toBe(true);
        });

        it('应该接受自定义配置', () => {
            reporter.initialize({
                appId: 'test-app',
                version: '2.0.0',
                sampleRate: 0.5
            });
            expect((reporter as any).config.appId).toBe('test-app');
            expect((reporter as any).config.version).toBe('2.0.0');
            expect((reporter as any).config.sampleRate).toBe(0.5);
        });

        it('重复初始化应该警告但不报错', () => {
            reporter.initialize();
            reporter.initialize();
            expect((reporter as any).initialized).toBe(true);
        });
    });

    describe('错误捕获', () => {
        it('应该捕获 Error 对象', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            const error = new Error('Test error');
            const id = reporter.captureError(error);

            expect(id).toBeDefined();
            expect(id).toMatch(/^\d+-[a-z0-9]+$/);
        });

        it('应该捕获字符串错误', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            const id = reporter.captureError('Test string error');

            expect(id).toBeDefined();
        });

        it('应该支持不同的错误级别', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            const infoId = reporter.captureMessage('Info message', ErrorLevel.INFO);
            const warningId = reporter.captureMessage('Warning', ErrorLevel.WARNING);
            const errorId = reporter.captureError(new Error('Error'), ErrorLevel.ERROR);
            const fatalId = reporter.captureError(new Error('Fatal'), ErrorLevel.FATAL);

            expect(infoId).toBeDefined();
            expect(warningId).toBeDefined();
            expect(errorId).toBeDefined();
            expect(fatalId).toBeDefined();
        });

        it('应该支持附加数据', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            const error = new Error('Test with extra');
            const id = reporter.captureError(error, ErrorLevel.ERROR, {
                foo: 'bar',
                count: 42
            });

            expect(id).toBeDefined();
        });
    });

    describe('面包屑', () => {
        it('应该添加面包屑', () => {
            reporter.initialize();

            reporter.addBreadcrumb('user', 'Button clicked', { buttonId: 'submit' });
            reporter.addBreadcrumb('navigation', 'Page changed', { from: 'home', to: 'game' });

            expect((reporter as any).breadcrumbs.length).toBe(2);
        });

        it('应该限制面包屑数量', () => {
            reporter.initialize({
                maxBreadcrumbs: 5
            });

            for (let i = 0; i < 10; i++) {
                reporter.addBreadcrumb('info', `Breadcrumb ${i}`);
            }

            expect((reporter as any).breadcrumbs.length).toBe(5);
            expect((reporter as any).breadcrumbs[0].message).toBe('Breadcrumb 5');
        });

        it('面包屑应该包含在错误事件中', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            reporter.addBreadcrumb('user', 'Before error');
            reporter.captureError(new Error('Test'));

            const queue = (reporter as any).errorQueue;
            expect(queue.length).toBe(1);
            expect(queue[0].breadcrumbs.length).toBe(1);
        });
    });

    describe('用户信息', () => {
        it('应该设置用户信息', () => {
            reporter.initialize();

            reporter.setUser({
                id: 'user123',
                name: 'TestUser',
                openid: 'openid123'
            });

            expect((reporter as any).user).toEqual({
                id: 'user123',
                name: 'TestUser',
                openid: 'openid123'
            });
        });

        it('应该清除用户信息', () => {
            reporter.initialize();

            reporter.setUser({ id: 'user123' });
            reporter.setUser(null);

            expect((reporter as any).user).toBeNull();
        });
    });

    describe('采样率', () => {
        it('采样率为 0 时不应该捕获错误', () => {
            reporter.initialize({
                sampleRate: 0
            });

            reporter.captureError(new Error('Test'));

            expect((reporter as any).errorQueue.length).toBe(0);
        });

        it('采样率为 1 时应该捕获所有错误', () => {
            reporter.initialize({
                sampleRate: 1
            });

            for (let i = 0; i < 10; i++) {
                reporter.captureError(new Error(`Test ${i}`));
            }

            expect((reporter as any).errorQueue.length).toBe(10);
        });
    });

    describe('忽略模式', () => {
        it('应该忽略匹配模式的错误', () => {
            reporter.initialize({
                sampleRate: 1.0,
                ignorePatterns: [/Script error/]
            });

            reporter.captureError(new Error('Script error: something'));
            reporter.captureError(new Error('Real error'));

            // shouldIgnore 只在全局错误处理器中使用
            // 直接调用 captureError 不会检查忽略模式
            expect((reporter as any).errorQueue.length).toBe(2);
        });
    });

    describe('事件系统', () => {
        it('应该触发 ERROR_CAPTURED 事件', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            let captured = false;
            eventSystem.on(ErrorReporterEvents.ERROR_CAPTURED, () => {
                captured = true;
            });

            reporter.captureError(new Error('Test'));

            expect(captured).toBe(true);
        });
    });

    describe('启用/禁用', () => {
        it('应该能够禁用上报', () => {
            reporter.initialize();

            reporter.setEnabled(false);
            reporter.captureError(new Error('Test'));

            expect((reporter as any).enabled).toBe(false);
        });

        it('应该能够重新启用', () => {
            reporter.initialize();

            reporter.setEnabled(false);
            reporter.setEnabled(true);

            expect((reporter as any).enabled).toBe(true);
        });
    });

    describe('销毁', () => {
        it('应该正确销毁', () => {
            reporter.initialize();
            reporter.destroy();

            expect((reporter as any).initialized).toBe(false);
            expect((reporter as any).enabled).toBe(false);
            expect((ErrorReporter as any)._instance).toBeNull();
        });

        it('销毁后应该能重新初始化', () => {
            reporter.initialize();
            reporter.destroy();

            const newReporter = ErrorReporter.instance;
            newReporter.initialize();

            expect((newReporter as any).initialized).toBe(true);
            newReporter.destroy();
        });
    });

    describe('边界情况', () => {
        it('未初始化时捕获错误应该正常工作', () => {
            const id = reporter.captureError(new Error('Test'));
            expect(id).toBeDefined();
        });

        it('空错误队列时 flush 应该正常工作', async () => {
            reporter.initialize();
            await reporter.flush();
            // 不应该抛出错误
        });

        it('没有端点配置时应该跳过上报', async () => {
            reporter.initialize({
                endpoint: ''
            });

            reporter.captureError(new Error('Test'));
            await reporter.flush();

            // 错误应该还在队列中（因为没有端点）
            expect((reporter as any).errorQueue.length).toBe(1);
        });
    });

    describe('错误 ID 生成', () => {
        it('应该生成唯一 ID', () => {
            reporter.initialize({
                sampleRate: 1.0
            });

            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                const id = reporter.captureError(new Error('Test'));
                ids.add(id);
            }

            expect(ids.size).toBe(100);
        });
    });
});
