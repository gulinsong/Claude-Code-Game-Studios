/**
 * 性能监控系统
 *
 * 监控游戏运行时的性能指标，包括 FPS、内存、Draw Calls 等。
 * 支持微信小游戏和 Web 环境。
 *
 * @example
 * ```typescript
 * // 初始化
 * PerformanceMonitor.instance.initialize({
 *     showOverlay: true,
 *     warningThreshold: { fps: 30, memory: 120 * 1024 * 1024 }
 * });
 *
 * // 获取当前性能数据
 * const stats = PerformanceMonitor.instance.getStats();
 * console.log(`FPS: ${stats.fps}, Memory: ${stats.memoryUsedMB}MB`);
 *
 * // 性能警告事件
 * eventSystem.on(PerformanceEvents.WARNING, (data) => {
 *     console.warn(`Performance warning: ${data.type}`, data.value);
 * });
 * ```
 */

import { eventSystem } from './EventSystem';

// 微信小游戏全局声明
declare const wx: {
    getPerformance: () => {
        usedJSHeapSize?: number;
        totalJSHeapSize?: number;
    };
    triggerGC?: () => void;
} | undefined;

/**
 * 性能指标类型
 */
export enum PerformanceMetricType {
    FPS = 'fps',
    MEMORY = 'memory',
    DRAW_CALLS = 'drawCalls',
    FRAME_TIME = 'frameTime',
    SCRIPT_TIME = 'scriptTime'
}

/**
 * 性能警告级别
 */
export enum WarningLevel {
    NORMAL = 'normal',
    WARNING = 'warning',
    CRITICAL = 'critical'
}

/**
 * 性能统计数据
 */
export interface PerformanceStats {
    /** 当前 FPS */
    fps: number;
    /** 平均 FPS (最近 60 帧) */
    fpsAverage: number;
    /** 最低 FPS (最近 60 帧) */
    fpsMin: number;
    /** 最高 FPS (最近 60 帧) */
    fpsMax: number;
    /** 帧时间 (ms) */
    frameTime: number;
    /** 脚本执行时间 (ms) */
    scriptTime: number;
    /** 已用内存 (字节) */
    memoryUsed: number;
    /** 已用内存 (MB) */
    memoryUsedMB: number;
    /** 总内存 (字节) */
    memoryTotal: number;
    /** Draw Calls 数量 */
    drawCalls: number;
    /** 三角形数量 */
    triangles: number;
    /** 警告级别 */
    warningLevel: WarningLevel;
    /** 时间戳 */
    timestamp: number;
}

/**
 * 性能阈值配置
 */
export interface PerformanceThresholds {
    /** FPS 警告阈值 */
    fpsWarning: number;
    /** FPS 严重阈值 */
    fpsCritical: number;
    /** 内存警告阈值 (字节) */
    memoryWarning: number;
    /** 内存严重阈值 (字节) */
    memoryCritical: number;
    /** 帧时间警告阈值 (ms) */
    frameTimeWarning: number;
    /** 帧时间严重阈值 (ms) */
    frameTimeCritical: number;
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorConfig {
    /** 是否显示性能叠加层 */
    showOverlay: boolean;
    /** 更新间隔 (ms) */
    updateInterval: number;
    /** 采样帧数 (用于计算平均值) */
    sampleFrames: number;
    /** 性能阈值 */
    thresholds: Partial<PerformanceThresholds>;
    /** 是否启用内存监控 */
    enableMemoryMonitor: boolean;
    /** 是否启用 Draw Call 监控 */
    enableDrawCallMonitor: boolean;
    /** 是否上报性能数据 */
    enableReporting: boolean;
    /** 上报间隔 (ms) */
    reportInterval: number;
}

/**
 * 性能警告事件数据
 */
export interface PerformanceWarningPayload {
    type: PerformanceMetricType;
    level: WarningLevel;
    value: number;
    threshold: number;
    stats: PerformanceStats;
}

/**
 * 性能事件
 */
export const PerformanceEvents = {
    /** 性能统计更新 */
    STATS_UPDATED: 'performance:stats_updated',
    /** 性能警告 */
    WARNING: 'performance:warning',
    /** 性能严重警告 */
    CRITICAL: 'performance:critical',
    /** 内存不足 */
    MEMORY_LOW: 'performance:memory_low'
};

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
    showOverlay: false,
    updateInterval: 1000,
    sampleFrames: 60,
    thresholds: {
        fpsWarning: 45,
        fpsCritical: 30,
        memoryWarning: 120 * 1024 * 1024, // 120 MB
        memoryCritical: 140 * 1024 * 1024, // 140 MB
        frameTimeWarning: 22, // ~45 FPS
        frameTimeCritical: 33 // ~30 FPS
    },
    enableMemoryMonitor: true,
    enableDrawCallMonitor: true,
    enableReporting: false,
    reportInterval: 60000 // 1 分钟
};

/**
 * 性能监控系统
 *
 * 单例模式，在游戏启动时初始化。
 */
export class PerformanceMonitor {
    private static _instance: PerformanceMonitor | null = null;

    /** 获取单例实例 */
    public static get instance(): PerformanceMonitor {
        if (!PerformanceMonitor._instance) {
            PerformanceMonitor._instance = new PerformanceMonitor();
        }
        return PerformanceMonitor._instance;
    }

    private config: PerformanceMonitorConfig;
    private initialized: boolean = false;
    private enabled: boolean = true;

    // FPS 计算
    private frameCount: number = 0;
    private lastUpdateTime: number = 0;
    private currentFps: number = 60;
    private fpsHistory: number[] = [];
    private scriptStartTime: number = 0;
    private currentScriptTime: number = 0;

    // 统计数据缓存
    private cachedStats: PerformanceStats | null = null;

    // 上报定时器
    private reportTimer: number | null = null;

    // 性能叠加层
    private overlay: PerformanceOverlay | null = null;

    private constructor() {
        this.config = { ...DEFAULT_CONFIG };
    }

    /**
     * 初始化性能监控系统
     */
    public initialize(config?: Partial<PerformanceMonitorConfig>): void {
        if (this.initialized) {
            console.warn('[PerformanceMonitor] Already initialized');
            return;
        }

        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initialized = true;
        this.lastUpdateTime = performance.now();

        // 显示叠加层
        if (this.config.showOverlay) {
            this.showOverlay();
        }

        // 启动上报定时器
        if (this.config.enableReporting) {
            this.startReporting();
        }

        console.log('[PerformanceMonitor] Initialized', this.config);
    }

    /**
     * 每帧更新 (在游戏主循环中调用)
     *
     * @example
     * ```typescript
     * // 在游戏主循环中
     * update(dt: number) {
     *     PerformanceMonitor.instance.beginFrame();
     *     // ... 游戏逻辑 ...
     *     PerformanceMonitor.instance.endFrame();
     * }
     * ```
     */
    public beginFrame(): void {
        this.scriptStartTime = performance.now();
    }

    /**
     * 帧结束
     */
    public endFrame(): void {
        if (!this.enabled) return;

        const now = performance.now();
        this.currentScriptTime = now - this.scriptStartTime;

        this.frameCount++;

        // 检查是否需要更新
        if (now - this.lastUpdateTime >= this.config.updateInterval) {
            this.updateStats();
            this.lastUpdateTime = now;
        }
    }

    /**
     * 获取当前性能统计
     */
    public getStats(): PerformanceStats {
        if (!this.cachedStats) {
            this.updateStats();
        }
        return this.cachedStats!;
    }

    /**
     * 获取警告级别
     */
    public getWarningLevel(): WarningLevel {
        const stats = this.getStats();
        return stats.warningLevel;
    }

    /**
     * 是否处于性能警告状态
     */
    public isWarning(): boolean {
        return this.getWarningLevel() !== WarningLevel.NORMAL;
    }

    /**
     * 启用/禁用监控
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 显示性能叠加层
     */
    public showOverlay(): void {
        if (!this.overlay) {
            this.overlay = new PerformanceOverlay(this);
        }
        this.overlay.show();
    }

    /**
     * 隐藏性能叠加层
     */
    public hideOverlay(): void {
        if (this.overlay) {
            this.overlay.hide();
        }
    }

    /**
     * 销毁
     */
    public destroy(): void {
        this.enabled = false;
        this.initialized = false;

        if (this.reportTimer !== null) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }

        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }

        PerformanceMonitor._instance = null;
    }

    /**
     * 更新统计数据
     */
    private updateStats(): void {
        const now = performance.now();
        const elapsed = now - this.lastUpdateTime;

        // 计算 FPS
        if (elapsed > 0 && this.frameCount > 0) {
            this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        }
        this.frameCount = 0;

        // 更新 FPS 历史
        this.fpsHistory.push(this.currentFps);
        if (this.fpsHistory.length > this.config.sampleFrames) {
            this.fpsHistory.shift();
        }

        // 获取内存信息
        const memory = this.getMemoryInfo();

        // 获取渲染信息
        const renderInfo = this.getRenderInfo();

        // 计算平均值
        const fpsAverage = this.average(this.fpsHistory);
        const fpsMin = Math.min(...this.fpsHistory);
        const fpsMax = Math.max(...this.fpsHistory);

        // 计算帧时间
        const frameTime = this.currentFps > 0 ? 1000 / this.currentFps : 0;

        // 判断警告级别
        const warningLevel = this.calculateWarningLevel(
            this.currentFps,
            memory.used,
            frameTime
        );

        // 缓存统计
        this.cachedStats = {
            fps: this.currentFps,
            fpsAverage: Math.round(fpsAverage),
            fpsMin,
            fpsMax,
            frameTime: Math.round(frameTime * 100) / 100,
            scriptTime: Math.round(this.currentScriptTime * 100) / 100,
            memoryUsed: memory.used,
            memoryUsedMB: Math.round(memory.used / 1024 / 1024 * 10) / 10,
            memoryTotal: memory.total,
            drawCalls: renderInfo.drawCalls,
            triangles: renderInfo.triangles,
            warningLevel,
            timestamp: now
        };

        // 发送事件
        eventSystem.emit(PerformanceEvents.STATS_UPDATED, this.cachedStats);

        // 检查警告
        this.checkWarnings(this.cachedStats);
    }

    /**
     * 获取内存信息
     */
    private getMemoryInfo(): { used: number; total: number } {
        // 微信小游戏环境
        if (typeof wx !== 'undefined' && wx.getPerformance) {
            try {
                const perf = wx.getPerformance();
                return {
                    used: perf.usedJSHeapSize || 0,
                    total: perf.totalJSHeapSize || 0
                };
            } catch (e) {
                // 忽略错误
            }
        }

        // Web 环境 (Chrome)
        if (typeof (performance as any).memory !== 'undefined') {
            const memory = (performance as any).memory;
            return {
                used: memory.usedJSHeapSize || 0,
                total: memory.totalJSHeapSize || 0
            };
        }

        return { used: 0, total: 0 };
    }

    /**
     * 获取渲染信息
     */
    private getRenderInfo(): { drawCalls: number; triangles: number } {
        // Cocos Creator 3.x 环境获取渲染统计
        // 注意: 需要在 Cocos Creator 环境中才能获取
        try {
            // 动态导入 director (Cocos Creator)
            const director = (globalThis as any).director;
            if (director && director.root) {
                const stats = director.root.pipeline.pipelineStats;
                return {
                    drawCalls: stats?.drawCalls || 0,
                    triangles: stats?.triangles || 0
                };
            }
        } catch (e) {
            // 忽略错误
        }

        return { drawCalls: 0, triangles: 0 };
    }

    /**
     * 计算警告级别
     */
    private calculateWarningLevel(
        fps: number,
        memoryUsed: number,
        frameTime: number
    ): WarningLevel {
        const thresholds = this.config.thresholds;

        // 严重级别
        if (
            fps <= thresholds.fpsCritical! ||
            memoryUsed >= thresholds.memoryCritical! ||
            frameTime >= thresholds.frameTimeCritical!
        ) {
            return WarningLevel.CRITICAL;
        }

        // 警告级别
        if (
            fps <= thresholds.fpsWarning! ||
            memoryUsed >= thresholds.memoryWarning! ||
            frameTime >= thresholds.frameTimeWarning!
        ) {
            return WarningLevel.WARNING;
        }

        return WarningLevel.NORMAL;
    }

    /**
     * 检查并发送警告
     */
    private checkWarnings(stats: PerformanceStats): void {
        const thresholds = this.config.thresholds;

        // FPS 警告
        if (stats.fps <= thresholds.fpsWarning!) {
            this.emitWarning(
                PerformanceMetricType.FPS,
                stats.fps,
                stats.fps <= thresholds.fpsCritical! ? thresholds.fpsCritical! : thresholds.fpsWarning!,
                stats
            );
        }

        // 内存警告
        if (stats.memoryUsed >= thresholds.memoryWarning!) {
            this.emitWarning(
                PerformanceMetricType.MEMORY,
                stats.memoryUsed,
                stats.memoryUsed >= thresholds.memoryCritical! ? thresholds.memoryCritical! : thresholds.memoryWarning!,
                stats
            );
        }

        // 帧时间警告
        if (stats.frameTime >= thresholds.frameTimeWarning!) {
            this.emitWarning(
                PerformanceMetricType.FRAME_TIME,
                stats.frameTime,
                stats.frameTime >= thresholds.frameTimeCritical! ? thresholds.frameTimeCritical! : thresholds.frameTimeWarning!,
                stats
            );
        }
    }

    /**
     * 发送警告事件
     */
    private emitWarning(
        type: PerformanceMetricType,
        value: number,
        threshold: number,
        stats: PerformanceStats
    ): void {
        const level = stats.warningLevel;
        const payload: PerformanceWarningPayload = {
            type,
            level,
            value,
            threshold,
            stats
        };

        if (level === WarningLevel.CRITICAL) {
            eventSystem.emit(PerformanceEvents.CRITICAL, payload);
        } else {
            eventSystem.emit(PerformanceEvents.WARNING, payload);
        }
    }

    /**
     * 计算平均值
     */
    private average(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * 启动性能数据上报
     */
    private startReporting(): void {
        this.reportTimer = setInterval(() => {
            this.reportPerformance();
        }, this.config.reportInterval) as unknown as number;
    }

    /**
     * 上报性能数据
     */
    private reportPerformance(): void {
        if (!this.config.enableReporting) return;

        const stats = this.getStats();

        // 这里可以对接上报系统
        console.log('[PerformanceMonitor] Report:', {
            fps: stats.fps,
            fpsAvg: stats.fpsAverage,
            memoryMB: stats.memoryUsedMB,
            drawCalls: stats.drawCalls,
            warningLevel: stats.warningLevel
        });

        // TODO: 对接实际的上报系统
        // reportToServer(stats);
    }
}

/**
 * 性能叠加层 (用于开发调试)
 */
class PerformanceOverlay {
    private monitor: PerformanceMonitor;
    private container: HTMLDivElement | null = null;
    private fpsElement: HTMLSpanElement | null = null;
    private memoryElement: HTMLSpanElement | null = null;
    private drawCallElement: HTMLSpanElement | null = null;
    private updateTimer: number | null = null;
    private visible: boolean = false;

    constructor(monitor: PerformanceMonitor) {
        this.monitor = monitor;
    }

    public show(): void {
        if (this.visible) return;

        this.createUI();
        this.startUpdate();
        this.visible = true;
    }

    public hide(): void {
        if (!this.visible) return;

        this.stopUpdate();
        this.destroyUI();
        this.visible = false;
    }

    public destroy(): void {
        this.hide();
    }

    private createUI(): void {
        // 仅在 Web 环境创建 DOM
        if (typeof document === 'undefined') return;

        this.container = document.createElement('div');
        this.container.id = 'performance-overlay';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 9999;
            pointer-events: none;
            line-height: 1.6;
        `;

        this.fpsElement = document.createElement('div');
        this.memoryElement = document.createElement('div');
        this.drawCallElement = document.createElement('div');

        this.container.appendChild(this.fpsElement);
        this.container.appendChild(this.memoryElement);
        this.container.appendChild(this.drawCallElement);

        document.body.appendChild(this.container);
    }

    private destroyUI(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.fpsElement = null;
        this.memoryElement = null;
        this.drawCallElement = null;
    }

    private startUpdate(): void {
        this.updateTimer = setInterval(() => {
            this.updateDisplay();
        }, 500) as unknown as number;
    }

    private stopUpdate(): void {
        if (this.updateTimer !== null) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    private updateDisplay(): void {
        const stats = this.monitor.getStats();

        if (this.fpsElement) {
            const fpsColor = this.getColorForFps(stats.fps);
            this.fpsElement.innerHTML = `FPS: <span style="color:${fpsColor}">${stats.fps}</span> (avg: ${stats.fpsAverage}, min: ${stats.fpsMin})`;
        }

        if (this.memoryElement) {
            const memColor = this.getColorForMemory(stats.memoryUsedMB);
            this.memoryElement.innerHTML = `MEM: <span style="color:${memColor}">${stats.memoryUsedMB} MB</span>`;
        }

        if (this.drawCallElement) {
            this.drawCallElement.textContent = `DC: ${stats.drawCalls} | TRI: ${stats.triangles}`;
        }

        // 根据警告级别改变边框颜色
        if (this.container) {
            const borderColor = stats.warningLevel === WarningLevel.CRITICAL
                ? '#ff0000'
                : stats.warningLevel === WarningLevel.WARNING
                    ? '#ffff00'
                    : '#00ff00';
            this.container.style.border = `2px solid ${borderColor}`;
        }
    }

    private getColorForFps(fps: number): string {
        if (fps >= 55) return '#00ff00';
        if (fps >= 30) return '#ffff00';
        return '#ff0000';
    }

    private getColorForMemory(memMB: number): string {
        if (memMB < 100) return '#00ff00';
        if (memMB < 130) return '#ffff00';
        return '#ff0000';
    }
}

/**
 * 导出单例快捷访问
 */
export const performanceMonitor = PerformanceMonitor.instance;
