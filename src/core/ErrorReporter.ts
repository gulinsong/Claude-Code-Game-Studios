/**
 * 错误上报系统
 *
 * 捕获游戏运行时的错误和异常，上报到服务器进行分析。
 * 支持微信小游戏和 Web 环境。
 *
 * @example
 * ```typescript
 * // 初始化
 * ErrorReporter.instance.initialize({
 *     endpoint: 'https://api.suiji-game.com/errors',
 *     appId: 'suiji-mini-game',
 *     version: '1.0.0'
 * });
 *
 * // 手动上报错误
 * ErrorReporter.instance.captureError(new Error('Something went wrong'));
 *
 * // 添加用户上下文
 * ErrorReporter.instance.setUser({ id: 'user123', name: 'Player1' });
 * ```
 */

import { eventSystem } from './EventSystem';

/**
 * 错误级别
 */
export enum ErrorLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    FATAL = 'fatal'
}

/**
 * 错误类型
 */
export enum ErrorType {
    JAVASCRIPT = 'javascript',
    PROMISE = 'promise',
    RESOURCE = 'resource',
    NETWORK = 'network',
    GAME = 'game',
    WECHAT = 'wechat'
}

/**
 * 错误事件
 */
export interface ErrorEvent {
    /** 错误 ID */
    id: string;
    /** 错误类型 */
    type: ErrorType;
    /** 错误级别 */
    level: ErrorLevel;
    /** 错误消息 */
    message: string;
    /** 错误堆栈 */
    stack?: string;
    /** 文件名 */
    filename?: string;
    /** 行号 */
    lineno?: number;
    /** 列号 */
    colno?: number;
    /** 时间戳 */
    timestamp: number;
    /** 设备信息 */
    device: DeviceInfo;
    /** 用户信息 */
    user?: UserInfo;
    /** 附加数据 */
    extra?: Record<string, unknown>;
    /** 游戏状态 */
    gameState?: Record<string, unknown>;
    /** 面包屑 (操作历史) */
    breadcrumbs: Breadcrumb[];
}

/**
 * 设备信息
 */
export interface DeviceInfo {
    /** 平台 */
    platform: string;
    /** 系统版本 */
    systemVersion: string;
    /** 设备型号 */
    model: string;
    /** 网络类型 */
    networkType: string;
    /** 屏幕尺寸 */
    screenWidth: number;
    /** 屏幕尺寸 */
    screenHeight: number;
    /** 微信版本 */
    wechatVersion?: string;
    /** 基础库版本 */
    baseLibraryVersion?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
    id: string;
    name?: string;
    openid?: string;
}

/**
 * 面包屑 (操作历史)
 */
export interface Breadcrumb {
    /** 时间戳 */
    timestamp: number;
    /** 类型 */
    type: 'user' | 'navigation' | 'http' | 'error' | 'info';
    /** 消息 */
    message: string;
    /** 附加数据 */
    data?: Record<string, unknown>;
}

/**
 * 错误上报配置
 */
export interface ErrorReporterConfig {
    /** 上报端点 */
    endpoint: string;
    /** 应用 ID */
    appId: string;
    /** 版本号 */
    version: string;
    /** 环境 */
    environment: 'development' | 'staging' | 'production';
    /** 是否启用 */
    enabled: boolean;
    /** 采样率 (0-1) */
    sampleRate: number;
    /** 最大面包屑数量 */
    maxBreadcrumbs: number;
    /** 上报间隔 (ms) */
    reportInterval: number;
    /** 本地缓存键 */
    cacheKey: string;
    /** 最大缓存数量 */
    maxCacheSize: number;
    /** 是否捕获全局错误 */
    captureGlobalErrors: boolean;
    /** 是否捕获 Promise 错误 */
    capturePromiseRejections: boolean;
    /** 是否捕获资源加载错误 */
    captureResourceErrors: boolean;
    /** 忽略的错误模式 */
    ignorePatterns: RegExp[];
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ErrorReporterConfig = {
    endpoint: '',
    appId: 'suiji-mini-game',
    version: '1.0.0',
    environment: 'production',
    enabled: true,
    sampleRate: 1.0,
    maxBreadcrumbs: 20,
    reportInterval: 10000, // 10 秒
    cacheKey: 'suiji_error_cache',
    maxCacheSize: 50,
    captureGlobalErrors: true,
    capturePromiseRejections: true,
    captureResourceErrors: true,
    ignorePatterns: [
        /Script error/,
        /Network Error/,
        /Load failed/
    ]
};

/**
 * 错误上报事件
 */
export const ErrorReporterEvents = {
    /** 错误捕获 */
    ERROR_CAPTURED: 'error:captured',
    /** 上报成功 */
    REPORT_SUCCESS: 'error:report_success',
    /** 上报失败 */
    REPORT_FAILED: 'error:report_failed'
};

/**
 * 错误上报系统
 *
 * 单例模式，在游戏启动时初始化。
 */
export class ErrorReporter {
    private static _instance: ErrorReporter | null = null;

    public static get instance(): ErrorReporter {
        if (!ErrorReporter._instance) {
            ErrorReporter._instance = new ErrorReporter();
        }
        return ErrorReporter._instance;
    }

    private config: ErrorReporterConfig;
    private initialized: boolean = false;
    private enabled: boolean = true;

    // 错误队列
    private errorQueue: ErrorEvent[] = [];

    // 面包屑
    private breadcrumbs: Breadcrumb[] = [];

    // 用户信息
    private user: UserInfo | null = null;

    // 设备信息 (缓存)
    private deviceInfo: DeviceInfo | null = null;

    // 上报定时器
    private reportTimer: number | null = null;

    // 原始错误处理器
    private originalErrorHandler: OnErrorEventHandler | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalRejectionHandler: ((event: any) => any) | null = null;

    private constructor() {
        this.config = { ...DEFAULT_CONFIG };
    }

    /**
     * 初始化错误上报系统
     */
    public initialize(config?: Partial<ErrorReporterConfig>): void {
        if (this.initialized) {
            console.warn('[ErrorReporter] Already initialized');
            return;
        }

        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initialized = true;

        // 获取设备信息
        this.deviceInfo = this.getDeviceInfo();

        // 设置全局错误捕获
        if (this.config.captureGlobalErrors) {
            this.setupGlobalErrorHandlers();
        }

        // 加载缓存错误
        this.loadCachedErrors();

        // 启动定时上报
        this.startReporting();

        console.log('[ErrorReporter] Initialized');
    }

    /**
     * 设置用户信息
     */
    public setUser(user: UserInfo | null): void {
        this.user = user;
    }

    /**
     * 添加面包屑
     */
    public addBreadcrumb(
        type: Breadcrumb['type'],
        message: string,
        data?: Record<string, unknown>
    ): void {
        this.breadcrumbs.push({
            timestamp: Date.now(),
            type,
            message,
            data
        });

        // 限制数量
        if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
    }

    /**
     * 捕获错误
     */
    public captureError(
        error: Error | string,
        level: ErrorLevel = ErrorLevel.ERROR,
        extra?: Record<string, unknown>
    ): string {
        const errorId = this.generateErrorId();

        const errorEvent: ErrorEvent = {
            id: errorId,
            type: ErrorType.GAME,
            level,
            message: typeof error === 'string' ? error : error.message,
            stack: typeof error === 'object' ? error.stack : undefined,
            timestamp: Date.now(),
            device: this.deviceInfo || this.getDeviceInfo(),
            user: this.user || undefined,
            extra,
            breadcrumbs: [...this.breadcrumbs]
        };

        this.addErrorToQueue(errorEvent);

        return errorId;
    }

    /**
     * 捕获消息
     */
    public captureMessage(
        message: string,
        level: ErrorLevel = ErrorLevel.INFO,
        extra?: Record<string, unknown>
    ): string {
        return this.captureError(new Error(message), level, extra);
    }

    /**
     * 立即上报
     */
    public async flush(): Promise<void> {
        await this.reportErrors();
    }

    /**
     * 启用/禁用
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 销毁
     */
    public destroy(): void {
        this.enabled = false;
        this.initialized = false;

        // 移除全局错误处理器
        this.removeGlobalErrorHandlers();

        // 停止定时器
        if (this.reportTimer !== null) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }

        // 上报剩余错误
        this.reportErrors();

        ErrorReporter._instance = null;
    }

    /**
     * 设置全局错误处理器
     */
    private setupGlobalErrorHandlers(): void {
        // 微信小游戏环境
        if (typeof wx !== 'undefined') {
            this.setupWeChatErrorHandlers();
            return;
        }

        // Web 环境
        this.setupWebErrorHandlers();
    }

    /**
     * 设置微信小游戏错误处理器
     */
    private setupWeChatErrorHandlers(): void {
        if (typeof wx === 'undefined') return;

        // 错误监听
        wx.onError((error: string) => {
            this.captureError(
                new Error(error),
                ErrorLevel.ERROR,
                { source: 'wx.onError' }
            );
        });

        // Promise 拒绝监听
        wx.onUnhandledRejection((res: { reason: string | Error }) => {
            const error = typeof res.reason === 'string'
                ? new Error(res.reason)
                : res.reason;

            this.captureError(error, ErrorLevel.ERROR, {
                source: 'wx.onUnhandledRejection',
                type: 'unhandledrejection'
            });
        });

        // 内存警告
        wx.onMemoryWarning(() => {
            this.captureMessage(
                'Memory warning received',
                ErrorLevel.WARNING,
                { source: 'wx.onMemoryWarning' }
            );
        });
    }

    /**
     * 设置 Web 错误处理器
     */
    private setupWebErrorHandlers(): void {
        // 检查是否在浏览器环境
        if (typeof window === 'undefined') {
            return;
        }

        // 保存原始处理器
        this.originalErrorHandler = window.onerror;
        this.originalRejectionHandler = window.onunhandledrejection;

        // 错误处理
        window.onerror = (message, filename, lineno, colno, error) => {
            // 检查是否应该忽略
            if (this.shouldIgnore(String(message))) {
                return false;
            }

            this.captureError(
                error || new Error(String(message)),
                ErrorLevel.ERROR,
                { filename, lineno, colno, source: 'window.onerror' }
            );

            // 调用原始处理器
            if (this.originalErrorHandler) {
                const result = this.originalErrorHandler(
                    message,
                    filename || '',
                    lineno || 0,
                    colno || 0,
                    error || undefined
                );
                return result || false;
            }

            return false;
        };

        // Promise 拒绝处理
        window.onunhandledrejection = (event) => {
            const error = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason));

            if (this.shouldIgnore(error.message)) {
                return false;
            }

            this.captureError(error, ErrorLevel.ERROR, {
                source: 'window.onunhandledrejection',
                type: 'unhandledrejection'
            });

            // 调用原始处理器
            if (this.originalRejectionHandler) {
                this.originalRejectionHandler.call(window, event);
            }

            return false;
        };

        // 资源加载错误
        if (this.config.captureResourceErrors) {
            window.addEventListener('error', (event) => {
                if (event.target && (event.target as any).tagName) {
                    const target = event.target as HTMLElement;
                    this.captureMessage(
                        `Resource load failed: ${(target as any).src || (target as any).href}`,
                        ErrorLevel.WARNING,
                        {
                            source: 'resource-error',
                            tagName: (target as any).tagName,
                            src: (target as any).src,
                            href: (target as any).href
                        }
                    );
                }
            }, true);
        }
    }

    /**
     * 移除全局错误处理器
     */
    private removeGlobalErrorHandlers(): void {
        if (typeof window !== 'undefined') {
            window.onerror = this.originalErrorHandler;
            window.onunhandledrejection = this.originalRejectionHandler as any;
        }
    }

    /**
     * 获取设备信息
     */
    private getDeviceInfo(): DeviceInfo {
        // 微信小游戏环境
        if (typeof wx !== 'undefined') {
            try {
                const systemInfo = wx.getSystemInfoSync();
                return {
                    platform: systemInfo.platform || 'unknown',
                    systemVersion: systemInfo.system || 'unknown',
                    model: systemInfo.model || 'unknown',
                    networkType: 'unknown',
                    screenWidth: systemInfo.screenWidth || 0,
                    screenHeight: systemInfo.screenHeight || 0,
                    wechatVersion: systemInfo.version,
                    baseLibraryVersion: systemInfo.SDKVersion
                };
            } catch (e) {
                console.warn('[ErrorReporter] Failed to get system info:', e);
            }
        }

        // Web 环境
        if (typeof navigator !== 'undefined') {
            return {
                platform: navigator.platform || 'unknown',
                systemVersion: navigator.userAgent,
                model: 'browser',
                networkType: (navigator as any).connection?.effectiveType || 'unknown',
                screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
                screenHeight: typeof window !== 'undefined' ? window.screen.height : 0
            };
        }

        // Node.js 或其他环境
        return {
            platform: 'unknown',
            systemVersion: 'unknown',
            model: 'unknown',
            networkType: 'unknown',
            screenWidth: 0,
            screenHeight: 0
        };
    }

    /**
     * 检查是否应该忽略错误
     */
    private shouldIgnore(message: string): boolean {
        for (const pattern of this.config.ignorePatterns) {
            if (pattern.test(message)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 生成错误 ID
     */
    private generateErrorId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 添加错误到队列
     */
    private addErrorToQueue(error: ErrorEvent): void {
        // 采样率检查
        if (Math.random() > this.config.sampleRate) {
            return;
        }

        this.errorQueue.push(error);

        // 发送事件
        eventSystem.emit(ErrorReporterEvents.ERROR_CAPTURED, error);

        // 缓存错误
        this.cacheErrors();

        // 如果是致命错误，立即上报
        if (error.level === ErrorLevel.FATAL) {
            this.reportErrors();
        }
    }

    /**
     * 启动定时上报
     */
    private startReporting(): void {
        this.reportTimer = setInterval(() => {
            this.reportErrors();
        }, this.config.reportInterval) as unknown as number;
    }

    /**
     * 上报错误
     */
    private async reportErrors(): Promise<void> {
        if (!this.enabled || this.errorQueue.length === 0) {
            return;
        }

        // 检查端点配置
        if (!this.config.endpoint) {
            console.warn('[ErrorReporter] No endpoint configured, skipping report');
            return;
        }

        const errors = [...this.errorQueue];
        this.errorQueue = [];

        try {
            // 微信小游戏环境
            if (typeof wx !== 'undefined') {
                await this.reportToWeChat(errors);
            } else {
                // Web 环境
                await this.reportToWeb(errors);
            }

            // 清除缓存
            this.clearCachedErrors();

            // 发送成功事件
            eventSystem.emit(ErrorReporterEvents.REPORT_SUCCESS, { count: errors.length });
        } catch (error) {
            // 上报失败，将错误放回队列
            this.errorQueue.unshift(...errors);
            this.cacheErrors();

            // 发送失败事件
            eventSystem.emit(ErrorReporterEvents.REPORT_FAILED, { error, count: errors.length });

            console.error('[ErrorReporter] Failed to report errors:', error);
        }
    }

    /**
     * 上报到微信服务器
     */
    private async reportToWeChat(errors: ErrorEvent[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof wx === 'undefined') {
                reject(new Error('WeChat environment not available'));
                return;
            }

            wx!.request({
                url: this.config.endpoint,
                method: 'POST',
                data: {
                    appId: this.config.appId,
                    version: this.config.version,
                    environment: this.config.environment,
                    errors
                },
                header: {
                    'Content-Type': 'application/json'
                },
                success: () => resolve(),
                fail: (err: Error) => reject(err)
            });
        });
    }

    /**
     * 上报到 Web 服务器
     */
    private async reportToWeb(errors: ErrorEvent[]): Promise<void> {
        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appId: this.config.appId,
                version: this.config.version,
                environment: this.config.environment,
                errors
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    /**
     * 缓存错误到本地存储
     */
    private cacheErrors(): void {
        if (typeof localStorage === 'undefined' && typeof wx === 'undefined') {
            return;
        }

        const allErrors = [...this.errorQueue];

        // 限制缓存数量
        while (allErrors.length > this.config.maxCacheSize) {
            allErrors.shift();
        }

        const data = JSON.stringify(allErrors);

        try {
            if (typeof wx !== 'undefined') {
                wx.setStorageSync(this.config.cacheKey, data);
            } else {
                localStorage.setItem(this.config.cacheKey, data);
            }
        } catch (e) {
            console.warn('[ErrorReporter] Failed to cache errors:', e);
        }
    }

    /**
     * 加载缓存的错误
     */
    private loadCachedErrors(): void {
        if (typeof localStorage === 'undefined' && typeof wx === 'undefined') {
            return;
        }

        try {
            let data: string | null = null;

            if (typeof wx !== 'undefined') {
                data = wx.getStorageSync(this.config.cacheKey) || null;
            } else {
                data = localStorage.getItem(this.config.cacheKey);
            }

            if (data) {
                const errors = JSON.parse(data) as ErrorEvent[];
                this.errorQueue.push(...errors);
                console.log(`[ErrorReporter] Loaded ${errors.length} cached errors`);
            }
        } catch (e) {
            console.warn('[ErrorReporter] Failed to load cached errors:', e);
        }
    }

    /**
     * 清除缓存的错误
     */
    private clearCachedErrors(): void {
        if (typeof localStorage === 'undefined' && typeof wx === 'undefined') {
            return;
        }

        try {
            if (typeof wx !== 'undefined') {
                wx.removeStorageSync(this.config.cacheKey);
            } else {
                localStorage.removeItem(this.config.cacheKey);
            }
        } catch (e) {
            console.warn('[ErrorReporter] Failed to clear cached errors:', e);
        }
    }
}

/**
 * 微信小游戏 API 类型声明
 */
declare const wx: {
    onError: (callback: (error: string) => void) => void;
    onUnhandledRejection: (callback: (res: { reason: string | Error }) => void) => void;
    onMemoryWarning: (callback: () => void) => void;
    getSystemInfoSync: () => {
        platform?: string;
        system?: string;
        model?: string;
        screenWidth?: number;
        screenHeight?: number;
        version?: string;
        SDKVersion?: string;
    };
    request: (options: {
        url: string;
        method: string;
        data: any;
        header: Record<string, string>;
        success: () => void;
        fail: (err: Error) => void;
    }) => void;
    setStorageSync: (key: string, value: string) => void;
    getStorageSync: (key: string) => string | undefined;
    removeStorageSync: (key: string) => void;
} | undefined;

/**
 * 导出单例快捷访问
 */
export const errorReporter = ErrorReporter.instance;
