# 体力系统 (Stamina System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 资源管理 — 控制游戏节奏，鼓励健康游玩

## Overview

体力系统是《岁时记》的**资源调节器**，通过体力消耗控制玩家的单次游玩时长。采集、制作等活动消耗体力，体力耗尽后玩家可以选择等待恢复、使用道具或结束本次游玩。

体力采用**自然恢复 + 道具补充**模式——体力每 3 分钟恢复 1 点，使用食物或内购道具可立即恢复。初始体力上限为 100 点，可通过游戏进度扩展。

玩家**直接感知体力系统**——体力条显示在主界面，体力不足时操作会被提示，体力耗尽时会有温和的提醒。体力系统是"健康游玩"的保障，防止过度沉迷。

此系统主要支撑**游戏节奏控制**——让玩家在有限体力内做出选择，每次退出都有"完成了什么"的满足感。

## Player Fantasy

**直接体验**：
- **规划感**：体力有限，需要规划先做什么，后做什么
- **满足感**：用完体力时，感觉"今天完成了很多事"
- **期待感**：期待体力恢复后继续游玩
- **被关怀感**：游戏提醒休息，而不是无限制地消耗时间

**体力情感设计**：

| Stamina Level | Player Feeling |
|---------------|---------------|
| **满 (80-100%)** | 精力充沛，计划今天要做什么 |
| **充足 (50-80%)** | 继续游玩，选择想做的事 |
| **偏低 (20-50%)** | 开始珍惜体力，优先重要的事 |
| **不足 (0-20%)** | 差不多了，考虑收尾或使用道具 |
| **耗尽 (0%)** | 今天辛苦了，休息一下吧 |

**设计原则**：
- 不让体力成为焦虑源，而是"节奏调节器"
- 正常游玩 15-20 分钟消耗完体力，符合碎片化设计
- 等待恢复是合理的，不是强迫内购

## Detailed Design

### Core Rules

1. **体力核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentStamina` | int | 当前体力值 |
| `maxStamina` | int | 体力上限（初始 100） |
| `lastUpdateTime` | timestamp | 上次更新时间 |

2. **体力消耗规则**

| 活动 | 消耗体力 | 说明 |
|------|---------|------|
| 采集（普通） | 5 | 采集普通材料 |
| 采集（稀有） | 8 | 采集稀有材料 |
| 制作手工艺 | 10 | 完成一次制作 |
| 送礼 | 0 | 不消耗体力 |
| 对话 | 0 | 不消耗体力 |
| 探索新区域 | 15 | 解锁新地点 |

3. **体力恢复规则**

| 恢复方式 | 恢复量 | 说明 |
|---------|--------|------|
| 自然恢复 | 1 点/3 分钟 | 离线也恢复 |
| 食物恢复 | 10-50 点 | 消耗背包中的食物 |
| 内购道具 | 100 点 | 完全恢复 |
| 每日重置 | 至 100 点 | 每日首次登录恢复至满 |

4. **体力不足处理**
- 体力不足时，操作被阻止
- 显示提示："体力不足，需要 X 点体力"
- 提供选项：使用道具 / 等待恢复 / 取消

### States and Transitions

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Full** | currentStamina = maxStamina | 消耗体力 | 体力满，无法继续恢复 |
| **Normal** | 20 < currentStamina < maxStamina | 消耗或恢复 | 正常状态，可执行所有操作 |
| **Low** | 0 < currentStamina <= 20 | 恢复或消耗 | 低体力警告，部分操作受限 |
| **Exhausted** | currentStamina = 0 | 恢复体力 | 无法执行消耗体力的操作 |

**状态转换图**：
```
Full ←→ Normal ←→ Low ←→ Exhausted
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **配置系统** | 读取配置 | 配置 → 体力 | 获取体力参数（上限、恢复速率） |
| **事件系统** | 发布事件 | 体力 → 事件 | 发布体力变化事件 |
| **背包系统** | 消耗物品 | 体力 → 背包 | 使用食物恢复体力时消耗物品 |
| **时间系统** | 时间驱动 | 时间 → 体力 | 每日重置、自然恢复 |
| **采集系统** | 消耗体力 | 采集 → 体力 | 采集时扣除体力 |
| **手工艺系统** | 消耗体力 | 手工艺 → 体力 | 制作时扣除体力 |
| **内购系统** | 恢复体力 | 内购 → 体力 | 购买体力道具 |
| **UI框架系统** | 提供数据 | 体力 → UI | 显示体力条 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `stamina:changed` | `{ old, new, delta }` | 体力变化 |
| `stamina:exhausted` | `{ }` | 体力耗尽 |
| `stamina:full` | `{ }` | 体力恢复至满 |
| `stamina:low` | `{ current }` | 体力低于 20% |
| `stamina:restored` | `{ amount, source }` | 通过道具恢复 |

## Formulas

### 1. 自然恢复计算

```
recoverableMinutes = floor((maxStamina - currentStamina) / recoveryRate)
realRecoverTime = recoverableMinutes * 3  // 3分钟恢复1点
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| recoveryRate | float | 1/3 | config | 每分钟恢复点数 |
| maxStamina | int | 100-150 | config | 体力上限 |
| currentStamina | int | 0-maxStamina | runtime | 当前体力 |

### 2. 离线恢复计算

```
offlineMinutes = (now - lastUpdateTime) / 60
recoveredStamina = min(floor(offlineMinutes / 3), maxStamina - currentStamina)
newStamina = currentStamina + recoveredStamina
```

### 3. 体力消耗

```
canPerform = currentStamina >= cost
if (canPerform) newStamina = currentStamina - cost
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| cost | int | 5-15 | activity | 活动消耗体力 |
| canPerform | boolean | true/false | computed | 是否可执行 |

**Expected output range**:
- 单次游玩时长：15-20 分钟（消耗完 100 体力）
- 完全恢复时间：5 小时（100 体力 / 20 点每小时）

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 体力为 0 时尝试操作 | 阻止操作，显示提示和恢复选项 | 温和引导，不强制 |
| 离线超过 5 小时 | 体力恢复至上限，不溢出 | 不浪费恢复时间 |
| 同时使用多个恢复道具 | 体力不超过上限，多余的浪费 | 简单处理，防止囤积 |
| 体力上限提升时当前体力不变 | 只提升上限，不恢复体力 | 不免费获得体力 |
| 每日重置时已满体力 | 不做任何事 | 避免浪费 |
| 体力恢复道具效果溢出 | 体力不超过上限 | 简单处理 |
| 负数体力消耗请求 | 拒绝，记录警告 | 无效输入 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **配置系统** | Hard | `getGlobalParam(key)` | ✅ Designed |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |
| **时间系统** | Hard | `isNextDay()` | ✅ Designed |
| **背包系统** | Soft | `hasItem()`, `removeItem()` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **采集系统** | Hard | `consumeStamina(amount)` | Not Started |
| **手工艺系统** | Hard | `consumeStamina(amount)` | Not Started |
| **内购系统** | Soft | `restoreStamina(amount)` | Not Started |
| **UI框架系统** | Soft | `getStamina()`, `getMaxStamina()` | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **初始体力上限** | 100 | 50-150 | 更长的单次游玩 | 更短的单次游玩 |
| **最大体力上限** | 150 | 100-200 | 更高的上限空间 | 更早达到上限 |
| **恢复间隔** | 3 分钟/点 | 1-5 分钟 | 更快的恢复 | 更慢的恢复 |
| **采集消耗** | 5-8 | 3-15 | 更快消耗体力 | 更慢消耗体力 |
| **制作消耗** | 10 | 5-20 | 更快消耗体力 | 更慢消耗体力 |
| **低体力阈值** | 20% | 10-30% | 更早的警告 | 更晚的警告 |

**参数交互**：
- `恢复间隔` × `体力上限` = 完全恢复时间
- 完全恢复时间应在 4-6 小时，符合健康游玩节奏
- 单次游玩消耗完体力应需 15-25 分钟

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **体力条** | 显示在主界面顶部，绿→黄→红渐变 |
| **体力数字** | 显示 "当前/上限" 格式 |
| **体力图标** | 闪电或心形图标 |
| **低体力警告** | 体力条闪烁红色 |
| **恢复动画** | 使用道具时体力条增长动画 |

### 颜色方案

| Stamina Level | 颜色 |
|---------------|------|
| 50-100% | #4CAF50 (绿) |
| 20-50% | #FFC107 (黄) |
| 0-20% | #F44336 (红) |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `stamina_consume` | 消耗体力 |
| `stamina_low` | 体力低于 20% |
| `stamina_exhausted` | 体力耗尽 |
| `stamina_restore` | 恢复体力 |

## UI Requirements

### 体力条组件

```
┌─────────────────────────────────┐
│  ⚡ ████████████░░░░░░  75/100  │
│      ~~~~~~~~~~~~~~~~~~~~~~~    │
│      约 2 小时后完全恢复         │
└─────────────────────────────────┘
```

### 体力不足弹窗

```
┌─────────────────────────────────┐
│          体力不足！              │
│                                 │
│   这次操作需要 10 点体力         │
│   当前体力：5 点                 │
│                                 │
│   [使用食物 (+30)]  [等待恢复]   │
│                                 │
│          [取消]                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] `consumeStamina(amount)` 正确扣除体力
- [ ] 体力不足时返回失败
- [ ] 自然恢复正确计算
- [ ] 离线恢复正确计算，不超过上限
- [ ] 每日重置正确触发
- [ ] 使用道具恢复体力正确

**事件测试**:
- [ ] 体力变化时发布 `stamina:changed`
- [ ] 体力耗尽时发布 `stamina:exhausted`
- [ ] 体力低于阈值时发布 `stamina:low`

**UI测试**:
- [ ] 体力条显示正确
- [ ] 颜色随体力变化
- [ ] 低体力警告动画

**性能测试**:
- [ ] 体力更新不卡顿
- [ ] 内存占用 < 1KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要体力溢出保护？ | 设计者 | MVP阶段 | 是，不超过上限 |
| 是否允许体力为负数后继续操作？ | 设计者 | MVP阶段 | 否，阻止操作 |

## Implementation Notes

```typescript
interface StaminaState {
    current: number;
    max: number;
    lastUpdateTime: number;
}

class StaminaManager {
    private state: StaminaState;
    private config: StaminaConfig;
    private eventSystem: EventSystem;

    consumeStamina(amount: number): { success: boolean; remaining: number };
    restoreStamina(amount: number, source: string): void;
    getCurrentStamina(): number;
    getMaxStamina(): number;
    getTimeToFull(): number;  // 返回完全恢复需要的分钟数
    updateOfflineRecovery(): void;
}
```