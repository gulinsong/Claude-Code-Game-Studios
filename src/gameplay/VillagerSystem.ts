/**
 * 村民关系系统 - 玩家与 NPC 之间的情感纽带
 *
 * 参考: design/gdd/villager-system.md
 *
 * 管理玩家与每个 NPC 之间的好感度、关系等级和互动历史。
 * 支持送礼、对话、任务奖励等好感度来源。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem } from '../data/BackpackSystem';

/**
 * 村民性格类型
 */
export enum Personality {
    /** 温和 - 友善、耐心 */
    GENTLE = 'GENTLE',
    /** 热情 - 开朗、活泼 */
    ENTHUSIASTIC = 'ENTHUSIASTIC',
    /** 内向 - 害羞、细腻 */
    INTROVERTED = 'INTROVERTED',
    /** 古板 - 严肃、传统 */
    TRADITIONAL = 'TRADITIONAL',
    /** 顽皮 - 调皮、爱玩 */
    PLAYFUL = 'PLAYFUL'
}

/**
 * 送礼反应类型
 */
export enum GiftReaction {
    /** 喜欢 */
    LIKE = 'LIKE',
    /** 普通 */
    NORMAL = 'NORMAL',
    /** 不喜欢 */
    DISLIKE = 'DISLIKE'
}

/**
 * 关系状态
 */
export enum RelationshipStatus {
    /** 未见面 */
    UNMET = 'UNMET',
    /** 已认识 */
    ACQUAINTED = 'ACQUAINTED',
    /** 朋友 (等级≥4) */
    FRIEND = 'FRIEND',
    /** 好友 (等级=5) */
    CLOSE_FRIEND = 'CLOSE_FRIEND'
}

/**
 * 村民行程安排
 */
export interface Schedule {
    /** 开始时间 (小时) */
    startHour: number;
    /** 结束时间 (小时) */
    endHour: number;
    /** 地点 ID */
    locationId: string;
}

/**
 * 村民定义
 */
export interface Villager {
    /** 村民唯一 ID */
    id: string;
    /** 显示名称 */
    name: string;
    /** 头像资源路径 */
    avatar: string;
    /** 性格类型 */
    personality: Personality;
    /** 喜欢的物品 ID 列表 */
    likes: string[];
    /** 不喜欢的物品 ID 列表 */
    dislikes: string[];
    /** 常驻地点 */
    location: string;
    /** 行程安排 */
    schedule: Schedule[];
}

/**
 * 关系状态
 */
export interface Relationship {
    /** 村民 ID */
    npcId: string;
    /** 好感度 (0-100) */
    friendship: number;
    /** 关系等级 (1-5) */
    level: number;
    /** 今日已送礼物数 */
    giftsToday: number;
    /** 上次送礼日期 (游戏天数) */
    lastGiftDate: number;
    /** 初次见面日期 (游戏天数) */
    metDate: number;
    /** 关系相关标志位 */
    flags: Record<string, boolean | number | string>;
}

/**
 * 送礼结果
 */
export interface GiftResult {
    /** 是否成功 */
    success: boolean;
    /** 反应类型 */
    reaction: GiftReaction;
    /** 好感度变化 */
    friendshipDelta: number;
    /** 失败原因 */
    reason?: string;
}

/**
 * 事件 Payload
 */
export interface VillagerMetPayload {
    npcId: string;
    npcName: string;
}

export interface VillagerFriendshipChangedPayload {
    npcId: string;
    oldFriendship: number;
    newFriendship: number;
    delta: number;
}

export interface VillagerLevelUpPayload {
    npcId: string;
    npcName: string;
    oldLevel: number;
    newLevel: number;
}

export interface VillagerGiftSentPayload {
    npcId: string;
    npcName: string;
    itemId: string;
    reaction: GiftReaction;
    friendshipDelta: number;
}

export interface VillagerMaxLevelPayload {
    npcId: string;
    npcName: string;
}

/**
 * 村民事件 ID
 */
export const VillagerEvents = {
    MET: 'villager:met',
    FRIENDSHIP_CHANGED: 'villager:friendship_changed',
    LEVEL_UP: 'villager:level_up',
    GIFT_SENT: 'villager:gift_sent',
    MAX_LEVEL: 'villager:max_level'
} as const;

/**
 * 系统配置
 */
const VILLAGER_CONFIG = {
    /** 最大好感度 */
    MAX_FRIENDSHIP: 100,
    /** 每日送礼上限 */
    DAILY_GIFT_LIMIT: 1,
    /** 喜欢物品好感度 */
    LIKE_GAIN: 10,
    /** 普通物品好感度 */
    NORMAL_GAIN: 5,
    /** 不喜欢物品好感度 */
    DISLIKE_GAIN: 1,
    /** 节日送礼倍率 */
    FESTIVAL_MULTIPLIER: 2,
    /** 等级阈值 */
    LEVEL_THRESHOLDS: [0, 20, 40, 70, 100]
};

/**
 * 等级名称
 */
const LEVEL_NAMES = ['陌生人', '认识', '熟人', '朋友', '好友'];

/**
 * 村民系统数据（用于存档）
 */
export interface VillagerSystemData {
    /** 各村民关系 */
    relationships: Record<string, Relationship>;
    /** 当前游戏天数 */
    currentGameDay: number;
}

/**
 * 时间系统接口（依赖注入）
 */
export interface ITimeProvider {
    /** 获取当前游戏天数 */
    getGameDay(): number;
    /** 是否是节日 */
    isFestivalDay(): boolean;
}

/**
 * 节日系统接口（依赖注入）
 */
export interface IFestivalProvider {
    /** 是否是节日当天 */
    isFestivalToday(): boolean;
}

/**
 * 村民系统接口
 */
export interface IVillagerSystem {
    // 村民注册
    /** 注册村民 */
    registerVillager(villager: Villager): void;
    /** 批量注册村民 */
    registerVillagers(villagers: Villager[]): void;
    /** 获取村民定义 */
    getVillager(id: string): Villager | null;

    // 关系管理
    /** 首次见面 */
    meetVillager(npcId: string): boolean;
    /** 获取关系状态 */
    getRelationship(npcId: string): Relationship | null;
    /** 获取好感度 */
    getFriendship(npcId: string): number;
    /** 获取关系等级 */
    getFriendshipLevel(npcId: string): number;
    /** 获取关系状态 */
    getRelationshipStatus(npcId: string): RelationshipStatus;
    /** 获取等级名称 */
    getLevelName(level: number): string;

    // 好感度操作
    /** 改变好感度 */
    changeFriendship(npcId: string, delta: number): boolean;

    // 送礼
    /** 是否可以送礼 */
    canSendGift(npcId: string): { canSend: boolean; reason?: string };
    /** 送礼 */
    sendGift(npcId: string, itemId: string): GiftResult;
    /** 获取送礼反应 */
    getGiftReaction(npcId: string, itemId: string): GiftReaction;

    // 查询
    /** 获取已认识的村民列表 */
    getMetVillagers(): Villager[];
    /** 获取所有村民列表 */
    getAllVillagers(): Villager[];
    /** 是否已认识 */
    hasMet(npcId: string): boolean;

    // 依赖注入
    /** 设置时间提供者 */
    setTimeProvider(provider: ITimeProvider): void;
    /** 设置节日提供者 */
    setFestivalProvider(provider: IFestivalProvider): void;

    // 每日处理
    /** 重置每日送礼次数 */
    resetDailyGifts(): void;
    /** 检查并处理每日重置 */
    checkDailyReset(): void;

    // 存档
    /** 导出数据 */
    exportData(): VillagerSystemData;
    /** 导入数据 */
    importData(data: VillagerSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 村民系统实现
 */
export class VillagerSystem implements IVillagerSystem {
    private static instance: VillagerSystem | null = null;

    /** 已注册的村民 */
    private villagers: Map<string, Villager> = new Map();

    /** 关系状态 */
    private relationships: Map<string, Relationship> = new Map();

    /** 时间提供者 */
    private timeProvider: ITimeProvider | null = null;

    /** 节日提供者 */
    private festivalProvider: IFestivalProvider | null = null;

    /** 当前游戏天数（用于每日重置检测） */
    private currentGameDay: number = 0;

    private constructor() {}

    public static getInstance(): VillagerSystem {
        if (!VillagerSystem.instance) {
            VillagerSystem.instance = new VillagerSystem();
        }
        return VillagerSystem.instance;
    }

    public static resetInstance(): void {
        VillagerSystem.instance = null;
    }

    // ========== 村民注册 ==========

    public registerVillager(villager: Villager): void {
        if (this.villagers.has(villager.id)) {
            console.warn('[VillagerSystem] Villager already registered:', villager.id);
            return;
        }
        this.villagers.set(villager.id, villager);
    }

    public registerVillagers(villagers: Villager[]): void {
        for (const villager of villagers) {
            this.registerVillager(villager);
        }
    }

    public getVillager(id: string): Villager | null {
        return this.villagers.get(id) || null;
    }

    // ========== 关系管理 ==========

    public meetVillager(npcId: string): boolean {
        const villager = this.villagers.get(npcId);
        if (!villager) {
            console.warn('[VillagerSystem] Villager not found:', npcId);
            return false;
        }

        // 已认识
        if (this.relationships.has(npcId)) {
            return false;
        }

        // 创建关系
        const gameDay = this.getGameDay();
        const relationship: Relationship = {
            npcId,
            friendship: 0,
            level: 1,
            giftsToday: 0,
            lastGiftDate: gameDay,
            metDate: gameDay,
            flags: {}
        };

        this.relationships.set(npcId, relationship);

        // 发布首次见面事件
        EventSystem.getInstance().emit<VillagerMetPayload>(VillagerEvents.MET, {
            npcId,
            npcName: villager.name
        });

        return true;
    }

    public getRelationship(npcId: string): Relationship | null {
        const rel = this.relationships.get(npcId);
        return rel ? { ...rel, flags: { ...rel.flags } } : null;
    }

    public getFriendship(npcId: string): number {
        const rel = this.relationships.get(npcId);
        return rel ? rel.friendship : 0;
    }

    public getFriendshipLevel(npcId: string): number {
        const rel = this.relationships.get(npcId);
        return rel ? rel.level : 0;
    }

    public getRelationshipStatus(npcId: string): RelationshipStatus {
        const rel = this.relationships.get(npcId);
        if (!rel) {
            return RelationshipStatus.UNMET;
        }

        if (rel.level >= 5) {
            return RelationshipStatus.CLOSE_FRIEND;
        }
        if (rel.level >= 4) {
            return RelationshipStatus.FRIEND;
        }
        return RelationshipStatus.ACQUAINTED;
    }

    public getLevelName(level: number): string {
        if (level < 1 || level > 5) {
            return '未知';
        }
        return LEVEL_NAMES[level - 1];
    }

    // ========== 好感度操作 ==========

    public changeFriendship(npcId: string, delta: number): boolean {
        const villager = this.villagers.get(npcId);
        const rel = this.relationships.get(npcId);

        if (!villager || !rel) {
            return false;
        }

        const oldFriendship = rel.friendship;
        const oldLevel = rel.level;

        // 计算新好感度
        rel.friendship = Math.max(0, Math.min(
            VILLAGER_CONFIG.MAX_FRIENDSHIP,
            rel.friendship + delta
        ));

        // 计算新等级
        rel.level = this.calculateLevel(rel.friendship);

        // 发布好感度变化事件
        if (oldFriendship !== rel.friendship) {
            EventSystem.getInstance().emit<VillagerFriendshipChangedPayload>(
                VillagerEvents.FRIENDSHIP_CHANGED,
                {
                    npcId,
                    oldFriendship,
                    newFriendship: rel.friendship,
                    delta
                }
            );
        }

        // 发布升级事件
        if (rel.level > oldLevel) {
            EventSystem.getInstance().emit<VillagerLevelUpPayload>(VillagerEvents.LEVEL_UP, {
                npcId,
                npcName: villager.name,
                oldLevel,
                newLevel: rel.level
            });

            // 达到最高等级
            if (rel.level === 5) {
                EventSystem.getInstance().emit<VillagerMaxLevelPayload>(VillagerEvents.MAX_LEVEL, {
                    npcId,
                    npcName: villager.name
                });
            }
        }

        return true;
    }

    // ========== 送礼 ==========

    public canSendGift(npcId: string): { canSend: boolean; reason?: string } {
        const villager = this.villagers.get(npcId);
        if (!villager) {
            return { canSend: false, reason: '村民不存在' };
        }

        const rel = this.relationships.get(npcId);
        if (!rel) {
            return { canSend: false, reason: '尚未认识此村民' };
        }

        // 检查是否同一天
        const gameDay = this.getGameDay();
        if (rel.lastGiftDate === gameDay && rel.giftsToday >= VILLAGER_CONFIG.DAILY_GIFT_LIMIT) {
            return { canSend: false, reason: '今天已经送过礼物了' };
        }

        return { canSend: true };
    }

    public sendGift(npcId: string, itemId: string): GiftResult {
        const villager = this.villagers.get(npcId);
        const rel = this.relationships.get(npcId);

        // 基础检查
        if (!villager || !rel) {
            return {
                success: false,
                reaction: GiftReaction.NORMAL,
                friendshipDelta: 0,
                reason: '村民不存在或未认识'
            };
        }

        // 检查是否可以送礼
        const canSend = this.canSendGift(npcId);
        if (!canSend.canSend) {
            return {
                success: false,
                reaction: GiftReaction.NORMAL,
                friendshipDelta: 0,
                reason: canSend.reason
            };
        }

        // 检查背包是否有物品
        const backpack = BackpackSystem.getInstance();
        if (backpack.getItemCount(itemId) < 1) {
            return {
                success: false,
                reaction: GiftReaction.NORMAL,
                friendshipDelta: 0,
                reason: '背包中没有这个物品'
            };
        }

        // 消耗物品
        backpack.removeItem(itemId, 1);

        // 计算好感度
        const reaction = this.getGiftReaction(npcId, itemId);
        let gain = VILLAGER_CONFIG.NORMAL_GAIN;

        switch (reaction) {
            case GiftReaction.LIKE:
                gain = VILLAGER_CONFIG.LIKE_GAIN;
                break;
            case GiftReaction.DISLIKE:
                gain = VILLAGER_CONFIG.DISLIKE_GAIN;
                break;
        }

        // 节日加成
        if (this.isFestivalDay()) {
            gain *= VILLAGER_CONFIG.FESTIVAL_MULTIPLIER;
        }

        // 更新送礼记录
        const gameDay = this.getGameDay();
        if (rel.lastGiftDate !== gameDay) {
            rel.giftsToday = 0;
            rel.lastGiftDate = gameDay;
        }
        rel.giftsToday++;

        // 增加好感度
        this.changeFriendship(npcId, gain);

        // 发布送礼事件
        EventSystem.getInstance().emit<VillagerGiftSentPayload>(VillagerEvents.GIFT_SENT, {
            npcId,
            npcName: villager.name,
            itemId,
            reaction,
            friendshipDelta: gain
        });

        return {
            success: true,
            reaction,
            friendshipDelta: gain
        };
    }

    public getGiftReaction(npcId: string, itemId: string): GiftReaction {
        const villager = this.villagers.get(npcId);
        if (!villager) {
            return GiftReaction.NORMAL;
        }

        if (villager.likes.includes(itemId)) {
            return GiftReaction.LIKE;
        }
        if (villager.dislikes.includes(itemId)) {
            return GiftReaction.DISLIKE;
        }
        return GiftReaction.NORMAL;
    }

    // ========== 查询 ==========

    public getMetVillagers(): Villager[] {
        const met: Villager[] = [];
        for (const [npcId] of this.relationships) {
            const villager = this.villagers.get(npcId);
            if (villager) {
                met.push(villager);
            }
        }
        return met;
    }

    public getAllVillagers(): Villager[] {
        return Array.from(this.villagers.values());
    }

    public hasMet(npcId: string): boolean {
        return this.relationships.has(npcId);
    }

    // ========== 依赖注入 ==========

    public setTimeProvider(provider: ITimeProvider): void {
        this.timeProvider = provider;
    }

    public setFestivalProvider(provider: IFestivalProvider): void {
        this.festivalProvider = provider;
    }

    // ========== 每日处理 ==========

    public resetDailyGifts(): void {
        for (const rel of this.relationships.values()) {
            rel.giftsToday = 0;
        }
    }

    public checkDailyReset(): void {
        const gameDay = this.getGameDay();
        if (gameDay !== this.currentGameDay) {
            this.resetDailyGifts();
            this.currentGameDay = gameDay;
        }
    }

    // ========== 存档 ==========

    public exportData(): VillagerSystemData {
        const relationshipsRecord: Record<string, Relationship> = {};

        for (const [id, rel] of this.relationships) {
            relationshipsRecord[id] = {
                ...rel,
                flags: { ...rel.flags }
            };
        }

        return {
            relationships: relationshipsRecord,
            currentGameDay: this.currentGameDay
        };
    }

    public importData(data: VillagerSystemData): void {
        this.relationships.clear();

        for (const [id, rel] of Object.entries(data.relationships)) {
            this.relationships.set(id, {
                ...rel,
                flags: { ...rel.flags }
            });
        }

        this.currentGameDay = data.currentGameDay;
    }

    public reset(): void {
        this.relationships.clear();
        this.currentGameDay = 0;
    }

    // ========== 私有方法 ==========

    /**
     * 计算关系等级
     */
    private calculateLevel(friendship: number): number {
        const thresholds = VILLAGER_CONFIG.LEVEL_THRESHOLDS;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (friendship >= thresholds[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    /**
     * 获取游戏天数
     */
    private getGameDay(): number {
        if (this.timeProvider) {
            return this.timeProvider.getGameDay();
        }
        // 默认返回 1
        return this.currentGameDay || 1;
    }

    /**
     * 是否是节日
     */
    private isFestivalDay(): boolean {
        if (this.festivalProvider) {
            return this.festivalProvider.isFestivalToday();
        }
        if (this.timeProvider) {
            return this.timeProvider.isFestivalDay();
        }
        return false;
    }
}

/**
 * 全局村民系统实例
 */
export const villagerSystem = VillagerSystem.getInstance();
