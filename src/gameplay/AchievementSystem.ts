/**
 * 成就系统
 *
 * 管理游戏成就的解锁、进度追踪和奖励发放。
 * 支持多种成就类型、稀有度、分类和条件检测。
 *
 * @example
 * ```typescript
 * const achievementSystem = AchievementSystem.getInstance();
 *
 * // 注册成就
 * achievementSystem.registerAchievement({
 *     id: 'first-harvest',
 *     name: '初次收获',
 *     description: '采集第一个资源',
 *     category: AchievementCategory.GATHERING,
 *     condition: { type: 'gather', count: 1 }
 * });
 *
 * // 更新进度
 * achievementSystem.updateProgress('gather', 1);
 * ```
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 成就分类
 */
export enum AchievementCategory {
    /** 游戏进度 */
    PROGRESS = 'PROGRESS',
    /** 资源采集 */
    GATHERING = 'GATHERING',
    /** 物品制作 */
    CRAFTING = 'CRAFTING',
    /** 村民关系 */
    VILLAGER = 'VILLAGER',
    /** 节日庆典 */
    FESTIVAL = 'FESTIVAL',
    /** 收集 */
    COLLECTION = 'COLLECTION',
    /** 隐藏成就 */
    HIDDEN = 'HIDDEN'
}

/**
 * 成就稀有度
 */
export enum AchievementRarity {
    /** 普通 */
    COMMON = 'COMMON',
    /** 稀有 */
    RARE = 'RARE',
    /** 史诗 */
    EPIC = 'EPIC',
    /** 传说 */
    LEGENDARY = 'LEGENDARY'
}

/**
 * 成就条件类型
 */
export enum AchievementConditionType {
    /** 采集次数 */
    GATHER = 'GATHER',
    /** 制作次数 */
    CRAFT = 'CRAFT',
    /** 送礼次数 */
    GIFT = 'GIFT',
    /** 完成任务 */
    QUEST = 'QUEST',
    /** 完成节日 */
    FESTIVAL = 'FESTIVAL',
    /** 收集物品 */
    COLLECT = 'COLLECT',
    /** 达到好感度等级 */
    FRIENDSHIP_LEVEL = 'FRIENDSHIP_LEVEL',
    /** 游戏天数 */
    GAME_DAYS = 'GAME_DAYS',
    /** 自定义条件 */
    CUSTOM = 'CUSTOM'
}

/**
 * 成就条件
 */
export interface AchievementCondition {
    /** 条件类型 */
    type: AchievementConditionType | string;
    /** 目标数量 */
    count: number;
    /** 特定目标 (如特定物品 ID) */
    target?: string;
    /** 自定义检查函数 */
    customCheck?: (progress: AchievementProgress) => boolean;
}

/**
 * 成就奖励
 */
export interface AchievementReward {
    /** 奖励类型 */
    type: 'coins' | 'items' | 'title' | 'cosmetic';
    /** 奖励数量 */
    amount?: number;
    /** 物品 ID */
    itemId?: string;
    /** 称号/外观 ID */
    cosmeticId?: string;
}

/**
 * 成就定义
 */
export interface AchievementDefinition {
    /** 成就唯一标识 */
    id: string;
    /** 成就名称 */
    name: string;
    /** 成就描述 */
    description: string;
    /** 详细描述 (解锁后显示) */
    detailedDescription?: string;
    /** 分类 */
    category: AchievementCategory;
    /** 稀有度 */
    rarity: AchievementRarity;
    /** 解锁条件 */
    condition: AchievementCondition;
    /** 奖励 */
    reward?: AchievementReward;
    /** 图标 (资源路径或 URL) */
    icon?: string;
    /** 未解锁时的占位图标 */
    lockedIcon?: string;
    /** 前置成就 */
    prerequisites?: string[];
    /** 是否隐藏 (未解锁前不显示) */
    hidden?: boolean;
    /** 排序权重 */
    order?: number;
    /** 点数 (用于成就总分) */
    points?: number;
}

/**
 * 成就进度
 */
export interface AchievementProgress {
    /** 成就 ID */
    achievementId: string;
    /** 当前进度 */
    current: number;
    /** 目标数量 */
    target: number;
    /** 是否已完成 */
    completed: boolean;
    /** 完成时间 */
    completedAt?: number;
    /** 是否已领取奖励 */
    claimed: boolean;
    /** 领取时间 */
    claimedAt?: number;
}

/**
 * 成就系统事件
 */
export const AchievementEvents = {
    /** 成就进度更新 */
    PROGRESS_UPDATED: 'achievement:progress_updated',
    /** 成就解锁 */
    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
    /** 成就奖励领取 */
    REWARD_CLAIMED: 'achievement:reward_claimed',
    /** 全部成就完成 */
    ALL_COMPLETED: 'achievement:all_completed'
} as const;

/**
 * 成就系统数据 (用于存档)
 */
export interface AchievementSystemData {
    /** 已注册的成就 ID 列表 */
    registeredAchievements: string[];
    /** 成就进度 */
    progress: Record<string, AchievementProgress>;
    /** 总点数 */
    totalPoints: number;
    /** 获得点数 */
    earnedPoints: number;
}

/**
 * 成就系统
 */
export class AchievementSystem {
    private static instance: AchievementSystem | null = null;

    /** 成就定义 */
    private achievements: Map<string, AchievementDefinition> = new Map();

    /** 成就进度 */
    private progress: Map<string, AchievementProgress> = new Map();

    /** 条件计数器 */
    private counters: Map<string, number> = new Map();

    /** 事件系统 */
    private eventSystem: EventSystem;

    /** 总点数 */
    private totalPoints: number = 0;

    /** 获得点数 */
    private earnedPoints: number = 0;

    private constructor() {
        this.eventSystem = EventSystem.getInstance();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): AchievementSystem {
        if (!AchievementSystem.instance) {
            AchievementSystem.instance = new AchievementSystem();
        }
        return AchievementSystem.instance;
    }

    /**
     * 重置单例
     */
    public static resetInstance(): void {
        AchievementSystem.instance = null;
    }

    // ============================================================
    // 成就注册
    // ============================================================

    /**
     * 注册成就
     */
    registerAchievement(definition: AchievementDefinition): void {
        if (this.achievements.has(definition.id)) {
            console.warn(`[AchievementSystem] Achievement ${definition.id} already registered`);
            return;
        }

        // 设置默认值
        const achievement: AchievementDefinition = {
            ...definition,
            points: definition.points ?? this.getPointsForRarity(definition.rarity),
            order: definition.order ?? 100,
            hidden: definition.hidden ?? false
        };

        this.achievements.set(achievement.id, achievement);
        this.totalPoints += achievement.points ?? 0;

        // 初始化进度
        if (!this.progress.has(achievement.id)) {
            this.progress.set(achievement.id, {
                achievementId: achievement.id,
                current: 0,
                target: achievement.condition.count,
                completed: false,
                claimed: false
            });
        }
    }

    /**
     * 批量注册成就
     */
    registerAchievements(definitions: AchievementDefinition[]): void {
        definitions.forEach(def => this.registerAchievement(def));
    }

    /**
     * 获取成就定义
     */
    getAchievement(id: string): AchievementDefinition | undefined {
        return this.achievements.get(id);
    }

    /**
     * 获取所有成就
     */
    getAllAchievements(): AchievementDefinition[] {
        return Array.from(this.achievements.values());
    }

    /**
     * 获取分类下的成就
     */
    getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
        return this.getAllAchievements().filter(a => a.category === category);
    }

    // ============================================================
    // 进度更新
    // ============================================================

    /**
     * 更新进度
     *
     * @param type 条件类型
     * @param increment 增量 (默认 1)
     * @param target 特定目标
     */
    updateProgress(type: AchievementConditionType | string, increment: number = 1, target?: string): void {
        const key = target ? `${type}:${target}` : type;
        const current = this.counters.get(key) ?? 0;
        this.counters.set(key, current + increment);

        // 检查所有相关成就
        this.achievements.forEach((achievement, id) => {
            if (achievement.condition.type !== type) return;
            if (target && achievement.condition.target && achievement.condition.target !== target) return;

            const progress = this.progress.get(id);
            if (!progress || progress.completed) return;

            // 检查前置条件
            if (!this.checkPrerequisites(achievement)) return;

            // 更新进度
            progress.current = this.counters.get(key) ?? 0;

            // 发布进度更新事件
            this.eventSystem.emit(AchievementEvents.PROGRESS_UPDATED, {
                achievementId: id,
                current: progress.current,
                target: progress.target,
                progress: progress.current / progress.target
            });

            // 检查是否完成
            if (progress.current >= progress.target) {
                this.completeAchievement(id);
            }
        });
    }

    /**
     * 设置进度值
     */
    setProgress(type: AchievementConditionType | string, value: number, target?: string): void {
        const key = target ? `${type}:${target}` : type;
        this.counters.set(key, value);
        this.updateProgress(type, 0, target);
    }

    /**
     * 检查自定义条件成就
     */
    checkCustomConditions(): void {
        this.achievements.forEach((achievement, id) => {
            if (achievement.condition.type !== AchievementConditionType.CUSTOM) return;
            if (!achievement.condition.customCheck) return;

            const progress = this.progress.get(id);
            if (!progress || progress.completed) return;

            if (!this.checkPrerequisites(achievement)) return;

            if (achievement.condition.customCheck(progress)) {
                this.completeAchievement(id);
            }
        });
    }

    // ============================================================
    // 成就完成
    // ============================================================

    /**
     * 完成成就
     */
    private completeAchievement(id: string): void {
        const achievement = this.achievements.get(id);
        const progress = this.progress.get(id);

        if (!achievement || !progress || progress.completed) return;

        progress.completed = true;
        progress.completedAt = Date.now();
        progress.current = progress.target;

        this.earnedPoints += achievement.points ?? 0;

        // 发布事件
        this.eventSystem.emit(AchievementEvents.ACHIEVEMENT_UNLOCKED, {
            achievementId: id,
            achievement,
            completedAt: progress.completedAt,
            totalPoints: this.totalPoints,
            earnedPoints: this.earnedPoints
        });

        // 检查是否全部完成
        this.checkAllCompleted();
    }

    /**
     * 手动解锁成就
     */
    unlockAchievement(id: string): boolean {
        const achievement = this.achievements.get(id);
        if (!achievement) return false;

        const progress = this.progress.get(id);
        if (!progress || progress.completed) return false;

        this.completeAchievement(id);
        return true;
    }

    /**
     * 领取奖励
     */
    claimReward(id: string): AchievementReward | null {
        const achievement = this.achievements.get(id);
        const progress = this.progress.get(id);

        if (!achievement || !progress || !progress.completed || progress.claimed) {
            return null;
        }

        if (!achievement.reward) {
            return null;
        }

        progress.claimed = true;
        progress.claimedAt = Date.now();

        // 发布事件
        this.eventSystem.emit(AchievementEvents.REWARD_CLAIMED, {
            achievementId: id,
            reward: achievement.reward,
            claimedAt: progress.claimedAt
        });

        return achievement.reward;
    }

    // ============================================================
    // 状态查询
    // ============================================================

    /**
     * 获取成就进度
     */
    getProgress(id: string): AchievementProgress | undefined {
        return this.progress.get(id);
    }

    /**
     * 检查成就是否完成
     */
    isCompleted(id: string): boolean {
        return this.progress.get(id)?.completed ?? false;
    }

    /**
     * 检查奖励是否已领取
     */
    isClaimed(id: string): boolean {
        return this.progress.get(id)?.claimed ?? false;
    }

    /**
     * 获取完成进度百分比
     */
    getCompletionPercentage(): number {
        const completed = Array.from(this.progress.values()).filter(p => p.completed).length;
        const total = this.achievements.size;
        return total > 0 ? (completed / total) * 100 : 0;
    }

    /**
     * 获取点数进度
     */
    getPointsProgress(): { earned: number; total: number } {
        return {
            earned: this.earnedPoints,
            total: this.totalPoints
        };
    }

    /**
     * 获取未领取奖励的成就
     */
    getUnclaimedRewards(): AchievementDefinition[] {
        return this.getAllAchievements().filter(a => {
            const progress = this.progress.get(a.id);
            return progress?.completed && !progress?.claimed && a.reward;
        });
    }

    /**
     * 获取已完成的成就
     */
    getCompletedAchievements(): AchievementDefinition[] {
        return this.getAllAchievements().filter(a => this.isCompleted(a.id));
    }

    /**
     * 获取进行中的成就
     */
    getInProgressAchievements(): Array<{ achievement: AchievementDefinition; progress: AchievementProgress }> {
        const result: Array<{ achievement: AchievementDefinition; progress: AchievementProgress }> = [];

        this.achievements.forEach((achievement, id) => {
            const progress = this.progress.get(id);
            if (progress && !progress.completed && progress.current > 0 && !achievement.hidden) {
                result.push({ achievement, progress });
            }
        });

        // 按进度排序
        return result.sort((a, b) => {
            const progA = a.progress.current / a.progress.target;
            const progB = b.progress.current / b.progress.target;
            return progB - progA;
        });
    }

    /**
     * 获取可见成就 (非隐藏或已完成的隐藏成就)
     */
    getVisibleAchievements(): AchievementDefinition[] {
        return this.getAllAchievements().filter(a => {
            if (!a.hidden) return true;
            return this.isCompleted(a.id);
        });
    }

    // ============================================================
    // 存档功能
    // ============================================================

    /**
     * 导出数据
     */
    exportData(): AchievementSystemData {
        const progress: Record<string, AchievementProgress> = {};

        this.progress.forEach((p, id) => {
            progress[id] = { ...p };
        });

        return {
            registeredAchievements: Array.from(this.achievements.keys()),
            progress,
            totalPoints: this.totalPoints,
            earnedPoints: this.earnedPoints
        };
    }

    /**
     * 导入数据
     */
    importData(data: AchievementSystemData): void {
        // 恢复进度
        for (const [id, progress] of Object.entries(data.progress)) {
            this.progress.set(id, { ...progress });
        }

        // 恢复计数器
        this.progress.forEach((progress) => {
            if (progress.current > 0) {
                const achievement = this.achievements.get(progress.achievementId);
                if (achievement) {
                    const key = achievement.condition.target
                        ? `${achievement.condition.type}:${achievement.condition.target}`
                        : achievement.condition.type;
                    this.counters.set(key, progress.current);
                }
            }
        });

        this.earnedPoints = data.earnedPoints;
    }

    /**
     * 重置系统
     */
    reset(): void {
        this.progress.clear();
        this.counters.clear();
        this.earnedPoints = 0;

        // 重新初始化进度
        this.achievements.forEach((achievement, id) => {
            this.progress.set(id, {
                achievementId: id,
                current: 0,
                target: achievement.condition.count,
                completed: false,
                claimed: false
            });
        });
    }

    // ============================================================
    // 私有方法
    // ============================================================

    /**
     * 检查前置条件
     */
    private checkPrerequisites(achievement: AchievementDefinition): boolean {
        if (!achievement.prerequisites || achievement.prerequisites.length === 0) {
            return true;
        }

        return achievement.prerequisites.every(preId => this.isCompleted(preId));
    }

    /**
     * 检查是否全部完成
     */
    private checkAllCompleted(): void {
        const allCompleted = Array.from(this.progress.values()).every(p => p.completed);

        if (allCompleted && this.achievements.size > 0) {
            this.eventSystem.emit(AchievementEvents.ALL_COMPLETED, {
                totalAchievements: this.achievements.size,
                totalPoints: this.totalPoints
            });
        }
    }

    /**
     * 根据稀有度获取默认点数
     */
    private getPointsForRarity(rarity: AchievementRarity): number {
        switch (rarity) {
            case AchievementRarity.COMMON: return 10;
            case AchievementRarity.RARE: return 25;
            case AchievementRarity.EPIC: return 50;
            case AchievementRarity.LEGENDARY: return 100;
            default: return 10;
        }
    }
}

// ============================================================
// 内置成就定义
// ============================================================

/**
 * 创建基础成就定义
 */
export function createBasicAchievements(): AchievementDefinition[] {
    return [
        // ============================================================
        // 采集成就
        // ============================================================
        {
            id: 'first-harvest',
            name: '初次收获',
            description: '采集第一个资源',
            category: AchievementCategory.GATHERING,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.GATHER, count: 1 },
            icon: 'achievements/first_harvest.png',
            points: 10
        },
        {
            id: 'gatherer-novice',
            name: '采集新手',
            description: '累计采集 10 次资源',
            category: AchievementCategory.GATHERING,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.GATHER, count: 10 },
            icon: 'achievements/gatherer_novice.png',
            points: 15
        },
        {
            id: 'gatherer-expert',
            name: '采集专家',
            description: '累计采集 100 次资源',
            category: AchievementCategory.GATHERING,
            rarity: AchievementRarity.RARE,
            condition: { type: AchievementConditionType.GATHER, count: 100 },
            icon: 'achievements/gatherer_expert.png',
            points: 25,
            prerequisites: ['gatherer-novice']
        },
        {
            id: 'gatherer-master',
            name: '采集大师',
            description: '累计采集 500 次资源',
            category: AchievementCategory.GATHERING,
            rarity: AchievementRarity.EPIC,
            condition: { type: AchievementConditionType.GATHER, count: 500 },
            icon: 'achievements/gatherer_master.png',
            points: 50,
            prerequisites: ['gatherer-expert']
        },

        // ============================================================
        // 制作成就
        // ============================================================
        {
            id: 'first-craft',
            name: '初次制作',
            description: '制作第一个物品',
            category: AchievementCategory.CRAFTING,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.CRAFT, count: 1 },
            icon: 'achievements/first_craft.png',
            points: 10
        },
        {
            id: 'artisan-novice',
            name: '工匠新手',
            description: '累计制作 10 个物品',
            category: AchievementCategory.CRAFTING,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.CRAFT, count: 10 },
            icon: 'achievements/artisan_novice.png',
            points: 15
        },
        {
            id: 'artisan-expert',
            name: '工匠专家',
            description: '累计制作 50 个物品',
            category: AchievementCategory.CRAFTING,
            rarity: AchievementRarity.RARE,
            condition: { type: AchievementConditionType.CRAFT, count: 50 },
            icon: 'achievements/artisan_expert.png',
            points: 25,
            prerequisites: ['artisan-novice']
        },
        {
            id: 'master-crafter',
            name: '制作大师',
            description: '累计制作 200 个物品',
            category: AchievementCategory.CRAFTING,
            rarity: AchievementRarity.EPIC,
            condition: { type: AchievementConditionType.CRAFT, count: 200 },
            icon: 'achievements/master_crafter.png',
            points: 50,
            prerequisites: ['artisan-expert']
        },

        // ============================================================
        // 村民成就
        // ============================================================
        {
            id: 'first-gift',
            name: '初次送礼',
            description: '第一次送礼物给村民',
            category: AchievementCategory.VILLAGER,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.GIFT, count: 1 },
            icon: 'achievements/first_gift.png',
            points: 10
        },
        {
            id: 'friendly-villager',
            name: '友善村民',
            description: '累计送礼 20 次',
            category: AchievementCategory.VILLAGER,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.GIFT, count: 20 },
            icon: 'achievements/friendly_villager.png',
            points: 15
        },
        {
            id: 'beloved',
            name: '万人迷',
            description: '累计送礼 100 次',
            category: AchievementCategory.VILLAGER,
            rarity: AchievementRarity.RARE,
            condition: { type: AchievementConditionType.GIFT, count: 100 },
            icon: 'achievements/beloved.png',
            points: 25,
            prerequisites: ['friendly-villager']
        },
        {
            id: 'best-friend',
            name: '挚友',
            description: '与任意村民好感度达到最高等级',
            category: AchievementCategory.VILLAGER,
            rarity: AchievementRarity.EPIC,
            condition: { type: AchievementConditionType.FRIENDSHIP_LEVEL, count: 1 },
            icon: 'achievements/best_friend.png',
            points: 50
        },

        // ============================================================
        // 节日成就
        // ============================================================
        {
            id: 'first-festival',
            name: '初次庆典',
            description: '完成第一个节日庆典',
            category: AchievementCategory.FESTIVAL,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.FESTIVAL, count: 1 },
            icon: 'achievements/first_festival.png',
            points: 15
        },
        {
            id: 'festival-enthusiast',
            name: '节日达人',
            description: '完成 4 个节日庆典',
            category: AchievementCategory.FESTIVAL,
            rarity: AchievementRarity.RARE,
            condition: { type: AchievementConditionType.FESTIVAL, count: 4 },
            icon: 'achievements/festival_enthusiast.png',
            points: 30,
            prerequisites: ['first-festival']
        },
        {
            id: 'tradition-keeper',
            name: '传统守护者',
            description: '完成所有节日庆典',
            category: AchievementCategory.FESTIVAL,
            rarity: AchievementRarity.LEGENDARY,
            condition: { type: AchievementConditionType.FESTIVAL, count: 8 },
            icon: 'achievements/tradition_keeper.png',
            points: 100,
            prerequisites: ['festival-enthusiast']
        },

        // ============================================================
        // 进度成就
        // ============================================================
        {
            id: 'newcomer',
            name: '新来者',
            description: '在村庄度过第一天',
            category: AchievementCategory.PROGRESS,
            rarity: AchievementRarity.COMMON,
            condition: { type: AchievementConditionType.GAME_DAYS, count: 1 },
            icon: 'achievements/newcomer.png',
            points: 5
        },
        {
            id: 'settled',
            name: '安居乐业',
            description: '在村庄度过 30 天',
            category: AchievementCategory.PROGRESS,
            rarity: AchievementRarity.RARE,
            condition: { type: AchievementConditionType.GAME_DAYS, count: 30 },
            icon: 'achievements/settled.png',
            points: 25
        },
        {
            id: 'village-elder',
            name: '村庄长老',
            description: '???',
            detailedDescription: '在村庄度过 365 天',
            category: AchievementCategory.PROGRESS,
            rarity: AchievementRarity.LEGENDARY,
            condition: { type: AchievementConditionType.GAME_DAYS, count: 365 },
            icon: 'achievements/village_elder.png',
            points: 100,
            hidden: true
        },

        // ============================================================
        // 隐藏成就
        // ============================================================
        {
            id: 'secret-perfectionist',
            name: '完美主义者',
            description: '???',
            detailedDescription: '制作 10 个高品质物品',
            category: AchievementCategory.HIDDEN,
            rarity: AchievementRarity.LEGENDARY,
            condition: { type: 'quality_craft', count: 10 },
            icon: 'achievements/secret_perfectionist.png',
            points: 75,
            hidden: true
        }
    ];
}
