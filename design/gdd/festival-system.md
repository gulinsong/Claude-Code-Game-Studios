# 节日筹备系统 (Festival Preparation System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 核心循环 — 节日是游戏的核心，筹备是主要玩法

## Overview

节日筹备系统是《岁时记》的**核心循环驱动**，围绕中国传统节日组织游戏节奏。每个节日分为准备期、庆典日、余韵期三个阶段。玩家在准备期收集材料、制作物品、布置场景，在庆典日参与活动、获得奖励，在余韵期与村民回顾节日。

节日采用**周期循环 + 进度追踪**模式——节日每年循环，每次参与都能获得奖励。节日筹备进度影响庆典规模和奖励丰厚程度。

玩家**直接与节日筹备系统交互**——查看节日倒计时、接取节日任务、提交准备物品、参与庆典活动。节日是游戏的高潮时刻。

此系统主要支撑**核心循环**——节日是游戏的主要节奏点，围绕节日组织所有玩法。

## Player Fantasy

**直接体验**：
- **期待感**：看到节日倒计时，提前规划准备
- **忙碌感**：准备期有很多事要做，充实而有趣
- **仪式感**：参与传统节日的庆祝，感受文化氛围
- **成就感**：完成筹备，看到村庄的热闹庆典

**节日阶段情感设计**：

| Phase | Duration | Player Feeling |
|-------|----------|---------------|
| **准备期** | 3天 | 忙碌准备，期待 |
| **庆典日** | 1天 | 欢乐参与，高潮 |
| **余韵期** | 1天 | 温馨回顾，满足 |

**四季节日**：

| Season | Festival | Theme | Key Activities |
|--------|----------|-------|----------------|
| 春 | 清明 | 缅怀、踏青 | 制作青团、扫墓、放风筝 |
| 夏 | 端午 | 驱邪、纪念 | 包粽子、挂艾草、赛龙舟（小游戏） |
| 秋 | 中秋 | 团圆、赏月 | 做月饼、赏月、猜灯谜 |
| 冬 | 春节 | 迎新、团圆 | 包饺子、贴春联、放烟花 |

## Detailed Design

### Core Rules

1. **节日核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 节日唯一ID |
| `name` | string | 节日名称 |
| `season` | enum | 所属季节 |
| `gameDay` | int | 节日日期（年内第几天） |
| `prepDays` | int | 准备期天数 |
| `description` | string | 节日描述 |
| `lore` | string | 文化背景 |
| `tasks` | FestivalTask[] | 节日任务列表 |
| `rewards` | FestivalReward[] | 节日奖励 |

2. **节日任务结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务ID |
| `description` | string | 任务描述 |
| `type` | enum | 任务类型 |
| `target` | string | 目标ID |
| `requiredAmount` | int | 所需数量 |
| `contribution` | int | 贡献度 |

3. **任务类型**

| 类型 | 说明 | 示例 |
|------|------|------|
| `COLLECT` | 收集材料 | 收集糯米 20 斤 |
| `CRAFT` | 制作物品 | 制作月饼 10 个 |
| `DECORATE` | 装饰场景 | 挂灯笼 5 盏 |
| `PARTICIPATE` | 参与活动 | 参与猜灯谜 3 次 |

4. **节日阶段**

| Phase | 触发条件 | 持续时间 | 可用功能 |
|-------|---------|---------|---------|
| **Normal** | 非节日期间 | - | 正常游玩 |
| **Preparation** | 节日前 N 天 | N 天 | 接取节日任务、提交物品 |
| **Celebration** | 节日当天 | 1 天 | 参与庆典活动、领取奖励 |
| **Afterglow** | 节日后 1 天 | 1 天 | 与村民回顾节日 |

5. **筹备进度计算**
- 每个任务有贡献度
- 总贡献度达到阈值解锁不同奖励档次
- 档次：基础（0%）、良好（50%）、完美（100%）

6. **庆典活动**
- 每个节日有独特的庆典小游戏
- 完成小游戏获得额外奖励
- 小游戏可重复参与，但奖励递减

### States and Transitions

**节日系统状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Normal** | 默认 | 进入准备期 | 无节日活动 |
| **Preparation** | 距节日 ≤ prepDays | 节日当天 | 显示节日任务，接受物品提交 |
| **Celebration** | 节日当天 | 节日结束 | 开放庆典活动 |
| **Afterglow** | 节日后 1 天 | 进入下一状态 | 特殊对话，回顾节日 |

**状态转换图**：
```
Normal → Preparation → Celebration → Afterglow → Normal
            ↑___________________________________|
                    (下一个节日)
```

**单个节日任务状态**

| State | Entry Condition | Exit Condition |
|-------|----------------|----------------|
| **Locked** | 节日未开始 | 进入准备期 |
| **Available** | 进入准备期 | 任务完成 |
| **Completed** | 完成目标 | 节日结束 |

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **时间系统** | 查询日期 | 时间 → 节日 | 判断节日阶段 |
| **任务系统** | 创建任务 | 节日 → 任务 | 节日任务作为特殊任务 |
| **手工艺系统** | 制作物品 | 节日 → 手工艺 | 节日任务需要制作物品 |
| **背包系统** | 提交物品 | 节日 ↔ 背包 | 提交材料/成品 |
| **村民关系系统** | 节日对话 | 节日 → 村民 | 节日期间特殊对话 |
| **事件系统** | 发布事件 | 节日 → 事件 | 发布节日相关事件 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `festival:approaching` | `{ festivalId, daysUntil }` | 节日临近（准备期开始） |
| `festival:started` | `{ festivalId }` | 节日当天 |
| `festival:task_completed` | `{ festivalId, taskId }` | 节日任务完成 |
| `festival:celebration_started` | `{ festivalId }` | 庆典开始 |
| `festival:ended` | `{ festivalId, completionRate }` | 节日结束 |
| `festival:reward_claimed` | `{ festivalId, tier }` | 领取奖励 |

## Formulas

### 1. 节日距离计算

```
daysUntilFestival = festivalGameDay - currentGameDay
if (daysUntilFestival < 0):
    daysUntilFestival += 28  // 跨年处理
```

### 2. 筹备完成度

```
completionRate = sum(task.contribution for completed tasks) / totalContribution
completionPercent = floor(completionRate × 100)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| totalContribution | int | 100 | config | 总贡献度 |
| completionRate | float | 0.0-1.0 | computed | 完成率 |
| completionPercent | int | 0-100 | computed | 完成百分比 |

### 3. 奖励档次

```
if (completionPercent >= 100): tier = PERFECT
else if (completionPercent >= 50): tier = GOOD
else: tier = BASIC
```

| Tier | Requirement | Reward Multiplier |
|------|-------------|------------------|
| BASIC | 0-49% | 1x |
| GOOD | 50-99% | 1.5x |
| PERFECT | 100% | 2x |

### 4. 小游戏奖励递减

```
reward = baseReward × (0.8 ^ playCount)
reward = max(reward, minReward)
```

**Expected output range**:
- 准备期时长：3 天
- 任务数量：5-8 个
- 完成度：0-100%
- 奖励倍率：1x-2x

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 准备期未完成任何任务 | 仍可参与庆典，获得基础奖励 | 不惩罚，但鼓励准备 |
| 庆典当天未登录 | 自动结算基础奖励，发送邮件 | 不让玩家完全错过 |
| 跨节日离线 | 自动跳过已过节日，进入当前节日状态 | 正确处理时间流逝 |
| 任务物品不足 | 无法提交，显示缺少数量 | 引导收集 |
| 重复提交同一任务 | 阻止，显示"已完成" | 防止重复计算 |
| 庆典小游戏多次参与 | 奖励递减但不为零 | 允许重复游玩 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **时间系统** | Hard | `getGameDay()`, `getSeason()` | ✅ Designed |
| **任务系统** | Hard | `createQuest()`, `completeQuest()` | ✅ Designed |
| **手工艺系统** | Hard | 制作计数 | ✅ Designed |
| **背包系统** | Hard | `removeItem()` | ✅ Designed |
| **事件系统** | Hard | `emit()` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **村庄发展系统** | Hard | 节日完成触发发展 | Not Started |
| **村民关系系统** | Soft | 节日对话 | ✅ Designed |
| **收集系统** | Soft | 节日限定收集 | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **准备期天数** | 3 | 1-7 | 更充裕的准备时间 | 更紧迫的准备感 |
| **任务数量** | 6 | 3-10 | 更多的准备内容 | 更少的准备负担 |
| **良好档位阈值** | 50% | 30-70% | 更容易获得良好奖励 | 更难获得良好奖励 |
| **完美档位阈值** | 100% | 80-100% | 更容易获得完美奖励 | 更难获得完美奖励 |
| **小游戏奖励递减率** | 0.8 | 0.5-0.9 | 更快的奖励递减 | 更慢的奖励递减 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **节日倒计时** | 主界面显示距离下一个节日的天数 |
| **节日横幅** | 准备期和庆典期显示节日主题装饰 |
| **进度条** | 显示筹备完成度 |
| **庆典特效** | 节日当天的特殊视觉效果（烟花、灯笼等） |
| **奖励展示** | 领取奖励时的庆祝动画 |

### 节日视觉主题

| Festival | 主色调 | 装饰元素 |
|----------|--------|---------|
| 清明 | 淡绿、白色 | 柳枝、风筝 |
| 端午 | 深绿、红色 | 粽子、龙舟、艾草 |
| 中秋 | 金色、橙色 | 月亮、灯笼、桂花 |
| 春节 | 红色、金色 | 春联、灯笼、烟花 |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `festival_approach` | 节日临近提示 |
| `festival_start` | 节日开始 |
| `festival_task_complete` | 任务完成 |
| `festival_celebration` | 庆典BGM |
| `festival_reward` | 领取奖励 |
| `festival_end` | 节日结束 |

## UI Requirements

### 节日信息界面

```
┌─────────────────────────────────┐
│         🌕 中 秋 节              │
│         ~~~~~~~~~~~~~~~~        │
│         距离节日还有 2 天        │
│                                 │
│  【筹备进度】                    │
│  ████████░░░░ 67%               │
│                                 │
│  【任务】                        │
│  ✓ 收集糯米 x20                 │
│  ✓ 制作月饼 x10                 │
│  ○ 挂灯笼 x5 (3/5)              │
│  ○ 参与猜灯谜 x3 (0/3)          │
│                                 │
│  【奖励预览】                    │
│  基础: 🪙 100                    │
│  良好: 🪙 150 + 📜 食谱          │
│  完美: 🪙 200 + 📜 食谱 + 🎁     │
└─────────────────────────────────┘
```

### 庆典活动界面

```
┌─────────────────────────────────┐
│         🏮 中秋庆典              │
│                                 │
│  [猜灯谜]  [赏月]  [放灯笼]     │
│                                 │
│  已参与: 2/3                     │
│                                 │
│  今日奖励剩余:                   │
│  🪙 80 → 64 → 51                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 节日阶段正确切换
- [ ] 节日任务正确生成和追踪
- [ ] 物品提交正确扣除和计入进度
- [ ] 完成度正确计算
- [ ] 奖励档次正确判断
- [ ] 奖励正确发放
- [ ] 庆典小游戏可正常游玩

**事件测试**:
- [ ] 节日临近发布 `festival:approaching`
- [ ] 节日开始发布 `festival:started`
- [ ] 节日结束发布 `festival:ended`

**UI测试**:
- [ ] 节日信息正确显示
- [ ] 进度条准确
- [ ] 庆典活动可参与

**性能测试**:
- [ ] 节日状态检查 < 1ms
- [ ] 内存占用 < 10KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否支持跳过节日本次庆典？ | 设计者 | MVP阶段 | 不支持，自动结算 |
| 节日任务是否可重复完成？ | 设计者 | MVP阶段 | 不支持 |

## Implementation Notes

```typescript
enum FestivalPhase {
    NORMAL = 'NORMAL',
    PREPARATION = 'PREPARATION',
    CELEBRATION = 'CELEBRATION',
    AFTERGLOW = 'AFTERGLOW'
}

enum FestivalTaskType {
    COLLECT = 'COLLECT',
    CRAFT = 'CRAFT',
    DECORATE = 'DECORATE',
    PARTICIPATE = 'PARTICIPATE'
}

enum RewardTier {
    BASIC = 'BASIC',
    GOOD = 'GOOD',
    PERFECT = 'PERFECT'
}

interface FestivalTask {
    id: string;
    description: string;
    type: FestivalTaskType;
    target: string;
    requiredAmount: number;
    currentAmount: number;
    contribution: number;
}

interface Festival {
    id: string;
    name: string;
    season: Season;
    gameDay: number;
    prepDays: number;
    description: string;
    lore: string;
    tasks: FestivalTask[];
    rewards: Record<RewardTier, Reward[]>;
}

interface FestivalState {
    currentFestival: Festival | null;
    phase: FestivalPhase;
    taskProgress: Map<string, number>;
    celebrationPlayCount: number;
}

class FestivalManager {
    private festivals: Map<string, Festival>;
    private state: FestivalState;
    private timeSystem: TimeManager;
    private questSystem: QuestManager;
    private backpack: BackpackManager;
    private eventSystem: EventSystem;

    update(): void;  // 每帧检查节日状态
    submitTask(taskId: string, amount: number): boolean;
    getCompletionRate(): number;
    getRewardTier(): RewardTier;
    claimRewards(): Reward[];
    playCelebrationGame(gameId: string): CelebrationResult;
    getDaysUntilNextFestival(): number;
}
```