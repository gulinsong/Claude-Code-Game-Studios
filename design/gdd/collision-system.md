# 碰撞系统 (Collision System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 物理爽感

## Overview

碰撞系统负责检测游戏中所有物理对象之间的碰撞事件。它监测球与线段、球与光点、球与边界之间的接触，并在碰撞发生时通知相关系统。对于玩家来说，这个系统是透明的——他们只看到球"撞到"线然后反弹、"碰到"光点然后收集。没有碰撞系统，球会穿透一切，游戏无法运行。

碰撞检测是**自动的**——玩家不直接操作这个系统，但他们画的线、发射的球都依赖碰撞检测来产生游戏效果。这个系统的核心价值是**精确和及时**：每次碰撞都必须被准确检测，否则反弹手感和收集反馈都会受影响。

## Player Fantasy

玩家应该感觉物理世界是**真实可靠的**——球撞到线就会反弹，碰到光点就会收集，从边界掉出去就会失败。这种"物理一致性"让玩家能够信任游戏，从而专注于策略规划。

玩家**不会注意到**碰撞系统本身——这正是目标。当碰撞检测完美工作时，玩家只感受到"我画的线挡住了球"。但如果碰撞检测有延迟或穿透，玩家会立刻感到"这游戏有bug"、"手感不好"。

**关键体验目标**：
- 反弹时：球与线的接触点精确，反弹角度符合直觉
- 收集时：球碰到光点的瞬间立即触发收集，没有延迟
- 出界时：球越过边界时立即判定失败，不出现"半个球在外面还在玩"的情况

## Detailed Design

### Core Rules

1. **碰撞对象类型**：游戏有 4 种可碰撞对象
   - **球** (Ball)：动态刚体，受重力影响，可与其他所有对象碰撞
   - **线段** (Line)：静态刚体，由玩家绘制，只与球碰撞
   - **光点** (LightPoint)：触发器 (Sensor)，无物理阻挡，球经过时触发收集事件
   - **边界** (Boundary)：静态刚体，包围游戏区域，球越过底部边界触发失败

2. **碰撞分组 (Collision Category)**：
   - `BALL`：球（Category: 0x0001）
   - `LINE`：线段（Category: 0x0002）
   - `LIGHTPOINT`：光点（Category: 0x0004，Sensor=true）
   - `BOUNDARY`：边界（Category: 0x0008）

3. **碰撞矩阵**：

   | From | To | Collide | Event |
   |------|-----|---------|-------|
   | Ball | Line | ✅ 物理碰撞 | `onBallHitLine(position, normal)` |
   | Ball | LightPoint | ❌ 穿透 (Sensor) | `onBallCollectLightPoint(lightPointId)` |
   | Ball | Boundary (侧边/顶部) | ✅ 物理碰撞 | 无事件（正常反弹） |
   | Ball | Boundary (底部) | ❌ 穿透 (Sensor) | `onBallOutOfBounds()` |

4. **碰撞回调流程**：
   ```
   物理引擎检测碰撞 --> CollisionSystem.onBeginContact()
                     --> 根据碰撞对类型分发事件
                     --> 通知相关系统（视觉反馈、音频、游戏逻辑）
   ```

5. **线段生命周期**：
   - 线段创建时：注册为静态刚体，参与碰撞检测
   - 线段被撤销时：销毁刚体组件，移出碰撞检测
   - 场景切换时：清除所有线段刚体

### States and Transitions

碰撞系统本身无状态——它只响应物理引擎的回调。但需要管理**碰撞对象注册表**：

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Active** | 游戏场景加载完成 | 场景开始卸载 | 正常处理碰撞回调 |
| **Paused** | 游戏暂停 | 游戏恢复 | 忽略所有碰撞回调 |
| **Inactive** | 非游戏场景 | 进入游戏场景 | 不处理碰撞 |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **画线反弹系统** | 输出 → | `registerLine(start: Vec2, end: Vec2): lineId` | 注册新线段为碰撞体 |
| **画线反弹系统** | 输出 → | `unregisterLine(lineId: string)` | 移除线段碰撞体 |
| **光点收集系统** | 输出 → | `registerLightPoint(position: Vec2, radius: number): lightPointId` | 注册光点触发器 |
| **光点收集系统** | 输出 → | `unregisterLightPoint(lightPointId: string)` | 移除光点触发器 |
| **出界检测系统** | 输入 ← | `onBallOutOfBounds(): void` | 球越界回调 |
| **视觉反馈系统** | 输入 ← | `onBallHitLine(position: Vec2, normal: Vec2): void` | 球撞线回调 |
| **音频系统** | 输入 ← | `onBallHitLine(position: Vec2, normal: Vec2): void` | 球撞线回调（播放反弹音效） |
| **场景管理** | 输入 ← | `clearAllColliders(): void` | 场景切换时清除所有碰撞体 |
| **游戏状态管理** | 输入 ← | `setPaused(paused: boolean): void` | 暂停/恢复碰撞检测 |

## Formulas

### 球的碰撞参数

```
ballColliderRadius = BALL_VISUAL_RADIUS * COLLIDER_SCALE
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| BALL_VISUAL_RADIUS | number | 15px | 配置常量 | 球的视觉半径 |
| COLLIDER_SCALE | number | 1.0 | 配置常量 | 碰撞体缩放（可略微大于视觉以增加容错） |
| ballColliderRadius | number | 15px | 计算得出 | 球的物理碰撞半径 |

### 线段的碰撞参数

```
lineColliderThickness = LINE_VISUAL_THICKNESS * COLLIDER_PADDING
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| LINE_VISUAL_THICKNESS | number | 4px | 视觉反馈系统 | 线的视觉粗细 |
| COLLIDER_PADDING | number | 1.5 | 配置常量 | 碰撞体加厚系数（让碰撞更宽容） |
| lineColliderThickness | number | 6px | 计算得出 | 线的物理碰撞厚度 |

### 光点收集范围

```
collectionRadius = LIGHTPOINT_VISUAL_RADIUS + BALL_RADIUS + COLLECTION_TOLERANCE
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| LIGHTPOINT_VISUAL_RADIUS | number | 12px | 配置常量 | 光点的视觉半径 |
| BALL_RADIUS | number | 15px | 球配置 | 球的半径 |
| COLLECTION_TOLERANCE | number | 5px | 配置常量 | 收集容差（让收集更宽容） |
| collectionRadius | number | 32px | 计算得出 | 光点触发器半径 |

### 物理材料参数

| Parameter | Ball | Line | Boundary |
|-----------|------|------|----------|
| **friction** (摩擦力) | 0.0 | 0.2 | 0.0 |
| **restitution** (弹性) | 0.9 | 0.95 | 0.8 |
| **density** (密度) | 1.0 | N/A (静态) | N/A (静态) |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **球高速穿过线段** (隧道效应) | 仍能检测到碰撞 | Box2D 使用连续碰撞检测 (CCD) 防止穿透，启用 `bullet=true` |
| **同时碰撞多个光点** | 按距离排序，逐个触发收集事件 | 确定性的收集顺序，避免竞态 |
| **球在边界夹角处卡住** | 物理引擎自动应用分离力 | Box2D 内置处理，防止刚体重叠 |
| **线段与线段重叠/交叉** | 各自独立碰撞，球可能多次连续反弹 | 玩家的策略选择，不限制 |
| **球与光点边缘接触** | 由于 COLLECTION_TOLERANCE，接触即触发 | 容差设计让收集更宽容 |
| **暂停时发生碰撞** | 忽略碰撞回调，不触发任何事件 | 暂停应完全冻结游戏状态 |
| **场景切换时有碰撞回调** | 忽略，系统已进入 Inactive 状态 | 防止空指针和无效状态 |
| **线段端点碰撞** | 正常处理，碰撞法线为线段法线 | 端点也是线段的一部分 |
| **球出界后仍在移动** | 立即禁用球的碰撞体，停止物理模拟 | 防止球继续触发其他事件 |
| **无效的线段 (长度为0)** | 拒绝注册，返回 null | 防止零长度线段导致物理异常 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **场景管理** | 输入 ← | 碰撞检测只在游戏场景运行；场景切换时清除所有碰撞体 | Approved |
| **画线反弹系统** | 双向 | 注册/注销线段碰撞体；接收球撞线回调 | 未设计 |
| **光点收集系统** | 双向 | 注册/注销光点触发器；接收收集回调 | 未设计 |
| **出界检测系统** | 输出 → | 提供出界回调接口 | 未设计 |
| **视觉反馈系统** | 输出 → | 球撞线时触发 `playBounceEffect()` | Approved |
| **音频系统** | 输出 → | 球撞线时触发 `playSound('bounce')` | Approved |
| **游戏状态管理** | 输入 ← | 暂停/恢复碰撞检测 | 未设计 |

**注意**：碰撞系统是 Core 层，只依赖 Foundation 层的场景管理。所有依赖它的系统都在 Feature 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **BALL_RESTITUTION** | 0.9 | 0.7-1.0 | 球反弹更高更远，手感更"弹" | 球反弹更弱，手感更"软" |
| **LINE_RESTITUTION** | 0.95 | 0.8-1.0 | 线段反弹更强劲 | 线段反弹更弱 |
| **BALL_FRICTION** | 0.0 | 0.0-0.3 | 球旋转更多，反弹角度受影响 | 球滑动更顺滑 |
| **LINE_FRICTION** | 0.2 | 0.0-0.5 | 线段更"粗糙"，球反弹角度变化 | 线段更"光滑" |
| **COLLIDER_PADDING** | 1.5 | 1.0-2.0 | 碰撞更宽容，手感更友好 | 碰撞更精确，但可能穿透 |
| **COLLECTION_TOLERANCE** | 5px | 0-15px | 收集更容易，玩家更轻松 | 收集更精确，需要更准 |
| **CCD_VELOCITY_THRESHOLD** | 5 | 3-10 | 更早启用连续碰撞检测 | 更晚启用，可能穿透 |

**交互影响**：
- `BALL_RESTITUTION` 和 `LINE_RESTITUTION` 共同决定反弹效果
- `COLLIDER_PADDING` 过大可能导致视觉与物理不一致（球看起来没碰到线但反弹了）

## Visual/Audio Requirements

碰撞系统本身不直接控制视觉/音频，但会触发其他系统的反馈：

| Collision Event | Visual System Trigger | Audio System Trigger |
|-----------------|----------------------|---------------------|
| Ball ↔ Line | `playBounceEffect(position)` | `playSound('bounce')` |
| Ball ↔ LightPoint | `playCollectEffect(position)` | `playSound('collect')` |
| Ball ↔ Boundary (底部) | `playLoseEffect()` | `playSound('lose')` |

**调试可视化**（仅开发模式）：
- 可选显示碰撞体轮廓（绿色线框）
- 可选显示碰撞法线方向（红色箭头）

## UI Requirements

碰撞系统无直接 UI 需求。

## Acceptance Criteria

- [ ] `registerLine(start, end)` 返回有效的 lineId，线段参与碰撞检测
- [ ] `unregisterLine(lineId)` 后线段不再参与碰撞检测
- [ ] `registerLightPoint(position, radius)` 返回有效的 lightPointId
- [ ] `unregisterLightPoint(lightPointId)` 后光点不再触发收集
- [ ] 球与线段碰撞时，`onBallHitLine(position, normal)` 正确触发
- [ ] 球与光点接触时，`onBallCollectLightPoint(lightPointId)` 正确触发
- [ ] 球越过底部边界时，`onBallOutOfBounds()` 正确触发
- [ ] 球与侧边/顶部边界碰撞时正常反弹，不触发任何事件
- [ ] 高速球不会穿透线段（CCD 连续碰撞检测工作正常）
- [ ] 暂停时 `setPaused(true)` 后所有碰撞回调被忽略
- [ ] 场景切换时 `clearAllColliders()` 清除所有碰撞体
- [ ] 性能：碰撞检测不影响帧率（保持 60fps）
- [ ] 无硬编码值：所有参数可通过配置文件调整

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要碰撞调试视图？ | 开发阶段决定 | — | 待定 |
| 线段碰撞体是否需要端点圆角？ | 原型测试后决定 | — | 待定（方角可能导致奇怪的反弹角度） |
| 是否支持动态修改线段（拖拽调整）？ | 功能评估后决定 | — | 待定（当前设计不支持） |
| 球的最大速度限制是多少？ | 性能测试后决定 | — | 待定（影响 CCD 阈值设置） |
