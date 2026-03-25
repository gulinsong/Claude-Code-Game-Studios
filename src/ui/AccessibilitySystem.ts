/**
 * 无障碍系统 - 提供无障碍功能支持
 *
 * 提供文本缩放、色盲模式、高对比度模式等无障碍功能。
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 文本缩放级别
 */
export enum TextScale {
    /** 小 (75%) */
    SMALL = 'SMALL',
    /** 正常 (100%) */
    NORMAL = 'NORMAL',
    /** 大 (125%) */
    LARGE = 'LARGE',
    /** 超大 (150%) */
    EXTRA_LARGE = 'EXTRA_LARGE'
}

/**
 * 色盲模式
 */
export enum ColorBlindMode {
    /** 无（正常） */
    NONE = 'NONE',
    /** 红绿色盲（红色盲/绿色盲） */
    PROTANOPIA = 'PROTANOPIA',
    /** 蓝黄色盲 */
    TRITANOPIA = 'TRITANOPIA',
    /** 全色盲 */
    ACHROMATOPSIA = 'ACHROMATOPSIA'
}

/**
 * 高对比度模式
 */
export enum HighContrastMode {
    /** 关闭 */
    OFF = 'OFF',
    /** 黑底白字 */
    WHITE_ON_BLACK = 'WHITE_ON_BLACK',
    /** 黄底黑字 */
    BLACK_ON_YELLOW = 'BLACK_ON_YELLOW'
}

/**
 * 无障碍设置
 */
export interface AccessibilitySettings {
    /** 文本缩放级别 */
    textScale: TextScale;
    /** 色盲模式 */
    colorBlindMode: ColorBlindMode;
    /** 高对比度模式 */
    highContrastMode: HighContrastMode;
    /** 减少动画 */
    reduceMotion: boolean;
    /** 屏幕阅读器提示（用于 UI 标记） */
    screenReaderHints: boolean;
}

/**
 * 无障碍事件 Payload
 */
export interface AccessibilitySettingsChangedPayload {
    settings: AccessibilitySettings;
    changedKey: keyof AccessibilitySettings;
}

/**
 * 无障碍事件 ID
 */
export const AccessibilityEvents = {
    SETTINGS_CHANGED: 'accessibility:settings_changed'
} as const;

/**
 * 文本缩放比例映射
 */
const TEXT_SCALE_VALUES: Record<TextScale, number> = {
    [TextScale.SMALL]: 0.75,
    [TextScale.NORMAL]: 1.0,
    [TextScale.LARGE]: 1.25,
    [TextScale.EXTRA_LARGE]: 1.5
};

/**
 * 色盲模式颜色转换矩阵
 * 基于 WCAG 色盲模拟算法
 */
const COLOR_BLIND_MATRICES: Record<ColorBlindMode, number[][]> = {
    [ColorBlindMode.NONE]: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ],
    // 红绿色盲 - 增强蓝/黄对比
    [ColorBlindMode.PROTANOPIA]: [
        [0.567, 0.433, 0, 0],
        [0.558, 0.442, 0, 0],
        [0, 0.242, 0.758, 0],
        [0, 0, 0, 1]
    ],
    // 蓝黄色盲 - 增强红/绿对比
    [ColorBlindMode.TRITANOPIA]: [
        [0.95, 0.05, 0, 0],
        [0, 0.433, 0.567, 0],
        [0, 0.475, 0.525, 0],
        [0, 0, 0, 1]
    ],
    // 全色盲 - 灰度
    [ColorBlindMode.ACHROMATOPSIA]: [
        [0.299, 0.587, 0.114, 0],
        [0.299, 0.587, 0.114, 0],
        [0.299, 0.587, 0.114, 0],
        [0, 0, 0, 1]
    ]
};

/**
 * 高对比度颜色方案
 */
const HIGH_CONTRAST_COLORS: Record<HighContrastMode, {
    background: string;
    text: string;
    accent: string;
    secondary: string;
}> = {
    [HighContrastMode.OFF]: {
        background: '#FFFFFF',
        text: '#333333',
        accent: '#4A90D9',
        secondary: '#888888'
    },
    [HighContrastMode.WHITE_ON_BLACK]: {
        background: '#000000',
        text: '#FFFFFF',
        accent: '#FFFF00',
        secondary: '#CCCCCC'
    },
    [HighContrastMode.BLACK_ON_YELLOW]: {
        background: '#FFFF00',
        text: '#000000',
        accent: '#0000FF',
        secondary: '#333333'
    }
};

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AccessibilitySettings = {
    textScale: TextScale.NORMAL,
    colorBlindMode: ColorBlindMode.NONE,
    highContrastMode: HighContrastMode.OFF,
    reduceMotion: false,
    screenReaderHints: false
};

/**
 * 无障碍系统
 */
export class AccessibilitySystem {
    private static instance: AccessibilitySystem | null = null;

    private settings: AccessibilitySettings;
    private eventSystem: EventSystem;

    private constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.eventSystem = EventSystem.getInstance();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): AccessibilitySystem {
        if (!AccessibilitySystem.instance) {
            AccessibilitySystem.instance = new AccessibilitySystem();
        }
        return AccessibilitySystem.instance;
    }

    // ========== 设置获取 ==========

    /**
     * 获取当前设置
     */
    public getSettings(): Readonly<AccessibilitySettings> {
        return { ...this.settings };
    }

    /**
     * 获取文本缩放比例
     */
    public getTextScaleValue(): number {
        return TEXT_SCALE_VALUES[this.settings.textScale];
    }

    /**
     * 获取当前文本缩放级别
     */
    public getTextScale(): TextScale {
        return this.settings.textScale;
    }

    /**
     * 获取当前色盲模式
     */
    public getColorBlindMode(): ColorBlindMode {
        return this.settings.colorBlindMode;
    }

    /**
     * 获取当前高对比度模式
     */
    public getHighContrastMode(): HighContrastMode {
        return this.settings.highContrastMode;
    }

    /**
     * 是否减少动画
     */
    public isReduceMotion(): boolean {
        return this.settings.reduceMotion;
    }

    /**
     * 是否启用屏幕阅读器提示
     */
    public isScreenReaderHintsEnabled(): boolean {
        return this.settings.screenReaderHints;
    }

    // ========== 设置修改 ==========

    /**
     * 设置文本缩放
     */
    public setTextScale(scale: TextScale): void {
        if (this.settings.textScale === scale) return;

        const oldValue = this.settings.textScale;
        this.settings.textScale = scale;

        this.emitChange('textScale', { oldValue, newValue: scale });
    }

    /**
     * 设置色盲模式
     */
    public setColorBlindMode(mode: ColorBlindMode): void {
        if (this.settings.colorBlindMode === mode) return;

        const oldValue = this.settings.colorBlindMode;
        this.settings.colorBlindMode = mode;

        this.emitChange('colorBlindMode', { oldValue, newValue: mode });
    }

    /**
     * 设置高对比度模式
     */
    public setHighContrastMode(mode: HighContrastMode): void {
        if (this.settings.highContrastMode === mode) return;

        const oldValue = this.settings.highContrastMode;
        this.settings.highContrastMode = mode;

        this.emitChange('highContrastMode', { oldValue, newValue: mode });
    }

    /**
     * 设置减少动画
     */
    public setReduceMotion(reduce: boolean): void {
        if (this.settings.reduceMotion === reduce) return;

        const oldValue = this.settings.reduceMotion;
        this.settings.reduceMotion = reduce;

        this.emitChange('reduceMotion', { oldValue, newValue: reduce });
    }

    /**
     * 设置屏幕阅读器提示
     */
    public setScreenReaderHints(enabled: boolean): void {
        if (this.settings.screenReaderHints === enabled) return;

        const oldValue = this.settings.screenReaderHints;
        this.settings.screenReaderHints = enabled;

        this.emitChange('screenReaderHints', { oldValue, newValue: enabled });
    }

    /**
     * 批量更新设置
     */
    public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
        const changedKeys: (keyof AccessibilitySettings)[] = [];

        for (const key of Object.keys(newSettings) as (keyof AccessibilitySettings)[]) {
            const value = newSettings[key];
            if (value !== undefined && this.settings[key] !== value) {
                // 使用类型安全的方式更新设置
                switch (key) {
                    case 'textScale':
                        this.settings.textScale = value as TextScale;
                        break;
                    case 'colorBlindMode':
                        this.settings.colorBlindMode = value as ColorBlindMode;
                        break;
                    case 'highContrastMode':
                        this.settings.highContrastMode = value as HighContrastMode;
                        break;
                    case 'reduceMotion':
                        this.settings.reduceMotion = value as boolean;
                        break;
                    case 'screenReaderHints':
                        this.settings.screenReaderHints = value as boolean;
                        break;
                }
                changedKeys.push(key);
            }
        }

        if (changedKeys.length > 0) {
            this.eventSystem.emit<AccessibilitySettingsChangedPayload>(
                AccessibilityEvents.SETTINGS_CHANGED,
                {
                    settings: this.getSettings(),
                    changedKey: changedKeys[0] // 主要变更
                }
            );
        }
    }

    // ========== 颜色转换 ==========

    /**
     * 获取色盲模式颜色矩阵
     */
    public getColorBlindMatrix(): number[][] {
        return COLOR_BLIND_MATRICES[this.settings.colorBlindMode];
    }

    /**
     * 转换颜色（应用色盲模式）
     */
    public convertColor(r: number, g: number, b: number): [number, number, number] {
        const matrix = this.getColorBlindMatrix();

        const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
        const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
        const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

        return [
            Math.round(Math.max(0, Math.min(255, newR))),
            Math.round(Math.max(0, Math.min(255, newG))),
            Math.round(Math.max(0, Math.min(255, newB)))
        ];
    }

    /**
     * 转换十六进制颜色
     */
    public convertHexColor(hex: string): string {
        // 解析十六进制
        const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!match) return hex;

        const r = parseInt(match[1], 16);
        const g = parseInt(match[2], 16);
        const b = parseInt(match[3], 16);

        const [newR, newG, newB] = this.convertColor(r, g, b);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * 获取高对比度颜色方案
     */
    public getHighContrastColors(): typeof HIGH_CONTRAST_COLORS[HighContrastMode] {
        return HIGH_CONTRAST_COLORS[this.settings.highContrastMode];
    }

    /**
     * 应用高对比度到颜色
     */
    public applyHighContrast(type: 'background' | 'text' | 'accent' | 'secondary'): string {
        const colors = this.getHighContrastColors();
        return colors[type];
    }

    // ========== 文本缩放 ==========

    /**
     * 缩放字体大小
     */
    public scaleFontSize(baseSize: number): number {
        return Math.round(baseSize * this.getTextScaleValue());
    }

    /**
     * 缩放尺寸（用于 UI 元素）
     */
    public scaleDimension(baseDimension: number): number {
        // 对于 UI 尺寸，我们使用较小的缩放比例
        // 避免界面过大
        const scale = this.getTextScaleValue();
        if (scale <= 1) return baseDimension;
        return Math.round(baseDimension * (1 + (scale - 1) * 0.5));
    }

    // ========== 动画 ==========

    /**
     * 获取动画时长（考虑减少动画设置）
     */
    public getAnimationDuration(originalDuration: number): number {
        if (this.settings.reduceMotion) {
            return 0;
        }
        return originalDuration;
    }

    /**
     * 是否应该播放动画
     */
    public shouldPlayAnimation(): boolean {
        return !this.settings.reduceMotion;
    }

    // ========== 存档 ==========

    /**
     * 导出设置（用于存档）
     */
    public toSaveData(): AccessibilitySettings {
        return { ...this.settings };
    }

    /**
     * 导入设置（从存档）
     */
    public fromSaveData(data: Partial<AccessibilitySettings>): void {
        this.settings = { ...DEFAULT_SETTINGS, ...data };
    }

    /**
     * 重置为默认设置
     */
    public reset(): void {
        this.settings = { ...DEFAULT_SETTINGS };
    }

    // ========== 私有方法 ==========

    private emitChange(key: keyof AccessibilitySettings, _detail: { oldValue: unknown; newValue: unknown }): void {
        this.eventSystem.emit<AccessibilitySettingsChangedPayload>(
            AccessibilityEvents.SETTINGS_CHANGED,
            {
                settings: this.getSettings(),
                changedKey: key
            }
        );
    }
}

// 导出便捷函数
export const accessibilitySystem = AccessibilitySystem.getInstance;
