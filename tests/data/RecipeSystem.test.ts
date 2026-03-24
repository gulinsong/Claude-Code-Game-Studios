/**
 * 食谱系统单元测试
 */

import {
    RecipeSystem,
    RecipeRarity,
    RecipeCategory,
    RecipeEvents,
    RecipeUnlockedPayload,
    RecipeMasteredPayload,
    Recipe
} from '../../src/data/RecipeSystem';
import { EventSystem } from '../../src/core/EventSystem';

// 测试用食谱数据
const createTestRecipes = (): Recipe[] => [
    {
        id: 'mooncake',
        name: '月饼',
        description: '中秋佳节的传统美食',
        lore: '中秋佳节，月圆人团圆...',
        rarity: RecipeRarity.COMMON,
        category: RecipeCategory.FOOD,
        inputs: [
            { materialId: 'flour', amount: 2, optional: false },
            { materialId: 'red_bean_paste', amount: 1, optional: false }
        ],
        output: { itemId: 'mooncake', amount: 3 },
        craftTime: 30,
        unlockCondition: '初始解锁'
    },
    {
        id: 'lantern',
        name: '灯笼',
        description: '元宵节的精美装饰',
        lore: '灯火阑珊处...',
        rarity: RecipeRarity.RARE,
        category: RecipeCategory.DECORATION,
        inputs: [
            { materialId: 'paper', amount: 3, optional: false },
            { materialId: 'bamboo', amount: 2, optional: false }
        ],
        output: { itemId: 'lantern', amount: 1 },
        craftTime: 60,
        unlockCondition: '完成元宵节任务'
    },
    {
        id: 'zongzi',
        name: '粽子',
        description: '端午节的特色食品',
        lore: '屈原投江...',
        rarity: RecipeRarity.LEGENDARY,
        category: RecipeCategory.FOOD,
        inputs: [
            { materialId: 'glutinous_rice', amount: 2, optional: false },
            { materialId: 'bamboo_leaf', amount: 3, optional: false }
        ],
        output: { itemId: 'zongzi', amount: 2 },
        craftTime: 45,
        unlockCondition: '端午节限定'
    }
];

describe('RecipeSystem', () => {
    let recipeSystem: RecipeSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        RecipeSystem.resetInstance();
        EventSystem.resetInstance();
        recipeSystem = RecipeSystem.getInstance();
        eventSystem = EventSystem.getInstance();
    });

    describe('注册食谱', () => {
        test('应该正确注册单个食谱', () => {
            const recipe = createTestRecipes()[0];
            recipeSystem.registerRecipe(recipe);

            expect(recipeSystem.getTotalRecipeCount()).toBe(1);
            expect(recipeSystem.getRawRecipe('mooncake')).toEqual(recipe);
        });

        test('应该正确批量注册食谱', () => {
            recipeSystem.registerRecipes(createTestRecipes());

            expect(recipeSystem.getTotalRecipeCount()).toBe(3);
        });

        test('重复注册应该被忽略', () => {
            const recipe = createTestRecipes()[0];
            recipeSystem.registerRecipe(recipe);
            recipeSystem.registerRecipe(recipe);

            expect(recipeSystem.getTotalRecipeCount()).toBe(1);
        });

        test('注册后应该初始化进度', () => {
            recipeSystem.registerRecipes(createTestRecipes());

            expect(recipeSystem.isUnlocked('mooncake')).toBe(false);
            expect(recipeSystem.getCraftCount('mooncake')).toBe(0);
            expect(recipeSystem.isMastered('mooncake')).toBe(false);
        });
    });

    describe('getRecipeById', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
        });

        test('未解锁的食谱应该返回 ???', () => {
            const view = recipeSystem.getRecipeById('mooncake');

            expect(view).not.toBeNull();
            expect(view?.unlocked).toBe(false);
            expect(view?.displayName).toBe('???');
            expect(view?.displayDescription).toBe('尚未解锁');
            expect(view?.recipe).toBeNull();
        });

        test('已解锁的食谱应该返回完整数据', () => {
            recipeSystem.unlockRecipe('mooncake');
            const view = recipeSystem.getRecipeById('mooncake');

            expect(view?.unlocked).toBe(true);
            expect(view?.displayName).toBe('月饼');
            expect(view?.displayDescription).toBe('中秋佳节的传统美食');
            expect(view?.recipe).not.toBeNull();
        });

        test('不存在的食谱应该返回 null', () => {
            const view = recipeSystem.getRecipeById('nonexistent');

            expect(view).toBeNull();
        });
    });

    describe('unlockRecipe', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
        });

        test('应该正确解锁食谱', () => {
            const result = recipeSystem.unlockRecipe('mooncake');

            expect(result).toBe(true);
            expect(recipeSystem.isUnlocked('mooncake')).toBe(true);
        });

        test('应该发布 recipe:unlocked 事件', () => {
            const handler = jest.fn();
            eventSystem.on<RecipeUnlockedPayload>(RecipeEvents.UNLOCKED, handler);

            recipeSystem.unlockRecipe('mooncake');

            expect(handler).toHaveBeenCalledWith({
                recipeId: 'mooncake',
                recipeName: '月饼'
            });
        });

        test('重复解锁应该返回 false', () => {
            recipeSystem.unlockRecipe('mooncake');
            const result = recipeSystem.unlockRecipe('mooncake');

            expect(result).toBe(false);
        });

        test('解锁不存在的食谱应该返回 false', () => {
            const result = recipeSystem.unlockRecipe('nonexistent');

            expect(result).toBe(false);
        });
    });

    describe('incrementCraftCount', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
            recipeSystem.unlockRecipe('mooncake');
        });

        test('应该正确增加制作次数', () => {
            recipeSystem.incrementCraftCount('mooncake');
            recipeSystem.incrementCraftCount('mooncake');

            expect(recipeSystem.getCraftCount('mooncake')).toBe(2);
        });

        test('达到精通次数应该自动精通', () => {
            const handler = jest.fn();
            eventSystem.on<RecipeMasteredPayload>(RecipeEvents.MASTERED, handler);

            for (let i = 0; i < 10; i++) {
                recipeSystem.incrementCraftCount('mooncake');
            }

            expect(recipeSystem.isMastered('mooncake')).toBe(true);
            expect(handler).toHaveBeenCalled();
        });

        test('未解锁的食谱不应该增加次数', () => {
            recipeSystem.incrementCraftCount('lantern');

            expect(recipeSystem.getCraftCount('lantern')).toBe(0);
        });

        test('制作次数不应该超过上限', () => {
            for (let i = 0; i < 10001; i++) {
                recipeSystem.incrementCraftCount('mooncake');
            }

            expect(recipeSystem.getCraftCount('mooncake')).toBe(9999);
        });
    });

    describe('查询功能', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
            recipeSystem.unlockRecipe('mooncake');
            recipeSystem.unlockRecipe('lantern');
        });

        test('getUnlockedRecipes 应该返回已解锁的食谱', () => {
            const unlocked = recipeSystem.getUnlockedRecipes();

            expect(unlocked.length).toBe(2);
            expect(unlocked.map(r => r.id)).toContain('mooncake');
            expect(unlocked.map(r => r.id)).toContain('lantern');
        });

        test('getRecipesByCategory 应该正确筛选分类', () => {
            const foods = recipeSystem.getRecipesByCategory(RecipeCategory.FOOD);

            expect(foods.length).toBe(2);
            expect(foods.every(r => r.category === RecipeCategory.FOOD)).toBe(true);
        });

        test('getRecipesByRarity 应该正确筛选稀有度', () => {
            const commons = recipeSystem.getRecipesByRarity(RecipeRarity.COMMON);

            expect(commons.length).toBe(1);
            expect(commons[0].id).toBe('mooncake');
        });

        test('getAllRecipes 应该返回所有食谱', () => {
            const all = recipeSystem.getAllRecipes();

            expect(all.length).toBe(3);
        });
    });

    describe('完成度', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
        });

        test('初始完成度应该是 0', () => {
            expect(recipeSystem.getCompletionRate()).toBe(0);
            expect(recipeSystem.getUnlockedCount()).toBe(0);
        });

        test('解锁部分食谱后完成度应该正确', () => {
            recipeSystem.unlockRecipe('mooncake');

            expect(recipeSystem.getUnlockedCount()).toBe(1);
            expect(recipeSystem.getCompletionRate()).toBeCloseTo(1 / 3);
        });

        test('解锁全部后完成度应该是 1', () => {
            recipeSystem.unlockRecipe('mooncake');
            recipeSystem.unlockRecipe('lantern');
            recipeSystem.unlockRecipe('zongzi');

            expect(recipeSystem.getCompletionRate()).toBe(1);
        });
    });

    describe('exportData / importData', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
            recipeSystem.unlockRecipe('mooncake');
            for (let i = 0; i < 5; i++) {
                recipeSystem.incrementCraftCount('mooncake');
            }
        });

        test('应该正确导出和导入数据', () => {
            const data = recipeSystem.exportData();

            RecipeSystem.resetInstance();
            const newSystem = RecipeSystem.getInstance();
            newSystem.registerRecipes(createTestRecipes());
            newSystem.importData(data);

            expect(newSystem.isUnlocked('mooncake')).toBe(true);
            expect(newSystem.getCraftCount('mooncake')).toBe(5);
            expect(newSystem.isUnlocked('lantern')).toBe(false);
        });

        test('导入时应该为缺失的食谱初始化进度', () => {
            const data = { progress: {} };

            recipeSystem.importData(data);

            expect(recipeSystem.isUnlocked('mooncake')).toBe(false);
            expect(recipeSystem.getCraftCount('mooncake')).toBe(0);
        });
    });

    describe('resetProgress', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
            recipeSystem.unlockRecipe('mooncake');
            for (let i = 0; i < 10; i++) {
                recipeSystem.incrementCraftCount('mooncake');
            }
        });

        test('应该重置所有进度但保留食谱定义', () => {
            recipeSystem.resetProgress();

            expect(recipeSystem.getTotalRecipeCount()).toBe(3);
            expect(recipeSystem.isUnlocked('mooncake')).toBe(false);
            expect(recipeSystem.getCraftCount('mooncake')).toBe(0);
            expect(recipeSystem.isMastered('mooncake')).toBe(false);
        });
    });

    describe('clear', () => {
        beforeEach(() => {
            recipeSystem.registerRecipes(createTestRecipes());
        });

        test('应该清空所有数据', () => {
            recipeSystem.clear();

            expect(recipeSystem.getTotalRecipeCount()).toBe(0);
            expect(recipeSystem.getAllRecipes()).toEqual([]);
        });
    });
});
