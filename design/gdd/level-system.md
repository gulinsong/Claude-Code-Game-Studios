# 关卡系统 (Level System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-04-04
> **Implements Pillar**: 策略简洁, 一球清台

## Overview

关卡系统负责管理游戏所有关卡的生命周期，包括关卡加载、世界结构、进度解锁和难度递进。它将关卡数据以 JSON 配置文件的形式存储，使用归一化坐标（0-1 范围）确保在所有设备上一致的体验。关卡系统为场景管理和游戏状态管理提供关卡配置数据，是"选择关卡 -> 进入游戏"流程的核心枢纽。对于玩家来说，关卡系统是**进度和成长的载体**——每通过一关获得星星，积累星星解锁新世界，这种递进感驱动着长期留存。没有关卡系统，游戏没有结构化内容，只是无意义的重复弹球。

## Player Fantasy

玩家应该感觉进度是**清晰且可预测的**——他们知道自己在哪个世界、哪一关，知道还需要多少星星才能解锁下一个世界。世界地图应该像一个旅程：从简单的"新手村"开始，逐步走向更具挑战的"高手领域"。

每次进入新世界，玩家应该感到**新鲜感和期待**——新的布局风格、更复杂的光点排列、更具策略性的挑战。但核心玩法始终是"画线 -> 弹球 -> 收集"，关卡系统的变化是"量"而非"质"——更少的光点容错、更刁钻的位置、更紧张的线段配额。

玩家应该感到**成就感驱动前进**——3星通关是技能证明，不是随机运气。积累星星解锁新世界是投资回报，不是无意义的数字增长。

**关键体验目标**：
- **掌控感**：玩家知道自己在进度中的位置，知道下一步去哪
- **新鲜感**：每个世界有独特的布局风格和难度特征
- **成就感**：3星通关和解锁新世界都是值得炫耀的里程碑

**参考游戏**：
- **割绳子**：世界解锁 + 星星收集的进度系统
- **愤怒的小鸟**：章节划分 + 难度递进

## Detailed Design

### Core Rules

**1. 世界结构**

游戏包含 4 个世界（World），每个世界包含 8 个关卡（Level），共 32 个关卡。

| World | Name | Theme | Difficulty | Total Stars Available |
|-------|------|-------|------------|-----------------------|
| 1 | 基础训练 (Basic Training) | Tutorial | Beginner | 24 |
| 2 | 反弹进阶 (Bounce Advanced) | Intermediate | Intermediate | 24 |
| 3 | 精准规划 (Precision Planning) | Advanced | Advanced | 24 |
| 4 | 大师挑战 (Master Challenge) | Expert | Expert | 24 |

**累计星星上限**: 96 颗（4 个世界 x 8 关 x 3 星）

**2. 关卡 ID 格式**

关卡 ID 采用 `{world}-{level}` 格式，其中：
- `world`: 世界编号，1-4
- `level`: 关卡编号，1-8

示例: `"1-1"` (世界1-关卡1), `"3-7"` (世界3-关卡7)

**3. 世界解锁规则**

世界解锁基于**累计星星数**（cumulative stars），而非单关通过数。

| World | Unlock Threshold (A) | Cumulative Stars Needed | Rationale |
|-------|---------------------|------------------------|-----------|
| 1 | 0 | 0 | 初始解锁 |
| 2 | 7 | 7 stars | 约需世界1中2星通关4关或3星通关3关 |
| 3 | 18 | 18 stars | 约需世界1+2中平均2.25星/关 |
| 4 | 33 | 33 stars | 约需世界1+2+3中平均2.06星/关 |

**解锁公式**:
```
isWorldUnlocked(world) = (cumulativeStars >= WORLD_UNLOCK_THRESHOLDS[world])
```

其中 `WORLD_UNLOCK_THRESHOLDS = [0, 7, 18, 33]`

**进度比例**（用于 UI 显示解锁进度条）:
```
unlockProgress(world) = clamp(cumulativeStars / WORLD_UNLOCK_THRESHOLDS[world], 0, 1)
```

**4. 关卡解锁规则**

- 世界内的关卡按顺序解锁
- 前一关通过（至少 1 星）即可解锁下一关
- 关卡 1 始终解锁（世界解锁后）

```
isLevelUnlocked(world, level) =
    isWorldUnlocked(world) AND
    (level === 1 OR hasCompletedLevel(world, level - 1))
```

**5. 关卡配置格式（JSON）**

关卡数据以 JSON 格式存储，使用归一化坐标（0-1 范围）。运行时由关卡系统将归一化坐标转换为像素坐标。

```json
{
  "id": "1-1",
  "world": 1,
  "level": 1,
  "name": "First Bounce",
  "difficulty": 0.1,
  "ball": {
    "spawn": { "x": 0.5, "y": 0.85 },
    "direction": -90
  },
  "lightPoints": [
    { "x": 0.3, "y": 0.5 },
    { "x": 0.7, "y": 0.5 }
  ],
  "starThresholds": {
    "one": 1,
    "two": 2,
    "three": 2
  },
  "maxLines": 5,
  "timeLimit": 0,
  "obstacles": []
}
```

**字段定义**：

| Field | Type | Range | Required | Description |
|-------|------|-------|----------|-------------|
| id | string | "{1-4}-{1-8}" | Yes | 关卡唯一标识 |
| world | number | 1-4 | Yes | 所属世界 |
| level | number | 1-8 | Yes | 世界内序号 |
| name | string | non-empty | Yes | 关卡显示名称 |
| difficulty | number | 0.0-1.0 | Yes | 难度评分（设计参考） |
| ball.spawn | {x, y} | 0.0-1.0 | Yes | 球发射位置（归一化） |
| ball.direction | number | -180 to 180 | No | 发射角度（度），默认 -90（向下） |
| lightPoints | [{x, y}] | 0.0-1.0 | Yes | 光点位置数组（归一化），最少 1 个 |
| starThresholds.one | number | 1-lightPoints.length | Yes | 1 星阈值（收集数量） |
| starThresholds.two | number | starThresholds.one-lightPoints.length | Yes | 2 星阈值 |
| starThresholds.three | number | starThresholds.two-lightPoints.length | Yes | 3 星阈值 |
| maxLines | number | 1-10 | No | 本关最大线段数，默认 3 |
| timeLimit | number | 0-300 | No | 时间限制（秒），0 = 无限制 |
| obstacles | [Obstacle] | — | No | 障碍物列表（未来扩展） |

**6. 归一化坐标系**

归一化坐标将游戏区域映射到 0-1 范围：
- `(0, 0)` = 可玩区域左下角
- `(1, 1)` = 可玩区域右上角
- `(0.5, 0.5)` = 可玩区域中心

坐标转换在关卡加载时一次性完成：
```
pixelX = normalizedX * playableWidth + leftBoundary
pixelY = normalizedY * playableHeight + bottomBoundary
```

其中 `playableWidth`、`playableHeight`、`leftBoundary`、`bottomBoundary` 来自边界系统。

**7. 难度递进设计**

每个世界有独特的难度特征：

| World | Difficulty Range | Light Points per Level | Max Lines | Key Challenge |
|-------|-----------------|----------------------|-----------|---------------|
| 1: 基础训练 | 0.05 - 0.30 | 2-4 | 3 (个别 4-5) | 学习画线、反弹、出界 |
| 2: 反弹进阶 | 0.30 - 0.55 | 3-6 | 3 | 角度规划、多光点路径 |
| 3: 精准规划 | 0.55 - 0.75 | 4-8 | 2-3 | 精确位置、少线段策略 |
| 4: 大师挑战 | 0.75 - 0.95 | 5-10 | 2-3 | 高难度布局、极限策略 |

**8. 关卡生命周期**

```
[关卡选择] → loadLevel(id) → 初始化配置 → [READY]
    → 发射球 → [PLAYING] → 胜利/失败 → [VICTORY/DEFEAT]
    → 下一关/重试/返回关卡选择
```

关卡系统在关卡加载时负责：
1. 读取 JSON 配置文件
2. 将归一化坐标转换为像素坐标
3. 通知场景管理创建游戏场景
4. 通知游戏状态管理初始化关卡状态（maxLines, lightPointsTotal）
5. 通知球物理系统设置发射位置和方向
6. 通知光点收集系统创建光点

### States and Transitions

**关卡状态机**：

```
┌─────────────┐  loadLevel()  ┌─────────────┐
│   Locked    │ ────────────► │   Loaded    │
└─────────────┘               └─────────────┘
                                   │
                          levelComplete()
                                   │
                                   ▼
                              ┌─────────────┐
                              │  Completed  │
                              └─────────────┘
                                   │
                          resetProgress()
                                   │
                                   ▼
                              ┌─────────────┐
                              │   Locked    │
                              └─────────────┘
```

**状态定义**：

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Locked** | 世界未解锁或前置关卡未完成 | 解锁条件满足 | 关卡不可选，显示锁定图标 |
| **Available** | 解锁条件满足且从未通过 | 玩家选择进入 | 关卡可选，显示"NEW"标记 |
| **Loaded** | 玩家选择关卡且配置加载成功 | 胜利或失败 | 关卡配置已注入各系统 |
| **Completed** | 关卡胜利，记录星星数 | — | 关卡显示已获星星数，可重玩 |

**关卡进度数据结构**：

```typescript
interface LevelProgress {
  levelId: string;           // 关卡 ID，如 "1-3"
  bestStars: number;         // 最佳星星数 0-3
  completed: boolean;        // 是否通过（至少 1 星）
  attempts: number;          // 尝试次数
  bestTime: number;          // 最佳通关时间（秒），0 = 未通过
}

interface WorldProgress {
  worldId: number;           // 世界编号 1-4
  unlocked: boolean;         // 是否解锁
  levels: LevelProgress[];   // 8 个关卡的进度
}

interface GameProgress {
  worlds: WorldProgress[];   // 4 个世界的进度
  totalStars: number;        // 累计星星数
  lastPlayedLevel: string;   // 最后玩的关卡 ID
}
```

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **场景管理** | 输出 -> | `loadLevel(levelId: string): void` | 请求加载指定关卡 |
| **场景管理** | 输出 -> | `returnToLevelSelect(): void` | 返回关卡选择界面 |
| **游戏状态管理** | 输出 -> | `onLevelStart(levelId: string, config: LevelConfig): void` | 传递关卡配置 |
| **球物理系统** | 输出 -> | `getBallSpawnPosition(): Vec2` | 提供球发射位置 |
| **球物理系统** | 输出 -> | `getBallSpawnDirection(): number` | 提供球发射方向 |
| **光点收集系统** | 输出 -> | `getLightPointPositions(): Vec2[]` | 提供光点位置列表 |
| **星级评价系统** | 输入 <- | `onLevelComplete(stars: number, time: number): void` | 接收关卡完成结果 |
| **存档系统** | 输出 -> | `getProgress(): GameProgress` | 提供完整进度数据 |
| **存档系统** | 输入 <- | `loadProgress(progress: GameProgress): void` | 恢复进度数据 |
| **UI系统** | 输出 -> | `getWorldList(): WorldInfo[]` | 提供世界列表及解锁状态 |
| **UI系统** | 输出 -> | `getLevelList(worldId: number): LevelInfo[]` | 提供世界内关卡列表 |

**关卡配置接口（传递给游戏状态管理）**：

```typescript
interface LevelConfig {
  levelId: string;
  maxLines: number;
  lightPointCount: number;
  timeLimit: number;
  // 未来扩展字段
}
```

### Level Data Specifications (World 1-4)

以下是各世界的关卡配置规范。每个关卡的具体 JSON 配置文件存储在 `assets/data/levels/` 目录下，文件名为 `{levelId}.json`（如 `1-1.json`）。

**World 1: 基础训练 (Basic Training)**

| Level | ID | Light Points | Max Lines | Difficulty | Theme |
|-------|----|-------------|-----------|------------|-------|
| 1 | 1-1 | 2 | 5 | 0.05 | 教程：画第一条线 |
| 2 | 1-2 | 2 | 4 | 0.08 | 教程：观察反弹 |
| 3 | 1-3 | 3 | 3 | 0.12 | 教程：3条线限制 |
| 4 | 1-4 | 3 | 3 | 0.16 | 基础：斜线反弹 |
| 5 | 1-5 | 4 | 3 | 0.19 | 基础：多点收集 |
| 6 | 1-6 | 4 | 3 | 0.22 | 基础：远距离路径 |
| 7 | 1-7 | 3 | 3 | 0.25 | 基础：利用墙壁反弹 |
| 8 | 1-8 | 4 | 3 | 0.28 | 挑战：综合应用 |

**World 2: 反弹进阶 (Bounce Advanced)**

| Level | ID | Light Points | Max Lines | Difficulty | Theme |
|-------|----|-------------|-----------|------------|-------|
| 1 | 2-1 | 3 | 3 | 0.30 | 引入：更分散的布局 |
| 2 | 2-2 | 4 | 3 | 0.34 | 多目标路径规划 |
| 3 | 2-3 | 5 | 3 | 0.37 | 多点顺序收集 |
| 4 | 2-4 | 4 | 3 | 0.40 | 精确角度控制 |
| 5 | 2-5 | 5 | 3 | 0.43 | 窄通道反弹 |
| 6 | 2-6 | 6 | 3 | 0.46 | 高密度光点区 |
| 7 | 2-7 | 5 | 3 | 0.49 | 组合墙壁反弹 |
| 8 | 2-8 | 6 | 3 | 0.52 | 挑战：长路径规划 |

**World 3: 精准规划 (Precision Planning)**

| Level | ID | Light Points | Max Lines | Difficulty | Theme |
|-------|----|-------------|-----------|------------|-------|
| 1 | 3-1 | 4 | 3 | 0.55 | 引入：减少容错空间 |
| 2 | 3-2 | 5 | 3 | 0.58 | 角落光点收集 |
| 3 | 3-3 | 6 | 3 | 0.61 | 多段反弹路径 |
| 4 | 3-4 | 5 | 2 | 0.64 | 少线段挑战 |
| 5 | 3-5 | 7 | 3 | 0.67 | 分层光点布局 |
| 6 | 3-6 | 6 | 2 | 0.70 | 极限线段策略 |
| 7 | 3-7 | 8 | 3 | 0.72 | 迷宫式光点排列 |
| 8 | 3-8 | 7 | 2 | 0.75 | 挑战：极致精度 |

**World 4: 大师挑战 (Master Challenge)**

| Level | ID | Light Points | Max Lines | Difficulty | Theme |
|-------|----|-------------|-----------|------------|-------|
| 1 | 4-1 | 5 | 3 | 0.78 | 引入：高压布局 |
| 2 | 4-2 | 7 | 3 | 0.80 | 复杂多点路径 |
| 3 | 4-3 | 6 | 2 | 0.82 | 精准反弹控制 |
| 4 | 4-4 | 8 | 3 | 0.85 | 大范围收集 |
| 5 | 4-5 | 7 | 2 | 0.87 | 极简线段策略 |
| 6 | 4-6 | 9 | 3 | 0.89 | 高密度挑战 |
| 7 | 4-7 | 8 | 2 | 0.92 | 大师级精度 |
| 8 | 4-8 | 10 | 2 | 0.95 | 最终挑战：完美一球清台 |

### Star Thresholds Design

星级评价基于**收集的光点数量**。对于每个关卡，3 星要求收集**全部**光点（一球清台），体现游戏核心 pillar。

**默认星阈值公式**：
```
three = lightPointCount          // 收集全部 = 3 星
two   = ceil(lightPointCount * 0.7)  // 收集 70% = 2 星
one   = ceil(lightPointCount * 0.4)  // 收集 40% = 1 星
```

| Light Points | 1 Star | 2 Stars | 3 Stars |
|-------------|--------|---------|---------|
| 2 | 1 | 2 | 2 |
| 3 | 2 | 3 | 3 |
| 4 | 2 | 3 | 4 |
| 5 | 2 | 4 | 5 |
| 6 | 3 | 5 | 6 |
| 7 | 3 | 5 | 7 |
| 8 | 4 | 6 | 8 |
| 9 | 4 | 7 | 9 |
| 10 | 4 | 7 | 10 |

**教程关卡特殊处理**：World 1 的前 3 关（1-1, 1-2, 1-3）可以设置更宽松的阈值，确保新手玩家轻松获得 3 星，建立信心。

## Formulas

### 世界解锁判定

```
WORLD_UNLOCK_THRESHOLDS = [0, 7, 18, 33]

isWorldUnlocked(worldNumber):
    threshold = WORLD_UNLOCK_THRESHOLDS[worldNumber - 1]
    return cumulativeStars >= threshold
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| worldNumber | number | 1-4 | 玩家选择 | 世界编号 |
| WORLD_UNLOCK_THRESHOLDS | number[] | [0, 7, 18, 33] | 配置常量 | 各世界解锁所需星星 |
| cumulativeStars | number | 0-96 | 存档系统 | 已获得的总星星数 |

**阈值推导**：
- World 2 (7 stars): 玩家需在世界1中平均每关获得 1.75 星（约 3 星通关 2 关 + 1 星通关 1 关）
- World 3 (18 stars): 玩家需在世界1+2中平均每关获得 2.25 星
- World 4 (33 stars): 玩家需在世界1+2+3中平均每关获得 2.06 星

### 关卡解锁判定

```
isLevelUnlocked(worldNumber, levelNumber):
    if NOT isWorldUnlocked(worldNumber):
        return false
    if levelNumber == 1:
        return true
    previousLevelId = format("{0}-{1}", worldNumber, levelNumber - 1)
    return getLevelProgress(previousLevelId).bestStars >= 1
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| worldNumber | number | 1-4 | 玩家选择 | 世界编号 |
| levelNumber | number | 1-8 | 玩家选择 | 关卡编号 |
| previousLevelId | string | — | 计算得出 | 前一关的 ID |
| bestStars | number | 0-3 | 存档系统 | 前一关的最佳星星 |

### 归一化坐标转像素坐标

```
pixelX = normalizedX * playableWidth + leftBoundary
pixelY = normalizedY * playableHeight + bottomBoundary
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| normalizedX | number | 0.0-1.0 | 关卡配置 JSON | 归一化 X 坐标 |
| normalizedY | number | 0.0-1.0 | 关卡配置 JSON | 归一化 Y 坐标 |
| playableWidth | number | 设备相关 | 边界系统 | 可玩区域宽度（像素） |
| playableHeight | number | 设备相关 | 边界系统 | 可玩区域高度（像素） |
| leftBoundary | number | 设备相关 | 边界系统 | 左边界 X 坐标 |
| bottomBoundary | number | 设备相关 | 边界系统 | 下边界 Y 坐标 |
| pixelX | number | — | 计算得出 | 像素 X 坐标 |
| pixelY | number | — | 计算得出 | 像素 Y 坐标 |

**预期行为**：
- `normalizedX=0, normalizedY=0` -> 可玩区域左下角
- `normalizedX=1, normalizedY=1` -> 可玩区域右上角
- `normalizedX=0.5, normalizedY=0.5` -> 可玩区域正中心

### 难度评分

```
difficultyScore = w1 * lightPointCount / MAX_LIGHT_POINTS
               + w2 * (1 - maxLines / MAX_LINES_DEFAULT)
               + w3 * pathComplexity

where:
  w1 = 0.4    // 光点数量权重
  w2 = 0.3    // 线段限制权重
  w3 = 0.3    // 路径复杂度权重（设计者手动评估）
  MAX_LIGHT_POINTS = 10
  MAX_LINES_DEFAULT = 5
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| lightPointCount | number | 2-10 | 关卡配置 | 光点总数 |
| maxLines | number | 2-5 | 关卡配置 | 最大线段数 |
| pathComplexity | number | 0.0-1.0 | 设计者评估 | 路径规划复杂度 |
| difficultyScore | number | 0.0-1.0 | 计算得出 | 综合难度评分 |

**用途**：`difficulty` 字段主要用于设计参考和自动排序，不直接影响游戏逻辑。

### 星级评价计算

```
stars = 0
if lightPointsCollected >= starThresholds.three:
    stars = 3
elif lightPointsCollected >= starThresholds.two:
    stars = 2
elif lightPointsCollected >= starThresholds.one:
    stars = 1

// 0 stars = 未通过（关卡失败或未达标）
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| lightPointsCollected | number | 0-lightPointsTotal | 游戏状态管理 | 已收集光点数 |
| starThresholds.one | number | 1-lightPointsTotal | 关卡配置 | 1 星阈值 |
| starThresholds.two | number | 1-lightPointsTotal | 关卡配置 | 2 星阈值 |
| starThresholds.three | number | 1-lightPointsTotal | 关卡配置 | 3 星阈值 |

### 累计星星数计算

```
cumulativeStars = sum(level.bestStars for all completed levels)
```

更新时机：每次关卡完成（VICTORY 状态）后重新计算。

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **所有关卡都 0 星** | 只有 World 1 可玩，所有关卡可用（关卡 1 始终解锁） | 确保玩家始终有内容可玩 |
| **刚好达到解锁阈值** | 立即解锁，无需额外条件 | 避免玩家困惑 |
| **降级星星数**（重玩获得更少星星） | 保留历史最高星星数，不降级 | `bestStars = max(previous, current)` |
| **关卡 JSON 文件缺失** | 跳过该关卡，记录错误日志，显示"内容即将上线" | 优雅降级，不阻塞游戏流程 |
| **关卡 JSON 格式错误** | 拒绝加载，显示错误提示，停留在关卡选择界面 | 防止运行时崩溃 |
| **归一化坐标超出 0-1 范围** | 钳制到 [0.05, 0.95] 范围内 | 防止元素出现在边界外 |
| **光点位置完全重叠** | 允许，但记录设计警告（可能降低可玩性） | 不阻止加载，交给设计审查 |
| **ball.spawn 在光点位置上** | 正常加载，球发射时立即收集该光点 | 允许作为特殊关卡设计 |
| **maxLines = 0** | 拒绝加载，显示"关卡配置无效" | 零线段关卡无法游玩 |
| **lightPoints 为空数组** | 拒绝加载，显示"关卡配置无效" | 零光点关卡无法胜利 |
| **starThresholds 不递增** (one >= two >= three) | 拒绝加载，显示"关卡配置无效" | 星阈值必须递增 |
| **World 4 解锁后删档** | 所有进度清零，回到 World 1 | 存档系统负责重置 |
| **同一关卡通关时间极长（>3600s）** | 正常记录，时间上限 3600s | 与游戏状态管理一致 |
| **解锁 World 2 后 World 1 未全通** | 允许，玩家可以自由选择已解锁世界的关卡 | 不强制线性通关 |
| **快速连续加载不同关卡** | 取消前一次加载，只处理最后一次请求 | 防止竞态条件 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **场景管理** | 输出 -> | 硬依赖：请求加载关卡场景、返回关卡选择 | Approved |
| **游戏状态管理** | 输出 -> | 硬依赖：传递关卡配置、触发关卡开始 | Approved |
| **球物理系统** | 输出 -> | 软依赖：提供球发射位置和方向 | Approved |
| **光点收集系统** | 输出 -> | 软依赖：提供光点位置列表 | Approved |
| **边界系统** | 输入 <- | 硬依赖：获取可玩区域尺寸用于坐标转换 | Approved |
| **星级评价系统** | 输入 <- | 硬依赖：接收关卡完成结果和星星数 | Approved |
| **存档系统** | 双向 | 硬依赖：读取/写入关卡进度数据 | Not Started |
| **UI系统** | 输出 -> | 软依赖：提供世界列表和关卡列表数据 | Approved |

**依赖性质分析**：
- **场景管理**：**硬依赖**——关卡系统通过场景管理来切换到游戏场景
- **游戏状态管理**：**硬依赖**——关卡配置必须传递给状态管理才能初始化游戏
- **边界系统**：**硬依赖**——坐标转换需要可玩区域尺寸
- **星级评价系统**：**硬依赖**——需要评价结果来更新关卡进度
- **存档系统**：**硬依赖**——进度持久化依赖存档系统
- **球物理/光点收集**：**软依赖**——关卡系统提供数据但不依赖它们的运行
- **UI系统**：**软依赖**——关卡系统提供数据，UI 决定如何展示

**注意**：关卡系统是 Feature 层，依赖 Core 层的场景管理、游戏状态管理和边界系统。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **WORLD_UNLOCK_THRESHOLDS** | [0, 7, 18, 33] | 各值 0-24 | 解锁更慢，进度更长 | 解锁更快，内容消耗更快 |
| **LEVELS_PER_WORLD** | 8 | 5-15 | 每世界内容更多 | 每世界内容更少 |
| **WORLD_COUNT** | 4 | 2-8 | 游戏更长 | 游戏更短 |
| **DEFAULT_MAX_LINES** | 3 | 1-5 | 策略更宽松 | 策略更紧张 |
| **DEFAULT_SPAWN_Y** | 0.85 | 0.7-0.95 | 球从更高处发射 | 球从更接近中心处发射 |
| **STAR_THRESHOLD_THREE_RATIO** | 1.0 | 0.8-1.0 | 3 星要求更宽松 | 3 星要求收集全部光点 |
| **STAR_THRESHOLD_TWO_RATIO** | 0.7 | 0.5-0.8 | 2 星要求更宽松 | 2 星要求收集更多光点 |
| **STAR_THRESHOLD_ONE_RATIO** | 0.4 | 0.3-0.6 | 1 星要求更宽松 | 1 星要求收集更多光点 |
| **COORDINATE_PADDING** | 0.05 | 0.0-0.1 | 光点远离边界 | 光点可以更接近边界 |
| **TUTORIAL_MAX_LINES** | 4-5 | 3-6 | 教程更宽容 | 教程与正常关卡一致 |

**交互影响**：
- `WORLD_UNLOCK_THRESHOLDS` 直接控制玩家节奏——太高会让玩家卡住，太低会让内容过快消耗
- `DEFAULT_MAX_LINES` 与 `lightPointCount` 共同决定关卡难度
- `STAR_THRESHOLD_THREE_RATIO` 设为 1.0 是核心 pillar "一球清台" 的体现——不应降低
- `COORDINATE_PADDING` 确保元素不会紧贴边界，影响视觉美观度

**高风险调参警告**：
- **世界解锁阈值是留存关键**——需要数据分析优化，过高会导致流失，过低会导致内容枯竭
- **教程关卡（1-1 到 1-3）的难度必须极低**——这是玩家的第一印象

## Visual/Audio Requirements

关卡系统本身不直接控制视觉/音频，但会通过其他系统间接影响：

| Event | Visual System | Audio System |
|-------|--------------|--------------|
| 关卡加载 | 场景过渡动画（渐入渐出） | 无 |
| 世界解锁 | 解锁动画 + 粒子爆发 | `playSound('world_unlock')` |
| 关卡选择 | 关卡卡片高亮/锁定状态 | `playSound('level_select')` |
| 教程关卡 | 教程引导提示（高亮画线区域） | 教程语音或提示音 |

**关卡选择界面视觉规格**：
- 世界以"岛屿"或"路径"形式展示
- 已解锁世界：明亮、可点击
- 锁定世界：灰色、显示所需星星数
- 当前世界进度条：显示解锁下一世界的进度

**关卡卡片视觉规格**：
- 已完成：显示 1-3 颗星星（金色填充 + 灰色空星）
- 可玩未完成：显示"NEW"标记
- 锁定：显示锁定图标

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|-------------|-----------------|-----------------|-----------|
| 世界列表 | 世界选择界面 | 进度变化时 | 世界选择场景 |
| 关卡列表 | 关卡选择界面 | 进度变化时 | 关卡选择场景 |
| 累计星星数 | 顶部 HUD | 每次通关后 | 关卡选择场景 |
| 世界解锁进度 | 世界卡片上 | 进度变化时 | 世界选择场景 |
| 关卡星级 | 关卡卡片上 | 每次通关后 | 关卡选择场景 |
| 难度标签 | 关卡卡片上 | 静态 | 关卡选择场景 |

**UI 数据接口**：

```typescript
interface WorldInfo {
  worldId: number;
  name: string;
  unlocked: boolean;
  unlockThreshold: number;     // 所需星星
  totalStarsInWorld: number;   // 本世界可获得总星星
  earnedStarsInWorld: number;  // 本世界已获得星星
}

interface LevelInfo {
  levelId: string;
  name: string;
  difficulty: number;
  unlocked: boolean;
  completed: boolean;
  bestStars: number;
  isNew: boolean;              // 解锁但未玩过
}
```

## Acceptance Criteria

### 关卡加载验收

- [ ] `loadLevel("1-1")` 正确加载世界1-关卡1的 JSON 配置
- [ ] JSON 配置中的归一化坐标被正确转换为像素坐标
- [ ] 球发射位置和方向被正确传递给球物理系统
- [ ] 光点位置列表被正确传递给光点收集系统
- [ ] 游戏状态管理收到正确的 `LevelConfig`（maxLines, lightPointCount）
- [ ] 无效关卡 ID（如 "5-1", "1-9"）被拒绝，显示错误提示
- [ ] 缺失的 JSON 文件被优雅处理，不崩溃

### 世界解锁验收

- [ ] World 1 始终解锁
- [ ] 累计星星 >= 7 时 World 2 解锁
- [ ] 累计星星 >= 18 时 World 3 解锁
- [ ] 累计星星 >= 33 时 World 4 解锁
- [ ] 解锁瞬间触发解锁动画和音效
- [ ] 降级星星（理论上不可能，因为 bestStars 不降级）不影响已解锁世界

### 关卡解锁验收

- [ ] 每个世界的关卡 1 始终解锁（世界解锁后）
- [ ] 前一关获得至少 1 星后，下一关解锁
- [ ] 已通过的关卡可以重玩
- [ ] 重玩获得更多星星时更新 `bestStars`
- [ ] 重玩获得更少星星时不降低 `bestStars`

### 关卡配置验证验收

- [ ] `maxLines = 0` 的配置被拒绝
- [ ] `lightPoints` 为空数组的配置被拒绝
- [ ] `starThresholds` 不递增（one >= two 或 two >= three）的配置被拒绝
- [ ] 归一化坐标超出 [0, 1] 范围时被钳制到 [0.05, 0.95]
- [ ] 重复的关卡 ID 被检测到并记录警告

### 进度持久化验收

- [ ] 通关后进度被正确保存
- [ ] 应用重启后进度被正确恢复
- [ ] 累计星星数计算正确（所有关卡 bestStars 之和）
- [ ] 最后玩过的关卡 ID 被记录

### 性能验收

- [ ] 关卡配置加载 < 50ms（JSON 解析 + 坐标转换）
- [ ] 世界/关卡列表查询 < 1ms（内存操作）
- [ ] 进度计算 < 1ms
- [ ] 无 GC 压力（无每帧分配，仅在加载关卡时分配）

### 配置验收

- [ ] `WORLD_UNLOCK_THRESHOLDS` 可通过配置文件调整
- [ ] `DEFAULT_MAX_LINES` 可通过配置文件调整
- [ ] 关卡 JSON 文件可以热更新（不重启应用）
- [ ] 新增关卡只需添加 JSON 文件，无需修改代码

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要关卡难度自动标签（简单/中等/困难）？ | UI 设计后决定 | -- | 待定 |
| 是否支持关卡内教程提示（箭头指引画线位置）？ | 原型测试后决定 | -- | 待定 |
| 是否需要每日推荐关卡功能？ | Alpha 阶段决定 | -- | 待定（不在 MVP 内） |
| 是否支持用户自制关卡？ | 发布后评估 | -- | 待定（增加大量复杂度） |
| 障碍物类型和配置格式？ | World 3+ 设计后决定 | -- | 待定（当前 obstacles 为空数组） |
| 是否需要关卡选择界面动画（世界间转场）？ | UI 设计后决定 | -- | 待定 |
