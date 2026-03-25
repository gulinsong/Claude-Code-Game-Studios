/**
 * AccessibilitySystem 测试
 */

import {
    AccessibilitySystem,
    TextScale,
    ColorBlindMode,
    HighContrastMode,
    AccessibilityEvents
} from '../../src/ui/AccessibilitySystem';
import { EventSystem } from '../../src/core/EventSystem';

describe('AccessibilitySystem', () => {
    let system: AccessibilitySystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        // 重置单例
        (AccessibilitySystem as unknown as { instance: unknown }).instance = null;
        system = AccessibilitySystem.getInstance();
        eventSystem = EventSystem.getInstance();
    });

    afterEach(() => {
        system.reset();
    });

    describe('初始状态', () => {
        it('初始文本缩放应该是 NORMAL', () => {
            expect(system.getTextScale()).toBe(TextScale.NORMAL);
        });

        it('初始色盲模式应该是 NONE', () => {
            expect(system.getColorBlindMode()).toBe(ColorBlindMode.NONE);
        });

        it('初始高对比度模式应该是 OFF', () => {
            expect(system.getHighContrastMode()).toBe(HighContrastMode.OFF);
        });

        it('初始减少动画应该是 false', () => {
            expect(system.isReduceMotion()).toBe(false);
        });

        it('初始屏幕阅读器提示应该是 false', () => {
            expect(system.isScreenReaderHintsEnabled()).toBe(false);
        });
    });

    describe('文本缩放', () => {
        it('getTextScaleValue 应该返回正确的缩放比例', () => {
            expect(system.getTextScaleValue()).toBe(1.0);

            system.setTextScale(TextScale.SMALL);
            expect(system.getTextScaleValue()).toBe(0.75);

            system.setTextScale(TextScale.LARGE);
            expect(system.getTextScaleValue()).toBe(1.25);

            system.setTextScale(TextScale.EXTRA_LARGE);
            expect(system.getTextScaleValue()).toBe(1.5);
        });

        it('scaleFontSize 应该正确缩放字体', () => {
            expect(system.scaleFontSize(16)).toBe(16);

            system.setTextScale(TextScale.LARGE);
            expect(system.scaleFontSize(16)).toBe(20);

            system.setTextScale(TextScale.SMALL);
            expect(system.scaleFontSize(16)).toBe(12);
        });

        it('scaleDimension 应该正确缩放尺寸', () => {
            const baseSize = 100;

            system.setTextScale(TextScale.NORMAL);
            expect(system.scaleDimension(baseSize)).toBe(100);

            system.setTextScale(TextScale.EXTRA_LARGE);
            // 1.5 scale -> 1 + (0.5 * 0.5) = 1.25
            expect(system.scaleDimension(baseSize)).toBe(125);
        });

        it('设置相同值不应该触发事件', () => {
            const handler = jest.fn();
            eventSystem.on(AccessibilityEvents.SETTINGS_CHANGED, handler);

            system.setTextScale(TextScale.NORMAL);
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('色盲模式', () => {
        it('getColorBlindMatrix 应该返回正确的矩阵', () => {
            const normalMatrix = system.getColorBlindMatrix();
            expect(normalMatrix[0][0]).toBe(1);
            expect(normalMatrix[1][1]).toBe(1);
            expect(normalMatrix[2][2]).toBe(1);

            system.setColorBlindMode(ColorBlindMode.ACHROMATOPSIA);
            const grayMatrix = system.getColorBlindMatrix();
            // 灰度矩阵每行应该相同
            expect(grayMatrix[0][0]).toBeCloseTo(0.299);
            expect(grayMatrix[1][0]).toBeCloseTo(0.299);
        });

        it('convertColor 应该正确转换颜色', () => {
            // 正常模式不改变颜色
            const [r, g, b] = system.convertColor(255, 128, 64);
            expect(r).toBe(255);
            expect(g).toBe(128);
            expect(b).toBe(64);
        });

        it('convertHexColor 应该正确转换十六进制颜色', () => {
            system.setColorBlindMode(ColorBlindMode.NONE);
            expect(system.convertHexColor('#FF8040')).toBe('#ff8040');
        });

        it('全色盲模式应该产生灰度', () => {
            system.setColorBlindMode(ColorBlindMode.ACHROMATOPSIA);
            const [r, g, b] = system.convertColor(255, 0, 0);
            // 红色转灰度
            expect(r).toBeGreaterThan(0);
            expect(r).toBe(g);
            expect(g).toBe(b);
        });
    });

    describe('高对比度模式', () => {
        it('getHighContrastColors 应该返回正确的颜色方案', () => {
            const defaultColors = system.getHighContrastColors();
            expect(defaultColors.background).toBe('#FFFFFF');
            expect(defaultColors.text).toBe('#333333');

            system.setHighContrastMode(HighContrastMode.WHITE_ON_BLACK);
            const darkColors = system.getHighContrastColors();
            expect(darkColors.background).toBe('#000000');
            expect(darkColors.text).toBe('#FFFFFF');
        });

        it('applyHighContrast 应该返回正确的颜色', () => {
            system.setHighContrastMode(HighContrastMode.BLACK_ON_YELLOW);
            expect(system.applyHighContrast('background')).toBe('#FFFF00');
            expect(system.applyHighContrast('text')).toBe('#000000');
        });
    });

    describe('减少动画', () => {
        it('getAnimationDuration 应该返回 0 当减少动画开启', () => {
            system.setReduceMotion(true);
            expect(system.getAnimationDuration(200)).toBe(0);
        });

        it('getAnimationDuration 应该返回原值当减少动画关闭', () => {
            system.setReduceMotion(false);
            expect(system.getAnimationDuration(200)).toBe(200);
        });

        it('shouldPlayAnimation 应该返回正确值', () => {
            expect(system.shouldPlayAnimation()).toBe(true);

            system.setReduceMotion(true);
            expect(system.shouldPlayAnimation()).toBe(false);
        });
    });

    describe('事件', () => {
        it('设置变更应该触发 SETTINGS_CHANGED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(AccessibilityEvents.SETTINGS_CHANGED, handler);

            system.setTextScale(TextScale.LARGE);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        textScale: TextScale.LARGE
                    }),
                    changedKey: 'textScale'
                })
            );
        });

        it('批量更新应该触发事件', () => {
            const handler = jest.fn();
            eventSystem.on(AccessibilityEvents.SETTINGS_CHANGED, handler);

            system.updateSettings({
                textScale: TextScale.LARGE,
                reduceMotion: true
            });

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('存档功能', () => {
        it('应该正确导出和导入数据', () => {
            system.setTextScale(TextScale.LARGE);
            system.setColorBlindMode(ColorBlindMode.PROTANOPIA);
            system.setReduceMotion(true);

            const savedData = system.toSaveData();

            // 重置
            system.reset();

            // 导入
            system.fromSaveData(savedData);

            expect(system.getTextScale()).toBe(TextScale.LARGE);
            expect(system.getColorBlindMode()).toBe(ColorBlindMode.PROTANOPIA);
            expect(system.isReduceMotion()).toBe(true);
        });

        it('reset 应该重置所有设置', () => {
            system.setTextScale(TextScale.EXTRA_LARGE);
            system.setColorBlindMode(ColorBlindMode.TRITANOPIA);
            system.setHighContrastMode(HighContrastMode.WHITE_ON_BLACK);
            system.setReduceMotion(true);
            system.setScreenReaderHints(true);

            system.reset();

            expect(system.getTextScale()).toBe(TextScale.NORMAL);
            expect(system.getColorBlindMode()).toBe(ColorBlindMode.NONE);
            expect(system.getHighContrastMode()).toBe(HighContrastMode.OFF);
            expect(system.isReduceMotion()).toBe(false);
            expect(system.isScreenReaderHintsEnabled()).toBe(false);
        });
    });

    describe('单例模式', () => {
        it('getInstance 应该返回同一实例', () => {
            const instance1 = AccessibilitySystem.getInstance();
            const instance2 = AccessibilitySystem.getInstance();

            expect(instance1).toBe(instance2);
        });
    });
});
