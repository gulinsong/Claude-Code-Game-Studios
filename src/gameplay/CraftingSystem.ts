/**
 * 手工艺系统 - 核心玩法循环
 *
 * 参考: design/gdd/crafting-system.md
 *
 * 手工艺系统让玩家通过迷你游戏制作节日物品。
 * 制作过程有节奏、有操作、有仪式感的互动体验。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem, ItemType } from '../data/BackpackSystem';
import { RecipeSystem, Recipe } from '../data/RecipeSystem';
import { StaminaSystem } from '../resource/StaminaSystem';

/**
 * 制作阶段状态
 */
export enum CraftingStage {
    /** 选择食谱 */
    SELECT_RECIPE = 'SELECT_RECIPE',
    /** 确认材料 */
    CONFIRM_MATERIALS = 'CONFIRM_MATERIALS',
    /** 进行迷你游戏 */
    PLAYING = 'PLAYING',
    /** 成功完成 */
    SUCCESS = 'SUCCESS',
    /** 重试 */
    RETRY = 'RETRY'
}

/**
 * 物品品质
 */
export enum Quality {
    /** 普通品质 */
    NORMAL = 'NORMAL',
    /** 高品质 */
    HIGH = 'HIGH'
}

/**
 * 迷你游戏类型
 */
export enum MiniGameType {
    /** 揉捏类（月饼、汤圆） */
    KNEAD = 'KNEAD',
    /** 折叠类（粽子、饺子） */
    FOLD = 'FOLD',
    /** 剪裁类（剪纸、窗花） */
    CUT = 'CUT',
    /** 组装类（灯笼、风筝） */
    ASSEMBLE = 'ASSEMBLE',
    /** 调配类（年糕、酱料） */
    MIX = 'MIX'
}

/**
 * 熟练度等级
 */
export enum MasteryLevel {
    /** 新手 (0-4次) */
    NOVICE = 1,
    /** 入门 (5-9次) */
    APPRENTICE = 2,
    /** 熟练 (10-19次) */
    SKILLED = 3,
    /** 精通 (20+次) */
    MASTER = 4
}

/**
 * 制作会话
 */
export interface CraftingSession {
    /** 食谱ID */
    recipeId: string;
    /** 当前阶段 */
    stage: CraftingStage;
    /** 迷你游戏当前阶段 */
    currentMiniGameStage: number;
    /** 迷你游戏总阶段数 */
    totalMiniGameStages: number;
    /** 开始时间戳 */
    startTime: number;
}

/**
 * 制作进度（用于存档）
 */
export interface CraftingProgress {
    /** 食谱ID */
    recipeId: string;
    /** 制作次数 */
    craftCount: number;
    /** 熟练度等级 */
    masteryLevel: MasteryLevel;
}

/**
 * 迷你游戏结果
 */
export interface MiniGameResult {
    /** 是否成功 */
    success: boolean;
    /** 产出品质 */
    quality: Quality;
    /** 是否跳过 */
    skipped: boolean;
}

/**
 * 制作检查结果
 */
export interface CraftingCheckResult {
    /** 是否可以制作 */
    canCraft: boolean;
    /** 缺少的材料 */
    missingMaterials: Array<{ materialId: string; required: number; current: number }>;
    /** 体力是否足够 */
    staminaOk: boolean;
    /** 当前体力 */
    currentStamina: number;
    /** 需要体力 */
    requiredStamina: number;
}

/**
 * 制作完成结果
 */
export interface CraftingCompleteResult {
    /** 是否成功 */
    success: boolean;
    /** 产出物品ID */
    outputItemId: string;
    /** 产出数量 */
    outputAmount: number;
    /** 品质 */
    quality: Quality;
    /** 新熟练度等级 */
    newMasteryLevel: MasteryLevel;
    /** 是否升级 */
    masteryUp: boolean;
}

/**
 * 手工艺事件 Payload 类型
 */
export interface CraftStartedPayload {
    recipeId: string;
    recipeName: string;
}

export interface CraftCompletedPayload {
    recipeId: string;
    outputItem: string;
    quality: Quality;
    amount: number;
}

export interface CraftFailedPayload {
    recipeId: string;
}

export interface CraftSkippedPayload {
    recipeId: string;
}

export interface CraftMasteryUpPayload {
    recipeId: string;
    newLevel: MasteryLevel;
    craftCount: number;
}

/**
 * 手工艺事件 ID
 */
export const CraftingEvents = {
    STARTED: 'craft:started',
    COMPLETED: 'craft:completed',
    FAILED: 'craft:failed',
    SKIPPED: 'craft:skipped',
    MASTERY_UP: 'craft:mastery_up'
} as const;

/**
 * 手工艺系统配置
 */
const CRAFTING_CONFIG = {
    /** 基础迷你游戏时长（秒） */
    BASE_MINI_GAME_TIME: 20,
    /** 熟练度升级间隔（制作次数） */
    MASTERY_INTERVAL: 5,
    /** 最大熟练度等级 */
    MAX_MASTERY_LEVEL: 4,
    /** 时间减免系数（每级） */
    TIME_REDUCTION_PER_LEVEL: 0.1,
    /** 基础高品质概率 */
    BASE_QUALITY_CHANCE: 0.1,
    /** 高品质概率提升（每级） */
    QUALITY_CHANCE_PER_LEVEL: 0.05,
    /** 基础体力消耗 */
    BASE_STAMINA_COST: 10,
    /** 迷你游戏默认阶段数 */
    DEFAULT_MINI_GAME_STAGES: 4
};

/**
 * 手工艺系统数据（用于存档）
 */
export interface CraftingSystemData {
    /** 各食谱制作进度 */
    progress: Record<string, CraftingProgress>;
}

/**
 * 手工艺系统接口
 */
export interface ICraftingSystem {
    // 食谱管理
    /** 获取可制作的食谱列表 */
    getCraftableRecipes(): Recipe[];
    /** 检查是否可以制作指定食谱 */
    canCraft(recipeId: string): CraftingCheckResult;

    // 制作流程
    /** 开始制作 */
    startCrafting(recipeId: string): boolean;
    /** 确认材料（消耗材料） */
    confirmMaterials(): boolean;
    /** 获取当前制作会话 */
    getCurrentSession(): CraftingSession | null;
    /** 取消制作（材料已消耗，不退还） */
    cancelCrafting(): void;

    // 迷你游戏
    /** 设置迷你游戏结果 */
    setMiniGameResult(result: MiniGameResult): void;
    /** 重试迷你游戏 */
    retryMiniGame(): void;
    /** 跳过迷你游戏 */
    skipMiniGame(): void;

    // 熟练度
    /** 获取熟练度等级 */
    getMasteryLevel(recipeId: string): MasteryLevel;
    /** 获取制作次数 */
    getCraftCount(recipeId: string): number;
    /** 获取时间减免比例 */
    getTimeReduction(recipeId: string): number;
    /** 获取实际迷你游戏时长 */
    getActualMiniGameTime(recipeId: string): number;
    /** 获取高品质产出概率 */
    getQualityChance(recipeId: string): number;

    // 存档
    /** 导出数据 */
    exportData(): CraftingSystemData;
    /** 导入数据 */
    importData(data: CraftingSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 手工艺系统实现
 */
export class CraftingSystem implements ICraftingSystem {
    private static instance: CraftingSystem | null = null;

    /** 制作进度 */
    private progress: Map<string, CraftingProgress> = new Map();
    /** 当前制作会话 */
    private currentSession: CraftingSession | null = null;

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): CraftingSystem {
        if (!CraftingSystem.instance) {
            CraftingSystem.instance = new CraftingSystem();
        }
        return CraftingSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        CraftingSystem.instance = null;
    }

    // ========== 食谱管理 ==========

    /**
     * 获取可制作的食谱列表
     */
    public getCraftableRecipes(): Recipe[] {
        const recipeSystem = RecipeSystem.getInstance();
        const unlockedRecipes = recipeSystem.getUnlockedRecipes();
        return unlockedRecipes;
    }

    /**
     * 检查是否可以制作指定食谱
     */
    public canCraft(recipeId: string): CraftingCheckResult {
        const recipeSystem = RecipeSystem.getInstance();
        const backpackSystem = BackpackSystem.getInstance();
        const staminaSystem = StaminaSystem.getInstance();

        const recipe = recipeSystem.getRawRecipe(recipeId);
        if (!recipe) {
            return {
                canCraft: false,
                missingMaterials: [],
                staminaOk: false,
                currentStamina: 0,
                requiredStamina: 0
            };
        }

        // 检查材料
        const missingMaterials: CraftingCheckResult['missingMaterials'] = [];
        for (const input of recipe.inputs) {
            if (input.optional) continue; // 可选材料不检查

            const current = backpackSystem.getItemCount(input.materialId);
            if (current < input.amount) {
                missingMaterials.push({
                    materialId: input.materialId,
                    required: input.amount,
                    current
                });
            }
        }

        // 检查体力
        const staminaCost = this.getStaminaCost(recipeId);
        const currentStamina = staminaSystem.getCurrentStamina();
        const staminaOk = currentStamina >= staminaCost;

        return {
            canCraft: missingMaterials.length === 0 && staminaOk,
            missingMaterials,
            staminaOk,
            currentStamina,
            requiredStamina: staminaCost
        };
    }

    // ========== 制作流程 ==========

    /**
     * 开始制作
     */
    public startCrafting(recipeId: string): boolean {
        const recipeSystem = RecipeSystem.getInstance();
        const recipe = recipeSystem.getRawRecipe(recipeId);

        if (!recipe) {
            console.warn('[CraftingSystem] Recipe not found:', recipeId);
            return false;
        }

        // 检查是否已解锁
        if (!recipeSystem.isUnlocked(recipeId)) {
            console.warn('[CraftingSystem] Recipe not unlocked:', recipeId);
            return false;
        }

        // 检查是否已有进行中的会话
        if (this.currentSession) {
            console.warn('[CraftingSystem] Already crafting');
            return false;
        }

        // 创建会话
        this.currentSession = {
            recipeId,
            stage: CraftingStage.SELECT_RECIPE,
            currentMiniGameStage: 0,
            totalMiniGameStages: CRAFTING_CONFIG.DEFAULT_MINI_GAME_STAGES,
            startTime: Date.now()
        };

        // 发布开始事件
        EventSystem.getInstance().emit<CraftStartedPayload>(CraftingEvents.STARTED, {
            recipeId,
            recipeName: recipe.name
        });

        return true;
    }

    /**
     * 确认材料（消耗材料和体力）
     */
    public confirmMaterials(): boolean {
        if (!this.currentSession) {
            console.warn('[CraftingSystem] No active session');
            return false;
        }

        const checkResult = this.canCraft(this.currentSession.recipeId);
        if (!checkResult.canCraft) {
            console.warn('[CraftingSystem] Cannot craft:', checkResult);
            return false;
        }

        const recipeSystem = RecipeSystem.getInstance();
        const backpackSystem = BackpackSystem.getInstance();
        const staminaSystem = StaminaSystem.getInstance();

        const recipe = recipeSystem.getRawRecipe(this.currentSession.recipeId);
        if (!recipe) return false;

        // 消耗材料
        for (const input of recipe.inputs) {
            if (input.optional) continue;
            backpackSystem.removeItem(input.materialId, input.amount);
        }

        // 消耗体力
        const staminaCost = this.getStaminaCost(this.currentSession.recipeId);
        staminaSystem.consumeStamina(staminaCost);

        // 更新会话状态
        this.currentSession.stage = CraftingStage.PLAYING;

        return true;
    }

    /**
     * 获取当前制作会话
     */
    public getCurrentSession(): CraftingSession | null {
        return this.currentSession ? { ...this.currentSession } : null;
    }

    /**
     * 取消制作
     */
    public cancelCrafting(): void {
        if (this.currentSession) {
            // 注意：材料已在 confirmMaterials 时消耗，不退还
            this.currentSession = null;
        }
    }

    // ========== 迷你游戏 ==========

    /**
     * 设置迷你游戏结果
     */
    public setMiniGameResult(result: MiniGameResult): void {
        if (result.success) {
            this.completeCrafting(result);
        } else {
            this.currentSession!.stage = CraftingStage.RETRY;
            EventSystem.getInstance().emit<CraftFailedPayload>(CraftingEvents.FAILED, {
                recipeId: this.currentSession!.recipeId
            });
        }
    }

    /**
     * 重试迷你游戏
     */
    public retryMiniGame(): void {
        if (!this.currentSession || this.currentSession.stage !== CraftingStage.RETRY) {
            return;
        }

        this.currentSession.stage = CraftingStage.PLAYING;
    }

    /**
     * 跳过迷你游戏
     */
    public skipMiniGame(): void {
        if (!this.currentSession) return;

        EventSystem.getInstance().emit<CraftSkippedPayload>(CraftingEvents.SKIPPED, {
            recipeId: this.currentSession.recipeId
        });

        // 跳过产出普通品质
        const result: MiniGameResult = {
            success: true,
            quality: Quality.NORMAL,
            skipped: true
        };

        this.completeCrafting(result);
    }

    // ========== 熟练度 ==========

    /**
     * 获取熟练度等级
     */
    public getMasteryLevel(recipeId: string): MasteryLevel {
        const progress = this.progress.get(recipeId);
        if (!progress) return MasteryLevel.NOVICE;
        return progress.masteryLevel;
    }

    /**
     * 获取制作次数
     */
    public getCraftCount(recipeId: string): number {
        const progress = this.progress.get(recipeId);
        return progress?.craftCount || 0;
    }

    /**
     * 获取时间减免比例
     */
    public getTimeReduction(recipeId: string): number {
        const level = this.getMasteryLevel(recipeId);
        return (level - 1) * CRAFTING_CONFIG.TIME_REDUCTION_PER_LEVEL;
    }

    /**
     * 获取实际迷你游戏时长
     */
    public getActualMiniGameTime(recipeId: string): number {
        const reduction = this.getTimeReduction(recipeId);
        return CRAFTING_CONFIG.BASE_MINI_GAME_TIME * (1 - reduction);
    }

    /**
     * 获取高品质产出概率
     */
    public getQualityChance(recipeId: string): number {
        const level = this.getMasteryLevel(recipeId);
        return CRAFTING_CONFIG.BASE_QUALITY_CHANCE + (level - 1) * CRAFTING_CONFIG.QUALITY_CHANCE_PER_LEVEL;
    }

    // ========== 存档 ==========

    /**
     * 导出数据
     */
    public exportData(): CraftingSystemData {
        const progressRecord: Record<string, CraftingProgress> = {};
        for (const [id, progress] of this.progress) {
            progressRecord[id] = { ...progress };
        }
        return { progress: progressRecord };
    }

    /**
     * 导入数据
     */
    public importData(data: CraftingSystemData): void {
        this.progress.clear();
        for (const [id, progress] of Object.entries(data.progress)) {
            this.progress.set(id, { ...progress });
        }
    }

    /**
     * 重置
     */
    public reset(): void {
        this.progress.clear();
        this.currentSession = null;
    }

    // ========== 私有方法 ==========

    /**
     * 获取体力消耗
     */
    private getStaminaCost(_recipeId: string): number {
        // 未来可以根据食谱复杂度调整
        return CRAFTING_CONFIG.BASE_STAMINA_COST;
    }

    /**
     * 计算熟练度等级
     */
    private calculateMasteryLevel(craftCount: number): MasteryLevel {
        const level = Math.floor(craftCount / CRAFTING_CONFIG.MASTERY_INTERVAL) + 1;
        return Math.min(level, CRAFTING_CONFIG.MAX_MASTERY_LEVEL) as MasteryLevel;
    }

    /**
     * 完成制作
     */
    private completeCrafting(result: MiniGameResult): CraftingCompleteResult | null {
        if (!this.currentSession) return null;

        const recipeSystem = RecipeSystem.getInstance();
        const backpackSystem = BackpackSystem.getInstance();

        const recipe = recipeSystem.getRawRecipe(this.currentSession.recipeId);
        if (!recipe) return null;

        // 计算品质
        let quality = result.quality;
        if (!result.skipped && quality === Quality.NORMAL) {
            // 根据熟练度决定品质
            const qualityChance = this.getQualityChance(this.currentSession.recipeId);
            if (Math.random() < qualityChance) {
                quality = Quality.HIGH;
            }
        }

        // 确定产出物品
        const outputItemId = quality === Quality.HIGH && recipe.output.itemIdQuality
            ? recipe.output.itemIdQuality
            : recipe.output.itemId;

        // 添加物品到背包
        backpackSystem.addItem(outputItemId, ItemType.CRAFTED, recipe.output.amount);

        // 更新制作次数和熟练度
        const recipeId = this.currentSession.recipeId;
        let progress = this.progress.get(recipeId);
        if (!progress) {
            progress = {
                recipeId,
                craftCount: 0,
                masteryLevel: MasteryLevel.NOVICE
            };
            this.progress.set(recipeId, progress);
        }

        const oldLevel = progress.masteryLevel;
        progress.craftCount++;
        progress.masteryLevel = this.calculateMasteryLevel(progress.craftCount);

        // 同步到食谱系统
        recipeSystem.incrementCraftCount(recipeId);

        const masteryUp = progress.masteryLevel > oldLevel;

        // 更新会话状态
        this.currentSession.stage = CraftingStage.SUCCESS;

        // 发布完成事件
        EventSystem.getInstance().emit<CraftCompletedPayload>(CraftingEvents.COMPLETED, {
            recipeId,
            outputItem: outputItemId,
            quality,
            amount: recipe.output.amount
        });

        // 发布熟练度提升事件
        if (masteryUp) {
            EventSystem.getInstance().emit<CraftMasteryUpPayload>(CraftingEvents.MASTERY_UP, {
                recipeId,
                newLevel: progress.masteryLevel,
                craftCount: progress.craftCount
            });
        }

        const completeResult: CraftingCompleteResult = {
            success: true,
            outputItemId,
            outputAmount: recipe.output.amount,
            quality,
            newMasteryLevel: progress.masteryLevel,
            masteryUp
        };

        // 清理会话
        this.currentSession = null;

        return completeResult;
    }
}

/**
 * 全局手工艺系统实例
 */
export const craftingSystem = CraftingSystem.getInstance();
