/**
 * AccessibilityChecker 单元测试
 */

import {
    AccessibilityChecker,
    WCAGLevel,
    CheckSeverity,
    ComponentAccessibilityConfig,
    checkContrast,
    checkTouchTarget
} from '../../src/ui/AccessibilityChecker';

describe('AccessibilityChecker', () => {
    let checker: AccessibilityChecker;

    beforeEach(() => {
        checker = new AccessibilityChecker();
    });

    describe('颜色对比度检查', () => {
        it('应该正确计算黑白对比度 (21:1)', () => {
            const result = checker.checkColorContrast('#FFFFFF', '#000000');

            expect(result.ratio).toBeCloseTo(21, 0);
            expect(result.passesAA).toBe(true);
            expect(result.passesAAA).toBe(true);
            expect(result.severity).toBe(CheckSeverity.PASS);
        });

        it('应该正确计算相同颜色对比度 (1:1)', () => {
            const result = checker.checkColorContrast('#FFFFFF', '#FFFFFF');

            expect(result.ratio).toBeCloseTo(1, 0);
            expect(result.passesAA).toBe(false);
            expect(result.passesAAA).toBe(false);
            expect(result.severity).toBe(CheckSeverity.FAIL);
        });

        it('应该通过 AA 标准的灰色对比度', () => {
            // #767676 vs #FFFFFF 的对比度约为 4.54:1
            const result = checker.checkColorContrast('#767676', '#FFFFFF', 16);

            expect(result.passesAA).toBe(true);
            expect(result.severity).toBe(CheckSeverity.PASS);
        });

        it('应该检测低对比度失败', () => {
            // #999999 vs #FFFFFF 的对比度约为 2.85:1
            const result = checker.checkColorContrast('#999999', '#FFFFFF', 16);

            expect(result.passesAA).toBe(false);
            expect(result.severity).toBe(CheckSeverity.FAIL);
        });

        it('大文本应该使用较低的对比度要求', () => {
            // 18px 以上为大文本，要求 3:1
            const result = checker.checkColorContrast('#999999', '#FFFFFF', 18);

            // 2.85:1 < 3:1，仍然失败
            expect(result.passesAA).toBe(false);
        });

        it('加粗大文本应该使用较低的对比度要求', () => {
            // 14px 加粗为大文本，要求 3:1
            const result = checker.checkColorContrast('#999999', '#FFFFFF', 14, true);

            expect(result.passesAA).toBe(false);
        });

        it('应该支持 3 位十六进制颜色', () => {
            const result = checker.checkColorContrast('#FFF', '#000');

            expect(result.ratio).toBeCloseTo(21, 0);
        });

        it('应该支持无 # 前缀的颜色', () => {
            const result = checker.checkColorContrast('FFFFFF', '000000');

            expect(result.ratio).toBeCloseTo(21, 0);
        });

        it('应该返回正确的 criterion', () => {
            const result = checker.checkColorContrast('#FFF', '#000');

            expect(result.criterion).toBe('1.4.3');
        });

        it('失败时应该提供建议', () => {
            const result = checker.checkColorContrast('#999', '#FFF');

            expect(result.suggestion).toBeDefined();
            expect(result.suggestion).toContain('建议');
        });
    });

    describe('触摸目标检查', () => {
        it('48x48 应该通过推荐标准', () => {
            const result = checker.checkTouchTarget({ width: 48, height: 48 });

            expect(result.severity).toBe(CheckSeverity.PASS);
        });

        it('44x44 应该通过最低标准但有警告', () => {
            const result = checker.checkTouchTarget({ width: 44, height: 44 });

            expect(result.severity).toBe(CheckSeverity.WARNING);
        });

        it('小于 44x44 应该失败', () => {
            const result = checker.checkTouchTarget({ width: 30, height: 30 });

            expect(result.severity).toBe(CheckSeverity.FAIL);
        });

        it('宽度小于 44 应该失败', () => {
            const result = checker.checkTouchTarget({ width: 40, height: 48 });

            expect(result.severity).toBe(CheckSeverity.FAIL);
        });

        it('高度小于 44 应该失败', () => {
            const result = checker.checkTouchTarget({ width: 48, height: 40 });

            expect(result.severity).toBe(CheckSeverity.FAIL);
        });

        it('应该返回正确的 criterion', () => {
            const result = checker.checkTouchTarget({ width: 48, height: 48 });

            expect(result.criterion).toBe('2.5.5');
        });
    });

    describe('组件检查', () => {
        const createValidConfig = (): ComponentAccessibilityConfig => ({
            name: 'TestButton',
            hasLabel: true,
            labelText: '测试按钮',
            focusable: true,
            hasFocusIndicator: true,
            touchTargetSize: { width: 48, height: 48 },
            keyboardAccessible: true,
            role: 'button',
            hasStateDescription: true,
            foregroundColor: '#000000',
            backgroundColor: '#FFFFFF',
            fontSize: 16,
            fontIsBold: false
        });

        it('完全合规的组件应该通过', () => {
            const config = createValidConfig();
            const result = checker.checkComponent(config);

            expect(result.passed).toBe(true);
            expect(result.complianceLevel).toBe(WCAGLevel.AA);
        });

        it('缺少标签应该失败', () => {
            const config = createValidConfig();
            config.hasLabel = false;
            config.labelText = undefined;

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(false);
        });

        it('缺少焦点指示器应该失败', () => {
            const config = createValidConfig();
            config.hasFocusIndicator = false;

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(false);
        });

        it('触摸目标过小应该失败', () => {
            const config = createValidConfig();
            config.touchTargetSize = { width: 30, height: 30 };

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(false);
        });

        it('不支持键盘操作应该失败', () => {
            const config = createValidConfig();
            config.keyboardAccessible = false;

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(false);
        });

        it('低对比度应该失败', () => {
            const config = createValidConfig();
            config.foregroundColor = '#999999';
            config.backgroundColor = '#FFFFFF';

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(false);
        });

        it('有警告但没有失败应该返回 A 级', () => {
            const config = createValidConfig();
            config.touchTargetSize = { width: 44, height: 44 }; // 警告级别

            const result = checker.checkComponent(config);

            expect(result.passed).toBe(true);
            expect(result.complianceLevel).toBe(WCAGLevel.A);
        });

        it('不可聚焦组件不需要检查焦点相关项', () => {
            const config = createValidConfig();
            config.focusable = false;
            config.hasFocusIndicator = false;
            config.keyboardAccessible = false;

            const result = checker.checkComponent(config);

            // 焦点和键盘检查不应该影响结果
            expect(result.passed).toBe(true);
        });

        it('应该返回所有检查结果', () => {
            const config = createValidConfig();
            const result = checker.checkComponent(config);

            expect(result.results.length).toBeGreaterThan(0);
        });
    });

    describe('报告生成', () => {
        const createValidConfig = (name: string): ComponentAccessibilityConfig => ({
            name,
            hasLabel: true,
            labelText: name,
            focusable: true,
            hasFocusIndicator: true,
            touchTargetSize: { width: 48, height: 48 },
            keyboardAccessible: true,
            role: 'button',
            hasStateDescription: true,
            foregroundColor: '#000000',
            backgroundColor: '#FFFFFF',
            fontSize: 16,
            fontIsBold: false
        });

        it('应该生成正确的报告', () => {
            const components = [
                createValidConfig('Button1'),
                createValidConfig('Button2')
            ];

            const report = checker.generateReport(components);

            expect(report.componentCount).toBe(2);
            expect(report.passedCount).toBe(2);
            expect(report.failedCount).toBe(0);
            expect(report.overallCompliance).toBe(WCAGLevel.AA);
        });

        it('应该正确统计失败数', () => {
            const components = [
                createValidConfig('Button1'),
                { ...createValidConfig('Button2'), hasLabel: false }
            ];

            const report = checker.generateReport(components);

            expect(report.passedCount).toBe(1);
            expect(report.failedCount).toBe(1);
            expect(report.overallCompliance).toBeNull();
        });

        it('应该包含时间戳', () => {
            const report = checker.generateReport([]);

            expect(report.timestamp).toBeDefined();
            expect(new Date(report.timestamp).getTime()).not.toBeNaN();
        });

        it('应该生成摘要', () => {
            const report = checker.generateReport([createValidConfig('Button1')]);

            expect(report.summary.length).toBeGreaterThan(0);
        });

        it('空组件列表应该返回空报告', () => {
            const report = checker.generateReport([]);

            expect(report.componentCount).toBe(0);
            expect(report.passedCount).toBe(0);
            expect(report.failedCount).toBe(0);
        });

        it('有警告时摘要应该包含警告信息', () => {
            const config = createValidConfig('Button1');
            config.touchTargetSize = { width: 44, height: 44 };

            const report = checker.generateReport([config]);

            expect(report.summary.some(s => s.includes('警告'))).toBe(true);
        });
    });

    describe('缓存', () => {
        it('clearCache 应该清除缓存', () => {
            checker.checkColorContrast('#FFF', '#000');
            checker.clearCache();

            // 缓存清除后不应该有影响
            const result = checker.checkColorContrast('#FFF', '#000');
            expect(result.ratio).toBeCloseTo(21, 0);
        });
    });
});

describe('辅助函数', () => {
    describe('checkContrast', () => {
        it('应该返回 true 对于高对比度', () => {
            expect(checkContrast('#000', '#FFF')).toBe(true);
        });

        it('应该返回 false 对于低对比度', () => {
            expect(checkContrast('#999', '#FFF')).toBe(false);
        });
    });

    describe('checkTouchTarget', () => {
        it('应该返回 true 对于足够大的目标', () => {
            expect(checkTouchTarget(48, 48)).toBe(true);
        });

        it('应该返回 false 对于过小的目标', () => {
            expect(checkTouchTarget(30, 30)).toBe(false);
        });
    });
});

describe('边界情况', () => {
    let checker: AccessibilityChecker;

    beforeEach(() => {
        checker = new AccessibilityChecker();
    });

    it('无效颜色应该处理为黑色', () => {
        const result = checker.checkColorContrast('invalid', '#000');

        // 无效颜色会被解析为黑色，所以对比度为 1:1
        expect(result.ratio).toBeCloseTo(1, 0);
    });

    it('空颜色应该处理为黑色', () => {
        const result = checker.checkColorContrast('', '#000');

        // 空颜色会被解析为黑色，所以对比度为 1:1
        expect(result.ratio).toBeCloseTo(1, 0);
    });

    it('组件无颜色配置时不应该崩溃', () => {
        const result = checker.checkComponent({
            name: 'Test',
            hasLabel: true,
            focusable: false,
            hasFocusIndicator: false,
            keyboardAccessible: false,
            hasStateDescription: false
        });

        expect(result).toBeDefined();
    });

    it('无触摸目标配置时不应该崩溃', () => {
        const result = checker.checkComponent({
            name: 'Test',
            hasLabel: true,
            focusable: false,
            hasFocusIndicator: false,
            keyboardAccessible: false,
            hasStateDescription: false
        });

        expect(result).toBeDefined();
    });
});
