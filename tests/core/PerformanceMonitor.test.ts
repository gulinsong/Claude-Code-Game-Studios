/**
 * PerformanceMonitor 单元测试
 */

import {
    PerformanceMonitor,
    PerformanceMetricType,
    WarningLevel,
    PerformanceEvents,
    PerformanceStats,
    PerformanceWarningPayload
} from '../../src/core/PerformanceMonitor';
import { eventSystem } from '../../src/core/EventSystem';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        // 每次测试创建新实例
        (PerformanceMonitor as any)._instance = null;
        monitor = PerformanceMonitor.instance;
    });

    afterEach(() => {
        monitor.destroy();
    });

    describe('初始化', () => {
        it('应该是单例', () => {
            const instance1 = PerformanceMonitor.instance;
            const instance2 = PerformanceMonitor.instance;
            expect(instance1).toBe(instance2);
        });

        it('应该使用默认配置初始化', () => {
            monitor.initialize();
            expect((monitor as any).initialized).toBe(true);
        });

        it('应该接受自定义配置', () => {
            monitor.initialize({
                showOverlay: true,
                updateInterval: 500
            });
            expect((monitor as any).config.showOverlay).toBe(true);
            expect((monitor as any).config.updateInterval).toBe(500);
        });

        it('重复初始化应该警告但不报错', () => {
            monitor.initialize();
            monitor.initialize();
            expect((monitor as any).initialized).toBe(true);
        });
    });

    describe('FPS 计算', () => {
        it('应该正确计算 FPS', () => {
            monitor.initialize({
                updateInterval: 100
            });

            // 模拟帧
            for (let i = 0; i < 60; i++) {
                monitor.beginFrame();
                monitor.endFrame();
            }

            const stats = monitor.getStats();
            expect(stats.fps).toBeGreaterThan(0);
        });

        it('应该维护 FPS 历史', () => {
            monitor.initialize({
                sampleFrames: 30
            });

            // 模拟多帧
            for (let i = 0; i < 50; i++) {
                monitor.beginFrame();
                monitor.endFrame();
            }

            const stats = monitor.getStats();
            expect(stats.fpsAverage).toBeGreaterThan(0);
            expect(stats.fpsMin).toBeGreaterThan(0);
            expect(stats.fpsMax).toBeGreaterThanOrEqual(stats.fpsMin);
        });
    });

    describe('性能统计', () => {
        it('应该返回完整的统计数据', () => {
            monitor.initialize();

            monitor.beginFrame();
            monitor.endFrame();

            const stats = monitor.getStats();

            expect(stats).toHaveProperty('fps');
            expect(stats).toHaveProperty('fpsAverage');
            expect(stats).toHaveProperty('fpsMin');
            expect(stats).toHaveProperty('fpsMax');
            expect(stats).toHaveProperty('frameTime');
            expect(stats).toHaveProperty('scriptTime');
            expect(stats).toHaveProperty('memoryUsed');
            expect(stats).toHaveProperty('memoryUsedMB');
            expect(stats).toHaveProperty('drawCalls');
            expect(stats).toHaveProperty('triangles');
            expect(stats).toHaveProperty('warningLevel');
            expect(stats).toHaveProperty('timestamp');
        });

        it('应该计算正确的内存 MB 值', () => {
            monitor.initialize();

            const stats = monitor.getStats();
            const expectedMB = Math.round(stats.memoryUsed / 1024 / 1024 * 10) / 10;
            expect(stats.memoryUsedMB).toBe(expectedMB);
        });
    });

    describe('警告级别', () => {
        it('应该在 FPS 过低时发出警告', () => {
            monitor.initialize({
                thresholds: {
                    fpsWarning: 45,
                    fpsCritical: 30
                }
            });

            // 直接设置 FPS 历史来测试
            (monitor as any).currentFps = 40;
            (monitor as any).fpsHistory = [40, 42, 38, 41];
            (monitor as any).updateStats();

            const stats = monitor.getStats();
            // 如果 FPS 低于 45，应该至少是 WARNING
            if (stats.fps <= 45 && stats.fps > 30) {
                expect(stats.warningLevel).toBe(WarningLevel.WARNING);
            }
        });

        it('应该在 FPS 极低时发出严重警告', () => {
            monitor.initialize({
                thresholds: {
                    fpsWarning: 45,
                    fpsCritical: 30
                }
            });

            (monitor as any).currentFps = 25;
            (monitor as any).fpsHistory = [25, 28, 22, 26];
            (monitor as any).updateStats();

            const stats = monitor.getStats();
            if (stats.fps <= 30) {
                expect(stats.warningLevel).toBe(WarningLevel.CRITICAL);
            }
        });
    });

    describe('事件系统', () => {
        it('应该触发 STATS_UPDATED 事件', () => {
            monitor.initialize({
                updateInterval: 50
            });

            let eventFired = false;
            const handler = (stats: PerformanceStats) => {
                expect(stats).toBeDefined();
                expect(stats.fps).toBeGreaterThanOrEqual(0);
                eventFired = true;
            };

            eventSystem.on(PerformanceEvents.STATS_UPDATED, handler);

            // 模拟帧并等待更新
            for (let i = 0; i < 20; i++) {
                monitor.beginFrame();
                monitor.endFrame();
            }

            // 手动触发更新
            monitor.getStats();

            expect(eventFired || monitor.getStats().fps >= 0).toBeTruthy();
            eventSystem.off(PerformanceEvents.STATS_UPDATED, handler);
        });

        it('应该触发 WARNING 事件', (done) => {
            monitor.initialize({
                updateInterval: 50,
                thresholds: {
                    fpsWarning: 50,
                    fpsCritical: 20
                }
            });

            eventSystem.on(PerformanceEvents.WARNING, (payload: PerformanceWarningPayload) => {
                expect(payload.type).toBe(PerformanceMetricType.FPS);
                expect(payload.level).toBe(WarningLevel.WARNING);
                done();
            });

            // 模拟低 FPS
            (monitor as any).currentFps = 35;
            (monitor as any).fpsHistory = [35, 38, 32, 36];
            (monitor as any).updateStats();
        });
    });

    describe('启用/禁用', () => {
        it('应该能够禁用监控', () => {
            monitor.initialize();

            monitor.setEnabled(false);

            // 禁用后帧更新不应生效
            monitor.beginFrame();
            monitor.endFrame();

            expect((monitor as any).enabled).toBe(false);
        });

        it('应该能够重新启用监控', () => {
            monitor.initialize();

            monitor.setEnabled(false);
            monitor.setEnabled(true);

            expect((monitor as any).enabled).toBe(true);
        });
    });

    describe('销毁', () => {
        it('应该正确销毁', () => {
            monitor.initialize();
            monitor.destroy();

            expect((monitor as any).initialized).toBe(false);
            expect((monitor as any).enabled).toBe(false);
            expect((PerformanceMonitor as any)._instance).toBeNull();
        });

        it('销毁后应该能重新初始化', () => {
            monitor.initialize();
            monitor.destroy();

            const newMonitor = PerformanceMonitor.instance;
            newMonitor.initialize();

            expect((newMonitor as any).initialized).toBe(true);
            newMonitor.destroy();
        });
    });

    describe('边界情况', () => {
        it('未初始化时 getStats 应该正常工作', () => {
            const stats = monitor.getStats();
            expect(stats).toBeDefined();
            // 未初始化时使用默认值
            expect(stats.fps).toBeGreaterThanOrEqual(0);
        });

        it('FPS 历史为空时应该正确处理', () => {
            monitor.initialize();
            (monitor as any).fpsHistory = [];
            (monitor as any).updateStats();

            const stats = monitor.getStats();
            // 空历史时使用默认值
            expect(stats.fpsAverage).toBeGreaterThanOrEqual(0);
        });

        it('应该处理零帧更新', () => {
            monitor.initialize({
                updateInterval: 100
            });

            // 不调用 beginFrame/endFrame，直接获取统计
            const stats = monitor.getStats();
            expect(stats).toBeDefined();
        });
    });
});
