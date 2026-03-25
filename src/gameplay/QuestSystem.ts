/**
 * 任务系统 - 目标引导系统
 *
 * 参考: design/gdd/quest-system.md
 *
 * 任务系统为玩家提供短期和中期目标，支持日常任务、主线任务、村民请求等。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem, ItemType } from '../data/BackpackSystem';
import { RecipeSystem } from '../data/RecipeSystem';

/**
 * 任务类型
 */
export enum QuestType {
    /** 主线任务 */
    MAIN = 'MAIN',
    /** 村民请求 */
    VILLAGER = 'VILLAGER',
    /** 日常任务 */
    DAILY = 'DAILY',
    /** 节日任务 */
    FESTIVAL = 'FESTIVAL'
}

/**
 * 任务状态
 */
export enum QuestState {
    /** 锁定（前置任务未完成） */
    LOCKED = 'LOCKED',
    /** 可接受 */
    AVAILABLE = 'AVAILABLE',
    /** 进行中 */
    IN_PROGRESS = 'IN_PROGRESS',
    /** 已完成（待领取奖励） */
    COMPLETED = 'COMPLETED',
    /** 已领取奖励 */
    CLAIMED = 'CLAIMED',
    /** 失败（超时） */
    FAILED = 'FAILED'
}

/**
 * 目标类型
 */
export enum ObjectiveType {
    /** 收集物品 */
    COLLECT = 'COLLECT',
    /** 制作物品 */
    CRAFT = 'CRAFT',
    /** 与NPC对话 */
    TALK = 'TALK',
    /** 送给NPC物品 */
    GIVE_ITEM = 'GIVE_ITEM',
    /** 访问地点 */
    VISIT = 'VISIT',
    /** 完成节日 */
    COMPLETE_FESTIVAL = 'COMPLETE_FESTIVAL'
}

/**
 * 奖励类型
 */
export enum RewardType {
    /** 物品奖励 */
    ITEM = 'ITEM',
    /** 好感度奖励 */
    FRIENDSHIP = 'FRIENDSHIP',
    /** 食谱解锁 */
    RECIPE = 'RECIPE',
    /** 区域解锁 */
    AREA_UNLOCK = 'AREA_UNLOCK'
}

/**
 * 目标定义
 */
export interface Objective {
    /** 目标类型 */
    type: ObjectiveType;
    /** 目标ID（物品ID/NPC ID/地点ID等） */
    targetId: string;
    /** 所需数量 */
    requiredAmount: number;
}

/**
 * 奖励定义
 */
export interface Reward {
    /** 奖励类型 */
    type: RewardType;
    /** 物品ID（物品奖励时） */
    itemId?: string;
    /** 数量 */
    amount: number;
    /** NPC ID（好感度奖励时） */
    npcId?: string;
}

/**
 * 任务定义
 */
export interface Quest {
    /** 任务唯一ID */
    id: string;
    /** 任务标题 */
    title: string;
    /** 任务描述 */
    description: string;
    /** 任务类型 */
    type: QuestType;
    /** 目标列表 */
    objectives: Objective[];
    /** 奖励列表 */
    rewards: Reward[];
    /** 前置任务ID列表 */
    prerequisites: string[];
    /** 时间限制（秒），0表示无限制 */
    timeLimit: number;
    /** 发布任务的NPC ID */
    npcId: string;
    /** 是否可重复 */
    repeatable: boolean;
}

/**
 * 目标进度
 */
export interface ObjectiveProgress extends Objective {
    /** 当前进度 */
    currentAmount: number;
}

/**
 * 任务进度
 */
export interface QuestProgress {
    /** 任务ID */
    questId: string;
    /** 当前状态 */
    state: QuestState;
    /** 目标进度 */
    objectives: ObjectiveProgress[];
    /** 开始时间戳 */
    startTime: number;
    /** 截止时间戳（有时间限制时） */
    deadline?: number;
}

/**
 * 任务事件 Payload
 */
export interface QuestStartedPayload {
    questId: string;
    questTitle: string;
}

export interface QuestProgressPayload {
    questId: string;
    objectiveIndex: number;
    current: number;
    required: number;
}

export interface QuestCompletedPayload {
    questId: string;
    questTitle: string;
}

export interface QuestClaimedPayload {
    questId: string;
    rewards: Reward[];
}

export interface QuestAbandonedPayload {
    questId: string;
}

export interface QuestFailedPayload {
    questId: string;
    reason: string;
}

/**
 * 任务事件 ID
 */
export const QuestEvents = {
    STARTED: 'quest:started',
    PROGRESS: 'quest:progress',
    COMPLETED: 'quest:completed',
    CLAIMED: 'quest:claimed',
    ABANDONED: 'quest:abandoned',
    FAILED: 'quest:failed'
} as const;

/**
 * 任务系统配置
 */
const QUEST_CONFIG = {
    /** 同时进行任务上限 */
    MAX_ACTIVE_QUESTS: 10,
    /** 日常任务刷新时间（小时） */
    DAILY_RESET_HOUR: 5
};

/**
 * 任务系统数据（用于存档）
 */
export interface QuestSystemData {
    /** 各任务进度 */
    progress: Record<string, QuestProgress>;
    /** 已完成的任务ID列表 */
    completedQuests: string[];
    /** 上次日常任务刷新时间 */
    lastDailyReset: number;
}

/**
 * 奖励执行器接口
 */
export interface IRewardExecutor {
    /** 改变好感度 */
    changeFriendship(npcId: string, delta: number): void;
    /** 解锁区域 */
    unlockArea(areaId: string): void;
}

/**
 * 任务系统接口
 */
export interface IQuestSystem {
    // 任务注册
    /** 注册任务 */
    registerQuest(quest: Quest): void;
    /** 批量注册任务 */
    registerQuests(quests: Quest[]): void;
    /** 获取任务定义 */
    getQuest(id: string): Quest | null;

    // 任务流程
    /** 接受任务 */
    acceptQuest(questId: string): boolean;
    /** 放弃任务 */
    abandonQuest(questId: string): void;
    /** 领取奖励 */
    claimReward(questId: string): Reward[];

    // 目标追踪
    /** 更新目标进度 */
    updateObjective(type: ObjectiveType, targetId: string, amount: number): void;
    /** 检查任务完成 */
    checkQuestCompletion(questId: string): boolean;

    // 状态查询
    /** 获取任务状态 */
    getQuestState(questId: string): QuestState;
    /** 获取任务进度 */
    getQuestProgress(questId: string): QuestProgress | null;
    /** 获取所有可接受的任务 */
    getAvailableQuests(): Quest[];
    /** 获取所有进行中的任务 */
    getActiveQuests(): Quest[];
    /** 获取所有已完成的任务（待领取） */
    getCompletedQuests(): Quest[];
    /** 检查是否可以接受任务 */
    canAcceptQuest(questId: string): { canAccept: boolean; reason?: string };
    /** 检查前置任务是否完成 */
    arePrerequisitesMet(questId: string): boolean;

    // 奖励执行器
    /** 设置奖励执行器 */
    setRewardExecutor(executor: IRewardExecutor): void;

    // 时间处理
    /** 检查时间限制 */
    checkTimeLimits(): void;
    /** 刷新日常任务 */
    refreshDailyQuests(): void;

    // 存档
    /** 导出数据 */
    exportData(): QuestSystemData;
    /** 导入数据 */
    importData(data: QuestSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 任务系统实现
 */
export class QuestSystem implements IQuestSystem {
    private static instance: QuestSystem | null = null;

    /** 已注册的任务 */
    private quests: Map<string, Quest> = new Map();

    /** 任务进度 */
    private progress: Map<string, QuestProgress> = new Map();

    /** 已完成的任务（用于前置检查） */
    private completedQuests: Set<string> = new Set();

    /** 奖励执行器 */
    private rewardExecutor: IRewardExecutor | null = null;

    /** 上次日常刷新时间 */
    private lastDailyReset: number = 0;

    private constructor() {}

    public static getInstance(): QuestSystem {
        if (!QuestSystem.instance) {
            QuestSystem.instance = new QuestSystem();
        }
        return QuestSystem.instance;
    }

    public static resetInstance(): void {
        QuestSystem.instance = null;
    }

    // ========== 任务注册 ==========

    public registerQuest(quest: Quest): void {
        if (this.quests.has(quest.id)) {
            console.warn('[QuestSystem] Quest already registered:', quest.id);
            return;
        }
        this.quests.set(quest.id, quest);
    }

    public registerQuests(quests: Quest[]): void {
        for (const quest of quests) {
            this.registerQuest(quest);
        }
    }

    public getQuest(id: string): Quest | null {
        return this.quests.get(id) || null;
    }

    // ========== 任务流程 ==========

    public acceptQuest(questId: string): boolean {
        const quest = this.quests.get(questId);
        if (!quest) {
            console.warn('[QuestSystem] Quest not found:', questId);
            return false;
        }

        const check = this.canAcceptQuest(questId);
        if (!check.canAccept) {
            console.warn('[QuestSystem] Cannot accept quest:', check.reason);
            return false;
        }

        // 创建进度
        const progress: QuestProgress = {
            questId,
            state: QuestState.IN_PROGRESS,
            objectives: quest.objectives.map(obj => ({
                ...obj,
                currentAmount: 0
            })),
            startTime: Date.now(),
            deadline: quest.timeLimit > 0 ? Date.now() + quest.timeLimit * 1000 : undefined
        };

        this.progress.set(questId, progress);

        // 检查是否已有物品可完成目标
        this.checkInitialProgress(quest);

        // 发布开始事件
        EventSystem.getInstance().emit<QuestStartedPayload>(QuestEvents.STARTED, {
            questId,
            questTitle: quest.title
        });

        return true;
    }

    public abandonQuest(questId: string): void {
        const progress = this.progress.get(questId);
        if (!progress || progress.state !== QuestState.IN_PROGRESS) {
            return;
        }

        this.progress.delete(questId);

        // 发布放弃事件
        EventSystem.getInstance().emit<QuestAbandonedPayload>(QuestEvents.ABANDONED, {
            questId
        });
    }

    public claimReward(questId: string): Reward[] {
        const progress = this.progress.get(questId);
        const quest = this.quests.get(questId);

        if (!progress || !quest) {
            return [];
        }

        if (progress.state !== QuestState.COMPLETED) {
            return [];
        }

        // 发放奖励
        this.executeRewards(quest.rewards);

        // 更新状态
        progress.state = QuestState.CLAIMED;
        this.completedQuests.add(questId);

        // 发布领取事件
        EventSystem.getInstance().emit<QuestClaimedPayload>(QuestEvents.CLAIMED, {
            questId,
            rewards: quest.rewards
        });

        return quest.rewards;
    }

    // ========== 目标追踪 ==========

    public updateObjective(type: ObjectiveType, targetId: string, amount: number): void {
        // 遍历所有进行中的任务
        for (const [questId, progress] of this.progress) {
            if (progress.state !== QuestState.IN_PROGRESS) continue;

            const quest = this.quests.get(questId);
            if (!quest) continue;

            // 更新匹配的目标
            for (let i = 0; i < progress.objectives.length; i++) {
                const obj = progress.objectives[i];

                if (obj.type === type && obj.targetId === targetId) {
                    const oldAmount = obj.currentAmount;
                    obj.currentAmount = Math.min(obj.currentAmount + amount, obj.requiredAmount);

                    if (obj.currentAmount !== oldAmount) {
                        // 发布进度事件
                        EventSystem.getInstance().emit<QuestProgressPayload>(QuestEvents.PROGRESS, {
                            questId,
                            objectiveIndex: i,
                            current: obj.currentAmount,
                            required: obj.requiredAmount
                        });
                    }
                }
            }

            // 检查任务完成
            this.checkQuestCompletion(questId);
        }
    }

    public checkQuestCompletion(questId: string): boolean {
        const progress = this.progress.get(questId);
        const quest = this.quests.get(questId);

        if (!progress || !quest || progress.state !== QuestState.IN_PROGRESS) {
            return false;
        }

        // 检查所有目标是否完成
        const allComplete = progress.objectives.every(
            obj => obj.currentAmount >= obj.requiredAmount
        );

        if (allComplete) {
            progress.state = QuestState.COMPLETED;

            // 发布完成事件
            EventSystem.getInstance().emit<QuestCompletedPayload>(QuestEvents.COMPLETED, {
                questId,
                questTitle: quest.title
            });

            return true;
        }

        return false;
    }

    // ========== 状态查询 ==========

    public getQuestState(questId: string): QuestState {
        const progress = this.progress.get(questId);
        if (progress) {
            return progress.state;
        }

        const quest = this.quests.get(questId);
        if (!quest) {
            return QuestState.LOCKED;
        }

        // 检查前置任务
        if (!this.arePrerequisitesMet(questId)) {
            return QuestState.LOCKED;
        }

        // 检查是否已完成（不可重复）
        if (!quest.repeatable && this.completedQuests.has(questId)) {
            return QuestState.CLAIMED;
        }

        return QuestState.AVAILABLE;
    }

    public getQuestProgress(questId: string): QuestProgress | null {
        const progress = this.progress.get(questId);
        return progress ? { ...progress, objectives: [...progress.objectives] } : null;
    }

    public getAvailableQuests(): Quest[] {
        const available: Quest[] = [];

        for (const [id] of this.quests) {
            if (this.getQuestState(id) === QuestState.AVAILABLE) {
                const quest = this.quests.get(id);
                if (quest) {
                    available.push(quest);
                }
            }
        }

        return available;
    }

    public getActiveQuests(): Quest[] {
        const active: Quest[] = [];

        for (const [id, progress] of this.progress) {
            if (progress.state === QuestState.IN_PROGRESS) {
                const quest = this.quests.get(id);
                if (quest) {
                    active.push(quest);
                }
            }
        }

        return active;
    }

    public getCompletedQuests(): Quest[] {
        const completed: Quest[] = [];

        for (const [id, progress] of this.progress) {
            if (progress.state === QuestState.COMPLETED) {
                const quest = this.quests.get(id);
                if (quest) {
                    completed.push(quest);
                }
            }
        }

        return completed;
    }

    public canAcceptQuest(questId: string): { canAccept: boolean; reason?: string } {
        const quest = this.quests.get(questId);
        if (!quest) {
            return { canAccept: false, reason: '任务不存在' };
        }

        // 检查是否已接受
        const progress = this.progress.get(questId);
        if (progress && progress.state === QuestState.IN_PROGRESS) {
            return { canAccept: false, reason: '任务已进行中' };
        }

        // 检查是否已完成（不可重复）
        if (!quest.repeatable && this.completedQuests.has(questId)) {
            return { canAccept: false, reason: '任务已完成' };
        }

        // 检查前置任务
        if (!this.arePrerequisitesMet(questId)) {
            return { canAccept: false, reason: '前置任务未完成' };
        }

        // 检查任务数量上限
        const activeCount = this.getActiveQuests().length;
        if (activeCount >= QUEST_CONFIG.MAX_ACTIVE_QUESTS) {
            return { canAccept: false, reason: '任务数量已达上限' };
        }

        return { canAccept: true };
    }

    public arePrerequisitesMet(questId: string): boolean {
        const quest = this.quests.get(questId);
        if (!quest) return false;

        return quest.prerequisites.every(prereqId => this.completedQuests.has(prereqId));
    }

    // ========== 奖励执行器 ==========

    public setRewardExecutor(executor: IRewardExecutor): void {
        this.rewardExecutor = executor;
    }

    // ========== 时间处理 ==========

    public checkTimeLimits(): void {
        const now = Date.now();

        for (const [questId, progress] of this.progress) {
            if (progress.state !== QuestState.IN_PROGRESS) continue;

            if (progress.deadline && now >= progress.deadline) {
                progress.state = QuestState.FAILED;

                EventSystem.getInstance().emit<QuestFailedPayload>(QuestEvents.FAILED, {
                    questId,
                    reason: '任务超时'
                });
            }
        }
    }

    public refreshDailyQuests(): void {
        // 重置可重复的日常任务
        for (const [id, quest] of this.quests) {
            if (quest.type === QuestType.DAILY && quest.repeatable) {
                const progress = this.progress.get(id);
                if (progress && progress.state === QuestState.FAILED) {
                    this.progress.delete(id);
                }
            }
        }

        this.lastDailyReset = Date.now();
    }

    // ========== 存档 ==========

    public exportData(): QuestSystemData {
        const progressRecord: Record<string, QuestProgress> = {};

        for (const [id, progress] of this.progress) {
            progressRecord[id] = {
                ...progress,
                objectives: progress.objectives.map(obj => ({ ...obj }))
            };
        }

        return {
            progress: progressRecord,
            completedQuests: [...this.completedQuests],
            lastDailyReset: this.lastDailyReset
        };
    }

    public importData(data: QuestSystemData): void {
        this.progress.clear();

        for (const [id, progress] of Object.entries(data.progress)) {
            this.progress.set(id, {
                ...progress,
                objectives: progress.objectives.map(obj => ({ ...obj }))
            });
        }

        this.completedQuests = new Set(data.completedQuests);
        this.lastDailyReset = data.lastDailyReset;
    }

    public reset(): void {
        this.progress.clear();
        this.completedQuests.clear();
        this.lastDailyReset = 0;
    }

    // ========== 私有方法 ==========

    /**
     * 检查初始进度（已有物品）
     */
    private checkInitialProgress(quest: Quest): void {
        const progress = this.progress.get(quest.id);
        if (!progress) return;

        const backpack = BackpackSystem.getInstance();

        for (const obj of progress.objectives) {
            if (obj.type === ObjectiveType.COLLECT) {
                // 检查背包中已有物品
                const currentCount = backpack.getItemCount(obj.targetId);
                if (currentCount > 0) {
                    obj.currentAmount = Math.min(currentCount, obj.requiredAmount);
                }
            }
        }
    }

    /**
     * 执行奖励
     */
    private executeRewards(rewards: Reward[]): void {
        const backpack = BackpackSystem.getInstance();
        const recipeSystem = RecipeSystem.getInstance();

        for (const reward of rewards) {
            switch (reward.type) {
                case RewardType.ITEM:
                    if (reward.itemId) {
                        backpack.addItem(reward.itemId, ItemType.MATERIAL, reward.amount);
                    }
                    break;

                case RewardType.FRIENDSHIP:
                    if (this.rewardExecutor && reward.npcId) {
                        this.rewardExecutor.changeFriendship(reward.npcId, reward.amount);
                    }
                    break;

                case RewardType.RECIPE:
                    if (reward.itemId) {
                        recipeSystem.unlockRecipe(reward.itemId);
                    }
                    break;

                case RewardType.AREA_UNLOCK:
                    if (this.rewardExecutor && reward.itemId) {
                        this.rewardExecutor.unlockArea(reward.itemId);
                    }
                    break;
            }
        }
    }
}

/**
 * 全局任务系统实例
 */
export const questSystem = QuestSystem.getInstance();
