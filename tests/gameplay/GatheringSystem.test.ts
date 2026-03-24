/**
 * 采集系统单元测试
 */

import {
    GatheringSystem,
    GatheringSpotState,
    GatheringEvents,
    GatheringStartedPayload,
    GatheringCompletedPayload,
    GatheringSpot
} from '../../src/gameplay/GatheringSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem } from '../../src/data/BackpackSystem';
import { StaminaSystem } from '../../src/resource/StaminaSystem';
import { TimeSystem, Season, Period } from '../../src/core/TimeSystem';
import { MaterialSystem } from '../../src/data/MaterialSystem';

// 测试用采集点数据
const createTestSpots = (): GatheringSpot[] => [
    {
        id: 'bamboo_forest',
        name: '竹林',
        locationId: 'village_east',
        materials: [
            {
                materialId: 'bamboo_leaf',
                weight: 60,
                minAmount: 1,
                maxAmount: 3,
                seasonRestriction: [],
                timeRestriction: []
            },
            {
                materialId: 'bamboo_shoot',
                weight: 30,
                minAmount: 1,
                maxAmount: 2,
                seasonRestriction: [Season.SPRING],
                timeRestriction: []
            },
            {
                materialId: 'rare_bamboo_fungus',
                weight: 10,
                minAmount: 1,
                maxAmount: 1,
                seasonRestriction: [],
                timeRestriction: [Period.MORNING]
            }
        ],
        cooldown: 60,
        staminaCost: 5,
        unlockCondition: '初始解锁'
    },
    {
        id: 'mountain_path',
        name: '山间小道',
        locationId: 'village_north',
        materials: [
            {
                materialId: 'stone',
                weight: 70,
                minAmount: 1,
                maxAmount: 5,
                seasonRestriction: [],
                timeRestriction: []
            },
            {
                materialId: 'legendary_jade',
                weight: 5,
                minAmount: 1,
                maxAmount: 1,
                seasonRestriction: [],
                timeRestriction: []
            }
        ],
        cooldown: 180,
        staminaCost: 8,
        unlockCondition: '完成探索任务'
    }
];

describe('GatheringSystem', () => {
    let gatheringSystem: GatheringSystem;
    let eventSystem: EventSystem;
    let backpackSystem: BackpackSystem;
    let staminaSystem: StaminaSystem;

    beforeEach(() => {
        // 重置所有系统
        GatheringSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        StaminaSystem.resetInstance();
        TimeSystem.resetInstance();
        MaterialSystem.resetInstance();

        gatheringSystem = GatheringSystem.getInstance();
        eventSystem = EventSystem.getInstance();
        backpackSystem = BackpackSystem.getInstance();
        staminaSystem = StaminaSystem.getInstance();
        // 初始化 TimeSystem 以确保季节/时段功能正常
        TimeSystem.getInstance();
    });

    describe('注册采集点', () => {
        test('应该正确注册单个采集点', () => {
            const spots = createTestSpots();
            gatheringSystem.registerSpot(spots[0]);

            expect(gatheringSystem.getSpot('bamboo_forest')).not.toBeNull();
            expect(gatheringSystem.getAllSpots().length).toBe(1);
        });

        test('应该正确批量注册采集点', () => {
            gatheringSystem.registerSpots(createTestSpots());

            expect(gatheringSystem.getAllSpots().length).toBe(2);
        });

        test('重复注册应该被忽略', () => {
            const spots = createTestSpots();
            gatheringSystem.registerSpot(spots[0]);
            gatheringSystem.registerSpot(spots[0]);

            expect(gatheringSystem.getAllSpots().length).toBe(1);
        });
    });

    describe('采集点状态', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
        });

        test('未解锁的采集点应该是 LOCKED 状态', () => {
            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.LOCKED
            );
        });

        test('解锁后应该是 AVAILABLE 状态', () => {
            gatheringSystem.unlockSpot('bamboo_forest');

            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.AVAILABLE
            );
        });

        test('采集后应该是 COOLDOWN 状态', () => {
            gatheringSystem.unlockSpot('bamboo_forest');
            gatheringSystem.gather('bamboo_forest');

            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.COOLDOWN
            );
        });

        test('冷却结束后应该恢复为 AVAILABLE', () => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
            gatheringSystem.gather('bamboo_forest');

            // 强制重置冷却
            gatheringSystem.forceResetCooldown('bamboo_forest');

            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.AVAILABLE
            );
        });
    });

    describe('采集流程', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
        });

        test('应该成功采集', () => {
            const result = gatheringSystem.gather('bamboo_forest');

            expect(result.success).toBe(true);
            expect(result.materials.length).toBeGreaterThan(0);
            expect(result.staminaConsumed).toBe(5);
        });

        test('应该添加材料到背包', () => {
            gatheringSystem.gather('bamboo_forest');

            // 检查背包中有材料
            const hasItems =
                backpackSystem.hasItem('bamboo_leaf', 1) ||
                backpackSystem.hasItem('bamboo_shoot', 1) ||
                backpackSystem.hasItem('rare_bamboo_fungus', 1);

            expect(hasItems).toBe(true);
        });

        test('应该消耗体力', () => {
            const initialStamina = staminaSystem.getCurrentStamina();
            gatheringSystem.gather('bamboo_forest');

            expect(staminaSystem.getCurrentStamina()).toBe(initialStamina - 5);
        });

        test('体力不足时应该失败', () => {
            // 消耗所有体力
            staminaSystem.consumeStamina(100);

            const result = gatheringSystem.gather('bamboo_forest');

            expect(result.success).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_STAMINA');
        });

        test('冷却中时应该失败', () => {
            gatheringSystem.gather('bamboo_forest');
            const result = gatheringSystem.gather('bamboo_forest');

            expect(result.success).toBe(false);
            expect(result.reason).toBe('ON_COOLDOWN');
        });

        test('未解锁时应该失败', () => {
            const result = gatheringSystem.gather('mountain_path');

            expect(result.success).toBe(false);
            expect(result.reason).toBe('LOCKED');
        });
    });

    describe('事件发布', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
        });

        test('应该发布 gathering:started 事件', () => {
            const handler = jest.fn();
            eventSystem.on<GatheringStartedPayload>(GatheringEvents.STARTED, handler);

            gatheringSystem.gather('bamboo_forest');

            expect(handler).toHaveBeenCalledWith({
                spotId: 'bamboo_forest',
                locationId: 'village_east'
            });
        });

        test('应该发布 gathering:completed 事件', () => {
            const handler = jest.fn();
            eventSystem.on<GatheringCompletedPayload>(GatheringEvents.COMPLETED, handler);

            gatheringSystem.gather('bamboo_forest');

            expect(handler).toHaveBeenCalled();
            const payload = handler.mock.calls[0][0];
            expect(payload.spotId).toBe('bamboo_forest');
            expect(payload.materials.length).toBeGreaterThan(0);
        });
    });

    describe('查询功能', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
        });

        test('getRemainingCooldown 应该返回正确的冷却时间', () => {
            gatheringSystem.unlockSpot('bamboo_forest');
            gatheringSystem.gather('bamboo_forest');

            const remaining = gatheringSystem.getRemainingCooldown('bamboo_forest');

            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(60);
        });

        test('isAvailable 应该返回正确的状态', () => {
            expect(gatheringSystem.isAvailable('bamboo_forest')).toBe(false);

            gatheringSystem.unlockSpot('bamboo_forest');
            expect(gatheringSystem.isAvailable('bamboo_forest')).toBe(true);
        });

        test('getSpotsByLocation 应该返回正确的采集点', () => {
            const spots = gatheringSystem.getSpotsByLocation('village_east');

            expect(spots.length).toBe(1);
            expect(spots[0].id).toBe('bamboo_forest');
        });

        test('不存在的地点应该返回空数组', () => {
            const spots = gatheringSystem.getSpotsByLocation('nonexistent');

            expect(spots).toEqual([]);
        });
    });

    describe('forceResetCooldown', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
        });

        test('应该重置冷却', () => {
            gatheringSystem.gather('bamboo_forest');
            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.COOLDOWN
            );

            gatheringSystem.forceResetCooldown('bamboo_forest');

            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.AVAILABLE
            );
        });
    });

    describe('exportData / importData', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
            gatheringSystem.gather('bamboo_forest');
        });

        test('应该正确导出和导入数据', () => {
            const data = gatheringSystem.exportData();

            GatheringSystem.resetInstance();
            const newSystem = GatheringSystem.getInstance();
            newSystem.registerSpots(createTestSpots());
            newSystem.importData(data);
            newSystem.unlockSpot('bamboo_forest');

            // 冷却状态应该被保留
            expect(newSystem.getRemainingCooldown('bamboo_forest')).toBeGreaterThan(0);
        });
    });

    describe('reset', () => {
        beforeEach(() => {
            gatheringSystem.registerSpots(createTestSpots());
            gatheringSystem.unlockSpot('bamboo_forest');
            gatheringSystem.gather('bamboo_forest');
        });

        test('应该重置所有状态', () => {
            gatheringSystem.reset();

            expect(gatheringSystem.getSpotState('bamboo_forest')).toBe(
                GatheringSpotState.LOCKED
            );
            expect(gatheringSystem.getRemainingCooldown('bamboo_forest')).toBe(0);
        });
    });
});
