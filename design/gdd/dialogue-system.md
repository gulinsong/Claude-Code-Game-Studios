# 对话系统 (Dialogue System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 1: 人情味 — 每一个互动都应该让玩家感受到人与人之间的温度

## Overview

对话系统是《岁时记》的**交互桥梁**，负责管理玩家与NPC之间的对话内容。对话不是简单的"点击显示文本"，而是有分支、有条件、有情感变化的互动体验。NPC会根据玩家的行为、节日进度、季节变化说出不同的话。

对话系统从**配置系统**读取对话定义，支持分支选择、条件触发、变量插值。对话结果会影响**村民关系系统**的好感度。

玩家**直接与对话系统交互**——点击NPC开始对话，阅读内容，做出选择。对话是感受"人情味"的主要方式。

此系统主要支撑 **Pillar 1: 人情味** —— NPC不是任务发布器，而是有喜怒哀乐的村民。

## Player Fantasy

**直接体验**：
- **被认识感**：NPC记得玩家做过的事，对话有延续性
- **选择感**：对话有分支，选择会影响关系
- **情感共鸣**：NPC有自己的故事和情绪，让玩家产生共鸣
- **期待感**：想知道NPC接下来会发生什么故事

**对话情感设计**：

| Dialogue Type | Player Feeling |
|---------------|---------------|
| **日常问候** | 温暖，被关心 |
| **剧情对话** | 好奇，想知道后续 |
| **选择对话** | 权衡，思考该说什么 |
| **节日对话** | 欢乐，共同期待 |
| **特殊对话** | 感动，深刻的记忆 |

此系统主要支撑 **Pillar 1: 人情味** —— 让对话成为建立情感的桥梁。

## Detailed Design

### Core Rules

1. **对话核心结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 对话ID |
| `npcId` | string | NPC ID |
| `trigger` | DialogueTrigger | 触发条件 |
| `priority` | int | 优先级（高优先级先触发） |
| `nodes` | DialogueNode[] | 对话节点列表 |
| `repeatable` | boolean | 是否可重复触发 |

2. **对话节点结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 节点ID |
| `text` | string | 对话文本（支持变量插值） |
| `speaker` | enum | 说话者（NPC/PLAYER） |
| `choices` | DialogueChoice[] | 选项列表（空表示继续） |
| `effects` | DialogueEffect[] | 效果列表 |
| `nextNodeId` | string | 下一个节点ID（空表示结束） |

3. **选项结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | string | 选项文本 |
| `condition` | Condition | 显示条件 |
| `effects` | DialogueEffect[] | 选择后效果 |
| `nextNodeId` | string | 跳转节点 |

4. **触发条件类型**

| 类型 | 说明 | 示例 |
|------|------|------|
| `ALWAYS` | 总是可触发 | 日常问候 |
| `FIRST_MEET` | 首次见面 | 初次对话 |
| `FRIENDSHIP_LEVEL` | 好感度达到 | 解锁新话题 |
| `QUEST_COMPLETE` | 任务完成 | 任务后续对话 |
| `FESTIVAL_APPROACHING` | 节日临近 | 节日相关话题 |
| `SEASON` | 特定季节 | 季节性对话 |
| `TIME_PERIOD` | 特定时段 | 早安/晚安 |
| `ITEM_OWNED` | 拥有物品 | 收到礼物后 |
| `FLAG_SET` | 标志位设置 | 剧情推进 |

5. **效果类型**

| 类型 | 说明 | 参数 |
|------|------|------|
| `CHANGE_FRIENDSHIP` | 改变好感度 | `{ npcId, delta }` |
| `SET_FLAG` | 设置标志位 | `{ flagName, value }` |
| `GIVE_ITEM` | 获得物品 | `{ itemId, amount }` |
| `UNLOCK_RECIPE` | 解锁食谱 | `{ recipeId }` |
| `START_QUEST` | 开始任务 | `{ questId }` |
| `COMPLETE_QUEST` | 完成任务 | `{ questId }` |

6. **变量插值**
- `{playerName}` - 玩家名称
- `{npcName}` - NPC名称
- `{season}` - 当前季节
- `{festival}` - 最近的节日
- `{friendshipLevel}` - 当前好感度等级

### States and Transitions

**对话系统状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Idle** | 默认 | 玩家点击NPC | 无对话进行 |
| **SelectingDialogue** | 点击NPC | 选择对话/自动选择 | 查找可触发的对话 |
| **Playing** | 对话开始 | 对话结束 | 显示对话内容 |
| **Choosing** | 显示选项 | 玩家选择 | 等待玩家选择 |
| **Ended** | 对话结束 | 关闭界面 | 执行结束效果 |

**状态转换图**：
```
Idle → SelectingDialogue → Playing ←→ Choosing → Ended → Idle
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **配置系统** | 读取配置 | 配置 → 对话 | 获取对话定义 |
| **事件系统** | 发布事件 | 对话 → 事件 | 发布对话事件 |
| **村民关系系统** | 修改好感度 | 对话 → 村民 | 选择影响好感度 |
| **任务系统** | 触发/完成任务 | 对话 ↔ 任务 | 对话可触发任务 |
| **背包系统** | 获得/检查物品 | 对话 → 背包 | 对话奖励物品 |
| **时间系统** | 查询时间 | 对话 → 时间 | 条件判断 |
| **食谱系统** | 解锁食谱 | 对话 → 食谱 | 对话奖励 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `dialog:started` | `{ dialogId, npcId }` | 对话开始 |
| `dialog:choice_made` | `{ dialogId, nodeId, choiceIndex }` | 玩家选择 |
| `dialog:completed` | `{ dialogId, npcId }` | 对话结束 |

## Formulas

### 1. 对话优先级排序

```
availableDialogs = filter(dialogs, meetsTriggerCondition)
sortedDialogs = sort(availableDialogs, by: priority DESC)
selectedDialog = sortedDialogs[0]
```

### 2. 好感度变化

```
newFriendship = currentFriendship + choiceEffect.delta
newFriendship = clamp(newFriendship, 0, maxFriendship)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| currentFriendship | int | 0-100 | runtime | 当前好感度 |
| delta | int | -20-+20 | config | 选择带来的变化 |
| maxFriendship | int | 100 | config | 最大好感度 |

### 3. 条件判断

```
meetsCondition(condition):
  switch condition.type:
    case FRIENDSHIP_LEVEL:
      return getFriendship(npcId) >= condition.value
    case ITEM_OWNED:
      return backpack.hasItem(condition.itemId, condition.amount)
    case FLAG_SET:
      return getFlag(condition.flagName) == condition.value
    case SEASON:
      return timeSystem.getCurrentSeason() == condition.value
    // ...其他条件
```

**Expected output range**:
- 单次对话时长：10-30秒
- 分支数量：1-4个选项
- 好感度变化：-10 到 +10

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 无可触发对话 | 显示默认问候语 | 始终有内容可说 |
| 多个对话满足条件 | 选择优先级最高的 | 确保重要对话优先 |
| 选项条件不满足 | 隐藏该选项 | 不显示无法选择的选项 |
| 所有选项条件不满足 | 显示默认"继续"选项 | 防止卡死 |
| 对话中途NPC离开 | 优雅结束对话，提示"NPC离开了" | 处理异常情况 |
| 对话中背包满 | 物品溢出，显示提示 | 温和提醒 |
| 重复对话 | 根据repeatable设置决定是否触发 | 控制对话重复性 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **配置系统** | Hard | `getDialogById(id)` | ✅ Designed |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |
| **时间系统** | Soft | `getCurrentSeason()`, `getCurrentPeriod()` | ✅ Designed |
| **背包系统** | Soft | `hasItem()`, `addItem()` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **村民关系系统** | Hard | `changeFriendship(npcId, delta)` | Not Started |
| **任务系统** | Hard | `startQuest()`, `completeQuest()` | Not Started |
| **食谱系统** | Soft | `unlockRecipe()` | ✅ Designed |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **文本显示速度** | 30ms/字 | 20-100ms | 更慢的阅读节奏 | 更快的阅读节奏 |
| **默认好感度变化** | +5 | 0-20 | 更快的好感度提升 | 更慢的好感度提升 |
| **最大选项数** | 4 | 2-6 | 更复杂的选择 | 更简单的选择 |
| **对话历史保留** | 10条 | 5-20 | 更长的历史记录 | 更短的历史记录 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **对话框** | 底部显示，带NPC头像 |
| **选项按钮** | 清晰可点击，条件不满足时灰显 |
| **打字机效果** | 文字逐字显示 |
| **情感图标** | 根据对话情感显示表情 |
| **好感度变化提示** | +5/-5 浮动文字 |

### 对话框布局

```
┌─────────────────────────────────┐
│  [NPC头像]  李奶奶              │
│            ~~~~~~~~~~~~~~~~     │
│            "孩子，来吃块月饼吧"  │
├─────────────────────────────────┤
│  ○ 好的，谢谢奶奶！             │
│  ○ 我刚吃过，奶奶您留着自己吃   │
│  ○ 奶奶，您最近身体怎么样？     │
└─────────────────────────────────┘
```

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `dialog_open` | 打开对话 |
| `dialog_type` | 打字机效果 |
| `dialog_select` | 选择选项 |
| `dialog_close` | 关闭对话 |
| `friendship_up` | 好感度提升 |
| `friendship_down` | 好感度下降 |

## UI Requirements

### 对话界面交互

| 操作 | 行为 |
|------|------|
| 点击屏幕 | 跳过打字机效果 / 显示下一句 |
| 点击选项 | 选择该选项 |
| 长按屏幕 | 加速文本显示 |
| 返回键 | 关闭对话（提示确认） |

## Acceptance Criteria

**功能测试**:
- [ ] 对话正确触发和显示
- [ ] 条件判断正确
- [ ] 选项正确显示/隐藏
- [ ] 选择效果正确执行
- [ ] 好感度变化正确
- [ ] 变量插值正确
- [ ] 重复对话控制正确

**事件测试**:
- [ ] 对话开始时发布 `dialog:started`
- [ ] 选择选项时发布 `dialog:choice_made`
- [ ] 对话结束时发布 `dialog:completed`

**UI测试**:
- [ ] 打字机效果流畅
- [ ] 选项可点击
- [ ] 好感度变化提示显示

**性能测试**:
- [ ] 条件判断 < 5ms
- [ ] 内存占用 < 10KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否支持对话回放？ | 设计者 | Alpha阶段 | 暂不支持 |
| 是否支持跳过已读对话？ | 设计者 | MVP阶段 | 支持，显示摘要 |

## Implementation Notes

```typescript
enum Speaker {
    NPC = 'NPC',
    PLAYER = 'PLAYER'
}

interface DialogueTrigger {
    type: string;
    params: Record<string, any>;
}

interface DialogueChoice {
    text: string;
    condition?: Condition;
    effects: DialogueEffect[];
    nextNodeId: string;
}

interface DialogueNode {
    id: string;
    text: string;
    speaker: Speaker;
    choices: DialogueChoice[];
    effects: DialogueEffect[];
    nextNodeId?: string;
}

interface Dialogue {
    id: string;
    npcId: string;
    trigger: DialogueTrigger;
    priority: number;
    nodes: DialogueNode[];
    repeatable: boolean;
}

interface DialogueState {
    currentDialogId: string;
    currentNodeId: string;
    history: string[];
}

class DialogueManager {
    private dialogs: Map<string, Dialogue>;
    private state: DialogueState;
    private eventSystem: EventSystem;

    startDialogue(npcId: string): boolean;
    selectChoice(choiceIndex: number): void;
    advance(): void;
    endDialogue(): void;
    private evaluateCondition(condition: Condition): boolean;
    private executeEffects(effects: DialogueEffect[]): void;
}
```