# 场景管理 (Scene Management)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 策略简洁

## Overview

场景管理系统负责游戏场景的生命周期管理和切换。它处理场景的加载、卸载、过渡动画，以及场景间的数据传递。对于玩家来说，这个系统是透明的——他们只体验到流畅的界面切换，而不需要关心背后的加载过程。没有这个系统，游戏无法在不同界面间导航。

## Player Fantasy

玩家应该感觉场景切换是**瞬间无缝的**——点击按钮后立即进入下一个界面，没有加载条、没有等待、没有黑屏。这种流畅感让玩家专注于游戏本身，而不是被技术打断。场景过渡应该像翻书一样自然，不需要玩家思考"正在加载"这件事。

**注意**：由于微信小游戏有包体限制，可能需要预加载策略来实现瞬间切换的体验。

## Detailed Design

### Core Rules

1. **场景类型**：游戏有5个主要场景 + 2个覆盖层
   - **主菜单** (MainMenu)：游戏入口，包含开始游戏、设置按钮
   - **世界选择** (WorldSelect)：选择游戏世界，显示星星进度和解锁状态
   - **关卡选择** (LevelSelect)：显示关卡列表，已解锁/未解锁状态
   - **游戏场景** (Gameplay)：核心玩法场景
   **覆盖层**（在游戏场景内渲染）：
   - **暂停菜单** (PauseOverlay)：暂停时显示的覆盖层
   - **胜利结果** (WinResultOverlay)：关卡胜利时显示的覆盖层
   - **失败结果** (LoseResultOverlay)：关卡失败时显示的覆盖层

2. **场景栈**：使用单场景模式（不保留历史栈），每次只加载一个场景，节省内存

3. **过渡效果**：所有场景切换使用渐入渐出（Fade）过渡
   - 过渡时间：TRANSITION_DURATION = 0.3 秒（FADE_OUT 0.15s + FADE_IN 0.15s）
   - 过渡颜色：黑色 (#000000)

4. **数据传递**：场景切换时通过参数对象传递数据
   - `levelId`：当前关卡ID（关卡选择 → 游戏场景）
   - `result`：关卡结果（游戏场景 → 结果界面）
   - `settings`：玩家设置/偏好（所有场景共享）
   - `progress`：进度数据（所有场景共享）

5. **预加载策略**：为实现瞬间切换体验
   - 主菜单加载时，预加载关卡选择场景
   - 关卡选择时，预加载当前选中关卡的资源

### States and Transitions

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Current** | 场景加载完成 | 切换场景请求 | 场景正常运行 |
| **Transitioning** | 切换场景请求 | 过渡动画完成 | 显示渐变遮罩，加载新场景 |

**场景流程图**：
```
主菜单 --[开始游戏]--> 世界选择 --[选择世界]--> 关卡选择 --[选择关卡]--> 游戏场景
                                                                        │
                                                           ┌────────────┼────────────┐
                                                           ▼            ▼            ▼
                                                     暂停覆盖层    胜利覆盖层    失败覆盖层
                                                                        │
                                                                 [下一关/重试]
                                                                        │
                                                                        ▼
                                                              关卡选择（或直接加载下一关）
```

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **关卡系统** | 输出 → | `loadLevel(levelId: string)` | 请求加载指定关卡 |
| **游戏状态管理** | 双向 | `getGameState()` / `setGameState()` | 获取/设置游戏状态 |
| **存档系统** | 输入 ← | `loadProgress()` | 加载玩家进度 |
| **音频系统** | 输出 → | `playMusic(sceneType: string)` | 切换场景音乐 |
| **视觉反馈系统** | 输出 → | `showTransition(callback: Function)` | 显示过渡动画 |
| **UI系统** | 输出 → | `initUI(sceneType: string)` | 初始化当前场景的UI |

## Formulas

### 过渡时间计算

```
transitionDuration = FADE_OUT_TIME + FADE_IN_TIME
totalTransitionTime = transitionDuration
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| FADE_OUT_TIME | number | 0.15s | 配置常量 | 旧场景淡出时间 |
| FADE_IN_TIME | number | 0.15s | 配置常量 | 新场景淡入时间 |
| transitionDuration | number | 0.3s | 计算得出 | 总过渡时间 |

**Expected output**: 固定 0.3 秒过渡

### 场景加载时间预估

```
estimatedLoadTime = sceneComplexity * BASE_LOAD_TIME
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| sceneComplexity | number | 0.5-2.0 | 场景配置 | 场景复杂度系数 |
| BASE_LOAD_TIME | number | 100ms | 配置常量 | 基础加载时间 |

**Expected output range**: 50ms - 200ms（取决于场景复杂度）

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **场景加载失败** | 显示错误提示，停留在当前场景 | 防止玩家卡死 |
| **切换场景时来电/切换应用** | 保存当前状态，下次启动时恢复 | 防止进度丢失 |
| **快速连续点击切换按钮** | 忽略后续点击，只处理第一次 | 防止重复切换 |
| **预加载超时** | 降级为实时加载，显示短暂加载动画 | 优雅降级体验 |
| **内存不足** | 卸载未使用的资源，再尝试加载 | 微信小游戏内存敏感 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **关卡系统** | 输出 → | 请求加载指定关卡 | Approved |
| **游戏状态管理** | 双向 | 获取/设置游戏状态 | Approved |
| **存档系统** | 输入 ← | 加载玩家进度 | Approved |
| **音频系统** | 输出 → | 切换场景音乐 | Approved |
| **视觉反馈系统** | 输出 → | 显示过渡动画 | Approved |
| **UI系统** | 输出 → | 初始化当前场景的UI | Approved |

**注意**：场景管理是 Foundation 层，没有上游依赖。所有依赖它的系统都在 Core 或 Feature 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **TRANSITION_DURATION** | 0.3s | 0.3-1.0s | 过渡更优雅但等待更长 | 过渡更快但可能突兀 |
| **PRELOAD_DELAY** | 500ms | 200-1000ms | 预加载更充分 | 响应更快但可能加载不完整 |
| **SCENE_COMPLEXITY_FACTOR** | 1.0 | 0.5-2.0 | 加载时间预估更保守 | 加载时间预估更乐观 |

## Visual/Audio Requirements

| Event | Visual Feedback | Audio Feedback | Priority |
|-------|----------------|---------------|----------|
| 场景切换开始 | 黑色遮罩渐入 | 无 | High |
| 场景切换完成 | 黑色遮罩渐出 | 无 | High |
| 场景加载中 | 显示加载动画（如果预加载失败） | 无 | Medium |
| 场景加载失败 | 显示错误提示弹窗 | 播放错误音效 | Low |

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|-------------|-----------------|-----------------|-----------|
| 加载动画 | 屏幕中央 | 持续 | 仅当需要实时加载时 |
| 错误提示 | 弹窗 | 即时 | 加载失败时 |

## Acceptance Criteria

- [ ] 玩家点击按钮后，0.3秒内完成场景切换
- [ ] 场景切换使用渐入渐出动画
- [ ] 场景切换时正确传递数据（levelId, result等）
- [ ] 预加载功能正常工作（主菜单预加载关卡选择）
- [ ] 切换场景时背景音乐正确切换
- [ ] 加载失败时显示错误提示，不卡死
- [ ] 快速连续点击不会导致重复切换
- [ ] 性能：场景切换帧率保持 60fps
- [ ] 无硬编码值：所有参数可通过配置文件调整

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要场景加载进度条？ | 原型测试后决定 | — | 待定 |
| 预加载策略是否足够？ | 性能测试后决定 | — | 待定 |
