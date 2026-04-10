# 画线反弹系统 (Line Bounce System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 策略简洁, 物理爽感

## Overview

画线反弹系统负责将玩家绘制的线段转换为物理碰撞体，使球能够在撞到线段时反弹。它是"画线→弹球"核心循环的桥梁——玩家画的线通过这个系统变成真正的物理挡板。玩家**主动操作**这个系统：每次画线都是一次策略决策，决定球的可能轨迹。这个系统的核心价值是**创造性策略**：玩家可以自由决定线的位置、角度和长度，从而创造独特的解法。没有画线反弹系统，游戏只是观察球下落的被动体验，没有任何策略深度。

## Player Fantasy

玩家应该感觉画线是**直觉的延伸**——手指到哪，挡板就跟到哪。画线不是技巧的考验，而是策略的表达。不需要精确计算角度，只需要直觉地画出"大概的方向"，剩下的交给物理。

玩家应该感到**策略约束带来的创意自由**——只有3条线，所以每一条都弥足珍贵。这种限制不是束缚，而是聚焦：你不需要考虑无数种可能，只需要在3次机会内找到最优解。

**关键体验目标**:
- **创造感**: 每条线都是玩家的创作，看着球按自己规划的路径弹跳，是满足感的来源
- **策略张力**: 3条线用完后，球还在飞——"我画对了吗？"的紧张感
- **即时反馈**: 线画完的瞬间，球就撞上去——"叮"的一声，满足感爆棚
- **可撤销的安全感**: 球撞到之前可以撤销——鼓励尝试，不惩罚失误

**参考游戏**:
- **割绳子**: 画线创造物理交互的策略感
- **蜡笔物理学**: 自由绘制创造解法的创意感

## Detailed Design

### Core Rules

**1. 线段创建流程**：

```
玩家画线 → 输入系统.onLineCreated(start, end)
        → 画线反弹系统.createLine(start, end)
        → 碰撞系统.registerLine(start, end) → lineId
        → 视觉反馈系统.showConfirmedLine(start, end)
        → 游戏状态管理.onLineCountChanged(++linesUsed, --linesRemaining)
```

**2. 线段属性**：

| 属性 | 值 | 来源 | 说明 |
|------|-----|------|------|
| 碰撞厚度 | 6px | 碰撞系统 | `LINE_VISUAL_THICKNESS * COLLIDER_PADDING` = 4 * 1.5 |
| 视觉厚度 | 4px | 视觉反馈系统 | 玩家看到的线粗细 |
| restitution | 0.95 | 碰撞系统 | 弹性系数 |
| friction | 0.2 | 碰撞系统 | 摩擦力 |
| 生命周期 | 永久 | 本系统 | 线段不会消失（除非撤销） |

**3. 线段撤销规则**：
- **可撤销条件**: 球**未**撞击过该线段
- **撤销流程**:
  ```
  玩家点击线段 → 输入系统.onLineRemoved(lineId)
              → 画线反弹系统.removeLine(lineId)
              → 碰撞系统.unregisterLine(lineId)
              → 视觉反馈系统.hideLine(lineId)
              → 游戏状态管理.onLineCountChanged(--linesUsed, ++linesRemaining)
  ```
- **不可撤销标记**: 球撞击线段后，`line.isHit = true`，撤销请求被拒绝

**4. 线段数量限制**：
- 每关最多 `MAX_LINES_PER_LEVEL = 3` 条线
- 达到上限后，输入系统收到 `canDrawLine() = false`，不再触发 `onLineCreated`

**5. 线段碰撞响应**：
- 球撞击线段时，碰撞系统触发 `onBallHitLine(position, normal)`
- 画线反弹系统记录 `line.isHit = true`（防止撤销）
- 通知视觉反馈系统播放反弹效果
- 通知音频系统播放反弹音效

### States and Transitions

**线段的状态机图**：

```
┌───────────┐    球撞击    ┌───────────┐
│  Active   │ ──────────► │  Locked   │
└───────────┘             └───────────┘
     │                          │
     │ 撤销                      │ 撤销（拒绝）
     ▼                          ▼
┌───────────┐             ┌───────────┐
│  Removed  │             │  Removed  │
└───────────┘             └───────────┘
```

**状态转换表**：

| 当前状态 | 触发事件 | 目标状态 | 副作用 |
|---------|---------|---------|--------|
| `Active` | 球撞击 | `Locked` | `line.isHit = true`，撤销请求被拒绝 |
| `Active` | 撤销 | `Removed` | 注销碰撞体，隐藏视觉 |
| `Locked` | 撤销 | `Locked` | 拒绝撤销，无变化 |
| `Locked` | 关卡重置 | `Removed` | 所有线段销毁 |
| `Removed` | — | — | 终态，无转换 |

**状态详细说明**：

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Active** | 线段创建 | 球撞击/撤销 | 可被撤销，参与碰撞检测 |
| **Locked** | 球撞击 | 关卡重置 | 不可撤销，继续参与碰撞 |
| **Removed** | 撤销/重置 | — | 碰撞体已注销，视觉已隐藏 |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **输入系统** | 输入 ← | `onLineCreated(start: Vec2, end: Vec2): void` | 输入系统通知线段创建 |
| **输入系统** | 输入 ← | `onLineRemoved(lineId: string): void` | 输入系统通知线段撤销 |
| **碰撞系统** | 输出 → | `registerLine(start: Vec2, end: Vec2): lineId` | 注册线段为碰撞体 |
| **碰撞系统** | 输出 → | `unregisterLine(lineId: string): void` | 移除线段碰撞体 |
| **碰撞系统** | 输入 ← | `onBallHitLine(position: Vec2, normal: Vec2, lineId: string): void` | 球撞线回调 |
| **视觉反馈系统** | 输出 → | `showConfirmedLine(start: Vec2, end: Vec2, lineId: string): void` | 显示确认线 |
| **视觉反馈系统** | 输出 → | `hideLine(lineId: string): void` | 隐藏线段（撤销时） |
| **视觉反馈系统** | 输出 → | `playBounceEffect(position: Vec2): void` | 播放反弹粒子效果 |
| **音频系统** | 输出 → | `playSound('bounce'): void` | 播放反弹音效 |
| **游戏状态管理** | 输出 → | `onLineCountChanged(used: number, remaining: number): void` | 通知线段配额变化 |
| **球物理系统** | 输出 → | `onBallHitLine(lineId: string): void` | 通知球撞到哪条线 |

**接口定义**：

```typescript
interface Line {
  id: string;
  start: Vec2;
  end: Vec2;
  state: LineState;
  isHit: boolean;
  createdAt: number;  // 时间戳，用于可能的未来功能
}

enum LineState {
  ACTIVE = 'ACTIVE',      // 可撤销
  LOCKED = 'LOCKED',      // 已被球撞击，不可撤销
  REMOVED = 'REMOVED'     // 已删除
}

interface LineBounceSystem {
  // 输入系统调用
  onLineCreated(start: Vec2, end: Vec2): void;
  onLineRemoved(lineId: string): void;

  // 碰撞系统回调
  onBallHitLine(position: Vec2, normal: Vec2, lineId: string): void;

  // 查询接口
  canDrawLine(): boolean;
  getLineCount(): { used: number; remaining: number };
  getLines(): Line[];
}
```

## Formulas

### 线段长度计算

```
lineLength = sqrt((endX - startX)² + (endY - startY)²)
isValidLine = (lineLength >= MIN_LINE_LENGTH)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| startX, startY | Vec2 | 0 - 屏幕尺寸 | 输入系统 | 触摸起点坐标 |
| endX, endY | Vec2 | 0 - 屏幕尺寸 | 输入系统 | 触摸终点坐标 |
| MIN_LINE_LENGTH | number | 20 | 配置常量 | 最小线段长度（像素） |
| lineLength | number | 0 - 屏幕对角线 | 计算得出 | 线段长度 |

### 线段碰撞体厚度

```
lineColliderThickness = LINE_VISUAL_THICKNESS * COLLIDER_PADDING
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| LINE_VISUAL_THICKNESS | number | 4 | 视觉反馈系统 | 线的视觉粗细（像素） |
| COLLIDER_PADDING | number | 1.5 | 碰撞系统 | 碰撞体加厚系数 |
| lineColliderThickness | number | 6 | 计算得出 | 线的物理碰撞厚度（像素） |

### 线段数量检查

```
canDrawLine = (linesUsed < MAX_LINES_PER_LEVEL) AND (currentPhase === READY OR currentPhase === PLAYING)
linesRemaining = MAX_LINES_PER_LEVEL - linesUsed
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| MAX_LINES_PER_LEVEL | number | 3 | 游戏状态管理 | 每关最大线段数 |
| linesUsed | number | 0-MAX_LINES | 游戏状态管理 | 已使用线段数 |
| linesRemaining | number | 0-MAX_LINES | 计算得出 | 剩余线段数 |

### 线段中点计算（效果播放位置）

```
midpointX = (startX + endX) / 2
midpointY = (startY + endY) / 2
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| midpoint | Vec2 | 屏幕范围内 | 计算得出 | 线段中点（反弹效果播放位置） |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **线段长度为 0**（起点=终点） | 忽略创建请求，不消耗配额 | 防止无效线段 |
| **线段长度 < MIN_LINE_LENGTH** | 忽略创建请求，显示抖动反馈 | 防止误触创建太短的线 |
| **线段超出屏幕边界** | 裁剪到屏幕边界内 | 保留玩家意图 |
| **线段与已有线段完全重叠** | 允许创建（各自独立） | 玩家的策略选择 |
| **达到配额后尝试画线** | `canDrawLine()` 返回 false，输入系统阻止画线 | 配额限制生效 |
| **球撞击后尝试撤销** | 拒绝撤销，线段保持 Locked 状态 | 防止作弊 |
| **快速连续撤销多条线** | 按顺序处理，每条独立检查状态 | 防止竞态条件 |
| **线段被球撞击多次** | 第一次撞击锁定，后续撞击无状态变化 | 幂等性保证 |
| **关卡重置时有线段未撞击** | 所有线段销毁，配额重置 | 干净的开始 |
| **碰撞系统注册失败** | 线段创建失败，不消耗配额，记录错误 | 优雅降级 |
| **线段 ID 冲突** | 生成新 ID，重新注册 | 防止 ID 碰撞 |
| **撤销不存在的线段** | 忽略请求，记录警告 | 防止空指针 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **输入系统** | 输入 ← | 硬依赖：接收线段创建/撤销事件 | Approved |
| **碰撞系统** | 双向 | 硬依赖：注册/注销线段碰撞体；接收碰撞回调 | Approved |
| **视觉反馈系统** | 输出 → | 软依赖：显示线段和反弹效果 | Approved |
| **音频系统** | 输出 → | 软依赖：播放反弹音效 | Approved |
| **游戏状态管理** | 输出 → | 软依赖：通知线段配额变化 | Approved |
| **球物理系统** | 输出 → | 软依赖：通知球撞到哪条线 | Approved |

**依赖性质分析**：
- **输入系统**：**硬依赖**——没有输入事件，无法创建线段
- **碰撞系统**：**硬依赖**——没有碰撞系统，线段没有物理意义
- **视觉/音频系统**：**软依赖**——线段可以存在，只是没有反馈
- **游戏状态管理**：**软依赖**——线段可以独立管理，但配额检查需要它

**注意**：画线反弹系统是 Feature 层，依赖 Foundation 层的输入、视觉、音频系统和 Core 层的碰撞系统。所有依赖它的系统都在 Feature 或 Presentation 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **MAX_LINES_PER_LEVEL** | 3 | 1-5 | 策略性降低，解法更多样 | 策略性提高，难度增加 |
| **MIN_LINE_LENGTH** | 20px | 10-50px | 防止误触，但误触增加 | 允许更短的线，需要更精确 |
| **LINE_RESTITUTION** | 0.95 | 0.8-1.0 | 反弹更强，弹得更远 | 反弹更弱，能量损失更多 |
| **LINE_FRICTION** | 0.2 | 0.0-0.5 | 球滑动更多，角度变化 | 球滑动更顺滑 |

**交互影响**：
- `MAX_LINES_PER_LEVEL` 由游戏状态管理持有，画线反弹系统只是读取
- `LINE_RESTITUTION` 应该与碰撞系统的设置一致（0.95）
- `LINE_FRICTION` 应该与碰撞系统的设置一致（0.2）

**与关卡设计的关系**：
- `MAX_LINES_PER_LEVEL` 决定了关卡的策略深度
- 较难关卡可能需要更多线段
- 较简单关卡可能只需要 1-2 条线

**高风险调参警告**：
- **线段弹性是核心体验**——这些参数需要早期原型验证
- **配额限制直接影响难度**——需要与关卡设计协同调整

## Visual/Audio Requirements

画线反弹系统本身不直接控制视觉/音频，但会触发其他系统的反馈：

| Event | Visual System | Audio System |
|-------|--------------|--------------|
| 线段创建 | `showConfirmedLine(start, end)` | `playSound('line_place')` |
| 线段撤销 | `hideLine(lineId)` | `playSound('line_undo')` |
| 球撞线 | `playBounceEffect(position)` | `playSound('bounce')` |
| 线段锁定（首次撞击） | 无特殊效果 | 无（或可选的锁定音效） |

**线段视觉规格**：
- 确认线： 实心蓝色 (#4ECDC4) + 白色发光边缘
- 锚点： 线段两端的小圆点（半径 6px）
- 被撞击后的线段： 轻微发光效果（表示已锁定）

## UI Requirements

画线反弹系统为 UI 系统提供数据：

| UI Element | Data Source | Update Frequency |
|------------|-------------|------------------|
| 线段计数器 | `linesUsed` / `linesRemaining` | 每次画线/撤销 |
| 线段数量提示 | `canDrawLine()` | 每次尝试画线 |

**线段计数器 UI 规格**：
- 位置： 屏幕左上角或顶部中央
- 格式: "3/3" → "2/3" → "1/3" → "0/3"
- 颜色: 正常时蓝色，配额用尽时红色闪烁

**注意**：线段本身的视觉表现由视觉反馈系统管理，不是 UI 元素。

## Acceptance Criteria

### 线段创建验收

- [ ] 玩家画线后，`onLineCreated()` 正确触发
- [ ] `registerLine()` 返回有效的 lineId
- [ ] 线段视觉正确显示（`showConfirmedLine()` 被调用）
- [ ] 游戏状态管理收到配额变化通知

### 线段撤销验收

- [ ] 球撞击前，撤销请求成功
- [ ] 球撞击后，撤销请求被拒绝
- [ ] `unregisterLine()` 正确移除碰撞体
- [ ] 线段视觉正确隐藏

### 配额限制验收

- [ ] 达到 MAX_LINES 后，`canDrawLine()` 返回 false
- [ ] 配额用尽后，输入系统不再触发 `onLineCreated`

### 碰撞响应验收

- [ ] 球撞线后，`onBallHitLine()` 正确触发
- [ ] 线段状态变为 Locked
- [ ] 视觉反馈系统收到反弹效果请求
- [ ] 音频系统收到反弹音效请求

### 边界情况验收

- [ ] 线段长度 < MIN_LINE_LENGTH 时，不创建线段
- [ ] 线段超出屏幕时，正确裁剪
- [ ] 撤销不存在的线段时，忽略请求

### 性能验收

- [ ] 线段创建 < 1ms
- [ ] 线段撤销 < 0.5ms
- [ ] 碰撞回调处理 < 0.1ms
- [ ] 无 GC 压力（对象池管理线段）

### 配置验收

- [ ] 所有参数可通过配置文件调整
- [ ] 配置热重载后，新值生效

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|------------|
| 线段是否需要"生命值"（撞击N次后消失）？ | 功能评估后决定 | — | 待定（当前设计：永久存在） |
| 线段是否需要"发光"效果（吸引玩家注意）？ | 视觉设计时决定 | — | 待定 |
| 是否支持"拖拽调整"已画线段？ | 原型测试后决定 | — | 待定（增加复杂度） |
| 线段数量是否随关卡变化？ | 关卡设计时决定 | — | 待定（当前设计：固定 3 条） |
| 是否需要"线段预览"（画线时显示反弹路径预测）？ | UX 测试后决定 | — | 待定（可能降低策略性） |
| 是否需要"线段吸附"功能（自动对齐到光点方向）？ | UX 测试后决定 | — | 待定（可能降低自由度） |
