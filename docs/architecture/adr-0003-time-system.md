# ADR-0003: 时间系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》以中国传统节日为核心循环，需要一个时间系统来：
1. 管理游戏内时间流逝（与现实时间不同步）
2. 支持季节和节日周期（4 季节 × 7 天 = 28 天/年）
3. 支持时间加速（离线奖励、道具效果）
4. 检测节日临近和开始

### Constraints
- **平台限制**: 微信小游戏，需要支持离线时间计算
- **设计要求**: 现实 1 分钟 = 游戏 1 小时（timeScale = 60）
- **节日设计**: 每季节一个传统节日（清明、端午、中秋、春节）
- **序列化**: 需要支持存档/读档

### Requirements
- 游戏时间独立于现实时间流逝
- 支持 4 季节 × 7 天 = 28 天/年周期
- 支持 5 个时段（黎明、早晨、下午、黄昏、夜晚）
- 支持时间暂停和加速
- 支持节日检测和事件发布
- 支持离线时间计算（有上限）

## Decision

采用**可配置时间倍率 + 状态机** 的时间管理架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TimeSystem (单例)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  state: TimeState                                            │   │
│  │  ├── gameHour: number (0-24)                                 │   │
│  │  ├── gameMinute: number (0-59)                               │   │
│  │  ├── gameDay: number (1-28)                                  │   │
│  │  ├── season: Season (SPRING/SUMMER/AUTUMN/WINTER)            │   │
│  │  ├── period: Period (DAWN/MORNING/AFTERNOON/DUSK/NIGHT)      │   │
│  │  ├── speedMultiplier: number                                 │   │
│  │  └── isPaused: boolean                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  update(deltaMs) ───► 累加游戏时间 ───► 检测状态变化 ───► 发布事件  │
└─────────────────────────────────────────────────────────────────────┘
          │
          │ time:minute_changed / hour_changed / day_changed / season_changed
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    其他系统监听                                    │
│  FestivalSystem ───► 监听 day_changed ───► 检测节日临近          │
│  StaminaSystem ───► 监听 period_changed ───► 体力恢复            │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 时间倍率 (Time Scale)
```typescript
const DEFAULT_CONFIG = {
    timeScale: 60,        // 现实 1 分钟 = 游戏 60 分钟
    daysPerSeason: 7,     // 每季节 7 天
    daysPerYear: 28,      // 全年 28 天
    festivalPrepDays: 3   // 节日准备期 3 天
};
```

**计算公式**:
```
游戏分钟增量 = (现实毫秒 / 60000) * timeScale * speedMultiplier
```

#### 2. 季节和时段映射

**季节** (基于 gameDay):
```
season = floor((gameDay - 1) / 7)
// Day 1-7 = SPRING, Day 8-14 = SUMMER, Day 15-21 = AUTUMN, Day 22-28 = WINTER
```

**时段** (基于 gameHour):
```
DAWN = 5-6, MORNING = 6-12, AFTERNOON = 12-18, DUSK = 18-20, NIGHT = 20-5
```

#### 3. 节日系统

```typescript
const DEFAULT_FESTIVALS: Festival[] = [
    { id: 'qingming', name: '清明', season: Season.SPRING, dayInSeason: 7 },
    { id: 'duanwu', name: '端午', season: Season.SUMMER, dayInSeason: 7 },
    { id: 'zhongqiu', name: '中秋', season: Season.AUTUMN, dayInSeason: 7 },
    { id: 'chunjie', name: '春节', season: Season.WINTER, dayInSeason: 7 }
];
```

每个节日在每季节的最后一天（dayInSeason = 7）。

### Key Interfaces

```typescript
interface ITimeSystem {
    update(deltaMs: number): void;
    getGameHour(): number;
    getGameMinute(): number;
    getGameDay(): number;
    getCurrentSeason(): Season;
    getCurrentPeriod(): Period;
    getDaysUntilFestival(festivalId: string): number;
    getCurrentSeasonFestival(): Festival | undefined;
    pause(): void;
    resume(): void;
    setSpeedMultiplier(multiplier: number): void;
    exportState(): TimeState;
    importState(state: TimeState): void;
}
```

## Alternatives Considered

### Alternative 1: 实时时间
- **Description**: 使用现实世界时间
- **Pros**:
  - 无需时间管理
- **Cons**:
  - 玩家只能在特定时间游玩
  - 节日无法与游戏同步
- **Rejection Reason**: 不符合游戏设计，玩家应该能随时推进游戏

### Alternative 2: 固定回合制
- **Description**: 玩家行动消耗回合，回合推进时间
- **Pros**:
  - 精确控制游戏节奏
- **Cons**:
  - 不符合休闲模拟游戏类型
  - 增加玩家压力
- **Rejection Reason**: 不符合"治愈系"游戏定位

### Alternative 3: 无限时间
- **Description**: 时间只在玩家操作时推进
- **Cons**:
  - 失去时间压力感
  - 节日系统失去意义
- **Rejection Reason**: 节日筹备是核心循环，需要时间限制

## Consequences

### Positive
- 沉浸感：时间流逝增强代入感
- 节奏控制：时间倍率可调节游戏节奏
- 事件驱动：时间变化自动通知相关系统
- 离线奖励：支持离线时间计算

### Negative
- 复杂度：需要管理时间状态和事件
- 边界情况：跨天/季节/年的计算需要仔细处理

### Risks
- **时间跳跃**: 玩家修改设备时间作弊
  - *缓解*: 使用服务器时间或限制离线计算上限
- **事件风暴**: 快进时大量事件触发
  - *缓解*: 合并同类事件，只发布最终状态

## Performance Implications
- **CPU**: update() 每帧调用，开销 < 0.01ms
- **Memory**: < 1KB（状态存储）
- **Events**: 平均每游戏小时 1 个事件

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 时间倍率正确计算
- [x] 季节/时段正确映射
- [x] 节日检测正确触发
- [x] 离线时间计算有上限
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [时间系统设计文档](../../design/gdd/time-system.md)
