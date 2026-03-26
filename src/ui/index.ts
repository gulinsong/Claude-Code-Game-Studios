/**
 * UI层导出
 */

export {
    UIFramework,
    UILayer,
    UIState,
    CacheStrategy,
    AnimationType,
    DefaultUIAnimator,
    UIEvents,
    uiFramework
} from './UIFramework';
export type {
    UIConfig,
    UIInstance,
    ToastConfig,
    LoadingConfig,
    IUINode,
    IUIPrefabLoader,
    UIAnimator,
    UIFrameworkData,
    IUIFramework,
    UIOpenedPayload,
    UIClosedPayload,
    ButtonClickedPayload,
    ScrollEndPayload
} from './UIFramework';

// 无障碍系统
export {
    AccessibilitySystem,
    TextScale,
    ColorBlindMode,
    HighContrastMode,
    AccessibilityEvents,
    accessibilitySystem
} from './AccessibilitySystem';
export type {
    AccessibilitySettings,
    AccessibilitySettingsChangedPayload
} from './AccessibilitySystem';

// 虚拟列表 (性能优化)
export {
    VirtualList,
    VirtualListEvents,
    createSimpleItemRenderer,
    getVirtualListMetrics
} from './VirtualList';
export type {
    VirtualListConfig,
    VirtualListItem,
    VisibleRange,
    ScrollInfo,
    VirtualListMetrics
} from './VirtualList';
