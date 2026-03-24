/**
 * 体力系统单元测试
 */

import {
    StaminaSystem,
    StaminaState,
    StaminaEvents,
    StaminaChangedPayload,
    StaminaExhaustedPayload,
    StaminaFullPayload,
    StaminaLowPayload,
    StaminaRestoredPayload
} from '../../src/resource/StaminaSystem';
import { EventSystem } from '../../src/core/EventSystem';

describe('StaminaSystem', () => {
    let staminaSystem: StaminaSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        StaminaSystem.resetInstance();
        EventSystem.resetInstance();
        staminaSystem = StaminaSystem.getInstance();
        eventSystem = EventSystem.getInstance();
        staminaSystem.reset();
    });

    describe('初始化', () => {
        test('应该有默认的初始体力', () => {
            expect(staminaSystem.getCurrentStamina()).toBe(100);
            expect(staminaSystem.getMaxStamina()).toBe(100);
        });

        test('体力百分比应该是 1', () => {
            expect(staminaSystem.getStaminaPercent()).toBe(1);
        });

        test('初始状态应该是 FULL', () => {
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.FULL);
        });
    });

    describe('consumeStamina', () => {
        test('应该正确消耗体力', () => {
            const result = staminaSystem.consumeStamina(10);

            expect(result.success).toBe(true);
            expect(result.previous).toBe(100);
            expect(result.current).toBe(90);
            expect(result.consumed).toBe(10);
            expect(staminaSystem.getCurrentStamina()).toBe(90);
        });

        test('体力不足时应该失败', () => {
            const result = staminaSystem.consumeStamina(150);

            expect(result.success).toBe(false);
            expect(result.consumed).toBe(0);
            expect(staminaSystem.getCurrentStamina()).toBe(100);
        });

        test('负数消耗应该被拒绝', () => {
            const result = staminaSystem.consumeStamina(-10);

            expect(result.success).toBe(false);
            expect(result.consumed).toBe(0);
            expect(staminaSystem.getCurrentStamina()).toBe(100);
        });

        test('零消耗应该被拒绝', () => {
            const result = staminaSystem.consumeStamina(0);

            expect(result.success).toBe(false);
            expect(result.consumed).toBe(0);
        });

        test('应该发布 stamina:changed 事件', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaChangedPayload>(StaminaEvents.CHANGED, handler);

            staminaSystem.consumeStamina(10);

            expect(handler).toHaveBeenCalledWith({
                old: 100,
                new: 90,
                delta: -10
            });
        });

        test('体力耗尽时应该发布 stamina:exhausted 事件', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaExhaustedPayload>(StaminaEvents.EXHAUSTED, handler);

            staminaSystem.consumeStamina(100);

            expect(handler).toHaveBeenCalledWith({
                current: 0
            });
        });

        test('体力低于阈值时应该发布 stamina:low 事件', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaLowPayload>(StaminaEvents.LOW, handler);

            // 消耗到 15 点（低于 20%）
            staminaSystem.consumeStamina(85);

            expect(handler).toHaveBeenCalledWith({
                current: 15,
                threshold: 20
            });
        });
    });

    describe('restoreStamina', () => {
        beforeEach(() => {
            staminaSystem.consumeStamina(50); // 降到 50
        });

        test('应该正确恢复体力', () => {
            const result = staminaSystem.restoreStamina(20, 'food');

            expect(result.previous).toBe(50);
            expect(result.current).toBe(70);
            expect(result.restored).toBe(20);
            expect(result.overflow).toBe(0);
            expect(staminaSystem.getCurrentStamina()).toBe(70);
        });

        test('恢复时应该发布 stamina:restored 事件', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaRestoredPayload>(StaminaEvents.RESTORED, handler);

            staminaSystem.restoreStamina(20, 'food');

            expect(handler).toHaveBeenCalledWith({
                amount: 20,
                source: 'food'
            });
        });

        test('恢复超过上限应该被截断', () => {
            const result = staminaSystem.restoreStamina(100, 'food');

            expect(result.current).toBe(100);
            expect(result.restored).toBe(50);
            expect(result.overflow).toBe(50);
        });

        test('恢复满时应该发布 stamina:full 事件', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaFullPayload>(StaminaEvents.FULL, handler);

            staminaSystem.restoreStamina(50, 'food');

            expect(handler).toHaveBeenCalledWith({
                current: 100
            });
        });

        test('负数恢复应该被拒绝', () => {
            const result = staminaSystem.restoreStamina(-10, 'invalid');

            expect(result.restored).toBe(0);
            expect(result.overflow).toBe(0);
            expect(staminaSystem.getCurrentStamina()).toBe(50);
        });

        test('已满时恢复应该返回 overflow', () => {
            // 先恢复到满
            staminaSystem.restoreStamina(50, 'food');

            const result = staminaSystem.restoreStamina(10, 'food');

            expect(result.restored).toBe(0);
            expect(result.overflow).toBe(10);
        });
    });

    describe('getStaminaState', () => {
        test('满体力应该是 FULL', () => {
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.FULL);
        });

        test('正常体力应该是 NORMAL', () => {
            staminaSystem.consumeStamina(30); // 70
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.NORMAL);
        });

        test('低体力应该是 LOW', () => {
            staminaSystem.consumeStamina(85); // 15
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.LOW);
        });

        test('体力耗尽应该是 EXHAUSTED', () => {
            staminaSystem.consumeStamina(100);
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.EXHAUSTED);
        });

        test('边界值：刚好 20% 应该是 LOW', () => {
            staminaSystem.consumeStamina(80); // 20
            expect(staminaSystem.getStaminaState()).toBe(StaminaState.LOW);
        });
    });

    describe('hasEnoughStamina', () => {
        test('有足够体力时返回 true', () => {
            expect(staminaSystem.hasEnoughStamina(50)).toBe(true);
            expect(staminaSystem.hasEnoughStamina(100)).toBe(true);
        });

        test('体力不足时返回 false', () => {
            expect(staminaSystem.hasEnoughStamina(101)).toBe(false);
            expect(staminaSystem.hasEnoughStamina(200)).toBe(false);
        });
    });

    describe('getTimeToFull', () => {
        test('满体力时返回 0', () => {
            expect(staminaSystem.getTimeToFull()).toBe(0);
        });

        test('应该正确计算完全恢复时间', () => {
            staminaSystem.consumeStamina(40); // 60
            // 需要 40 点，每点 3 分钟 = 120 分钟
            expect(staminaSystem.getTimeToFull()).toBe(120);
        });

        test('体力耗尽时应该返回正确的恢复时间', () => {
            staminaSystem.consumeStamina(100);
            // 需要 100 点，每点 3 分钟 = 300 分钟
            expect(staminaSystem.getTimeToFull()).toBe(300);
        });
    });

    describe('expandMaxStamina', () => {
        test('应该正确扩展体力上限', () => {
            const result = staminaSystem.expandMaxStamina(20);

            expect(result).toBe(true);
            expect(staminaSystem.getMaxStamina()).toBe(120);
            // 当前体力不变
            expect(staminaSystem.getCurrentStamina()).toBe(100);
        });

        test('超过上限时应该失败', () => {
            const result = staminaSystem.expandMaxStamina(100); // 100 + 100 = 200 > 150

            expect(result).toBe(false);
            expect(staminaSystem.getMaxStamina()).toBe(100);
        });

        test('负数扩展应该被拒绝', () => {
            const result = staminaSystem.expandMaxStamina(-10);

            expect(result).toBe(false);
            expect(staminaSystem.getMaxStamina()).toBe(100);
        });
    });

    describe('updateOfflineRecovery', () => {
        test('应该计算离线恢复', () => {
            staminaSystem.consumeStamina(60); // 40
            const data = staminaSystem.exportData();

            // 模拟离线 30 分钟
            data.lastUpdateTime = Date.now() - 30 * 60 * 1000;
            staminaSystem.importData(data);

            staminaSystem.updateOfflineRecovery();

            // 30 分钟 / 3 分钟每点 = 10 点恢复
            expect(staminaSystem.getCurrentStamina()).toBe(50);
        });

        test('离线恢复不应该超过上限', () => {
            staminaSystem.consumeStamina(10); // 90
            const data = staminaSystem.exportData();

            // 模拟离线 5 小时（300分钟）
            data.lastUpdateTime = Date.now() - 300 * 60 * 1000;
            staminaSystem.importData(data);

            staminaSystem.updateOfflineRecovery();

            // 最多恢复到 100
            expect(staminaSystem.getCurrentStamina()).toBe(100);
        });

        test('满体力时离线恢复不做任何事', () => {
            const before = staminaSystem.getCurrentStamina();
            staminaSystem.updateOfflineRecovery();
            expect(staminaSystem.getCurrentStamina()).toBe(before);
        });
    });

    describe('dailyReset', () => {
        test('应该恢复到满体力', () => {
            staminaSystem.consumeStamina(50);
            staminaSystem.dailyReset();

            expect(staminaSystem.getCurrentStamina()).toBe(100);
        });

        test('满体力时重置不做任何事', () => {
            const handler = jest.fn();
            eventSystem.on<StaminaChangedPayload>(StaminaEvents.CHANGED, handler);

            staminaSystem.dailyReset();

            // 不应该发布变化事件
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('exportData / importData', () => {
        test('应该正确导出和导入数据', () => {
            staminaSystem.consumeStamina(30);
            staminaSystem.expandMaxStamina(20);

            const data = staminaSystem.exportData();
            expect(data.current).toBe(70);
            expect(data.max).toBe(120);

            StaminaSystem.resetInstance();
            const newSystem = StaminaSystem.getInstance();
            newSystem.importData(data);

            expect(newSystem.getCurrentStamina()).toBe(70);
            expect(newSystem.getMaxStamina()).toBe(120);
        });

        test('导入时应该截断超出上限的体力', () => {
            const data = {
                current: 200,
                max: 200,
                lastUpdateTime: Date.now()
            };

            staminaSystem.importData(data);

            // 最大上限是 150
            expect(staminaSystem.getMaxStamina()).toBe(150);
            expect(staminaSystem.getCurrentStamina()).toBe(150);
        });

        test('导入时应该截断负数体力', () => {
            const data = {
                current: -10,
                max: 100,
                lastUpdateTime: Date.now()
            };

            staminaSystem.importData(data);

            expect(staminaSystem.getCurrentStamina()).toBe(0);
        });
    });

    describe('reset', () => {
        test('应该重置到初始状态', () => {
            staminaSystem.consumeStamina(50);
            staminaSystem.expandMaxStamina(20);

            staminaSystem.reset();

            expect(staminaSystem.getCurrentStamina()).toBe(100);
            expect(staminaSystem.getMaxStamina()).toBe(100);
        });
    });
});
