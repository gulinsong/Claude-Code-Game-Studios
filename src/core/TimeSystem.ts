/**
 * 时间系统 - 游戏内时间管理
 *
 * 参考: design/gdd/time-system.md
 */

import { EventSystem } from './EventSystem';

/**
 * 季节枚举
 */
export enum Season {
    SPRING = 'SPRING',  // 春
    SUMMER = 'SUMMER',  // 夏
    AUTUMN = 'AUTUMN',  // 秋
    WINTER = 'WINTER'   // 冬
}

/**
 * 时段枚举
 */
export enum Period {
    DAWN = 'DAWN',          // 黎明 5:00-6:00
    MORNING = 'MORNING',    // 早晨 6:00-12:00
    AFTERNOON = 'AFTERNOON', // 下午 12:00-18:00
    DUSK = 'DUSK',          // 黄昏 18:00-20:00
    NIGHT = 'NIGHT'         // 夜晚 20:00-5:00
}

/**
 * 时间系统配置
 */
export interface TimeConfig {
    /** 时间倍率（现实1分钟=游戏多少分钟） */
    timeScale: number;
    /** 每季节天数 */
    daysPerSeason: number;
    /** 每年天数 */
    daysPerYear: number;
    /** 最大离线计算小时数 */
    maxOfflineHours: number;
    /** 节日准备期天数 */
    festivalPrepDays: number;
}

/**
 * 时间状态
 */
export interface TimeState {
    /** 游戏小时 (0-24) */
    gameHour: number;
    /** 游戏分钟 (0-59) */
    gameMinute: number;
    /** 游戏日期 (1-28) */
    gameDay: number;
    /** 当前季节 */
    season: Season;
    /** 当前时段 */
    period: Period;
    /** 现实时间戳（毫秒） */
    realTimestamp: number;
    /** 时间倍率（加速道具） */
    speedMultiplier: number;
    /** 是否暂停 */
    isPaused: boolean;
}

/**
 * 节日定义
 */
export interface Festival {
    /** 节日ID */
    id: string;
    /** 节日名称 */
    name: string;
    /** 所在季节 */
    season: Season;
    /** 节日日期（季节内第几天，1-7） */
    dayInSeason: number;
}

/**
 * 时间事件 Payload
 */
export interface MinuteChangedPayload {
    gameHour: number;
    gameMinute: number;
}

export interface HourChangedPayload {
    gameHour: number;
}

export interface DayChangedPayload {
    gameDay: number;
    gameWeek: number;
    season: Season;
}

export interface SeasonChangedPayload {
    oldSeason: Season;
    newSeason: Season;
}

export interface PeriodChangedPayload {
    oldPeriod: Period;
    newPeriod: Period;
}

export interface FestivalApproachingPayload {
    festivalId: string;
    daysUntil: number;
}

export interface FestivalStartedPayload {
    festivalId: string;
}

export interface FestivalEndedPayload {
    festivalId: string;
}

/**
 * 时间事件 ID
 */
export const TimeEvents = {
    MINUTE_CHANGED: 'time:minute_changed',
    HOUR_CHANGED: 'time:hour_changed',
    DAY_CHANGED: 'time:day_changed',
    SEASON_CHANGED: 'time:season_changed',
    PERIOD_CHANGED: 'time:period_changed',
    FESTIVAL_APPROACHING: 'time:festival_approaching',
    FESTIVAL_STARTED: 'time:festival_started',
    FESTIVAL_ENDED: 'time:festival_ended'
} as const;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TimeConfig = {
    timeScale: 60,        // 现实1分钟 = 游戏60分钟（1小时）
    daysPerSeason: 7,
    daysPerYear: 28,
    maxOfflineHours: 24,
    festivalPrepDays: 3
};

/**
 * 季节名称映射
 */
export const SeasonNames: Record<Season, string> = {
    [Season.SPRING]: '春',
    [Season.SUMMER]: '夏',
    [Season.AUTUMN]: '秋',
    [Season.WINTER]: '冬'
};

/**
 * 时段名称映射
 */
export const PeriodNames: Record<Period, string> = {
    [Period.DAWN]: '黎明',
    [Period.MORNING]: '早晨',
    [Period.AFTERNOON]: '下午',
    [Period.DUSK]: '黄昏',
    [Period.NIGHT]: '夜晚'
};

/**
 * 默认节日配置
 */
const DEFAULT_FESTIVALS: Festival[] = [
    { id: 'qingming', name: '清明', season: Season.SPRING, dayInSeason: 7 },
    { id: 'duanwu', name: '端午', season: Season.SUMMER, dayInSeason: 7 },
    { id: 'zhongqiu', name: '中秋', season: Season.AUTUMN, dayInSeason: 7 },
    { id: 'chunjie', name: '春节', season: Season.WINTER, dayInSeason: 7 }
];

/**
 * 时间系统接口
 */
export interface ITimeSystem {
    /** 更新时间 */
    update(deltaMs: number): void;
    /** 获取当前游戏小时 */
    getGameHour(): number;
    /** 获取当前游戏分钟 */
    getGameMinute(): number;
    /** 获取当前游戏日期 */
    getGameDay(): number;
    /** 获取当前季节 */
    getCurrentSeason(): Season;
    /** 获取当前时段 */
    getCurrentPeriod(): Period;
    /** 获取格式化时间字符串 */
    getFormattedTime(): string;
    /** 获取星期几 (1-7) */
    getGameWeek(): number;
    /** 获取季节内第几天 (1-7) */
    getDayInSeason(): number;
    /** 获取距离节日天数 */
    getDaysUntilFestival(festivalId: string): number;
    /** 获取当前季节的节日 */
    getCurrentSeasonFestival(): Festival | undefined;
    /** 计算离线时间 */
    calculateOfflineTime(lastSaveTimestamp: number): number;
    /** 暂停时间 */
    pause(): void;
    /** 恢复时间 */
    resume(): void;
    /** 设置加速倍率 */
    setSpeedMultiplier(multiplier: number): void;
    /** 导出状态 */
    exportState(): TimeState;
    /** 导入状态 */
    importState(state: TimeState): void;
}

/**
 * 时间系统实现
 */
export class TimeSystem implements ITimeSystem {
    private static instance: TimeSystem | null = null;

    /** 配置 */
    private config: TimeConfig;
    /** 节日列表 */
    private festivals: Festival[];
    /** 当前状态 */
    private state: TimeState;
    /** 累积的游戏分钟数（用于 minute_changed 事件） */
    private accumulatedMinutes: number = 0;
    /** 当前节日状态 */
    private currentFestival: Festival | null = null;
    /** 节日是否已触发开始事件 */
    private festivalStarted: boolean = false;

    /**
     * 私有构造函数（单例模式）
     */
    private constructor(config: Partial<TimeConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.festivals = [...DEFAULT_FESTIVALS];
        this.state = this.createInitialState();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(config?: Partial<TimeConfig>): TimeSystem {
        if (!TimeSystem.instance) {
            TimeSystem.instance = new TimeSystem(config);
        }
        return TimeSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        TimeSystem.instance = null;
    }

    /**
     * 创建初始状态
     */
    private createInitialState(): TimeState {
        return {
            gameHour: 6,         // 从早晨6点开始
            gameMinute: 0,
            gameDay: 1,          // 第1天
            season: Season.SPRING,
            period: Period.MORNING,
            realTimestamp: Date.now(),
            speedMultiplier: 1,
            isPaused: false
        };
    }

    /**
     * 更新时间
     */
    public update(deltaMs: number): void {
        if (this.state.isPaused) {
            return;
        }

        // 输入验证
        if (!Number.isFinite(deltaMs) || deltaMs < 0) {
            console.warn('[TimeSystem] Invalid deltaMs:', deltaMs);
            return;
        }

        // 计算游戏时间增量
        // 现实 1 分钟 = 游戏 timeScale 分钟
        // 现实 1 毫秒 = 游戏 timeScale / 60000 分钟
        const gameMinutesDelta = (deltaMs / 60000) * this.config.timeScale * this.state.speedMultiplier;

        // 累积分钟
        this.accumulatedMinutes += gameMinutesDelta;

        // 每累积 1 分钟触发 minute_changed
        while (this.accumulatedMinutes >= 1) {
            this.accumulatedMinutes -= 1;
            this.advanceMinute();
        }

        // 更新现实时间戳
        this.state.realTimestamp = Date.now();
    }

    /**
     * 推进 1 游戏分钟
     */
    private advanceMinute(): void {
        this.state.gameMinute++;

        // 处理分钟进位
        if (this.state.gameMinute >= 60) {
            this.state.gameMinute = 0;
            this.advanceHour();
        }

        // 发布 minute_changed 事件
        EventSystem.getInstance().emit<MinuteChangedPayload>(TimeEvents.MINUTE_CHANGED, {
            gameHour: this.state.gameHour,
            gameMinute: this.state.gameMinute
        });
    }

    /**
     * 推进 1 游戏小时
     */
    private advanceHour(): void {
        const oldPeriod = this.state.period;

        this.state.gameHour++;

        // 发布 hour_changed 事件
        EventSystem.getInstance().emit<HourChangedPayload>(TimeEvents.HOUR_CHANGED, {
            gameHour: this.state.gameHour % 24
        });

        // 处理小时进位
        if (this.state.gameHour >= 24) {
            this.state.gameHour = 0;
            this.advanceDay();
        }

        // 检查时段变化
        this.updatePeriod();
        if (this.state.period !== oldPeriod) {
            EventSystem.getInstance().emit<PeriodChangedPayload>(TimeEvents.PERIOD_CHANGED, {
                oldPeriod,
                newPeriod: this.state.period
            });
        }
    }

    /**
     * 推进 1 游戏日
     */
    private advanceDay(): void {
        const oldSeason = this.state.season;

        this.state.gameDay++;

        // 发布 day_changed 事件
        EventSystem.getInstance().emit<DayChangedPayload>(TimeEvents.DAY_CHANGED, {
            gameDay: this.state.gameDay,
            gameWeek: this.getGameWeek(),
            season: this.state.season
        });

        // 处理日期进位（跨年）
        if (this.state.gameDay > this.config.daysPerYear) {
            this.state.gameDay = 1;
        }

        // 检查季节变化
        this.updateSeason();
        if (this.state.season !== oldSeason) {
            EventSystem.getInstance().emit<SeasonChangedPayload>(TimeEvents.SEASON_CHANGED, {
                oldSeason,
                newSeason: this.state.season
            });
        }

        // 检查节日
        this.checkFestival();
    }

    /**
     * 更新时段
     */
    private updatePeriod(): void {
        const hour = this.state.gameHour;

        if (hour >= 5 && hour < 6) {
            this.state.period = Period.DAWN;
        } else if (hour >= 6 && hour < 12) {
            this.state.period = Period.MORNING;
        } else if (hour >= 12 && hour < 18) {
            this.state.period = Period.AFTERNOON;
        } else if (hour >= 18 && hour < 20) {
            this.state.period = Period.DUSK;
        } else {
            this.state.period = Period.NIGHT;
        }
    }

    /**
     * 更新季节
     */
    private updateSeason(): void {
        const dayInYear = this.state.gameDay;
        const daysPerSeason = this.config.daysPerSeason;

        if (dayInYear <= daysPerSeason) {
            this.state.season = Season.SPRING;
        } else if (dayInYear <= daysPerSeason * 2) {
            this.state.season = Season.SUMMER;
        } else if (dayInYear <= daysPerSeason * 3) {
            this.state.season = Season.AUTUMN;
        } else {
            this.state.season = Season.WINTER;
        }
    }

    /**
     * 检查节日状态
     */
    private checkFestival(): void {
        const festival = this.getCurrentSeasonFestival();
        const dayInSeason = this.getDayInSeason();

        if (festival) {
            const daysUntil = festival.dayInSeason - dayInSeason;

            // 节日临近（准备期）
            if (daysUntil > 0 && daysUntil <= this.config.festivalPrepDays) {
                EventSystem.getInstance().emit<FestivalApproachingPayload>(
                    TimeEvents.FESTIVAL_APPROACHING,
                    { festivalId: festival.id, daysUntil }
                );
            }

            // 节日开始
            if (daysUntil === 0 && !this.festivalStarted) {
                this.currentFestival = festival;
                this.festivalStarted = true;
                EventSystem.getInstance().emit<FestivalStartedPayload>(
                    TimeEvents.FESTIVAL_STARTED,
                    { festivalId: festival.id }
                );
            }

            // 节日结束
            if (daysUntil < 0 && this.festivalStarted && this.currentFestival?.id === festival.id) {
                EventSystem.getInstance().emit<FestivalEndedPayload>(
                    TimeEvents.FESTIVAL_ENDED,
                    { festivalId: festival.id }
                );
                this.currentFestival = null;
                this.festivalStarted = false;
            }
        }
    }

    /**
     * 获取当前游戏小时
     */
    public getGameHour(): number {
        return this.state.gameHour;
    }

    /**
     * 获取当前游戏分钟
     */
    public getGameMinute(): number {
        return this.state.gameMinute;
    }

    /**
     * 获取当前游戏日期
     */
    public getGameDay(): number {
        return this.state.gameDay;
    }

    /**
     * 获取当前季节
     */
    public getCurrentSeason(): Season {
        return this.state.season;
    }

    /**
     * 获取当前时段
     */
    public getCurrentPeriod(): Period {
        return this.state.period;
    }

    /**
     * 获取格式化时间字符串
     */
    public getFormattedTime(): string {
        const hour = Math.floor(this.state.gameHour);
        const minute = Math.floor(this.state.gameMinute);
        const period = hour < 12 ? '上午' : '下午';
        const displayHour = hour % 12 || 12;

        return `${period} ${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    /**
     * 获取星期几 (1-7)
     */
    public getGameWeek(): number {
        return ((this.state.gameDay - 1) % 7) + 1;
    }

    /**
     * 获取季节内第几天 (1-7)
     */
    public getDayInSeason(): number {
        const daysPerSeason = this.config.daysPerSeason;
        return ((this.state.gameDay - 1) % daysPerSeason) + 1;
    }

    /**
     * 获取距离节日天数
     */
    public getDaysUntilFestival(festivalId: string): number {
        const festival = this.festivals.find(f => f.id === festivalId);
        if (!festival) return -1;

        // 计算节日日期
        const seasonStartDay = this.getSeasonStartDay(festival.season);
        const festivalDay = seasonStartDay + festival.dayInSeason - 1;
        const currentDay = this.state.gameDay;

        let daysUntil = festivalDay - currentDay;

        // 如果节日已过，计算到明年的节日
        if (daysUntil < 0) {
            daysUntil += this.config.daysPerYear;
        }

        return daysUntil;
    }

    /**
     * 获取季节起始日期
     */
    private getSeasonStartDay(season: Season): number {
        const seasonIndex = Object.values(Season).indexOf(season);
        return seasonIndex * this.config.daysPerSeason + 1;
    }

    /**
     * 获取当前季节的节日
     */
    public getCurrentSeasonFestival(): Festival | undefined {
        return this.festivals.find(f => f.season === this.state.season);
    }

    /**
     * 计算离线时间
     */
    public calculateOfflineTime(lastSaveTimestamp: number): number {
        const now = Date.now();
        const offlineRealMinutes = (now - lastSaveTimestamp) / 60000;
        // 根据设计文档：timeScale = 60，意味着 1 现实分钟 = 60 游戏分钟
        // 离线 60 现实分钟 = 60 * 60 = 3600 游戏分钟 = 60 游戏小时
        const offlineGameMinutes = offlineRealMinutes * this.config.timeScale;
        const offlineGameHours = offlineGameMinutes / 60;

        return Math.min(offlineGameHours, this.config.maxOfflineHours);
    }

    /**
     * 暂停时间
     */
    public pause(): void {
        this.state.isPaused = true;
    }

    /**
     * 恢复时间
     */
    public resume(): void {
        this.state.isPaused = false;
    }

    /**
     * 设置加速倍率
     */
    public setSpeedMultiplier(multiplier: number): void {
        if (multiplier < 1) {
            console.warn('[TimeSystem] Speed multiplier must be >= 1');
            return;
        }
        this.state.speedMultiplier = multiplier;
    }

    /**
     * 导出状态
     */
    public exportState(): TimeState {
        return { ...this.state };
    }

    /**
     * 导入状态
     */
    public importState(state: TimeState): void {
        this.state = { ...state };
        this.updatePeriod();
        this.updateSeason();
    }

    /**
     * 重置到初始状态
     */
    public reset(): void {
        this.state = this.createInitialState();
        this.accumulatedMinutes = 0;
        this.currentFestival = null;
        this.festivalStarted = false;
    }
}

/**
 * 全局时间系统实例
 */
export const timeSystem = TimeSystem.getInstance();
