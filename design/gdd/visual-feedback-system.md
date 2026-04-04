# 视觉反馈系统 (Visual Feedback System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 物理爽感

## Overview

视觉反馈系统负责游戏中所有视觉效果的表现，包括粒子效果、动画、颜色变化等。它提供简单的 API 供其他系统调用，确保视觉反馈的及时性和美观性。对于玩家来说，视觉反馈是"物理爽感"的核心来源——每次反弹的粒子爆发、收集光点的闪光效果，都让操作变得有成就感。没有视觉反馈，游戏会显得平淡无奇。

## Player Fantasy

玩家应该感觉每次操作都有**清新愉悦的视觉反馈**——像玩泡泡纸一样，每次操作都有小小的"满足感"。视觉效果应该是明亮、圆润、有弹性的，让人感到轻松愉快。粒子效果不要太复杂，但要有足够的细节让玩家感觉"这很精致"。

**关键体验目标**：
- 反弹时：小星星或圆点向外扩散，像气球爆开
- 收集时：闪光+缩放动画，像宝石被收集
- 过关时：彩带或星星雨，庆祝感
- 失败时：屏幕轻微变暗+抖动，但不沮丧

## Detailed Design

### Core Rules

1. **视觉反馈类型**：游戏有6种核心视觉反馈
   - **预览线** (`preview_line`)：玩家画线时实时显示，半透明
   - **确认线** (`confirmed_line`)：线段确认时显示，实心+发光边缘
   - **反弹效果** (`bounce_effect`)：球撞到线时，接触点粒子爆发
   - **收集效果** (`collect_effect`)：收集光点时，闪光+缩放动画
   - **过关效果** (`win_effect`)：关卡通过时，彩带/星星雨
   - **失败效果** (`lose_effect`)：球出界时，屏幕变暗+轻微抖动

2. **粒子系统参数**：
   - 每种效果有独立的粒子数量、颜色、大小、生命周期
   - 粒子使用对象池，避免频繁创建/销毁

3. **动画系统**：
   - 使用缓动函数（easing）让动画更自然
   - 所有动画可被打断（新动画覆盖旧动画）

4. **颜色主题**：
   - 主色：明亮的天蓝色 (#4ECDC4)
   - 强调色：温暖的橙黄色 (#FFE66D)
   - 背景色：柔和的白色/浅灰 (#F7F7F7)

5. **性能预算**：
   - 单帧粒子数上限：200
   - 单次效果粒子数：5-30
   - 动画帧率：60fps

### States and Transitions

视觉反馈系统是无状态的——它只响应其他系统的调用，不维护自己的状态。

**API 驱动模式**：
```
其他系统 --[调用API]--> 视觉反馈系统 --[播放效果]--> 屏幕
```

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **输入系统** | 输入 ← | `showPreviewLine(start: Vec2, end: Vec2)` | 显示预览线 |
| **输入系统** | 输入 ← | `hidePreviewLine()` | 隐藏预览线 |
| **输入系统** | 输入 ← | `showConfirmedLine(start: Vec2, end: Vec2)` | 显示确认线 |
| **画线反弹系统** | 输入 ← | `playBounceEffect(position: Vec2)` | 播放反弹粒子效果 |
| **光点收集系统** | 输入 ← | `playCollectEffect(position: Vec2)` | 播放收集效果 |
| **星级评价系统** | 输入 ← | `playWinEffect()` | 播放过关效果 |
| **出界检测系统** | 输入 ← | `playLoseEffect()` | 播放失败效果 |
| **场景管理** | 输入 ← | `clearAllEffects()` | 场景切换时清除所有效果 |

## Formulas

### 粒子数量计算

```
particleCount = baseParticleCount * intensityMultiplier
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseParticleCount | number | 5-20 | 效果配置 | 基础粒子数 |
| intensityMultiplier | number | 0.5-2.0 | 游戏状态 | 强度乘数（连击等） |
| particleCount | number | 3-40 | 计算得出 | 实际粒子数 |

### 粒子大小范围

```
particleSize = random(MIN_PARTICLE_SIZE, MAX_PARTICLE_SIZE)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| MIN_PARTICLE_SIZE | number | 2 | 配置常量 | 最小粒子尺寸（像素） |
| MAX_PARTICLE_SIZE | number | 8 | 配置常量 | 最大粒子尺寸（像素） |

### 动画持续时间

```
animationDuration = BASE_DURATION * speedMultiplier
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| BASE_DURATION | number | 0.3s | 配置常量 | 基础动画时长 |
| speedMultiplier | number | 0.5-2.0 | 游戏状态 | 速度乘数 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **粒子数超过上限** | 不创建新粒子，直到有粒子被回收 | 性能保护 |
| **快速连续触发同一效果** | 新效果覆盖旧效果（不叠加） | 防止视觉混乱 |
| **场景切换时有效果在播放** | 立即清除所有效果 | 干净的场景切换 |
| **低性能设备** | 减少粒子数量（降级策略） | 保证可玩性 |
| **预览线超出屏幕边界** | 裁剪到屏幕边界 | 防止渲染问题 |
| **多次调用同一API** | 只执行最新一次 | 防止重复效果 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **输入系统** | 输入 ← | 显示预览线和确认线 | Approved |
| **画线反弹系统** | 输入 ← | 触发反弹效果 | 未设计 |
| **光点收集系统** | 输入 ← | 触发收集效果 | 未设计 |
| **星级评价系统** | 输入 ← | 触发过关效果 | 未设计 |
| **出界检测系统** | 输入 ← | 触发失败效果 | 未设计 |
| **场景管理** | 输入 ← | 清除效果 | Approved |

**注意**：视觉反馈系统是 Foundation 层，没有上游依赖。所有依赖它的系统都在 Feature 或 Presentation 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **MAX_PARTICLES** | 200 | 100-500 | 更丰富的视觉效果 | 更好的性能 |
| **BASE_PARTICLE_COUNT** | 10 | 5-30 | 更密集的粒子 | 更轻量的效果 |
| **PARTICLE_LIFETIME** | 0.5s | 0.3-1.0s | 效果持续更久 | 效果更快消失 |
| **ANIMATION_DURATION** | 0.3s | 0.2-0.5s | 动画更慢更优雅 | 动画更快更爽快 |
| **PREVIEW_LINE_OPACITY** | 0.5 | 0.3-0.7 | 预览线更明显 | 预览线更含蓄 |

## Visual Requirements

| Effect | Visual Style | Duration | Particle Count |
|--------|-------------|----------|----------------|
| **预览线** | 半透明蓝色虚线 | 持续显示 | 0 |
| **确认线** | 实心蓝色+白色发光边缘 | 持续显示 | 0 |
| **反弹效果** | 橙黄色小圆点向外扩散 | 0.3s | 8-15 |
| **收集效果** | 白色闪光+蓝色缩放动画 | 0.4s | 10-20 |
| **过关效果** | 彩色星星/彩带从天而降 | 1.5s | 30-50 |
| **失败效果** | 屏幕变暗50%+轻微抖动 | 0.5s | 0 |

**颜色调色板**：
- 主色：#4ECDC4（天蓝）
- 强调色：#FFE66D（橙黄）
- 成功色：#95E1D3（粉红）
- 失败色：#555555（深灰）

## Acceptance Criteria

- [ ] `showPreviewLine()` 在玩家画线时正确显示半透明预览线
- [ ] `hidePreviewLine()` 在触摸结束时正确隐藏预览线
- [ ] `showConfirmedLine()` 在线段确认时正确显示实心线
- [ ] `playBounceEffect()` 在球撞到线时正确播放粒子效果
- [ ] `playCollectEffect()` 在收集光点时正确播放闪光动画
- [ ] `playWinEffect()` 在过关时正确播放庆祝效果
- [ ] `playLoseEffect()` 在出界时正确播放失败效果
- [ ] 粒子数不超过 MAX_PARTICLES 上限
- [ ] 场景切换时所有效果被正确清除
- [ ] 性能：视觉效果不影响游戏帧率（保持60fps）
- [ ] 无硬编码值：所有参数可通过配置文件调整

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要粒子效果编辑器？ | 工具需求评估后决定 | — | 待定 |
| 低端设备的降级策略具体是什么？ | 性能测试后决定 | — | 待定 |
