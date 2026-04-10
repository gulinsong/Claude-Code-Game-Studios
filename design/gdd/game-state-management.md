# 游戏状态管理 (Game State Management)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 策略简洁

## Overview

游戏状态管理负责追踪和协调游戏运行时的所有状态数据，包括线段配额（已画/剩余线数）、收集进度（已收集/总光点数）、游戏阶段（准备/进行中/暂停/胜利/失败）、当前关卡信息、计时器和分数。它是游戏逻辑的"中央大脑"，为其他系统提供状态查询接口（如"还能画线吗？"），并在状态变化时通知相关系统。玩家不直接操作此系统，但每一次有意义的游戏行为（画线、收集、暂停、过关）都依赖它来记录和响应。没有游戏状态管理，游戏将无法追踪进度、无法判定胜负、无法正确处理暂停恢复。

## Player Fantasy

玩家应该感觉游戏状态是**透明、公平且可预测的**——他们随时知道"还剩几条线"、"还差几个光点就能过关"。状态不是隐藏的谜题，而是帮助玩家做策略决策的明确信息。

暂停游戏后恢复，玩家期望一切"停在原地"——球的位置和速度、已画的线段、收集进度都精确保持。这是一种安全感：我可以随时暂停，不会失去任何进度。

过关或失败后，玩家期望状态"干净地重置"——新的一关是全新的开始，不会继承上一关的线段或光点。但累计分数和关卡进度应该跨关卡保留，让玩家感受到整体进度在增长。

**关键体验目标**:
- **掌控感**: 状态清晰可见，玩家能基于信息做策略决策
- **安全感**: 暂停不会丢失进度，恢复后精确继续
- **公平感**: 每关起点一致，胜负判定透明

## Detailed Design

### Core Rules

**1. 状态数据结构**：

游戏状态管理追踪以下数据：

| 数据项 | 类型 | 初始值 | 来源 | 说明 |
|--------|------|--------|------|------|
| `currentPhase` | enum | `READY` | 关卡开始 | 游戏阶段 |
| `linesUsed` | number | 0 | 关卡开始 | 已使用线段数 |
| `linesRemaining` | number | 3 | 关卡配置 | 剩余线段数 |
| `lightPointsCollected` | number | 0 | 关卡开始 | 已收集光点数 |
| `lightPointsTotal` | number | 关卡配置 | 关卡配置 | 本关总光点数 |
| `currentLevelId` | string | — | 关卡系统 | 当前关卡 ID |
| `sessionTime` | number | 0 | 关卡开始 | 本局时间（秒） |
| `isPaused` | boolean | false | 关卡开始 | 是否暂停 |

**2. 游戏阶段枚举**：

```
READY       → 准备阶段（球未发射，可画线）
PLAYING     → 进行中（球已发射，可画线如果还有配额）
PAUSED      → 暂停（一切冻结）
VICTORY     → 胜利（所有光点收集完成）
DEFEAT      → 失败（球出界）
```

**3. 线段配额规则**：
- 每关线段配额由关卡配置决定，默认 `MAX_LINES_PER_LEVEL = 3`
- 玩家画线确认后，`linesUsed++`，`linesRemaining--`
- 线段配额**不会恢复**——画了就是画了，除非重开关卡
- 当 `linesRemaining === 0` 时，`canDrawLine()` 返回 `false`

**4. 胜负判定规则**：
- **胜利**: `lightPointsCollected === lightPointsTotal` → 阶段变为 `VICTORY`
- **失败**: 球出界（由出界检测系统触发）→ 阶段变为 `DEFEAT`

**5. 暂停/恢复规则**：
- `PAUSED` 状态下：
  - 物理模拟停止
  - 碰撞回调被忽略
  - 计时器暂停
  - 已画的线段保留
- 恢复后精确回到暂停时的状态

**6. 关卡重置规则**：
- 重开关卡时：`linesUsed = 0`，`linesRemaining = MAX_LINES`，`lightPointsCollected = 0`
- 累计分数和已解锁关卡**不**重置（由存档系统管理）

### States and Transitions

**状态机图**：

```
                 ┌──────────────────────────────────────┐
                 │                                      │
                 ▼                                      │
┌─────────┐  发射球  ┌─────────┐  收集完成  ┌─────────┐ │
│  READY  │ ──────► │ PLAYING │ ────────► │ VICTORY │ │
└─────────┘         └─────────┘           └─────────┘ │
     ▲                   │                             │
     │                   │ 暂停                        │
     │                   ▼                             │
     │              ┌─────────┐                        │
     │              │ PAUSED  │◄───────────────────────┤
     │              └─────────┘        恢复             │
     │                   │                             │
     │                   │ 出界                        │ 重开
     │                   ▼                             │
     │              ┌─────────┐                        │
     └──────────────│ DEFEAT  │────────────────────────┘
        重开        └─────────┘
```

**状态转换表**：

| 当前状态 | 触发事件 | 目标状态 | 副作用 |
|---------|---------|---------|--------|
| `READY` | 发射球 | `PLAYING` | 开始计时器 |
| `READY` | 画线 | `READY` | `linesUsed++`, `linesRemaining--` |
| `PLAYING` | 暂停 | `PAUSED` | 停止物理、计时器 |
| `PLAYING` | 所有光点收集 | `VICTORY` | 触发过关效果、更新分数 |
| `PLAYING` | 球出界 | `DEFEAT` | 触发失败效果 |
| `PLAYING` | 画线（有配额） | `PLAYING` | `linesUsed++`, `linesRemaining--` |
| `PAUSED` | 恢复 | `PLAYING` | 恢复物理、计时器 |
| `PAUSED` | 重开 | `READY` | 重置本关状态 |
| `VICTORY` | 下一关 | `READY` | 加载下一关、重置本关状态 |
| `VICTORY` | 重开 | `READY` | 重置本关状态 |
| `DEFEAT` | 重开 | `READY` | 重置本关状态 |

**非法转换**（应该被阻止或忽略）：
- `READY` → `PAUSED`（球未发射，暂停无意义）
- `VICTORY`/`DEFEAT` → `PAUSED`（已结束，暂停无意义）
- `PLAYING` → `READY`（不能倒退到准备阶段）

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **输入系统** | 输入 ← | `canDrawLine(): boolean` | 输入系统询问是否还能画线 |
| **输入系统** | 输出 → | `onLineCountChanged(used: number, remaining: number): void` | 通知线段配额变化 |
| **场景管理** | 输入 ← | `onSceneReady(): void` | 场景加载完成，初始化状态 |
| **场景管理** | 输入 ← | `onSceneUnload(): void` | 场景卸载，清理状态 |
| **场景管理** | 双向 | `getGameState(): GameState` | 获取完整状态（用于存档） |
| **场景管理** | 双向 | `setGameState(state: GameState): void` | 恢复状态（用于读档） |
| **碰撞系统** | 输出 → | `setPaused(paused: boolean): void` | 暂停/恢复碰撞检测 |
| **光点收集系统** | 输入 ← | `onLightPointCollected(lightPointId: string): void` | 光点被收集，更新计数 |
| **出界检测系统** | 输入 ← | `onBallOutOfBounds(): void` | 球出界，触发失败状态 |
| **视觉反馈系统** | 输出 → | `onPhaseChanged(phase: GamePhase): void` | 阶段变化通知（触发过关/失败效果） |
| **音频系统** | 输出 → | `onPhaseChanged(phase: GamePhase): void` | 阶段变化通知（播放音效） |
| **关卡系统** | 输入 ← | `onLevelStart(levelId: string, config: LevelConfig): void` | 关卡开始，初始化状态 |
| **星级评价系统** | 输出 → | `getState(): GameState` | 提供状态用于评价计算 |
| **UI系统** | 输出 → | `getState(): GameState` | 提供状态用于 UI 显示 |
| **存档系统** | 输出 → | `getState(): GameState` | 提供状态用于持久化 |

**接口定义**：

```typescript
interface GameState {
  currentPhase: GamePhase;
  linesUsed: number;
  linesRemaining: number;
  lightPointsCollected: number;
  lightPointsTotal: number;
  currentLevelId: string;
  sessionTime: number;
  isPaused: boolean;
}

interface GameStateManager {
  // 状态查询
  getState(): GameState;
  canDrawLine(): boolean;
  getCurrentPhase(): GamePhase;
  hasPendingVictory(): boolean;

  // 事件接收
  onLineCountChanged(used: number, remaining: number): void;
  onLightPointCollected(lightPointId: string): void;
  onBallOutOfBounds(): void;
  onLevelStart(levelId: string, config: LevelConfig): void;

  // 状态控制
  setGameState(state: GameState): void;
  pause(): void;
  resume(): void;
  restartLevel(): void;
}

interface LevelConfig {
  levelId: string;
  maxLines: number;
  lightPointCount: number;
  timeLimit: number;
}

enum GamePhase {
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT'
}
```

## Formulas

### 线段配额计算

```
linesRemaining = maxLines - linesUsed
canDrawLine = (linesRemaining > 0) AND (currentPhase === READY OR currentPhase === PLAYING)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| maxLines | number | 1-10 | 关卡配置 | 本关最大线段数 |
| linesUsed | number | 0-maxLines | 玩家行为 | 已使用线段数 |
| linesRemaining | number | 0-maxLines | 计算得出 | 剩余线段数 |

### 收集进度计算

```
collectionProgress = lightPointsCollected / lightPointsTotal
collectionPercentage = collectionProgress * 100
isVictory = (lightPointsCollected >= lightPointsTotal) AND (currentPhase === PLAYING)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| lightPointsCollected | number | 0-lightPointsTotal | 玩家行为 | 已收集光点数 |
| lightPointsTotal | number | 1-50 | 关卡配置 | 本关总光点数 |
| collectionProgress | number | 0.0-1.0 | 计算得出 | 收集进度比例 |
| collectionPercentage | number | 0-100 | 计算得出 | 收集进度百分比 |

### 暂停状态判断

```
isPaused = (currentPhase === PAUSED)
isGameActive = (currentPhase === READY OR currentPhase === PLAYING)
isGameEnded = (currentPhase === VICTORY OR currentPhase === DEFEAT)
```

### 会话时间

```
sessionTime += deltaTime (仅当 currentPhase === PLAYING)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| sessionTime | number | 0-∞ | 累计 | 本局时间（秒） |
| deltaTime | number | 0-0.1 | 引擎 | 帧间隔时间 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **关卡配置 maxLines = 0** | 拒绝加载关卡，报错"关卡配置无效" | 零线段关卡无法游玩 |
| **lightPointsTotal = 0** | 拒绝加载关卡，报错"关卡配置无效" | 零光点关卡无法胜利 |
| **画线时 linesRemaining = 0** | `canDrawLine()` 返回 false，忽略画线输入 | 配额耗尽，不能画线 |
| **暂停时发生碰撞** | 碰撞回调被忽略（碰撞系统已暂停） | 暂停意味着一切冻结 |
| **恢复时球已出界**（极端情况） | 恢复后下一帧检测到出界，触发失败 | 恢复精确继续，不回滚 |
| **VICTORY/DEFEAT 后继续收到光点收集事件** | 忽略事件（状态已结束） | 防止状态混乱 |
| **快速连续暂停/恢复** | 只响应最新的状态，中间状态被覆盖 | 防止状态抖动 |
| **关卡未调用 onLevelStart** | 使用默认配置（maxLines=3, lightPointsTotal=0） | 优雅降级，但 lightPointsTotal=0 会导致无法胜利 |
| **setGameState() 传入无效状态** | 拒绝设置，保持当前状态，记录警告 | 防止存档损坏导致崩溃 |
| **sessionTime 溢出**（极长时间） | 上限 3600 秒（1小时），超过不再增加 | 防止数值溢出 |
| **球发射前就调用 onBallOutOfBounds()** | 忽略（球未发射，不应该有出界检测） | 防止误触发 |
| **同一帧内收集最后一个光点 + 球出界** | 优先处理收集（胜利），忽略出界 | 胜利优先于失败，给玩家"惊险过关"的体验 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **场景管理** | 输入 ← | 硬依赖：场景加载完成时初始化状态；场景卸载时清理状态 | Approved |
| **输入系统** | 双向 | 软依赖：提供 `canDrawLine()` 查询；接收线数变化通知需求 | Approved |
| **碰撞系统** | 输出 → | 软依赖：暂停时通知碰撞系统忽略回调 | Approved |
| **光点收集系统** | 输入 ← | 软依赖：接收收集事件，更新计数 | Approved |
| **出界检测系统** | 输入 ← | 软依赖：接收出界事件，触发失败状态 | Approved |
| **视觉反馈系统** | 输出 → | 软依赖：阶段变化时通知播放效果 | Approved |
| **音频系统** | 输出 → | 软依赖：阶段变化时通知播放音效 | Approved |
| **关卡系统** | 输入 ← | 软依赖：关卡开始时接收配置 | Approved |
| **星级评价系统** | 输出 → | 软依赖：提供状态用于评价计算 | Approved |
| **UI系统** | 输出 → | 软依赖：提供状态用于 UI 显示 | Approved |
| **存档系统** | 输出 → | 软依赖：提供状态用于持久化 | 未设计 |
| **排行榜系统** | 输出 → | 软依赖：提供状态用于排行榜 | 未设计 |

**依赖性质分析**：
- **场景管理**：**硬依赖**——没有场景生命周期通知，无法正确初始化和清理状态
- **输入系统**：**软依赖**——可以不依赖输入系统工作，但输入系统需要 `canDrawLine()` 才能正确限制画线
- **其他系统**：**软依赖**——游戏状态管理是被动服务提供者，即使下游系统不存在，核心功能仍可工作

**注意**：游戏状态管理是 Core 层，只硬依赖 Foundation 层的场景管理。所有依赖它的系统都在 Feature 或 Presentation 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **MAX_LINES_PER_LEVEL** | 3 | 1-10 | 策略更宽松，更容易过关 | 策略更紧张，难度更高 |
| **MAX_SESSION_TIME** | 3600s | 600-7200 | 允许更长的单局时间 | 限制超长对局 |
| **PAUSE_COOLDOWN** | 0ms | 0-500ms | 防止快速暂停/恢复抖动 | 立即响应暂停 |

**交互影响**：
- `MAX_LINES_PER_LEVEL` 与关卡设计直接相关——关卡设计应基于此值决定光点数量和位置
- `MAX_SESSION_TIME` 对大多数关卡无影响（关卡通常 < 60 秒），但对无尽模式可能有意义

**与关卡系统的关系**：
- `MAX_LINES_PER_LEVEL` 是**默认值**——关卡系统可以通过 `LevelConfig.maxLines` 覆盖
- 这允许特殊关卡有不同的线段配额（如教程关卡可能给 5 条线）

## Visual/Audio Requirements

游戏状态管理是纯逻辑系统，没有直接的视觉/音频需求。但状态变化会触发其他系统的反馈：

| Event | Visual System | Audio System |
|-------|--------------|--------------|
| Phase → VICTORY | `playWinEffect()` | `playSound('win')` |
| Phase → DEFEAT | `playLoseEffect()` | `playSound('lose')` |
| Line count changed | UI 更新线段计数 | 无 |
| Pause | 暂停菜单显示 | 背景音乐暂停 |
| Resume | 暂停菜单隐藏 | 背景音乐恢复 |

## UI Requirements

游戏状态管理为 UI 系统提供数据：

| UI Element | Data Source | Update Frequency |
|------------|-------------|------------------|
| 线段计数器 | `linesUsed` / `linesRemaining` | 每次画线 |
| 收集进度 | `lightPointsCollected` / `lightPointsTotal` | 每次收集 |
| 暂停按钮 | `isGameActive` | 阶段变化 |
| 胜利/失败弹窗 | `currentPhase` | 阶段变化 |

## Acceptance Criteria

### 功能验收

- [ ] `canDrawLine()` 在 `linesRemaining > 0` 且 `currentPhase` 为 READY 或 PLAYING 时返回 true
- [ ] `canDrawLine()` 在 `linesRemaining === 0` 时返回 false
- [ ] `canDrawLine()` 在 `currentPhase` 为 PAUSED/VICTORY/DEFEAT 时返回 false
- [ ] `onLightPointCollected()` 正确增加 `lightPointsCollected` 计数
- [ ] 当 `lightPointsCollected === lightPointsTotal` 时，`currentPhase` 变为 VICTORY
- [ ] `onBallOutOfBounds()` 将 `currentPhase` 变为 DEFEAT
- [ ] `getGameState()` 返回完整的当前状态快照
- [ ] `setGameState()` 正确恢复状态

### 状态转换验收

- [ ] READY → PLAYING（发射球）正确转换
- [ ] PLAYING → PAUSED（暂停）正确转换
- [ ] PAUSED → PLAYING（恢复）正确转换
- [ ] PLAYING → VICTORY（收集完成）正确转换
- [ ] PLAYING → DEFEAT（出界）正确转换
- [ ] VICTORY/DEFEAT → READY（重开）正确转换
- [ ] 非法转换被正确阻止

### 暂停/恢复验收

- [ ] 暂停时 `isPaused` 为 true
- [ ] 暂停时碰撞系统收到 `setPaused(true)` 调用
- [ ] 暂停时计时器停止
- [ ] 恢复时状态精确恢复到暂停前的值

### 通知验收

- [ ] 线段使用后 `onLineCountChanged()` 被正确调用
- [ ] 阶段变化时 `onPhaseChanged()` 被正确调用
- [ ] 胜利时视觉反馈系统收到通知
- [ ] 失败时视觉反馈系统收到通知

### 边界情况验收

- [ ] 无效关卡配置（maxLines=0）被拒绝
- [ ] VICTORY/DEFEAT 后的光点收集事件被忽略
- [ ] 同一帧内胜利+失败事件，胜利优先

### 性能验收

- [ ] 状态查询 < 0.01ms（内存操作）
- [ ] 状态更新 < 0.1ms
- [ ] 无 GC 压力（无每帧分配）

### 配置验收

- [ ] `MAX_LINES_PER_LEVEL` 可通过配置文件调整
- [ ] 关卡可通过 `LevelConfig.maxLines` 覆盖默认线段配额

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|------------|
| 是否需要"自动暂停"功能（如来电、切后台）？ | 平台适配后决定 | — | 待定 |
| 是否需要"悔棋"功能（撤销最后一条线）？ | 原型测试后决定 | — | 待定（增加复杂度） |
| sessionTime 是否用于星级评价？ | 星级评价系统设计时决定 | — | 待定 |
| 是否需要"超时失败"机制？ | 关卡系统设计时决定 | — | 待定（增加紧张感但可能破坏体验） |
