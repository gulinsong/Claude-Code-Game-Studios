/**
 * QuestSystem 单元测试
 */

import {
    QuestSystem,
    QuestType,
    QuestState,
    ObjectiveType,
    RewardType,
    QuestEvents,
    Quest,
    IRewardExecutor
} from '../../src/gameplay/QuestSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem, ItemType } from '../../src/data/BackpackSystem';
import { RecipeSystem } from '../../src/data/RecipeSystem';
import { MaterialSystem, MaterialType, MaterialRarity } from '../../src/data/MaterialSystem';

// 测试用任务
const createTestQuest = (id: string, options: Partial<Quest> = {}): Quest => ({
    id,
    title: `测试任务 ${id}`,
    description: '测试任务描述',
    type: QuestType.MAIN,
    objectives: [
        { type: ObjectiveType.COLLECT, targetId: 'bamboo', requiredAmount: 5 }
    ],
    rewards: [
        { type: RewardType.ITEM, itemId: 'coin', amount: 100 }
    ],
    prerequisites: [],
    timeLimit: 0,
    npcId: 'npc_test',
    repeatable: false,
    ...options
});

// 带前置任务的任务
const createQuestWithPrereq = (): Quest => ({
    id: 'quest_with_prereq',
    title: '需要前置的任务',
    description: '需要完成前置任务',
    type: QuestType.MAIN,
    objectives: [
        { type: ObjectiveType.TALK, targetId: 'npc_elder', requiredAmount: 1 }
    ],
    rewards: [],
    prerequisites: ['quest_prereq'],
    timeLimit: 0,
    npcId: 'npc_test',
    repeatable: false
});

// 多目标任务
const createMultiObjectiveQuest = (): Quest => ({
    id: 'quest_multi',
    title: '多目标任务',
    description: '有多个目标的任务',
    type: QuestType.VILLAGER,
    objectives: [
        { type: ObjectiveType.COLLECT, targetId: 'bamboo', requiredAmount: 3 },
        { type: ObjectiveType.CRAFT, targetId: 'mooncake', requiredAmount: 2 },
        { type: ObjectiveType.TALK, targetId: 'npc_grandma', requiredAmount: 1 }
    ],
    rewards: [
        { type: RewardType.ITEM, itemId: 'coin', amount: 50 },
        { type: RewardType.FRIENDSHIP, npcId: 'npc_grandma', amount: 10 }
    ],
    prerequisites: [],
    timeLimit: 0,
    npcId: 'npc_test',
    repeatable: false
});

// 时间限制任务
const createTimedQuest = (): Quest => ({
    id: 'quest_timed',
    title: '限时任务',
    description: '有时间限制的任务',
    type: QuestType.DAILY,
    objectives: [
        { type: ObjectiveType.COLLECT, targetId: 'flower', requiredAmount: 1 }
    ],
    rewards: [],
    prerequisites: [],
    timeLimit: 3600, // 1小时
    npcId: 'npc_test',
    repeatable: true
});

// 可重复任务
const createRepeatableQuest = (): Quest => ({
    id: 'quest_repeatable',
    title: '可重复任务',
    description: '可以重复完成的任务',
    type: QuestType.DAILY,
    objectives: [
        { type: ObjectiveType.COLLECT, targetId: 'herb', requiredAmount: 3 }
    ],
    rewards: [
        { type: RewardType.ITEM, itemId: 'coin', amount: 20 }
    ],
    prerequisites: [],
    timeLimit: 0,
    npcId: 'npc_test',
    repeatable: true
});

// Mock 奖励执行器
const createMockRewardExecutor = (): IRewardExecutor => ({
    changeFriendship: jest.fn(),
    unlockArea: jest.fn()
});

describe('QuestSystem', () => {
    let questSystem: QuestSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        // 重置所有单例
        QuestSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        RecipeSystem.resetInstance();
        MaterialSystem.resetInstance();

        questSystem = QuestSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 注册测试材料
        const materialSystem = MaterialSystem.getInstance();
        materialSystem.initialize([
            { id: 'bamboo', name: '竹子', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'flower', name: '花朵', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'herb', name: '草药', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'coin', name: '金币', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 999, icon: '', sellPrice: 1, sources: [] }
        ]);
    });

    describe('任务注册', () => {
        it('应该成功注册任务', () => {
            const quest = createTestQuest('test_1');
            questSystem.registerQuest(quest);

            expect(questSystem.getQuest('test_1')).toEqual(quest);
        });

        it('重复注册同一任务应该警告', () => {
            const quest = createTestQuest('test_1');
            questSystem.registerQuest(quest);

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            questSystem.registerQuest(quest);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该批量注册任务', () => {
            const quests = [
                createTestQuest('q1'),
                createTestQuest('q2')
            ];
            questSystem.registerQuests(quests);

            expect(questSystem.getQuest('q1')).toBeDefined();
            expect(questSystem.getQuest('q2')).toBeDefined();
        });
    });

    describe('任务接受', () => {
        it('应该成功接受任务', () => {
            questSystem.registerQuest(createTestQuest('test'));

            const result = questSystem.acceptQuest('test');

            expect(result).toBe(true);
            expect(questSystem.getQuestState('test')).toBe(QuestState.IN_PROGRESS);
        });

        it('应该发布 STARTED 事件', () => {
            questSystem.registerQuest(createTestQuest('test'));

            const handler = jest.fn();
            eventSystem.on(QuestEvents.STARTED, handler);

            questSystem.acceptQuest('test');

            expect(handler).toHaveBeenCalledWith({
                questId: 'test',
                questTitle: '测试任务 test'
            });
        });

        it('不存在的任务应该返回 false', () => {
            const result = questSystem.acceptQuest('nonexistent');
            expect(result).toBe(false);
        });

        it('前置任务未完成应该返回 false', () => {
            questSystem.registerQuest(createTestQuest('quest_prereq'));
            questSystem.registerQuest(createQuestWithPrereq());

            const result = questSystem.acceptQuest('quest_with_prereq');
            expect(result).toBe(false);
        });

        it('前置任务完成后应该可以接受', () => {
            questSystem.registerQuest(createTestQuest('quest_prereq'));
            questSystem.registerQuest(createQuestWithPrereq());

            // 完成前置任务
            questSystem.acceptQuest('quest_prereq');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);
            questSystem.claimReward('quest_prereq');

            // 现在可以接受
            const result = questSystem.acceptQuest('quest_with_prereq');
            expect(result).toBe(true);
        });

        it('任务数量达到上限应该返回 false', () => {
            // 注册 10 个任务
            for (let i = 0; i < 12; i++) {
                questSystem.registerQuest(createTestQuest(`quest_${i}`));
            }

            // 接受 10 个任务
            for (let i = 0; i < 10; i++) {
                questSystem.acceptQuest(`quest_${i}`);
            }

            // 第 11 个应该失败
            const check = questSystem.canAcceptQuest('quest_10');
            expect(check.canAccept).toBe(false);
            expect(check.reason).toContain('上限');
        });
    });

    describe('任务放弃', () => {
        it('应该成功放弃任务', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.abandonQuest('test');

            expect(questSystem.getQuestState('test')).toBe(QuestState.AVAILABLE);
        });

        it('应该发布 ABANDONED 事件', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            const handler = jest.fn();
            eventSystem.on(QuestEvents.ABANDONED, handler);

            questSystem.abandonQuest('test');

            expect(handler).toHaveBeenCalledWith({ questId: 'test' });
        });

        it('放弃后可以重新接受', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');
            questSystem.abandonQuest('test');

            const result = questSystem.acceptQuest('test');
            expect(result).toBe(true);
        });
    });

    describe('目标进度', () => {
        it('应该正确更新目标进度', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 3);

            const progress = questSystem.getQuestProgress('test');
            expect(progress?.objectives[0].currentAmount).toBe(3);
        });

        it('应该发布 PROGRESS 事件', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            const handler = jest.fn();
            eventSystem.on(QuestEvents.PROGRESS, handler);

            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 2);

            expect(handler).toHaveBeenCalledWith({
                questId: 'test',
                objectiveIndex: 0,
                current: 2,
                required: 5
            });
        });

        it('进度不应超过目标数量', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 10);

            const progress = questSystem.getQuestProgress('test');
            expect(progress?.objectives[0].currentAmount).toBe(5);
        });

        it('不匹配的目标类型不应更新', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.updateObjective(ObjectiveType.CRAFT, 'bamboo', 3);

            const progress = questSystem.getQuestProgress('test');
            expect(progress?.objectives[0].currentAmount).toBe(0);
        });
    });

    describe('任务完成', () => {
        it('完成所有目标应该自动标记为完成', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            expect(questSystem.getQuestState('test')).toBe(QuestState.COMPLETED);
        });

        it('应该发布 COMPLETED 事件', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            const handler = jest.fn();
            eventSystem.on(QuestEvents.COMPLETED, handler);

            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            expect(handler).toHaveBeenCalledWith({
                questId: 'test',
                questTitle: '测试任务 test'
            });
        });

        it('多目标任务应该全部完成后才完成', () => {
            questSystem.registerQuest(createMultiObjectiveQuest());
            questSystem.acceptQuest('quest_multi');

            // 完成第一个目标
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 3);
            expect(questSystem.getQuestState('quest_multi')).toBe(QuestState.IN_PROGRESS);

            // 完成第二个目标
            questSystem.updateObjective(ObjectiveType.CRAFT, 'mooncake', 2);
            expect(questSystem.getQuestState('quest_multi')).toBe(QuestState.IN_PROGRESS);

            // 完成第三个目标
            questSystem.updateObjective(ObjectiveType.TALK, 'npc_grandma', 1);
            expect(questSystem.getQuestState('quest_multi')).toBe(QuestState.COMPLETED);
        });
    });

    describe('奖励领取', () => {
        it('应该成功领取奖励', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            const rewards = questSystem.claimReward('test');

            expect(rewards.length).toBe(1);
            expect(rewards[0].itemId).toBe('coin');
        });

        it('领取后状态应该是 CLAIMED', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            questSystem.claimReward('test');

            expect(questSystem.getQuestState('test')).toBe(QuestState.CLAIMED);
        });

        it('应该发布 CLAIMED 事件', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            const handler = jest.fn();
            eventSystem.on(QuestEvents.CLAIMED, handler);

            questSystem.claimReward('test');

            expect(handler).toHaveBeenCalled();
        });

        it('物品奖励应该添加到背包', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            const backpack = BackpackSystem.getInstance();
            const beforeCount = backpack.getItemCount('coin');

            questSystem.claimReward('test');

            expect(backpack.getItemCount('coin')).toBe(beforeCount + 100);
        });

        it('好感度奖励应该调用执行器', () => {
            questSystem.registerQuest(createMultiObjectiveQuest());
            questSystem.acceptQuest('quest_multi');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 3);
            questSystem.updateObjective(ObjectiveType.CRAFT, 'mooncake', 2);
            questSystem.updateObjective(ObjectiveType.TALK, 'npc_grandma', 1);

            const mockExecutor = createMockRewardExecutor();
            questSystem.setRewardExecutor(mockExecutor);

            questSystem.claimReward('quest_multi');

            expect(mockExecutor.changeFriendship).toHaveBeenCalledWith('npc_grandma', 10);
        });

        it('未完成的任务不能领取奖励', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            const rewards = questSystem.claimReward('test');

            expect(rewards).toEqual([]);
        });
    });

    describe('状态查询', () => {
        it('getAvailableQuests 应该返回可接受的任务', () => {
            questSystem.registerQuest(createTestQuest('q1'));
            questSystem.registerQuest(createTestQuest('q2'));
            questSystem.acceptQuest('q1'); // q1 进行中

            const available = questSystem.getAvailableQuests();

            expect(available.length).toBe(1);
            expect(available[0].id).toBe('q2');
        });

        it('getActiveQuests 应该返回进行中的任务', () => {
            questSystem.registerQuest(createTestQuest('q1'));
            questSystem.registerQuest(createTestQuest('q2'));
            questSystem.acceptQuest('q1');

            const active = questSystem.getActiveQuests();

            expect(active.length).toBe(1);
            expect(active[0].id).toBe('q1');
        });

        it('getCompletedQuests 应该返回已完成待领取的任务', () => {
            questSystem.registerQuest(createTestQuest('q1'));
            questSystem.acceptQuest('q1');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);

            const completed = questSystem.getCompletedQuests();

            expect(completed.length).toBe(1);
            expect(completed[0].id).toBe('q1');
        });
    });

    describe('前置任务', () => {
        it('前置任务未完成时状态应该是 LOCKED', () => {
            questSystem.registerQuest(createTestQuest('quest_prereq'));
            questSystem.registerQuest(createQuestWithPrereq());

            expect(questSystem.getQuestState('quest_with_prereq')).toBe(QuestState.LOCKED);
        });

        it('arePrerequisitesMet 应该正确检查前置任务', () => {
            questSystem.registerQuest(createTestQuest('quest_prereq'));
            questSystem.registerQuest(createQuestWithPrereq());

            expect(questSystem.arePrerequisitesMet('quest_with_prereq')).toBe(false);

            // 完成前置任务
            questSystem.acceptQuest('quest_prereq');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);
            questSystem.claimReward('quest_prereq');

            expect(questSystem.arePrerequisitesMet('quest_with_prereq')).toBe(true);
        });
    });

    describe('可重复任务', () => {
        it('可重复任务完成后可以再次接受', () => {
            questSystem.registerQuest(createRepeatableQuest());

            // 第一次完成
            questSystem.acceptQuest('quest_repeatable');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'herb', 3);
            questSystem.claimReward('quest_repeatable');

            // 可以再次接受
            expect(questSystem.canAcceptQuest('quest_repeatable').canAccept).toBe(true);
        });

        it('不可重复任务完成后不能再次接受', () => {
            questSystem.registerQuest(createTestQuest('test'));

            // 完成
            questSystem.acceptQuest('test');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);
            questSystem.claimReward('test');

            // 不能再次接受
            expect(questSystem.canAcceptQuest('test').canAccept).toBe(false);
        });
    });

    describe('初始进度检查', () => {
        it('接受任务时应该检查背包中已有物品', () => {
            // 先添加物品到背包
            BackpackSystem.getInstance().addItem('bamboo', ItemType.MATERIAL, 10);

            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            const progress = questSystem.getQuestProgress('test');
            expect(progress?.objectives[0].currentAmount).toBe(5); // max 是 5
        });
    });

    describe('时间限制', () => {
        it('时间限制任务应该设置截止时间', () => {
            questSystem.registerQuest(createTimedQuest());

            const beforeTime = Date.now();
            questSystem.acceptQuest('quest_timed');

            const progress = questSystem.getQuestProgress('quest_timed');
            expect(progress?.deadline).toBeDefined();
            expect(progress?.deadline).toBeGreaterThan(beforeTime);
        });

        it('checkTimeLimits 应该使超时任务失败', () => {
            // 创建一个已经超时的任务（1秒时间限制）
            const timedQuest: Quest = {
                id: 'quest_timed_short',
                title: '短时限任务',
                description: '',
                type: QuestType.DAILY,
                objectives: [
                    { type: ObjectiveType.COLLECT, targetId: 'flower', requiredAmount: 1 }
                ],
                rewards: [],
                prerequisites: [],
                timeLimit: 1, // 1秒
                npcId: 'npc_test',
                repeatable: true
            };

            questSystem.registerQuest(timedQuest);
            questSystem.acceptQuest('quest_timed_short');

            // 等待超时
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    const handler = jest.fn();
                    eventSystem.on(QuestEvents.FAILED, handler);

                    questSystem.checkTimeLimits();

                    expect(handler).toHaveBeenCalledWith({
                        questId: 'quest_timed_short',
                        reason: '任务超时'
                    });
                    expect(questSystem.getQuestState('quest_timed_short')).toBe(QuestState.FAILED);
                    resolve();
                }, 1100);
            });
        });
    });

    describe('存档功能', () => {
        it('应该正确导出和导入数据', () => {
            questSystem.registerQuest(createTestQuest('q1'));
            questSystem.registerQuest(createTestQuest('q2'));

            questSystem.acceptQuest('q1');
            questSystem.updateObjective(ObjectiveType.COLLECT, 'bamboo', 5);
            questSystem.claimReward('q1');

            const data = questSystem.exportData();

            // 重置
            QuestSystem.resetInstance();
            questSystem = QuestSystem.getInstance();

            // 重新注册任务
            questSystem.registerQuest(createTestQuest('q1'));
            questSystem.registerQuest(createTestQuest('q2'));

            // 导入
            questSystem.importData(data);

            expect(questSystem.arePrerequisitesMet('q1')).toBe(true); // 已完成
            expect(questSystem.getQuestState('q2')).toBe(QuestState.AVAILABLE);
        });

        it('reset 应该重置所有状态', () => {
            questSystem.registerQuest(createTestQuest('test'));
            questSystem.acceptQuest('test');

            questSystem.reset();

            expect(questSystem.getActiveQuests()).toEqual([]);
        });
    });
});
