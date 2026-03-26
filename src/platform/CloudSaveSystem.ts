/**
 * 云存档系统 - 数据持久化层
 *
 * 参考: design/gdd/cloud-save-system.md
 *
 * 负责保存和恢复玩家的游戏进度。使用微信云开发的云存储能力，实现跨设备同步。
 */

import { EventSystem } from '../core/EventSystem';
import { TimeState } from '../core/TimeSystem';
import { BackpackData } from '../data/BackpackSystem';
import { RecipeSystemData } from '../data/RecipeSystem';
import { StaminaData } from '../resource/StaminaSystem';
import { QuestSystemData } from '../gameplay/QuestSystem';
import { VillagerSystemData } from '../gameplay/VillagerSystem';
import { FestivalSystemData } from '../gameplay/FestivalSystem';
import { WeChatLoginSystemData } from './WeChatLoginSystem';

/**
 * 存档系统状态
 */
export enum CloudSaveState {
    /** 空闲 */
    IDLE = 'IDLE',
    /** 存档中 */
    SAVING = 'SAVING',
    /** 读档中 */
    LOADING = 'LOADING',
    /** 冲突中 */
    CONFLICT = 'CONFLICT'
}

/**
 * 存档类型
 */
export type SaveType = 'auto' | 'manual' | 'exit';

/**
 * 游戏设置
 */
export interface GameSettings {
    /** 音效音量 (0-1) */
    sfxVolume: number;
    /** 背景音乐音量 (0-1) */
    bgmVolume: number;
    /** 是否开启自动存档 */
    autoSaveEnabled: boolean;
    /** 语言设置 */
    language: string;
}

/**
 * 玩家基础数据
 */
export interface PlayerData {
    /** 玩家昵称 */
    nickname: string;
    /** 玩家头像 URL */
    avatarUrl: string;
    /** 游戏开始时间 */
    startTime: number;
    /** 总游戏时长（秒） */
    totalPlayTime: number;
}

/**
 * 完整存档数据
 */
export interface SaveData {
    /** 存档版本号 */
    version: string;
    /** 存档时间戳（毫秒） */
    timestamp: number;
    /** 存档类型 */
    type: SaveType;
    /** 玩家基础数据 */
    playerData: PlayerData;
    /** 背包数据 */
    inventoryData: BackpackData;
    /** 时间系统数据 */
    timeData: TimeState;
    /** 体力系统数据 */
    staminaData: StaminaData;
    /** 任务数据 */
    questData: QuestSystemData;
    /** 村民关系数据 */
    villagerData: VillagerSystemData;
    /** 节日数据 */
    festivalData: FestivalSystemData;
    /** 食谱数据 */
    recipeData: RecipeSystemData;
    /** 登录数据 */
    authData: WeChatLoginSystemData;
    /** 游戏设置 */
    settings: GameSettings;
}

/**
 * 存档元数据
 */
export interface SaveMetadata {
    /** 存档时间戳 */
    timestamp: number;
    /** 存档大小（字节） */
    size: number;
    /** 存档版本 */
    version: string;
    /** 存档类型 */
    type: SaveType;
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
    /** 本地存档时间 */
    localTime: number;
    /** 云端存档时间 */
    cloudTime: number;
    /** 本地存档元数据 */
    localMetadata: SaveMetadata | null;
    /** 云端存档元数据 */
    cloudMetadata: SaveMetadata | null;
}

/**
 * 事件 Payload
 */
export interface SaveStartedPayload {
    type: SaveType;
}

export interface SaveCompletedPayload {
    timestamp: number;
    size: number;
}

export interface SaveFailedPayload {
    error: string;
}

export interface LoadStartedPayload {}

export interface LoadCompletedPayload {
    timestamp: number;
}

export interface LoadFailedPayload {
    error: string;
}

export interface SyncConflictPayload {
    localTime: number;
    cloudTime: number;
}

/**
 * 存档事件 ID
 */
export const CloudSaveEvents = {
    SAVE_STARTED: 'save:started',
    SAVE_COMPLETED: 'save:completed',
    SAVE_FAILED: 'save:failed',
    LOAD_STARTED: 'load:started',
    LOAD_COMPLETED: 'load:completed',
    LOAD_FAILED: 'load:failed',
    SYNC_CONFLICT: 'sync:conflict'
} as const;

/**
 * 系统配置
 */
const SAVE_CONFIG = {
    /** 当前存档版本 */
    CURRENT_VERSION: '1.0.0',
    /** 自动存档间隔（60秒） */
    AUTO_SAVE_INTERVAL: 60000,
    /** 冲突阈值（5分钟） */
    CONFLICT_THRESHOLD: 5 * 60 * 1000,
    /** 最大存档数量 */
    MAX_SAVE_COUNT: 3,
    /** 存档超时（10秒） */
    SAVE_TIMEOUT: 10000,
    /** 本地存储键名 */
    LOCAL_SAVE_KEY: 'game_save_local',
    /** 云端存储键名 */
    CLOUD_SAVE_KEY: 'game_save_cloud'
};

/**
 * 云存储接口
 */
export interface ICloudStorage {
    /** 上传存档 */
    upload(key: string, data: string): Promise<boolean>;
    /** 下载存档 */
    download(key: string): Promise<string | null>;
    /** 删除存档 */
    delete(key: string): Promise<boolean>;
    /** 检查存档是否存在 */
    exists(key: string): Promise<boolean>;
    /** 获取存档元数据 */
    getMetadata(key: string): Promise<SaveMetadata | null>;
}

/**
 * 本地存储接口
 */
export interface ILocalStorage {
    /** 获取数据 */
    getItem(key: string): string | null;
    /** 设置数据 */
    setItem(key: string, value: string): void;
    /** 删除数据 */
    removeItem(key: string): void;
}

/**
 * 系统数据提供者接口
 */
export interface ISystemDataProvider {
    /** 导出系统数据 */
    exportData(): unknown;
    /** 导入系统数据 */
    importData(data: unknown): void;
    /** 重置系统 */
    reset(): void;
}

/**
 * 云存档系统数据（用于存档）
 */
export interface CloudSaveSystemData {
    /** 最后存档时间 */
    lastSaveTime: number;
    /** 最后读档时间 */
    lastLoadTime: number;
    /** 当前状态 */
    state: CloudSaveState;
}

/**
 * 云存档系统接口
 */
export interface ICloudSaveSystem {
    // 存档操作
    /** 保存游戏 */
    save(type: SaveType): Promise<boolean>;
    /** 加载游戏 */
    load(): Promise<SaveData | null>;
    /** 同步存档 */
    sync(): Promise<boolean>;
    /** 清除本地存档 */
    clearLocalSave(): void;

    // 冲突处理
    /** 检查是否有冲突 */
    hasConflict(): boolean;
    /** 获取冲突信息 */
    getConflictInfo(): ConflictInfo | null;
    /** 解决冲突 */
    resolveConflict(useCloud: boolean): Promise<boolean>;

    // 状态查询
    /** 获取当前状态 */
    getCurrentState(): CloudSaveState;
    /** 获取最后存档时间 */
    getLastSaveTime(): number;
    /** 获取最后读档时间 */
    getLastLoadTime(): number;
    /** 检查是否有本地存档 */
    hasLocalSave(): boolean;
    /** 检查是否有云端存档 */
    hasCloudSave(): Promise<boolean>;
    /** 获取存档元数据 */
    getSaveMetadata(source: 'local' | 'cloud'): Promise<SaveMetadata | null>;

    // 依赖注入
    /** 设置云存储 */
    setCloudStorage(storage: ICloudStorage): void;
    /** 设置本地存储 */
    setLocalStorage(storage: ILocalStorage): void;
    /** 设置系统提供者 */
    setSystemProvider(systemName: string, provider: ISystemDataProvider): void;

    // 自动存档
    /** 启动自动存档 */
    startAutoSave(): void;
    /** 停止自动存档 */
    stopAutoSave(): void;

    // 存档
    /** 导出数据 */
    exportData(): CloudSaveSystemData;
    /** 导入数据 */
    importData(data: CloudSaveSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 云存档系统实现
 */
export class CloudSaveSystem implements ICloudSaveSystem {
    private static instance: CloudSaveSystem | null = null;

    /** 当前状态 */
    private state: CloudSaveState = CloudSaveState.IDLE;

    /** 最后存档时间 */
    private lastSaveTime: number = 0;

    /** 最后读档时间 */
    private lastLoadTime: number = 0;

    /** 冲突信息 */
    private conflictInfo: ConflictInfo | null = null;

    /** 云存储 */
    private cloudStorage: ICloudStorage | null = null;

    /** 本地存储 */
    private localStorage: ILocalStorage | null = null;

    /** 系统提供者映射 */
    private systemProviders: Map<string, ISystemDataProvider> = new Map();

    /** 自动存档定时器 ID */
    private autoSaveTimerId: ReturnType<typeof setInterval> | null = null;

    /** 缓存的本地存档 */
    private cachedLocalSave: SaveData | null = null;

    /** 缓存的云端存档 */
    private cachedCloudSave: SaveData | null = null;

    private constructor() {}

    public static getInstance(): CloudSaveSystem {
        if (!CloudSaveSystem.instance) {
            CloudSaveSystem.instance = new CloudSaveSystem();
        }
        return CloudSaveSystem.instance;
    }

    public static resetInstance(): void {
        CloudSaveSystem.instance = null;
    }

    // ========== 存档操作 ==========

    public async save(type: SaveType): Promise<boolean> {
        if (this.state === CloudSaveState.SAVING) {
            return false;
        }

        this.state = CloudSaveState.SAVING;

        // 发布存档开始事件
        EventSystem.getInstance().emit<SaveStartedPayload>(CloudSaveEvents.SAVE_STARTED, { type });

        // 超时定时器 ID
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            // 设置超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('存档超时')), SAVE_CONFIG.SAVE_TIMEOUT);
            });

            const savePromise = this.performSave(type);

            await Promise.race([savePromise, timeoutPromise]);

            // 清除超时定时器
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            this.state = CloudSaveState.IDLE;
            return true;
        } catch (error) {
            // 清除超时定时器
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            const errorMessage = error instanceof Error ? error.message : '存档失败';

            this.state = CloudSaveState.IDLE;

            // 发布存档失败事件
            EventSystem.getInstance().emit<SaveFailedPayload>(CloudSaveEvents.SAVE_FAILED, {
                error: errorMessage
            });

            return false;
        }
    }

    public async load(): Promise<SaveData | null> {
        if (this.state === CloudSaveState.LOADING) {
            return null;
        }

        this.state = CloudSaveState.LOADING;

        // 发布读档开始事件
        EventSystem.getInstance().emit<LoadStartedPayload>(CloudSaveEvents.LOAD_STARTED, {});

        // 超时定时器 ID
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
            // 设置超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('读档超时')), SAVE_CONFIG.SAVE_TIMEOUT);
            });

            const loadPromise = this.performLoad();

            const data = await Promise.race([loadPromise, timeoutPromise]);

            // 清除超时定时器
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            this.state = CloudSaveState.IDLE;
            return data;
        } catch (error) {
            // 清除超时定时器
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            const errorMessage = error instanceof Error ? error.message : '读档失败';

            this.state = CloudSaveState.IDLE;

            // 发布读档失败事件
            EventSystem.getInstance().emit<LoadFailedPayload>(CloudSaveEvents.LOAD_FAILED, {
                error: errorMessage
            });

            return null;
        }
    }

    public async sync(): Promise<boolean> {
        // 检查是否有冲突
        if (await this.checkForConflict()) {
            this.state = CloudSaveState.CONFLICT;
            return false;
        }

        // 无冲突，使用云端存档
        if (this.cachedCloudSave) {
            await this.restoreFromSaveData(this.cachedCloudSave);
            return true;
        }

        // 无云端存档，上传本地存档
        if (this.cachedLocalSave) {
            return this.save('auto');
        }

        return true;
    }

    public clearLocalSave(): void {
        if (this.localStorage) {
            this.localStorage.removeItem(SAVE_CONFIG.LOCAL_SAVE_KEY);
        }
        this.cachedLocalSave = null;
        this.lastSaveTime = 0;
    }

    // ========== 冲突处理 ==========

    public hasConflict(): boolean {
        return this.state === CloudSaveState.CONFLICT && this.conflictInfo !== null;
    }

    public getConflictInfo(): ConflictInfo | null {
        return this.conflictInfo;
    }

    public async resolveConflict(useCloud: boolean): Promise<boolean> {
        if (!this.hasConflict() || !this.conflictInfo) {
            return false;
        }

        try {
            if (useCloud) {
                // 使用云端存档
                if (this.cachedCloudSave) {
                    await this.restoreFromSaveData(this.cachedCloudSave);
                    // 更新本地存档
                    this.saveToLocal(this.cachedCloudSave);
                }
            } else {
                // 使用本地存档
                if (this.cachedLocalSave) {
                    await this.restoreFromSaveData(this.cachedLocalSave);
                    // 上传到云端
                    await this.saveToCloud(this.cachedLocalSave);
                }
            }

            this.conflictInfo = null;
            this.state = CloudSaveState.IDLE;
            return true;
        } catch {
            return false;
        }
    }

    // ========== 状态查询 ==========

    public getCurrentState(): CloudSaveState {
        return this.state;
    }

    public getLastSaveTime(): number {
        return this.lastSaveTime;
    }

    public getLastLoadTime(): number {
        return this.lastLoadTime;
    }

    public hasLocalSave(): boolean {
        return this.loadFromLocal() !== null;
    }

    public async hasCloudSave(): Promise<boolean> {
        if (!this.cloudStorage) {
            return false;
        }
        return this.cloudStorage.exists(SAVE_CONFIG.CLOUD_SAVE_KEY);
    }

    public async getSaveMetadata(source: 'local' | 'cloud'): Promise<SaveMetadata | null> {
        if (source === 'local') {
            const data = this.loadFromLocal();
            if (data) {
                return {
                    timestamp: data.timestamp,
                    size: JSON.stringify(data).length,
                    version: data.version,
                    type: data.type
                };
            }
            return null;
        } else {
            if (!this.cloudStorage) {
                return null;
            }
            return this.cloudStorage.getMetadata(SAVE_CONFIG.CLOUD_SAVE_KEY);
        }
    }

    // ========== 依赖注入 ==========

    public setCloudStorage(storage: ICloudStorage): void {
        this.cloudStorage = storage;
    }

    public setLocalStorage(storage: ILocalStorage): void {
        this.localStorage = storage;
    }

    public setSystemProvider(systemName: string, provider: ISystemDataProvider): void {
        this.systemProviders.set(systemName, provider);
    }

    // ========== 自动存档 ==========

    public startAutoSave(): void {
        if (this.autoSaveTimerId !== null) {
            return;
        }

        this.autoSaveTimerId = setInterval(() => {
            this.save('auto');
        }, SAVE_CONFIG.AUTO_SAVE_INTERVAL);
    }

    public stopAutoSave(): void {
        if (this.autoSaveTimerId !== null) {
            clearInterval(this.autoSaveTimerId);
            this.autoSaveTimerId = null;
        }
    }

    // ========== 存档 ==========

    public exportData(): CloudSaveSystemData {
        return {
            lastSaveTime: this.lastSaveTime,
            lastLoadTime: this.lastLoadTime,
            state: this.state
        };
    }

    public importData(data: CloudSaveSystemData): void {
        this.lastSaveTime = data.lastSaveTime;
        this.lastLoadTime = data.lastLoadTime;
        this.state = data.state;
    }

    public reset(): void {
        this.stopAutoSave();
        this.state = CloudSaveState.IDLE;
        this.lastSaveTime = 0;
        this.lastLoadTime = 0;
        this.conflictInfo = null;
        this.cachedLocalSave = null;
        this.cachedCloudSave = null;
        this.systemProviders.clear();
    }

    // ========== 私有方法 ==========

    /**
     * 执行存档
     */
    private async performSave(type: SaveType): Promise<void> {
        const saveData = this.collectSystemData(type);
        const dataSize = JSON.stringify(saveData).length;

        // 保存到本地
        this.saveToLocal(saveData);

        // 上传到云端
        await this.saveToCloud(saveData);

        this.lastSaveTime = Date.now();
        this.cachedLocalSave = saveData;
        this.cachedCloudSave = saveData;

        // 发布存档完成事件
        EventSystem.getInstance().emit<SaveCompletedPayload>(CloudSaveEvents.SAVE_COMPLETED, {
            timestamp: saveData.timestamp,
            size: dataSize
        });
    }

    /**
     * 执行读档
     */
    private async performLoad(): Promise<SaveData | null> {
        // 加载本地存档
        const localSave = this.loadFromLocal();
        this.cachedLocalSave = localSave;

        // 尝试加载云端存档
        const cloudSave = await this.loadFromCloud();
        this.cachedCloudSave = cloudSave;

        // 选择最新的存档
        let selectedSave: SaveData | null = null;

        if (localSave && cloudSave) {
            const timeDiff = Math.abs(localSave.timestamp - cloudSave.timestamp);

            if (timeDiff < SAVE_CONFIG.CONFLICT_THRESHOLD) {
                // 时间差小于阈值，使用云端存档
                selectedSave = cloudSave;
            } else if (cloudSave.timestamp > localSave.timestamp) {
                // 云端更新，使用云端存档
                selectedSave = cloudSave;
            } else {
                // 本地更新，使用本地存档
                selectedSave = localSave;
            }
        } else if (cloudSave) {
            selectedSave = cloudSave;
        } else if (localSave) {
            selectedSave = localSave;
        }

        if (selectedSave) {
            await this.restoreFromSaveData(selectedSave);
            this.lastLoadTime = Date.now();

            // 发布读档完成事件
            EventSystem.getInstance().emit<LoadCompletedPayload>(CloudSaveEvents.LOAD_COMPLETED, {
                timestamp: selectedSave.timestamp
            });
        }

        return selectedSave;
    }

    /**
     * 检查是否有冲突
     */
    private async checkForConflict(): Promise<boolean> {
        const localSave = this.loadFromLocal();
        const cloudSave = await this.loadFromCloud();

        this.cachedLocalSave = localSave;
        this.cachedCloudSave = cloudSave;

        if (!localSave || !cloudSave) {
            return false;
        }

        const timeDiff = Math.abs(localSave.timestamp - cloudSave.timestamp);

        // 时间差大于阈值，需要用户选择
        if (timeDiff >= SAVE_CONFIG.CONFLICT_THRESHOLD) {
            this.conflictInfo = {
                localTime: localSave.timestamp,
                cloudTime: cloudSave.timestamp,
                localMetadata: {
                    timestamp: localSave.timestamp,
                    size: JSON.stringify(localSave).length,
                    version: localSave.version,
                    type: localSave.type
                },
                cloudMetadata: {
                    timestamp: cloudSave.timestamp,
                    size: JSON.stringify(cloudSave).length,
                    version: cloudSave.version,
                    type: cloudSave.type
                }
            };

            // 发布冲突事件
            EventSystem.getInstance().emit<SyncConflictPayload>(CloudSaveEvents.SYNC_CONFLICT, {
                localTime: localSave.timestamp,
                cloudTime: cloudSave.timestamp
            });

            return true;
        }

        return false;
    }

    /**
     * 收集所有系统数据
     */
    private collectSystemData(type: SaveType): SaveData {
        const now = Date.now();

        const saveData: SaveData = {
            version: SAVE_CONFIG.CURRENT_VERSION,
            timestamp: now,
            type,
            playerData: this.collectPlayerData(),
            inventoryData: this.collectSystemDataByKey('inventory') as BackpackData,
            timeData: this.collectSystemDataByKey('time') as TimeState,
            staminaData: this.collectSystemDataByKey('stamina') as StaminaData,
            questData: this.collectSystemDataByKey('quest') as QuestSystemData,
            villagerData: this.collectSystemDataByKey('villager') as VillagerSystemData,
            festivalData: this.collectSystemDataByKey('festival') as FestivalSystemData,
            recipeData: this.collectSystemDataByKey('recipe') as RecipeSystemData,
            authData: this.collectSystemDataByKey('auth') as WeChatLoginSystemData,
            settings: this.collectSettings()
        };

        return saveData;
    }

    /**
     * 收集玩家数据
     */
    private collectPlayerData(): PlayerData {
        const authData = this.collectSystemDataByKey('auth') as WeChatLoginSystemData | null;

        return {
            nickname: authData?.userInfo?.nickname || '旅行者',
            avatarUrl: authData?.userInfo?.avatarUrl || '',
            startTime: 0, // 需要从其他地方获取
            totalPlayTime: 0 // 需要从其他地方获取
        };
    }

    /**
     * 收集游戏设置
     */
    private collectSettings(): GameSettings {
        const settingsData = this.collectSystemDataByKey('settings');
        if (settingsData) {
            return settingsData as GameSettings;
        }

        // 默认设置
        return {
            sfxVolume: 1.0,
            bgmVolume: 0.8,
            autoSaveEnabled: true,
            language: 'zh-CN'
        };
    }

    /**
     * 根据键名收集系统数据
     */
    private collectSystemDataByKey(key: string): unknown {
        const provider = this.systemProviders.get(key);
        if (provider) {
            return provider.exportData();
        }
        return null;
    }

    /**
     * 从存档数据恢复各系统
     */
    private async restoreFromSaveData(data: SaveData): Promise<void> {
        // 恢复各系统数据
        this.restoreSystemData('inventory', data.inventoryData);
        this.restoreSystemData('time', data.timeData);
        this.restoreSystemData('stamina', data.staminaData);
        this.restoreSystemData('quest', data.questData);
        this.restoreSystemData('villager', data.villagerData);
        this.restoreSystemData('festival', data.festivalData);
        this.restoreSystemData('recipe', data.recipeData);
        this.restoreSystemData('auth', data.authData);
        this.restoreSystemData('settings', data.settings);
    }

    /**
     * 恢复系统数据
     */
    private restoreSystemData(key: string, data: unknown): void {
        const provider = this.systemProviders.get(key);
        if (provider && data) {
            provider.importData(data);
        }
    }

    /**
     * 保存到本地
     */
    private saveToLocal(data: SaveData): void {
        if (this.localStorage) {
            try {
                this.localStorage.setItem(SAVE_CONFIG.LOCAL_SAVE_KEY, JSON.stringify(data));
            } catch (error) {
                console.warn('[CloudSaveSystem] 保存本地存档失败:', error);
            }
        }
    }

    /**
     * 从本地加载
     */
    private loadFromLocal(): SaveData | null {
        if (this.cachedLocalSave) {
            return this.cachedLocalSave;
        }

        if (!this.localStorage) {
            return null;
        }

        try {
            const dataStr = this.localStorage.getItem(SAVE_CONFIG.LOCAL_SAVE_KEY);
            if (dataStr) {
                this.cachedLocalSave = JSON.parse(dataStr) as SaveData;
                return this.cachedLocalSave;
            }
        } catch (error) {
            console.warn('[CloudSaveSystem] 加载本地存档失败:', error);
        }

        return null;
    }

    /**
     * 保存到云端
     */
    private async saveToCloud(data: SaveData): Promise<void> {
        if (!this.cloudStorage) {
            return;
        }

        try {
            await this.cloudStorage.upload(SAVE_CONFIG.CLOUD_SAVE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[CloudSaveSystem] 上传云端存档失败:', error);
            // 不抛出错误，允许本地存档成功
        }
    }

    /**
     * 从云端加载
     */
    private async loadFromCloud(): Promise<SaveData | null> {
        if (this.cachedCloudSave) {
            return this.cachedCloudSave;
        }

        if (!this.cloudStorage) {
            return null;
        }

        try {
            const dataStr = await this.cloudStorage.download(SAVE_CONFIG.CLOUD_SAVE_KEY);
            if (dataStr) {
                this.cachedCloudSave = JSON.parse(dataStr) as SaveData;
                return this.cachedCloudSave;
            }
        } catch (error) {
            console.warn('[CloudSaveSystem] 下载云端存档失败:', error);
        }

        return null;
    }
}

/**
 * 全局云存档系统实例
 */
export const cloudSaveSystem = CloudSaveSystem.getInstance();
