# 出界检测系统 (Out-of-Bounds Detection System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-04-04
> **Implements Pillar**: 策略简洁

## Overview

出界检测系统负责判定球何时越过了底部边界并触发游戏失败。它是连接物理世界和游戏规则的桥梁——边界系统提供了底部 Sensor 的碰撞回调，而出界检测系统将这个原始物理事件转化为确定性的游戏失败信号。对于玩家来说，这个系统在球穿过屏幕底部的瞬间宣告"游戏结束"。没有出界检测系统，球会无限下落，游戏永远无法失败，紧张感和策略意义荡然无存。

核心设计原则是**即时检测、单次触发、延迟委托**：检测在球穿过底部 Sensor 的当帧立即发生，通过单标志位保证只触发一次，而视觉延迟等体验细节完全交给视觉反馈系统处理。

## Player Fantasy

玩家应该感觉失败是**公平且即时的**——球穿过底部的瞬间，他们就知道这局结束了。没有困惑的等待期，没有"刚才到底算不算出界"的模糊地带。

球出界后应该有一小段**自然落下的视觉残留**——球不是突然消失，而是继续往下掉，搭配屏幕变暗和抖动，给玩家一个情绪缓冲。这个"慢慢沉下去"的感觉比"瞬间消失"更有仪式感，也更温和。

**关键体验目标**：
- **公平感**：出界判定精确，没有"明明还在里面怎么就失败了"的困惑
- **即时感**：球穿过底部的那一刻就判定了，不拖泥带水
- **仪式感**：失败有一个短暂的情绪过渡，不是突兀的截断
- **安全感**：不会因为 bug 或重复触发而出两次失败

## Detailed Design

### Core Rules

**1. 检测机制**：

底部边界由边界系统创建为一个物理 Sensor（触发器），碰撞系统在球穿过该 Sensor 时回调 `onBallOutOfBounds()`。出界检测系统不自己做几何判断，完全信任碰撞系统的 Sensor 回调。

| 检测属性 | 值 | 说明 |
|---------|-----|------|
| 检测方式 | 底部 Sensor 的 `onBeginContact` | 由碰撞系统回调 |
| 检测时机 | 球的碰撞体与底部 Sensor 发生接触的当帧 | 无延迟 |
| 检测对象 | 仅球（BALL 分组，0x0001） | 忽略其他对象 |
| 检测方向 | 球从上往下穿过（单向） | 不处理从下往上的情况（正常游戏不会发生） |

**2. 单次触发保障**：

系统维护一个布尔标志位 `hasTriggered`，防止重复触发。

```
初始化: hasTriggered = false
关卡重置: hasTriggered = false
检测回调触发时:
  if hasTriggered → 忽略（直接返回）
  if NOT hasTriggered → hasTriggered = true → 执行出界流程
```

**3. 球的出界后行为**：

检测触发后，球**继续受重力影响自然下落**，直到完全离开屏幕后被销毁。这创造了一个"球缓缓沉下去"的视觉效果。但出界后球不再触发任何游戏事件（碰撞、收集等）。

| 阶段 | 重力 | 碰撞检测 | 事件触发 | 渲染 |
|------|------|---------|---------|------|
| 正常游戏中 | 开启 | 开启 | 开启 | 开启 |
| 出界后（下落中） | 开启 | 关闭 | 关闭 | 开启 |
| 完全离开屏幕 | N/A | N/A | N/A | 销毁节点 |

**4. 出界后的游戏流程**：

```
碰撞系统检测到球穿过底部 Sensor
  → 出界检测系统 onBallOutOfBounds() 被调用
    → 检查 hasTriggered（防重复）
    → hasTriggered = true
    → 通知游戏状态管理: onBallOutOfBounds()
      → 游戏状态变为 DEFEAT
      → 通知视觉反馈系统: playLoseEffect()
      → 通知音频系统: playSound('lose')
    → 禁用球的碰撞体（防止继续触发碰撞事件）
    → 球继续受重力下落（自然离开屏幕）
    → 球完全离开屏幕后，销毁球节点
```

**5. 视觉延迟的职责划分**：

出界检测系统**不**管理视觉延迟。它只负责：
- 即时检测出界
- 即时通知游戏状态管理
- 即时禁用碰撞体

视觉上的延迟效果（屏幕变暗的渐变、抖动动画的持续时间、"失败"文字的弹出时机）全部由视觉反馈系统的 `playLoseEffect()` 控制。

### States and Transitions

出界检测系统维护一个简单的状态：

```
┌──────────┐    Sensor回调     ┌───────────┐    球离开屏幕    ┌──────────┐
│  Armed   │ ───────────────► │ Triggered │ ──────────────► │  Spent   │
│ (等待中)  │                  │ (已触发)   │                 │ (已完成)  │
└──────────┘                  └───────────┘                 └──────────┘
     ▲                                                        │
     │                      关卡重置                            │
     └────────────────────────────────────────────────────────┘
```

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Armed** | 关卡加载/重置 | 球穿过底部 Sensor | `hasTriggered = false`，正常监听碰撞回调 |
| **Triggered** | 球穿过底部 Sensor | 球完全离开屏幕 | `hasTriggered = true`，球继续下落，禁用碰撞体 |
| **Spent** | 球完全离开屏幕 | 关卡重置 | 球节点已销毁，不再处理任何事件 |

**状态转换表**：

| 当前状态 | 触发事件 | 目标状态 | 副作用 |
|---------|---------|---------|--------|
| `Armed` | 底部 Sensor 的 `onBeginContact` | `Triggered` | `hasTriggered = true`，通知游戏状态管理，禁用球碰撞体 |
| `Armed` | 关卡重置 | `Armed` | 无（状态不变） |
| `Triggered` | 球 Y 坐标 < `SCREEN_DESTROY_Y` | `Spent` | 销毁球节点 |
| `Triggered` | 关卡重置 | `Armed` | 重新创建球节点，`hasTriggered = false` |
| `Spent` | 关卡重置 | `Armed` | 重新创建球节点，`hasTriggered = false` |
| `Spent` | 再次收到碰撞回调 | `Spent` | 忽略（球已销毁，理论上不会发生） |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **碰撞系统** | 输入 <- | `onBallOutOfBounds(): void` | 球穿过底部 Sensor 时的回调 |
| **边界系统** | 间接 | N/A | 边界系统创建底部 Sensor，碰撞系统负责检测；出界检测系统不直接与边界系统交互 |
| **游戏状态管理** | 输出 -> | `onBallOutOfBounds(): void` | 通知球出界，触发 DEFEAT 状态 |
| **视觉反馈系统** | 间接 | N/A | 通过游戏状态管理的 `onPhaseChanged(DEFEAT)` 间接触发 `playLoseEffect()` |
| **音频系统** | 间接 | N/A | 通过游戏状态管理的 `onPhaseChanged(DEFEAT)` 间接触发 `playSound('lose')` |
| **球物理系统** | 输出 -> | 禁用碰撞体，保留重力 | 出界后禁用碰撞体但保留重力模拟 |
| **场景管理** | 输入 <- | `onLevelReset(): void` | 关卡重置时重置检测状态和球节点 |
| **场景管理** | 输入 <- | `onSceneUnload(): void` | 场景卸载时清理资源 |

**接口定义**：

```typescript
interface OutOfBoundsDetector {
  /** 碰撞系统回调：球穿过底部 Sensor 时调用 */
  onBallOutOfBounds(): void;

  /** 场景管理回调：关卡重置时调用，重置检测状态 */
  onLevelReset(): void;

  /** 场景管理回调：场景卸载时调用，清理资源 */
  onSceneUnload(): void;

  /** 查询当前检测状态（调试用） */
  getState(): OutOfBoundsState;
}

enum OutOfBoundsState {
  ARMED = 'ARMED',
  TRIGGERED = 'TRIGGERED',
  SPENT = 'SPENT'
}
```

## Formulas

### 球销毁判定

球继续下落后，当其 Y 坐标低于屏幕底部足够距离时，销毁球节点以释放资源。

```
shouldDestroy = (ballPosition.y < SCREEN_DESTROY_Y)
SCREEN_DESTROY_Y = -BALL_DESTROY_MARGIN
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| ballPosition.y | number | -INF ~ screenHeight | 物理模拟 | 球的 Y 坐标（Cocos Creator 坐标系，向上为正） |
| SCREEN_DESTROY_Y | number | 计算得出 | — | 球销毁的 Y 阈值 |
| BALL_DESTROY_MARGIN | number | 100px | 配置常量 | 球完全离开屏幕后的额外下落距离 |

**说明**：在 Cocos Creator 中，Y 轴向上为正。屏幕底部 y=0，球下落到 y < -100 时销毁。`BALL_DESTROY_MARGIN` 确保球完全从屏幕消失后才销毁，避免"突然消失"的视觉跳变。

### 出界检测帧时间预算

```
detectionBudget = 0.05ms
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| detectionBudget | number | 0.05ms | 性能要求 | 出界检测的单帧时间预算 |

检测逻辑本身是一个标志位检查（O(1)），时间开销可忽略不计。大部分时间花在碰撞系统的 Sensor 回调分发上，由碰撞系统文档负责。

### 出界后球的存活时间

球从穿过底部 Sensor 到被销毁的时间，取决于球的下落速度。

```
survivalTime = BALL_DESTROY_MARGIN / abs(ballVelocity.y)
maxSurvivalTime = BALL_DESTROY_MARGIN / MIN_BALL_SPEED
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| ballVelocity.y | number | -INF ~ 0 | 物理模拟 | 球的垂直速度（下落为负） |
| BALL_DESTROY_MARGIN | number | 100px | 配置常量 | 销毁前的额外下落距离 |
| MIN_BALL_SPEED | number | 50 | 球物理配置 | 球的最小速度 |
| survivalTime | number | 0.067s ~ INF | 计算得出 | 球出界后到销毁的时间 |
| maxSurvivalTime | number | 2.0s | 计算得出 | 球出界后的最长存活时间 |

**注意**：如果球以最低速度下落，存活时间约 2 秒。正常出界场景下球通常有较高速度（受重力加速），存活时间一般在 0.1-0.3 秒之间。这与视觉反馈系统的 `playLoseEffect()` 持续时间（0.5s）配合，形成自然的失败过渡。

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **碰撞系统在一帧内多次回调 `onBallOutOfBounds()`** | 第一次调用正常执行，后续调用被 `hasTriggered` 标志位拦截 | 防止重复触发失败流程 |
| **球出界时速度极低**（几乎静止在底部 Sensor 上） | 仍然触发出界，球缓慢下落，最多 2 秒后被销毁 | 速度不影响出界判定，只影响视觉过渡时长 |
| **暂停时球正在穿越底部 Sensor** | 碰撞系统已暂停，回调被忽略；恢复后如果球仍在 Sensor 区域，不会再次触发（因为 `onBeginContact` 已经过去了） | 暂停是安全的——碰撞系统忽略回调，恢复后不会有延迟触发 |
| **暂停时球已穿过底部但回调还没处理**（极端时序） | 如果回调在暂停前的同一帧已入队，暂停后该回调仍可能执行；`hasTriggered` 标志位保证只触发一次 | Box2D 的回调在同一物理步骤内处理，此场景极少发生 |
| **球发射前就收到 `onBallOutOfBounds()`** | 忽略——游戏状态管理的规则已处理（`currentPhase !== PLAYING` 时忽略） | 防御性编程，正常流程不会发生 |
| **同一帧内收集最后一个光点 + 球出界** | 由游戏状态管理的优先级规则处理：胜利优先于失败 | 已在游戏状态管理的 Edge Cases 中定义 |
| **关卡重置时球正在下落中**（Triggered 状态） | 重置 `hasTriggered = false`，重新创建球节点，恢复为 Armed 状态 | 确保重置后可以正常再次检测 |
| **球被传送或瞬移到底部 Sensor 下方**（作弊或 bug） | Sensor 的 `onBeginContact` 会在球进入区域时触发，即使球是从下方进入的 | Box2D Sensor 不区分进入方向；但正常游戏不会出现此情况 |
| **底部 Sensor 未被正确注册** | 球穿过底部不会触发任何事件，球继续下落直到超出屏幕被销毁；游戏进入"无法失败"的异常状态 | 这是边界系统或碰撞系统的 bug，不应由出界检测系统处理；建议添加超时安全网 |
| **球出界后关卡未重置**（UI 没有响应） | 球在 Spent 状态等待重置，系统不会再响应任何事件 | 不会崩溃，但游戏会卡在失败状态等待玩家操作 |
| **连续快速重置关卡** | 每次重置都正确设置 `hasTriggered = false`，重新创建球节点 | 重置是幂等操作 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **碰撞系统** | 输入 <- | 硬依赖：提供底部 Sensor 的 `onBallOutOfBounds()` 回调 | Approved |
| **游戏状态管理** | 输出 -> | 硬依赖：通知球出界，触发 DEFEAT 状态 | Approved |
| **球物理系统** | 输出 -> | 硬依赖：出界后禁用球的碰撞体 | Approved |
| **场景管理** | 输入 <- | 硬依赖：关卡重置时重置检测状态，场景卸载时清理 | Approved |
| **边界系统** | 间接 | 软依赖：边界系统创建底部 Sensor，但出界检测系统不直接交互 | Approved |
| **视觉反馈系统** | 间接 | 软依赖：通过游戏状态管理间接触发失败效果 | Approved |
| **音频系统** | 间接 | 软依赖：通过游戏状态管理间接触发失败音效 | Approved |

**依赖性质分析**：
- **碰撞系统**：**硬依赖**——没有碰撞系统的 Sensor 回调，无法检测出界
- **游戏状态管理**：**硬依赖**——出界事件必须被处理为 DEFEAT 状态
- **球物理系统**：**硬依赖**——出界后需要禁用球的碰撞体
- **场景管理**：**硬依赖**——需要重置和清理生命周期钩子
- **视觉/音频系统**：**间接依赖**——不直接调用，通过游戏状态管理的事件分发机制传递

**注意**：出界检测系统是 Feature 层，依赖 Core 层的碰撞系统和游戏状态管理。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **BALL_DESTROY_MARGIN** | 100px | 50-300px | 球下落更久才销毁，视觉过渡更完整 | 球更快消失，可能看起来突兀 |
| **SCREEN_DESTROY_Y** | -100 | -300 ~ -50 | 与 BALL_DESTROY_MARGIN 联动 | 与 BALL_DESTROY_MARGIN 联动 |

**交互影响**：
- `BALL_DESTROY_MARGIN` 应该大于屏幕可视区域下方的任何 UI 元素位置，避免球在 UI 层"穿帮"
- `BALL_DESTROY_MARGIN` 不影响游戏判定，只影响资源回收时机
- 视觉反馈系统的 `playLoseEffect()` 持续时间（0.5s）应短于球的最长存活时间（2.0s），确保视觉效果在球消失前完成

**关于底部 Sensor 位置**：
底部 Sensor 的 Y 坐标由边界系统定义（`bottomBoundary`），不属于本系统的调参范围。但它的位置直接影响出界判定的"宽容度"——Sensor 越低，球有越多空间"看起来要出界但还没出界"，紧张感越强。

## Visual/Audio Requirements

出界检测系统本身**不直接控制**视觉或音频。所有反馈通过游戏状态管理的事件分发机制传递：

| Event | Trigger Path | Visual Effect | Audio Effect |
|-------|-------------|---------------|--------------|
| 球出界 | 本系统 -> 游戏状态管理 `onBallOutOfBounds()` -> `onPhaseChanged(DEFEAT)` -> 视觉反馈系统 | `playLoseEffect()`（屏幕变暗 + 抖动） | `playSound('lose')` |
| 球下落中 | 本系统保留重力，球自然下落 | 球继续向下运动的动画 | 无 |

**球的视觉处理**：
- 出界后球继续渲染，保持正常的视觉外观
- 球被屏幕底部裁剪（自然消失，不需要特殊的淡出效果）
- 球完全离开屏幕后节点被销毁

**调试可视化**（仅开发模式）：
- 可选显示 `hasTriggered` 标志状态（文本指示器）
- 可选显示当前检测状态（Armed / Triggered / Spent）
- 可选显示 `SCREEN_DESTROY_Y` 线（红色虚线）

## UI Requirements

出界检测系统**无直接 UI 需求**。失败弹窗和重试按钮由游戏状态管理和 UI 系统负责。

**间接 UI 影响**：
- 失败弹窗的显示时机由游戏状态管理的 `DEFEAT` 状态决定
- 重试按钮触发 `onLevelReset()`，间接触发本系统的重置

## Acceptance Criteria

### 核心检测验收

- [ ] 球穿过底部 Sensor 时，`onBallOutOfBounds()` 被正确触发
- [ ] 球从侧边或顶部离开可玩区域时，**不**触发出界检测
- [ ] 只有 BALL 分组（0x0001）的对象触发出界检测
- [ ] 检测在球穿过 Sensor 的当帧发生，无延迟

### 单次触发验收

- [ ] 同一关卡内，`onBallOutOfBounds()` 只被处理一次
- [ ] 碰撞系统在一帧内多次回调时，只有第一次生效
- [ ] `hasTriggered` 标志位在首次触发后立即设为 true
- [ ] 触发后的后续回调被静默忽略，无副作用

### 球出界后行为验收

- [ ] 出界后球的碰撞体被禁用，不再触发任何碰撞事件
- [ ] 出界后球继续受重力影响自然下落
- [ ] 球的视觉表现正常（继续渲染，被屏幕底部自然裁剪）
- [ ] 球 Y 坐标 < `SCREEN_DESTROY_Y` 时，球节点被销毁
- [ ] 球出界后不触发光点收集事件

### 状态管理验收

- [ ] 关卡加载后，系统处于 Armed 状态（`hasTriggered = false`）
- [ ] 球出界后，系统进入 Triggered 状态
- [ ] 球销毁后，系统进入 Spent 状态
- [ ] 关卡重置后，系统恢复为 Armed 状态

### 通知验收

- [ ] 出界检测触发后，游戏状态管理的 `onBallOutOfBounds()` 被调用
- [ ] 游戏状态管理将 `currentPhase` 变为 `DEFEAT`
- [ ] 视觉反馈系统的 `playLoseEffect()` 被间接触发
- [ ] 音频系统的 `playSound('lose')` 被间接触发

### 重置验收

- [ ] 关卡重置时 `hasTriggered` 被重置为 false
- [ ] 关卡重置时球节点被重新创建
- [ ] 关卡重置后系统恢复为 Armed 状态，可再次正常检测
- [ ] 连续快速重置多次，系统状态正确

### 边界情况验收

- [ ] 球发射前收到 `onBallOutOfBounds()` 时，事件被游戏状态管理忽略（由游戏状态管理保证）
- [ ] 同一帧内胜利 + 出界，胜利优先（由游戏状态管理保证）
- [ ] 暂停时球穿越底部 Sensor，回调被碰撞系统忽略
- [ ] 球以极低速度穿越底部，仍然正确触发

### 性能验收

- [ ] 出界检测逻辑 < 0.05ms/帧（标志位检查）
- [ ] 无 GC 压力（无每帧内存分配）
- [ ] 球节点销毁不造成帧率卡顿

### 配置验收

- [ ] `BALL_DESTROY_MARGIN` 可通过配置文件调整
- [ ] 无硬编码值（除默认配置常量）

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|------------|
| 是否需要出界检测的超时安全网？（如果 Sensor 未注册，球下落超时后自动触发失败） | 原型测试后决定 | -- | 待定（增加健壮性但增加复杂度） |
| 球出界后的下落是否需要加速效果？（视觉上更有"掉下去"的感觉） | 视觉设计时决定 | -- | 待定（当前方案：保持正常重力） |
| 多球模式下如何处理出界检测？（每个球独立检测？所有球出界才算失败？） | 多球功能评估时决定 | -- | 待定（当前为单球设计） |
