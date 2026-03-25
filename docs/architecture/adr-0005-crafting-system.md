# ADR-0005: 手工艺系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》的核心玩法是制作传统节日物品（月饼、粽子、灯笼等）。需要一个手工艺系统来：
1. 将制作过程游戏化（而非简单点击完成）
2. 支持多种制作类型的迷你游戏
3. 根据玩家表现给予不同品质奖励
4. 追踪熟练度（制作次数影响时间/成功率）

### Constraints
- **平台限制**: 微信小游戏触屏操作
- **设计要求**: 制作过程有"仪式感"和"节奏感"
- **多样性**: 4 种节日需要不同类型的迷你游戏
- **序列化**: 需要保存制作进度和熟练度

### Requirements
- 支持多种迷你游戏类型（揉捏、折叠、剪裁、组装、调配）
- 制作阶段状态机（选食谱 → 确认材料 → 迷你游戏 → 完成/重试）
- 品质判定（普通/高品质）
- 熟练度系统（制作次数解锁加成）
- 消耗材料、消耗体力、产出成品

## Decision

采用**状态机 + 迷你游戏插件** 的手工艺架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CraftingSystem (单例)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  状态机: CraftingStage                                       │   │
│  │  SELECT_RECIPE → CONFIRM_MATERIALS → PLAYING → SUCCESS/RETRY │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  迷你游戏插件 (Strategy Pattern)                             │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │   │
│  │  │ KneadGame│ FoldGame │ CutGame  │Assemble  │ MixGame   │  │   │
│  │  │ 揉捏类   │ 折叠类   │ 剪裁类   │ 组装类   │ 调配类    │  │   │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  startCrafting(recipeId) → playMiniGame() → evaluateResult()       │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 制作阶段状态机

```typescript
enum CraftingStage {
    SELECT_RECIPE,       // 选择食谱
    CONFIRM_MATERIALS,   // 确认材料
    PLAYING,             // 进行迷你游戏
    SUCCESS,             // 成功完成
    RETRY                // 重试
}
```

**状态转换**:
- `SELECT_RECIPE` → `CONFIRM_MATERIALS`: 玩家选择食谱
- `CONFIRM_MATERIALS` → `PLAYING`: 玩家确认开始制作
- `PLAYING` → `SUCCESS`: 迷你游戏通过
- `PLAYING` → `RETRY`: 迷你游戏失败，可选择重试
- `RETRY` → `PLAYING`: 玩家选择重试
- `SUCCESS` → `SELECT_RECIPE`: 制作完成，返回选择

#### 2. 迷你游戏类型

```typescript
enum MiniGameType {
    KNEAD,      // 揉捏类（月饼、汤圆）- 节奏点击
    FOLD,       // 折叠类（粽子、饺子）- 滑动折叠
    CUT,        // 剪裁类（剪纸、窗花）- 路径描绘
    ASSEMBLE,   // 组装类（灯笼、风筝）- 拖拽组装
    MIX         // 调配类（年糕、酱料）- 配比调整
}
```

**设计要点**:
- 每种迷你游戏实现 `MiniGameBase` 接口
- 迷你游戏有多个阶段（如月饼的揉面 → 包馅 → 压模）
- 每个阶段有准确度判定

#### 3. 品质与熟练度

```typescript
enum Quality {
    NORMAL,   // 普通品质（标准准确度）
    HIGH      // 高品质（高准确度 + 可选材料）
}

enum MasteryLevel {
    NOVICE = 1,    // 新手 (0-4次) - 标准时间
    APPRENTICE = 2, // 入门 (5-9次) - 10% 时间减免
    SKILLED = 3,    // 熟练 (10-19次) - 20% 时间减免
    MASTER = 4      // 精通 (20+次) - 30% 时间减免 + 高品质概率提升
}
```

**熟练度加成**:
- 时间限制更宽松
- 高品质产出概率提升
- 不影响基础成功率（保持游戏挑战性）

### Key Interfaces

```typescript
interface ICraftingSystem {
    startCrafting(recipeId: string): boolean;
    confirmMaterials(): boolean;
    playMiniGameStage(): MiniGameResult;
    completeCrafting(): CraftingResult;
    retry(): boolean;
    cancelCrafting(): void;
    getProgress(recipeId: string): CraftingProgress;
    getSession(): CraftingSession | null;
}

interface MiniGameBase {
    type: MiniGameType;
    stages: MiniGameStage[];
    start(): void;
    handleInput(input: GameInput): void;
    evaluate(): MiniGameResult;
}
```

## Alternatives Considered

### Alternative 1: 即时制作
- **Description**: 点击即完成，无迷你游戏
- **Pros**:
  - 实现简单
  - 快速获得成品
- **Cons**:
  - 失去"仪式感"
  - 核心玩法单调
- **Rejection Reason**: 设计核心是"有节奏的互动体验"，即时制作违背设计目标

### Alternative 2: 单一迷你游戏
- **Description**: 所有物品使用同一迷你游戏
- **Pros**:
  - 开发成本低
- **Cons**:
  - 重复感强
  - 不同节日物品无差异
- **Rejection Reason**: 设计要求不同节日有独特体验

### Alternative 3: QTE 快速反应
- **Description**: 快速按键反应类游戏
- **Pros**:
  - 紧张刺激
- **Cons**:
  - 不符合"治愈系"定位
  - 对手残玩家不友好
- **Rejection Reason**: 游戏定位是"治愈系"，需要轻松愉快的体验

## Consequences

### Positive
- 沉浸感：制作过程增强代入感
- 多样性：5 种迷你游戏提供丰富体验
- 进度感：熟练度系统奖励长期玩家
- 品质差异：高品质物品激励玩家提升技术

### Negative
- 开发成本：5 种迷你游戏需要分别开发
- 复杂度：状态机和多阶段增加代码复杂度

### Risks
- **迷你游戏太难**: 玩家挫败感
  - *缓解*: 熟练度降低难度，允许重试
- **迷你游戏太简单**: 失去乐趣
  - *缓解*: 高品质需要高准确度，保持挑战
- **重复感**: 多次制作同一物品感到无聊
  - *缓解*: 熟练度奖励、跳过动画选项

## Performance Implications
- **CPU**: 迷你游戏渲染 < 5ms/帧
- **Memory**: 迷你游戏资源按需加载
- **Storage**: 熟练度数据 < 1KB

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 制作流程完整：选食谱 → 消耗材料 → 迷你游戏 → 产出成品
- [x] 品质判定正确
- [x] 熟练度系统生效
- [x] 体力消耗正确
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [手工艺系统设计文档](../../design/gdd/crafting-system.md)
- [食谱系统设计文档](../../design/gdd/recipe-system.md)
