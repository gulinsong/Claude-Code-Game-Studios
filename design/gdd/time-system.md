# 时间系统 (Time System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 2: 四季流转 — 时间不是数字，是可感知的变化

## Overview

时间系统是《岁时记》的**世界时钟**，负责管理游戏内的时间流逝、日夜交替、季节更替和节日周期。它是"四季流转"体验的核心支撑。

时间采用**加速流逝**模式——现实 1 分钟 = 游戏 1 小时。一个游戏日约 24 分钟，一个游戏季节约 7 天（约 2.8 小时现实时间）。这种设计让玩家在碎片化游玩中仍能感受到时间的变化。

玩家**间接感知时间系统**——通过天空颜色变化、环境音效、可采集物品的变化、节日到来等方式体验时间的流逝。时间系统是"活着的村庄"的基础。

此系统主要支撑 **Pillar 2: 四季流转** —— 让时间成为可感知的体验，而非冰冷的数字。

## Player Fantasy

**直接体验**：
- **日出的期待**：早晨登录看到村庄苏醒，炊烟升起，村民开始一天的活动
- **黄昏的温馨**：傍晚时分天空染上橙红色，村庄亮起灯火，温暖的归属感
- **季节的仪式感**：春花、夏荷、秋叶、冬雪，每个季节有独特的视觉和氛围
- **节日的期待**：看到节日临近的倒计时，提前准备的心情

**时间情感设计**：

| Time Period | Player Feeling |
|-------------|---------------|
| **早晨 (6:00-12:00)** | 新的开始，精力充沛，计划今天要做什么 |
| **下午 (12:00-18:00)** | 充实忙碌，采集、制作、与村民互动 |
| **傍晚 (18:00-21:00)** | 收尾整理，与村民道别，期待明天 |
| **夜晚 (21:00-6:00)** | 安静休息，反思今天的收获 |
| **季节交替** | 新鲜感，期待新的物产和活动 |
| **节日临近** | 兴奋，忙碌准备，期待庆典 |

此系统主要支撑 **Pillar 2: 四季流转** —— 同一地点四季不同，时间流逝带来可感知的变化。

## Detailed Design

### Core Rules

1. **时间流速**

| 现实时间 | 游戏时间 | 说明 |
|---------|---------|------|
| 1 分钟 | 1 小时 | 基础流速 |
| 24 分钟 | 1 天 | 完整日循环 |
| 168 分钟 (2.8小时) | 1 周 | 完整周循环 |
| 7 天 | 1 季节 | 季节更替 |
| 28 天 | 1 年 | 完整年循环 |

2. **时段划分**

| 时段 | 游戏时间 | 天空颜色 | 环境特点 |
|------|---------|---------|---------|
| 黎明 | 5:00-6:00 | 淡蓝→橙 | 鸟鸣开始 |
| 早晨 | 6:00-12:00 | 明亮蓝天 | 村民活动 |
| 下午 | 12:00-18:00 | 蓝天白云 | 采集高峰 |
| 黄昏 | 18:00-20:00 | 橙红渐变 | 灯火亮起 |
| 夜晚 | 20:00-5:00 | 深蓝星空 | 安静休息 |

3. **季节系统**

| 季节 | 游戏天数 | 视觉特点 | 特产材料 | 代表节日 |
|------|---------|---------|---------|---------|
| 春 | 1-7 | 樱花、新绿 | 春笋、桃花 | 清明 |
| 夏 | 8-14 | 荷花、蝉鸣 | 荷叶、莲子 | 端午 |
| 秋 | 15-21 | 红叶、丰收 | 桂花、月饼食材 | 中秋 |
| 冬 | 22-28 | 白雪、腊梅 | 腊梅、年货 | 春节 |

4. **节日周期**
- 每个季节有 1 个主要节日
- 节日前 3 天为"准备期"，NPC开始谈论节日
- 节日当天为"庆典日"，有特殊活动
- 节日后 1 天为"余韵日"，村民回味节日

5. **时间推进规则**
- **在线时**：实时推进，每分钟推进 1 游戏小时
- **离线时**：记录离线时间，下次登录时计算经过的游戏时间，但不超过 24 游戏小时
- **跨日处理**：离线跨日时，自动结算昨日产出（采集点、任务等）

### States and Transitions

**时间系统状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Running** | 游戏启动 | 游戏暂停/关闭 | 时间正常流逝 |
| **Paused** | 打开菜单/对话框 | 关闭菜单/对话框 | 时间暂停 |
| **FastForward** | 使用加速道具 | 加速结束 | 时间以 2x/4x 流逝 |

**时段状态转换**

```
黎明 → 早晨 → 下午 → 黄昏 → 夜晚 → 黎明
 5:00   6:00    12:00   18:00   20:00   5:00
```

**季节状态转换**

```
春 → 夏 → 秋 → 冬 → 春
Day1  Day8  Day15 Day22 Day1(下一年)
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **配置系统** | 读取配置 | 配置 → 时间 | 获取时间参数（日长、季节长度） |
| **事件系统** | 发布事件 | 时间 → 事件 | 发布时间变化事件 |
| **采集系统** | 提供时间 | 时间 → 采集 | 不同时段/季节有不同产出 |
| **体力系统** | 触发恢复 | 时间 → 体力 | 每日重置体力，或时间流逝恢复 |
| **节日筹备系统** | 提供日期 | 时间 → 节日 | 判断是否进入节日准备期 |
| **村民关系系统** | 提供时间 | 时间 → 村民 | 村民根据时间出现在不同地点 |
| **音频系统** | 提供时间 | 时间 → 音频 | 不同时段播放不同BGM/环境音 |
| **UI框架系统** | 提供时间 | 时间 → UI | 显示当前时间、日期、季节 |
| **云存档系统** | 提供时间戳 | 时间 → 存档 | 记录存档时间，计算离线时间 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `time:minute_changed` | `{ gameHour, gameMinute }` | 每游戏分钟 |
| `time:hour_changed` | `{ gameHour }` | 每游戏小时 |
| `time:day_changed` | `{ gameDay, gameWeek, gameSeason }` | 游戏日变更 |
| `time:season_changed` | `{ oldSeason, newSeason }` | 季节更替 |
| `time:period_changed` | `{ oldPeriod, newPeriod }` | 时段变更（早晨→下午等） |
| `time:festival_approaching` | `{ festivalId, daysUntil }` | 节日临近（3天前） |
| `time:festival_started` | `{ festivalId }` | 节日开始 |
| `time:festival_ended` | `{ festivalId }` | 节日结束 |

## Formulas

### 1. 时间计算

```
gameHour = (realMinutes * timeScale) % 24
gameDay = floor(totalGameHours / 24) % 28 + 1
gameSeason = floor((gameDay - 1) / 7)  // 0=春, 1=夏, 2=秋, 3=冬
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| realMinutes | float | 0-∞ | runtime | 现实经过的分钟数 |
| timeScale | int | 60 | config | 时间倍率（现实1分钟=游戏多少分钟） |
| gameHour | float | 0-24 | computed | 当前游戏小时 |
| gameDay | int | 1-28 | computed | 当前游戏日（年内） |
| gameSeason | int | 0-3 | computed | 当前季节 |

### 2. 时段判断

```
if (5 <= gameHour < 6) period = DAWN
else if (6 <= gameHour < 12) period = MORNING
else if (12 <= gameHour < 18) period = AFTERNOON
else if (18 <= gameHour < 20) period = DUSK
else period = NIGHT
```

### 3. 离线时间计算

```
offlineGameHours = min(floor(offlineRealMinutes / timeScale), maxOfflineHours)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| offlineRealMinutes | int | 0-∞ | runtime | 离线现实分钟数 |
| maxOfflineHours | int | 24 | config | 最大离线计算小时数 |
| offlineGameHours | int | 0-24 | computed | 离线游戏小时数 |

### 4. 节日距离计算

```
daysUntilFestival = festivalDay - currentDay
if (daysUntilFestival < 0) daysUntilFestival += 28  // 跨年处理
```

**Expected output range**:
- 时段变化：每 6-12 游戏小时
- 季节变化：每 7 游戏日
- 节日周期：每季节 1 次

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 玩家长时间离线（>24小时） | 只计算 24 游戏小时的进度，超出的部分忽略 | 防止玩家"刷时间" |
| 跨季节离线 | 正常计算季节变更，触发 `season_changed` 事件 | 不丢失季节体验 |
| 跨节日离线 | 标记节日为"已错过"，玩家可查看错过的内容 | 不强制补偿，保持游戏节奏 |
| 系统时间被修改 | 检测到时间倒退时，使用服务器时间或上次记录时间 | 防止作弊 |
| 游戏暂停时时间事件 | 事件队列暂停，恢复后继续 | 不丢失事件 |
| 加速道具叠加 | 不允许叠加，延长加速时长而非倍率叠加 | 防止数值失衡 |
| 季节材料切换 | 季节变更时，采集点刷新为新季节材料 | 平滑过渡 |
| 冬令时/夏令时 | 不考虑，游戏内使用固定时区 | 简化设计 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **配置系统** | Hard | `getGlobalParam(key)` | ✅ Designed |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **采集系统** | Hard | `getCurrentSeason()`, `getCurrentPeriod()` | Not Started |
| **体力系统** | Hard | `getGameDay()`, `isNextDay()` | Not Started |
| **节日筹备系统** | Hard | `getDaysUntilFestival()` | Not Started |
| **村民关系系统** | Soft | `getCurrentHour()`, `getCurrentPeriod()` | Not Started |
| **音频系统** | Soft | `getCurrentPeriod()`, `getCurrentSeason()` | Not Started |
| **UI框架系统** | Soft | `getFormattedTime()`, `getSeasonName()` | Not Started |
| **云存档系统** | Soft | `getLastSaveTime()` | Not Started |
| **日记系统** | Soft | `getGameDay()`, `getSeasonName()` | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **时间倍率** | 60 | 30-120 | 更快的时间流逝 | 更慢的时间流逝 |
| **日长（现实分钟）** | 24 | 15-60 | 更充裕的每日游玩时间 | 更紧凑的每日体验 |
| **季节长度（游戏日）** | 7 | 5-14 | 更长的季节体验 | 更快的季节更替 |
| **年长度（游戏日）** | 28 | 21-56 | 更完整的年周期 | 更快的年循环 |
| **最大离线计算小时** | 24 | 12-72 | 更多离线收益 | 鼓励经常上线 |
| **节日准备期（天）** | 3 | 1-5 | 更充分的准备时间 | 更紧迫的节日感 |
| **加速道具倍率** | 2x/4x | 2x-8x | 更强的加速效果 | 更温和的加速 |

**参数交互**：
- `时间倍率` 和 `日长` 成反比：timeScale = 1440 / dayLengthMinutes
- `季节长度` × 4 = `年长度`
- `节日准备期` 应 ≤ `季节长度` / 2

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **天空颜色** | 根据时段平滑过渡（渐变动画 2-3 秒） |
| **光照强度** | 白天明亮，黄昏温暖，夜晚暗淡 |
| **环境元素** | 季节性装饰（春花、夏荷、秋叶、冬雪） |
| **昼夜标识** | 太阳/月亮图标，位置随时间变化 |

### 天空颜色方案

| 时段 | 天空颜色 | 光照强度 |
|------|---------|---------|
| 黎明 | #FFB6C1 → #87CEEB | 0.6 → 0.9 |
| 早晨 | #87CEEB | 1.0 |
| 下午 | #87CEEB → #FFD700 | 1.0 → 0.8 |
| 黄昏 | #FF6B35 → #4A0E4E | 0.8 → 0.4 |
| 夜晚 | #1A1A2E | 0.3 |

### 音频需求

| 音效/BGM | 触发时机 |
|---------|---------|
| 早晨BGM | 6:00 开始播放 |
| 下午BGM | 12:00 切换 |
| 黄昏BGM | 18:00 切换 |
| 夜晚BGM | 20:00 切换 |
| 鸟鸣 | 早晨环境音 |
| 蝉鸣 | 夏季白天 |
| 蟋蟀 | 夜晚环境音 |
| 季节切换音效 | 季节变更时 |

## UI Requirements

### 时间显示组件

```
┌─────────────────────────────────┐
│  🌅  上午 10:30    第 5 天  春  │
│      ~~~~~~~~~~~~~~~~           │
│      距离清明还有 2 天          │
└─────────────────────────────────┘
```

### 日历界面

```
┌─────────────────────────────────┐
│           春 季 日 历           │
├─────────────────────────────────┤
│  一  二  三  四  五  六  日     │
│                      1   2   3  │
│   4   5   6   7   8   9  10     │
│  11  12  13  14  15  16  17     │
│  18  19  20  21  22  23  24     │
│  25  26  27  28                 │
│                                 │
│  🏮 清明: 第 7 天               │
└─────────────────────────────────┘
```

### 交互规范

| 操作 | 行为 |
|------|------|
| 点击时间显示 | 打开日历界面 |
| 左右滑动日历 | 切换季节 |
| 点击节日图标 | 显示节日详情 |

## Acceptance Criteria

**功能测试**:
- [ ] 时间按配置的倍率正确流逝
- [ ] 时段切换时天空颜色平滑过渡
- [ ] 季节更替时触发 `season_changed` 事件
- [ ] 节日临近时触发 `festival_approaching` 事件
- [ ] 离线时间正确计算，不超过上限
- [ ] 跨日时触发 `day_changed` 事件
- [ ] 游戏暂停时时间暂停
- [ ] 加速道具正确生效

**事件测试**:
- [ ] 每分钟触发 `time:minute_changed`
- [ ] 每小时触发 `time:hour_changed`
- [ ] 每日触发 `time:day_changed`
- [ ] 季节变更触发 `time:season_changed`
- [ ] 时段变更触发 `time:period_changed`

**UI测试**:
- [ ] 时间显示正确
- [ ] 日历显示正确
- [ ] 季节/节日图标正确

**性能测试**:
- [ ] 时间更新不卡顿（每帧检查）
- [ ] 内存占用 < 1KB
- [ ] 离线计算时间 < 100ms

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要天气系统？ | 设计者 | Beta阶段 | 暂不需要，保持简单 |
| 是否支持玩家自定义时间流速？ | 设计者 | Alpha阶段 | 不支持，统一流速 |
| 节日是否严格按照农历？ | 设计者 | MVP阶段 | 简化，固定日期 |

## Implementation Notes

```typescript
enum Season {
    SPRING = 'SPRING',
    SUMMER = 'SUMMER',
    AUTUMN = 'AUTUMN',
    WINTER = 'WINTER'
}

enum Period {
    DAWN = 'DAWN',
    MORNING = 'MORNING',
    AFTERNOON = 'AFTERNOON',
    DUSK = 'DUSK',
    NIGHT = 'NIGHT'
}

interface TimeState {
    gameHour: number;      // 0-24
    gameDay: number;       // 1-28
    season: Season;
    period: Period;
    realTimestamp: number; // 现实时间戳
}

class TimeManager {
    private state: TimeState;
    private config: TimeConfig;
    private eventSystem: EventSystem;

    update(deltaTime: number): void;
    getCurrentSeason(): Season;
    getCurrentPeriod(): Period;
    getDaysUntilFestival(festivalId: string): number;
    calculateOfflineTime(): number;
}
```
