/**
 * CraftingSystem 单元测试
 */

import {
    CraftingSystem,
    CraftingStage,
    Quality,
    MasteryLevel,
    CraftingEvents
} from '../../src/gameplay/CraftingSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem, ItemType } from '../../src/data/BackpackSystem';
import { RecipeSystem, Recipe, RecipeCategory, RecipeRarity } from '../../src/data/RecipeSystem';
import { StaminaSystem } from '../../src/resource/StaminaSystem';
import { MaterialSystem, MaterialData, MaterialType, MaterialRarity } from '../../src/data/MaterialSystem';

// 测试用食谱
const TEST_RECIPE: Recipe = {
    id: 'test_mooncake',
    name: '测试月饼',
    description: '用于测试的月饼',
    lore: '测试用',
    rarity: RecipeRarity.COMMON,
    category: RecipeCategory.FOOD,
    inputs: [
        { materialId: 'flour', amount: 2, optional: false },
        { materialId: 'red_bean', amount: 1, optional: false }
    ],
    output: {
        itemId: 'mooncake',
        itemIdQuality: 'mooncake_quality',
        amount: 3
    },
    craftTime: 20,
    unlockCondition: 'none'
};

const TEST_RECIPE_2: Recipe = {
    id: 'test_zongzi',
    name: '测试粽子',
    description: '用于测试的粽子',
    lore: '测试用',
    rarity: RecipeRarity.COMMON,
    category: RecipeCategory.FOOD,
    inputs: [
        { materialId: 'rice', amount: 1, optional: false }
    ],
    output: {
        itemId: 'zongzi',
        amount: 2
    },
    craftTime: 15,
    unlockCondition: 'none'
};

// 测试用材料
const TEST_MATERIALS: MaterialData[] = [
    { id: 'flour', name: '面粉', description: '测试', type: MaterialType.INGREDIENT, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
    { id: 'red_bean', name: '红豆', description: '测试', type: MaterialType.INGREDIENT, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] },
    { id: 'rice', name: '糯米', description: '测试', type: MaterialType.INGREDIENT, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] }
];

describe('CraftingSystem', () => {
    let craftingSystem: CraftingSystem;
    let eventSystem: EventSystem;
    let backpackSystem: BackpackSystem;
    let recipeSystem: RecipeSystem;
    let staminaSystem: StaminaSystem;
    let materialSystem: MaterialSystem;

    beforeEach(() => {
        // 重置所有单例
        CraftingSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        RecipeSystem.resetInstance();
        StaminaSystem.resetInstance();
        MaterialSystem.resetInstance();

        craftingSystem = CraftingSystem.getInstance();
        eventSystem = EventSystem.getInstance();
        backpackSystem = BackpackSystem.getInstance();
        recipeSystem = RecipeSystem.getInstance();
        staminaSystem = StaminaSystem.getInstance();
        materialSystem = MaterialSystem.getInstance();

        // 注册材料
        materialSystem.initialize(TEST_MATERIALS);

        // 注册并解锁食谱
        recipeSystem.registerRecipe(TEST_RECIPE);
        recipeSystem.registerRecipe(TEST_RECIPE_2);
        recipeSystem.unlockRecipe('test_mooncake');
        recipeSystem.unlockRecipe('test_zongzi');

        // 添加测试材料到背包
        backpackSystem.addItem('flour', ItemType.MATERIAL, 10);
        backpackSystem.addItem('red_bean', ItemType.MATERIAL, 10);
        backpackSystem.addItem('rice', ItemType.MATERIAL, 10);

        // 清除事件系统
        eventSystem.clearAll();
    });

    describe('基础功能', () => {
        describe('getCraftableRecipes', () => {
            it('应该返回已解锁的食谱列表', () => {
                const recipes = craftingSystem.getCraftableRecipes();
                expect(recipes.length).toBe(2);
                expect(recipes.map(r => r.id)).toContain('test_mooncake');
                expect(recipes.map(r => r.id)).toContain('test_zongzi');
            });
        });

        describe('canCraft', () => {
            it('材料和体力足够时应该返回 canCraft=true', () => {
                const result = craftingSystem.canCraft('test_mooncake');
                expect(result.canCraft).toBe(true);
                expect(result.missingMaterials.length).toBe(0);
                expect(result.staminaOk).toBe(true);
            });

            it('材料不足时应该返回缺少的材料', () => {
                backpackSystem.removeItem('flour', 10); // 移除所有面粉
                const result = craftingSystem.canCraft('test_mooncake');
                expect(result.canCraft).toBe(false);
                expect(result.missingMaterials.length).toBe(1);
                expect(result.missingMaterials[0].materialId).toBe('flour');
                expect(result.missingMaterials[0].required).toBe(2);
                expect(result.missingMaterials[0].current).toBe(0);
            });

            it('体力不足时应该返回 staminaOk=false', () => {
                staminaSystem.consumeStamina(95); // 只剩 5 点体力
                const result = craftingSystem.canCraft('test_mooncake');
                expect(result.canCraft).toBe(false);
                expect(result.staminaOk).toBe(false);
            });

            it('食谱不存在时应该返回 canCraft=false', () => {
                const result = craftingSystem.canCraft('non_existent');
                expect(result.canCraft).toBe(false);
            });
        });

        describe('startCrafting', () => {
            it('应该成功开始制作并创建会话', () => {
                const result = craftingSystem.startCrafting('test_mooncake');
                expect(result).toBe(true);

                const session = craftingSystem.getCurrentSession();
                expect(session).not.toBeNull();
                expect(session?.recipeId).toBe('test_mooncake');
                expect(session?.stage).toBe(CraftingStage.SELECT_RECIPE);
            });

            it('应该发布 craft:started 事件', () => {
                const handler = jest.fn();
                eventSystem.on(CraftingEvents.STARTED, handler);

                craftingSystem.startCrafting('test_mooncake');

                expect(handler).toHaveBeenCalledWith({
                    recipeId: 'test_mooncake',
                    recipeName: '测试月饼'
                });
            });

            it('未解锁的食谱不能开始制作', () => {
                recipeSystem.registerRecipe({
                    id: 'locked_recipe',
                    name: '锁定食谱',
                    description: '',
                    lore: '',
                    rarity: RecipeRarity.COMMON,
                    category: RecipeCategory.FOOD,
                    inputs: [],
                    output: { itemId: 'item', amount: 1 },
                    craftTime: 10,
                    unlockCondition: 'none'
                });

                const result = craftingSystem.startCrafting('locked_recipe');
                expect(result).toBe(false);
            });

            it('已有会话时不能再开始新的制作', () => {
                craftingSystem.startCrafting('test_mooncake');
                const result = craftingSystem.startCrafting('test_zongzi');
                expect(result).toBe(false);
            });
        });

        describe('confirmMaterials', () => {
            it('应该消耗材料和体力', () => {
                craftingSystem.startCrafting('test_mooncake');
                const result = craftingSystem.confirmMaterials();

                expect(result).toBe(true);
                expect(backpackSystem.getItemCount('flour')).toBe(8); // 10 - 2
                expect(backpackSystem.getItemCount('red_bean')).toBe(9); // 10 - 1
                expect(staminaSystem.getCurrentStamina()).toBe(90); // 100 - 10
            });

            it('会话状态应该变为 PLAYING', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();

                const session = craftingSystem.getCurrentSession();
                expect(session?.stage).toBe(CraftingStage.PLAYING);
            });

            it('材料不足时应该失败', () => {
                backpackSystem.removeItem('flour', 10);
                craftingSystem.startCrafting('test_mooncake');
                const result = craftingSystem.confirmMaterials();
                expect(result).toBe(false);
            });
        });

        describe('setMiniGameResult', () => {
            it('成功结果应该完成制作', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();

                const handler = jest.fn();
                eventSystem.on(CraftingEvents.COMPLETED, handler);

                craftingSystem.setMiniGameResult({
                    success: true,
                    quality: Quality.NORMAL,
                    skipped: false
                });

                expect(handler).toHaveBeenCalled();
                expect(backpackSystem.getItemCount('mooncake')).toBe(3);
            });

            it('失败结果应该进入 RETRY 状态', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();

                const handler = jest.fn();
                eventSystem.on(CraftingEvents.FAILED, handler);

                craftingSystem.setMiniGameResult({
                    success: false,
                    quality: Quality.NORMAL,
                    skipped: false
                });

                const session = craftingSystem.getCurrentSession();
                expect(session?.stage).toBe(CraftingStage.RETRY);
                expect(handler).toHaveBeenCalled();
            });
        });

        describe('retryMiniGame', () => {
            it('应该重新进入 PLAYING 状态', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();
                craftingSystem.setMiniGameResult({
                    success: false,
                    quality: Quality.NORMAL,
                    skipped: false
                });

                craftingSystem.retryMiniGame();

                const session = craftingSystem.getCurrentSession();
                expect(session?.stage).toBe(CraftingStage.PLAYING);
            });
        });

        describe('skipMiniGame', () => {
            it('应该产出普通品质并完成制作', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();

                const handler = jest.fn();
                eventSystem.on(CraftingEvents.SKIPPED, handler);
                eventSystem.on(CraftingEvents.COMPLETED, handler);

                craftingSystem.skipMiniGame();

                expect(handler).toHaveBeenCalled();
                expect(backpackSystem.getItemCount('mooncake')).toBe(3);
                expect(craftingSystem.getCurrentSession()).toBeNull();
            });
        });

        describe('cancelCrafting', () => {
            it('应该清除当前会话', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.cancelCrafting();
                expect(craftingSystem.getCurrentSession()).toBeNull();
            });
        });
    });

    describe('熟练度系统', () => {
        describe('getMasteryLevel', () => {
            it('初始应该是 NOVICE (等级1)', () => {
                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.NOVICE);
            });

            it('制作 5 次后应该升级到 APPRENTICE (等级2)', () => {
                for (let i = 0; i < 5; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.APPRENTICE);
            });

            it('制作 10 次后应该升级到 SKILLED (等级3)', () => {
                for (let i = 0; i < 10; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.SKILLED);
            });

            it('制作 20 次后应该升级到 MASTER (等级4)', () => {
                for (let i = 0; i < 20; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.MASTER);
            });

            it('超过 20 次应该保持 MASTER 等级', () => {
                for (let i = 0; i < 30; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.MASTER);
            });
        });

        describe('getCraftCount', () => {
            it('应该正确累计制作次数', () => {
                expect(craftingSystem.getCraftCount('test_mooncake')).toBe(0);

                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();
                craftingSystem.setMiniGameResult({
                    success: true,
                    quality: Quality.NORMAL,
                    skipped: false
                });

                expect(craftingSystem.getCraftCount('test_mooncake')).toBe(1);
            });
        });

        describe('getTimeReduction', () => {
            it('NOVICE 应该有 0% 时间减免', () => {
                expect(craftingSystem.getTimeReduction('test_mooncake')).toBe(0);
            });

            it('APPRENTICE 应该有 10% 时间减免', () => {
                // 手动设置进度
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 5,
                            masteryLevel: MasteryLevel.APPRENTICE
                        }
                    }
                });

                expect(craftingSystem.getTimeReduction('test_mooncake')).toBe(0.1);
            });

            it('SKILLED 应该有 20% 时间减免', () => {
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 10,
                            masteryLevel: MasteryLevel.SKILLED
                        }
                    }
                });

                expect(craftingSystem.getTimeReduction('test_mooncake')).toBe(0.2);
            });

            it('MASTER 应该有 30% 时间减免', () => {
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 20,
                            masteryLevel: MasteryLevel.MASTER
                        }
                    }
                });

                expect(craftingSystem.getTimeReduction('test_mooncake')).toBeCloseTo(0.3);
            });
        });

        describe('getActualMiniGameTime', () => {
            it('应该根据熟练度计算实际时长', () => {
                // NOVICE: 20s
                expect(craftingSystem.getActualMiniGameTime('test_mooncake')).toBe(20);

                // MASTER: 20 * 0.7 = 14s
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 20,
                            masteryLevel: MasteryLevel.MASTER
                        }
                    }
                });

                expect(craftingSystem.getActualMiniGameTime('test_mooncake')).toBe(14);
            });
        });

        describe('getQualityChance', () => {
            it('NOVICE 应该有 10% 高品质概率', () => {
                expect(craftingSystem.getQualityChance('test_mooncake')).toBe(0.1);
            });

            it('SKILLED 应该有 20% 高品质概率', () => {
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 10,
                            masteryLevel: MasteryLevel.SKILLED
                        }
                    }
                });

                expect(craftingSystem.getQualityChance('test_mooncake')).toBe(0.2);
            });

            it('MASTER 应该有 25% 高品质概率', () => {
                craftingSystem.importData({
                    progress: {
                        test_mooncake: {
                            recipeId: 'test_mooncake',
                            craftCount: 20,
                            masteryLevel: MasteryLevel.MASTER
                        }
                    }
                });

                expect(craftingSystem.getQualityChance('test_mooncake')).toBe(0.25);
            });
        });

        describe('mastery_up 事件', () => {
            it('熟练度提升时应该发布事件', () => {
                const handler = jest.fn();
                eventSystem.on(CraftingEvents.MASTERY_UP, handler);

                // 制作 5 次触发第一次升级
                for (let i = 0; i < 5; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                expect(handler).toHaveBeenCalledWith({
                    recipeId: 'test_mooncake',
                    newLevel: MasteryLevel.APPRENTICE,
                    craftCount: 5
                });
            });
        });
    });

    describe('存档功能', () => {
        describe('exportData / importData', () => {
            it('应该正确导出和导入数据', () => {
                // 制作几次
                for (let i = 0; i < 3; i++) {
                    craftingSystem.startCrafting('test_mooncake');
                    craftingSystem.confirmMaterials();
                    craftingSystem.setMiniGameResult({
                        success: true,
                        quality: Quality.NORMAL,
                        skipped: false
                    });
                }

                const data = craftingSystem.exportData();

                // 重置系统
                CraftingSystem.resetInstance();
                craftingSystem = CraftingSystem.getInstance();

                // 导入数据
                craftingSystem.importData(data);

                expect(craftingSystem.getCraftCount('test_mooncake')).toBe(3);
                expect(craftingSystem.getMasteryLevel('test_mooncake')).toBe(MasteryLevel.NOVICE);
            });
        });

        describe('reset', () => {
            it('应该重置所有数据', () => {
                craftingSystem.startCrafting('test_mooncake');
                craftingSystem.confirmMaterials();
                craftingSystem.setMiniGameResult({
                    success: true,
                    quality: Quality.NORMAL,
                    skipped: false
                });

                craftingSystem.reset();

                expect(craftingSystem.getCraftCount('test_mooncake')).toBe(0);
                expect(craftingSystem.getCurrentSession()).toBeNull();
            });
        });
    });

    describe('边界情况', () => {
        it('没有会话时调用 confirmMaterials 应该失败', () => {
            const result = craftingSystem.confirmMaterials();
            expect(result).toBe(false);
        });

        it('没有会话时调用 setMiniGameResult 应该无效果', () => {
            expect(() => {
                craftingSystem.setMiniGameResult({
                    success: true,
                    quality: Quality.NORMAL,
                    skipped: false
                });
            }).not.toThrow();
        });

        it('不在 RETRY 状态时调用 retryMiniGame 应该无效果', () => {
            craftingSystem.startCrafting('test_mooncake');
            craftingSystem.confirmMaterials();

            craftingSystem.retryMiniGame();

            const session = craftingSystem.getCurrentSession();
            expect(session?.stage).toBe(CraftingStage.PLAYING);
        });

        it('跳过迷你游戏不应该计入熟练度高品质概率', () => {
            craftingSystem.startCrafting('test_mooncake');
            craftingSystem.confirmMaterials();

            // Mock Math.random 返回 0，确保品质是普通
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0);

            craftingSystem.skipMiniGame();

            Math.random = originalRandom;

            // 跳过产出普通品质
            expect(backpackSystem.getItemCount('mooncake')).toBe(3);
            expect(backpackSystem.getItemCount('mooncake_quality')).toBe(0);
        });
    });
});
