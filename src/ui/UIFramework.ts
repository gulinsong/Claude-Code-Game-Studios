/**
 * UI框架系统 - 界面基础设施
 *
 * 参考: design/gdd/ui-framework-system.md
 *
 * 提供统一的UI管理、层级控制、动画系统和事件分发。
 * 所有游戏界面（主界面、背包、设置、对话等）都通过UI框架系统管理。
 */

import { EventSystem } from '../core/EventSystem';

/**
 * UI层级定义
 */
export enum UILayer {
    /** 背景层 */
    BACKGROUND = 0,
    /** 场景层 */
    SCENE = 100,
    /** 主界面 (HUD) */
    HUD = 200,
    /** 弹窗层 */
    POPUP = 300,
    /** 顶部栏 */
    TOPBAR = 400,
    /** 加载层 */
    LOADING = 500,
    /** 提示层 */
    TOAST = 600,
    /** 调试层 */
    DEBUG = 700
}

/**
 * UI实例状态
 */
export enum UIState {
    /** 不存在 */
    NONE = 'NONE',
    /** 加载中 */
    LOADING = 'LOADING',
    /** 进入动画中 */
    ENTERING = 'ENTERING',
    /** 激活状态 */
    ACTIVE = 'ACTIVE',
    /** 退出动画中 */
    EXITING = 'EXITING',
    /** 在对象池中 */
    POOLED = 'POOLED'
}

/**
 * 缓存策略
 */
export enum CacheStrategy {
    /** 常驻内存 */
    PERMANENT = 'PERMANENT',
    /** 对象池缓存 */
    POOLED = 'POOLED',
    /** 按需加载 */
    ON_DEMAND = 'ON_DEMAND',
    /** 异步加载 */
    ASYNC = 'ASYNC'
}

/**
 * 动画类型
 */
export enum AnimationType {
    /** 无动画 */
    NONE = 'NONE',
    /** 缩放弹出 */
    SCALE = 'SCALE',
    /** 滑动 */
    SLIDE = 'SLIDE',
    /** 淡入淡出 */
    FADE = 'FADE'
}

/**
 * UI配置
 */
export interface UIConfig {
    /** UI名称（唯一标识） */
    name: string;
    /** 预制体路径 */
    prefab: string;
    /** 所属层级 */
    layer: UILayer;
    /** 缓存策略 */
    cache: CacheStrategy;
    /** 对象池大小 */
    poolSize: number;
    /** 进入动画类型 */
    enterAnimation: AnimationType;
    /** 退出动画类型 */
    exitAnimation: AnimationType;
    /** 是否独占（关闭其他UI） */
    exclusive: boolean;
}

/**
 * UI实例信息
 */
export interface UIInstance {
    /** UI名称 */
    name: string;
    /** 当前状态 */
    state: UIState;
    /** 层级 */
    layer: UILayer;
    /** 子层级索引 */
    subIndex: number;
    /** 打开时间 */
    openTime: number;
    /** 实例数据 */
    data: unknown;
}

/**
 * Toast 配置
 */
export interface ToastConfig {
    /** 显示时长（毫秒） */
    duration: number;
    /** 动画类型 */
    animation: AnimationType;
}

/**
 * Loading 配置
 */
export interface LoadingConfig {
    /** 提示文本 */
    message: string;
    /** 进度 (0-1) */
    progress: number;
}

/**
 * 事件 Payload
 */
export interface UIOpenedPayload {
    uiName: string;
}

export interface UIClosedPayload {
    uiName: string;
}

export interface ButtonClickedPayload {
    buttonId: string;
}

export interface ScrollEndPayload {
    listId: string;
}

/**
 * UI事件 ID
 */
export const UIEvents = {
    UI_OPENED: 'ui:opened',
    UI_CLOSED: 'ui:closed',
    BUTTON_CLICKED: 'ui:button_clicked',
    SCROLL_END: 'ui:scroll_end'
} as const;

/**
 * 系统配置
 */
const UI_CONFIG = {
    /** 默认动画时长（毫秒） */
    DEFAULT_ANIMATION_DURATION: 200,
    /** 弹窗进入动画时长 */
    POPUP_ENTER_DURATION: 200,
    /** 弹窗退出动画时长 */
    POPUP_EXIT_DURATION: 150,
    /** 滑动进入动画时长 */
    SLIDE_ENTER_DURATION: 250,
    /** 滑动退出动画时长 */
    SLIDE_EXIT_DURATION: 200,
    /** 淡入淡出动画时长 */
    FADE_DURATION: 150,
    /** 默认对象池大小 */
    DEFAULT_POOL_SIZE: 5,
    /** 默认 Toast 显示时长 */
    DEFAULT_TOAST_DURATION: 2000,
    /** 最大对象池大小 */
    MAX_POOL_SIZE: 20
};

/**
 * UI节点接口（抽象 Cocos Creator 节点）
 */
export interface IUINode {
    /** 节点名称 */
    name: string;
    /** 是否激活 */
    active: boolean;
    /** 父节点 */
    parent: IUINode | null;
    /** 子节点 */
    children: IUINode[];
    /** 层级 */
    zIndex: number;
    /** 透明度 */
    opacity: number;
    /** 缩放 */
    scale: number;
    /** 位置 */
    position: { x: number; y: number };
    /** 销毁 */
    destroy(): void;
    /** 添加到父节点 */
    addChild(child: IUINode): void;
    /** 从父节点移除 */
    removeFromParent(): void;
    /** 设置位置 */
    setPosition(x: number, y: number): void;
    /** 设置缩放 */
    setScale(scale: number): void;
    /** 设置透明度 */
    setOpacity(opacity: number): void;
}

/**
 * UI预制体加载器接口
 */
export interface IUIPrefabLoader {
    /** 加载预制体 */
    load(prefabPath: string): Promise<IUINode>;
    /** 释放预制体 */
    release(prefabPath: string): void;
    /** 实例化预制体 */
    instantiate(prefab: IUINode): IUINode;
}

/**
 * UI动画器接口
 */
export interface UIAnimator {
    /** 播放进入动画 */
    playEnterAnimation(node: IUINode, type: AnimationType, duration: number): Promise<void>;
    /** 播放退出动画 */
    playExitAnimation(node: IUINode, type: AnimationType, duration: number): Promise<void>;
}

/**
 * UI框架系统数据（用于存档）
 */
export interface UIFrameworkData {
    /** 当前打开的 UI 列表 */
    openUIs: string[];
}

/**
 * UI框架系统接口
 */
export interface IUIFramework {
    // UI 注册
    /** 注册 UI 配置 */
    registerUI(config: UIConfig): void;
    /** 批量注册 UI */
    registerUIs(configs: UIConfig[]): void;
    /** 获取 UI 配置 */
    getUIConfig(name: string): UIConfig | null;

    // UI 生命周期
    /** 打开 UI */
    openUI(name: string, data?: unknown): Promise<IUINode | null>;
    /** 关闭 UI */
    closeUI(name: string): void;
    /** 关闭所有 UI */
    closeAllUI(): void;
    /** 关闭指定层级的所有 UI */
    closeAllInLayer(layer: UILayer): void;

    // UI 状态查询
    /** 获取 UI 实例 */
    getUI(name: string): IUINode | null;
    /** 检查 UI 是否打开 */
    isUIOpen(name: string): boolean;
    /** 获取所有打开的 UI */
    getOpenUIs(): string[];
    /** 获取 UI 实例信息 */
    getUIInstanceInfo(name: string): UIInstance | null;

    // UI 层级管理
    /** 置顶 UI */
    bringToFront(name: string): void;
    /** 置底 UI */
    sendToBack(name: string): void;
    /** 计算 zIndex */
    calculateZIndex(layer: UILayer, subIndex: number): number;

    // Toast 系统
    /** 显示 Toast */
    showToast(message: string, duration?: number): void;
    /** 隐藏 Toast */
    hideToast(): void;

    // Loading 系统
    /** 显示 Loading */
    showLoading(message?: string): void;
    /** 隐藏 Loading */
    hideLoading(): void;
    /** 更新 Loading 进度 */
    updateLoadingProgress(progress: number): void;

    // 依赖注入
    /** 设置预制体加载器 */
    setPrefabLoader(loader: IUIPrefabLoader): void;
    /** 设置动画器 */
    setAnimator(animator: UIAnimator): void;
    /** 设置层级容器 */
    setLayerContainer(layer: UILayer, container: IUINode): void;

    // 存档
    /** 导出数据 */
    exportData(): UIFrameworkData;
    /** 导入数据 */
    importData(data: UIFrameworkData): void;
    /** 重置 */
    reset(): void;
}

/**
 * UI框架系统实现
 */
export class UIFramework implements IUIFramework {
    private static instance: UIFramework | null = null;

    /** UI配置映射 */
    private uiConfigs: Map<string, UIConfig> = new Map();

    /** 活跃的UI实例 */
    private activeUIs: Map<string, IUINode> = new Map();

    /** UI实例信息 */
    private uiInstances: Map<string, UIInstance> = new Map();

    /** UI对象池 */
    private uiPool: Map<string, IUINode[]> = new Map();

    /** 层级容器 */
    private layerContainers: Map<UILayer, IUINode> = new Map();

    /** 层级计数器 */
    private layerCounters: Map<UILayer, number> = new Map();

    /** 预制体加载器 */
    private prefabLoader: IUIPrefabLoader | null = null;

    /** 动画器 */
    private animator: UIAnimator | null = null;

    /** Toast 队列 */
    private toastQueue: Array<{ message: string; duration: number }> = [];

    /** Toast 是否正在显示 */
    private toastShowing: boolean = false;

    /** Toast 定时器 ID */
    private toastTimerId: ReturnType<typeof setTimeout> | null = null;

    /** 当前 Toast 节点 */
    private toastNode: IUINode | null = null;

    /** Loading 节点 */
    private loadingNode: IUINode | null = null;

    /** Loading 是否显示 */
    public get isLoadingShowing(): boolean {
        return this._loadingShowing;
    }
    private _loadingShowing: boolean = false;

    private constructor() {}

    public static getInstance(): UIFramework {
        if (!UIFramework.instance) {
            UIFramework.instance = new UIFramework();
        }
        return UIFramework.instance;
    }

    public static resetInstance(): void {
        UIFramework.instance = null;
    }

    // ========== UI 注册 ==========

    public registerUI(config: UIConfig): void {
        this.uiConfigs.set(config.name, config);
    }

    public registerUIs(configs: UIConfig[]): void {
        configs.forEach(config => this.registerUI(config));
    }

    public getUIConfig(name: string): UIConfig | null {
        return this.uiConfigs.get(name) || null;
    }

    // ========== UI 生命周期 ==========

    public async openUI(name: string, data?: unknown): Promise<IUINode | null> {
        // 检查是否已打开
        if (this.activeUIs.has(name)) {
            // 已打开，置顶
            this.bringToFront(name);
            return this.activeUIs.get(name) || null;
        }

        const config = this.uiConfigs.get(name);
        if (!config) {
            console.warn(`[UIFramework] UI 配置不存在: ${name}`);
            return null;
        }

        // 如果是独占 UI，关闭其他 UI
        if (config.exclusive) {
            this.closeAllInLayer(config.layer);
        }

        // 创建实例信息
        const instanceInfo: UIInstance = {
            name,
            state: UIState.LOADING,
            layer: config.layer,
            subIndex: this.getNextSubIndex(config.layer),
            openTime: Date.now(),
            data
        };
        this.uiInstances.set(name, instanceInfo);

        try {
            // 获取或创建节点
            let node = this.getFromPool(name);
            if (!node) {
                node = await this.createUINode(config);
            }

            if (!node) {
                this.uiInstances.delete(name);
                return null;
            }

            // 添加到层级容器
            const container = this.layerContainers.get(config.layer);
            if (container) {
                container.addChild(node);
            }

            // 设置 zIndex
            node.zIndex = this.calculateZIndex(config.layer, instanceInfo.subIndex);

            // 激活节点
            node.active = true;

            // 存储活跃实例
            this.activeUIs.set(name, node);

            // 更新状态
            instanceInfo.state = UIState.ENTERING;

            // 播放进入动画
            if (this.animator && config.enterAnimation !== AnimationType.NONE) {
                const duration = this.getEnterAnimationDuration(config.enterAnimation);
                await this.animator.playEnterAnimation(node, config.enterAnimation, duration);
            }

            // 更新状态为激活
            instanceInfo.state = UIState.ACTIVE;

            // 发布打开事件
            EventSystem.getInstance().emit<UIOpenedPayload>(UIEvents.UI_OPENED, { uiName: name });

            return node;
        } catch (error) {
            console.warn(`[UIFramework] 打开 UI 失败: ${name}`, error);
            this.uiInstances.delete(name);
            return null;
        }
    }

    public closeUI(name: string): void {
        const node = this.activeUIs.get(name);
        if (!node) {
            return;
        }

        const config = this.uiConfigs.get(name);
        const instanceInfo = this.uiInstances.get(name);

        if (instanceInfo) {
            instanceInfo.state = UIState.EXITING;
        }

        // 播放退出动画
        if (this.animator && config && config.exitAnimation !== AnimationType.NONE) {
            const duration = this.getExitAnimationDuration(config.exitAnimation);
            this.animator.playExitAnimation(node, config.exitAnimation, duration).then(() => {
                this.completeCloseUI(name, node, config);
            });
        } else {
            this.completeCloseUI(name, node, config);
        }
    }

    public closeAllUI(): void {
        const openUIs = Array.from(this.activeUIs.keys());
        openUIs.forEach(name => this.closeUI(name));
    }

    public closeAllInLayer(layer: UILayer): void {
        const uisInLayer = Array.from(this.uiInstances.entries())
            .filter(([_, info]) => info.layer === layer && info.state === UIState.ACTIVE)
            .map(([name]) => name);

        uisInLayer.forEach(name => this.closeUI(name));
    }

    // ========== UI 状态查询 ==========

    public getUI(name: string): IUINode | null {
        return this.activeUIs.get(name) || null;
    }

    public isUIOpen(name: string): boolean {
        const info = this.uiInstances.get(name);
        return info?.state === UIState.ACTIVE || info?.state === UIState.ENTERING;
    }

    public getOpenUIs(): string[] {
        return Array.from(this.activeUIs.keys());
    }

    public getUIInstanceInfo(name: string): UIInstance | null {
        return this.uiInstances.get(name) || null;
    }

    // ========== UI 层级管理 ==========

    public bringToFront(name: string): void {
        const node = this.activeUIs.get(name);
        const info = this.uiInstances.get(name);

        if (!node || !info) {
            return;
        }

        info.subIndex = this.getNextSubIndex(info.layer);
        node.zIndex = this.calculateZIndex(info.layer, info.subIndex);
    }

    public sendToBack(name: string): void {
        const node = this.activeUIs.get(name);
        const info = this.uiInstances.get(name);

        if (!node || !info) {
            return;
        }

        info.subIndex = 0;
        node.zIndex = this.calculateZIndex(info.layer, 0);
    }

    public calculateZIndex(layer: UILayer, subIndex: number): number {
        return layer + subIndex * 10;
    }

    // ========== Toast 系统 ==========

    public showToast(message: string, duration: number = UI_CONFIG.DEFAULT_TOAST_DURATION): void {
        this.toastQueue.push({ message, duration });

        if (!this.toastShowing) {
            this.processToastQueue();
        }
    }

    public hideToast(): void {
        if (this.toastNode) {
            this.toastNode.active = false;
            this.toastNode = null;
        }
        this.toastShowing = false;
    }

    // ========== Loading 系统 ==========

    public showLoading(_message: string = '加载中...'): void {
        if (this.loadingNode) {
            this.loadingNode.active = true;
        }
        this._loadingShowing = true;
    }

    public hideLoading(): void {
        if (this.loadingNode) {
            this.loadingNode.active = false;
        }
        this._loadingShowing = false;
    }

    public updateLoadingProgress(progress: number): void {
        // 更新进度显示（由具体实现处理）
        console.log(`[UIFramework] Loading progress: ${Math.round(progress * 100)}%`);
    }

    // ========== 依赖注入 ==========

    public setPrefabLoader(loader: IUIPrefabLoader): void {
        this.prefabLoader = loader;
    }

    public setAnimator(animator: UIAnimator): void {
        this.animator = animator;
    }

    public setLayerContainer(layer: UILayer, container: IUINode): void {
        this.layerContainers.set(layer, container);
    }

    // ========== 存档 ==========

    public exportData(): UIFrameworkData {
        return {
            openUIs: this.getOpenUIs()
        };
    }

    public importData(data: UIFrameworkData): void {
        // 关闭所有当前 UI
        this.closeAllUI();

        // 恢复打开的 UI（异步，不等待）
        if (data.openUIs) {
            data.openUIs.forEach(name => {
                this.openUI(name);
            });
        }
    }

    public reset(): void {
        // 清理 Toast 定时器
        if (this.toastTimerId !== null) {
            clearTimeout(this.toastTimerId);
            this.toastTimerId = null;
        }

        this.closeAllUI();
        this.uiConfigs.clear();
        this.activeUIs.clear();
        this.uiInstances.clear();
        this.uiPool.clear();
        this.layerContainers.clear();
        this.layerCounters.clear();
        this.toastQueue = [];
        this.toastShowing = false;
        this.toastNode = null;
        this.loadingNode = null;
        this._loadingShowing = false;
    }

    // ========== 私有方法 ==========

    /**
     * 完成关闭 UI
     */
    private completeCloseUI(name: string, node: IUINode, config: UIConfig | undefined): void {
        // 从活跃列表移除
        this.activeUIs.delete(name);

        // 隐藏节点
        node.active = false;

        // 从父节点移除
        node.removeFromParent();

        // 根据缓存策略处理
        if (config) {
            if (config.cache === CacheStrategy.POOLED) {
                this.returnToPool(name, node, config.poolSize);
            } else if (config.cache === CacheStrategy.ON_DEMAND) {
                node.destroy();
            }
        }

        // 移除实例信息
        this.uiInstances.delete(name);

        // 发布关闭事件
        EventSystem.getInstance().emit<UIClosedPayload>(UIEvents.UI_CLOSED, { uiName: name });
    }

    /**
     * 创建 UI 节点
     */
    private async createUINode(config: UIConfig): Promise<IUINode | null> {
        if (!this.prefabLoader) {
            console.warn('[UIFramework] 预制体加载器未配置');
            return null;
        }

        try {
            const prefab = await this.prefabLoader.load(config.prefab);
            const node = this.prefabLoader.instantiate(prefab);
            node.name = config.name;
            return node;
        } catch (error) {
            console.warn(`[UIFramework] 创建 UI 节点失败: ${config.name}`, error);
            return null;
        }
    }

    /**
     * 从对象池获取
     */
    private getFromPool(name: string): IUINode | null {
        const pool = this.uiPool.get(name);
        if (pool && pool.length > 0) {
            return pool.pop() || null;
        }
        return null;
    }

    /**
     * 返回到对象池
     */
    private returnToPool(name: string, node: IUINode, maxSize: number): void {
        let pool = this.uiPool.get(name);
        if (!pool) {
            pool = [];
            this.uiPool.set(name, pool);
        }

        if (pool.length < maxSize) {
            pool.push(node);
        } else {
            node.destroy();
        }
    }

    /**
     * 获取下一个子层级索引
     */
    private getNextSubIndex(layer: UILayer): number {
        const current = this.layerCounters.get(layer) || 0;
        const next = current + 1;
        this.layerCounters.set(layer, next);
        return next;
    }

    /**
     * 获取进入动画时长
     */
    private getEnterAnimationDuration(type: AnimationType): number {
        switch (type) {
            case AnimationType.SCALE:
                return UI_CONFIG.POPUP_ENTER_DURATION;
            case AnimationType.SLIDE:
                return UI_CONFIG.SLIDE_ENTER_DURATION;
            case AnimationType.FADE:
                return UI_CONFIG.FADE_DURATION;
            default:
                return 0;
        }
    }

    /**
     * 获取退出动画时长
     */
    private getExitAnimationDuration(type: AnimationType): number {
        switch (type) {
            case AnimationType.SCALE:
                return UI_CONFIG.POPUP_EXIT_DURATION;
            case AnimationType.SLIDE:
                return UI_CONFIG.SLIDE_EXIT_DURATION;
            case AnimationType.FADE:
                return UI_CONFIG.FADE_DURATION;
            default:
                return 0;
        }
    }

    /**
     * 处理 Toast 队列
     */
    private processToastQueue(): void {
        // 清除之前的定时器
        if (this.toastTimerId !== null) {
            clearTimeout(this.toastTimerId);
            this.toastTimerId = null;
        }

        if (this.toastQueue.length === 0) {
            this.toastShowing = false;
            return;
        }

        this.toastShowing = true;
        const { message, duration } = this.toastQueue.shift()!;

        // 显示 Toast（实际显示由具体实现处理）
        console.log(`[UIFramework] Toast: ${message}`);

        // 设置定时器自动隐藏
        this.toastTimerId = setTimeout(() => {
            this.toastTimerId = null;
            this.processToastQueue();
        }, duration);
    }
}

/**
 * 默认动画器实现
 */
export class DefaultUIAnimator implements UIAnimator {
    public async playEnterAnimation(node: IUINode, type: AnimationType, duration: number): Promise<void> {
        switch (type) {
            case AnimationType.SCALE:
                node.scale = 0.8;
                node.opacity = 0;
                // 模拟动画（实际由 Cocos Creator tween 处理）
                await this.delay(duration);
                node.scale = 1;
                node.opacity = 1;
                break;

            case AnimationType.FADE:
                node.opacity = 0;
                await this.delay(duration);
                node.opacity = 1;
                break;

            case AnimationType.SLIDE:
                node.position = { x: 0, y: -100 };
                await this.delay(duration);
                node.position = { x: 0, y: 0 };
                break;

            default:
                break;
        }
    }

    public async playExitAnimation(node: IUINode, type: AnimationType, duration: number): Promise<void> {
        switch (type) {
            case AnimationType.SCALE:
                await this.delay(duration);
                node.scale = 0.8;
                node.opacity = 0;
                break;

            case AnimationType.FADE:
                await this.delay(duration);
                node.opacity = 0;
                break;

            case AnimationType.SLIDE:
                await this.delay(duration);
                node.position = { x: 0, y: -100 };
                break;

            default:
                break;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 全局 UI 框架实例
 */
export const uiFramework = UIFramework.getInstance();
