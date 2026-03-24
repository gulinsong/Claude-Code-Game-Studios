# 村民关系系统 (Villager Relationship System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 1: 人情味 — 与村民建立深厚的情谊

## Overview

村民关系系统是《岁时记》的**情感核心**，管理玩家与每个NPC之间的好感度、关系等级和互动历史。通过与村民对话、送礼、完成任务，玩家可以建立和深化关系，解锁更多对话、剧情和奖励。

关系采用**好感度累积 + 等级解锁**模式——好感度达到阈值后升级，解锁新的互动和剧情。每个村民有独特的性格、喜好和故事线。

玩家**直接与村民关系系统交互**——送礼、对话、完成任务都会影响好感度。关系深化是游戏的重要目标之一。

此系统主要支撑 **Pillar 1: 人情味** —— NPC不是任务发布器，而是有喜怒哀乐的朋友。

## Player Fantasy

**直接体验**：
- **被认识感**：村民记得玩家的行为，关系逐渐加深
- **惊喜感**：送礼时看到村民喜欢的反应
- **期待感**：想知道提升关系后会解锁什么
- **归属感**：成为村庄的一份子，与村民建立羁绊

**关系等级情感设计**：

| Level | Name | Player Feeling | Unlocks |
|-------|------|---------------|---------|
| 1 | 陌生人 | 初次见面，客套 | 基础对话 |
| 2 | 认识 | 开始熟悉，知道名字 | 日常对话 |
| 3 | 熟人 | 会主动打招呼 | 请求帮助 |
| 4 | 朋友 | 会分享心事 | 个人剧情 |
| 5 | 好友 | 互相信任，无话不谈 | 特殊礼物、称号 |

此系统主要支撑 **Pillar 1: 人情味** —— 让玩家真正关心村庄里的每一个人。

## Detailed Design

### Core Rules

1. **村民核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 村民唯一ID |
| `name` | string | 显示名称 |
| `avatar` | string | 头像资源路径 |
| `personality` | enum | 性格类型 |
| `likes` | string[] | 喜欢的物品ID列表 |
| `dislikes` | string[] | 不喜欢的物品ID列表 |
| `location` | string | 常驻地点 |
| `schedule` | Schedule[] | 行程安排 |

2. **关系状态**

| 属性 | 类型 | 说明 |
|------|------|------|
| `npcId` | string | 村民ID |
| `friendship` | int | 好感度 (0-100) |
| `level` | int | 关系等级 (1-5) |
| `giftsToday` | int | 今日已送礼物数 |
| `lastGiftDate` | int | 上次送礼日期 |
| `metDate` | int | 初次见面日期 |
| `flags` | object | 关系相关标志位 |

3. **好感度等级**

| Level | 所需好感度 | 名称 |
|-------|-----------|------|
| 1 | 0 | 陌生人 |
| 2 | 20 | 认识 |
| 3 | 40 | 熟人 |
| 4 | 70 | 朋友 |
| 5 | 100 | 好友 |

4. **送礼规则**
- 每天每个村民最多送 1 次礼物
- 喜欢的物品：好感度 +10
- 普通物品：好感度 +5
- 不喜欢的物品：好感度 +1
- 节日当天送礼：好感度翻倍

5. **性格类型**

| 类型 | 特点 | 喜好倾向 |
|------|------|---------|
| 温和 | 友善、耐心 | 喜欢温馨物品 |
| 热情 | 开朗、活泼 | 喜欢热闹物品 |
| 内向 | 害羞、细腻 | 喜欢文艺物品 |
| 古板 | 严肃、传统 | 喜欢传统物品 |
| 顽皮 | 调皮、爱玩 | 喜欢有趣物品 |

### States and Transitions

**单个村民关系状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Unmet** | 默认 | 首次对话 | 未见过，不显示在列表 |
| **Acquainted** | 首次对话 | 永久 | 已认识，显示在村民列表 |
| **Friend** | 关系等级 ≥4 | 永久 | 朋友关系，解锁更多内容 |
| **CloseFriend** | 关系等级 =5 | 永久 | 好友关系，全部解锁 |

**等级转换**：
```
friendship >= threshold → level up
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **对话系统** | 提供好感度 | 村民 → 对话 | 根据关系等级解锁不同对话 |
| **任务系统** | 奖励好感度 | 任务 → 村民 | 完成村民请求获得好感度 |
| **背包系统** | 消耗礼物 | 村民 → 背包 | 送礼消耗背包物品 |
| **事件系统** | 发布事件 | 村民 → 事件 | 关系变化时发布事件 |
| **时间系统** | 每日重置 | 时间 → 村民 | 重置每日送礼次数 |
| **材料系统** | 查询喜好 | 村民 → 材料 | 获取物品信息判断喜好 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `villager:met` | `{ npcId, npcName }` | 首次见面 |
| `villager:friendship_changed` | `{ npcId, oldLevel, newLevel, delta }` | 好感度变化 |
| `villager:level_up` | `{ npcId, newLevel }` | 关系升级 |
| `villager:gift_sent` | `{ npcId, itemId, reaction }` | 送礼 |
| `villager:max_level` | `{ npcId }` | 达到最高关系等级 |

## Formulas

### 1. 好感度计算

```
newFriendship = clamp(currentFriendship + delta, 0, maxFriendship)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| currentFriendship | int | 0-100 | runtime | 当前好感度 |
| delta | int | -10-+20 | action | 好感度变化 |
| maxFriendship | int | 100 | constant | 最大好感度 |

### 2. 关系等级计算

```
if (friendship >= 100) level = 5
else if (friendship >= 70) level = 4
else if (friendship >= 40) level = 3
else if (friendship >= 20) level = 2
else level = 1
```

### 3. 送礼好感度

```
baseGain = 5
if (itemId in npc.likes): gain = 10
else if (itemId in npc.dislikes): gain = 1
else: gain = baseGain

if (isFestivalDay): gain = gain × 2
```

### 4. 每日最大好感度获取

```
maxDailyGain = 10 (送礼) + taskRewards
```

**Expected output range**:
- 单次送礼：+1 到 +20
- 单次任务：+5 到 +15
- 达到最高等级：约 15-20 天（正常游玩）

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 好感度已满时送礼 | 好感度不变，仍可送礼 | 允许表达心意 |
| 同一天重复送礼 | 阻止，显示"今天已经送过礼物了" | 限制刷好感 |
| 送不喜欢的东西 | 仍然增加好感度（+1），但NPC反应冷淡 | 不惩罚但反馈 |
| 未解锁村民 | 不显示在列表，对话时标记为"???" | 保持神秘感 |
| 好感度降为0 | 关系等级降为1，但不低于1 | 允许修复关系 |
| NPC离开村庄 | 保留关系数据，NPC不在场景出现 | 为未来功能预留 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |
| **背包系统** | Hard | `removeItem(itemId, amount)` | ✅ Designed |
| **材料系统** | Soft | `getMaterialById(id)` | ✅ Approved |
| **时间系统** | Soft | `getGameDay()` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **对话系统** | Hard | `getFriendshipLevel(npcId)` | ✅ Designed |
| **任务系统** | Hard | `changeFriendship(npcId, delta)` | ✅ Designed |
| **UI框架系统** | Soft | `getVillagerList()` | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **最大好感度** | 100 | 50-200 | 更慢的关系进展 | 更快的关系进展 |
| **每日送礼上限** | 1 | 1-3 | 更快的日常进展 | 更慢的日常进展 |
| **喜欢物品加成** | +10 | +5-+20 | 更强的送礼策略 | 更弱的送礼策略 |
| **节日送礼倍率** | 2x | 1.5-3x | 更强的节日参与感 | 更弱的节日参与感 |
| **升级阈值分布** | 0/20/40/70/100 | 自定义 | 调整各等级难度 | - |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **村民头像** | 显示在对话、列表中 |
| **好感度条** | 心形或星星填充 |
| **等级标识** | 显示当前关系名称 |
| **送礼反应** | 喜欢时开心表情，不喜欢时尴尬表情 |
| **升级动画** | 关系升级时的庆祝效果 |

### 送礼反应动画

| Reaction | Animation |
|----------|-----------|
| 喜欢 | 眼睛发亮，微笑，爱心特效 |
| 普通 | 点头微笑 |
| 不喜欢 | 尴尬表情，勉强微笑 |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `friendship_up` | 好感度提升 |
| `friendship_level_up` | 关系升级 |
| `gift_like` | 送喜欢的礼物 |
| `gift_dislike` | 送不喜欢的礼物 |

## UI Requirements

### 村民列表界面

```
┌─────────────────────────────────┐
│           村 民 列 表            │
├─────────────────────────────────┤
│  [头像] 李奶奶                   │
│         ♥♥♥♥♡ 好友              │
│         ████████████ 85/100     │
│                                 │
│  [头像] 王大伯                   │
│         ♥♥♡♡♡ 熟人              │
│         ██████░░░░ 45/100       │
│                                 │
│  [头像] ???                      │
│         未解锁                   │
└─────────────────────────────────┘
```

### 送礼界面

```
┌─────────────────────────────────┐
│  送给李奶奶                      │
├─────────────────────────────────┤
│  选择礼物：                      │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │🌸   │ │🎋   │ │🍵   │       │
│  │桃花  │ │竹叶  │ │茶叶  │       │
│  │喜欢! │ │普通  │ │普通  │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
│  今日已送礼：0/1                 │
│                                 │
│  [取消]                         │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 首次对话正确建立关系
- [ ] 送礼正确消耗物品和增加好感度
- [ ] 每日送礼限制正确
- [ ] 关系等级正确计算
- [ ] 喜好判断正确
- [ ] 节日加成正确

**事件测试**:
- [ ] 首次见面发布 `villager:met`
- [ ] 好感度变化发布 `villager:friendship_changed`
- [ ] 关系升级发布 `villager:level_up`

**UI测试**:
- [ ] 村民列表正确显示
- [ ] 好感度条准确
- [ ] 送礼反应正确

**性能测试**:
- [ ] 好感度查询 < 1ms
- [ ] 内存占用 < 5KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否允许好感度下降？ | 设计者 | MVP阶段 | 暂不允许，保持正向 |
| 是否支持多人关系？ | 设计者 | Beta阶段 | 不支持，单人游戏 |

## Implementation Notes

```typescript
enum Personality {
    GENTLE = 'GENTLE',
    ENTHUSIASTIC = 'ENTHUSIASTIC',
    INTROVERTED = 'INTROVERTED',
    TRADITIONAL = 'TRADITIONAL',
    PLAYFUL = 'PLAYFUL'
}

interface Villager {
    id: string;
    name: string;
    avatar: string;
    personality: Personality;
    likes: string[];
    dislikes: string[];
    location: string;
    schedule: Schedule[];
}

interface Relationship {
    npcId: string;
    friendship: number;
    level: number;
    giftsToday: number;
    lastGiftDate: number;
    metDate: number;
    flags: Record<string, any>;
}

class VillagerManager {
    private villagers: Map<string, Villager>;
    private relationships: Map<string, Relationship>;
    private eventSystem: EventSystem;
    private backpack: BackpackManager;

    meetVillager(npcId: string): void;
    sendGift(npcId: string, itemId: string): { success: boolean; reaction: string };
    changeFriendship(npcId: string, delta: number): void;
    getFriendship(npcId: string): number;
    getFriendshipLevel(npcId: string): number;
    canSendGift(npcId: string): boolean;
    getReaction(npcId: string, itemId: string): 'LIKE' | 'NORMAL' | 'DISLIKE';
    resetDailyGifts(): void;
}
```