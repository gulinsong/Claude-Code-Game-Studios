# UI框架系统 (UI Framework System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 表现层 — 所有UI界面的基础设施

## Overview

UI框架系统是《岁时记》的**界面基础设施**，提供统一的UI管理、层级控制、动画系统和事件分发。所有游戏界面（主界面、背包、设置、对话等）都通过UI框架系统管理。

UI采用**层级管理 + 预制体实例化**模式——不同类型的UI放在不同层级，打开UI时实例化预制体，关闭时销毁或缓存。支持动画过渡、触摸反馈和无障碍适配。

玩家**直接与UI框架系统交互**——点击按钮、滑动列表、打开/关闭界面。UI的响应速度和流畅度直接影响游戏体验。

此系统是**表现层基础设施**，支撑所有玩家可见的界面。

## Player Fantasy

**直接体验**：
- **流畅感**：界面切换流畅，动画自然
- **响应感**：点击立即反馈，无延迟
- **一致性**：所有界面风格统一，操作习惯一致
- **易用性**：界面清晰易懂，操作直观

**UI交互情感设计**：

| Interaction | Player Feeling |
|-------------|---------------|
| 点击按钮 | 清脆的反馈，满足感 |
| 打开界面 | 流畅的动画，期待感 |
| 关闭界面 | 优雅的退出，完成感 |
| 滑动列表 | 顺滑的滚动，控制感 |

## Detailed Design

### Core Rules

1. **UI层级定义**

| Layer | Z-Index | 用途 | 示例 |
|-------|---------|------|------|
| **Background** | 0 | 背景层 | 场景背景 |
| **Scene** | 100 | 场景层 | 游戏场景 |
| **HUD** | 200 | 主界面 | 体力条、时间显示 |
| **Popup** | 300 | 弹窗层 | 对话框、提示 |
| **TopBar** | 400 | 顶部栏 | 网络状态、加载 |
| **Loading** | 500 | 加载层 | 全屏加载 |
| **Toast** | 600 | 提示层 | 轻提示 |
| **Debug** | 700 | 调试层 | 开发调试 |

2. **UI预制体管理**

| 预制体类型 | 缓存策略 | 实例化时机 |
|-----------|---------|-----------|
| **常驻UI** | 常驻内存 | 游戏启动时 |
| **频繁UI** | 对象池缓存 | 首次打开时 |
| **普通UI** | 按需加载 | 打开时 |
| **大型UI** | 异步加载 | 打开时 |

3. **UI打开流程**

```
1. 检查是否已打开
2. 如已打开，置顶
3. 如未打开：
   a. 从缓存或加载预制体
   b. 实例化到对应层级
   c. 初始化数据
   d. 播放进入动画
   e. 发布打开事件
```

4. **UI关闭流程**

```
1. 播放退出动画
2. 清理数据和监听
3. 如需缓存：回收到对象池
4. 如不需缓存：销毁节点
5. 发布关闭事件
```

5. **动画系统**

| 动画类型 | 时长 | 缓动函数 |
|---------|------|---------|
| 弹窗进入 | 0.2s | easeOutBack |
| 弹窗退出 | 0.15s | easeInBack |
| 滑动进入 | 0.25s | easeOutCubic |
| 滑动退出 | 0.2s | easeInCubic |
| 淡入淡出 | 0.15s | linear |

### States and Transitions

**UI实例状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **None** | 默认 | 实例化 | 不存在 |
| **Loading** | 开始加载 | 加载完成/失败 | 显示加载中 |
| **Entering** | 加载完成 | 进入动画完成 | 播放进入动画 |
| **Active** | 动画完成 | 开始关闭 | 正常显示，响应交互 |
| **Exiting** | 开始关闭 | 退出动画完成 | 播放退出动画 |
| **Pooled** | 退出完成 | 再次打开 | 在对象池中等待 |

**状态转换图**：
```
None → Loading → Entering → Active → Exiting → Pooled
                    ↑                          |
                    └──────────────────────────┘
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **事件系统** | 发布/监听 | UI ↔ 事件 | UI事件分发 |
| **资源加载系统** | 加载资源 | UI → 资源 | 异步加载UI预制体 |
| **所有系统** | 提供数据 | 各系统 → UI | 各系统提供数据给UI显示 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `ui:opened` | `{ uiName }` | UI打开 |
| `ui:closed` | `{ uiName }` | UI关闭 |
| `ui:button_clicked` | `{ buttonId }` | 按钮点击 |
| `ui:scroll_end` | `{ listId }` | 列表滚动到底部 |

## Formulas

### 1. 动画缓动函数

```
// easeOutBack
easeOutBack(t) = 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
c1 = 1.70158, c3 = c1 + 1

// easeOutCubic
easeOutCubic(t) = 1 - pow(1 - t, 3)
```

### 2. UI层级计算

```
zIndex = baseLayer + subIndex * 10
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseLayer | int | 0-700 | config | 基础层级 |
| subIndex | int | 0-10 | runtime | 同层内序号 |

### 3. 对象池大小

```
poolSize = min(maxPoolSize, ceil(averageUsage * 1.5))
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| maxPoolSize | int | 5-20 | config | 最大池大小 |
| averageUsage | float | 0-∞ | runtime | 平均使用量 |

**Expected output range**:
- UI打开耗时：50-300ms
- UI关闭耗时：50-200ms
- 内存占用：视UI数量而定

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 快速连续打开同一UI | 忽略后续打开请求 | 防止重复 |
| 打开UI时资源未加载 | 显示加载中，加载完成后显示 | 优雅处理 |
| 关闭UI时正在播放动画 | 立即完成动画并关闭 | 响应用户意图 |
| 层级冲突 | 后打开的UI显示在上层 | 符合直觉 |
| 内存不足 | 清理对象池，优先保留常驻UI | 优雅降级 |
| UI预制体不存在 | 记录错误，显示默认提示 | 优雅处理错误 |
| 同时打开多个弹窗 | 使用队列，逐个显示 | 防止混乱 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **事件系统** | Hard | `on()`, `emit()` | ✅ Designed |
| **资源加载系统** | Soft | `loadPrefab()` | Not Started |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **所有需要UI的系统** | Hard | `openUI()`, `closeUI()` | Various |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **动画时长** | 0.2s | 0.1-0.5s | 更流畅但更慢 | 更快但更生硬 |
| **对象池大小** | 5 | 3-10 | 更少的实例化 | 更多的内存 |
| **UI缓存时间** | 60s | 30-300s | 更快的再次打开 | 更少的内存 |
| **Toast显示时长** | 2s | 1-5s | 更长的阅读时间 | 更快的消失 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **按钮** | 正常、按下、禁用三态 |
| **弹窗** | 带半透明遮罩 |
| **列表** | 支持滚动、惯性、回弹 |
| **Toast** | 半透明背景，居中显示 |
| **Loading** | 全屏遮罩+动画 |

### 按钮状态

| State | Visual |
|-------|--------|
| Normal | 默认颜色 |
| Pressed | 缩放 0.95，颜色加深 |
| Disabled | 灰色，透明度 0.5 |
| Hover (可选) | 轻微放大 1.02 |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `ui_button_click` | 按钮点击 |
| `ui_open` | 界面打开 |
| `ui_close` | 界面关闭 |
| `ui_scroll` | 列表滚动（可选） |
| `ui_error` | 操作失败 |

## UI Requirements

### 主界面布局

```
┌─────────────────────────────────┐
│ ⚡80/100  🌅上午  第5天春  ⚙️  │ ← TopBar
├─────────────────────────────────┤
│                                 │
│         [游戏场景区域]           │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [背包] [任务] [村民] [设置]    │ ← BottomBar
└─────────────────────────────────┘
```

### 通用弹窗模板

```
┌─────────────────────────────────┐
│           弹窗标题               │
├─────────────────────────────────┤
│                                 │
│         弹窗内容区域             │
│                                 │
├─────────────────────────────────┤
│  [取消]              [确认]     │
└─────────────────────────────────┘
```

### Toast提示

```
┌─────────────────────────────────┐
│         保存成功 ✓               │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] UI正确打开和关闭
- [ ] 层级管理正确
- [ ] 动画流畅
- [ ] 对象池正常工作
- [ ] 事件正确分发
- [ ] 按钮交互正确

**性能测试**:
- [ ] UI打开耗时 < 300ms
- [ ] UI关闭耗时 < 200ms
- [ ] 动画帧率 ≥ 60fps
- [ ] 内存泄漏检测通过

**兼容性测试**:
- [ ] 不同屏幕尺寸适配
- [ ] 安全区域适配（刘海屏）
- [ ] 触摸和鼠标输入兼容

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要UI热更新？ | 设计者 | Beta阶段 | 不需要 |
| 是否需要UI自动化测试？ | 设计者 | Alpha阶段 | 可选 |

## Implementation Notes

```typescript
enum UILayer {
    BACKGROUND = 0,
    SCENE = 100,
    HUD = 200,
    POPUP = 300,
    TOPBAR = 400,
    LOADING = 500,
    TOAST = 600,
    DEBUG = 700
}

enum UIState {
    NONE = 'NONE',
    LOADING = 'LOADING',
    ENTERING = 'ENTERING',
    ACTIVE = 'ACTIVE',
    EXITING = 'EXITING',
    POOLED = 'POOLED'
}

interface UIConfig {
    name: string;
    prefab: string;
    layer: UILayer;
    cache: boolean;
    poolSize: number;
}

class UIManager {
    private uiConfigs: Map<string, UIConfig>;
    private activeUIs: Map<string, Node>;
    private uiPool: Map<string, Node[]>;
    private eventSystem: EventSystem;

    openUI(name: string, data?: any): Promise<Node>;
    closeUI(name: string): void;
    closeAllUI(): void;
    getUI(name: string): Node | null;
    isUIOpen(name: string): boolean;
    bringToFront(name: string): void;
    showToast(message: string, duration?: number): void;
    showLoading(message?: string): void;
    hideLoading(): void;
}
```