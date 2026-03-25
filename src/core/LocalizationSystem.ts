/**
 * 本地化系统 - 多语言字符串管理
 *
 * 参考: design/gdd/ui-framework-system.md
 *
 * 功能：
 * - 加载和管理多语言字符串
 * - 支持运行时切换语言
 * - 提供字符串插值功能
 */

import { EventSystem } from './EventSystem';

/**
 * 支持的语言
 */
export enum Language {
    /** 简体中文 */
    ZH_CN = 'zh-CN',
    /** 繁体中文 */
    ZH_TW = 'zh-TW',
    /** 英语 */
    EN = 'en'
}

/**
 * 本地化配置
 */
export interface LocalizationConfig {
    /** 默认语言 */
    defaultLanguage: Language;
    /** 是否在找不到翻译时回退到默认语言 */
    fallbackToDefault: boolean;
}

/**
 * 字符串键值对（支持嵌套）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringTable = Record<string, any>;

/**
 * 本地化系统事件
 */
export const LocalizationEvents = {
    LANGUAGE_CHANGED: 'localization:language_changed',
    STRINGS_LOADED: 'localization:strings_loaded'
} as const;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: LocalizationConfig = {
    defaultLanguage: Language.ZH_CN,
    fallbackToDefault: true
};

/**
 * 本地化系统
 *
 * @example
 * ```typescript
 * const i18n = LocalizationSystem.getInstance();
 *
 * // 获取简单字符串
 * const title = i18n.t('ui.title'); // "岁时记"
 *
 * // 获取带插值的字符串
 * const greeting = i18n.t('dialogue.greeting', { name: '小明' }); // "你好，小明！"
 *
 * // 切换语言
 * i18n.setLanguage(Language.EN);
 * ```
 */
export class LocalizationSystem {
    private static instance: LocalizationSystem | null = null;

    private readonly config: LocalizationConfig;
    private readonly eventSystem: EventSystem;

    /** 当前语言 */
    private currentLanguage: Language;

    /** 字符串表 (语言 -> 键 -> 值) */
    private stringTables: Map<Language, StringTable> = new Map();

    private constructor(config: Partial<LocalizationConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventSystem = EventSystem.getInstance();
        this.currentLanguage = this.config.defaultLanguage;

        // 加载内置字符串表
        this.loadBuiltinStrings();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(config?: Partial<LocalizationConfig>): LocalizationSystem {
        if (!LocalizationSystem.instance) {
            LocalizationSystem.instance = new LocalizationSystem(config);
        }
        return LocalizationSystem.instance;
    }

    /**
     * 重置单例（用于测试）
     */
    public static resetInstance(): void {
        LocalizationSystem.instance = null;
    }

    /**
     * 获取当前语言
     */
    public getLanguage(): Language {
        return this.currentLanguage;
    }

    /**
     * 设置当前语言
     */
    public setLanguage(language: Language): void {
        if (this.currentLanguage === language) return;

        const previousLanguage = this.currentLanguage;
        this.currentLanguage = language;

        this.eventSystem.emit(LocalizationEvents.LANGUAGE_CHANGED, {
            previousLanguage,
            newLanguage: language
        });
    }

    /**
     * 获取本地化字符串
     *
     * @param key - 字符串键，支持点号分隔的嵌套键 (e.g., "ui.buttons.confirm")
     * @param params - 插值参数
     * @returns 本地化字符串，如果找不到则返回键名
     */
    public t(key: string, params?: Record<string, string | number>): string {
        let str = this.getString(key);

        if (str === undefined) {
            // 尝试回退到默认语言
            if (this.config.fallbackToDefault && this.currentLanguage !== this.config.defaultLanguage) {
                str = this.getString(key, this.config.defaultLanguage);
            }

            if (str === undefined) {
                console.warn(`[LocalizationSystem] Missing translation for key: ${key}`);
                return key;
            }
        }

        // 插值替换
        if (params) {
            str = this.interpolate(str, params);
        }

        return str;
    }

    /**
     * 检查键是否存在
     */
    public has(key: string): boolean {
        return this.getString(key) !== undefined;
    }

    /**
     * 加载字符串表
     */
    public loadStrings(language: Language, table: StringTable): void {
        const existing = this.stringTables.get(language) || {};
        this.stringTables.set(language, this.mergeTables(existing, table));

        this.eventSystem.emit(LocalizationEvents.STRINGS_LOADED, { language });
    }

    /**
     * 导出当前语言数据（用于存档）
     */
    public exportData(): { language: Language } {
        return { language: this.currentLanguage };
    }

    /**
     * 导入数据（用于读档）
     */
    public importData(data: { language: Language }): void {
        if (data.language) {
            this.setLanguage(data.language);
        }
    }

    // ========== 私有方法 ==========

    /**
     * 加载内置字符串表
     */
    private loadBuiltinStrings(): void {
        // 简体中文字符串
        this.loadStrings(Language.ZH_CN, {
            // 通用
            common: {
                confirm: '确认',
                cancel: '取消',
                close: '关闭',
                loading: '加载中...',
                save: '保存',
                back: '返回'
            },

            // 食谱系统
            recipe: {
                locked: {
                    name: '???',
                    description: '尚未解锁'
                }
            },

            // 节日
            festival: {
                qingming: '清明',
                duanwu: '端午',
                zhongqiu: '中秋',
                chunjie: '春节'
            },

            // 月饼迷你游戏
            minigame: {
                mooncake: {
                    knead: {
                        name: '揉面',
                        hint: '快速点击揉面团'
                    },
                    filling: {
                        name: '包馅',
                        hint: '拖拽馅料到面皮中心'
                    },
                    mold: {
                        name: '压模',
                        hint: '选择正确的模具图案',
                        round: '圆形',
                        flower: '花形',
                        fish: '鱼形',
                        happiness: '喜字'
                    },
                    bake: {
                        name: '烘烤',
                        hint: '等待月饼烘烤完成'
                    }
                }
            },

            // 用户
            user: {
                default_nickname: '旅行者'
            },

            // UI
            ui: {
                title: '岁时记',
                settings: '设置',
                language: '语言'
            }
        });

        // 英文字符串
        this.loadStrings(Language.EN, {
            // Common
            common: {
                confirm: 'Confirm',
                cancel: 'Cancel',
                close: 'Close',
                loading: 'Loading...',
                save: 'Save',
                back: 'Back'
            },

            // Recipe System
            recipe: {
                locked: {
                    name: '???',
                    description: 'Not yet unlocked'
                }
            },

            // Festivals
            festival: {
                qingming: 'Qingming',
                duanwu: 'Dragon Boat',
                zhongqiu: 'Mid-Autumn',
                chunjie: 'Spring Festival'
            },

            // Mooncake Mini Game
            minigame: {
                mooncake: {
                    knead: {
                        name: 'Knead',
                        hint: 'Tap quickly to knead the dough'
                    },
                    filling: {
                        name: 'Fill',
                        hint: 'Drag filling to the center'
                    },
                    mold: {
                        name: 'Mold',
                        hint: 'Select the correct mold pattern',
                        round: 'Round',
                        flower: 'Flower',
                        fish: 'Fish',
                        happiness: 'Happiness'
                    },
                    bake: {
                        name: 'Bake',
                        hint: 'Wait for the mooncake to bake'
                    }
                }
            },

            // User
            user: {
                default_nickname: 'Traveler'
            },

            // UI
            ui: {
                title: 'Suishiji',
                settings: 'Settings',
                language: 'Language'
            }
        });
    }

    /**
     * 获取字符串
     */
    private getString(key: string, language?: Language): string | undefined {
        const table = this.stringTables.get(language ?? this.currentLanguage);
        if (!table) return undefined;

        // 支持点号分隔的嵌套键
        const parts = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current: any = table;

        for (const part of parts) {
            if (typeof current !== 'object' || current === null) return undefined;
            if (!(part in current)) return undefined;
            current = current[part];
        }

        return typeof current === 'string' ? current : undefined;
    }

    /**
     * 字符串插值
     */
    private interpolate(str: string, params: Record<string, string | number>): string {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            if (key in params) {
                return String(params[key]);
            }
            return match;
        });
    }

    /**
     * 合并字符串表
     */
    private mergeTables(base: StringTable, override: StringTable): StringTable {
        const result: StringTable = { ...base };

        for (const key of Object.keys(override)) {
            const value = override[key];
            const baseValue = base[key];

            if (typeof value === 'object' && value !== null) {
                result[key] = this.mergeTables(
                    (typeof baseValue === 'object' && baseValue !== null) ? baseValue : {},
                    value
                );
            } else {
                result[key] = value;
            }
        }

        return result;
    }
}

// 导出便捷函数
export const t = (key: string, params?: Record<string, string | number>): string => {
    return LocalizationSystem.getInstance().t(key, params);
};
