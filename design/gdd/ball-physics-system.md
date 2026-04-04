# 球物理系统 (Ball Physics System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 物理爽感

## Overview

球物理系统负责模拟游戏中球的所有物理行为，包括重力下落、反弹、速度衰减和碰撞响应。球是游戏的核心载体——玩家画的线只是为了让球按预期路径弹跳。玩家**不直接控制**球的运动，而是通过画线间接影响球的轨迹。这个系统的核心价值是**物理爽感**：每次反弹都要让人感觉"啪"的一声很爽，音效和视觉反馈比物理精确性更重要。没有球物理系统，游戏只是一张静态的图画，没有任何动态体验。

## Player Fantasy

玩家应该感觉球是**可预测但又有点魔性**的——你知道它会往哪弹，但偶尔的"意外反弹"会带来惊喜。这种感觉像玩弹珠台：物理是真实的，但每次反弹都有一点点不可预测的刺激。

球的运动应该是**流畅且满足感强**的——看到球撞到线发出"叮"的声音、粒子爆发、然后改变方向，这种反馈循环是核心爽点。玩家不需要精确计算角度，只需要直觉地画线，剩下的交给物理。

**关键体验目标**:
- **可控感**: 球的轨迹大致符合预期，玩家能根据经验做策略规划
- **爽快感**: 每次反弹的音效和视觉反馈让人满足
- **意外惊喜**: 偶尔的"神奇反弹"让玩家惊呼"哇，居然进了！"
- **紧张感**: 球接近底部边界时，心跳加速

**参考游戏**:
- **弹珠台**: 物理真实感 + 音效爽感
- **割绳子**: 物理可预测性 + 策略规划
- **愤怒的小鸟**: 抛物线直觉 + 满足感反馈

## Detailed Design

### Core Rules

**1. 球的基本物理属性**：

| 属性 | 值 | 来源 | 说明 |
|------|-----|------|------|
| 视觉半径 | 15px | 配置常量 | 玩家看到的球的大小 |
| 碰撞半径 | 15px | 碰撞系统 | 物理碰撞检测用 |
| 质量 | 1.0 | 物理引擎默认 | 影响碰撞响应 |
| 初始位置 | 关卡配置 | 关卡系统 | 球发射起点 |
| 初始速度 | 0 | — | 球开始时静止 |

**2. 球的发射机制**：
- **发射时机**: 玩家确认发射（点击发射按钮或画完第一条线后自动发射）
- **发射位置**: 关卡配置的起点位置
- **发射方向**: 默认向下（-90°），可由关卡配置调整
- **发射初速度**: `BALL_INITIAL_SPEED = 300` 像素/秒
- **发射方式**: 施加瞬时冲量（Impulse），不是持续力

**3. 重力规则**：
- **重力加速度**: `GRAVITY = 980` 像素/秒²（约等于真实世界的视觉效果）
- **作用方向**: 向下（+Y 方向，Cocos Creator 坐标系）
- **持续作用**: 从球发射开始，一直作用到球出界或关卡结束

**4. 反弹规则**：
- **反弹系数**: 继承碰撞系统的设置
  - 球与线段: restitution = 0.95（碰撞系统）
  - 球与边界: restitution = 0.8（边界系统）
- **摩擦力**: friction = 0.0（球无摩擦，滑动反弹）
- **反弹角度**: 入射角 = 反射角（理想反弹）

**5. 速度限制**：
- **最大速度**: `MAX_BALL_SPEED = 1500` 像素/秒（防止穿透）
- **最小速度**: `MIN_BALL_SPEED = 50` 像素/秒（防止几乎静止）
- **速度钳制**: 每帧检查并钳制速度到范围内

**6. 球的状态**：
- **静止** (Idle): 未发射，等待发射指令
- **运动中** (Moving): 已发射，受物理模拟
- **出界** (OutOfBounds): 越过底部边界，触发失败
- **收集完成** (Collected): 所有光点收集完成，触发胜利

### States and Transitions

**球的状态机图**：

```
┌─────────┐    发射指令    ┌─────────┐
│  Idle   │ ────────────► │ Moving  │
└─────────┘               └─────────┘
     ▲                         │
     │                         │
     │    ┌────────────────────┼────────────────────┐
     │    │                    │                    │
     │    ▼                    ▼                    ▼
     │  ┌──────────┐      ┌──────────┐        ┌──────────┐
     └──│OutOfBounds│      │ Collected │        │  Paused  │
        └──────────┘      └──────────┘        └──────────┘
           失败               胜利                 暂停
```

**状态转换表**：

| 当前状态 | 触发事件 | 目标状态 | 副作用 |
|---------|---------|---------|--------|
| `Idle` | 发射指令 | `Moving` | 施加初始冲量，开始物理模拟 |
| `Idle` | 关卡重置 | `Idle` | 重置到初始位置 |
| `Moving` | 越过底部边界 | `OutOfBounds` | 停止物理，触发出界事件 |
| `Moving` | 所有光点收集 | `Collected` | 停止物理，触发胜利事件 |
| `Moving` | 暂停指令 | `Paused` | 暂停物理模拟 |
| `Moving` | 速度钳制 | `Moving` | 调整速度到范围内（无状态变化） |
| `Paused` | 恢复指令 | `Moving` | 恢复物理模拟 |
| `OutOfBounds` | 关卡重置 | `Idle` | 重置到初始位置 |
| `Collected` | 进入下一关 | `Idle` | 重置到初始位置 |

**状态详细说明**：

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Idle** | 关卡加载/重置 | 发射指令 | 球静止在发射位置，不参与物理模拟 |
| **Moving** | 发射指令 | 出界/收集/暂停 | 受重力影响，参与碰撞检测，速度被钳制 |
| **Paused** | 暂停指令 | 恢复指令 | 物理模拟暂停，位置和速度保持 |
| **OutOfBounds** | 越过底部边界 | 关卡重置 | 停止物理，触发游戏状态管理的 `onBallOutOfBounds()` |
| **Collected** | 所有光点收集 | 进入下一关 | 停止物理，触发游戏状态管理的胜利处理 |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **碰撞系统** | 输出 → | `registerBall(position: Vec2, radius: number): void` | 注册球的碰撞体 |
| **碰撞系统** | 输出 → | `unregisterBall(): void` | 移除球的碰撞体 |
| **碰撞系统** | 输入 ← | `onBallHitLine(position: Vec2, normal: Vec2): void` | 球撞线回调 |
| **碰撞系统** | 输入 ← | `onBallHitBoundary(position: Vec2, boundary: string): void` | 球撞边界回调 |
| **边界系统** | 输入 ← | `onBallOutOfBounds(): void` | 球越过底部边界回调 |
| **游戏状态管理** | 输出 → | `onBallOutOfBounds(): void` | 通知球出界 |
| **游戏状态管理** | 输入 ← | `onPhaseChanged(phase: GamePhase): void` | 游戏阶段变化（暂停/恢复） |
| **视觉反馈系统** | 输出 → | `onBallBounce(position: Vec2, normal: Vec2): void` | 球反弹时触发视觉效果 |
| **音频系统** | 输出 → | `onBallBounce(position: Vec2): void` | 球反弹时播放音效 |
| **关卡系统** | 输入 ← | `getBallSpawnPosition(): Vec2` | 获取球发射位置 |
| **关卡系统** | 输入 ← | `getBallSpawnDirection(): number` | 获取球发射方向（角度） |
| **画线反弹系统** | 输出 → | `onBallHitLine(lineId: string): void` | 球撞到线时通知（用于撤销限制） |

**接口定义**：

```typescript
interface BallPhysicsConfig {
  visualRadius: number;      // 视觉半径
  colliderRadius: number;    // 碰撞半径
  initialSpeed: number;      // 发射初速度
  gravity: number;           // 重力加速度
  maxSpeed: number;          // 最大速度
  minSpeed: number;          // 最小速度
}

interface BallState {
  phase: BallPhase;
  position: Vec2;
  velocity: Vec2;
  speed: number;
}

enum BallPhase {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  PAUSED = 'PAUSED',
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  COLLECTED = 'COLLECTED'
}
```

## Formulas

### 发射初速度向量

```
launchVelocity.x = BALL_INITIAL_SPEED * cos(launchAngle)
launchVelocity.y = BALL_INITIAL_SPEED * sin(launchAngle)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| BALL_INITIAL_SPEED | number | 300 | 配置常量 | 发射初速度大小（像素/秒） |
| launchAngle | number | -180°~180° | 关卡配置 | 发射角度（-90° = 向下） |
| launchVelocity | Vec2 | — | 计算得出 | 发射初速度向量 |

### 重力作用

```
velocity.y += GRAVITY * deltaTime
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| GRAVITY | number | 980 | 配置常量 | 重力加速度（像素/秒²） |
| deltaTime | number | 0-0.1 | 引擎 | 帧间隔时间（秒） |
| velocity.y | number | — | 物理模拟 | 球的垂直速度分量 |

### 速度大小计算

```
speed = sqrt(velocity.x² + velocity.y²)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| velocity.x | number | — | 物理模拟 | 球的水平速度分量 |
| velocity.y | number | — | 物理模拟 | 球的垂直速度分量 |
| speed | number | 0-∞ | 计算得出 | 球的速度大小 |

### 速度钳制

```
if (speed > MAX_BALL_SPEED) {
    velocity = velocity.normalize() * MAX_BALL_SPEED
} else if (speed < MIN_BALL_SPEED && speed > 0) {
    velocity = velocity.normalize() * MIN_BALL_SPEED
}
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| MAX_BALL_SPEED | number | 1500 | 配置常量 | 最大速度（像素/秒） |
| MIN_BALL_SPEED | number | 50 | 配置常量 | 最小速度（像素/秒） |

### 反弹速度计算

```
// 入射角 = 反射角，速度按弹性系数衰减
reflectedVelocity = incidentVelocity - 2 * dot(incidentVelocity, normal) * normal
reflectedVelocity *= restitution
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| incidentVelocity | Vec2 | — | 物理模拟 | 入射速度 |
| normal | Vec2 | 单位向量 | 碰撞系统 | 碰撞法线 |
| restitution | number | 0.8-0.95 | 碰撞材料 | 弹性系数 |
| reflectedVelocity | Vec2 | — | 计算得出 | 反射速度 |

### 出界判定

```
isOutOfBounds = (ballPosition.y < bottomBoundary - BALL_RADIUS)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| ballPosition.y | number | — | 物理模拟 | 球的 Y 坐标 |
| bottomBoundary | number | — | 边界系统 | 底部边界 Y 坐标 |
| BALL_RADIUS | number | 15 | 配置常量 | 球的半径 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **球高速穿透线段**（隧道效应） | 启用 CCD（连续碰撞检测），确保检测到碰撞 | 防止物理 bug，设置 `bullet=true` |
| **球卡在角落** | 物理引擎自动分离，不会永久卡住 | Box2D 内置分离机制 |
| **球速度为 0 时停止** | 钳制到 MIN_BALL_SPEED 或判定为异常状态 | 防止球"冻住" |
| **球发射时位置被遮挡** | 正常发射，物理引擎处理碰撞 | 玩家的策略选择 |
| **暂停时球正在高速运动** | 速度被保存，恢复后精确继续 | 状态持久化 |
| **球出界后仍在移动** | 立即停止物理模拟，禁用碰撞体 | 防止继续触发事件 |
| **发射方向指向屏幕外** | 正常发射，球会反弹回来或出界 | 玩家的策略选择 |
| **球在同一帧内碰撞多次** | 每次碰撞独立处理，速度累加调整 | 物理引擎默认行为 |
| **球与多个线段同时碰撞** | 物理引擎处理，取最近的碰撞 | Box2D 内置处理 |
| **关卡未配置发射位置** | 使用默认位置（屏幕顶部中央） | 优雅降级 |
| **关卡未配置发射方向** | 使用默认方向（向下 -90°） | 优雅降级 |
| **重力值设为 0** | 球直线运动，不落下 | 允许特殊关卡设计（零重力） |
| **球半径超过屏幕尺寸** | 拒绝加载关卡，报错"球配置无效" | 防止渲染问题 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **碰撞系统** | 双向 | 硬依赖：注册球碰撞体；接收碰撞回调 | Approved |
| **边界系统** | 输入 ← | 硬依赖：接收出界回调 | Approved |
| **游戏状态管理** | 双向 | 软依赖：通知出界/收集；接收暂停/恢复指令 | Approved |
| **视觉反馈系统** | 输出 → | 软依赖：反弹时触发视觉效果 | Approved |
| **音频系统** | 输出 → | 软依赖：反弹时播放音效 | Approved |
| **关卡系统** | 输入 ← | 软依赖：获取发射位置和方向 | 未设计 |
| **画线反弹系统** | 输出 → | 软依赖：球撞线时通知（用于撤销限制） | 未设计 |
| **光点收集系统** | 输出 → | 软依赖：球位置用于收集检测（由碰撞系统处理） | 未设计 |
| **出界检测系统** | 输出 → | 软依赖：出界时通知（由边界系统处理） | 未设计 |

**依赖性质分析**：
- **碰撞系统**：**硬依赖**——没有碰撞系统，球无法与任何物体交互
- **边界系统**：**硬依赖**——没有边界系统，无法检测出界
- **游戏状态管理**：**软依赖**——可以没有游戏状态管理运行，但无法响应暂停/恢复
- **视觉/音频系统**：**软依赖**——核心物理功能不依赖它们，只是增强体验

**注意**：球物理系统是 Feature 层，依赖 Core 层的碰撞系统和边界系统。所有依赖它的系统都在 Feature 或 Presentation 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **BALL_INITIAL_SPEED** | 300 | 100-600 | 球飞得更快，反应时间更短 | 球飞得更慢，更容易预测 |
| **GRAVITY** | 980 | 0-2000 | 球下落更快，轨迹更陡 | 球下落更慢，轨迹更平 |
| **MAX_BALL_SPEED** | 1500 | 500-3000 | 允许更高速，但可能穿透 | 限制速度，更安全但可能不自然 |
| **MIN_BALL_SPEED** | 50 | 0-200 | 防止"慢动作"效果 | 允许球几乎静止 |
| **BALL_RADIUS** | 15 | 10-30 | 碰撞更宽容，更容易收集 | 碰撞更精确，需要更准 |
| **BALL_RESTITUTION** | 0.9 | 0.5-1.0 | 反弹更有力，弹得更远 | 反弹更弱，能量损失更多 |

**交互影响**：
- `GRAVITY` 和 `BALL_INITIAL_SPEED` 共同决定球的轨迹弧度
- `MAX_BALL_SPEED` 过低可能导致重力加速效果不自然
- `BALL_RESTITUTION` 应该与碰撞系统的设置一致（0.9）

**高风险调参警告**：
- **反弹手感是核心体验**——这些参数需要早期原型验证
- **音效和视觉反馈必须与物理同步**——延迟会破坏"爽感"
- 建议创建"物理参数调试场景"快速迭代
- 使用 Cocos Creator 的物理调试视图可视化碰撞体和速度向量

## Visual/Audio Requirements

球物理系统本身不直接控制视觉/音频，但会触发其他系统的反馈：

| Event | Visual System | Audio System |
|-------|--------------|--------------|
| 球发射 | 球显示发射动画 | `playSound('launch')` |
| 球反弹（撞线） | `playBounceEffect(position)` | `playSound('bounce')` |
| 球反弹（撞边界） | 无特殊效果 | `playSound('bounce_wall')`（可选） |
| 球出界 | `playLoseEffect()` | `playSound('lose')` |
| 球运动中 | 球跟随物理位置更新（每帧） | 无 |

**调试可视化**（仅开发模式）：
- 显示球的速度向量（红色箭头）
- 显示球的碰撞体轮廓（绿色圆圈）
- 显示速度数值（文本）

## UI Requirements

球物理系统为 UI 系统提供数据：

| UI Element | Data Source | Update Frequency |
|------------|-------------|------------------|
| 球的位置 | `ballPosition` | 每帧 |
| 球的速度 | `speed` | 每帧（调试用） |

**注意**：球的视觉表现由游戏场景渲染，不是 UI 元素。

## Acceptance Criteria

### 物理行为验收

- [ ] 球发射后受重力影响，轨迹呈抛物线
- [ ] 球撞到线段后正确反弹（入射角 ≈ 反射角）
- [ ] 球撞到边界后正确反弹
- [ ] 球越过底部边界时触发 `onBallOutOfBounds()`
- [ ] 球速度被正确钳制在 [MIN_BALL_SPEED, MAX_BALL_SPEED] 范围内
- [ ] 高速球不会穿透线段或边界（CCD 工作正常）

### 状态管理验收

- [ ] 发射前球处于 Idle 状态，静止在发射位置
- [ ] 发射后球进入 Moving 状态
- [ ] 暂停后球进入 Paused 状态，速度被保存
- [ ] 恢复后球继续之前的运动，速度精确恢复
- [ ] 出界后球进入 OutOfBounds 状态，物理模拟停止

### 碰撞交互验收

- [ ] `registerBall()` 正确注册球碰撞体
- [ ] `onBallHitLine()` 在球撞线时正确触发
- [ ] `onBallHitBoundary()` 在球撞边界时正确触发
- [ ] `onBallOutOfBounds()` 在球越界时正确触发

### 性能验收

- [ ] 物理模拟不影响帧率（保持 60fps）
- [ ] 碰撞检测开销 < 0.5ms/帧
- [ ] 无 GC 压力（无每帧内存分配）

### 配置验收

- [ ] 所有物理参数可通过配置文件调整
- [ ] 配置热重载：修改配置后重新加载场景，新值生效

### 体验验收（定性）

- [ ] 反弹手感"爽"——视觉和音效同步
- [ ] 球的轨迹"可预测"——玩家能根据经验规划
- [ ] 没有"物理 bug"——不会卡住、穿透、飞出屏幕

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|------------|
| 球发射是自动还是手动触发？ | UX 测试后决定 | — | 待定（当前设计支持两种模式） |
| 是否需要球的"轨迹预览"功能？ | 原型测试后决定 | — | 待定（可能降低策略性） |
| 边界反弹是否需要不同音效？ | 音频设计时决定 | — | 待定 |
| 是否需要"慢动作回放"功能（过关时）？ | 功能评估后决定 | — | 待定（增加爽感但增加复杂度） |
| 零重力关卡是否在 MVP 范围内？ | 关卡设计时决定 | — | 待定（当前假设不在 MVP 内） |
| 球的颜色/皮肤是否影响物理？ | 功能评估后决定 | — | 待定（当前假设纯视觉，无物理影响） |
