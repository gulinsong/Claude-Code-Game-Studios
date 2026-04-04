# 星级评价系统 (Star Rating System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-04-04
> **Implements Pillar**: 一球清台, 策略简洁

## Overview

星级评价系统负责在每局游戏结束时根据光点收集数量计算星星数（0-3 星），维护每关的最佳星星记录和累计星星总数，并驱动世界解锁判定与 UI 显示。它从游戏状态管理器读取收集计数，从关卡配置中读取星阈值，使用 `bestStars = max(previous, current)` 规则确保重玩不会降级记录，并通过累计星星数判定世界解锁。该系统将收集进度转化为可感知的成就——玩家追求的"三颗金星"是精通游戏的证明，而累计星星解锁新世界则是长期留存的驱动力。

## Player Fantasy

玩家应该感觉每颗星星都是**技能的证明**——1 星表示"你基本理解了"，2 星表示"你有策略"，3 星表示"你完美规划了这条路径"。三星通关不是运气的结果，而是反复尝试和优化的结果。

三星要求的视觉和音效反馈应该是**压倒性的满足感**——当三颗星以金色一同动画显示时，玩家会感到彻底的满足。

玩家也应该感到**被鼓励去重玩**，而不是被惩罚。重玩一关并获得更好的星数感觉像是进步；获得更差的星数则什么也没改变。累计星星数只升不降，创造了一个安全的环境来尝试更难的关卡。

在世界解锁方面，玩家应该感到**期待和目标导向**——看到"下一世界需要 18 颗星，你有 15 颗"会产生一个明确的短期目标。

**关键体验目标**：
- **精通奖励**：3 星是对技巧的奖励，而非参与
- **安全重玩**：重玩永远不会降低你的记录，只会提升它
- **明确进度**：累计星星和世界解锁阈值创造清晰的短期目标

**参考游戏**：
- **《割绳子》**：3 星系统完美平衡了精通与进度
- **《愤怒的小鸟》**：重玩以获取更高星数是核心留存循环

## Detailed Design

### 核心规则

**1. 星级评价触发**

星级评价在游戏状态达到 `VICTORY` 或 `DEFEAT` 时计算。

```
触发条件：currentPhase ∈ {VICTORY, DEFEAT}
```

**2. 星级评价计算**

```
如果 lightPointsCollected >= starThresholds.three: stars = 3
否则如果 lightPointsCollected >= starThresholds.two: stars = 2
否则如果 lightPointsCollected >= starThresholds.one: stars = 1
否则: stars = 0
```

- **3 星**：收集所有光点（体现"一球清台"核心支柱）
- **2 星**：收集 ceil(70%) 的光点
- **1 星**：收集 ceil(40%) 的光点
- **0 星**：收集少于 40%——关卡未被完成

**3. 关卡完成判定**

```
如果 stars >= 1: levelCompleted = true
否则: levelCompleted = false
```

关卡完成（`completed = true`）解锁下一个顺序关卡。0 星不记录为完成。

**4. 最佳星星记录（不降级规则）**

```
bestStars = max(previousBestStars, currentStars)
```

**5. 累计星星数计算**

```
cumulativeStars = sum(level.bestStars for all levels where level.bestStars > 0)
```

最大可能累计值：96 星（4 世界 x 8 关 x 3 星）。

**6. 世界解锁判定**

```
WORLD_UNLOCK_THRESHOLDS = [0, 7, 18, 33]

isWorldUnlocked(worldNumber):
    threshold = WORLD_UNLOCK_THRESHOLDS[worldNumber - 1]
    return cumulativeStars >= threshold
```

**7. 星级评价 UI 展示时机**

| 时机 | 位置 | 显示内容 |
|------|------|----------|
| 游戏结束 | 覆盖弹窗 | 星星动画（从 1 到 3 顺序点亮） |
| 关卡选择 | 关卡卡片 | 填充星 + 空心星 |
| 世界选择 | 世界标题 | 已获星数 / 可获得星数 |
| 世界选择 | 锁定覆盖层 | "需要 N 颗星" + 进度条 |

**8. 星星动画序列**

| 步骤 | 延迟 | 动画 | 音频 |
|------|------|------|------|
| 结果覆盖层出现 | 0.0s | 淡入，0.3s | 无 |
| 第 1 颗星（如果获得） | 0.4s | 缩放 0→1.2→1.0，easeOutBack，0.3s | `star_1` |
| 第 2 颗星（如果获得） | 0.8s | 同第 1 颗星 | `star_2` |
| 第 3 颗星（如果获得） | 1.2s | 同上 + 金色粒子爆发 | `star_3` |
| 按钮出现 | 1.6s | 淡入，0.2s | 无 |

0 星不触发星星动画，只显示"重试"按钮和失败信息。

**9. 世界解锁通知**

如果本次游戏后累计星星达到世界解锁阈值，在星星动画完成后显示"新世界已解锁！"横幅，伴随 `world_unlock` 音效。

**10. 分数作为辅助指标**

分数（`BASE_POINTS * comboMultiplier`）与星星一同显示，但**不**影响星级评价或进度。

### 与其他系统的交互

| 系统 | 方向 | 接口 | 描述 |
|------|------|------|------|
| **游戏状态管理** | 输入 <- | `getState(): GameState` | 读取收集计数、游戏阶段 |
| **关卡系统** | 输入 <- | `getStarThresholds(levelId): StarThresholds` | 读取星阈值 |
| **关卡系统** | 输出 -> | `onLevelComplete(levelId, stars, time)` | 报告结果 |
| **存档系统** | 双向 | 读写 `bestStars`、`cumulativeStars` | 持久化进度 |
| **UI 系统** | 输出 -> | `getStarRatingResult(): StarRatingResult` | 提供显示数据 |
| **视觉反馈系统** | 输出 -> | `onStarAwarded(starCount)` | 触发动画和粒子 |
| **音频系统** | 输出 -> | `onStarAwarded(starCount)` | 播放音效 |

**接口定义**：

```typescript
interface StarThresholds {
    one: number;
    two: number;
    three: number;
}

interface StarRatingResult {
    levelId: string;
    stars: number;                // 0-3
    previousBestStars: number;
    newBestStars: number;
    isNewRecord: boolean;
    cumulativeStarsBefore: number;
    cumulativeStarsAfter: number;
    newWorldUnlocked: number | null;
    lightPointsCollected: number;
    lightPointsTotal: number;
    sessionTime: number;
}
```

## Formulas

### 星级评价计算

```
stars = calculateStars(lightPointsCollected, starThresholds):
    如果 >= three: 返回 3
    如果 >= two: 返回 2
    如果 >= one: 返回 1
    返回 0
```

| 变量 | 类型 | 范围 | 来源 |
|------|------|------|------|
| lightPointsCollected | number | 0-lightPointsTotal | 游戏状态管理器 |
| starThresholds.one | number | 1-lightPointsTotal | 关卡配置 |
| starThresholds.two | number | starThresholds.one-lightPointsTotal | 关卡配置 |
| starThresholds.three | number | starThresholds.two-lightPointsTotal | 关卡配置 |

### 默认星阈值计算

```
three = lightPointCount
two = ceil(lightPointCount * STAR_THRESHOLD_TWO_RATIO)
one = ceil(lightPointCount * STAR_THRESHOLD_ONE_RATIO)
```

| 变量 | 当前值 | 描述 |
|------|--------|------|
| STAR_THRESHOLD_ONE_RATIO | 0.4 | 1 星比率 |
| STAR_THRESHOLD_TWO_RATIO | 0.7 | 2 星比率 |
| STAR_THRESHOLD_THREE_RATIO | 1.0 | 3 星比率（固定） |

**示例计算**：

| lightPointCount | one=ceil(40%) | two=ceil(70%) | three=100% |
|----------------|---------------|---------------|------------|
| 2 | 1 | 2 | 2 |
| 3 | 2 | 3 | 3 |
| 4 | 2 | 3 | 4 |
| 5 | 2 | 4 | 5 |
| 6 | 3 | 5 | 6 |
| 8 | 4 | 6 | 8 |
| 10 | 4 | 7 | 10 |

**验证约束**：`1 <= one <= two <= three <= lightPointCount`

### 最佳星星更新

```
bestStars = max(previousBestStars, currentStars)
```

### 累计星星数计算

```
cumulativeStars = sum(level.bestStars for all levels where level.bestStars > 0)
```

### 世界解锁进度

```
unlockProgress(worldNumber) = clamp(cumulativeStars / WORLD_UNLOCK_THRESHOLDS[worldNumber - 1], 0.0, 1.0)
```

World 1（阈值为 0）进度始终为 1.0。

### 世界解锁所需平均星级

| 世界 | 阈值 | 关卡数 | 所需平均星级 |
|------|------|--------|-------------|
| 2 | 7 | 8 (W1) | 0.875 |
| 3 | 18 | 16 (W1+W2) | 1.125 |
| 4 | 33 | 24 (W1+W2+W3) | 1.375 |

## Edge Cases

| 场景 | 预期行为 | 理由 |
|------|----------|------|
| 恰好收集到阈值数量 | 获得对应星级 | `>=` 比较 |
| 重玩获得更少星星 | bestStars 不变 | 不降级规则 |
| 重玩获得相同星星 | bestStars 不变 | 平局 |
| 重玩获得更多星星 | bestStars 更新，累计增加差值 | 进步 |
| 所有关卡 96/96 | 所有世界解锁，游戏完成 | 自然结束状态 |
| VICTORY 和 DEFEAT 同帧 | VICTORY 优先，3 星 | 游戏状态管理器规则 |
| 星阈值不递增 | 关卡加载被拒绝 | 无效配置 |
| starThresholds.one = 0 | 关卡加载被拒绝 | 0 星不应获得 1 星 |
| 存档数据损坏（关卡 99 星） | 钳制到 [0, 3] | 防御性校验 |
| DEFEAT 后获得 1-2 星 | 授予星星，标记完成 | 阈值在全部收集之前 |
| 1 个光点关卡 | one=1, two=1, three=1，收集即 3 星 | ceil 计算结果 |
| 游戏结束后立即退出 | 状态转换完成则保存，否则不保存 | 仅完整会话计数 |
| 世界解锁发生在 VICTORY | 先完成星星动画，再显示解锁横幅 | 顺序展示 |

## Dependencies

| 系统 | 方向 | 依赖性质 | 状态 |
|------|------|----------|------|
| **游戏状态管理** | 输入 <- | 硬依赖：读取收集计数和游戏阶段 | Approved |
| **关卡系统** | 双向 | 硬依赖：读取阈值，报告结果 | Approved |
| **存档系统** | 双向 | 硬依赖：读写 bestStars 和累计星星 | Not Started |
| **UI 系统** | 输出 -> | 软依赖：提供显示数据 | Approved |
| **视觉反馈系统** | 输出 -> | 软依赖：触发动画和粒子 | Approved |
| **音频系统** | 输出 -> | 软依赖：播放音效 | Approved |

## Tuning Knobs

| 参数 | 当前值 | 安全范围 | 增加效果 | 减少效果 |
|------|--------|----------|----------|----------|
| STAR_THRESHOLD_ONE_RATIO | 0.4 | 0.3-0.6 | 更难获得 1 星 | 更容易获得 1 星 |
| STAR_THRESHOLD_TWO_RATIO | 0.7 | 0.5-0.8 | 更难获得 2 星 | 更容易获得 2 星 |
| STAR_THRESHOLD_THREE_RATIO | 1.0 | 仅限 1.0 | N/A | 破坏核心支柱 |
| WORLD_UNLOCK_THRESHOLDS | [0,7,18,33] | 各值 0-24 | 进度更长 | 内容消耗更快 |
| STAR_ANIM_DELAY_BETWEEN | 0.4s | 0.2-0.8s | 动画更戏剧化 | 动画更快速 |
| STAR_ANIM_DURATION | 0.3s | 0.2-0.5s | 动画更饱满 | 动画更快速 |

**高风险调优警告**：
- **STAR_THRESHOLD_THREE_RATIO 必须保持 1.0**——这是"一球清台"核心支柱的约束
- **世界解锁阈值需要玩家分析数据验证**——当前值为设计估算

## Acceptance Criteria

### 星级评价计算验收

- [ ] `calculateStars()` 在 `>= three` 时返回 3
- [ ] `calculateStars()` 在 `>= two` 时返回 2（小于 three）
- [ ] `calculateStars()` 在 `>= one` 时返回 1（小于 two）
- [ ] `calculateStars()` 在 `< one` 时返回 0
- [ ] 恰好等于阈值时返回对应等级

### 最佳星星记录验收

- [ ] 首次游玩：bestStars = currentStars
- [ ] 重玩更高星：bestStars = max(previous, current)
- [ ] 重玩相同星：bestStars 不变
- [ ] 重玩更低星：bestStars 不变

### 累计星星数验收

- [ ] 等于所有 bestStars > 0 关卡的 bestStars 之和
- [ ] 新记录时增加差值
- [ ] 无新记录时不变

### 世界解锁验收

- [ ] World 1 始终解锁
- [ ] World 2 在 >= 7 星时解锁
- [ ] World 3 在 >= 18 星时解锁
- [ ] World 4 在 >= 33 星时解锁
- [ ] 解锁即时生效，不可倒退

### 关卡完成验收

- [ ] >= 1 星标记为 completed
- [ ] 0 星标记为未完成
- [ ] completed 关卡解锁下一关

### 关卡配置验证验收

- [ ] one >= two 的配置被拒绝
- [ ] two >= three 的配置被拒绝
- [ ] one < 1 的配置被拒绝
- [ ] three > lightPointCount 的配置被拒绝

### 星星动画验收

- [ ] 星星按顺序动画，间隔 0.4s
- [ ] easeOutBack 缩放，0.3s
- [ ] 第 3 颗星触发金色粒子
- [ ] 每颗星播放音效
- [ ] 0 星不触发动画
- [ ] 按钮在动画完成后出现

### 性能验收

- [ ] 星级计算 < 0.01ms
- [ ] 累计星星重算 < 1ms（32 关求和）
- [ ] 零 GC 压力
