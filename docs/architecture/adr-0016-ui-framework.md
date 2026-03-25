# ADR-0016: UI框架系统 (UI Framework System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要统一的 UI 管理系统来处理界面层级、动画、缓存和事件分发。所有游戏界面（主界面、背包、设置、对话等）都应通过统一的框架管理，确保一致性和可维护性。

### Constraints
- **平台限制**: 微信小游戏，需要优化内存使用
- **性能要求**: UI 操作不能影响游戏帧率
- **可访问性**: 需要支持文本缩放和色盲模式
- **分辨率适配**: 需要适配不同屏幕尺寸

### Requirements
- 统一的层级管理（背景、场景、HUD、弹窗等）
- UI 动画系统（进入、退出动画）
- 对象池缓存（减少内存分配）
- 事件分发（UI 事件与游戏事件隔离）
- 异步加载支持

## Decision

采用**层级管理 + 对象池 + 状态机**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                       UIFramework                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LayerManager (层级管理)                                  │   │
│  │ BACKGROUND(0) → SCENE(100) → HUD(200) → POPUP(300) →    │   │
│  │ TOPBAR(400) → LOADING(500) → TOAST(600) → DEBUG(700)    │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ UIPool          │  │ UIRegistry                          │  │
│  │ (对象池缓存)     │  │ Map<string, UIConfig>               │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ActiveUIs Map<string, UIInstance>                        │   │
│  │ - 管理当前激活的 UI 实例                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 层级定义

```
┌────────────────────────────────────────┐
│ DEBUG (700)      - 调试信息            │
├────────────────────────────────────────┤
│ TOAST (600)      - 轻提示              │
├────────────────────────────────────────┤
│ LOADING (500)    - 加载界面            │
├────────────────────────────────────────┤
│ TOPBAR (400)     - 顶部栏（体力、时间）│
├────────────────────────────────────────┤
│ POPUP (300)      - 弹窗（背包、设置）  │
├────────────────────────────────────────┤
│ HUD (200)        - 主界面              │
├────────────────────────────────────────┤
│ SCENE (100)      - 场景 UI             │
├────────────────────────────────────────┤
│ BACKGROUND (0)   - 背景层              │
└────────────────────────────────────────┘
```

### Key Interfaces

```typescript
/**
 * UI 层级
 */
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

/**
 * UI 实例状态
 */
enum UIState {
    NONE = 'NONE',         // 不存在
    LOADING = 'LOADING',   // 加载中
    ENTERING = 'ENTERING', // 进入动画中
    ACTIVE = 'ACTIVE',     // 激活状态
    EXITING = 'EXITING',   // 退出动画中
    POOLED = 'POOLED'      // 在对象池中
}

/**
 * 缓存策略
 */
enum CacheStrategy {
    PERMANENT = 'PERMANENT', // 常驻内存
    POOLED = 'POOLED',       // 对象池缓存
    ON_DEMAND = 'ON_DEMAND', // 按需加载
    ASYNC = 'ASYNC'          // 异步加载
}

/**
 * 动画类型
 */
enum AnimationType {
    NONE = 'NONE',
    SCALE = 'SCALE',        // 缩放弹出
    SLIDE = 'SLIDE',        // 滑动
    FADE = 'FADE'           // 淡入淡出
}

/**
 * UI 配置
 */
interface UIConfig {
    id: string;
    layer: UILayer;
    prefab: string;          // 预制体路径
    cacheStrategy: CacheStrategy;
    animationType: AnimationType;
    animationDuration: number;
}

/**
 * UI 实例
 */
interface UIInstance {
    config: UIConfig;
    node: Node;              // Cocos Creator 节点
    state: UIState;
    data?: unknown;          // 传入数据
}
```

### UI 生命周期

```
NONE ──(open)──▶ LOADING ──(loaded)──▶ ENTERING ──(enterAnimDone)──▶ ACTIVE
                                                                        │
                     ┌──────────────────────────────────────────────────┘
                     │
                     ▼
              EXITING ──(exitAnimDone)──▶ POOLED 或 NONE
```

## Alternatives Considered

### 1. 无框架，直接操作节点
**方案**: 每个 UI 直接创建和管理自己的节点。

**优点**: 简单直接。

**缺点**:
- 无层级管理，容易遮挡错误
- 无统一动画，风格不一致
- 无缓存，性能差

**结论**: 不采用，缺乏统一管理。

### 2. 单例 UI 管理
**方案**: 所有 UI 都挂载在一个单例管理器下。

**优点**: 集中管理。

**缺点**:
- 内存压力大
- 不支持同时显示多个同类 UI

**结论**: 不采用，对象池更灵活。

### 3. 纯预制体方案
**方案**: 不使用代码管理，纯编辑器配置。

**优点**: 设计师友好。

**缺点**:
- 难以动态控制
- 缓存策略无法配置

**结论**: 混合采用，配置 + 代码管理。

## Consequences

### Positive
- **层级清晰**: UI 显示顺序有明确定义
- **性能优化**: 对象池减少内存分配和 GC
- **风格一致**: 统一动画系统
- **灵活缓存**: 不同 UI 可配置不同缓存策略

### Negative
- **复杂度**: 需要理解框架概念
- **约束**: UI 开发需要遵循框架规范

### Risks
- **内存泄漏**: 对象池未正确清理
- **层级冲突**: 新 UI 层级配置不当

## Implementation Notes

### 打开 UI

```typescript
class UIFramework {
    private activeUIs: Map<string, UIInstance> = new Map();
    private pooledUIs: Map<string, UIInstance[]> = new Map();

    async open<T = unknown>(
        uiId: string,
        data?: T,
        options?: OpenOptions
    ): Promise<UIInstance> {
        const config = this.getUIConfig(uiId);

        // 1. 检查是否已打开
        if (this.activeUIs.has(uiId)) {
            const existing = this.activeUIs.get(uiId)!;
            if (data) this.updateData(existing, data);
            return existing;
        }

        // 2. 尝试从对象池获取
        let instance = this.getFromPool(uiId);

        if (!instance) {
            // 3. 加载预制体
            instance = await this.loadUI(config);
        }

        // 4. 设置数据
        if (data) this.updateData(instance, data);

        // 5. 添加到层级
        this.addToLayer(instance, config.layer);

        // 6. 播放进入动画
        instance.state = UIState.ENTERING;
        await this.playEnterAnimation(instance);

        // 7. 激活
        instance.state = UIState.ACTIVE;
        this.activeUIs.set(uiId, instance);

        this.eventSystem.emit(UIEvents.OPENED, { uiId, data });

        return instance;
    }
}
```

### 关闭 UI

```typescript
async close(uiId: string): Promise<void> {
    const instance = this.activeUIs.get(uiId);
    if (!instance) return;

    // 1. 播放退出动画
    instance.state = UIState.EXITING;
    await this.playExitAnimation(instance);

    // 2. 从层级移除
    this.removeFromLayer(instance);

    // 3. 根据缓存策略处理
    if (instance.config.cacheStrategy === CacheStrategy.POOLED) {
        // 放入对象池
        instance.state = UIState.POOLED;
        this.addToPool(instance);
    } else if (instance.config.cacheStrategy === CacheStrategy.ON_DEMAND) {
        // 销毁
        instance.node.destroy();
        instance.state = UIState.NONE;
    }

    // 4. 从激活列表移除
    this.activeUIs.delete(uiId);

    this.eventSystem.emit(UIEvents.CLOSED, { uiId });
}
```

### 对象池

```typescript
private getFromPool(uiId: string): UIInstance | null {
    const pool = this.pooledUIs.get(uiId);
    if (!pool || pool.length === 0) return null;

    const instance = pool.pop()!;
    instance.node.active = true;
    return instance;
}

private addToPool(instance: UIInstance): void {
    instance.node.active = false;

    if (!this.pooledUIs.has(instance.config.id)) {
        this.pooledUIs.set(instance.config.id, []);
    }

    this.pooledUIs.get(instance.config.id)!.push(instance);
}
```

### 层级管理

```typescript
private addToLayer(instance: UIInstance, layer: UILayer): void {
    const layerNode = this.getOrCreateLayerNode(layer);
    layerNode.addChild(instance.node);
    instance.node.setSiblingIndex(layer);
}

private getOrCreateLayerNode(layer: UILayer): Node {
    // 获取或创建层级容器节点
    // 确保层级顺序正确
}
```

### UI 配置注册

```typescript
// 游戏启动时注册所有 UI
const uiConfigs: UIConfig[] = [
    {
        id: 'backpack',
        layer: UILayer.POPUP,
        prefab: 'prefabs/ui/BackpackUI',
        cacheStrategy: CacheStrategy.POOLED,
        animationType: AnimationType.SCALE,
        animationDuration: 0.3
    },
    {
        id: 'settings',
        layer: UILayer.POPUP,
        prefab: 'prefabs/ui/SettingsUI',
        cacheStrategy: CacheStrategy.ON_DEMAND,
        animationType: AnimationType.FADE,
        animationDuration: 0.2
    },
    {
        id: 'hud',
        layer: UILayer.HUD,
        prefab: 'prefabs/ui/HUD',
        cacheStrategy: CacheStrategy.PERMANENT,
        animationType: AnimationType.NONE,
        animationDuration: 0
    }
];

uiFramework.registerUIs(uiConfigs);
```

## Related Systems

- **EventSystem**: UI 事件发布/订阅
- **CloudSaveSystem**: UI 设置持久化
- **TimeSystem**: HUD 时间显示
- **StaminaSystem**: HUD 体力显示
- **BackpackSystem**: 背包 UI 数据绑定
