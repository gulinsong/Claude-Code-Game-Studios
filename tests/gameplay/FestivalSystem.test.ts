/**
 * FestivalSystem 单元测试
 */

import {
    FestivalSystem,
    Season,
    FestivalPhase,
    FestivalTaskType,
    RewardTier,
    FestivalEvents,
    FestivalDefinition,
    ITimeProvider
} from '../../src/gameplay/FestivalSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem, ItemType } from '../../src/data/BackpackSystem';
import { MaterialSystem, MaterialType, MaterialRarity } from '../../src/data/MaterialSystem';

// 中秋节定义
const createMidAutumnFestival = (): FestivalDefinition => ({
    id: 'mid_autumn',
    name: '中秋节',
    season: Season.AUTUMN,
    gameDay: 21, // 秋季第21天
    prepDays: 3,
    description: '月圆人团圆',
    lore: '中秋佳节，家人团聚',
    tasks: [
        {
            id: 'task_flour',
            description: '收集面粉',
            type: FestivalTaskType.COLLECT,
            target: 'flour',
            requiredAmount: 20,
            contribution: 25
        },
        {
            id: 'task_mooncake',
            description: '制作月饼',
            type: FestivalTaskType.CRAFT,
            target: 'mooncake',
            requiredAmount: 10,
            contribution: 35
        },
        {
            id: 'task_lantern',
            description: '挂灯笼',
            type: FestivalTaskType.DECORATE,
            target: 'lantern',
            requiredAmount: 5,
            contribution: 20
        },
        {
            id: 'task_riddle',
            description: '猜灯谜',
            type: FestivalTaskType.PARTICIPATE,
            target: 'riddle_game',
            requiredAmount: 3,
            contribution: 20
        }
    ],
    rewards: {
        [RewardTier.BASIC]: [
            { type: 'CURRENCY', id: 'coin', amount: 100 }
        ],
        [RewardTier.GOOD]: [
            { type: 'CURRENCY', id: 'coin', amount: 150 },
            { type: 'RECIPE', id: 'special_mooncake', amount: 1 }
        ],
        [RewardTier.PERFECT]: [
            { type: 'CURRENCY', id: 'coin', amount: 200 },
            { type: 'RECIPE', id: 'special_mooncake', amount: 1 },
            { type: 'ITEM', id: 'festival_gift', amount: 1 }
        ]
    }
});

// 春节定义
const createSpringFestival = (): FestivalDefinition => ({
    id: 'spring_festival',
    name: '春节',
    season: Season.WINTER,
    gameDay: 28, // 年末
    prepDays: 3,
    description: '新年快乐',
    lore: '辞旧迎新',
    tasks: [
        {
            id: 'task_dumpling',
            description: '包饺子',
            type: FestivalTaskType.CRAFT,
            target: 'dumpling',
            requiredAmount: 15,
            contribution: 50
        },
        {
            id: 'task_couplet',
            description: '贴春联',
            type: FestivalTaskType.DECORATE,
            target: 'couplet',
            requiredAmount: 3,
            contribution: 50
        }
    ],
    rewards: {
        [RewardTier.BASIC]: [
            { type: 'CURRENCY', id: 'coin', amount: 200 }
        ],
        [RewardTier.GOOD]: [
            { type: 'CURRENCY', id: 'coin', amount: 300 }
        ],
        [RewardTier.PERFECT]: [
            { type: 'CURRENCY', id: 'coin', amount: 400 }
        ]
    }
});

// Mock 时间提供者
const createMockTimeProvider = (gameDay: number, season: Season = Season.AUTUMN): ITimeProvider => ({
    getGameDay: () => gameDay,
    getSeason: () => season
});

describe('FestivalSystem', () => {
    let festivalSystem: FestivalSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        // 重置所有单例
        FestivalSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        MaterialSystem.resetInstance();

        festivalSystem = FestivalSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 注册测试材料
        const materialSystem = MaterialSystem.getInstance();
        materialSystem.initialize([
            { id: 'flour', name: '面粉', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'mooncake', name: '月饼', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 5, sources: [] },
            { id: 'lantern', name: '灯笼', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 3, sources: [] },
            { id: 'festival_gift', name: '节日礼物', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.RARE, maxStack: 99, icon: '', sellPrice: 10, sources: [] }
        ]);
    });

    describe('节日注册', () => {
        it('应该成功注册节日', () => {
            const festival = createMidAutumnFestival();
            festivalSystem.registerFestival(festival);

            expect(festivalSystem.getFestival('mid_autumn')).toEqual(festival);
        });

        it('重复注册同一节日应该警告', () => {
            const festival = createMidAutumnFestival();
            festivalSystem.registerFestival(festival);

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            festivalSystem.registerFestival(festival);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该批量注册节日', () => {
            festivalSystem.registerFestivals([
                createMidAutumnFestival(),
                createSpringFestival()
            ]);

            expect(festivalSystem.getFestival('mid_autumn')).toBeDefined();
            expect(festivalSystem.getFestival('spring_festival')).toBeDefined();
        });
    });

    describe('阶段管理', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
        });

        it('普通日应该是 NORMAL 阶段', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));

            festivalSystem.update();

            expect(festivalSystem.getCurrentPhase()).toBe(FestivalPhase.NORMAL);
        });

        it('准备期应该是 PREPARATION 阶段', () => {
            // 节日是第21天，准备期3天，所以18-20天是准备期
            festivalSystem.setTimeProvider(createMockTimeProvider(18));

            festivalSystem.update();

            expect(festivalSystem.getCurrentPhase()).toBe(FestivalPhase.PREPARATION);
            expect(festivalSystem.getCurrentFestival()?.id).toBe('mid_autumn');
        });

        it('节日当天应该是 CELEBRATION 阶段', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));

            festivalSystem.update();

            expect(festivalSystem.getCurrentPhase()).toBe(FestivalPhase.CELEBRATION);
        });

        it('节日后一天应该是 AFTERGLOW 阶段', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(22));

            festivalSystem.update();

            expect(festivalSystem.getCurrentPhase()).toBe(FestivalPhase.AFTERGLOW);
        });
    });

    describe('阶段转换事件', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
        });

        it('进入准备期应该发布 APPROACHING 事件', () => {
            const handler = jest.fn();
            eventSystem.on(FestivalEvents.APPROACHING, handler);

            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            expect(handler).toHaveBeenCalledWith({
                festivalId: 'mid_autumn',
                festivalName: '中秋节',
                daysUntil: 3
            });
        });

        it('进入庆典日应该发布 STARTED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(FestivalEvents.STARTED, handler);

            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            expect(handler).toHaveBeenCalledWith({
                festivalId: 'mid_autumn',
                festivalName: '中秋节'
            });
        });

        it('节日结束应该发布 ENDED 事件', () => {
            // 先进入庆典日
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            const handler = jest.fn();
            eventSystem.on(FestivalEvents.ENDED, handler);

            // 进入普通日
            festivalSystem.setTimeProvider(createMockTimeProvider(23));
            festivalSystem.update();

            expect(handler).toHaveBeenCalled();
            expect(handler.mock.calls[0][0].festivalId).toBe('mid_autumn');
            expect(handler.mock.calls[0][0].completionRate).toBeDefined();
        });
    });

    describe('任务系统', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flour', ItemType.MATERIAL, 30);
        });

        it('进入准备期应该初始化任务', () => {
            const tasks = festivalSystem.getAllTaskProgress();

            expect(tasks.length).toBe(4);
            expect(tasks[0].currentAmount).toBe(0);
            expect(tasks[0].completed).toBe(false);
        });

        it('提交任务应该增加进度', () => {
            const result = festivalSystem.submitTask('task_flour', 10);

            expect(result.success).toBe(true);

            const progress = festivalSystem.getTaskProgress('task_flour');
            expect(progress?.currentAmount).toBe(10);
        });

        it('提交足够数量应该完成任务', () => {
            const result = festivalSystem.submitTask('task_flour', 20);

            expect(result.success).toBe(true);

            const progress = festivalSystem.getTaskProgress('task_flour');
            expect(progress?.completed).toBe(true);
        });

        it('完成任务应该发布 TASK_COMPLETED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(FestivalEvents.TASK_COMPLETED, handler);

            festivalSystem.submitTask('task_flour', 20);

            expect(handler).toHaveBeenCalledWith({
                festivalId: 'mid_autumn',
                festivalName: '中秋节',
                taskId: 'task_flour',
                contribution: 25
            });
        });

        it('已完成的任务不能再次提交', () => {
            festivalSystem.submitTask('task_flour', 20);
            const result = festivalSystem.submitTask('task_flour', 5);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('已完成');
        });

        it('背包物品不足应该失败', () => {
            const result = festivalSystem.submitTask('task_flour', 50);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('不够');
        });

        it('非准备期不能提交任务', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));
            festivalSystem.update();

            const result = festivalSystem.submitTask('task_flour', 10);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('不是准备期');
        });
    });

    describe('完成度计算', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            BackpackSystem.getInstance().addItem('flour', ItemType.MATERIAL, 30);
        });

        it('没有完成任务应该是 0%', () => {
            expect(festivalSystem.getCompletionRate()).toBe(0);
        });

        it('完成一个任务应该增加完成度', () => {
            festivalSystem.submitTask('task_flour', 20);

            // task_flour 贡献度是 25，总贡献度是 100
            expect(festivalSystem.getCompletionRate()).toBe(25);
        });

        it('完成所有任务应该是 100%', () => {
            festivalSystem.submitTask('task_flour', 20);
            // CRAFT 类型不需要背包物品
            festivalSystem.forceTaskComplete('task_mooncake');
            festivalSystem.forceTaskComplete('task_lantern');
            festivalSystem.forceTaskComplete('task_riddle');

            expect(festivalSystem.getCompletionRate()).toBe(100);
        });
    });

    describe('奖励档次', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flour', ItemType.MATERIAL, 30);
        });

        it('0-49% 应该是 BASIC', () => {
            festivalSystem.submitTask('task_flour', 20); // 25%

            expect(festivalSystem.getRewardTier()).toBe(RewardTier.BASIC);
        });

        it('50-99% 应该是 GOOD', () => {
            festivalSystem.submitTask('task_flour', 20); // 25%
            festivalSystem.forceTaskComplete('task_mooncake'); // +35% = 60%

            expect(festivalSystem.getRewardTier()).toBe(RewardTier.GOOD);
        });

        it('100% 应该是 PERFECT', () => {
            festivalSystem.submitTask('task_flour', 20);
            festivalSystem.forceTaskComplete('task_mooncake');
            festivalSystem.forceTaskComplete('task_lantern');
            festivalSystem.forceTaskComplete('task_riddle');

            expect(festivalSystem.getRewardTier()).toBe(RewardTier.PERFECT);
        });
    });

    describe('奖励领取', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
        });

        it('庆典日可以领取奖励', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            const rewards = festivalSystem.claimRewards();

            expect(rewards.length).toBeGreaterThan(0);
        });

        it('余韵期可以领取奖励', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(22));
            festivalSystem.update();

            const rewards = festivalSystem.claimRewards();

            expect(rewards.length).toBeGreaterThan(0);
        });

        it('普通日不能领取奖励', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));
            festivalSystem.update();

            const rewards = festivalSystem.claimRewards();

            expect(rewards).toEqual([]);
        });

        it('已领取不能重复领取', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            festivalSystem.claimRewards();
            const rewards = festivalSystem.claimRewards();

            expect(rewards).toEqual([]);
        });

        it('领取奖励应该发布 REWARD_CLAIMED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(FestivalEvents.REWARD_CLAIMED, handler);

            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            festivalSystem.claimRewards();

            expect(handler).toHaveBeenCalled();
        });

        it('物品奖励应该添加到背包', () => {
            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flour', ItemType.MATERIAL, 30);

            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            // 完成所有任务获得 PERFECT 档
            festivalSystem.submitTask('task_flour', 20);
            festivalSystem.forceTaskComplete('task_mooncake');
            festivalSystem.forceTaskComplete('task_lantern');
            festivalSystem.forceTaskComplete('task_riddle');

            // 进入庆典日
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            const beforeCount = BackpackSystem.getInstance().getItemCount('festival_gift');

            festivalSystem.claimRewards();

            expect(BackpackSystem.getInstance().getItemCount('festival_gift')).toBe(beforeCount + 1);
        });
    });

    describe('庆典小游戏', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
        });

        it('庆典日可以参与小游戏', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            expect(festivalSystem.canPlayCelebration()).toBe(true);
        });

        it('非庆典日不能参与小游戏', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));
            festivalSystem.update();

            expect(festivalSystem.canPlayCelebration()).toBe(false);
        });

        it('参与小游戏应该返回结果', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            const result = festivalSystem.playCelebrationGame('riddle_game');

            expect(result.success).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(0);
        });

        it('小游戏奖励应该递减', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            const multiplier1 = festivalSystem.getCelebrationMultiplier();
            festivalSystem.playCelebrationGame('riddle_game');
            const multiplier2 = festivalSystem.getCelebrationMultiplier();

            expect(multiplier2).toBeLessThan(multiplier1);
        });

        it('奖励递减不应低于最低值', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(21));
            festivalSystem.update();

            // 多次游玩
            for (let i = 0; i < 20; i++) {
                festivalSystem.playCelebrationGame('riddle_game');
            }

            const multiplier = festivalSystem.getCelebrationMultiplier();
            expect(multiplier).toBeGreaterThanOrEqual(0.3);
        });
    });

    describe('下一节日查询', () => {
        beforeEach(() => {
            festivalSystem.registerFestivals([
                createMidAutumnFestival(), // 第21天
                createSpringFestival()     // 第28天
            ]);
        });

        it('应该返回下一个节日', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));

            const next = festivalSystem.getNextFestival();

            expect(next?.id).toBe('mid_autumn');
        });

        it('应该正确计算距离天数', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(18));

            const days = festivalSystem.getDaysUntilNextFestival();

            expect(days).toBe(3);
        });

        it('年末应该返回第一个节日', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(26));

            const next = festivalSystem.getNextFestival();

            expect(next?.id).toBe('spring_festival');
        });
    });

    describe('存档功能', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createMidAutumnFestival());
        });

        it('应该正确导出和导入数据', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            BackpackSystem.getInstance().addItem('flour', ItemType.MATERIAL, 30);
            festivalSystem.submitTask('task_flour', 20);

            const data = festivalSystem.exportData();

            // 重置
            FestivalSystem.resetInstance();
            festivalSystem = FestivalSystem.getInstance();

            // 重新注册
            festivalSystem.registerFestival(createMidAutumnFestival());

            // 导入
            festivalSystem.importData(data);

            expect(festivalSystem.getCurrentFestival()?.id).toBe('mid_autumn');
            expect(festivalSystem.getTaskProgress('task_flour')?.currentAmount).toBe(20);
        });

        it('reset 应该重置所有状态', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(18));
            festivalSystem.update();

            festivalSystem.reset();

            expect(festivalSystem.getCurrentPhase()).toBe(FestivalPhase.NORMAL);
            expect(festivalSystem.getCurrentFestival()).toBeNull();
        });
    });

    describe('跨年处理', () => {
        beforeEach(() => {
            festivalSystem.registerFestival(createSpringFestival()); // 第28天
        });

        it('跨年时应该正确计算距离天数', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(26));

            const days = festivalSystem.getDaysUntilNextFestival();

            expect(days).toBe(2);
        });

        it('年初应该正确找到节日', () => {
            festivalSystem.setTimeProvider(createMockTimeProvider(1));

            const next = festivalSystem.getNextFestival();

            // 春节是第28天，从第1天看应该还有27天
            expect(next?.id).toBe('spring_festival');
        });
    });
});
