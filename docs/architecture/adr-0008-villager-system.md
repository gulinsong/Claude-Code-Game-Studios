# ADR-0008: 村民关系系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》中玩家与 NPC 村民建立情感纽带是核心体验。需要一个村民关系系统来：
1. 管理每个 NPC 的好感度（0-100）
2. 支持送礼、对话、任务等好感度来源
3. 根据好感度解锁不同的关系状态和对话
4. 为每个 NPC 定义性格和偏好

### Constraints
- **设计要求**: 5 级好感度系统，每级 20 点
- **多样性**: 不同 NPC 有不同性格和偏好
- **序列化**: 需要保存好感度和互动历史
- **性能**: 查询好感度需要 O(1)

### Requirements
- 支持好感度增减和查询
- 支持送礼反应（喜欢/普通/不喜欢）
- 支持关系状态判定（未见面/已认识/朋友/好友）
- 支持 NPC 性格和偏好配置
- 支持每日首次对话奖励

## Decision

采用**Map 存储 + 性格偏好系统** 的村民关系架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VillagerSystem (单例)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  villagers: Map<string, VillagerDefinition>                 │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ lihua: { name, personality, likes, dislikes, ... } │    │   │
│  │  │ zhangwei: { name, personality, likes, ... }        │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  relationships: Map<string, RelationshipState>              │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │ lihua: { friendship: 45, lastTalkDay: 5, ... }     │    │   │
│  │  │ zhangwei: { friendship: 12, lastTalkDay: 3, ... }  │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  changeFriendship(npcId, delta) ──► 更新好感度 ──► 发布事件       │
│  giveGift(npcId, itemId) ──► 计算反应 ──► 增加好感度              │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 好感度系统

```typescript
// 好感度范围: 0-100
// 关系等级: 5 级，每级 20 点

enum RelationshipStatus {
    UNMET,         // 未见面 - 0 点
    ACQUAINTED,    // 已认识 - 1-19 点
    FRIEND,        // 朋友 - 20-59 点 (等级 2-3)
    CLOSE_FRIEND   // 好友 - 60-100 点 (等级 4-5)
}

// 好感度 → 关系等级
getRelationshipLevel(friendship: number): number {
    if (friendship >= 80) return 5;
    if (friendship >= 60) return 4;
    if (friendship >= 40) return 3;
    if (friendship >= 20) return 2;
    return 1;
}
```

**好感度来源**:
| 来源 | 数值 | 条件 |
|------|------|------|
| 送喜欢的礼物 | +10 | 物品在 likes 列表 |
| 送普通礼物 | +5 | 物品不在 likes/dislikes |
| 送不喜欢的礼物 | -5 | 物品在 dislikes 列表 |
| 每日首次对话 | +2 | 当天首次对话 |
| 完成相关任务 | +5~15 | 任务奖励配置 |
| 节日互动 | +3~10 | 节日活动 |

#### 2. NPC 性格系统

```typescript
enum Personality {
    GENTLE,       // 温和 - 友善、耐心
    ENTHUSIASTIC, // 热情 - 开朗、活泼
    INTROVERTED,  // 内向 - 害羞、细腻
    TRADITIONAL,  // 古板 - 严肃、传统
    PLAYFUL       // 顽皮 - 调皮、爱玩
}
```

**性格影响**:
- 对话风格和表情
- 礼物反应强度（热情型反应更夸张）
- 好感度解锁的对话内容

#### 3. 送礼反应系统

```typescript
enum GiftReaction {
    LIKE,    // 喜欢 - 好感度 +10，特殊对话
    NORMAL,  // 普通 - 好感度 +5，标准对话
    DISLIKE  // 不喜欢 - 好感度 -5，负面反应
}

getGiftReaction(npcId: string, itemId: string): GiftReaction {
    const npc = this.villagers.get(npcId);
    if (npc.likes.includes(itemId)) return GiftReaction.LIKE;
    if (npc.dislikes.includes(itemId)) return GiftReaction.DISLIKE;
    return GiftReaction.NORMAL;
}
```

#### 4. 村民定义结构

```typescript
interface Villager {
    id: string;              // 唯一 ID
    name: string;            // 显示名称
    avatar: string;          // 头像资源路径
    personality: Personality;// 性格类型
    likes: string[];         // 喜欢的物品 ID
    dislikes: string[];      // 不喜欢的物品 ID
    schedule: Schedule[];    // 行程安排
    location: string;        // 当前位置
    dialogues: string[];     // 对话 ID 列表
    quests: string[];        // 关联任务 ID
    lore: string;            // 背景故事
}
```

#### 5. 关系状态结构

```typescript
interface RelationshipState {
    npcId: string;
    friendship: number;        // 好感度 0-100
    status: RelationshipStatus;
    lastTalkDay: number;       // 上次对话游戏日
    talkedToday: boolean;      // 今日是否已对话
    giftsReceived: string[];   // 收到的礼物 ID
    unlockedDialogues: string[];// 已解锁的对话
}
```

### Key Interfaces

```typescript
interface IVillagerSystem {
    // 村民管理
    registerVillager(villager: Villager): void;
    getVillager(npcId: string): Villager | null;
    getAllVillagers(): Villager[];

    // 好感度系统
    getFriendship(npcId: string): number;
    getRelationshipStatus(npcId: string): RelationshipStatus;
    getRelationshipLevel(npcId: string): number;
    changeFriendship(npcId: string, delta: number): boolean;

    // 送礼系统
    giveGift(npcId: string, itemId: string): GiftResult;
    getGiftReaction(npcId: string, itemId: string): GiftReaction;

    // 对话系统
    canTalk(npcId: string): boolean;
    recordTalk(npcId: string): void;
    hasTalkedToday(npcId: string): boolean;

    // 存档
    exportData(): VillagerSystemData;
    importData(data: VillagerSystemData): void;
}
```

## Alternatives Considered

### Alternative 1: 单一好感度值
- **Description**: 只存储好感度数字，无关系等级
- **Pros**:
  - 实现简单
- **Cons**:
  - 玩家难以感知进度
  - 无法设计等级解锁内容
- **Rejection Reason**: 设计要求 5 级关系系统，解锁不同内容

### Alternative 2: 所有 NPC 共用偏好
- **Description**: 所有 NPC 喜欢相同的物品类型
- **Pros**:
  - 配置简单
- **Cons**:
  - NPC 缺乏个性
  - 送礼策略单一
- **Rejection Reason**: 设计要求每个 NPC 有独特性格

### Alternative 3: 无好感度上限
- **Description**: 好感度可以无限增长
- **Pros**:
  - 无天花板
- **Cons**:
  - 难以平衡奖励
  - 老玩家优势过大
- **Rejection Reason**: 0-100 范围便于设计和平衡

### Alternative 4: 实时好感度衰减
- **Description**: 长时间不互动好感度下降
- **Pros**:
  - 鼓励频繁互动
- **Cons**:
  - 玩家焦虑
  - 不符合"治愈系"定位
- **Rejection Reason**: 游戏不应惩罚玩家的休息时间

## Consequences

### Positive
- 个性鲜明：每个 NPC 有独特偏好
- 进度感：好感度等级让玩家有成长感
- 策略性：送礼需要了解 NPC 偏好
- 数据驱动：添加新 NPC 只需配置

### Negative
- 配置量：每个 NPC 需要详细的偏好配置
- 平衡难度：好感度来源需要仔细调整

### Risks
- **送礼策略固化**: 玩家找到最优礼物后重复送
  - *缓解*: 同一礼物多次赠送效果递减
- **好感度溢出**: 达到 100 后失去动力
  - *缓解*: 高好感度解锁特殊对话和事件
- **NPC 数量过多**: 玩家难以记住所有偏好
  - *缓解*: MVP 阶段控制 NPC 数量（5-8 个）

## Performance Implications
- **CPU**: 好感度查询 O(1) Map 访问
- **Memory**: NPC 数据 < 20KB（10 个 NPC）
- **Storage**: 关系状态 < 5KB

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 好感度增减正确
- [x] 关系等级判定正确
- [x] 送礼反应正确
- [x] 每日对话奖励正确
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [ADR-0004: 背包系统架构](adr-0004-backpack-system.md)
- [村民关系系统设计文档](../../design/gdd/villager-system.md)
