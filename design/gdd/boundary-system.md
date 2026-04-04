# 边界系统 (Boundary System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 策略简洁

## Overview

边界系统定义了游戏的**可玩区域**——一个由左、右、上、下四条边围成的矩形空间。前三条边是"墙"，球碰到会反弹；底部边是"悬崖"，球越过即判定失败。对于玩家来说，边界是**隐形的舞台边界**——他们不会主动思考边界，但边界的存在创造了紧张感和策略约束。没有边界系统，球会飞出屏幕，游戏失去失败条件和空间限制。

边界是**自动生效的**——玩家不需要操作边界，但他们画的线、发射的球都必须在边界内才能产生效果。这个系统的核心价值是**定义空间和后果**：在边界内，一切正常；越过底部边界，游戏结束。

## Player Fantasy

玩家应该感觉边界是**公平且不可协商的**——它就像物理世界的重力一样，是一种"自然法则"。你不会对"为什么掉下去会失败"感到困惑，这是直觉的。

玩家**不会注意到**边界本身——这正是目标。边界应该像画框一样，定义了作品的范围但不吸引注意力。但如果边界位置不合理（比如太窄让玩家无法发挥，或太宽让紧张感消失），玩家会感到"这关设计有问题"。

**关键体验目标**：
- **安全感**：在边界内，玩家可以自由发挥，不用担心"意外的死亡区域"
- **紧张感**：当球接近底部边界时，玩家会本能地紧张——"快画线挡住它！"
- **公平感**：边界位置清晰可见，失败永远是玩家的策略失误，不是"边界突然变了"或"判定不清"

## Detailed Design

### Core Rules

1. **边界组成**：游戏区域由四条边组成的矩形
   - **左边界** (Left)：x = `BOUNDARY_PADDING`
   - **右边界** (Right)：x = `screenWidth - BOUNDARY_PADDING`
   - **上边界** (Top)：y = `screenHeight - BOUNDARY_PADDING - SAFE_AREA_TOP`
   - **下边界** (Bottom)：y = `BOUNDARY_PADDING + SAFE_AREA_BOTTOM`

2. **边界行为矩阵**：

   | 边界 | 物理类型 | 碰撞行为 | 触发事件 | 碰撞分组 |
   |------|----------|----------|----------|----------|
   | 左边界 | 静态刚体 | 球反弹 | 无 | BOUNDARY (0x0008) |
   | 右边界 | 静态刚体 | 球反弹 | 无 | BOUNDARY (0x0008) |
   | 上边界 | 静态刚体 | 球反弹 | 无 | BOUNDARY (0x0008) |
   | 下边界 | **Sensor** | 球穿透 | `onBallOutOfBounds()` | BOUNDARY (0x0008) |

3. **安全区域处理**：
   - `SAFE_AREA_TOP`：顶部安全区域（刘海屏、状态栏）
   - `SAFE_AREA_BOTTOM`：底部安全区域（手势条）
   - 安全区域值从引擎 API 获取，运行时动态计算

4. **边界坐标系统**：
   - 使用**屏幕坐标**：左下角为 (0, 0)
   - 边界值在**场景初始化时计算**，基于当前屏幕尺寸
   - 边界在**关卡生命周期内固定**（不会动态变化）

5. **边界厚度**：
   - 物理碰撞体厚度：`BOUNDARY_COLLIDER_THICKNESS = 10px`
   - 足够厚防止高速穿透，但对玩家不可见

6. **边界可见性**：
   - **完全不可见**——玩家通过游戏过程学习边界位置
   - 边界没有视觉表现（无线条、无发光）
   - 出界时的失败反馈由视觉反馈系统提供

### States and Transitions

边界系统本身无状态——它在场景加载时初始化，在场景卸载时销毁。

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Active** | 游戏场景加载完成 | 场景开始卸载 | 边界碰撞体生效，处理出界回调 |
| **Inactive** | 非游戏场景 | 进入游戏场景 | 边界碰撞体不存在 |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **碰撞系统** | 输出 → | `registerBoundary(edges: BoundaryEdges): void` | 注册四条边为碰撞体 |
| **碰撞系统** | 输出 → | `unregisterBoundary(): void` | 移除边界碰撞体 |
| **出界检测系统** | 输入 ← | `onBallOutOfBounds(): void` | 球越界回调（仅底部） |
| **场景管理** | 输入 ← | `onSceneReady(screenWidth, screenHeight, safeArea): void` | 场景加载完成，传入屏幕尺寸 |
| **关卡系统** | 输入 ← | `getCustomBoundary(): BoundaryConfig \| null` | 获取自定义边界配置（未来扩展，当前返回 null） |

## Formulas

### 边界坐标计算

```
leftBoundary = BOUNDARY_PADDING
rightBoundary = screenWidth - BOUNDARY_PADDING
topBoundary = screenHeight - BOUNDARY_PADDING - SAFE_AREA_TOP
bottomBoundary = BOUNDARY_PADDING + SAFE_AREA_BOTTOM
playableWidth = rightBoundary - leftBoundary
playableHeight = topBoundary - bottomBoundary
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| screenWidth | number | 设备相关 | 引擎 API | 屏幕宽度（设计像素） |
| screenHeight | number | 设备相关 | 引擎 API | 屏幕高度（设计像素） |
| BOUNDARY_PADDING | number | 20px | 配置常量 | 边界与屏幕边缘的间距 |
| SAFE_AREA_TOP | number | 设备相关 | 引擎 API | 顶部安全区域高度（刘海屏） |
| SAFE_AREA_BOTTOM | number | 设备相关 | 引擎 API | 底部安全区域高度（手势条） |
| playableWidth | number | 计算得出 | — | 可玩区域宽度 |
| playableHeight | number | 计算得出 | — | 可玩区域高度 |

### 边界碰撞体参数

| Parameter | 左/右/上边界 | 下边界 |
|-----------|-------------|--------|
| **物理类型** | Static RigidBody | Static Sensor |
| **碰撞体厚度** | 10px | 10px |
| **friction** (摩擦力) | 0.0 | N/A |
| **restitution** (弹性) | 0.8 | N/A |
| **collisionCategory** | 0x0008 (BOUNDARY) | 0x0008 (BOUNDARY) |
| **sensor** | false | **true** |
| **behavior** | 物理反弹 | 穿透 + 触发事件 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **屏幕尺寸变化**（旋转、分屏） | 边界不重新计算，保持初始值；如果必须响应，重启当前关卡 | 微信小游戏通常锁定竖屏，此情况极少发生 |
| **极端宽高比**（超宽屏 21:9） | 可玩区域可能太窄，提示"此设备屏幕比例不支持" | 设计目标：9:16 到 9:19.5（主流手机） |
| **球高速穿过底部边界**（隧道效应） | 仍能检测到穿透，Sensor 触发不依赖几何重叠 | 底部边界是 Sensor，使用 `onBeginContact` |
| **球卡在角落**（左下/右下） | 物理引擎自动应用分离力 | Box2D 内置处理，防止刚体重叠 |
| **安全区域 API 返回异常值**（负数、超屏幕） | 使用安全默认值（top=44px, bottom=34px） | 优雅降级，游戏仍可玩 |
| **暂停时球正在穿越底部边界** | 碰撞回调已被忽略（碰撞系统暂停状态） | 恢复后球已穿透，下一帧再次检测 |
| **关卡未指定边界配置** | 使用默认全屏边界（考虑安全区域） | 所有关卡至少有默认边界 |
| **边界内有障碍物延伸到边界外** | 障碍物有自己的碰撞体，正常工作 | 边界只是"舞台边界"，不限制内容 |
| **球在边界上静止** | 物理引擎处理，球会缓慢滑落 | 重力会推动球离开边界 |
| **同时多个球越界** | 逐个处理，每个球触发独立的 `onBallOutOfBounds()` | 当前设计为单球，未来扩展 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **场景管理** | 输入 ← | 场景加载完成时传入屏幕尺寸和安全区域；场景卸载时销毁边界 | Approved |
| **碰撞系统** | 输出 → | 注册/注销边界碰撞体；接收底部边界的穿透回调 | Approved |
| **出界检测系统** | 输出 → | 提供出界回调接口 `onBallOutOfBounds()` | 未设计 |
| **关卡系统** | 输入 ← | 获取自定义边界配置（未来扩展，当前返回 null） | 未设计 |

**依赖性质分析**：
- **场景管理**：**硬依赖**——没有屏幕尺寸信息，无法计算边界位置
- **碰撞系统**：**硬依赖**——边界本质上是碰撞体，需要注册到物理引擎
- **出界检测系统**：**软依赖**——边界系统只发出回调，具体失败处理由出界检测系统负责
- **关卡系统**：**软依赖**——自定义边界是增强功能，默认边界即可工作

**注意**：边界系统是 Core 层，只依赖 Foundation 层的场景管理。所有依赖它的系统都在 Feature 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **BOUNDARY_PADDING** | 20px | 0-50px | 可玩区域变小，更紧凑紧张 | 可玩区域变大，更宽松自由 |
| **BOUNDARY_RESTITUTION** | 0.8 | 0.5-1.0 | 边界反弹更强劲，球弹更远 | 边界反弹更弱，球"吸"在墙上 |
| **BOUNDARY_THICKNESS** | 10px | 5-20px | 更厚=防穿透更好，但对高速球影响小 | 更薄=碰撞更精确，但可能穿透 |

**交互影响**：
- `BOUNDARY_PADDING` 影响所有关卡的"拥挤感"——太大让策略空间变小
- `BOUNDARY_RESTITUTION` 应该**略低于** `LINE_RESTITUTION` (0.95)，让玩家感觉"线比边界更有弹性"
- `BOUNDARY_THICKNESS` 对游戏体验影响最小——它只是物理引擎内部参数

**与碰撞系统的关系**：
- 碰撞系统定义了 `BOUNDARY` 的物理材料 (friction=0.0, restitution=0.8)
- 边界系统的 `BOUNDARY_RESTITUTION` 应该与碰撞系统的值一致

## Visual/Audio Requirements

边界系统本身是**不可见**的——它没有视觉表现。但以下情况需要视觉反馈：

| Event | Visual Feedback | Audio Feedback | System |
|-------|----------------|----------------|--------|
| 球撞左/右/上边界 | 无（球自然反弹） | 无 | — |
| 球越下边界（出界） | `playLoseEffect()`（屏幕变暗+抖动） | `playSound('lose')` | 视觉反馈系统 / 音频系统 |

**调试可视化**（仅开发模式，通过 `?debug=1` 激活）：
- 可选显示边界碰撞体轮廓（绿色线框，`gizmo.color = Color.GREEN`）
- 可选显示可玩区域矩形（半透明绿色填充）
- 可选显示安全区域边界（红色虚线）

## UI Requirements

边界系统**无直接 UI 需求**。可玩区域是游戏场景的一部分，不是 UI 元素。

**间接 UI 影响**：
- **关卡编辑器**（未来工具）需要可视化边界配置
- **设置界面**不会暴露边界参数（玩家不应调整）

## Acceptance Criteria

### 功能验收

- [ ] 游戏场景加载时，四条边界碰撞体被正确创建并注册到碰撞系统
- [ ] `getPlayableArea()` 返回正确的可玩区域矩形（左下角 + 宽高）
- [ ] 左边界：球从右向左撞击后正确反弹
- [ ] 右边界：球从左向右撞击后正确反弹
- [ ] 上边界：球从下向上撞击后正确反弹
- [ ] 下边界：球穿透时触发 `onBallOutOfBounds()` 回调，球**不**反弹
- [ ] 安全区域被正确处理（刘海屏、底部手势条不遮挡可玩区域）

### 生命周期验收

- [ ] 场景卸载时，边界碰撞体被正确销毁
- [ ] 暂停/恢复不影响边界碰撞体（它们始终存在，只是回调被忽略）
- [ ] 多次进入/退出游戏场景，边界正确重建/销毁，无内存泄漏

### 边界情况验收

- [ ] 高速球不会穿透左/右/上边界（CCD 工作正常）
- [ ] 球卡在角落时不会永久卡住，物理引擎会分离
- [ ] 安全区域 API 返回异常值时，使用默认值优雅降级

### 性能验收

- [ ] 边界碰撞检测开销 < 0.1ms/帧（在目标设备上）
- [ ] 边界系统不产生 GC 压力（无每帧分配）

### 配置验收

- [ ] 无硬编码值：`BOUNDARY_PADDING`、`BOUNDARY_RESTITUTION`、`BOUNDARY_THICKNESS` 可通过配置文件调整
- [ ] 配置热重载：修改配置后重新加载场景，新值生效

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要边界反弹音效？ | 原型测试后决定 | — | 待定（当前设计：无，保持简洁） |
| 是否支持动态边界（关卡进行中边界收缩/扩展）？ | 功能评估后决定 | — | 待定（增加紧张感但增加复杂度） |
| 底部边界是否应该有"警告区域"（球接近时视觉提示）？ | UX 测试后决定 | — | 待定（可能让新玩家更友好，但破坏沉浸） |
| 是否需要"边界调试视图"快捷键？ | 开发阶段决定 | — | 待定（对调试有帮助） |
| 极端宽高比设备的处理策略？ | UX 测试后决定 | — | 待定（当前：提示不支持，未来可能裁剪/黑边） |
