/**
 * WCAG 2.1 AA 合规检查器
 *
 * 提供运行时可访问性检查工具，确保游戏 UI 符合 WCAG 2.1 AA 标准。
 *
 * @example
 * ```typescript
 * const checker = new AccessibilityChecker();
 *
 * // 检查颜色对比度
 * const contrastResult = checker.checkColorContrast('#FFFFFF', '#000000', 16);
 * console.log(contrastResult.ratio); // 21:1
 *
 * // 检查 UI 组件
 * const componentResult = checker.checkComponent({
 *     hasLabel: true,
 *     focusable: true,
 *     touchTargetSize: { width: 48, height: 48 }
 * });
 * ```
 */

/**
 * WCAG 合规级别
 */
export enum WCAGLevel {
    /** A 级 - 最低要求 */
    A = 'A',
    /** AA 级 - 推荐标准 */
    AA = 'AA',
    /** AAA 级 - 最高标准 */
    AAA = 'AAA'
}

/**
 * 检查结果严重程度
 */
export enum CheckSeverity {
    /** 通过 */
    PASS = 'PASS',
    /** 警告 (建议改进) */
    WARNING = 'WARNING',
    /** 失败 (必须修复) */
    FAIL = 'FAIL',
    /** 无法检查 */
    MANUAL = 'MANUAL'
}

/**
 * 检查结果
 */
export interface CheckResult {
    /** 检查项 ID */
    id: string;
    /** WCAG 标准 */
    criterion: string;
    /** 严重程度 */
    severity: CheckSeverity;
    /** 消息 */
    message: string;
    /** 建议修复方案 */
    suggestion?: string;
    /** 相关元素 */
    element?: string;
}

/**
 * 颜色对比度检查结果
 */
export interface ColorContrastResult extends CheckResult {
    /** 对比度比值 */
    ratio: number;
    /** 要求的最小对比度 */
    requiredRatio: number;
    /** 是否符合 AA 标准 */
    passesAA: boolean;
    /** 是否符合 AAA 标准 */
    passesAAA: boolean;
}

/**
 * 触摸目标尺寸
 */
export interface TouchTargetSize {
    /** 宽度 (CSS 像素) */
    width: number;
    /** 高度 (CSS 像素) */
    height: number;
}

/**
 * UI 组件可访问性配置
 */
export interface ComponentAccessibilityConfig {
    /** 组件名称/标识 */
    name: string;
    /** 是否有标签 (aria-label 或可见标签) */
    hasLabel: boolean;
    /** 标签文本 (如果有) */
    labelText?: string;
    /** 是否可聚焦 */
    focusable: boolean;
    /** 是否有焦点指示器 */
    hasFocusIndicator: boolean;
    /** 触摸目标尺寸 */
    touchTargetSize?: TouchTargetSize;
    /** 是否支持键盘操作 */
    keyboardAccessible: boolean;
    /** 角色 (button, link, etc.) */
    role?: string;
    /** 是否有状态说明 */
    hasStateDescription: boolean;
    /** 前景色 (用于对比度检查) */
    foregroundColor?: string;
    /** 背景色 (用于对比度检查) */
    backgroundColor?: string;
    /** 字体大小 (px) */
    fontSize?: number;
    /** 字体是否加粗 */
    fontIsBold?: boolean;
}

/**
 * 组件检查结果
 */
export interface ComponentCheckResult {
    /** 组件名称 */
    componentName: string;
    /** 是否通过所有检查 */
    passed: boolean;
    /** 各项检查结果 */
    results: CheckResult[];
    /** 总体合规级别 */
    complianceLevel: WCAGLevel | null;
}

/**
 * 完整的可访问性报告
 */
export interface AccessibilityReport {
    /** 检查时间 */
    timestamp: string;
    /** 检查的组件数 */
    componentCount: number;
    /** 通过的组件数 */
    passedCount: number;
    /** 失败的组件数 */
    failedCount: number;
    /** 警告数 */
    warningCount: number;
    /** 需要手动检查的项数 */
    manualCheckCount: number;
    /** 各组件检查结果 */
    components: ComponentCheckResult[];
    /** 总体合规级别 */
    overallCompliance: WCAGLevel | null;
    /** 建议摘要 */
    summary: string[];
}

/**
 * WCAG 对比度要求
 */
const CONTRAST_REQUIREMENTS = {
    /** AA 级正常文本最小对比度 */
    AA_NORMAL_TEXT: 4.5,
    /** AA 级大文本最小对比度 */
    AA_LARGE_TEXT: 3,
    /** AAA 级正常文本最小对比度 */
    AAA_NORMAL_TEXT: 7,
    /** AAA 级大文本最小对比度 */
    AAA_LARGE_TEXT: 4.5,
    /** 大文本最小字号 (px) */
    LARGE_TEXT_SIZE: 18,
    /** 加粗大文本最小字号 (px) */
    LARGE_TEXT_BOLD_SIZE: 14
};

/**
 * WCAG 2.1 AA 可访问性检查器
 */
export class AccessibilityChecker {
    /** 检查结果缓存 */
    private resultCache: Map<string, CheckResult> = new Map();

    /**
     * 检查颜色对比度
     *
     * @param foreground 前景色 (十六进制)
     * @param background 背景色 (十六进制)
     * @param fontSize 字体大小 (px)
     * @param isBold 是否加粗
     * @returns 对比度检查结果
     */
    checkColorContrast(
        foreground: string,
        background: string,
        fontSize: number = 16,
        isBold: boolean = false
    ): ColorContrastResult {
        const ratio = this.calculateContrastRatio(foreground, background);
        const isLargeText = this.isLargeText(fontSize, isBold);
        const requiredRatio = isLargeText
            ? CONTRAST_REQUIREMENTS.AA_LARGE_TEXT
            : CONTRAST_REQUIREMENTS.AA_NORMAL_TEXT;

        const passesAA = ratio >= requiredRatio;
        const passesAAA = ratio >= (isLargeText
            ? CONTRAST_REQUIREMENTS.AAA_LARGE_TEXT
            : CONTRAST_REQUIREMENTS.AAA_NORMAL_TEXT);

        let severity: CheckSeverity;
        let message: string;
        let suggestion: string | undefined;

        if (passesAA) {
            severity = CheckSeverity.PASS;
            message = `对比度 ${ratio.toFixed(2)}:1 符合 WCAG AA 标准 (要求 ${requiredRatio}:1)`;
        } else {
            severity = CheckSeverity.FAIL;
            message = `对比度 ${ratio.toFixed(2)}:1 不符合 WCAG AA 标准 (要求 ${requiredRatio}:1)`;
            suggestion = `建议将对比度提高到至少 ${requiredRatio}:1`;
        }

        return {
            id: 'color-contrast',
            criterion: '1.4.3',
            severity,
            message,
            suggestion,
            ratio,
            requiredRatio,
            passesAA,
            passesAAA
        };
    }

    /**
     * 检查触摸目标尺寸
     *
     * @param size 触摸目标尺寸
     * @returns 检查结果
     */
    checkTouchTarget(size: TouchTargetSize): CheckResult {
        const MIN_SIZE = 44; // WCAG 2.1 Success Criterion 2.5.5 (AAA), 推荐 44x44
        const RECOMMENDED_SIZE = 48; // Material Design 推荐

        const minDimension = Math.min(size.width, size.height);

        if (minDimension >= RECOMMENDED_SIZE) {
            return {
                id: 'touch-target',
                criterion: '2.5.5',
                severity: CheckSeverity.PASS,
                message: `触摸目标尺寸 ${size.width}x${size.height}px 符合推荐标准`
            };
        } else if (minDimension >= MIN_SIZE) {
            return {
                id: 'touch-target',
                criterion: '2.5.5',
                severity: CheckSeverity.WARNING,
                message: `触摸目标尺寸 ${size.width}x${size.height}px 达到最低标准`,
                suggestion: '建议增加到 48x48px 以上'
            };
        } else {
            return {
                id: 'touch-target',
                criterion: '2.5.5',
                severity: CheckSeverity.FAIL,
                message: `触摸目标尺寸 ${size.width}x${size.height}px 过小`,
                suggestion: `触摸目标至少应为 ${MIN_SIZE}x${MIN_SIZE}px，推荐 ${RECOMMENDED_SIZE}x${RECOMMENDED_SIZE}px`
            };
        }
    }

    /**
     * 检查 UI 组件的可访问性
     *
     * @param config 组件配置
     * @returns 组件检查结果
     */
    checkComponent(config: ComponentAccessibilityConfig): ComponentCheckResult {
        const results: CheckResult[] = [];

        // 1. 检查标签 (4.1.2)
        results.push(this.checkLabel(config));

        // 2. 检查焦点 (2.4.7)
        if (config.focusable) {
            results.push(this.checkFocusIndicator(config));
        }

        // 3. 检查触摸目标 (2.5.5)
        if (config.touchTargetSize) {
            results.push(this.checkTouchTarget(config.touchTargetSize));
        }

        // 4. 检查键盘可访问性 (2.1.1)
        if (config.focusable) {
            results.push(this.checkKeyboardAccessibility(config));
        }

        // 5. 检查角色 (4.1.2)
        if (config.role) {
            results.push(this.checkRole(config));
        }

        // 6. 检查状态描述 (4.1.2)
        results.push(this.checkStateDescription(config));

        // 7. 检查颜色对比度 (1.4.3)
        if (config.foregroundColor && config.backgroundColor) {
            results.push(this.checkColorContrast(
                config.foregroundColor,
                config.backgroundColor,
                config.fontSize,
                config.fontIsBold
            ));
        }

        // 计算总体结果
        const hasFail = results.some(r => r.severity === CheckSeverity.FAIL);
        const hasWarning = results.some(r => r.severity === CheckSeverity.WARNING);
        const passed = !hasFail;

        let complianceLevel: WCAGLevel | null = null;
        if (passed) {
            complianceLevel = hasWarning ? WCAGLevel.A : WCAGLevel.AA;
        }

        return {
            componentName: config.name,
            passed,
            results,
            complianceLevel
        };
    }

    /**
     * 生成完整的可访问性报告
     *
     * @param components 要检查的组件列表
     * @returns 完整报告
     */
    generateReport(components: ComponentAccessibilityConfig[]): AccessibilityReport {
        const componentResults = components.map(c => this.checkComponent(c));

        const passedCount = componentResults.filter(r => r.passed).length;
        const failedCount = componentResults.length - passedCount;

        let warningCount = 0;
        let manualCheckCount = 0;

        const summary: string[] = [];

        componentResults.forEach(result => {
            result.results.forEach(r => {
                if (r.severity === CheckSeverity.WARNING) warningCount++;
                if (r.severity === CheckSeverity.MANUAL) manualCheckCount++;
            });
        });

        // 生成建议摘要
        if (failedCount > 0) {
            summary.push(`有 ${failedCount} 个组件未通过可访问性检查，需要修复`);
        }
        if (warningCount > 0) {
            summary.push(`有 ${warningCount} 个警告项，建议改进`);
        }
        if (manualCheckCount > 0) {
            summary.push(`有 ${manualCheckCount} 项需要手动检查`);
        }
        if (failedCount === 0 && warningCount === 0) {
            summary.push('所有组件均通过 WCAG 2.1 AA 可访问性检查');
        }

        // 计算总体合规级别
        const allPassed = componentResults.every(r => r.passed);
        const hasWarnings = componentResults.some(r =>
            r.results.some(res => res.severity === CheckSeverity.WARNING)
        );

        let overallCompliance: WCAGLevel | null = null;
        if (allPassed) {
            overallCompliance = hasWarnings ? WCAGLevel.A : WCAGLevel.AA;
        }

        return {
            timestamp: new Date().toISOString(),
            componentCount: components.length,
            passedCount,
            failedCount,
            warningCount,
            manualCheckCount,
            components: componentResults,
            overallCompliance,
            summary
        };
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.resultCache.clear();
    }

    // ============================================================
    // 私有方法
    // ============================================================

    /**
     * 计算颜色对比度
     * 基于 WCAG 2.0 对比度公式
     */
    private calculateContrastRatio(foreground: string, background: string): number {
        const fgLuminance = this.getRelativeLuminance(foreground);
        const bgLuminance = this.getRelativeLuminance(background);

        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 计算相对亮度
     */
    private getRelativeLuminance(hexColor: string): number {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return 0;

        const { r, g, b } = rgb;

        // 转换为 sRGB
        const sR = r / 255;
        const sG = g / 255;
        const sB = b / 255;

        // 线性化
        const linearR = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
        const linearG = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
        const linearB = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

        // 计算相对亮度
        return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
    }

    /**
     * 十六进制颜色转 RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        // 移除 # 前缀
        const cleanHex = hex.replace(/^#/, '');

        // 支持 3 位和 6 位十六进制
        let r: number, g: number, b: number;

        if (cleanHex.length === 3) {
            r = parseInt(cleanHex[0] + cleanHex[0], 16);
            g = parseInt(cleanHex[1] + cleanHex[1], 16);
            b = parseInt(cleanHex[2] + cleanHex[2], 16);
        } else if (cleanHex.length === 6) {
            r = parseInt(cleanHex.substring(0, 2), 16);
            g = parseInt(cleanHex.substring(2, 4), 16);
            b = parseInt(cleanHex.substring(4, 6), 16);
        } else {
            return null;
        }

        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return null;
        }

        return { r, g, b };
    }

    /**
     * 判断是否为大文本
     */
    private isLargeText(fontSize: number, isBold: boolean): boolean {
        if (isBold) {
            return fontSize >= CONTRAST_REQUIREMENTS.LARGE_TEXT_BOLD_SIZE;
        }
        return fontSize >= CONTRAST_REQUIREMENTS.LARGE_TEXT_SIZE;
    }

    /**
     * 检查标签
     */
    private checkLabel(config: ComponentAccessibilityConfig): CheckResult {
        if (config.hasLabel && config.labelText) {
            return {
                id: 'label',
                criterion: '4.1.2',
                severity: CheckSeverity.PASS,
                message: `组件有可访问标签: "${config.labelText}"`
            };
        } else if (config.hasLabel) {
            return {
                id: 'label',
                criterion: '4.1.2',
                severity: CheckSeverity.WARNING,
                message: '组件标记为有标签，但未提供标签文本',
                suggestion: '提供具体的标签文本以便验证'
            };
        } else {
            return {
                id: 'label',
                criterion: '4.1.2',
                severity: CheckSeverity.FAIL,
                message: '组件缺少可访问标签',
                suggestion: '为组件添加 aria-label 或可见标签'
            };
        }
    }

    /**
     * 检查焦点指示器
     */
    private checkFocusIndicator(config: ComponentAccessibilityConfig): CheckResult {
        if (config.hasFocusIndicator) {
            return {
                id: 'focus-indicator',
                criterion: '2.4.7',
                severity: CheckSeverity.PASS,
                message: '组件有可见的焦点指示器'
            };
        } else {
            return {
                id: 'focus-indicator',
                criterion: '2.4.7',
                severity: CheckSeverity.FAIL,
                message: '可聚焦组件缺少焦点指示器',
                suggestion: '添加可见的焦点样式 (如边框、背景色变化)'
            };
        }
    }

    /**
     * 检查键盘可访问性
     */
    private checkKeyboardAccessibility(config: ComponentAccessibilityConfig): CheckResult {
        if (config.keyboardAccessible) {
            return {
                id: 'keyboard-access',
                criterion: '2.1.1',
                severity: CheckSeverity.PASS,
                message: '组件支持键盘操作'
            };
        } else {
            return {
                id: 'keyboard-access',
                criterion: '2.1.1',
                severity: CheckSeverity.FAIL,
                message: '可聚焦组件不支持键盘操作',
                suggestion: '确保组件可以通过键盘激活 (Enter/Space)'
            };
        }
    }

    /**
     * 检查角色
     */
    private checkRole(config: ComponentAccessibilityConfig): CheckResult {
        const validRoles = [
            'button', 'link', 'checkbox', 'radio', 'textbox',
            'listbox', 'menuitem', 'tab', 'dialog', 'alert',
            'status', 'progressbar', 'slider', 'spinbutton',
            'switch', 'img', 'heading', 'list', 'listitem'
        ];

        if (config.role && validRoles.includes(config.role)) {
            return {
                id: 'role',
                criterion: '4.1.2',
                severity: CheckSeverity.PASS,
                message: `组件有有效的 ARIA 角色: ${config.role}`
            };
        } else if (config.role) {
            return {
                id: 'role',
                criterion: '4.1.2',
                severity: CheckSeverity.WARNING,
                message: `组件角色 "${config.role}" 可能不是标准 ARIA 角色`,
                suggestion: '使用标准 ARIA 角色以确保兼容性'
            };
        } else {
            return {
                id: 'role',
                criterion: '4.1.2',
                severity: CheckSeverity.MANUAL,
                message: '组件未指定 ARIA 角色',
                suggestion: '如果组件不是原生 HTML 元素，考虑添加 role 属性'
            };
        }
    }

    /**
     * 检查状态描述
     */
    private checkStateDescription(config: ComponentAccessibilityConfig): CheckResult {
        if (config.hasStateDescription) {
            return {
                id: 'state-description',
                criterion: '4.1.2',
                severity: CheckSeverity.PASS,
                message: '组件有状态描述'
            };
        } else {
            return {
                id: 'state-description',
                criterion: '4.1.2',
                severity: CheckSeverity.WARNING,
                message: '组件缺少状态描述',
                suggestion: '对于有状态的组件 (如开关、复选框)，添加 aria-pressed 或 aria-expanded'
            };
        }
    }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 快速检查颜色对比度
 */
export function checkContrast(
    foreground: string,
    background: string,
    fontSize: number = 16
): boolean {
    const checker = new AccessibilityChecker();
    const result = checker.checkColorContrast(foreground, background, fontSize);
    return result.passesAA;
}

/**
 * 快速检查触摸目标
 */
export function checkTouchTarget(width: number, height: number): boolean {
    const checker = new AccessibilityChecker();
    const result = checker.checkTouchTarget({ width, height });
    return result.severity !== CheckSeverity.FAIL;
}
