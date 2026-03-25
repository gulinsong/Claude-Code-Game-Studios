/**
 * 采集系统 - 资源获取核心
 *
 * 参考: design/gdd/gathering-system.md
 *
 * 采集系统让玩家通过点击采集点获取材料，不同区域、时段、季节有不同产出。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem, ItemType } from '../data/BackpackSystem';
import { StaminaSystem } from '../resource/StaminaSystem';
import { TimeSystem, Season, Period } from '../core/TimeSystem';

/**
 * 材料掉落配置
 */
export interface MaterialDrop {
    /** 材料ID */
    materialId: string;
    /** 权重（用于概率计算） */
    weight: number;
    /** 最小掉落数量 */
    minAmount: number;
    /** 最大掉落数量 */
    maxAmount: number;
    /** 季节限制（空=不限） */
    seasonRestriction: Season[];
    /** 时段限制（空=不限） */
    timeRestriction: Period[];
}

/**
 * 采集点配置
 */
export interface GatheringSpot {
    /** 采集点唯一ID */
    id: string;
    /** 显示名称 */
    name: string;
    /** 所在地点ID */
    locationId: string;
    /** 可产出材料列表 */
    materials: MaterialDrop[];
    /** 冷却时间（秒） */
    cooldown: number;
    /** 消耗体力 */
    staminaCost: number;
    /** 解锁条件 */
    unlockCondition: string;
}

/**
 * 采集点状态
 */
export enum GatheringSpotState {
    /** 可采集 */
    AVAILABLE = 'AVAILABLE',
    /** 冷却中 */
    COOLDOWN = 'COOLDOWN',
    /** 未解锁 */
    LOCKED = 'LOCKED'
}

/**
 * 采集点运行时状态
 */
export interface SpotRuntimeState {
    /** 采集点ID */
    spotId: string;
    /** 上次采集时间戳（毫秒） */
    lastGatherTime: number;
    /** 保底计数 */
    pityCounter: number;
}

/**
 * 采集结果
 */
export interface GatheringResult {
    /** 是否成功 */
    success: boolean;
    /** 失败原因 */
    reason?: 'INSUFFICIENT_STAMINA' | 'ON_COOLDOWN' | 'LOCKED' | 'NO_MATERIALS' | 'ERROR';
    /** 获得的材料 */
    materials: Array<{
        materialId: string;
        amount: number;
        isRare: boolean;
        isLegendary: boolean;
    }>;
    /** 消耗的体力 */
    staminaConsumed: number;
    /** 是否触发保底 */
    pityTriggered: boolean;
}

/**
 * 掉落物品
 */
export interface DroppedMaterial {
    materialId: string;
    amount: number;
    isRare: boolean;
    isLegendary: boolean;
}

/**
 * 采集事件 Payload 类型
 */
export interface GatheringStartedPayload {
    spotId: string;
    locationId: string;
}

export interface GatheringCompletedPayload {
    spotId: string;
    materials: DroppedMaterial[];
}

export interface GatheringRareDropPayload {
    spotId: string;
    materialId: string;
    rarity: 'RARE' | 'LEGENDARY';
}

export interface GatheringLegendaryDropPayload {
    spotId: string;
    materialId: string;
}

export interface GatheringPityTriggeredPayload {
    spotId: string;
}

/**
 * 采集事件 ID
 */
export const GatheringEvents = {
    STARTED: 'gathering:started',
    COMPLETED: 'gathering:completed',
    RARE_DROP: 'gathering:rare_drop',
    LEGENDARY_DROP: 'gathering:legendary_drop',
    PITY_TRIGGERED: 'gathering:pity_triggered'
} as const;

/**
 * 采集系统配置
 */
const GATHERING_CONFIG = {
    /** 保底阈值 */
    PITY_THRESHOLD: 50,
    /** 传说材料基础掉率 */
    LEGENDARY_BASE_RATE: 0.025,
    /** 稀有度倍率 */
    RARITY_MULTIPLIER: {
        COMMON: 1.0,
        RARE: 0.3,
        LEGENDARY: 0.05
    },
    /** 季节加成倍率 */
    SEASON_MULTIPLIER: 1.5
};

/**
 * 采集系统数据（用于存档）
 */
export interface GatheringSystemData {
    /** 各采集点状态 */
    spotStates: Record<string, SpotRuntimeState>;
    /** 全局保底计数（用于传说材料） */
    globalPityCounter: number;
}

/**
 * 采集系统接口
 */
export interface IGatheringSystem {
    /** 注册采集点 */
    registerSpot(spot: GatheringSpot): void;
    /** 批量注册采集点 */
    registerSpots(spots: GatheringSpot[]): void;
    /** 执行采集 */
    gather(spotId: string): GatheringResult;
    /** 检查采集点是否可用 */
    isAvailable(spotId: string): boolean;
    /** 获取采集点状态 */
    getSpotState(spotId: string): GatheringSpotState;
    /** 获取剩余冷却时间（秒） */
    getRemainingCooldown(spotId: string): number;
    /** 获取采集点配置 */
    getSpot(spotId: string): GatheringSpot | null;
    /** 获取所有采集点 */
    getAllSpots(): GatheringSpot[];
    /** 获取指定地点的采集点 */
    getSpotsByLocation(locationId: string): GatheringSpot[];
    /** 解锁采集点 */
    unlockSpot(spotId: string): boolean;
    /** 强制重置冷却（调试用） */
    forceResetCooldown(spotId: string): void;
    /** 导出数据（用于存档） */
    exportData(): GatheringSystemData;
    /** 导入数据（用于读档） */
    importData(data: GatheringSystemData): void;
    /** 重置所有状态 */
    reset(): void;
}

/**
 * 采集系统实现
 */
export class GatheringSystem implements IGatheringSystem {
    private static instance: GatheringSystem | null = null;

    /** 采集点配置 */
    private spots: Map<string, GatheringSpot> = new Map();
    /** 采集点运行时状态 */
    private spotStates: Map<string, SpotRuntimeState> = new Map();
    /** 已解锁的采集点 */
    private unlockedSpots: Set<string> = new Set();
    /** 全局保底计数 */
    private globalPityCounter: number = 0;

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): GatheringSystem {
        if (!GatheringSystem.instance) {
            GatheringSystem.instance = new GatheringSystem();
        }
        return GatheringSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        GatheringSystem.instance = null;
    }

    /**
     * 注册采集点
     */
    public registerSpot(spot: GatheringSpot): void {
        if (this.spots.has(spot.id)) {
            console.warn('[GatheringSystem] Spot already registered:', spot.id);
            return;
        }

        this.spots.set(spot.id, spot);

        // 初始化状态
        if (!this.spotStates.has(spot.id)) {
            this.spotStates.set(spot.id, {
                spotId: spot.id,
                lastGatherTime: 0,
                pityCounter: 0
            });
        }
    }

    /**
     * 批量注册采集点
     */
    public registerSpots(spots: GatheringSpot[]): void {
        for (const spot of spots) {
            this.registerSpot(spot);
        }
    }

    /**
     * 执行采集
     */
    public gather(spotId: string): GatheringResult {
        try {
            const spot = this.spots.get(spotId);
            const state = this.spotStates.get(spotId);

            if (!spot || !state) {
                return {
                    success: false,
                    reason: 'LOCKED',
                    materials: [],
                    staminaConsumed: 0,
                    pityTriggered: false
                };
            }

            // 检查是否解锁
            if (!this.unlockedSpots.has(spotId)) {
                return {
                    success: false,
                    reason: 'LOCKED',
                    materials: [],
                    staminaConsumed: 0,
                    pityTriggered: false
                };
            }

            // 检查冷却
            if (this.getSpotState(spotId) === GatheringSpotState.COOLDOWN) {
                return {
                    success: false,
                    reason: 'ON_COOLDOWN',
                    materials: [],
                    staminaConsumed: 0,
                    pityTriggered: false
                };
            }

            // 检查体力
            const staminaSystem = StaminaSystem.getInstance();
            if (!staminaSystem.hasEnoughStamina(spot.staminaCost)) {
                return {
                    success: false,
                    reason: 'INSUFFICIENT_STAMINA',
                    materials: [],
                    staminaConsumed: 0,
                    pityTriggered: false
                };
            }

            // 发布开始事件
            EventSystem.getInstance().emit<GatheringStartedPayload>(GatheringEvents.STARTED, {
                spotId,
                locationId: spot.locationId
            });

            // 消耗体力
            staminaSystem.consumeStamina(spot.staminaCost);

            // 计算掉落
            const drops = this.calculateDrops(spot);

            if (drops.length === 0) {
                return {
                    success: false,
                    reason: 'NO_MATERIALS',
                    materials: [],
                    staminaConsumed: spot.staminaCost,
                    pityTriggered: false
                };
            }

            // 添加材料到背包
            const backpackSystem = BackpackSystem.getInstance();
            for (const drop of drops) {
                try {
                    backpackSystem.addItem(drop.materialId, ItemType.MATERIAL, drop.amount);
                } catch (itemError) {
                    console.error('[GatheringSystem] Failed to add item:', drop.materialId, itemError);
                    // 继续处理其他物品
                }
            }

            // 更新采集点状态
            state.lastGatherTime = Date.now();

            // 检查是否有传说掉落
            const hasLegendary = drops.some(d => d.isLegendary);
            const hasRare = drops.some(d => d.isRare);

            // 发布事件
            EventSystem.getInstance().emit<GatheringCompletedPayload>(GatheringEvents.COMPLETED, {
                spotId,
                materials: drops
            });

            if (hasLegendary) {
                const legendary = drops.find(d => d.isLegendary);
                if (legendary) {
                    EventSystem.getInstance().emit<GatheringLegendaryDropPayload>(
                        GatheringEvents.LEGENDARY_DROP,
                        { spotId, materialId: legendary.materialId }
                    );
                }
            } else if (hasRare) {
                const rare = drops.find(d => d.isRare);
                if (rare) {
                    EventSystem.getInstance().emit<GatheringRareDropPayload>(GatheringEvents.RARE_DROP, {
                        spotId,
                        materialId: rare.materialId,
                        rarity: 'RARE'
                    });
                }
            }

            return {
                success: true,
                materials: drops,
                staminaConsumed: spot.staminaCost,
                pityTriggered: false
            };
        } catch (error) {
            console.error('[GatheringSystem] gather failed for spot:', spotId, error);
            return {
                success: false,
                reason: 'ERROR',
                materials: [],
                staminaConsumed: 0,
                pityTriggered: false
            };
        }
    }

    /**
     * 检查采集点是否可用
     */
    public isAvailable(spotId: string): boolean {
        return this.getSpotState(spotId) === GatheringSpotState.AVAILABLE;
    }

    /**
     * 获取采集点状态
     */
    public getSpotState(spotId: string): GatheringSpotState {
        if (!this.unlockedSpots.has(spotId)) {
            return GatheringSpotState.LOCKED;
        }

        const state = this.spotStates.get(spotId);
        const spot = this.spots.get(spotId);

        if (!state || !spot) {
            return GatheringSpotState.LOCKED;
        }

        const now = Date.now();
        const elapsed = (now - state.lastGatherTime) / 1000;

        if (elapsed < spot.cooldown) {
            return GatheringSpotState.COOLDOWN;
        }

        return GatheringSpotState.AVAILABLE;
    }

    /**
     * 获取剩余冷却时间（秒）
     */
    public getRemainingCooldown(spotId: string): number {
        const state = this.spotStates.get(spotId);
        const spot = this.spots.get(spotId);

        if (!state || !spot) {
            return 0;
        }

        const now = Date.now();
        const elapsed = (now - state.lastGatherTime) / 1000;
        const remaining = spot.cooldown - elapsed;

        return Math.max(0, remaining);
    }

    /**
     * 获取采集点配置
     */
    public getSpot(spotId: string): GatheringSpot | null {
        return this.spots.get(spotId) || null;
    }

    /**
     * 获取所有采集点
     */
    public getAllSpots(): GatheringSpot[] {
        return Array.from(this.spots.values());
    }

    /**
     * 获取指定地点的采集点
     */
    public getSpotsByLocation(locationId: string): GatheringSpot[] {
        return this.getAllSpots().filter(s => s.locationId === locationId);
    }

    /**
     * 解锁采集点
     */
    public unlockSpot(spotId: string): boolean {
        if (!this.spots.has(spotId)) {
            return false;
        }

        return this.unlockedSpots.add(spotId).has(spotId);
    }

    /**
     * 强制重置冷却（调试用）
     */
    public forceResetCooldown(spotId: string): void {
        const state = this.spotStates.get(spotId);
        if (state) {
            state.lastGatherTime = 0;
        }
    }

    /**
     * 导出数据
     */
    public exportData(): GatheringSystemData {
        const spotStatesRecord: Record<string, SpotRuntimeState> = {};
        for (const [id, state] of this.spotStates) {
            spotStatesRecord[id] = { ...state };
        }

        return {
            spotStates: spotStatesRecord,
            globalPityCounter: this.globalPityCounter
        };
    }

    /**
     * 导入数据
     */
    public importData(data: GatheringSystemData): void {
        this.spotStates.clear();
        for (const [id, state] of Object.entries(data.spotStates)) {
            this.spotStates.set(id, { ...state });
        }
        this.globalPityCounter = data.globalPityCounter || 0;

        // 确保所有已注册的采集点都有状态
        for (const id of this.spots.keys()) {
            if (!this.spotStates.has(id)) {
                this.spotStates.set(id, {
                    spotId: id,
                    lastGatherTime: 0,
                    pityCounter: 0
                });
            }
        }
    }

    /**
     * 重置所有状态
     */
    public reset(): void {
        for (const [id] of this.spotStates) {
            this.spotStates.set(id, {
                spotId: id,
                lastGatherTime: 0,
                pityCounter: 0
            });
        }
        this.unlockedSpots.clear();
        this.globalPityCounter = 0;
    }

    /**
     * 计算掉落
     */
    private calculateDrops(spot: GatheringSpot): DroppedMaterial[] {
        const timeSystem = TimeSystem.getInstance();
        const currentSeason = timeSystem.getCurrentSeason();
        const currentPeriod = timeSystem.getCurrentPeriod();

        // 筛选符合条件的材料
        const eligibleMaterials = spot.materials.filter(m => {
            // 检查季节限制
            if (m.seasonRestriction.length > 0 && !m.seasonRestriction.includes(currentSeason)) {
                return false;
            }
            // 检查时段限制
            if (m.timeRestriction.length > 0 && !m.timeRestriction.includes(currentPeriod)) {
                return false;
            }
            return true;
        });

        if (eligibleMaterials.length === 0) {
            return [];
        }

        // 计算总权重
        const totalWeight = eligibleMaterials.reduce((sum, m) => sum + m.weight, 0);

        // 随机选择材料（加权随机）
        const drops: DroppedMaterial[] = [];
        const random = Math.random() * totalWeight;
        let cumulative = 0;

        for (const material of eligibleMaterials) {
            cumulative += material.weight;
            if (random < cumulative) {
                // 计算掉落数量
                const amount =
                    Math.floor(Math.random() * (material.maxAmount - material.minAmount + 1)) +
                    material.minAmount;

                // 这里简化处理，假设材料稀有度由材料ID前缀决定
                // 实际应该从材料系统获取稀有度
                const isLegendary = material.materialId.includes('legendary');
                const isRare = material.materialId.includes('rare') || isLegendary;

                drops.push({
                    materialId: material.materialId,
                    amount,
                    isRare,
                    isLegendary
                });

                break;
            }
        }

        // 检查保底
        this.globalPityCounter++;
        if (this.globalPityCounter >= GATHERING_CONFIG.PITY_THRESHOLD) {
            // 触发保底，确保掉落一个传说材料（如果有配置的话）
            const legendaryMaterials = eligibleMaterials.filter(m =>
                m.materialId.includes('legendary')
            );
            if (legendaryMaterials.length > 0 && !drops.some(d => d.isLegendary)) {
                const legendary = legendaryMaterials[0];
                const amount =
                    Math.floor(Math.random() * (legendary.maxAmount - legendary.minAmount + 1)) +
                    legendary.minAmount;

                drops.push({
                    materialId: legendary.materialId,
                    amount,
                    isRare: true,
                    isLegendary: true
                });

                EventSystem.getInstance().emit<GatheringPityTriggeredPayload>(
                    GatheringEvents.PITY_TRIGGERED,
                    { spotId: spot.id }
                );
            }
            this.globalPityCounter = 0;
        }

        // 如果掉落了传说材料，重置保底计数
        if (drops.some(d => d.isLegendary)) {
            this.globalPityCounter = 0;
        }

        return drops;
    }
}

/**
 * 全局采集系统实例
 */
export const gatheringSystem = GatheringSystem.getInstance();
