/**
 * VillagerSystem 单元测试
 */

import {
    VillagerSystem,
    Personality,
    GiftReaction,
    RelationshipStatus,
    VillagerEvents,
    Villager,
    ITimeProvider,
    IFestivalProvider
} from '../../src/gameplay/VillagerSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem, ItemType } from '../../src/data/BackpackSystem';
import { MaterialSystem, MaterialType, MaterialRarity } from '../../src/data/MaterialSystem';

// 测试用村民
const createTestVillager = (id: string, options: Partial<Villager> = {}): Villager => ({
    id,
    name: `测试村民 ${id}`,
    avatar: `avatars/${id}.png`,
    personality: Personality.GENTLE,
    likes: ['flower'],
    dislikes: ['rock'],
    location: 'village_square',
    schedule: [],
    ...options
});

// 喜欢花朵的村民
const createFlowerLover = (): Villager => createTestVillager('flower_lover', {
    name: '花婆婆',
    personality: Personality.GENTLE,
    likes: ['flower', 'rose', 'lily'],
    dislikes: ['rock', 'trash']
});

// 不喜欢石头的村民
const createRockHater = (): Villager => createTestVillager('rock_hater', {
    name: '石匠',
    personality: Personality.TRADITIONAL,
    likes: ['tool', 'gem'],
    dislikes: ['rock', 'stone']
});

// Mock 时间提供者
const createMockTimeProvider = (gameDay: number = 1, isFestival: boolean = false): ITimeProvider => ({
    getGameDay: () => gameDay,
    isFestivalDay: () => isFestival
});

// Mock 节日提供者
const createMockFestivalProvider = (isFestival: boolean = false): IFestivalProvider => ({
    isFestivalToday: () => isFestival
});

describe('VillagerSystem', () => {
    let villagerSystem: VillagerSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        // 重置所有单例
        VillagerSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        MaterialSystem.resetInstance();

        villagerSystem = VillagerSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 注册测试材料
        const materialSystem = MaterialSystem.getInstance();
        materialSystem.initialize([
            { id: 'flower', name: '花朵', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'rock', name: '石头', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'apple', name: '苹果', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'rose', name: '玫瑰', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
            { id: 'gem', name: '宝石', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.RARE, maxStack: 99, icon: '', sellPrice: 10, sources: [] }
        ]);
    });

    describe('村民注册', () => {
        it('应该成功注册村民', () => {
            const villager = createTestVillager('test_1');
            villagerSystem.registerVillager(villager);

            expect(villagerSystem.getVillager('test_1')).toEqual(villager);
        });

        it('重复注册同一村民应该警告', () => {
            const villager = createTestVillager('test_1');
            villagerSystem.registerVillager(villager);

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            villagerSystem.registerVillager(villager);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('应该批量注册村民', () => {
            const villagers = [
                createTestVillager('v1'),
                createTestVillager('v2')
            ];
            villagerSystem.registerVillagers(villagers);

            expect(villagerSystem.getVillager('v1')).toBeDefined();
            expect(villagerSystem.getVillager('v2')).toBeDefined();
        });
    });

    describe('首次见面', () => {
        it('应该成功首次见面', () => {
            villagerSystem.registerVillager(createFlowerLover());

            const result = villagerSystem.meetVillager('flower_lover');

            expect(result).toBe(true);
            expect(villagerSystem.hasMet('flower_lover')).toBe(true);
        });

        it('应该发布 MET 事件', () => {
            villagerSystem.registerVillager(createFlowerLover());

            const handler = jest.fn();
            eventSystem.on(VillagerEvents.MET, handler);

            villagerSystem.meetVillager('flower_lover');

            expect(handler).toHaveBeenCalledWith({
                npcId: 'flower_lover',
                npcName: '花婆婆'
            });
        });

        it('重复见面应该返回 false', () => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');

            const result = villagerSystem.meetVillager('flower_lover');

            expect(result).toBe(false);
        });

        it('不存在的村民应该返回 false', () => {
            const result = villagerSystem.meetVillager('nonexistent');
            expect(result).toBe(false);
        });

        it('初始好感度应该为 0', () => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');

            expect(villagerSystem.getFriendship('flower_lover')).toBe(0);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(1);
        });
    });

    describe('好感度操作', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
        });

        it('应该正确增加好感度', () => {
            villagerSystem.changeFriendship('flower_lover', 10);

            expect(villagerSystem.getFriendship('flower_lover')).toBe(10);
        });

        it('应该发布 FRIENDSHIP_CHANGED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(VillagerEvents.FRIENDSHIP_CHANGED, handler);

            villagerSystem.changeFriendship('flower_lover', 10);

            expect(handler).toHaveBeenCalledWith({
                npcId: 'flower_lover',
                oldFriendship: 0,
                newFriendship: 10,
                delta: 10
            });
        });

        it('好感度不应超过最大值', () => {
            villagerSystem.changeFriendship('flower_lover', 150);

            expect(villagerSystem.getFriendship('flower_lover')).toBe(100);
        });

        it('好感度不应低于 0', () => {
            villagerSystem.changeFriendship('flower_lover', -50);

            expect(villagerSystem.getFriendship('flower_lover')).toBe(0);
        });

        it('未认识的村民改变好感度应该返回 false', () => {
            const result = villagerSystem.changeFriendship('unknown', 10);
            expect(result).toBe(false);
        });
    });

    describe('关系等级', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
        });

        it('好感度 0-19 应该是等级 1', () => {
            villagerSystem.changeFriendship('flower_lover', 0);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(1);

            villagerSystem.changeFriendship('flower_lover', 15);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(1);
        });

        it('好感度 20-39 应该是等级 2', () => {
            villagerSystem.changeFriendship('flower_lover', 20);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(2);
        });

        it('好感度 35 应该是等级 2', () => {
            villagerSystem.changeFriendship('flower_lover', 35);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(2);
        });

        it('好感度 40-69 应该是等级 3', () => {
            villagerSystem.changeFriendship('flower_lover', 40);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(3);
        });

        it('好感度 65 应该是等级 3', () => {
            villagerSystem.changeFriendship('flower_lover', 65);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(3);
        });

        it('好感度 70-99 应该是等级 4', () => {
            villagerSystem.changeFriendship('flower_lover', 70);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(4);
        });

        it('好感度 95 应该是等级 4', () => {
            villagerSystem.changeFriendship('flower_lover', 95);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(4);
        });

        it('好感度 100 应该是等级 5', () => {
            villagerSystem.changeFriendship('flower_lover', 100);
            expect(villagerSystem.getFriendshipLevel('flower_lover')).toBe(5);
        });

        it('升级应该发布 LEVEL_UP 事件', () => {
            const handler = jest.fn();
            eventSystem.on(VillagerEvents.LEVEL_UP, handler);

            villagerSystem.changeFriendship('flower_lover', 20);

            expect(handler).toHaveBeenCalledWith({
                npcId: 'flower_lover',
                npcName: '花婆婆',
                oldLevel: 1,
                newLevel: 2
            });
        });

        it('达到等级 5 应该发布 MAX_LEVEL 事件', () => {
            const handler = jest.fn();
            eventSystem.on(VillagerEvents.MAX_LEVEL, handler);

            villagerSystem.changeFriendship('flower_lover', 100);

            expect(handler).toHaveBeenCalledWith({
                npcId: 'flower_lover',
                npcName: '花婆婆'
            });
        });
    });

    describe('关系状态', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
        });

        it('未见面应该是 UNMET', () => {
            expect(villagerSystem.getRelationshipStatus('flower_lover')).toBe(RelationshipStatus.UNMET);
        });

        it('已认识但等级 < 4 应该是 ACQUAINTED', () => {
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 30);

            expect(villagerSystem.getRelationshipStatus('flower_lover')).toBe(RelationshipStatus.ACQUAINTED);
        });

        it('等级 4 应该是 FRIEND', () => {
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 70);

            expect(villagerSystem.getRelationshipStatus('flower_lover')).toBe(RelationshipStatus.FRIEND);
        });

        it('等级 5 应该是 CLOSE_FRIEND', () => {
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 100);

            expect(villagerSystem.getRelationshipStatus('flower_lover')).toBe(RelationshipStatus.CLOSE_FRIEND);
        });
    });

    describe('送礼', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flower', ItemType.MATERIAL, 10);
            BackpackSystem.getInstance().addItem('rock', ItemType.MATERIAL, 10);
            BackpackSystem.getInstance().addItem('apple', ItemType.MATERIAL, 10);
        });

        it('送喜欢的物品应该增加 10 好感度', () => {
            const result = villagerSystem.sendGift('flower_lover', 'flower');

            expect(result.success).toBe(true);
            expect(result.reaction).toBe(GiftReaction.LIKE);
            expect(result.friendshipDelta).toBe(10);
            expect(villagerSystem.getFriendship('flower_lover')).toBe(10);
        });

        it('送普通的物品应该增加 5 好感度', () => {
            const result = villagerSystem.sendGift('flower_lover', 'apple');

            expect(result.success).toBe(true);
            expect(result.reaction).toBe(GiftReaction.NORMAL);
            expect(result.friendshipDelta).toBe(5);
            expect(villagerSystem.getFriendship('flower_lover')).toBe(5);
        });

        it('送不喜欢的物品应该增加 1 好感度', () => {
            const result = villagerSystem.sendGift('flower_lover', 'rock');

            expect(result.success).toBe(true);
            expect(result.reaction).toBe(GiftReaction.DISLIKE);
            expect(result.friendshipDelta).toBe(1);
            expect(villagerSystem.getFriendship('flower_lover')).toBe(1);
        });

        it('送礼应该消耗物品', () => {
            const beforeCount = BackpackSystem.getInstance().getItemCount('flower');

            villagerSystem.sendGift('flower_lover', 'flower');

            expect(BackpackSystem.getInstance().getItemCount('flower')).toBe(beforeCount - 1);
        });

        it('应该发布 GIFT_SENT 事件', () => {
            const handler = jest.fn();
            eventSystem.on(VillagerEvents.GIFT_SENT, handler);

            villagerSystem.sendGift('flower_lover', 'flower');

            expect(handler).toHaveBeenCalledWith({
                npcId: 'flower_lover',
                npcName: '花婆婆',
                itemId: 'flower',
                reaction: GiftReaction.LIKE,
                friendshipDelta: 10
            });
        });

        it('背包没有物品应该失败', () => {
            const result = villagerSystem.sendGift('flower_lover', 'gem');

            expect(result.success).toBe(false);
            expect(result.reason).toContain('没有');
        });

        it('未认识的村民不能送礼', () => {
            villagerSystem.registerVillager(createTestVillager('stranger'));
            const result = villagerSystem.sendGift('stranger', 'flower');

            expect(result.success).toBe(false);
            expect(result.reason).toContain('未认识');
        });
    });

    describe('每日送礼限制', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.setTimeProvider(createMockTimeProvider(1));

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flower', ItemType.MATERIAL, 10);
        });

        it('同一天只能送一次礼', () => {
            const result1 = villagerSystem.sendGift('flower_lover', 'flower');
            expect(result1.success).toBe(true);

            const result2 = villagerSystem.sendGift('flower_lover', 'flower');
            expect(result2.success).toBe(false);
            expect(result2.reason).toContain('已经');
        });

        it('第二天应该可以再次送礼', () => {
            // 第一天送礼
            villagerSystem.sendGift('flower_lover', 'flower');

            // 切换到第二天
            villagerSystem.setTimeProvider(createMockTimeProvider(2));
            villagerSystem.checkDailyReset();

            // 检查是否可以送礼
            const canSend = villagerSystem.canSendGift('flower_lover');
            expect(canSend.canSend).toBe(true);
        });

        it('canSendGift 应该正确返回状态', () => {
            const canSend1 = villagerSystem.canSendGift('flower_lover');
            expect(canSend1.canSend).toBe(true);

            villagerSystem.sendGift('flower_lover', 'flower');

            const canSend2 = villagerSystem.canSendGift('flower_lover');
            expect(canSend2.canSend).toBe(false);
            expect(canSend2.reason).toContain('已经');
        });
    });

    describe('节日加成', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.setFestivalProvider(createMockFestivalProvider(true));

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flower', ItemType.MATERIAL, 10);
        });

        it('节日送礼应该翻倍', () => {
            const result = villagerSystem.sendGift('flower_lover', 'flower');

            expect(result.success).toBe(true);
            expect(result.friendshipDelta).toBe(20); // 10 * 2
        });

        it('节日送普通物品也应该翻倍', () => {
            BackpackSystem.getInstance().addItem('apple', ItemType.MATERIAL, 10);

            const result = villagerSystem.sendGift('flower_lover', 'apple');

            expect(result.success).toBe(true);
            expect(result.friendshipDelta).toBe(10); // 5 * 2
        });
    });

    describe('查询方法', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.registerVillager(createRockHater());
        });

        it('getMetVillagers 应该返回已认识的村民', () => {
            villagerSystem.meetVillager('flower_lover');

            const met = villagerSystem.getMetVillagers();

            expect(met.length).toBe(1);
            expect(met[0].id).toBe('flower_lover');
        });

        it('getAllVillagers 应该返回所有村民', () => {
            const all = villagerSystem.getAllVillagers();

            expect(all.length).toBe(2);
        });

        it('hasMet 应该正确返回认识状态', () => {
            expect(villagerSystem.hasMet('flower_lover')).toBe(false);

            villagerSystem.meetVillager('flower_lover');

            expect(villagerSystem.hasMet('flower_lover')).toBe(true);
        });
    });

    describe('送礼反应判断', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
        });

        it('getGiftReaction 应该正确判断喜欢的物品', () => {
            expect(villagerSystem.getGiftReaction('flower_lover', 'flower')).toBe(GiftReaction.LIKE);
            expect(villagerSystem.getGiftReaction('flower_lover', 'rose')).toBe(GiftReaction.LIKE);
        });

        it('getGiftReaction 应该正确判断不喜欢的物品', () => {
            expect(villagerSystem.getGiftReaction('flower_lover', 'rock')).toBe(GiftReaction.DISLIKE);
        });

        it('getGiftReaction 应该正确判断普通的物品', () => {
            expect(villagerSystem.getGiftReaction('flower_lover', 'apple')).toBe(GiftReaction.NORMAL);
        });
    });

    describe('等级名称', () => {
        it('应该返回正确的等级名称', () => {
            expect(villagerSystem.getLevelName(1)).toBe('陌生人');
            expect(villagerSystem.getLevelName(2)).toBe('认识');
            expect(villagerSystem.getLevelName(3)).toBe('熟人');
            expect(villagerSystem.getLevelName(4)).toBe('朋友');
            expect(villagerSystem.getLevelName(5)).toBe('好友');
        });

        it('无效等级应该返回未知', () => {
            expect(villagerSystem.getLevelName(0)).toBe('未知');
            expect(villagerSystem.getLevelName(6)).toBe('未知');
        });
    });

    describe('存档功能', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.registerVillager(createRockHater());
        });

        it('应该正确导出和导入数据', () => {
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 50);

            const data = villagerSystem.exportData();

            // 重置
            VillagerSystem.resetInstance();
            villagerSystem = VillagerSystem.getInstance();

            // 重新注册
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.registerVillager(createRockHater());

            // 导入
            villagerSystem.importData(data);

            expect(villagerSystem.getFriendship('flower_lover')).toBe(50);
            expect(villagerSystem.hasMet('flower_lover')).toBe(true);
            expect(villagerSystem.hasMet('rock_hater')).toBe(false);
        });

        it('reset 应该重置所有状态', () => {
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 50);

            villagerSystem.reset();

            expect(villagerSystem.getMetVillagers()).toEqual([]);
        });

        it('关系数据应该包含 flags', () => {
            villagerSystem.meetVillager('flower_lover');
            const rel = villagerSystem.getRelationship('flower_lover');

            expect(rel).toBeDefined();
            expect(rel?.flags).toBeDefined();
        });
    });

    describe('性格类型', () => {
        it('应该支持所有性格类型', () => {
            expect(Personality.GENTLE).toBe('GENTLE');
            expect(Personality.ENTHUSIASTIC).toBe('ENTHUSIASTIC');
            expect(Personality.INTROVERTED).toBe('INTROVERTED');
            expect(Personality.TRADITIONAL).toBe('TRADITIONAL');
            expect(Personality.PLAYFUL).toBe('PLAYFUL');
        });

        it('村民应该有正确的性格', () => {
            const gentle = createTestVillager('gentle_npc', { personality: Personality.GENTLE });
            const playful = createTestVillager('playful_npc', { personality: Personality.PLAYFUL });

            villagerSystem.registerVillager(gentle);
            villagerSystem.registerVillager(playful);

            expect(villagerSystem.getVillager('gentle_npc')?.personality).toBe(Personality.GENTLE);
            expect(villagerSystem.getVillager('playful_npc')?.personality).toBe(Personality.PLAYFUL);
        });
    });

    describe('好感度已满时送礼', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.changeFriendship('flower_lover', 100);

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flower', ItemType.MATERIAL, 10);
        });

        it('好感度已满时仍可送礼', () => {
            const canSend = villagerSystem.canSendGift('flower_lover');
            expect(canSend.canSend).toBe(true);
        });

        it('送礼成功但好感度不变', () => {
            const result = villagerSystem.sendGift('flower_lover', 'flower');

            expect(result.success).toBe(true);
            expect(villagerSystem.getFriendship('flower_lover')).toBe(100);
        });
    });

    describe('每日重置', () => {
        beforeEach(() => {
            villagerSystem.registerVillager(createFlowerLover());
            villagerSystem.meetVillager('flower_lover');
            villagerSystem.setTimeProvider(createMockTimeProvider(1));

            // 添加物品到背包
            BackpackSystem.getInstance().addItem('flower', ItemType.MATERIAL, 10);
        });

        it('resetDailyGifts 应该重置送礼次数', () => {
            villagerSystem.sendGift('flower_lover', 'flower');
            expect(villagerSystem.canSendGift('flower_lover').canSend).toBe(false);

            villagerSystem.resetDailyGifts();

            expect(villagerSystem.canSendGift('flower_lover').canSend).toBe(true);
        });

        it('checkDailyReset 应该在日期变化时重置', () => {
            villagerSystem.sendGift('flower_lover', 'flower');
            expect(villagerSystem.canSendGift('flower_lover').canSend).toBe(false);

            // 切换到第二天
            villagerSystem.setTimeProvider(createMockTimeProvider(2));
            villagerSystem.checkDailyReset();

            expect(villagerSystem.canSendGift('flower_lover').canSend).toBe(true);
        });
    });
});
