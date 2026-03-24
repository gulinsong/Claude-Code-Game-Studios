/**
 * 体力系统 - 资源调节器
 *
 * 参考: design/gdd/stamina-system.md
 *
 * 体力系统控制游戏节奏，通过体力消耗限制单次游玩时长。
 * 体力自然恢复 + 道具补充模式。
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 体力状态
 */
export enum StaminaState {
    /** 体力满 */
    FULL = 'FULL',
    /** 正常状态 */
    NORMAL = 'NORMAL',
    /** 低体力 (<=20%) */
    LOW = 'LOW',
    /** 体力耗尽 */
    EXHAUSTED = 'EXHAUSTED'
}

/**
 * 体力事件 Payload 类型
 */
export interface StaminaChangedPayload {
    /** 变化前的体力 */
    old: number;
    /** 变化后的体力 */
    new: number;
    /** 变化量（正数为恢复，负数为消耗） */
    delta: number;
}

export interface StaminaExhaustedPayload {
    /** 当前体力 */
    current: number;
}

export interface StaminaFullPayload {
    /** 当前体力 */
    current: number;
}

export interface StaminaLowPayload {
    /** 当前体力 */
    current: number;
    /** 低体力阈值 */
    threshold: number;
}

export interface StaminaRestoredPayload {
    /** 恢复量 */
    amount: number;
    /** 恢复来源 */
    source: string;
}

/**
 * 体力事件 ID
 */
export const StaminaEvents = {
    CHANGED: 'stamina:changed',
    EXHAUSTED: 'stamina:exhausted',
    FULL: 'stamina:full',
    LOW: 'stamina:low',
    RESTORED: 'stamina:restored'
} as const;

/**
 * 体力系统配置
 */
const STAMINA_CONFIG = {
    /** 初始体力上限 */
    INITIAL_MAX_STAMINA: 100,
    /** 最大体力上限 */
    MAX_STAMINA_CAP: 150,
    /** 恢复间隔（分钟/点） */
    RECOVERY_INTERVAL_MINUTES: 3,
    /** 低体力阈值（百分比） */
    LOW_STAMINA_THRESHOLD_PERCENT: 0.2
};

/**
 * 体力数据（用于存档）
 */
export interface StaminaData {
    /** 当前体力 */
    current: number;
    /** 体力上限 */
    max: number;
    /** 上次更新时间戳（毫秒） */
    lastUpdateTime: number;
}

/**
 * 消耗体力结果
 */
export interface ConsumeResult {
    /** 是否成功 */
    success: boolean;
    /** 消耗前的体力 */
    previous: number;
    /** 消耗后的体力 */
    current: number;
    /** 实际消耗量（如果失败则为0） */
    consumed: number;
}

/**
 * 恢复体力结果
 */
export interface RestoreResult {
    /** 恢复前的体力 */
    previous: number;
    /** 恢复后的体力 */
    current: number;
    /** 实际恢复量（可能少于请求量，因为上限限制） */
    restored: number;
    /** 溢出量（超过上限的部分） */
    overflow: number;
}

/**
 * 体力系统接口
 */
export interface IStaminaSystem {
    /** 消耗体力 */
    consumeStamina(amount: number): ConsumeResult;
    /** 恢复体力 */
    restoreStamina(amount: number, source: string): RestoreResult;
    /** 获取当前体力 */
    getCurrentStamina(): number;
    /** 获取体力上限 */
    getMaxStamina(): number;
    /** 获取体力百分比 (0-1) */
    getStaminaPercent(): number;
    /** 获取完全恢复需要的分钟数 */
    getTimeToFull(): number;
    /** 获取当前体力状态 */
    getStaminaState(): StaminaState;
    /** 检查是否有足够体力 */
    hasEnoughStamina(amount: number): boolean;
    /** 扩展体力上限 */
    expandMaxStamina(amount: number): boolean;
    /** 更新离线恢复 */
    updateOfflineRecovery(): void;
    /** 每日重置（恢复至满） */
    dailyReset(): void;
    /** 导出数据（用于存档） */
    exportData(): StaminaData;
    /** 导入数据（用于读档） */
    importData(data: StaminaData): void;
    /** 重置到初始状态 */
    reset(): void;
}

/**
 * 体力系统实现
 */
export class StaminaSystem implements IStaminaSystem {
    private static instance: StaminaSystem | null = null;

    /** 当前体力 */
    private currentStamina: number = STAMINA_CONFIG.INITIAL_MAX_STAMINA;
    /** 体力上限 */
    private maxStamina: number = STAMINA_CONFIG.INITIAL_MAX_STAMINA;
    /** 上次更新时间（毫秒） */
    private lastUpdateTime: number = Date.now();

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): StaminaSystem {
        if (!StaminaSystem.instance) {
            StaminaSystem.instance = new StaminaSystem();
        }
        return StaminaSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        StaminaSystem.instance = null;
    }

    /**
     * 消耗体力
     */
    public consumeStamina(amount: number): ConsumeResult {
        // 边界检查
        if (amount <= 0) {
            console.warn('[StaminaSystem] Invalid amount:', amount);
            return {
                success: false,
                previous: this.currentStamina,
                current: this.currentStamina,
                consumed: 0
            };
        }

        const previous = this.currentStamina;

        // 检查是否有足够体力
        if (this.currentStamina < amount) {
            return {
                success: false,
                previous,
                current: this.currentStamina,
                consumed: 0
            };
        }

        // 扣除体力
        this.currentStamina -= amount;
        this.lastUpdateTime = Date.now();

        // 发布事件
        this.emitChanged(previous, this.currentStamina, -amount);

        // 检查是否耗尽
        if (this.currentStamina === 0) {
            this.emitExhausted();
        } else if (this.getStaminaState() === StaminaState.LOW) {
            this.emitLow();
        }

        return {
            success: true,
            previous,
            current: this.currentStamina,
            consumed: amount
        };
    }

    /**
     * 恢复体力
     */
    public restoreStamina(amount: number, source: string): RestoreResult {
        // 边界检查
        if (amount <= 0) {
            console.warn('[StaminaSystem] Invalid amount:', amount);
            return {
                previous: this.currentStamina,
                current: this.currentStamina,
                restored: 0,
                overflow: 0
            };
        }

        const previous = this.currentStamina;
        const availableSpace = this.maxStamina - this.currentStamina;
        const actualRestore = Math.min(amount, availableSpace);
        const overflow = amount - actualRestore;

        this.currentStamina += actualRestore;
        this.lastUpdateTime = Date.now();

        // 发布事件
        if (actualRestore > 0) {
            this.emitChanged(previous, this.currentStamina, actualRestore);
            this.emitRestored(actualRestore, source);

            // 检查是否满了
            if (this.currentStamina === this.maxStamina) {
                this.emitFull();
            }
        }

        return {
            previous,
            current: this.currentStamina,
            restored: actualRestore,
            overflow
        };
    }

    /**
     * 获取当前体力
     */
    public getCurrentStamina(): number {
        return this.currentStamina;
    }

    /**
     * 获取体力上限
     */
    public getMaxStamina(): number {
        return this.maxStamina;
    }

    /**
     * 获取体力百分比 (0-1)
     */
    public getStaminaPercent(): number {
        return this.currentStamina / this.maxStamina;
    }

    /**
     * 获取完全恢复需要的分钟数
     */
    public getTimeToFull(): number {
        if (this.currentStamina >= this.maxStamina) {
            return 0;
        }

        const needed = this.maxStamina - this.currentStamina;
        return needed * STAMINA_CONFIG.RECOVERY_INTERVAL_MINUTES;
    }

    /**
     * 获取当前体力状态
     */
    public getStaminaState(): StaminaState {
        if (this.currentStamina === 0) {
            return StaminaState.EXHAUSTED;
        }

        if (this.currentStamina === this.maxStamina) {
            return StaminaState.FULL;
        }

        const threshold = Math.floor(this.maxStamina * STAMINA_CONFIG.LOW_STAMINA_THRESHOLD_PERCENT);
        if (this.currentStamina <= threshold) {
            return StaminaState.LOW;
        }

        return StaminaState.NORMAL;
    }

    /**
     * 检查是否有足够体力
     */
    public hasEnoughStamina(amount: number): boolean {
        return this.currentStamina >= amount;
    }

    /**
     * 扩展体力上限
     */
    public expandMaxStamina(amount: number): boolean {
        if (amount <= 0) {
            console.warn('[StaminaSystem] Invalid amount:', amount);
            return false;
        }

        const newMax = this.maxStamina + amount;

        if (newMax > STAMINA_CONFIG.MAX_STAMINA_CAP) {
            console.warn('[StaminaSystem] Cannot exceed max stamina cap:', STAMINA_CONFIG.MAX_STAMINA_CAP);
            return false;
        }

        this.maxStamina = newMax;
        return true;
    }

    /**
     * 更新离线恢复
     */
    public updateOfflineRecovery(): void {
        const now = Date.now();
        const offlineMs = now - this.lastUpdateTime;
        const offlineMinutes = offlineMs / (1000 * 60);

        // 计算恢复的体力
        const recoveredStamina = Math.floor(offlineMinutes / STAMINA_CONFIG.RECOVERY_INTERVAL_MINUTES);
        const actualRecover = Math.min(recoveredStamina, this.maxStamina - this.currentStamina);

        if (actualRecover > 0) {
            const previous = this.currentStamina;
            this.currentStamina += actualRecover;

            this.emitChanged(previous, this.currentStamina, actualRecover);
            this.emitRestored(actualRecover, 'offline');

            if (this.currentStamina === this.maxStamina) {
                this.emitFull();
            }
        }

        this.lastUpdateTime = now;
    }

    /**
     * 每日重置（恢复至满）
     */
    public dailyReset(): void {
        if (this.currentStamina === this.maxStamina) {
            // 已满，不做任何事
            return;
        }

        const previous = this.currentStamina;
        this.currentStamina = this.maxStamina;
        this.lastUpdateTime = Date.now();

        this.emitChanged(previous, this.currentStamina, this.maxStamina - previous);
        this.emitRestored(this.maxStamina - previous, 'daily_reset');
        this.emitFull();
    }

    /**
     * 导出数据
     */
    public exportData(): StaminaData {
        return {
            current: this.currentStamina,
            max: this.maxStamina,
            lastUpdateTime: this.lastUpdateTime
        };
    }

    /**
     * 导入数据
     */
    public importData(data: StaminaData): void {
        // 先限制最大上限
        this.maxStamina = Math.min(data.max, STAMINA_CONFIG.MAX_STAMINA_CAP);
        // 再限制当前体力（不超过新的上限）
        this.currentStamina = Math.max(0, Math.min(data.current, this.maxStamina));
        this.lastUpdateTime = data.lastUpdateTime;
    }

    /**
     * 重置到初始状态
     */
    public reset(): void {
        this.currentStamina = STAMINA_CONFIG.INITIAL_MAX_STAMINA;
        this.maxStamina = STAMINA_CONFIG.INITIAL_MAX_STAMINA;
        this.lastUpdateTime = Date.now();
    }

    /**
     * 发布体力变化事件
     */
    private emitChanged(old: number, newStamina: number, delta: number): void {
        EventSystem.getInstance().emit<StaminaChangedPayload>(StaminaEvents.CHANGED, {
            old,
            new: newStamina,
            delta
        });
    }

    /**
     * 发布体力耗尽事件
     */
    private emitExhausted(): void {
        EventSystem.getInstance().emit<StaminaExhaustedPayload>(StaminaEvents.EXHAUSTED, {
            current: this.currentStamina
        });
    }

    /**
     * 发布体力满事件
     */
    private emitFull(): void {
        EventSystem.getInstance().emit<StaminaFullPayload>(StaminaEvents.FULL, {
            current: this.currentStamina
        });
    }

    /**
     * 发布低体力警告事件
     */
    private emitLow(): void {
        EventSystem.getInstance().emit<StaminaLowPayload>(StaminaEvents.LOW, {
            current: this.currentStamina,
            threshold: Math.floor(this.maxStamina * STAMINA_CONFIG.LOW_STAMINA_THRESHOLD_PERCENT)
        });
    }

    /**
     * 发布恢复事件
     */
    private emitRestored(amount: number, source: string): void {
        EventSystem.getInstance().emit<StaminaRestoredPayload>(StaminaEvents.RESTORED, {
            amount,
            source
        });
    }
}

/**
 * 全局体力系统实例
 */
export const staminaSystem = StaminaSystem.getInstance();
