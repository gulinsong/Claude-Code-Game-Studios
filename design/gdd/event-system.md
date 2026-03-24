# 事件系统 (Event System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 基础设施 — 所有系统的基础

## Overview

事件系统是《岁时记》的**基础设施层**，提供发布-订阅模式的事件分发机制。它作为游戏内所有系统间通信的**解耦层**，允许系统A在不需要直接引用系统B的情况下，响应系统B发生的事件。

玩家不直接与事件系统交互——这是一个**后台基础设施**。它为背包、时间、手工艺、村民关系、节日筹备、UI、云存档等几乎所有其他系统提供事件驱动的通信能力。

事件系统支持**游戏内事件**（如"材料采集完成"、"节日开始"）和**UI事件**（如"按钮点击"、"弹窗打开"）。监听器按优先级排序，高优先级事件优先分发。

## Player Fantasy

此系统是基础设施，玩家不直接感知。玩家体验到的"流畅感"和"系统间协调的反馈"是这个系统在后台支撑的。

间接支持的玩家幻想：
- **即时反馈**: 玩家完成采集后立即看到材料出现在背包中
- **连贯的世界**: 时间变化、节日到来时所有相关系统同步响应
- **流畅的交互**: UI操作立即触发相应的游戏逻辑

## Detailed Design

### Core Rules

1. **事件定义**
   - 每个事件由唯一的字符串标识符定义 (e.g., `"craft:completed"`)
   - 事件可携带数据载荷 (payload)，载荷为可选的任意对象
   - 事件标识符命名规范: `[系统名]:[动作]` (e.g., `"inventory:item_added"`, `"festival:started"`)

2. **事件监听器 (Listener)**
   - 监听器包含：事件标识符、回调函数、优先级
   - 监听器可动态注册和移除
   - 同一事件可以有多个监听器
   - 监听器可选择一次性 (once) — 触发后自动移除

3. **事件分发流程**
   1. 事件被触发 (emit)
   2. 系统查找所有匹配的监听器
   3. 按优先级排序监听器 (高优先级先执行)
   4. 依次执行每个监听器的回调
   5. 如果监听器标记为 once，执行后移除

4. **优先级规则**
   - 优先级为整数，默认值为 0
   - 数值越大优先级越高
   - 同优先级监听器按注册顺序执行
   - 推荐优先级范围：
     - 系统关键事件 (存档、场景切换): 100
     - 游戏逻辑事件 (状态变化、进度更新): 50
     - UI反馈事件 (动画、音效): 10

5. **事件类型划分**

| 类型 | 前缀 | 示例 | 说明 |
|------|------|------|------|
| 游戏事件 | `game:` | `game:day_changed` | 游戏状态变化 |
| 背包事件 | `inventory:` | `inventory:item_added` | 物品变化 |
| 时间事件 | `time:` | `time:hour_changed` | 时间流逝 |
| 节日事件 | `festival:` | `festival:started` | 节日状态 |
| 村民事件 | `villager:` | `villager:friendship_changed` | 关系变化 |
| 手工艺事件 | `craft:` | `craft:completed` | 制作完成 |
| 任务事件 | `quest:` | `quest:completed` | 任务状态 |
| UI事件 | `ui:` | `ui:button_clicked` | 界面交互 |
| 社交事件 | `social:` | `social:gift_sent` | 好友互动 |
| 存档事件 | `save:` | `save:requested` | 存档操作 |

### States and Transitions

事件管理器本身无状态机。监听器有生命周期状态：

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Registered** | 调用 on() 或 once() | 调用 off() 或被销毁 | 等待事件触发 |
| **Active** | 事件触发，回调执行中 | 回调执行完成 | 执行回调逻辑 |
| **Removed** | 调用 off() 或 once 触发后 | 垃圾回收 | 不再响应事件 |

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 |
|------|---------|--------|
| **背包系统** | 背包监听游戏事件 | 接收 `item_added`, `item_removed` |
| **时间系统** | 时间系统发布游戏事件 | 发布 `game:day_changed`, `game:season_changed` |
| **体力系统** | 体力系统发布游戏事件 | 发布 `stamina:changed`, `stamina:exhausted` |
| **手工艺系统** | 手工艺系统发布完成事件 | 发布 `craft:completed` |
| **对话系统** | 对话系统发布对话事件 | 发布 `dialog:started`, `dialog:choice_made` |
| **任务系统** | 任务系统发布任务事件 | 发布 `quest:started`, `quest:completed` |
| **村民关系系统** | 村民关系系统发布关系事件 | 发布 `villager:friendship_changed` |
| **节日筹备系统** | 节日筹备系统依赖此 | 发布节日状态事件 |
| **云存档系统** | 云存档系统依赖此 | 监听存档事件 |
| **UI框架系统** | UI框架系统依赖此 | 发布UI交互事件 |

## Formulas

此系统无复杂公式。关键性能指标：

### 监听器查找时间

```
lookup_time = O(log n) 其中 n = 按事件ID索引的监听器数量
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| n | int | 0-100 | runtime | 按事件ID索引的监听器数量 |

**Expected output range**: < 0.1ms (正常情况)
**Edge case**: 当 n > 100 或查找时间 > 1ms，记录警告并考虑分片处理。

### 内存占用估算

```
memory_usage = base_overhead + (listener_count * listener_size)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| base_overhead | int | ~1KB | constant | 事件管理器基础内存 |
| listener_count | int | 0-1000 | runtime | 注册的监听器总数 |
| listener_size | int | ~100 bytes | constant | 单个监听器内存占用 |

**Expected output range**: < 100KB (正常情况)
**Edge case**: 当 memory_usage > 100KB，记录警告并建议优化。

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 监听器回调抛出异常 | 捕获异常，记录错误，继续执行下一个监听器 | 单个监听器失败不应影响其他监听器 |
| 事件无匹配监听器 | 静默忽略，不报错 | 不是所有事件都需要监听器 |
| 监听器在回调中移除自身 | 允许，正常执行 | 支持在回调中调用 off() |
| 监听器在回调中注册新监听器 | 允许，新监听器下次事件生效 | 防止无限循环 |
| 同一监听器重复注册 | 覆盖旧监听器 | 避免重复执行 |
| 事件分发期间 emit 同类型事件 | 新事件入队，当前分发完成后处理 | 防止递归爆炸 |
| 空事件标识符 | 忽略，记录警告 | 防止错误使用 |
| payload 为 undefined | 正常传递 undefined | payload 可选 |

## Dependencies

此系统是基础设施层，**无上游依赖**。

| System | Direction | Nature of Dependency |
|--------|-----------|---------------------|
| 背包系统 | 背包系统依赖此 | 监听物品变化事件 |
| 时间系统 | 时间系统依赖此 | 发布时间变化事件 |
| 体力系统 | 体力系统依赖此 | 发布体力变化事件 |
| 手工艺系统 | 手工艺系统依赖此 | 发布完成事件 |
| 对话系统 | 对话系统依赖此 | 发布对话事件 |
| 任务系统 | 任务系统依赖此 | 发布任务事件 |
| 村民关系系统 | 村民关系系统依赖此 | 发布关系变化事件 |
| 节日筹备系统 | 节日筹备系统依赖此 | 发布节日状态事件 |
| 云存档系统 | 云存档系统依赖此 | 监听存档事件 |
| UI框架系统 | UI框架系统依赖此 | 发布UI交互事件 |
| 收集系统 | 收集系统依赖此 | 发布收集事件 |
| 装饰系统 | 装饰系统依赖此 | 发布装饰事件 |
| 服装系统 | 服装系统依赖此 | 发布服装事件 |
| 社交系统 | 社交系统依赖此 | 发布社交事件 |
| 内购系统 | 内购系统依赖此 | 发布内购事件 |
| 日记系统 | 日记系统依赖此 | 监听记录事件 |
| 每日奖励系统 | 每日奖励系统依赖此 | 发布奖励事件 |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| 默认优先级 | 0 | -100 to 100 | 更多监听器获得默认执行顺序 | 更少监听器获得默认执行顺序 |
| 最大监听器数量 | 1000 | 100-5000 | 更灵活的系统设计 | 更低的内存占用 |
| 单事件最大监听器 | 100 | 10-500 | 更多的响应可能性 | 更严格的系统设计 |
| 警告阈值 (执行时间) | 10ms | 5-50ms | 更早发现性能问题 | 可能忽略慢回调 |
| 警告阈值 (监听器数) | 50 | 20-200 | 更早发现过度监听 | 可能忽略正常使用 |

## Visual/Audio Requirements

事件系统是后台基础设施，**无直接的视觉/音频反馈**。

间接支持其他系统的视觉/音频反馈。

## UI Requirements

事件系统是后台基础设施，**无直接的UI显示**。

间接支持其他系统的UI更新（通过事件驱动）。

## Acceptance Criteria

- [ ] 系统能成功注册和移除事件监听器
- [ ] 发布事件后，所有已注册的监听器按优先级顺序收到事件
- [ ] 事件分发完成时间 < 1ms (100个监听器)
- [ ] 监听器抛出异常不会中断事件分发
- [ ] once 监听器触发后自动移除
- [ ] 优先级排序正确 (高优先级先执行)
- [ ] 无硬编码的事件标识符 — 使用常量定义
- [ ] 性能: 事件分发内存占用 < 100KB (1000个监听器)
- [ ] 性能: 单次事件分发时间 < 1ms

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要支持异步事件? | 开发者 | 设计阶段 | 待定 |
| 是否需要事件历史记录功能? | 开发者 | 设计阶段 | 待定 |
| 内存警告阈值是否需要? | 开发者 | 实现阶段 | 待定 |

## Implementation Notes

### 推荐实现方式 (Cocos Creator / TypeScript)

```typescript
// 简化示例 - 完整实现在代码阶段
interface EventListener {
    eventId: string;
    callback: (payload: any) => void;
    priority: number;
    once: boolean;
}

class EventSystem {
    private listeners: Map<string, EventListener[]> = new Map();

    on(eventId: string, callback: Function, priority: number = 0): void;
    once(eventId: string, callback: Function, priority: number = 0): void;
    off(eventId: string, callback: Function): void;
    emit(eventId: string, payload?: any): void;
}
```

### 事件标识符常量定义

建议在代码中使用常量而非字符串字面量：

```typescript
// events/constants.ts
export const Events = {
    GAME: {
        DAY_CHANGED: 'game:day_changed',
        SEASON_CHANGED: 'game:season_changed',
    },
    INVENTORY: {
        ITEM_ADDED: 'inventory:item_added',
        ITEM_REMOVED: 'inventory:item_removed',
    },
    CRAFT: {
        COMPLETED: 'craft:completed',
        STARTED: 'craft:started',
    },
    FESTIVAL: {
        STARTED: 'festival:started',
        PREPARATION_STARTED: 'festival:preparation_started',
        CELEBRATION_STARTED: 'festival:celebration_started',
        ENDED: 'festival:ended',
    },
    VILLAGER: {
        FRIENDSHIP_CHANGED: 'villager:friendship_changed',
        MET: 'villager:met',
    },
    STAMINA: {
        CHANGED: 'stamina:changed',
        EXHAUSTED: 'stamina:exhausted',
    },
    QUEST: {
        STARTED: 'quest:started',
        COMPLETED: 'quest:completed',
    },
    SAVE: {
        REQUESTED: 'save:requested',
        COMPLETED: 'save:completed',
    },
    UI: {
        BUTTON_CLICKED: 'ui:button_clicked',
        POPUP_OPENED: 'ui:popup_opened',
        POPUP_CLOSED: 'ui:popup_closed',
    },
    // ... 更多事件常量
} as const;
```
