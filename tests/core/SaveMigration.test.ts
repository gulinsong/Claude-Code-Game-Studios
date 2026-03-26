/**
 * SaveMigration 单元测试
 */

import {
    SaveMigration,
    MigrationResult,
    registerBuiltInMigrations,
    checkCompatibility,
    CompatibilityInfo
} from '../../src/core/SaveMigration';

describe('SaveMigration', () => {
    beforeEach(() => {
        // 清除所有注册的迁移
        SaveMigration.clear();
        // 重置版本
        SaveMigration.setCurrentVersion('1.0.0');
    });

    describe('版本管理', () => {
        it('应该能设置和获取当前版本', () => {
            SaveMigration.setCurrentVersion('1.2.3');
            expect(SaveMigration.getCurrentVersion()).toBe('1.2.3');
        });

        it('初始当前版本应该是 1.0.0', () => {
            expect(SaveMigration.getCurrentVersion()).toBe('1.0.0');
        });
    });

    describe('注册迁移', () => {
        it('应该能注册迁移函数', () => {
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);
            expect(SaveMigration.getMigrationPath('1.0.0', '1.1.0')).toEqual(['1.0.0', '1.1.0']);
        });

        it('重复注册相同迁移应该被忽略', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            SaveMigration.register('1.0.0', '1.1.0', (data) => data);
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);

            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(SaveMigration.getMigrationPath('1.0.0', '1.1.0')).toEqual(['1.0.0', '1.1.0']);

            consoleWarnSpy.mockRestore();
        });

        it('应该按版本排序迁移', () => {
            SaveMigration.register('1.1.0', '1.2.0', (data) => data);
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);

            const path = SaveMigration.getMigrationPath('1.0.0', '1.2.0');
            expect(path).toEqual(['1.0.0', '1.1.0', '1.2.0']);
        });
    });

    describe('执行迁移', () => {
        it('版本相同时无需迁移', () => {
            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0', '1.0.0');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
            expect(result.steps).toEqual([]);
        });

        it('应该执行单步迁移', () => {
            SaveMigration.register('1.0.0', '1.1.0', (data) => {
                return { ...data, newField: 'added' };
            });

            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0', '1.1.0');

            expect(result.success).toBe(true);
            expect((result.data as Record<string, unknown>)?.newField).toBe('added');
            expect(result.steps).toEqual(['1.0.0 -> 1.1.0']);
        });

        it('应该执行多步迁移', () => {
            SaveMigration.register('1.0.0', '1.1.0', (data) => {
                return { ...data, v1_1: true };
            });
            SaveMigration.register('1.1.0', '1.2.0', (data) => {
                return { ...data, v1_2: true };
            });

            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0', '1.2.0');

            expect(result.success).toBe(true);
            expect((result.data as Record<string, unknown>)?.v1_1).toBe(true);
            expect((result.data as Record<string, unknown>)?.v1_2).toBe(true);
            expect((result.data as Record<string, unknown>)?.version).toBe('1.2.0');
            expect(result.steps).toEqual(['1.0.0 -> 1.1.0', '1.1.0 -> 1.2.0']);
        });

        it('无效版本格式应该返回错误', () => {
            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, 'invalid', '1.0.0');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid version format');
        });

        it('降级应该返回错误', () => {
            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.1.0', '1.0.0');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot downgrade');
        });

        it('迁移函数抛出异常应该返回错误', () => {
            SaveMigration.register('1.0.0', '1.1.0', () => {
                throw new Error('Migration failed');
            });

            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0', '1.1.0');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Migration failed');
        });

        it('无迁移路径时应该警告并停止', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0', '1.5.0');

            expect(result.success).toBe(true); // 没有错误，但迁移不完整
            expect(consoleWarnSpy).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });

        it('默认目标版本应该是当前版本', () => {
            SaveMigration.setCurrentVersion('1.2.0');
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);
            SaveMigration.register('1.1.0', '1.2.0', (data) => data);

            const data = { test: 'value' };
            const result = SaveMigration.migrate(data, '1.0.0');

            expect(result.toVersion).toBe('1.2.0');
        });
    });

    describe('needsMigration', () => {
        it('版本不同时需要迁移', () => {
            expect(SaveMigration.needsMigration('1.0.0', '1.1.0')).toBe(true);
        });

        it('版本相同时不需要迁移', () => {
            expect(SaveMigration.needsMigration('1.0.0', '1.0.0')).toBe(false);
        });

        it('默认目标版本是当前版本', () => {
            SaveMigration.setCurrentVersion('1.2.0');
            expect(SaveMigration.needsMigration('1.0.0')).toBe(true);
            expect(SaveMigration.needsMigration('1.2.0')).toBe(false);
        });
    });

    describe('getMigrationPath', () => {
        it('应该返回完整的迁移路径', () => {
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);
            SaveMigration.register('1.1.0', '1.2.0', (data) => data);
            SaveMigration.register('1.2.0', '1.3.0', (data) => data);

            const path = SaveMigration.getMigrationPath('1.0.0', '1.3.0');
            expect(path).toEqual(['1.0.0', '1.1.0', '1.2.0', '1.3.0']);
        });

        it('无迁移路径时应该只返回起始版本', () => {
            const path = SaveMigration.getMigrationPath('1.0.0', '2.0.0');
            expect(path).toEqual(['1.0.0']);
        });
    });

    describe('clear', () => {
        it('应该清除所有注册的迁移', () => {
            SaveMigration.register('1.0.0', '1.1.0', (data) => data);
            SaveMigration.clear();

            const path = SaveMigration.getMigrationPath('1.0.0', '1.1.0');
            expect(path).toEqual(['1.0.0']);
        });
    });
});

describe('registerBuiltInMigrations', () => {
    beforeEach(() => {
        SaveMigration.clear();
        SaveMigration.setCurrentVersion('1.0.0');
    });

    it('应该注册内置迁移函数', () => {
        registerBuiltInMigrations();

        const path = SaveMigration.getMigrationPath('1.0.0', '1.2.0');
        expect(path).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    });

    it('1.0.0 -> 1.1.0 应该添加 achievements 字段', () => {
        registerBuiltInMigrations();

        const data = { version: '1.0.0' };
        const result = SaveMigration.migrate(data, '1.0.0', '1.1.0');

        expect(result.success).toBe(true);
        expect((result.data as Record<string, unknown>)?.achievements).toEqual([]);
    });

    it('1.1.0 -> 1.2.0 应该重命名 playerName 为 nickname', () => {
        registerBuiltInMigrations();

        const data = { version: '1.1.0', playerName: 'TestPlayer' };
        const result = SaveMigration.migrate(data, '1.1.0', '1.2.0');

        expect(result.success).toBe(true);
        expect((result.data as Record<string, unknown>)?.nickname).toBe('TestPlayer');
        expect((result.data as Record<string, unknown>)?.playerName).toBeUndefined();
    });

    it('已有 nickname 时不应该覆盖', () => {
        registerBuiltInMigrations();

        const data = { version: '1.1.0', playerName: 'TestPlayer', nickname: 'ExistingNick' };
        const result = SaveMigration.migrate(data, '1.1.0', '1.2.0');

        expect(result.success).toBe(true);
        expect((result.data as Record<string, unknown>)?.nickname).toBe('ExistingNick');
    });
});

describe('checkCompatibility', () => {
    beforeEach(() => {
        SaveMigration.clear();
        SaveMigration.setCurrentVersion('1.2.0');
        registerBuiltInMigrations();
    });

    it('相同版本应该完全兼容', () => {
        const info = checkCompatibility('1.2.0', '1.2.0');

        expect(info.compatible).toBe(true);
        expect(info.needsMigration).toBe(false);
        expect(info.migrationPath).toEqual([]);
        expect(info.warnings).toEqual([]);
    });

    it('次版本较低应该兼容且需要迁移', () => {
        const info = checkCompatibility('1.0.0', '1.2.0');

        expect(info.compatible).toBe(true);
        expect(info.needsMigration).toBe(true);
        expect(info.migrationPath).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    });

    it('主版本不同应该不兼容', () => {
        const info = checkCompatibility('2.0.0', '1.2.0');

        expect(info.compatible).toBe(false);
        expect(info.warnings.length).toBeGreaterThan(0);
        expect(info.warnings[0]).toContain('Major version mismatch');
    });

    it('无效存档版本应该不兼容', () => {
        const info = checkCompatibility('invalid', '1.2.0');

        expect(info.compatible).toBe(false);
        expect(info.warnings).toContain('Invalid save version format: invalid');
    });

    it('无效游戏版本应该不兼容', () => {
        const info = checkCompatibility('1.0.0', 'invalid');

        expect(info.compatible).toBe(false);
        expect(info.warnings).toContain('Invalid game version format: invalid');
    });

    it('默认游戏版本是当前版本', () => {
        const info = checkCompatibility('1.0.0');

        expect(info.needsMigration).toBe(true);
        expect(info.migrationPath).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    });

    it('存档版本较低应该有警告', () => {
        const info = checkCompatibility('1.0.0', '1.2.0');

        expect(info.warnings.length).toBeGreaterThan(0);
        expect(info.warnings.some(w => w.includes('older than'))).toBe(true);
    });
});

describe('版本解析和比较', () => {
    // 通过公共 API 间接测试私有方法

    it('应该正确解析语义化版本', () => {
        SaveMigration.register('1.2.3', '1.2.4', (data) => data);

        const path = SaveMigration.getMigrationPath('1.2.3', '1.2.4');
        expect(path).toEqual(['1.2.3', '1.2.4']);
    });

    it('应该正确比较版本顺序', () => {
        // 注册乱序，验证排序
        SaveMigration.register('1.1.0', '1.2.0', (data) => data);
        SaveMigration.register('1.0.0', '1.1.0', (data) => data);

        const path = SaveMigration.getMigrationPath('1.0.0', '1.2.0');
        expect(path).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    });

    it('主版本优先比较', () => {
        const result1 = SaveMigration.migrate({}, '1.9.9', '2.0.0');
        expect(result1.success).toBe(true); // 无迁移也能成功

        const result2 = SaveMigration.migrate({}, '2.0.0', '1.9.9');
        expect(result2.success).toBe(false); // 降级失败
        expect(result2.error).toContain('Cannot downgrade');
    });
});

describe('迁移结果类型', () => {
    it('MigrationResult 应该包含所有必要字段', () => {
        SaveMigration.register('1.0.0', '1.1.0', (data) => data);

        const data = { test: 'value' };
        const result: MigrationResult = SaveMigration.migrate(data, '1.0.0', '1.1.0');

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('fromVersion');
        expect(result).toHaveProperty('toVersion');
        expect(result).toHaveProperty('steps');
    });

    it('CompatibilityInfo 应该包含所有必要字段', () => {
        const info: CompatibilityInfo = checkCompatibility('1.0.0', '1.2.0');

        expect(info).toHaveProperty('compatible');
        expect(info).toHaveProperty('needsMigration');
        expect(info).toHaveProperty('migrationPath');
        expect(info).toHaveProperty('warnings');
    });
});
