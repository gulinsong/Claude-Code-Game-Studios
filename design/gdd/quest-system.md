# 任务系统 (Quest System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 引导 — 给玩家短期目标和方向感

## Overview

任务系统是《岁时记》的**目标引导系统**，为玩家提供短期和中期目标。任务分为日常任务、主线任务、村民请求三类。完成任务获得奖励和好感度，推动游戏进程。

任务采用**目标驱动 + 自动追踪**模式——任务目标自动追踪进度，玩家只需专注于游玩。任务提示清晰但不强制，玩家可以选择性地完成任务。

玩家**通过对话和界面与任务系统交互**——NPC发布任务，界面显示任务列表和进度，完成后领取奖励。

此系统主要支撑**游戏引导**——让玩家始终有目标感，但不过度强制。

## Player Fantasy

**直接体验**：
- **方向感**：知道接下来该做什么
- **成就感**：完成任务获得奖励
- **故事感**：通过任务了解NPC和村庄的故事
- **选择感**：可以选择做或不做，按自己的节奏游玩

**任务类型情感设计**：

| Quest Type | Player Feeling | Example |
|------------|---------------|---------|
| **主线任务** | 推进剧情，期待后续 | "筹备中秋节的月饼" |
| **村民请求** | 帮助他人，建立关系 | "李奶奶需要竹叶包粽子" |
| **日常任务** | 每日小目标，稳定节奏 | "采集5个竹叶" |
| **节日任务** | 节日氛围，共同参与 | "为中秋灯会准备灯笼" |

## Detailed Design

### Core Rules

1. **任务核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务唯一ID |
| `title` | string | 任务标题 |
| `description` | string | 任务描述 |
| `type` | enum | 任务类型 |
| `objectives` | Objective[] | 目标列表 |
| `rewards` | Reward[] | 奖励列表 |
| `prerequisites` | string[] | 前置任务ID |
| `timeLimit` | int | 时间限制（0=无限制） |
| `npcId` | string | 发布任务的NPC |

2. **目标结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | enum | 目标类型 |
| `targetId` | string | 目标ID（物品ID/NPC ID等） |
| `requiredAmount` | int | 所需数量 |
| `currentAmount` | int | 当前进度 |

3. **目标类型**

| 类型 | 说明 | 示例 |
|------|------|------|
| `COLLECT` | 收集物品 | 收集5个竹叶 |
| `CRAFT` | 制作物品 | 制作3个月饼 |
| `TALK` | 与NPC对话 | 与李奶奶对话 |
| `GIVE_ITEM` | 送给NPC物品 | 送李奶奶一束花 |
| `VISIT` | 访问地点 | 访问竹林 |
| `COMPLETE_FESTIVAL` | 完成节日 | 完成中秋节 |

4. **奖励结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | enum | 奖励类型 |
| `itemId` | string | 物品ID（物品奖励） |
| `amount` | int | 数量 |
| `npcId` | string | NPC ID（好感度奖励） |
| `friendshipDelta` | int | 好感度变化 |

5. **奖励类型**

| 类型 | 说明 |
|------|------|
| `ITEM` | 物品奖励 |
| `FRIENDSHIP` | 好感度奖励 |
| `RECIPE` | 食谱解锁 |
| `AREA_UNLOCK` | 区域解锁 |

6. **任务状态流转**

```
Locked → Available → InProgress → Completed → Claimed
           ↑            ↓
           └─── Failed ←┘ (时间限制任务)
```

### States and Transitions

**单个任务状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Locked** | 默认 | 满足前置条件 | 任务不可见或显示为"???" |
| **Available** | 满足前置条件 | 玩家接受 | 可接受任务 |
| **InProgress** | 玩家接受 | 完成所有目标/超时 | 追踪进度 |
| **Completed** | 完成所有目标 | 玩家领取奖励 | 等待领取奖励 |
| **Failed** | 时间限制任务超时 | - | 任务失败，可重试或放弃 |
| **Claimed** | 玩家领取奖励 | - | 任务完成，不可重复 |

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **事件系统** | 监听/发布 | 任务 ↔ 事件 | 监听游戏事件更新进度，发布任务事件 |
| **背包系统** | 检查/奖励 | 任务 ↔ 背包 | 检查收集目标，发放物品奖励 |
| **对话系统** | 触发任务 | 对话 → 任务 | 对话可触发任务 |
| **村民关系系统** | 好感度奖励 | 任务 → 村民 | 完成任务增加好感度 |
| **食谱系统** | 解锁奖励 | 任务 → 食谱 | 任务奖励解锁食谱 |
| **时间系统** | 时间限制 | 任务 → 时间 | 检查任务时间限制 |
| **UI框架系统** | 提供数据 | 任务 → UI | 显示任务列表和进度 |

**事件监听**：

| 事件ID | 处理 |
|--------|------|
| `inventory:item_added` | 更新COLLECT目标 |
| `craft:completed` | 更新CRAFT目标 |
| `dialog:completed` | 更新TALK目标 |
| `gathering:completed` | 更新VISIT目标 |

**事件发布**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `quest:started` | `{ questId, questTitle }` | 任务开始 |
| `quest:progress` | `{ questId, objectiveIndex, current, required }` | 目标进度更新 |
| `quest:completed` | `{ questId, questTitle }` | 任务完成 |
| `quest:claimed` | `{ questId, rewards }` | 奖励领取 |
| `quest:failed` | `{ questId, reason }` | 任务失败 |

## Formulas

### 1. 任务进度计算

```
progress = currentAmount / requiredAmount
progressPercent = floor(progress × 100)
```

### 2. 任务完成判断

```
isCompleted = all(objectives satisfies currentAmount >= requiredAmount)
```

### 3. 时间限制检查

```
if (timeLimit > 0):
    remainingTime = deadline - currentTime
    if (remainingTime <= 0):
        questState = Failed
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| timeLimit | int | 0-∞ | config | 时间限制（秒），0=无限制 |
| deadline | timestamp | - | runtime | 截止时间 |
| remainingTime | int | 0-∞ | computed | 剩余时间 |

**Expected output range**:
- 同时进行任务数：1-10个
- 日常任务数：3个/天
- 主线任务时长：1-3天

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 物品已足够再接受收集任务 | 自动完成目标 | 不强制再次收集 |
| 任务奖励物品背包已满 | 溢出丢失，显示提示 | 温和提醒 |
| 前置任务未完成 | 任务显示为锁定状态 | 清晰的解锁路径 |
| 时间限制任务中途下线 | 计入离线时间 | 公平处理 |
| 放弃任务 | 可重新接受（重置进度） | 允许后悔 |
| 同时满足多个任务目标 | 各任务独立计数 | 不冲突 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **事件系统** | Hard | `on(eventId, callback)`, `emit()` | ✅ Designed |
| **背包系统** | Hard | `hasItem()`, `addItem()` | ✅ Designed |
| **对话系统** | Soft | 任务触发对话 | ✅ Designed |
| **时间系统** | Soft | `getCurrentTime()` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **村民关系系统** | Hard | `changeFriendship()` | Not Started |
| **节日筹备系统** | Hard | 节日任务 | Not Started |
| **食谱系统** | Soft | `unlockRecipe()` | ✅ Designed |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **同时任务上限** | 10 | 5-20 | 更多的并行目标 | 更专注的目标 |
| **日常任务数量** | 3 | 1-5 | 更多的每日内容 | 更少的日常负担 |
| **日常任务奖励** | 10-30好感 | 5-50 | 更高的日常动力 | 更低的日常压力 |
| **主线任务时长** | 1-3天 | 0.5-7天 | 更长的剧情体验 | 更快的剧情推进 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **任务列表** | 侧边栏或独立界面 |
| **进度条** | 显示目标完成度 |
| **任务标记** | NPC头顶显示任务可用/进行中 |
| **完成动画** | 任务完成时的庆祝效果 |
| **奖励展示** | 显示获得的奖励 |

### 任务标记图标

| 状态 | 图标 |
|------|------|
| 可接受 | 黄色"!" |
| 进行中 | 灰色"..." |
| 可领取 | 黄色"?" |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `quest_start` | 接受任务 |
| `quest_progress` | 目标进度更新 |
| `quest_complete` | 任务完成 |
| `quest_claim` | 领取奖励 |

## UI Requirements

### 任务列表界面

```
┌─────────────────────────────────┐
│           任 务 列 表           │
├─────────────────────────────────┤
│  [主线] [村民] [日常] [已完成]  │
├─────────────────────────────────┤
│  ○ 筹备中秋月饼                 │
│    收集面粉 2/3                 │
│    ████████░░ 67%               │
│                                 │
│  ○ 李奶奶的请求                 │
│    采集竹叶 3/5                 │
│    ██████░░░░ 60%               │
│                                 │
│  ✓ 每日采集 (可领取)            │
│    采集任意材料 5/5             │
│    ████████████ 100%            │
└─────────────────────────────────┘
```

### 任务详情界面

```
┌─────────────────────────────────┐
│  筹备中秋月饼                    │
│  ────────────────────────       │
│  中秋节快到了，村里需要准备      │
│  足够的月饼来庆祝...             │
│                                 │
│  【目标】                       │
│  ✓ 与村长对话                   │
│  ○ 收集面粉 x3 (2/3)            │
│  ○ 制作月饼 x5 (0/5)            │
│                                 │
│  【奖励】                       │
│  🪙 金币 x50                    │
│  💕 村长好感度 +10              │
│  📜 食谱：五仁月饼              │
│                                 │
│  [追踪任务]        [放弃]       │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 任务正确触发和接受
- [ ] 目标进度正确追踪
- [ ] 任务完成判断正确
- [ ] 奖励正确发放
- [ ] 前置任务检查正确
- [ ] 时间限制任务正确处理

**事件测试**:
- [ ] 任务开始时发布 `quest:started`
- [ ] 进度更新时发布 `quest:progress`
- [ ] 任务完成时发布 `quest:completed`

**UI测试**:
- [ ] 任务列表正确显示
- [ ] 进度条准确
- [ ] 任务标记正确

**性能测试**:
- [ ] 事件处理 < 5ms
- [ ] 内存占用 < 20KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否支持任务链？ | 设计者 | MVP阶段 | 是，通过prerequisites实现 |
| 日常任务是否可跳过？ | 设计者 | MVP阶段 | 是，次日刷新 |

## Implementation Notes

```typescript
enum QuestType {
    MAIN = 'MAIN',
    VILLAGER = 'VILLAGER',
    DAILY = 'DAILY',
    FESTIVAL = 'FESTIVAL'
}

enum QuestState {
    LOCKED = 'LOCKED',
    AVAILABLE = 'AVAILABLE',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CLAIMED = 'CLAIMED'
}

enum ObjectiveType {
    COLLECT = 'COLLECT',
    CRAFT = 'CRAFT',
    TALK = 'TALK',
    GIVE_ITEM = 'GIVE_ITEM',
    VISIT = 'VISIT',
    COMPLETE_FESTIVAL = 'COMPLETE_FESTIVAL'
}

interface Objective {
    type: ObjectiveType;
    targetId: string;
    requiredAmount: number;
    currentAmount: number;
}

interface Reward {
    type: 'ITEM' | 'FRIENDSHIP' | 'RECIPE' | 'AREA_UNLOCK';
    itemId?: string;
    amount: number;
    npcId?: string;
}

interface Quest {
    id: string;
    title: string;
    description: string;
    type: QuestType;
    objectives: Objective[];
    rewards: Reward[];
    prerequisites: string[];
    timeLimit: number;
    npcId: string;
}

interface QuestProgress {
    questId: string;
    state: QuestState;
    objectives: Objective[];
    startTime: number;
    deadline?: number;
}

class QuestManager {
    private quests: Map<string, Quest>;
    private progress: Map<string, QuestProgress>;
    private eventSystem: EventSystem;
    private backpack: BackpackManager;

    acceptQuest(questId: string): boolean;
    abandonQuest(questId: string): void;
    updateObjective(type: ObjectiveType, targetId: string, amount: number): void;
    completeQuest(questId: string): boolean;
    claimReward(questId: string): Reward[];
    getActiveQuests(): Quest[];
    getAvailableQuests(): Quest[];
}
```