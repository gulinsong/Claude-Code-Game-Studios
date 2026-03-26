/**
 * AchievementSystem 单元测试
 */

import {
    AchievementSystem,
    AchievementCategory,
    AchievementRarity,
    AchievementConditionType,
    AchievementEvents,
    AchievementDefinition,
    createBasicAchievements
} from '../../src/gameplay/AchievementSystem';
import { EventSystem } from '../../src/core/EventSystem';

// 创建测试成就
const createTestAchievement = (id: string = 'test-achievement'): AchievementDefinition => ({
    id,
    name: '测试成就',
    description: '用于测试的成就',
    category: AchievementCategory.GATHERING,
    rarity: AchievementRarity.COMMON,
    condition: { type: AchievementConditionType.GATHER, count: 10 },
    points: 10
});

describe('AchievementSystem', () => {
    let achievementSystem: AchievementSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        AchievementSystem.resetInstance();
        EventSystem.resetInstance();

        achievementSystem = AchievementSystem.getInstance();
        eventSystem = EventSystem.getInstance();
    });

    afterEach(() => {
        eventSystem.clearAll();
    });

    describe('成就注册', () => {
        it('应该能注册成就', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            const retrieved = achievementSystem.getAchievement(achievement.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('测试成就');
        });

        it('重复注册相同 ID 应该被忽略', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);
            achievementSystem.registerAchievement(achievement);

            const all = achievementSystem.getAllAchievements();
            expect(all.length).toBe(1);
        });

        it('应该能批量注册成就', () => {
            const achievements = [
                createTestAchievement('ach-1'),
                createTestAchievement('ach-2'),
                createTestAchievement('ach-3')
            ];

            achievementSystem.registerAchievements(achievements);

            expect(achievementSystem.getAllAchievements().length).toBe(3);
        });

        it('应该根据稀有度设置默认点数', () => {
            const common = createTestAchievement('common');
            common.rarity = AchievementRarity.COMMON;
            delete common.points;

            const rare = createTestAchievement('rare');
            rare.rarity = AchievementRarity.RARE;
            delete rare.points;

            achievementSystem.registerAchievements([common, rare]);

            const commonAch = achievementSystem.getAchievement('common');
            const rareAch = achievementSystem.getAchievement('rare');

            expect(commonAch?.points).toBe(10);
            expect(rareAch?.points).toBe(25);
        });
    });

    describe('进度更新', () => {
        it('更新进度应该增加计数器', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);

            const progress = achievementSystem.getProgress(achievement.id);
            expect(progress?.current).toBe(1);
        });

        it('更新进度应该发布 PROGRESS_UPDATED 事件', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            const handler = jest.fn();
            eventSystem.on(AchievementEvents.PROGRESS_UPDATED, handler);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                achievementId: achievement.id,
                current: 1
            }));
        });

        it('达到目标应该完成成就', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            expect(achievementSystem.isCompleted(achievement.id)).toBe(true);
        });

        it('完成成就应该发布 ACHIEVEMENT_UNLOCKED 事件', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            const handler = jest.fn();
            eventSystem.on(AchievementEvents.ACHIEVEMENT_UNLOCKED, handler);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                achievementId: achievement.id
            }));
        });

        it('已完成成就不应该重复更新', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            const handler = jest.fn();
            eventSystem.on(AchievementEvents.ACHIEVEMENT_UNLOCKED, handler);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);
            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('setProgress 应该设置精确值', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.setProgress(AchievementConditionType.GATHER, 5);

            const progress = achievementSystem.getProgress(achievement.id);
            expect(progress?.current).toBe(5);
        });
    });

    describe('前置条件', () => {
        it('满足前置条件后应该能完成成就', () => {
            const prerequisite = createTestAchievement('prereq');
            prerequisite.condition.count = 1;

            const achievement = createTestAchievement('main');
            achievement.prerequisites = ['prereq'];
            achievement.condition.count = 1;

            achievementSystem.registerAchievements([prerequisite, achievement]);

            // 先完成前置
            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);
            expect(achievementSystem.isCompleted('prereq')).toBe(true);

            // 再次更新完成 main (计数器已经到 2，满足 main 的 count=1)
            expect(achievementSystem.isCompleted('main')).toBe(true);
        });
    });

    describe('奖励领取', () => {
        it('未完成的成就不应该能领取奖励', () => {
            const achievement = createTestAchievement();
            achievement.reward = { type: 'coins', amount: 100 };
            achievementSystem.registerAchievement(achievement);

            const reward = achievementSystem.claimReward(achievement.id);

            expect(reward).toBeNull();
        });

        it('完成的成就应该能领取奖励', () => {
            const achievement = createTestAchievement();
            achievement.reward = { type: 'coins', amount: 100 };
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);
            const reward = achievementSystem.claimReward(achievement.id);

            expect(reward).toEqual({ type: 'coins', amount: 100 });
        });

        it('已领取的奖励不应该重复领取', () => {
            const achievement = createTestAchievement();
            achievement.reward = { type: 'coins', amount: 100 };
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);
            achievementSystem.claimReward(achievement.id);
            const reward2 = achievementSystem.claimReward(achievement.id);

            expect(reward2).toBeNull();
        });

        it('领取奖励应该发布 REWARD_CLAIMED 事件', () => {
            const achievement = createTestAchievement();
            achievement.reward = { type: 'coins', amount: 100 };
            achievementSystem.registerAchievement(achievement);

            const handler = jest.fn();
            eventSystem.on(AchievementEvents.REWARD_CLAIMED, handler);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);
            achievementSystem.claimReward(achievement.id);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('状态查询', () => {
        it('getCompletionPercentage 应该返回正确百分比', () => {
            // 使用不同条件类型的成就，避免同时完成
            const gatherAchievement = createTestAchievement('ach-1');
            gatherAchievement.condition = { type: AchievementConditionType.GATHER, count: 1 };

            const craftAchievement = createTestAchievement('ach-2');
            craftAchievement.condition = { type: AchievementConditionType.CRAFT, count: 1 };

            achievementSystem.registerAchievements([gatherAchievement, craftAchievement]);

            expect(achievementSystem.getCompletionPercentage()).toBe(0);

            // 只完成采集成就
            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);

            expect(achievementSystem.getCompletionPercentage()).toBe(50);
        });

        it('getPointsProgress 应该返回正确点数', () => {
            const achievement = createTestAchievement();
            achievement.points = 10;
            achievementSystem.registerAchievement(achievement);

            const { earned, total } = achievementSystem.getPointsProgress();

            expect(earned).toBe(0);
            expect(total).toBe(10);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            const { earned: newEarned } = achievementSystem.getPointsProgress();
            expect(newEarned).toBe(10);
        });

        it('getUnclaimedRewards 应该返回未领取的奖励', () => {
            const achievement = createTestAchievement();
            achievement.reward = { type: 'coins', amount: 100 };
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            const unclaimed = achievementSystem.getUnclaimedRewards();
            expect(unclaimed.length).toBe(1);

            achievementSystem.claimReward(achievement.id);

            const unclaimed2 = achievementSystem.getUnclaimedRewards();
            expect(unclaimed2.length).toBe(0);
        });

        it('getCompletedAchievements 应该返回已完成的成就', () => {
            const achievements = [
                createTestAchievement('ach-1'),
                createTestAchievement('ach-2')
            ];
            achievements[0].condition.count = 1;
            achievements[1].condition.count = 100;

            achievementSystem.registerAchievements(achievements);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);

            const completed = achievementSystem.getCompletedAchievements();
            expect(completed.length).toBe(1);
            expect(completed[0].id).toBe('ach-1');
        });

        it('getInProgressAchievements 应该返回进行中的成就', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 5);

            const inProgress = achievementSystem.getInProgressAchievements();
            expect(inProgress.length).toBe(1);
            expect(inProgress[0].progress.current).toBe(5);
        });
    });

    describe('隐藏成就', () => {
        it('隐藏成就未完成时不应该出现在可见列表', () => {
            const achievement = createTestAchievement();
            achievement.hidden = true;
            achievementSystem.registerAchievement(achievement);

            const visible = achievementSystem.getVisibleAchievements();
            expect(visible.length).toBe(0);
        });

        it('隐藏成就完成后应该可见', () => {
            const achievement = createTestAchievement();
            achievement.hidden = true;
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            const visible = achievementSystem.getVisibleAchievements();
            expect(visible.length).toBe(1);
        });
    });

    describe('分类查询', () => {
        it('getAchievementsByCategory 应该返回正确分类的成就', () => {
            const gathering = createTestAchievement('gathering');
            gathering.category = AchievementCategory.GATHERING;

            const crafting = createTestAchievement('crafting');
            crafting.category = AchievementCategory.CRAFTING;

            achievementSystem.registerAchievements([gathering, crafting]);

            const gatheringAchs = achievementSystem.getAchievementsByCategory(AchievementCategory.GATHERING);

            expect(gatheringAchs.length).toBe(1);
            expect(gatheringAchs[0].id).toBe('gathering');
        });
    });

    describe('存档功能', () => {
        it('应该能导出和导入数据', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 5);

            const data = achievementSystem.exportData();
            expect(data.progress[achievement.id].current).toBe(5);

            // 重置并导入
            achievementSystem.reset();
            achievementSystem.registerAchievement(achievement);
            achievementSystem.importData(data);

            const progress = achievementSystem.getProgress(achievement.id);
            expect(progress?.current).toBe(5);
        });

        it('reset 应该清除所有进度', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 10);

            achievementSystem.reset();

            expect(achievementSystem.isCompleted(achievement.id)).toBe(false);
            expect(achievementSystem.getPointsProgress().earned).toBe(0);
        });
    });

    describe('手动解锁', () => {
        it('unlockAchievement 应该手动解锁成就', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            const result = achievementSystem.unlockAchievement(achievement.id);

            expect(result).toBe(true);
            expect(achievementSystem.isCompleted(achievement.id)).toBe(true);
        });

        it('解锁不存在的成就应该返回 false', () => {
            const result = achievementSystem.unlockAchievement('non-existent');

            expect(result).toBe(false);
        });

        it('重复解锁应该返回 false', () => {
            const achievement = createTestAchievement();
            achievementSystem.registerAchievement(achievement);

            achievementSystem.unlockAchievement(achievement.id);
            const result = achievementSystem.unlockAchievement(achievement.id);

            expect(result).toBe(false);
        });
    });

    describe('全部完成', () => {
        it('全部完成应该发布 ALL_COMPLETED 事件', () => {
            const achievement = createTestAchievement();
            achievement.condition.count = 1;
            achievementSystem.registerAchievement(achievement);

            const handler = jest.fn();
            eventSystem.on(AchievementEvents.ALL_COMPLETED, handler);

            achievementSystem.updateProgress(AchievementConditionType.GATHER, 1);

            expect(handler).toHaveBeenCalled();
        });
    });
});

describe('createBasicAchievements', () => {
    it('应该返回基础成就列表', () => {
        const achievements = createBasicAchievements();

        expect(achievements.length).toBeGreaterThan(0);
        expect(achievements.find(a => a.id === 'first-harvest')).toBeDefined();
        expect(achievements.find(a => a.id === 'first-craft')).toBeDefined();
        expect(achievements.find(a => a.id === 'first-gift')).toBeDefined();
        expect(achievements.find(a => a.id === 'first-festival')).toBeDefined();
    });

    it('成就应该有正确的分类', () => {
        const achievements = createBasicAchievements();

        const gathering = achievements.filter(a => a.category === AchievementCategory.GATHERING);
        const crafting = achievements.filter(a => a.category === AchievementCategory.CRAFTING);
        const villager = achievements.filter(a => a.category === AchievementCategory.VILLAGER);
        const festival = achievements.filter(a => a.category === AchievementCategory.FESTIVAL);

        expect(gathering.length).toBeGreaterThan(0);
        expect(crafting.length).toBeGreaterThan(0);
        expect(villager.length).toBeGreaterThan(0);
        expect(festival.length).toBeGreaterThan(0);
    });

    it('成就应该有前置条件', () => {
        const achievements = createBasicAchievements();

        const expertGathering = achievements.find(a => a.id === 'gatherer-expert');
        expect(expertGathering?.prerequisites).toContain('gatherer-novice');

        const masterGathering = achievements.find(a => a.id === 'gatherer-master');
        expect(masterGathering?.prerequisites).toContain('gatherer-expert');
    });

    it('隐藏成就应该正确标记', () => {
        const achievements = createBasicAchievements();

        const hidden = achievements.filter(a => a.hidden);
        expect(hidden.length).toBeGreaterThan(0);

        // 检查隐藏成就存在
        expect(hidden.length).toBeGreaterThan(0);
    });

    it('传说成就应该有高点数', () => {
        const achievements = createBasicAchievements();

        const legendary = achievements.filter(a => a.rarity === AchievementRarity.LEGENDARY);
        legendary.forEach(a => {
            expect(a.points).toBeGreaterThanOrEqual(75);
        });
    });
});
