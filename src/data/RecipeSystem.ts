/**
 * 食谱系统 - 配方管理中心
 *
 * 参考: design/gdd/recipe-system.md
 *
 * 食谱系统定义所有可制作物品的配方，包含输入材料、输出物品、制作时间、文化背景。
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 食谱稀有度
 */
export enum RecipeRarity {
    COMMON = 'COMMON',
    RARE = 'RARE',
    LEGENDARY = 'LEGENDARY'
}

/**
 * 食谱分类
 */
export enum RecipeCategory {
    FOOD = 'FOOD',
    DECORATION = 'DECORATION',
    TOOL = 'TOOL'
}

/**
 * 输入材料
 */
export interface InputItem {
    /** 材料ID */
    materialId: string;
    /** 所需数量 */
    amount: number;
    /** 是否可选（可选材料影响品质） */
    optional: boolean;
}

/**
 * 输出物品
 */
export interface OutputItem {
    /** 输出物品ID */
    itemId: string;
    /** 输出数量 */
    amount: number;
    /** 高品质输出物品ID（使用可选材料时） */
    itemIdQuality?: string;
}

/**
 * 食谱数据
 */
export interface Recipe {
    /** 唯一标识符 */
    id: string;
    /** 显示名称 */
    name: string;
    /** 简短描述 */
    description: string;
    /** 文化背景故事 */
    lore: string;
    /** 稀有度 */
    rarity: RecipeRarity;
    /** 分类 */
    category: RecipeCategory;
    /** 输入材料列表 */
    inputs: InputItem[];
    /** 输出物品 */
    output: OutputItem;
    /** 制作时间（秒） */
    craftTime: number;
    /** 解锁条件描述 */
    unlockCondition: string;
}

/**
 * 食谱进度（用于存档）
 */
export interface RecipeProgress {
    /** 食谱ID */
    recipeId: string;
    /** 是否已解锁 */
    unlocked: boolean;
    /** 制作次数 */
    craftCount: number;
    /** 是否已精通 */
    mastered: boolean;
}

/**
 * 食谱事件 Payload 类型
 */
export interface RecipeUnlockedPayload {
    recipeId: string;
    recipeName: string;
}

export interface RecipeMasteredPayload {
    recipeId: string;
    craftCount: number;
}

/**
 * 食谱事件 ID
 */
export const RecipeEvents = {
    UNLOCKED: 'recipe:unlocked',
    MASTERED: 'recipe:mastered'
} as const;

/**
 * 食谱系统配置
 */
const RECIPE_CONFIG = {
    /** 精通所需制作次数 */
    MASTERY_CRAFT_COUNT: 10,
    /** 制作次数上限 */
    MAX_CRAFT_COUNT: 9999,
    /** 未解锁食谱显示名称 */
    LOCKED_NAME: '???',
    /** 未解锁食谱显示描述 */
    LOCKED_DESCRIPTION: '尚未解锁'
};

/**
 * 食谱系统数据（用于存档）
 */
export interface RecipeSystemData {
    /** 各食谱进度 */
    progress: Record<string, RecipeProgress>;
}

/**
 * 食谱查询结果（包含解锁状态）
 */
export interface RecipeView {
    /** 食谱数据（未解锁时可能为部分数据） */
    recipe: Recipe | null;
    /** 是否已解锁 */
    unlocked: boolean;
    /** 是否已精通 */
    mastered: boolean;
    /** 制作次数 */
    craftCount: number;
    /** 显示名称（未解锁时显示 ???） */
    displayName: string;
    /** 显示描述（未解锁时显示提示） */
    displayDescription: string;
}

/**
 * 食谱系统接口
 */
export interface IRecipeSystem {
    /** 注册食谱 */
    registerRecipe(recipe: Recipe): void;
    /** 批量注册食谱 */
    registerRecipes(recipes: Recipe[]): void;
    /** 获取食谱（包含解锁状态） */
    getRecipeById(id: string): RecipeView | null;
    /** 获取原始食谱数据（不检查解锁状态） */
    getRawRecipe(id: string): Recipe | null;
    /** 获取所有食谱 */
    getAllRecipes(): Recipe[];
    /** 获取已解锁的食谱 */
    getUnlockedRecipes(): Recipe[];
    /** 获取指定分类的食谱 */
    getRecipesByCategory(category: RecipeCategory): Recipe[];
    /** 获取指定稀有度的食谱 */
    getRecipesByRarity(rarity: RecipeRarity): Recipe[];
    /** 解锁食谱 */
    unlockRecipe(id: string): boolean;
    /** 检查是否已解锁 */
    isUnlocked(id: string): boolean;
    /** 增加制作次数 */
    incrementCraftCount(id: string): void;
    /** 获取制作次数 */
    getCraftCount(id: string): number;
    /** 检查是否已精通 */
    isMastered(id: string): boolean;
    /** 获取完成度 (0-1) */
    getCompletionRate(): number;
    /** 获取食谱总数 */
    getTotalRecipeCount(): number;
    /** 获取已解锁数量 */
    getUnlockedCount(): number;
    /** 导出数据（用于存档） */
    exportData(): RecipeSystemData;
    /** 导入数据（用于读档） */
    importData(data: RecipeSystemData): void;
    /** 重置所有进度（保留食谱定义） */
    resetProgress(): void;
    /** 清空所有数据 */
    clear(): void;
}

/**
 * 食谱系统实现
 */
export class RecipeSystem implements IRecipeSystem {
    private static instance: RecipeSystem | null = null;

    /** 食谱定义 */
    private recipes: Map<string, Recipe> = new Map();
    /** 食谱进度 */
    private progress: Map<string, RecipeProgress> = new Map();

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): RecipeSystem {
        if (!RecipeSystem.instance) {
            RecipeSystem.instance = new RecipeSystem();
        }
        return RecipeSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        RecipeSystem.instance = null;
    }

    /**
     * 注册食谱
     */
    public registerRecipe(recipe: Recipe): void {
        if (this.recipes.has(recipe.id)) {
            console.warn('[RecipeSystem] Recipe already registered:', recipe.id);
            return;
        }

        this.recipes.set(recipe.id, recipe);

        // 初始化进度（默认未解锁）
        if (!this.progress.has(recipe.id)) {
            this.progress.set(recipe.id, {
                recipeId: recipe.id,
                unlocked: false,
                craftCount: 0,
                mastered: false
            });
        }
    }

    /**
     * 批量注册食谱
     */
    public registerRecipes(recipes: Recipe[]): void {
        for (const recipe of recipes) {
            this.registerRecipe(recipe);
        }
    }

    /**
     * 获取食谱（包含解锁状态）
     */
    public getRecipeById(id: string): RecipeView | null {
        const recipe = this.recipes.get(id);
        const progress = this.progress.get(id);

        if (!recipe || !progress) {
            return null;
        }

        return {
            recipe: progress.unlocked ? recipe : null,
            unlocked: progress.unlocked,
            mastered: progress.mastered,
            craftCount: progress.craftCount,
            displayName: progress.unlocked ? recipe.name : RECIPE_CONFIG.LOCKED_NAME,
            displayDescription: progress.unlocked ? recipe.description : RECIPE_CONFIG.LOCKED_DESCRIPTION
        };
    }

    /**
     * 获取原始食谱数据（不检查解锁状态）
     */
    public getRawRecipe(id: string): Recipe | null {
        return this.recipes.get(id) || null;
    }

    /**
     * 获取所有食谱
     */
    public getAllRecipes(): Recipe[] {
        return Array.from(this.recipes.values());
    }

    /**
     * 获取已解锁的食谱
     */
    public getUnlockedRecipes(): Recipe[] {
        const unlocked: Recipe[] = [];
        for (const [id, progress] of this.progress) {
            if (progress.unlocked) {
                const recipe = this.recipes.get(id);
                if (recipe) {
                    unlocked.push(recipe);
                }
            }
        }
        return unlocked;
    }

    /**
     * 获取指定分类的食谱
     */
    public getRecipesByCategory(category: RecipeCategory): Recipe[] {
        return this.getAllRecipes().filter(r => r.category === category);
    }

    /**
     * 获取指定稀有度的食谱
     */
    public getRecipesByRarity(rarity: RecipeRarity): Recipe[] {
        return this.getAllRecipes().filter(r => r.rarity === rarity);
    }

    /**
     * 解锁食谱
     */
    public unlockRecipe(id: string): boolean {
        const recipe = this.recipes.get(id);
        const progress = this.progress.get(id);

        if (!recipe || !progress) {
            console.warn('[RecipeSystem] Recipe not found:', id);
            return false;
        }

        if (progress.unlocked) {
            // 已解锁，忽略
            return false;
        }

        progress.unlocked = true;

        // 发布解锁事件
        EventSystem.getInstance().emit<RecipeUnlockedPayload>(RecipeEvents.UNLOCKED, {
            recipeId: id,
            recipeName: recipe.name
        });

        return true;
    }

    /**
     * 检查是否已解锁
     */
    public isUnlocked(id: string): boolean {
        const progress = this.progress.get(id);
        return progress?.unlocked || false;
    }

    /**
     * 增加制作次数
     */
    public incrementCraftCount(id: string): void {
        const progress = this.progress.get(id);

        if (!progress) {
            console.warn('[RecipeSystem] Recipe not found:', id);
            return;
        }

        if (!progress.unlocked) {
            console.warn('[RecipeSystem] Cannot increment craft count for locked recipe:', id);
            return;
        }

        // 安全增加，防止溢出
        if (progress.craftCount < RECIPE_CONFIG.MAX_CRAFT_COUNT) {
            progress.craftCount++;
        }

        // 检查是否达到精通
        if (!progress.mastered && progress.craftCount >= RECIPE_CONFIG.MASTERY_CRAFT_COUNT) {
            progress.mastered = true;

            const recipe = this.recipes.get(id);
            if (recipe) {
                // 发布精通事件
                EventSystem.getInstance().emit<RecipeMasteredPayload>(RecipeEvents.MASTERED, {
                    recipeId: id,
                    craftCount: progress.craftCount
                });
            }
        }
    }

    /**
     * 获取制作次数
     */
    public getCraftCount(id: string): number {
        const progress = this.progress.get(id);
        return progress?.craftCount || 0;
    }

    /**
     * 检查是否已精通
     */
    public isMastered(id: string): boolean {
        const progress = this.progress.get(id);
        return progress?.mastered || false;
    }

    /**
     * 获取完成度 (0-1)
     */
    public getCompletionRate(): number {
        const total = this.getTotalRecipeCount();
        if (total === 0) return 0;
        return this.getUnlockedCount() / total;
    }

    /**
     * 获取食谱总数
     */
    public getTotalRecipeCount(): number {
        return this.recipes.size;
    }

    /**
     * 获取已解锁数量
     */
    public getUnlockedCount(): number {
        let count = 0;
        for (const progress of this.progress.values()) {
            if (progress.unlocked) {
                count++;
            }
        }
        return count;
    }

    /**
     * 导出数据
     */
    public exportData(): RecipeSystemData {
        const progressRecord: Record<string, RecipeProgress> = {};
        for (const [id, progress] of this.progress) {
            progressRecord[id] = { ...progress };
        }
        return { progress: progressRecord };
    }

    /**
     * 导入数据
     */
    public importData(data: RecipeSystemData): void {
        this.progress.clear();
        for (const [id, progress] of Object.entries(data.progress)) {
            this.progress.set(id, { ...progress });
        }

        // 确保所有已注册的食谱都有进度记录
        for (const id of this.recipes.keys()) {
            if (!this.progress.has(id)) {
                this.progress.set(id, {
                    recipeId: id,
                    unlocked: false,
                    craftCount: 0,
                    mastered: false
                });
            }
        }
    }

    /**
     * 重置所有进度（保留食谱定义）
     */
    public resetProgress(): void {
        for (const [id] of this.progress) {
            this.progress.set(id, {
                recipeId: id,
                unlocked: false,
                craftCount: 0,
                mastered: false
            });
        }
    }

    /**
     * 清空所有数据
     */
    public clear(): void {
        this.recipes.clear();
        this.progress.clear();
    }
}

/**
 * 全局食谱系统实例
 */
export const recipeSystem = RecipeSystem.getInstance();
