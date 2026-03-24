/**
 * 事件系统 - 发布-订阅模式实现
 *
 * 参考: docs/architecture/adr-0001-event-driven-architecture.md
 * 参考: design/gdd/event-system.md
 */

/**
 * 事件标识符
 */
export type EventId = string;

/**
 * 事件载荷
 */
export type EventPayload = unknown;

/**
 * 事件监听器回调
 */
export type EventCallback<T extends EventPayload = EventPayload> = (payload: T) => void;

/**
 * 事件监听器内部结构
 */
interface EventListenerEntry {
    eventId: EventId;
    callback: EventCallback;
    priority: number;
    once: boolean;
}

/**
 * 事件系统接口
 */
export interface IEventSystem {
    /**
     * 注册事件监听器
     * @param eventId 事件标识符
     * @param callback 回调函数
     * @param priority 优先级（数值越大越先执行，默认为 0）
     */
    on<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>,
        priority?: number
    ): void;

    /**
     * 注册一次性监听器（触发后自动移除）
     * @param eventId 事件标识符
     * @param callback 回调函数
     * @param priority 优先级（数值越大越先执行，默认为 0）
     */
    once<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>,
        priority?: number
    ): void;

    /**
     * 移除事件监听器
     * @param eventId 事件标识符
     * @param callback 回调函数
     */
    off<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>
    ): void;

    /**
     * 发布事件
     * @param eventId 事件标识符
     * @param payload 事件载荷
     */
    emit<T extends EventPayload = EventPayload>(
        eventId: EventId,
        payload?: T
    ): void;

    /**
     * 检查是否有指定事件的监听器
     * @param eventId 事件标识符
     */
    hasListener(eventId: EventId): boolean;

    /**
     * 获取指定事件的监听器数量
     * @param eventId 事件标识符
     */
    getListenerCount(eventId: EventId): number;

    /**
     * 清除所有监听器（用于场景切换或销毁时）
     */
    clearAll(): void;
}

/**
 * 事件系统实现
 *
 * 单例模式，全局唯一实例
 */
export class EventSystem implements IEventSystem {
    private static instance: EventSystem | null = null;

    /**
     * 监听器映射表
     * key: 事件标识符
     * value: 监听器列表
     */
    private listeners: Map<EventId, EventListenerEntry[]> = new Map();

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): EventSystem {
        if (!EventSystem.instance) {
            EventSystem.instance = new EventSystem();
        }
        return EventSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        EventSystem.instance = null;
    }

    public on<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>,
        priority: number = 0
    ): void {
        this.addListener(eventId, callback, priority, false);
    }

    public once<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>,
        priority: number = 0
    ): void {
        this.addListener(eventId, callback, priority, true);
    }

    public off<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>
    ): void {
        const entries = this.listeners.get(eventId);
        if (!entries) return;

        const index = entries.findIndex(entry => entry.callback === callback);
        if (index !== -1) {
            entries.splice(index, 1);
        }

        // 如果该事件没有监听器了，移除整个 key
        if (entries.length === 0) {
            this.listeners.delete(eventId);
        }
    }

    public emit<T extends EventPayload = EventPayload>(
        eventId: EventId,
        payload?: T
    ): void {
        const entries = this.listeners.get(eventId);
        if (!entries || entries.length === 0) return;

        // 复制一份列表，防止回调中修改监听器列表
        const entriesCopy = [...entries];

        // 收集需要移除的一次性监听器
        const toRemove: EventCallback[] = [];

        for (const entry of entriesCopy) {
            try {
                if (payload !== undefined) {
                    entry.callback(payload);
                } else {
                    entry.callback(undefined as T);
                }

                if (entry.once) {
                    toRemove.push(entry.callback);
                }
            } catch (error) {
                console.error(`[EventSystem] Error in listener for "${eventId}":`, error);
            }
        }

        // 移除一次性监听器
        for (const callback of toRemove) {
            this.off(eventId, callback);
        }
    }

    public hasListener(eventId: EventId): boolean {
        const entries = this.listeners.get(eventId);
        return entries !== undefined && entries.length > 0;
    }

    public getListenerCount(eventId: EventId): number {
        const entries = this.listeners.get(eventId);
        return entries ? entries.length : 0;
    }

    public clearAll(): void {
        this.listeners.clear();
    }

    /**
     * 添加监听器（内部方法）
     */
    private addListener<T extends EventPayload = EventPayload>(
        eventId: EventId,
        callback: EventCallback<T>,
        priority: number,
        once: boolean
    ): void {
        if (!this.listeners.has(eventId)) {
            this.listeners.set(eventId, []);
        }

        const entries = this.listeners.get(eventId)!;

        // 检查是否已存在相同的回调
        const exists = entries.some(entry => entry.callback === callback);
        if (exists) {
            console.warn(`[EventSystem] Callback already registered for "${eventId}"`);
            return;
        }

        const entry: EventListenerEntry = {
            eventId,
            callback: callback as EventCallback,
            priority,
            once
        };

        entries.push(entry);

        // 按优先级排序（降序，数值大的先执行）
        entries.sort((a, b) => b.priority - a.priority);
    }
}

/**
 * 全局事件系统实例
 */
export const eventSystem = EventSystem.getInstance();
