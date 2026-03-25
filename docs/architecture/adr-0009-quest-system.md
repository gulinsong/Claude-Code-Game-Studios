# ADR-0009: 任务系统 (Quest System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要为目标引导系统，让玩家有清晰的短期和中期目标。任务系统需要支持多种任务类型（主线、村民请求、日常、节日），并与背包系统、对话系统、节日系统等深度集成。

### Constraints
- **数据驱动**: 任务定义必须来自外部配置，不能硬编码
- **可扩展性**: 新任务类型应易于添加
- **存档支持**: 任务进度必须可序列化
- **事件集成**: 任务完成/进度变化需要通知其他系统

### Requirements
- 支持多种任务类型（主线、村民请求、日常、节日）
- 支持多种目标类型（收集、制作、对话、送礼、访问、完成节日）
- 支持任务前置依赖（解锁条件）
- 支持多种奖励类型（物品、好感度、食谱、区域解锁）
- 任务状态机：锁定 → 可接受 → 进行中 → 已完成 → 已领取

## Decision

采用**状态机 + 目标追踪器**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      QuestSystem                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ QuestRegistry│  │ ActiveQuests│  │ ObjectiveTrackers       │ │
│  │ (所有任务定义)│  │ (进行中任务)│  │ (目标进度追踪)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     EventSystem Integration                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ item:collected → 更新收集目标                              │  │
│  │ item:crafted → 更新制作目标                                │  │
│  │ dialogue:ended → 更新对话目标                              │  │
│  │ festival:completed → 更新节日目标                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 状态机

```
LOCKED ──(前置完成)──▶ AVAILABLE ──(接受)──▶ IN_PROGRESS
                                              │
                      ┌────────────────────────┼────────────────────────┐
                      │                        │                        │
                      ▼                        ▼                        ▼
                  COMPLETED ◀─(所有目标达成)──  │                    FAILED
                      │                    (超时)                    │
                      ▼                        │                        │
                  CLAIMED ◀─(领取奖励)─────────┘                        │
                                                                        │
                                           (重新开始，如适用)────────────┘
```

### Key Interfaces

```typescript
/**
 * 任务状态
 */
enum QuestState {
    LOCKED = 'LOCKED',         // 锁定（前置未完成）
    AVAILABLE = 'AVAILABLE',   // 可接受
    IN_PROGRESS = 'IN_PROGRESS', // 进行中
    COMPLETED = 'COMPLETED',   // 已完成（待领奖）
    CLAIMED = 'CLAIMED',       // 已领取
    FAILED = 'FAILED'          // 失败（超时）
}

/**
 * 目标类型
 */
enum ObjectiveType {
    COLLECT = 'COLLECT',       // 收集物品
    CRAFT = 'CRAFT',           // 制作物品
    TALK = 'TALK',             // 与NPC对话
    GIVE_ITEM = 'GIVE_ITEM',   // 送礼
    VISIT = 'VISIT',           // 访问地点
    COMPLETE_FESTIVAL = 'COMPLETE_FESTIVAL' // 完成节日
}

/**
 * 任务定义（数据驱动）
 */
interface QuestDefinition {
    id: string;
    type: QuestType;
    title: string;
    description: string;
    prerequisites: string[];    // 前置任务ID
    objectives: Objective[];
    rewards: Reward[];
    timeLimit?: number;         // 可选：时间限制（游戏内天数）
    repeatable?: boolean;       // 可选：是否可重复
}
```

### 事件集成

```typescript
const QuestEvents = {
    ACCEPTED: 'quest:accepted',
    PROGRESS: 'quest:progress',
    COMPLETED: 'quest:completed',
    CLAIMED: 'quest:claimed',
    FAILED: 'quest:failed',
    UNLOCKED: 'quest:unlocked'
};
```

## Alternatives Considered

### 1. 简单任务列表
**方案**: 所有任务扁平存储，无状态机。

**优点**: 实现简单。

**缺点**:
- 无法处理任务解锁逻辑
- 无法支持任务超时
- 难以扩展新任务类型

**结论**: 不采用，功能不足。

### 2. 任务树结构
**方案**: 任务按树形结构组织，父任务完成解锁子任务。

**优点**: 适合线性剧情。

**缺点**:
- 不适合多分支任务
- 日常任务无法纳入树结构

**结论**: 不采用，状态机更灵活。

## Consequences

### Positive
- **清晰的任务生命周期**: 状态机明确定义每个阶段
- **高度可扩展**: 新目标类型和奖励类型易于添加
- **数据驱动**: 任务定义完全外部化
- **事件驱动**: 与其他系统松耦合

### Negative
- **复杂度**: 状态机增加了实现复杂度
- **配置量**: 每个任务需要详细配置

### Risks
- **任务配置错误**: 需要验证工具确保任务定义有效
- **存档兼容性**: 任务结构变化可能影响旧存档

## Implementation Notes

### 数据存储

```typescript
// 存档数据结构
interface QuestSaveData {
    activeQuests: {
        questId: string;
        acceptedTime: number;
        objectiveProgress: Record<string, number>;
    }[];
    completedQuests: string[];
    claimedQuests: string[];
}
```

### 目标追踪器注册

```typescript
class QuestSystem {
    private objectiveTrackers: Map<ObjectiveType, ObjectiveTracker>;

    registerTracker(type: ObjectiveType, tracker: ObjectiveTracker): void {
        this.objectiveTrackers.set(type, tracker);
    }
}
```

## Related Systems

- **EventSystem**: 任务事件发布/订阅
- **BackpackSystem**: 收集/制作目标检测
- **DialogueSystem**: 对话目标检测
- **VillagerSystem**: 好感度奖励发放
- **FestivalSystem**: 节日任务触发
