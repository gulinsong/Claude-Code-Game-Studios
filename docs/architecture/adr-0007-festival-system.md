# ADR-0007: 节日筹备系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》以中国传统节日为核心循环。需要一个节日系统来：
1. 管理 4 个传统节日（清明、端午、中秋、春节）
2. 支持节日三阶段（准备期 → 庆典日 → 余韵期）
3. 追踪节日任务进度和完成度
4. 根据完成度发放不同档次奖励

### Constraints
- **设计要求**: 每季节一个节日，准备期 3 天
- **时间系统**: 依赖 TimeSystem 的季节和日期
- **任务系统**: 节日任务独立于常规任务
- **序列化**: 需要保存节日进度和历史

### Requirements
- 支持节日注册和配置
- 自动检测节日阶段转换
- 任务提交和进度追踪
- 完成度计算和奖励档次判定
- 庆典小游戏参与

## Decision

采用**状态机 + 任务系统** 的节日架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FestivalSystem (单例)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  状态机: FestivalPhase                                       │   │
│  │  NORMAL → PREPARATION → CELEBRATION → AFTERGLOW → NORMAL     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  节日注册表 Map<string, FestivalDefinition>                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ qingming  │ 春季节日 │ 清明 │ 任务列表 │ 奖励列表    │   │   │
│  │  │ duanwu    │ 夏季节日 │ 端午 │ 任务列表 │ 奖励列表    │   │   │
│  │  │ zhongqiu  │ 秋季节日 │ 中秋 │ 任务列表 │ 奖励列表    │   │   │
│  │  │ chunjie   │ 冬季节日 │ 春节 │ 任务列表 │ 奖励列表    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  update() ──► 检测阶段转换 ──► 发布事件 ──► 更新任务状态           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 节日阶段状态机

```typescript
enum FestivalPhase {
    NORMAL,       // 普通日 - 非节日期间
    PREPARATION,  // 准备期 - 节日前 N 天（默认 3 天）
    CELEBRATION,  // 庆典日 - 节日当天
    AFTERGLOW     // 余韵期 - 节日后 1 天
}
```

**状态转换**:
- `NORMAL` → `PREPARATION`: 距离节日 ≤ prepDays 天
- `PREPARATION` → `CELEBRATION`: 节日当天
- `CELEBRATION` → `AFTERGLOW`: 节日次日
- `AFTERGLOW` → `NORMAL`: 余韵期结束

#### 2. 节日定义结构

```typescript
interface FestivalDefinition {
    id: string;              // 节日唯一 ID
    name: string;            // 节日名称
    season: Season;          // 所属季节
    gameDay: number;         // 节日日期（年内第几天，1-28）
    prepDays: number;        // 准备期天数
    description: string;     // 节日描述
    lore: string;            // 文化背景
    tasks: FestivalTaskDefinition[];  // 节日任务
    rewards: Record<RewardTier, FestivalReward[]>;  // 各档次奖励
}
```

**默认节日配置**:
```typescript
const DEFAULT_FESTIVALS = [
    { id: 'qingming', name: '清明', season: SPRING, gameDay: 7 },
    { id: 'duanwu', name: '端午', season: SUMMER, gameDay: 14 },
    { id: 'zhongqiu', name: '中秋', season: AUTUMN, gameDay: 21 },
    { id: 'chunjie', name: '春节', season: WINTER, gameDay: 28 }
];
```

#### 3. 任务进度和完成度

```typescript
interface FestivalTaskProgress extends FestivalTaskDefinition {
    currentAmount: number;   // 当前进度
    completed: boolean;      // 是否已完成
}

// 完成度计算
getCompletionRate(): number {
    const totalContribution = tasks.reduce((sum, t) => sum + t.contribution, 0);
    const earnedContribution = tasks
        .filter(t => t.completed)
        .reduce((sum, t) => sum + t.contribution, 0);
    return (earnedContribution / totalContribution) * 100;
}
```

#### 4. 奖励档次

```typescript
enum RewardTier {
    BASIC,    // 基础 - 0-49% 完成度
    GOOD,     // 良好 - 50-99% 完成度
    PERFECT   // 完美 - 100% 完成度
}

getRewardTier(): RewardTier {
    const rate = this.getCompletionRate();
    if (rate >= 100) return RewardTier.PERFECT;
    if (rate >= 50) return RewardTier.GOOD;
    return RewardTier.BASIC;
}
```

### Key Interfaces

```typescript
interface IFestivalSystem {
    // 节日注册
    registerFestival(festival: FestivalDefinition): void;
    getFestival(id: string): FestivalDefinition | null;

    // 状态查询
    getCurrentPhase(): FestivalPhase;
    getCurrentFestival(): FestivalDefinition | null;
    getNextFestival(): FestivalDefinition | null;
    getDaysUntilNextFestival(): number;
    isFestivalPeriod(): boolean;

    // 任务系统
    getTaskProgress(taskId: string): FestivalTaskProgress | null;
    submitTask(taskId: string, amount: number): { success: boolean; reason?: string };
    getCompletionRate(): number;
    getRewardTier(): RewardTier;

    // 庆典系统
    canPlayCelebration(): boolean;
    playCelebrationGame(gameId: string): CelebrationResult;

    // 奖励系统
    claimRewards(): FestivalReward[];
    hasClaimedRewards(): boolean;

    // 系统更新
    update(): void;
    setTimeProvider(provider: ITimeProvider): void;
}
```

## Alternatives Considered

### Alternative 1: 固定节日脚本
- **Description**: 每个节日硬编码为独立的脚本/场景
- **Pros**:
  - 每个节日可以有独特逻辑
- **Cons**:
  - 代码重复
  - 添加新节日需要修改代码
- **Rejection Reason**: 节日结构相似，应使用数据驱动

### Alternative 2: 无阶段区分
- **Description**: 节日期间所有活动同时开放
- **Pros**:
  - 实现简单
- **Cons**:
  - 失去"准备→庆典→余韵"的节奏感
  - 玩家可能错过准备期任务
- **Rejection Reason**: 设计要求三阶段节奏

### Alternative 3: 节日任务合并到主任务系统
- **Description**: 节日任务作为 QuestSystem 的子集
- **Pros**:
  - 统一任务管理
- **Cons**:
  - 节日任务需要特殊逻辑（限时、贡献度）
  - QuestSystem 变得复杂
- **Rejection Reason**: 节日任务有独特的贡献度和奖励机制，独立管理更清晰

### Alternative 4: 单一奖励档次
- **Description**: 完成所有任务获得固定奖励
- **Pros**:
  - 实现简单
- **Cons**:
  - 失去"完美完成"的动力
  - 部分完成的玩家得不到合适奖励
- **Rejection Reason**: 档次奖励激励玩家尽可能完成任务

## Consequences

### Positive
- 数据驱动：添加新节日只需配置，无需改代码
- 节奏感：三阶段设计增强节日体验
- 动力：档次奖励激励玩家努力准备
- 灵活：任务系统支持多种任务类型

### Negative
- 复杂度：状态机和任务系统增加代码量
- 配置量：每个节日需要大量配置数据

### Risks
- **准备期任务太难**: 玩家无法达到完美完成
  - *缓解*: 任务难度适中，贡献度可调整
- **准备期太空**: 节日前几天无事可做
  - *缓解*: 任务分布均匀，每日解锁新任务
- **错过节日**: 玩家在节日期间未登录
  - *缓解*: 余韵期可补领部分奖励

## Performance Implications
- **CPU**: update() 每日调用，开销可忽略
- **Memory**: 节日数据 < 10KB
- **Events**: 阶段转换时发布事件

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 节日阶段正确转换
- [x] 任务进度正确追踪
- [x] 完成度计算正确
- [x] 奖励档次判定正确
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [ADR-0003: 时间系统架构](adr-0003-time-system.md)
- [节日筹备系统设计文档](../../design/gdd/festival-system.md)
