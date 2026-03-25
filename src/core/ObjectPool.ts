/**
 * 通用对象池系统
 *
 * 提供对象复用能力，减少 GC 压力和内存分配开销。
 */

import { EventSystem } from './EventSystem';

/**
 * 对象池配置
 */
export interface ObjectPoolConfig<T> {
    /** 对象池名称 */
    name: string;
    /** 初始大小（预热数量） */
    initialSize?: number;
    /** 最大大小 */
    maxSize: number;
    /** 工厂函数 - 创建新对象 */
    factory: () => T;
    /** 重置函数 - 对象返回池时重置状态 */
    reset?: (obj: T) => void;
    /** 销毁函数 - 对象被丢弃时清理资源 */
    destroy?: (obj: T) => void;
    /** 自动收缩配置 */
    autoShrink?: {
        /** 空闲多久后开始收缩（毫秒） */
        idleTime: number;
        /** 收缩到使用量的多少倍 */
        shrinkRatio: number;
    };
}

/**
 * 对象池统计信息
 */
export interface ObjectPoolStats {
    /** 池名称 */
    name: string;
    /** 当前池大小 */
    poolSize: number;
    /** 活跃对象数 */
    activeCount: number;
    /** 总获取次数 */
    totalAcquire: number;
    /** 总释放次数 */
    totalRelease: number;
    /** 缓存命中次数 */
    cacheHits: number;
    /** 缓存未命中次数 */
    cacheMisses: number;
    /** 命中率 */
    hitRate: number;
}

/**
 * 对象池事件
 */
export const ObjectPoolEvents = {
    STATS_UPDATED: 'objectpool:stats_updated',
    POOL_EXHAUSTED: 'objectpool:exhausted',
    POOL_SHRINK: 'objectpool:shrink'
} as const;

/**
 * 通用对象池
 *
 * @example
 * ```typescript
 * // 创建子弹对象池
 * const bulletPool = new ObjectPool<Bullet>({
 *     name: 'bullet',
 *     maxSize: 100,
 *     factory: () => new Bullet(),
 *     reset: (bullet) => bullet.reset(),
 *     destroy: (bullet) => bullet.destroy()
 * });
 *
 * // 获取子弹
 * const bullet = bulletPool.acquire();
 *
 * // 使用后归还
 * bulletPool.release(bullet);
 * ```
 */
export class ObjectPool<T> {
    private readonly config: ObjectPoolConfig<T>;
    private readonly pool: T[] = [];
    private readonly eventSystem: EventSystem;

    // 统计
    private stats = {
        totalAcquire: 0,
        totalRelease: 0,
        cacheHits: 0,
        cacheMisses: 0,
        activeCount: 0
    };

    // 自动收缩
    private lastAccessTime: number = Date.now();
    private shrinkTimerId: ReturnType<typeof setInterval> | null = null;

    constructor(config: ObjectPoolConfig<T>) {
        this.config = {
            initialSize: 0,
            autoShrink: undefined,
            ...config
        };
        this.eventSystem = EventSystem.getInstance();

        // 预热
        if (this.config.initialSize && this.config.initialSize > 0) {
            this.warmup(this.config.initialSize);
        }

        // 启动自动收缩
        if (this.config.autoShrink) {
            this.startAutoShrink();
        }
    }

    /**
     * 获取池名称
     */
    public get name(): string {
        return this.config.name;
    }

    /**
     * 获取当前池大小
     */
    public get size(): number {
        return this.pool.length;
    }

    /**
     * 获取活跃对象数
     */
    public get activeCount(): number {
        return this.stats.activeCount;
    }

    /**
     * 预热 - 预先创建对象
     */
    public warmup(count: number): void {
        const toCreate = Math.min(count, this.config.maxSize - this.pool.length);
        for (let i = 0; i < toCreate; i++) {
            const obj = this.config.factory();
            this.pool.push(obj);
        }
    }

    /**
     * 获取对象
     */
    public acquire(): T {
        this.lastAccessTime = Date.now();
        this.stats.totalAcquire++;

        let obj: T;

        if (this.pool.length > 0) {
            obj = this.pool.pop()!;
            this.stats.cacheHits++;
        } else {
            obj = this.config.factory();
            this.stats.cacheMisses++;

            // 池耗尽事件
            if (this.stats.activeCount >= this.config.maxSize) {
                this.eventSystem.emit(ObjectPoolEvents.POOL_EXHAUSTED, {
                    poolName: this.config.name,
                    activeCount: this.stats.activeCount
                });
            }
        }

        this.stats.activeCount++;
        return obj;
    }

    /**
     * 释放对象（归还到池）
     */
    public release(obj: T): void {
        this.lastAccessTime = Date.now();
        this.stats.totalRelease++;
        this.stats.activeCount = Math.max(0, this.stats.activeCount - 1);

        // 重置对象状态
        if (this.config.reset) {
            this.config.reset(obj);
        }

        // 检查池是否已满
        if (this.pool.length < this.config.maxSize) {
            this.pool.push(obj);
        } else if (this.config.destroy) {
            // 池已满，销毁对象
            this.config.destroy(obj);
        }
    }

    /**
     * 批量获取
     */
    public acquireMultiple(count: number): T[] {
        const result: T[] = [];
        for (let i = 0; i < count; i++) {
            result.push(this.acquire());
        }
        return result;
    }

    /**
     * 批量释放
     */
    public releaseMultiple(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /**
     * 清空池
     */
    public clear(): void {
        if (this.config.destroy) {
            for (const obj of this.pool) {
                this.config.destroy(obj);
            }
        }
        this.pool.length = 0;
    }

    /**
     * 收缩池到指定大小
     */
    public shrink(targetSize: number): void {
        const toRemove = this.pool.length - targetSize;
        if (toRemove <= 0) return;

        for (let i = 0; i < toRemove; i++) {
            const obj = this.pool.pop();
            if (obj && this.config.destroy) {
                this.config.destroy(obj);
            }
        }

        this.eventSystem.emit(ObjectPoolEvents.POOL_SHRINK, {
            poolName: this.config.name,
            oldSize: this.pool.length + toRemove,
            newSize: this.pool.length
        });
    }

    /**
     * 获取统计信息
     */
    public getStats(): ObjectPoolStats {
        const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
        return {
            name: this.config.name,
            poolSize: this.pool.length,
            activeCount: this.stats.activeCount,
            totalAcquire: this.stats.totalAcquire,
            totalRelease: this.stats.totalRelease,
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            hitRate: totalRequests > 0 ? this.stats.cacheHits / totalRequests : 0
        };
    }

    /**
     * 重置统计
     */
    public resetStats(): void {
        this.stats = {
            totalAcquire: 0,
            totalRelease: 0,
            cacheHits: 0,
            cacheMisses: 0,
            activeCount: 0
        };
    }

    /**
     * 销毁对象池
     */
    public destroy(): void {
        this.stopAutoShrink();
        this.clear();
    }

    // ========== 自动收缩 ==========

    private startAutoShrink(): void {
        if (!this.config.autoShrink) return;

        const checkInterval = this.config.autoShrink.idleTime / 2;
        this.shrinkTimerId = setInterval(() => {
            const idleTime = Date.now() - this.lastAccessTime;
            if (idleTime >= this.config.autoShrink!.idleTime) {
                const targetSize = Math.ceil(
                    this.stats.activeCount * this.config.autoShrink!.shrinkRatio
                );
                this.shrink(Math.max(1, targetSize));
            }
        }, checkInterval);
    }

    private stopAutoShrink(): void {
        if (this.shrinkTimerId !== null) {
            clearInterval(this.shrinkTimerId);
            this.shrinkTimerId = null;
        }
    }
}

/**
 * 对象池管理器
 *
 * 管理多个对象池，提供统一的创建和销毁接口。
 */
export class ObjectPoolManager {
    private static instance: ObjectPoolManager | null = null;

    private pools: Map<string, ObjectPool<unknown>> = new Map();

    private constructor() {
        // 单例模式，无需初始化
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): ObjectPoolManager {
        if (!ObjectPoolManager.instance) {
            ObjectPoolManager.instance = new ObjectPoolManager();
        }
        return ObjectPoolManager.instance;
    }

    /**
     * 创建并注册对象池
     */
    public createPool<T>(config: ObjectPoolConfig<T>): ObjectPool<T> {
        if (this.pools.has(config.name)) {
            console.warn(`[ObjectPoolManager] Pool "${config.name}" already exists`);
            return this.getPool<T>(config.name)!;
        }

        const pool = new ObjectPool<T>(config);
        this.pools.set(config.name, pool as ObjectPool<unknown>);
        return pool;
    }

    /**
     * 获取对象池
     */
    public getPool<T>(name: string): ObjectPool<T> | undefined {
        return this.pools.get(name) as ObjectPool<T> | undefined;
    }

    /**
     * 检查对象池是否存在
     */
    public hasPool(name: string): boolean {
        return this.pools.has(name);
    }

    /**
     * 从指定池获取对象
     */
    public acquire<T>(poolName: string): T | undefined {
        const pool = this.getPool<T>(poolName);
        return pool?.acquire();
    }

    /**
     * 释放对象到指定池
     */
    public release<T>(poolName: string, obj: T): void {
        const pool = this.getPool<T>(poolName);
        pool?.release(obj);
    }

    /**
     * 获取所有池的统计信息
     */
    public getAllStats(): ObjectPoolStats[] {
        const result: ObjectPoolStats[] = [];
        this.pools.forEach(pool => {
            result.push(pool.getStats());
        });
        return result;
    }

    /**
     * 收缩所有池
     */
    public shrinkAll(): void {
        this.pools.forEach(pool => {
            pool.shrink(Math.ceil(pool.activeCount * 1.5));
        });
    }

    /**
     * 清空所有池
     */
    public clearAll(): void {
        this.pools.forEach(pool => {
            pool.clear();
        });
    }

    /**
     * 销毁所有池
     */
    public destroyAll(): void {
        this.pools.forEach(pool => {
            pool.destroy();
        });
        this.pools.clear();
    }

    /**
     * 销毁指定池
     */
    public destroyPool(name: string): boolean {
        const pool = this.pools.get(name);
        if (pool) {
            pool.destroy();
            this.pools.delete(name);
            return true;
        }
        return false;
    }

    /**
     * 重置单例（用于测试）
     */
    public static resetInstance(): void {
        if (ObjectPoolManager.instance) {
            ObjectPoolManager.instance.destroyAll();
            ObjectPoolManager.instance = null;
        }
    }
}

// 导出便捷函数
export const objectPoolManager = ObjectPoolManager.getInstance;
