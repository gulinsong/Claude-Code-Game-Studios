/**
 * 存档迁移工具
 *
 * 处理存档版本升级时的数据迁移。支持注册迁移函数、检测版本、执行迁移。
 *
 * @example
 * ```typescript
 * // 注册迁移函数
 * SaveMigration.register('1.0.0', '1.1.0', (data) => {
 *     // 添加新字段
 *     data.newField = 'default';
 *     return data;
 * });
 *
 * // 执行迁移
 * const migratedData = SaveMigration.migrate(rawData, '1.0.0', '1.2.0');
 * ```
 */

/**
 * 迁移函数类型
 */
type MigrationFunction = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * 迁移步骤
 */
interface MigrationStep {
    fromVersion: string;
    toVersion: string;
    migrate: MigrationFunction;
}

/**
 * 版本号解析结果
 */
interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
}

/**
 * 迁移结果
 */
export interface MigrationResult<T = Record<string, unknown>> {
    /** 是否成功 */
    success: boolean;
    /** 迁移后的数据 */
    data: T | null;
    /** 原始版本 */
    fromVersion: string;
    /** 目标版本 */
    toVersion: string;
    /** 执行的迁移步骤 */
    steps: string[];
    /** 错误信息 */
    error?: string;
}

/**
 * 存档迁移工具
 */
export class SaveMigration {
    /** 迁移步骤注册表 */
    private static migrations: MigrationStep[] = [];

    /** 当前支持的最新版本 */
    private static currentVersion: string = '1.0.0';

    /**
     * 注册迁移函数
     *
     * @param fromVersion 源版本
     * @param toVersion 目标版本
     * @param migrate 迁移函数
     */
    public static register(
        fromVersion: string,
        toVersion: string,
        migrate: MigrationFunction
    ): void {
        // 检查是否已存在相同的迁移
        const exists = this.migrations.some(
            m => m.fromVersion === fromVersion && m.toVersion === toVersion
        );

        if (exists) {
            console.warn(
                `[SaveMigration] Migration ${fromVersion} -> ${toVersion} already registered, skipping`
            );
            return;
        }

        this.migrations.push({ fromVersion, toVersion, migrate });

        // 按版本排序
        this.migrations.sort((a, b) => {
            const vA = this.parseVersion(a.fromVersion);
            const vB = this.parseVersion(b.fromVersion);
            if (!vA || !vB) return 0;
            return this.compareVersions(vA, vB);
        });
    }

    /**
     * 设置当前版本
     */
    public static setCurrentVersion(version: string): void {
        this.currentVersion = version;
    }

    /**
     * 获取当前版本
     */
    public static getCurrentVersion(): string {
        return this.currentVersion;
    }

    /**
     * 执行迁移
     *
     * @param data 原始数据
     * @param fromVersion 数据版本
     * @param toVersion 目标版本（可选，默认为当前版本）
     * @returns 迁移结果
     */
    public static migrate<T extends Record<string, unknown>>(
        data: T,
        fromVersion: string,
        toVersion?: string
    ): MigrationResult<T> {
        const targetVersion = toVersion || this.currentVersion;
        const steps: string[] = [];

        // 版本相同，无需迁移
        if (fromVersion === targetVersion) {
            return {
                success: true,
                data,
                fromVersion,
                toVersion: targetVersion,
                steps: []
            };
        }

        // 解析版本
        const parsedFrom = this.parseVersion(fromVersion);
        const parsedTo = this.parseVersion(targetVersion);

        // 检查版本格式
        if (!parsedFrom || !parsedTo) {
            return {
                success: false,
                data: null,
                fromVersion,
                toVersion: targetVersion,
                steps: [],
                error: `Invalid version format: ${fromVersion} or ${targetVersion}`
            };
        }

        // 降级检查
        if (this.compareVersions(parsedFrom, parsedTo) > 0) {
            return {
                success: false,
                data: null,
                fromVersion,
                toVersion: targetVersion,
                steps: [],
                error: `Cannot downgrade from ${fromVersion} to ${targetVersion}`
            };
        }

        // 执行迁移
        let currentData = { ...data };
        let currentVersion = fromVersion;

        try {
            while (currentVersion !== targetVersion) {
                // 查找下一步迁移
                const step = this.findNextMigration(currentVersion, targetVersion);

                if (!step) {
                    // 没有找到迁移步骤，可能是跳跃版本
                    console.warn(
                        `[SaveMigration] No migration path from ${currentVersion} to ${targetVersion}`
                    );
                    break;
                }

                // 执行迁移
                currentData = step.migrate(currentData) as T;
                steps.push(`${step.fromVersion} -> ${step.toVersion}`);
                currentVersion = step.toVersion;
            }

            // 更新版本号
            (currentData as Record<string, unknown>).version = targetVersion;

            return {
                success: true,
                data: currentData,
                fromVersion,
                toVersion: targetVersion,
                steps
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                fromVersion,
                toVersion: targetVersion,
                steps,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 检查是否需要迁移
     */
    public static needsMigration(version: string, targetVersion?: string): boolean {
        const target = targetVersion || this.currentVersion;
        return version !== target;
    }

    /**
     * 获取迁移路径
     */
    public static getMigrationPath(fromVersion: string, toVersion?: string): string[] {
        const target = toVersion || this.currentVersion;
        const path: string[] = [fromVersion];

        let current = fromVersion;
        while (current !== target) {
            const step = this.findNextMigration(current, target);
            if (!step) break;
            path.push(step.toVersion);
            current = step.toVersion;
        }

        return path;
    }

    /**
     * 清除所有注册的迁移
     */
    public static clear(): void {
        this.migrations = [];
    }

    /**
     * 解析版本号
     */
    private static parseVersion(version: string): ParsedVersion | null {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!match) return null;

        return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3], 10)
        };
    }

    /**
     * 比较版本号
     * @returns 正数表示 a > b，负数表示 a < b，0 表示相等
     */
    private static compareVersions(a: ParsedVersion, b: ParsedVersion): number {
        if (a.major !== b.major) return a.major - b.major;
        if (a.minor !== b.minor) return a.minor - b.minor;
        return a.patch - b.patch;
    }

    /**
     * 查找下一个迁移步骤
     */
    private static findNextMigration(
        currentVersion: string,
        targetVersion: string
    ): MigrationStep | null {
        const candidates = this.migrations.filter(
            m => m.fromVersion === currentVersion
        );

        if (candidates.length === 0) {
            return null;
        }

        // 优先选择直接到达目标版本的迁移
        const direct = candidates.find(m => m.toVersion === targetVersion);
        if (direct) return direct;

        // 否则选择版本号最小的下一步
        const targetParsed = this.parseVersion(targetVersion)!;

        const validCandidates = candidates.filter(m => {
            const toParsed = this.parseVersion(m.toVersion);
            if (!toParsed) return false;
            // 确保不会超过目标版本
            return this.compareVersions(toParsed, targetParsed) <= 0;
        });

        if (validCandidates.length === 0) {
            return null;
        }

        // 选择最接近目标版本的迁移
        validCandidates.sort((a, b) => {
            const vA = this.parseVersion(a.toVersion)!;
            const vB = this.parseVersion(b.toVersion)!;
            return this.compareVersions(vB, vA); // 降序，选择最大的
        });

        return validCandidates[0];
    }
}

// ============================================================
// 内置迁移函数
// ============================================================

/**
 * 注册内置迁移函数
 */
export function registerBuiltInMigrations(): void {
    // 示例: 1.0.0 -> 1.1.0
    SaveMigration.register('1.0.0', '1.1.0', (data) => {
        const migrated = { ...data };

        // 添加新字段（示例）
        if (!('achievements' in migrated)) {
            migrated.achievements = [];
        }

        return migrated;
    });

    // 示例: 1.1.0 -> 1.2.0
    SaveMigration.register('1.1.0', '1.2.0', (data) => {
        const migrated = { ...data };

        // 重命名字段（示例）
        if ('playerName' in migrated && !('nickname' in migrated)) {
            migrated.nickname = migrated.playerName;
            delete migrated.playerName;
        }

        return migrated;
    });
}

// ============================================================
// 版本兼容性检查
// ============================================================

/**
 * 版本兼容性信息
 */
export interface CompatibilityInfo {
    /** 是否兼容 */
    compatible: boolean;
    /** 是否需要迁移 */
    needsMigration: boolean;
    /** 迁移路径 */
    migrationPath: string[];
    /** 警告信息 */
    warnings: string[];
}

/**
 * 检查版本兼容性
 */
export function checkCompatibility(
    saveVersion: string,
    gameVersion: string = SaveMigration.getCurrentVersion()
): CompatibilityInfo {
    const warnings: string[] = [];

    // 解析版本
    const saveParsed = SaveMigration['parseVersion'](saveVersion);
    const gameParsed = SaveMigration['parseVersion'](gameVersion);

    if (!saveParsed) {
        return {
            compatible: false,
            needsMigration: false,
            migrationPath: [],
            warnings: [`Invalid save version format: ${saveVersion}`]
        };
    }

    if (!gameParsed) {
        return {
            compatible: false,
            needsMigration: false,
            migrationPath: [],
            warnings: [`Invalid game version format: ${gameVersion}`]
        };
    }

    // 主版本不匹配
    if (saveParsed.major !== gameParsed.major) {
        return {
            compatible: false,
            needsMigration: false,
            migrationPath: [],
            warnings: [
                `Major version mismatch: save ${saveVersion} vs game ${gameVersion}`,
                'Save data may be incompatible'
            ]
        };
    }

    // 检查是否需要迁移
    const needsMigration = SaveMigration.needsMigration(saveVersion, gameVersion);
    const migrationPath = needsMigration
        ? SaveMigration.getMigrationPath(saveVersion, gameVersion)
        : [];

    // 次版本不匹配警告
    if (saveParsed.minor < gameParsed.minor) {
        warnings.push(
            `Save version ${saveVersion} is older than game version ${gameVersion}`
        );
    }

    return {
        compatible: true,
        needsMigration,
        migrationPath,
        warnings
    };
}

// 自动注册内置迁移
registerBuiltInMigrations();
