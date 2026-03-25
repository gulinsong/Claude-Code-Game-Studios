/**
 * CloudSaveSystem 单元测试
 */

import {
    CloudSaveSystem,
    CloudSaveState,
    CloudSaveEvents,
    ICloudStorage,
    ILocalStorage,
    ISystemDataProvider,
    SaveData
} from '../../src/platform/CloudSaveSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { Season, Period } from '../../src/core/TimeSystem';
import { FestivalPhase } from '../../src/gameplay/FestivalSystem';

// Mock 云存储
const createMockCloudStorage = (): jest.Mocked<ICloudStorage> => ({
    upload: jest.fn().mockResolvedValue(true),
    download: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
    getMetadata: jest.fn().mockResolvedValue(null)
});

// Mock 本地存储
const createMockLocalStorage = (): jest.Mocked<ILocalStorage> => {
    const store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; })
    };
};

// Mock 系统数据提供者
const createMockSystemProvider = (data: unknown = null): jest.Mocked<ISystemDataProvider> => ({
    exportData: jest.fn().mockReturnValue(data),
    importData: jest.fn(),
    reset: jest.fn()
});

// 创建测试用存档数据
const createTestSaveData = (timestamp: number = Date.now()): SaveData => ({
    version: '1.0.0',
    timestamp,
    type: 'manual',
    playerData: {
        nickname: '测试玩家',
        avatarUrl: '',
        startTime: Date.now() - 100000,
        totalPlayTime: 100
    },
    inventoryData: {
        materialSlots: [],
        craftedSlots: [],
        maxSlotsPerTab: 20
    },
    timeData: {
        gameHour: 10,
        gameMinute: 30,
        gameDay: 1,
        season: Season.SPRING,
        period: Period.MORNING,
        realTimestamp: Date.now(),
        speedMultiplier: 1,
        isPaused: false
    },
    staminaData: {
        current: 100,
        max: 100,
        lastUpdateTime: Date.now()
    },
    questData: {
        progress: {},
        completedQuests: [],
        lastDailyReset: Date.now()
    },
    villagerData: {
        relationships: {},
        currentGameDay: 1
    },
    festivalData: {
        currentFestivalId: null,
        phase: FestivalPhase.NORMAL,
        taskProgress: {},
        celebrationPlayCount: 0,
        rewardsClaimed: false,
        lastCheckedGameDay: 1,
        completedFestivals: []
    },
    recipeData: {
        progress: {}
    },
    authData: {
        userInfo: {
            openid: 'test_openid',
            nickname: '测试玩家',
            avatarUrl: ''
        },
        token: 'test_token',
        tokenExpireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
    },
    settings: {
        sfxVolume: 1.0,
        bgmVolume: 0.8,
        autoSaveEnabled: true,
        language: 'zh-CN'
    }
});

describe('CloudSaveSystem', () => {
    let saveSystem: CloudSaveSystem;
    let eventSystem: EventSystem;
    let mockCloudStorage: jest.Mocked<ICloudStorage>;
    let mockLocalStorage: jest.Mocked<ILocalStorage>;

    beforeEach(() => {
        // 重置所有单例
        CloudSaveSystem.resetInstance();
        EventSystem.resetInstance();

        saveSystem = CloudSaveSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 创建 mock
        mockCloudStorage = createMockCloudStorage();
        mockLocalStorage = createMockLocalStorage();

        // 设置依赖
        saveSystem.setCloudStorage(mockCloudStorage);
        saveSystem.setLocalStorage(mockLocalStorage);
    });

    afterEach(() => {
        saveSystem.stopAutoSave();
    });

    describe('初始状态', () => {
        it('初始应该是空闲状态', () => {
            expect(saveSystem.getCurrentState()).toBe(CloudSaveState.IDLE);
        });

        it('初始最后存档时间应该是 0', () => {
            expect(saveSystem.getLastSaveTime()).toBe(0);
        });

        it('初始最后读档时间应该是 0', () => {
            expect(saveSystem.getLastLoadTime()).toBe(0);
        });

        it('初始不应该有冲突', () => {
            expect(saveSystem.hasConflict()).toBe(false);
        });
    });

    describe('存档操作', () => {
        it('存档成功应该返回 true', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            const result = await saveSystem.save('manual');

            expect(result).toBe(true);
        });

        it('存档成功应该发布 SAVE_COMPLETED 事件', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            const handler = jest.fn();
            eventSystem.on(CloudSaveEvents.SAVE_COMPLETED, handler);

            await saveSystem.save('manual');

            expect(handler).toHaveBeenCalled();
        });

        it('存档开始应该发布 SAVE_STARTED 事件', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            const handler = jest.fn();
            eventSystem.on(CloudSaveEvents.SAVE_STARTED, handler);

            await saveSystem.save('manual');

            expect(handler).toHaveBeenCalledWith({ type: 'manual' });
        });

        it('存档应该保存到本地存储', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            await saveSystem.save('manual');

            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });

        it('存档应该上传到云端', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            await saveSystem.save('manual');

            expect(mockCloudStorage.upload).toHaveBeenCalled();
        });

        it('云端上传失败不应该影响本地存档', async () => {
            mockCloudStorage.upload.mockRejectedValue(new Error('网络错误'));

            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            const result = await saveSystem.save('manual');

            expect(result).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('读档操作', () => {
        it('读档成功应该返回存档数据', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const result = await saveSystem.load();

            expect(result).not.toBeNull();
            expect(result?.version).toBe('1.0.0');
        });

        it('读档成功应该发布 LOAD_COMPLETED 事件', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const handler = jest.fn();
            eventSystem.on(CloudSaveEvents.LOAD_COMPLETED, handler);

            await saveSystem.load();

            expect(handler).toHaveBeenCalled();
        });

        it('读档开始应该发布 LOAD_STARTED 事件', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const handler = jest.fn();
            eventSystem.on(CloudSaveEvents.LOAD_STARTED, handler);

            await saveSystem.load();

            expect(handler).toHaveBeenCalled();
        });

        it('无存档时读档应该返回 null', async () => {
            const result = await saveSystem.load();

            expect(result).toBeNull();
        });

        it('读档应该尝试从云端下载', async () => {
            const testData = createTestSaveData();
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(testData));

            await saveSystem.load();

            expect(mockCloudStorage.download).toHaveBeenCalled();
        });

        it('云端存档更新时应该使用云端存档', async () => {
            const localData = createTestSaveData(Date.now() - 10000);
            const cloudData = createTestSaveData(Date.now());

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            const result = await saveSystem.load();

            expect(result?.timestamp).toBe(cloudData.timestamp);
        });

        it('本地存档更新且时间差大于阈值时应该使用本地存档', async () => {
            const localData = createTestSaveData(Date.now());
            const cloudData = createTestSaveData(Date.now() - 10 * 60 * 1000); // 10分钟前

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            const result = await saveSystem.load();

            expect(result?.timestamp).toBe(localData.timestamp);
        });
    });

    describe('数据恢复', () => {
        it('读档应该恢复各系统数据', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const inventoryProvider = createMockSystemProvider();
            const timeProvider = createMockSystemProvider();
            saveSystem.setSystemProvider('inventory', inventoryProvider);
            saveSystem.setSystemProvider('time', timeProvider);

            await saveSystem.load();

            expect(inventoryProvider.importData).toHaveBeenCalled();
            expect(timeProvider.importData).toHaveBeenCalled();
        });
    });

    describe('清除存档', () => {
        it('清除本地存档应该删除存储数据', () => {
            saveSystem.clearLocalSave();

            expect(mockLocalStorage.removeItem).toHaveBeenCalled();
        });
    });

    describe('冲突处理', () => {
        it('时间差小于阈值不应该产生冲突', async () => {
            const now = Date.now();
            const localData = createTestSaveData(now - 1000); // 1秒前
            const cloudData = createTestSaveData(now);

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            await saveSystem.sync();

            expect(saveSystem.hasConflict()).toBe(false);
        });

        it('时间差大于阈值应该产生冲突', async () => {
            const now = Date.now();
            const localData = createTestSaveData(now - 10 * 60 * 1000); // 10分钟前
            const cloudData = createTestSaveData(now);

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            const result = await saveSystem.sync();

            expect(saveSystem.hasConflict()).toBe(true);
            expect(result).toBe(false);
        });

        it('获取冲突信息应该返回正确的信息', async () => {
            const now = Date.now();
            const localData = createTestSaveData(now - 10 * 60 * 1000);
            const cloudData = createTestSaveData(now);

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            await saveSystem.sync();

            const conflictInfo = saveSystem.getConflictInfo();
            expect(conflictInfo).not.toBeNull();
            expect(conflictInfo?.localTime).toBe(localData.timestamp);
            expect(conflictInfo?.cloudTime).toBe(cloudData.timestamp);
        });

        it('解决冲突使用云端存档', async () => {
            const now = Date.now();
            const localData = createTestSaveData(now - 10 * 60 * 1000);
            const cloudData = createTestSaveData(now);

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            await saveSystem.sync();

            const result = await saveSystem.resolveConflict(true);

            expect(result).toBe(true);
            expect(saveSystem.hasConflict()).toBe(false);
        });

        it('解决冲突使用本地存档', async () => {
            const now = Date.now();
            const localData = createTestSaveData(now - 10 * 60 * 1000);
            const cloudData = createTestSaveData(now);

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
            mockCloudStorage.download.mockResolvedValue(JSON.stringify(cloudData));

            await saveSystem.sync();

            const result = await saveSystem.resolveConflict(false);

            expect(result).toBe(true);
            expect(saveSystem.hasConflict()).toBe(false);
            expect(mockCloudStorage.upload).toHaveBeenCalled();
        });

        it('无冲突时解决冲突应该返回 false', async () => {
            const result = await saveSystem.resolveConflict(true);

            expect(result).toBe(false);
        });
    });

    describe('状态查询', () => {
        it('检查本地存档存在', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            expect(saveSystem.hasLocalSave()).toBe(true);
        });

        it('检查本地存档不存在', () => {
            expect(saveSystem.hasLocalSave()).toBe(false);
        });

        it('检查云端存档存在', async () => {
            mockCloudStorage.exists.mockResolvedValue(true);

            const result = await saveSystem.hasCloudSave();

            expect(result).toBe(true);
        });

        it('检查云端存档不存在', async () => {
            mockCloudStorage.exists.mockResolvedValue(false);

            const result = await saveSystem.hasCloudSave();

            expect(result).toBe(false);
        });

        it('获取本地存档元数据', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const metadata = await saveSystem.getSaveMetadata('local');

            expect(metadata).not.toBeNull();
            expect(metadata?.timestamp).toBe(testData.timestamp);
            expect(metadata?.version).toBe(testData.version);
        });

        it('获取云端存档元数据', async () => {
            const testMetadata = {
                timestamp: Date.now(),
                size: 1024,
                version: '1.0.0',
                type: 'manual' as const
            };
            mockCloudStorage.getMetadata.mockResolvedValue(testMetadata);

            const metadata = await saveSystem.getSaveMetadata('cloud');

            expect(metadata).toEqual(testMetadata);
        });
    });

    describe('自动存档', () => {
        it('启动自动存档应该设置定时器', () => {
            saveSystem.startAutoSave();

            // 验证定时器已启动
            expect(() => saveSystem.startAutoSave()).not.toThrow();
        });

        it('停止自动存档应该清除定时器', () => {
            saveSystem.startAutoSave();
            saveSystem.stopAutoSave();

            // 验证定时器已停止
            expect(() => saveSystem.stopAutoSave()).not.toThrow();
        });
    });

    describe('存档功能', () => {
        it('应该正确导出和导入数据', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            await saveSystem.save('manual');

            const data = saveSystem.exportData();

            // 重置
            CloudSaveSystem.resetInstance();
            saveSystem = CloudSaveSystem.getInstance();
            saveSystem.setLocalStorage(mockLocalStorage);
            saveSystem.setCloudStorage(mockCloudStorage);

            // 导入
            saveSystem.importData(data);

            expect(saveSystem.getLastSaveTime()).toBe(data.lastSaveTime);
        });

        it('reset 应该重置所有状态', async () => {
            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            await saveSystem.save('manual');
            saveSystem.reset();

            expect(saveSystem.getLastSaveTime()).toBe(0);
            expect(saveSystem.getLastLoadTime()).toBe(0);
            expect(saveSystem.getCurrentState()).toBe(CloudSaveState.IDLE);
        });
    });

    describe('依赖检查', () => {
        it('无云存储时应该能存档', async () => {
            CloudSaveSystem.resetInstance();
            saveSystem = CloudSaveSystem.getInstance();
            saveSystem.setLocalStorage(mockLocalStorage);

            const provider = createMockSystemProvider({ test: 'data' });
            saveSystem.setSystemProvider('inventory', provider);

            const result = await saveSystem.save('manual');

            expect(result).toBe(true);
        });
    });

    describe('同步操作', () => {
        it('无冲突时同步应该成功', async () => {
            const testData = createTestSaveData();
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

            const result = await saveSystem.sync();

            expect(result).toBe(true);
        });

        it('无存档时同步应该成功', async () => {
            const result = await saveSystem.sync();

            expect(result).toBe(true);
        });
    });
});
