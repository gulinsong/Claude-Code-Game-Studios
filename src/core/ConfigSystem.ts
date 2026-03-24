/**
 * 配置系统 - JSON 配置加载和管理
 *
 * 参考: design/gdd/config-system.md
 */

import { eventSystem } from './EventSystem';

/**
 * 配置变更事件载荷
 */
export interface ConfigChangedPayload {
    configKey: string;
    oldValue: unknown;
    newValue: unknown;
}

/**
 * 配置事件标识符
 */
export const ConfigEvents = {
    CONFIG_CHANGED: 'config:changed',
    CONFIG_LOADED: 'config:loaded',
    CONFIG_RELOADED: 'config:reloaded'
} as const;

/**
 * 配置系统接口
 */
export interface IConfigSystem {
    /**
     * 加载配置
     * @param configKey 配置键名
     * @param configData 配置数据
     */
    load<T>(configKey: string, configData: T): void;

    /**
     * 获取配置
     * @param configKey 配置键名
     */
    get<T>(configKey: string): T | undefined;

    /**
     * 获取配置（带默认值）
     * @param configKey 配置键名
     * @param defaultValue 默认值
     */
    getOrDefault<T>(configKey: string, defaultValue: T): T;

    /**
     * 检查配置是否存在
     * @param configKey 配置键名
     */
    has(configKey: string): boolean;

    /**
     * 更新配置值
     * @param configKey 配置键名
     * @param value 新值
     */
    set<T>(configKey: string, value: T): void;

    /**
     * 清除所有配置
     */
    clear(): void;

    /**
     * 获取所有配置键
     */
    getAllKeys(): string[];
}

/**
 * 配置系统实现
 */
export class ConfigSystem implements IConfigSystem {
    private static instance: ConfigSystem | null = null;

    /**
     * 配置存储
     */
    private configs: Map<string, unknown> = new Map();

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): ConfigSystem {
        if (!ConfigSystem.instance) {
            ConfigSystem.instance = new ConfigSystem();
        }
        return ConfigSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        ConfigSystem.instance = null;
    }

    public load<T>(configKey: string, configData: T): void {
        this.configs.set(configKey, configData);

        eventSystem.emit<ConfigChangedPayload>(ConfigEvents.CONFIG_LOADED, {
            configKey,
            oldValue: undefined,
            newValue: configData
        });
    }

    public get<T>(configKey: string): T | undefined {
        return this.configs.get(configKey) as T | undefined;
    }

    public getOrDefault<T>(configKey: string, defaultValue: T): T {
        const value = this.configs.get(configKey);
        return value !== undefined ? (value as T) : defaultValue;
    }

    public has(configKey: string): boolean {
        return this.configs.has(configKey);
    }

    public set<T>(configKey: string, value: T): void {
        const oldValue = this.configs.get(configKey);
        this.configs.set(configKey, value);

        eventSystem.emit<ConfigChangedPayload>(ConfigEvents.CONFIG_CHANGED, {
            configKey,
            oldValue,
            newValue: value
        });
    }

    public clear(): void {
        this.configs.clear();
    }

    public getAllKeys(): string[] {
        return Array.from(this.configs.keys());
    }
}

/**
 * 全局配置系统实例
 */
export const configSystem = ConfigSystem.getInstance();
