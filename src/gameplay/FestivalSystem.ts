/**
 * 节日筹备系统 - 核心循环驱动
 *
 * 参考: design/gdd/festival-system.md
 *
 * 围绕中国传统节日组织游戏节奏。每个节日分为准备期、庆典日、余韵期三个阶段。
 * 玩家在准备期收集材料、制作物品、布置场景，在庆典日参与活动、获得奖励。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem, ItemType } from '../data/BackpackSystem';

/**
 * 季节
 */
export enum Season {
    SPRING = 'SPRING',
    SUMMER = 'SUMMER',
    AUTUMN = 'AUTUMN',
    WINTER = 'WINTER'
}

/**
 * 节日阶段
 */
export enum FestivalPhase {
    /** 普通日 - 非节日期间 */
    NORMAL = 'NORMAL',
    /** 准备期 - 节日前 N 天 */
    PREPARATION = 'PREPARATION',
    /** 庆典日 - 节日当天 */
    CELEBRATION = 'CELEBRATION',
    /** 余韵期 - 节日后 1 天 */
    AFTERGLOW = 'AFTERGLOW'
}

/**
 * 节日任务类型
 */
export enum FestivalTaskType {
    /** 收集材料 */
    COLLECT = 'COLLECT',
    /** 制作物品 */
    CRAFT = 'CRAFT',
    /** 装饰场景 */
    DECORATE = 'DECORATE',
    /** 参与活动 */
    PARTICIPATE = 'PARTICIPATE'
}

/**
 * 奖励档次
 */
export enum RewardTier {
    /** 基础 - 0-49% */
    BASIC = 'BASIC',
    /** 良好 - 50-99% */
    GOOD = 'GOOD',
    /** 完美 - 100% */
    PERFECT = 'PERFECT'
}

/**
 * 节日任务定义
 */
export interface FestivalTaskDefinition {
    /** 任务 ID */
    id: string;
    /** 任务描述 */
    description: string;
    /** 任务类型 */
    type: FestivalTaskType;
    /** 目标 ID（物品/活动） */
    target: string;
    /** 所需数量 */
    requiredAmount: number;
    /** 贡献度 */
    contribution: number;
}

/**
 * 节日任务进度
 */
export interface FestivalTaskProgress extends FestivalTaskDefinition {
    /** 当前进度 */
    currentAmount: number;
    /** 是否已完成 */
    completed: boolean;
}

/**
 * 节日奖励
 */
export interface FestivalReward {
    /** 奖励类型 */
    type: 'ITEM' | 'RECIPE' | 'CURRENCY';
    /** 物品/食谱/货币 ID */
    id: string;
    /** 数量 */
    amount: number;
}

/**
 * 节日定义
 */
export interface FestivalDefinition {
    /** 节日唯一 ID */
    id: string;
    /** 节日名称 */
    name: string;
    /** 所属季节 */
    season: Season;
    /** 节日日期（年内第几天，1-28） */
    gameDay: number;
    /** 准备期天数 */
    prepDays: number;
    /** 节日描述 */
    description: string;
    /** 文化背景 */
    lore: string;
    /** 节日任务 */
    tasks: FestivalTaskDefinition[];
    /** 各档次奖励 */
    rewards: Record<RewardTier, FestivalReward[]>;
}

/**
 * 节日状态
 */
export interface FestivalState {
    /** 当前节日 ID */
    currentFestivalId: string | null;
    /** 当前阶段 */
    phase: FestivalPhase;
    /** 任务进度 */
    taskProgress: Map<string, FestivalTaskProgress>;
    /** 庆典小游戏参与次数 */
    celebrationPlayCount: number;
    /** 奖励是否已领取 */
    rewardsClaimed: boolean;
}

/**
 * 庆典小游戏结果
 */
export interface CelebrationResult {
    /** 是否成功 */
    success: boolean;
    /** 获得奖励 */
    rewards: FestivalReward[];
    /** 游戏分数 */
    score: number;
}

/**
 * 事件 Payload
 */
export interface FestivalApproachingPayload {
    festivalId: string;
    festivalName: string;
    daysUntil: number;
}

export interface FestivalStartedPayload {
    festivalId: string;
    festivalName: string;
}

export interface FestivalTaskCompletedPayload {
    festivalId: string;
    festivalName: string;
    taskId: string;
    contribution: number;
}

export interface FestivalCelebrationStartedPayload {
    festivalId: string;
    festivalName: string;
}

export interface FestivalEndedPayload {
    festivalId: string;
    festivalName: string;
    completionRate: number;
    tier: RewardTier;
}

export interface FestivalRewardClaimedPayload {
    festivalId: string;
    festivalName: string;
    tier: RewardTier;
    rewards: FestivalReward[];
}

/**
 * 节日事件 ID
 */
export const FestivalEvents = {
    APPROACHING: 'festival:approaching',
    STARTED: 'festival:started',
    TASK_COMPLETED: 'festival:task_completed',
    CELEBRATION_STARTED: 'festival:celebration_started',
    ENDED: 'festival:ended',
    REWARD_CLAIMED: 'festival:reward_claimed'
} as const;

/**
 * 系统配置
 */
const FESTIVAL_CONFIG = {
    /** 游戏年度天数 */
    DAYS_PER_YEAR: 28,
    /** 准备期默认天数 */
    DEFAULT_PREP_DAYS: 3,
    /** 良好档位阈值 */
    GOOD_TIER_THRESHOLD: 50,
    /** 完美档位阈值 */
    PERFECT_TIER_THRESHOLD: 100,
    /** 小游戏奖励递减率 */
    CELEBRATION_DECAY_RATE: 0.8,
    /** 小游戏最低奖励倍率 */
    MIN_CELEBRATION_MULTIPLIER: 0.3
};

/**
 * 节日系统数据（用于存档）
 */
export interface FestivalSystemData {
    /** 当前节日状态 */
    currentFestivalId: string | null;
    phase: FestivalPhase;
    taskProgress: Record<string, FestivalTaskProgress>;
    celebrationPlayCount: number;
    rewardsClaimed: boolean;
    /** 上次检查的游戏天数 */
    lastCheckedGameDay: number;
    /** 已完成的节日历史 */
    completedFestivals: Array<{
        festivalId: string;
        completionRate: number;
        tier: RewardTier;
        gameDay: number;
    }>;
}

/**
 * 时间系统接口（依赖注入）
 */
export interface ITimeProvider {
    /** 获取当前游戏天数（年内） */
    getGameDay(): number;
    /** 获取当前季节 */
    getSeason(): Season;
}

/**
 * 节日系统接口
 */
export interface IFestivalSystem {
    // 节日注册
    /** 注册节日 */
    registerFestival(festival: FestivalDefinition): void;
    /** 批量注册节日 */
    registerFestivals(festivals: FestivalDefinition[]): void;
    /** 获取节日定义 */
    getFestival(id: string): FestivalDefinition | null;

    // 状态查询
    /** 获取当前阶段 */
    getCurrentPhase(): FestivalPhase;
    /** 获取当前节日 */
    getCurrentFestival(): FestivalDefinition | null;
    /** 获取下一个节日 */
    getNextFestival(): FestivalDefinition | null;
    /** 获取距离下一个节日的天数 */
    getDaysUntilNextFestival(): number;
    /** 是否处于节日期间 */
    isFestivalPeriod(): boolean;

    // 任务系统
    /** 获取节日任务进度 */
    getTaskProgress(taskId: string): FestivalTaskProgress | null;
    /** 获取所有任务进度 */
    getAllTaskProgress(): FestivalTaskProgress[];
    /** 提交任务物品 */
    submitTask(taskId: string, amount: number): { success: boolean; reason?: string };
    /** 完成度计算 */
    getCompletionRate(): number;
    /** 获取奖励档次 */
    getRewardTier(): RewardTier;

    // 庆典系统
    /** 是否可以参与庆典 */
    canPlayCelebration(): boolean;
    /** 参与庆典小游戏 */
    playCelebrationGame(gameId: string): CelebrationResult;
    /** 获取庆典奖励倍率 */
    getCelebrationMultiplier(): number;

    // 奖励系统
    /** 领取节日奖励 */
    claimRewards(): FestivalReward[];
    /** 是否已领取奖励 */
    hasClaimedRewards(): boolean;

    // 系统更新
    /** 更新节日状态（每日调用） */
    update(): void;
    /** 强制进入指定阶段（调试用） */
    forcePhase(phase: FestivalPhase): void;
    /** 强制完成任务（调试/测试用） */
    forceTaskComplete(taskId: string): boolean;

    // 依赖注入
    /** 设置时间提供者 */
    setTimeProvider(provider: ITimeProvider): void;

    // 存档
    /** 导出数据 */
    exportData(): FestivalSystemData;
    /** 导入数据 */
    importData(data: FestivalSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 节日系统实现
 */
export class FestivalSystem implements IFestivalSystem {
    private static instance: FestivalSystem | null = null;

    /** 已注册的节日 */
    private festivals: Map<string, FestivalDefinition> = new Map();

    /** 节日状态 */
    private state: FestivalState = {
        currentFestivalId: null,
        phase: FestivalPhase.NORMAL,
        taskProgress: new Map(),
        celebrationPlayCount: 0,
        rewardsClaimed: false
    };

    /** 时间提供者 */
    private timeProvider: ITimeProvider | null = null;

    /** 上次检查的游戏天数 */
    private lastCheckedGameDay: number = 0;

    /** 已完成的节日历史 */
    private completedFestivals: Array<{
        festivalId: string;
        completionRate: number;
        tier: RewardTier;
        gameDay: number;
    }> = [];

    private constructor() {}

    public static getInstance(): FestivalSystem {
        if (!FestivalSystem.instance) {
            FestivalSystem.instance = new FestivalSystem();
        }
        return FestivalSystem.instance;
    }

    public static resetInstance(): void {
        FestivalSystem.instance = null;
    }

    // ========== 节日注册 ==========

    public registerFestival(festival: FestivalDefinition): void {
        if (this.festivals.has(festival.id)) {
            console.warn('[FestivalSystem] Festival already registered:', festival.id);
            return;
        }
        this.festivals.set(festival.id, festival);
    }

    public registerFestivals(festivals: FestivalDefinition[]): void {
        for (const festival of festivals) {
            this.registerFestival(festival);
        }
    }

    public getFestival(id: string): FestivalDefinition | null {
        return this.festivals.get(id) || null;
    }

    // ========== 状态查询 ==========

    public getCurrentPhase(): FestivalPhase {
        return this.state.phase;
    }

    public getCurrentFestival(): FestivalDefinition | null {
        if (!this.state.currentFestivalId) {
            return null;
        }
        return this.festivals.get(this.state.currentFestivalId) || null;
    }

    public getNextFestival(): FestivalDefinition | null {
        const currentDay = this.getGameDay();
        let nextFestival: FestivalDefinition | null = null;
        let minDaysUntil = Infinity;

        for (const festival of this.festivals.values()) {
            const daysUntil = this.calculateDaysUntil(festival.gameDay, currentDay);
            if (daysUntil > 0 && daysUntil < minDaysUntil) {
                minDaysUntil = daysUntil;
                nextFestival = festival;
            }
        }

        // 如果没有找到下一个节日，返回第一个节日（跨年）
        if (!nextFestival) {
            for (const festival of this.festivals.values()) {
                const daysUntil = this.calculateDaysUntil(festival.gameDay, currentDay);
                if (daysUntil < minDaysUntil) {
                    minDaysUntil = daysUntil;
                    nextFestival = festival;
                }
            }
        }

        return nextFestival;
    }

    public getDaysUntilNextFestival(): number {
        const nextFestival = this.getNextFestival();
        if (!nextFestival) {
            return -1;
        }

        const currentDay = this.getGameDay();
        return this.calculateDaysUntil(nextFestival.gameDay, currentDay);
    }

    public isFestivalPeriod(): boolean {
        return this.state.phase !== FestivalPhase.NORMAL;
    }

    // ========== 任务系统 ==========

    public getTaskProgress(taskId: string): FestivalTaskProgress | null {
        const progress = this.state.taskProgress.get(taskId);
        return progress ? { ...progress } : null;
    }

    public getAllTaskProgress(): FestivalTaskProgress[] {
        return Array.from(this.state.taskProgress.values()).map(p => ({ ...p }));
    }

    public submitTask(taskId: string, amount: number): { success: boolean; reason?: string } {
        const progress = this.state.taskProgress.get(taskId);
        if (!progress) {
            return { success: false, reason: '任务不存在' };
        }

        if (progress.completed) {
            return { success: false, reason: '任务已完成' };
        }

        if (this.state.phase !== FestivalPhase.PREPARATION) {
            return { success: false, reason: '当前不是准备期' };
        }

        // 检查背包物品（仅 COLLECT 类型）
        if (progress.type === FestivalTaskType.COLLECT) {
            const backpack = BackpackSystem.getInstance();
            const availableAmount = backpack.getItemCount(progress.target);
            if (availableAmount < amount) {
                return { success: false, reason: `背包中只有 ${availableAmount} 个，不够提交` };
            }
            // 扣除物品
            backpack.removeItem(progress.target, amount);
        }

        // 更新进度
        progress.currentAmount = Math.min(progress.currentAmount + amount, progress.requiredAmount);

        // 检查是否完成
        if (progress.currentAmount >= progress.requiredAmount) {
            progress.completed = true;

            const festival = this.getCurrentFestival();
            if (festival) {
                EventSystem.getInstance().emit<FestivalTaskCompletedPayload>(
                    FestivalEvents.TASK_COMPLETED,
                    {
                        festivalId: festival.id,
                        festivalName: festival.name,
                        taskId,
                        contribution: progress.contribution
                    }
                );
            }
        }

        return { success: true };
    }

    public getCompletionRate(): number {
        if (this.state.taskProgress.size === 0) {
            return 0;
        }

        let totalContribution = 0;
        let earnedContribution = 0;

        for (const task of this.state.taskProgress.values()) {
            totalContribution += task.contribution;
            if (task.completed) {
                earnedContribution += task.contribution;
            }
        }

        if (totalContribution === 0) {
            return 0;
        }

        return Math.floor((earnedContribution / totalContribution) * 100);
    }

    public getRewardTier(): RewardTier {
        const completionRate = this.getCompletionRate();

        if (completionRate >= FESTIVAL_CONFIG.PERFECT_TIER_THRESHOLD) {
            return RewardTier.PERFECT;
        }
        if (completionRate >= FESTIVAL_CONFIG.GOOD_TIER_THRESHOLD) {
            return RewardTier.GOOD;
        }
        return RewardTier.BASIC;
    }

    // ========== 庆典系统 ==========

    public canPlayCelebration(): boolean {
        return this.state.phase === FestivalPhase.CELEBRATION;
    }

    public playCelebrationGame(_gameId: string): CelebrationResult {
        if (!this.canPlayCelebration()) {
            return {
                success: false,
                rewards: [],
                score: 0
            };
        }

        // 模拟游戏结果
        const score = Math.floor(Math.random() * 100) + 50;
        const multiplier = this.getCelebrationMultiplier();

        // 基础奖励
        const baseRewards: FestivalReward[] = [
            { type: 'CURRENCY', id: 'coin', amount: Math.floor(50 * multiplier) }
        ];

        // 增加参与次数
        this.state.celebrationPlayCount++;

        return {
            success: true,
            rewards: baseRewards,
            score
        };
    }

    public getCelebrationMultiplier(): number {
        const count = this.state.celebrationPlayCount;
        const multiplier = Math.pow(FESTIVAL_CONFIG.CELEBRATION_DECAY_RATE, count);
        return Math.max(multiplier, FESTIVAL_CONFIG.MIN_CELEBRATION_MULTIPLIER);
    }

    // ========== 奖励系统 ==========

    public claimRewards(): FestivalReward[] {
        if (this.state.rewardsClaimed) {
            return [];
        }

        const festival = this.getCurrentFestival();
        if (!festival) {
            return [];
        }

        if (this.state.phase !== FestivalPhase.CELEBRATION &&
            this.state.phase !== FestivalPhase.AFTERGLOW) {
            return [];
        }

        const tier = this.getRewardTier();
        const rewards = festival.rewards[tier] || [];

        // 发放奖励到背包
        const backpack = BackpackSystem.getInstance();
        for (const reward of rewards) {
            if (reward.type === 'ITEM') {
                backpack.addItem(reward.id, ItemType.MATERIAL, reward.amount);
            }
            // CURRENCY 和 RECIPE 类型需要其他系统支持
        }

        this.state.rewardsClaimed = true;

        // 发布领取事件
        EventSystem.getInstance().emit<FestivalRewardClaimedPayload>(FestivalEvents.REWARD_CLAIMED, {
            festivalId: festival.id,
            festivalName: festival.name,
            tier,
            rewards
        });

        return rewards;
    }

    public hasClaimedRewards(): boolean {
        return this.state.rewardsClaimed;
    }

    // ========== 系统更新 ==========

    public update(): void {
        const currentDay = this.getGameDay();

        // 检查是否是新的游戏日
        if (currentDay === this.lastCheckedGameDay) {
            return;
        }

        this.lastCheckedGameDay = currentDay;

        // 查找当前应该的节日状态
        const festivalState = this.findCurrentFestivalState(currentDay);

        // 处理阶段变化
        this.handlePhaseTransition(festivalState);
    }

    public forcePhase(phase: FestivalPhase): void {
        this.state.phase = phase;
    }

    /**
     * 强制完成任务（调试/测试用）
     */
    public forceTaskComplete(taskId: string): boolean {
        const progress = this.state.taskProgress.get(taskId);
        if (!progress) {
            return false;
        }

        progress.currentAmount = progress.requiredAmount;
        progress.completed = true;

        const festival = this.getCurrentFestival();
        if (festival) {
            EventSystem.getInstance().emit<FestivalTaskCompletedPayload>(
                FestivalEvents.TASK_COMPLETED,
                {
                    festivalId: festival.id,
                    festivalName: festival.name,
                    taskId,
                    contribution: progress.contribution
                }
            );
        }

        return true;
    }

    // ========== 依赖注入 ==========

    public setTimeProvider(provider: ITimeProvider): void {
        this.timeProvider = provider;
    }

    // ========== 存档 ==========

    public exportData(): FestivalSystemData {
        const taskProgressRecord: Record<string, FestivalTaskProgress> = {};

        for (const [id, progress] of this.state.taskProgress) {
            taskProgressRecord[id] = { ...progress };
        }

        return {
            currentFestivalId: this.state.currentFestivalId,
            phase: this.state.phase,
            taskProgress: taskProgressRecord,
            celebrationPlayCount: this.state.celebrationPlayCount,
            rewardsClaimed: this.state.rewardsClaimed,
            lastCheckedGameDay: this.lastCheckedGameDay,
            completedFestivals: [...this.completedFestivals]
        };
    }

    public importData(data: FestivalSystemData): void {
        this.state.currentFestivalId = data.currentFestivalId;
        this.state.phase = data.phase;
        this.state.taskProgress = new Map();
        this.state.celebrationPlayCount = data.celebrationPlayCount;
        this.state.rewardsClaimed = data.rewardsClaimed;
        this.lastCheckedGameDay = data.lastCheckedGameDay;
        this.completedFestivals = [...data.completedFestivals];

        for (const [id, progress] of Object.entries(data.taskProgress)) {
            this.state.taskProgress.set(id, { ...progress });
        }
    }

    public reset(): void {
        this.state = {
            currentFestivalId: null,
            phase: FestivalPhase.NORMAL,
            taskProgress: new Map(),
            celebrationPlayCount: 0,
            rewardsClaimed: false
        };
        this.lastCheckedGameDay = 0;
        this.completedFestivals = [];
    }

    // ========== 私有方法 ==========

    /**
     * 获取当前游戏天数
     */
    private getGameDay(): number {
        if (this.timeProvider) {
            return this.timeProvider.getGameDay();
        }
        return this.lastCheckedGameDay || 1;
    }

    /**
     * 计算距离节日的天数
     */
    private calculateDaysUntil(festivalDay: number, currentDay: number): number {
        let days = festivalDay - currentDay;
        if (days < 0) {
            days += FESTIVAL_CONFIG.DAYS_PER_YEAR;
        }
        return days;
    }

    /**
     * 查找当前节日状态
     */
    private findCurrentFestivalState(currentDay: number): {
        festival: FestivalDefinition | null;
        phase: FestivalPhase;
    } {
        for (const festival of this.festivals.values()) {
            const festivalDay = festival.gameDay;
            const prepDays = festival.prepDays || FESTIVAL_CONFIG.DEFAULT_PREP_DAYS;

            // 准备期：节日前 N 天
            const prepStart = festivalDay - prepDays;
            if (currentDay >= prepStart && currentDay < festivalDay) {
                return { festival, phase: FestivalPhase.PREPARATION };
            }

            // 庆典日：节日当天
            if (currentDay === festivalDay) {
                return { festival, phase: FestivalPhase.CELEBRATION };
            }

            // 余韵期：节日后 1 天
            const afterglowDay = festivalDay + 1;
            const normalizedAfterglow = afterglowDay > FESTIVAL_CONFIG.DAYS_PER_YEAR
                ? afterglowDay - FESTIVAL_CONFIG.DAYS_PER_YEAR
                : afterglowDay;
            if (currentDay === normalizedAfterglow) {
                return { festival, phase: FestivalPhase.AFTERGLOW };
            }
        }

        return { festival: null, phase: FestivalPhase.NORMAL };
    }

    /**
     * 处理阶段转换
     */
    private handlePhaseTransition(newState: {
        festival: FestivalDefinition | null;
        phase: FestivalPhase;
    }): void {
        const oldPhase = this.state.phase;
        const newPhase = newState.phase;

        // 处理节日结束
        if (oldPhase !== FestivalPhase.NORMAL && newPhase === FestivalPhase.NORMAL) {
            const festival = this.getCurrentFestival();
            if (festival) {
                const completionRate = this.getCompletionRate();
                const tier = this.getRewardTier();

                // 记录完成的节日
                this.completedFestivals.push({
                    festivalId: festival.id,
                    completionRate,
                    tier,
                    gameDay: this.getGameDay()
                });

                // 发布结束事件
                EventSystem.getInstance().emit<FestivalEndedPayload>(FestivalEvents.ENDED, {
                    festivalId: festival.id,
                    festivalName: festival.name,
                    completionRate,
                    tier
                });
            }
        }

        // 更新状态
        const oldFestivalId = this.state.currentFestivalId;
        this.state.phase = newPhase;
        this.state.currentFestivalId = newState.festival?.id || null;

        // 新节日开始
        if (newState.festival && newState.festival.id !== oldFestivalId) {
            this.initializeFestivalTasks(newState.festival);
        }

        // 阶段转换事件
        if (oldPhase !== newPhase) {
            this.handlePhaseChangeEvent(oldPhase, newPhase, newState.festival);
        }
    }

    /**
     * 初始化节日任务
     */
    private initializeFestivalTasks(festival: FestivalDefinition): void {
        this.state.taskProgress.clear();
        this.state.celebrationPlayCount = 0;
        this.state.rewardsClaimed = false;

        for (const task of festival.tasks) {
            this.state.taskProgress.set(task.id, {
                ...task,
                currentAmount: 0,
                completed: false
            });
        }
    }

    /**
     * 处理阶段变化事件
     */
    private handlePhaseChangeEvent(
        _oldPhase: FestivalPhase,
        newPhase: FestivalPhase,
        festival: FestivalDefinition | null
    ): void {
        if (!festival) return;

        switch (newPhase) {
            case FestivalPhase.PREPARATION:
                EventSystem.getInstance().emit<FestivalApproachingPayload>(
                    FestivalEvents.APPROACHING,
                    {
                        festivalId: festival.id,
                        festivalName: festival.name,
                        daysUntil: festival.prepDays
                    }
                );
                break;

            case FestivalPhase.CELEBRATION:
                EventSystem.getInstance().emit<FestivalStartedPayload>(FestivalEvents.STARTED, {
                    festivalId: festival.id,
                    festivalName: festival.name
                });
                EventSystem.getInstance().emit<FestivalCelebrationStartedPayload>(
                    FestivalEvents.CELEBRATION_STARTED,
                    {
                        festivalId: festival.id,
                        festivalName: festival.name
                    }
                );
                break;
        }
    }
}

/**
 * 全局节日系统实例
 */
export const festivalSystem = FestivalSystem.getInstance();
