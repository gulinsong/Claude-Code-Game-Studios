# ADR-0010: 对话系统 (Dialogue System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要玩家与 NPC 之间的对话交互系统。对话内容需要支持分支选择、条件触发、变量插值，并能触发效果（好感度变化、物品赠送、任务触发等）。

### Constraints
- **数据驱动**: 对话内容必须来自外部配置
- **可本地化**: 文本需要支持多语言
- **条件丰富**: 需要支持多种触发条件
- **效果多样**: 对话结果需要能触发多种游戏效果

### Requirements
- 支持分支对话（玩家选择）
- 支持条件触发（好感度、时间、季节、任务完成等）
- 支持变量插值（玩家名、NPC名、物品名等）
- 支持对话效果（好感度变化、物品赠送、任务触发）
- 支持对话历史记录（可选）

## Decision

采用**节点图 + 条件效果系统**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      DialogueSystem                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ DialogueDB  │  │ DialogueState│  │ ConditionEvaluator      │ │
│  │ (对话数据库) │  │ (当前对话状态)│  │ (条件评估器)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ EffectExecutor (效果执行器)                              │   │
│  │ - CHANGE_FRIENDSHIP → VillagerSystem                     │   │
│  │ - GIVE_ITEM → BackpackSystem                             │   │
│  │ - UNLOCK_RECIPE → RecipeSystem                           │   │
│  │ - START_QUEST → QuestSystem                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 对话节点结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Dialogue Node                              │
├─────────────────────────────────────────────────────────────────┤
│  nodeId: "npc_li_mid_autumn_01"                                 │
│  speaker: NPC                                                   │
│  text: "中秋快到了，你准备好月饼了吗？"                           │
├─────────────────────────────────────────────────────────────────┤
│  choices:                                                       │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ A: "准备好了！"                                          │ │
│    │    condition: { type: ITEM_OWNED, itemId: "mooncake" }   │ │
│    │    effects: [CHANGE_FRIENDSHIP +10]                      │ │
│    │    nextNodeId: "npc_li_mid_autumn_02a"                   │ │
│    └─────────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ B: "还没有，正在准备"                                     │ │
│    │    condition: null (always available)                    │ │
│    │    effects: []                                           │ │
│    │    nextNodeId: "npc_li_mid_autumn_02b"                   │ │
│    └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
/**
 * 说话者
 */
enum Speaker {
    NPC = 'NPC',
    PLAYER = 'PLAYER'
}

/**
 * 触发条件类型
 */
enum TriggerType {
    ALWAYS = 'ALWAYS',
    FIRST_MEET = 'FIRST_MEET',
    FRIENDSHIP_LEVEL = 'FRIENDSHIP_LEVEL',
    QUEST_COMPLETE = 'QUEST_COMPLETE',
    FESTIVAL_APPROACHING = 'FESTIVAL_APPROACHING',
    SEASON = 'SEASON',
    TIME_PERIOD = 'TIME_PERIOD',
    ITEM_OWNED = 'ITEM_OWNED',
    FLAG_SET = 'FLAG_SET'
}

/**
 * 效果类型
 */
enum EffectType {
    CHANGE_FRIENDSHIP = 'CHANGE_FRIENDSHIP',
    SET_FLAG = 'SET_FLAG',
    GIVE_ITEM = 'GIVE_ITEM',
    UNLOCK_RECIPE = 'UNLOCK_RECIPE',
    START_QUEST = 'START_QUEST',
    COMPLETE_QUEST = 'COMPLETE_QUEST'
}

/**
 * 对话节点
 */
interface DialogueNode {
    nodeId: string;
    speaker: Speaker;
    text: string;
    choices?: DialogueChoice[];
    effects?: DialogueEffect[];
    autoNext?: string;  // 自动跳转（无选择时）
}

/**
 * 对话选项
 */
interface DialogueChoice {
    text: string;
    condition?: Condition;
    effects: DialogueEffect[];
    nextNodeId: string;
}
```

### 状态机

```
IDLE ──(开始对话)──▶ PLAYING ──(显示选项)──▶ CHOOSING
                        │                        │
                        │                        │
                        ▼                        ▼
                    ENDED ◀─(对话结束)────── (选择选项)
```

## Alternatives Considered

### 1. 线性对话脚本
**方案**: 对话按顺序播放，无分支。

**优点**: 实现简单。

**缺点**:
- 无玩家选择，缺乏互动性
- 无法根据条件显示不同内容

**结论**: 不采用，功能不足。

### 2. 嵌套条件语句
**方案**: 在代码中硬编码条件判断。

**优点**: 直观。

**缺点**:
- 无法数据驱动
- 难以修改对话内容
- 无法支持设计师编辑

**结论**: 不采用，违反数据驱动原则。

## Consequences

### Positive
- **高度灵活**: 节点图支持任意复杂度的对话流程
- **数据驱动**: 对话内容完全外部化，便于编辑
- **条件丰富**: 支持多种触发条件组合
- **效果多样**: 对话可触发任意游戏效果

### Negative
- **配置复杂**: 对话配置需要精心设计
- **调试困难**: 分支对话流程不易追踪

### Risks
- **对话死锁**: 节点配置错误可能导致无法结束对话
- **条件冲突**: 多个条件同时满足时的优先级问题

## Implementation Notes

### 条件评估器

```typescript
class ConditionEvaluator {
    evaluate(condition: Condition, context: DialogueContext): boolean {
        switch (condition.type) {
            case TriggerType.FRIENDSHIP_LEVEL:
                return this.villagerSystem.getFriendship(context.npcId)
                    >= condition.params.level;
            case TriggerType.ITEM_OWNED:
                return this.backpackSystem.hasItem(
                    condition.params.itemId,
                    condition.params.amount || 1
                );
            // ... 其他条件类型
        }
    }
}
```

### 效果执行器

```typescript
class EffectExecutor {
    execute(effect: DialogueEffect, context: DialogueContext): void {
        switch (effect.type) {
            case EffectType.CHANGE_FRIENDSHIP:
                this.villagerSystem.changeFriendship(
                    context.npcId,
                    effect.params.amount
                );
                break;
            case EffectType.GIVE_ITEM:
                this.backpackSystem.addItem(
                    effect.params.itemId,
                    effect.params.amount
                );
                break;
            // ... 其他效果类型
        }
    }
}
```

### 变量插值

```typescript
// 支持的变量
// {player_name} - 玩家名
// {npc_name} - NPC名
// {item_name:id} - 物品名
// {season} - 当前季节

function interpolateText(text: string, context: DialogueContext): string {
    return text
        .replace('{player_name}', context.playerName)
        .replace('{npc_name}', context.npcName)
        .replace(/{item_name:(\w+)}/g, (_, id) =>
            this.materialSystem.getItemName(id));
}
```

## Related Systems

- **EventSystem**: 对话事件发布
- **VillagerSystem**: 好感度条件/效果
- **BackpackSystem**: 物品条件/效果
- **QuestSystem**: 任务触发效果
- **TimeSystem**: 时间/季节条件
- **FestivalSystem**: 节日条件
