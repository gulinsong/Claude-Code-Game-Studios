# 音频系统 (Audio System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 物理爽感

## Overview

音频系统负责管理游戏的所有音效和背景音乐播放。它提供简单的 API 供其他系统调用，确保音效播放的及时性和音量控制。对于玩家来说，音频是"物理爽感"的核心来源——每次反弹的"叮"声、收集光点的清脆音效，都让操作变得有反馈感。没有音频，游戏会显得干瘪无趣。

## Player Fantasy

玩家应该感觉每次操作都有**清脆轻快的音频反馈**——像弹琴一样，每次反弹、收集都有悦耳的声音回应。音效不是干扰，而是对操作的"奖励"和"确认"。好的音效让玩家想反复尝试，只为再听一次那完美的"叮"声。

**关键体验目标**：
- 反弹音效应有节奏感，让玩家想"再弹一次"
- 收集音效应有成就感，让玩家感到"做到了！"
- 背景音乐应轻快但不抢戏，营造轻松氛围

## Detailed Design

### Core Rules

1. **音效类型**：游戏有4种核心音效
   - **反弹音效** (`bounce`)：球撞到线时播放
   - **收集音效** (`collect`)：球收集光点时播放
   - **过关音效** (`win`)：关卡通过时播放
   - **失败音效** (`lose`)：球出界时播放

2. **背景音乐**：
   - **主菜单音乐** (`menu_music`)：轻松愉悦的循环音乐
   - **游戏场景音乐** (`gameplay_music`)：轻快但不抢戏的循环音乐

3. **音量控制**：
   - 主音量（Master）：控制所有音频
   - 音效音量（SFX）：控制所有音效
   - 音乐音量（BGM）：控制背景音乐

4. **音频优先级**：
   - 音效优先级高于背景音乐
   - 多个音效同时触发时，只播放最新的（防止音频混乱）

5. **静音支持**：玩家可以关闭音效和/或背景音乐

### States and Transitions

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Muted** | 玩家关闭所有音频 | 玩家开启音频 | 不播放任何音频 |
| **SFX Only** | 玩家关闭音乐但保留音效 | 玩家调整设置 | 只播放音效 |
| **BGM Only** | 玩家关闭音效但保留音乐 | 玩家调整设置 | 只播放背景音乐 |
| **Full Audio** | 玩家开启所有音频 | 玩家调整设置 | 播放所有音频 |

### Interactions with Other Systems

| System | Direction | Interface | Description |
|--------|-----------|-----------|-------------|
| **画线反弹系统** | 输入 ← | `playSound('bounce')` | 球撞到线时触发反弹音效 |
| **光点收集系统** | 输入 ← | `playSound('collect')` | 收集光点时触发收集音效 |
| **出界检测系统** | 输入 ← | `playSound('lose')` | 球出界时触发失败音效 |
| **星级评价系统** | 输入 ← | `playSound('win')` | 关卡通过时触发过关音效 |
| **场景管理** | 输入 ← | `playMusic(sceneType)` | 场景切换时切换背景音乐 |
| **UI系统** | 双向 | `setVolume(type, value)` / `getVolume(type)` | 音量设置和获取 |

## Formulas

### 音量计算

```
effectiveVolume = masterVolume * channelVolume * soundVolume
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| masterVolume | number | 0.0 - 1.0 | 用户设置 | 主音量 |
| channelVolume | number | 0.0 - 1.0 | 用户设置 | 通道音量（SFX/BGM） |
| soundVolume | number | 0.0 - 1.0 | 音效配置 | 单个音效的基础音量 |
| effectiveVolume | number | 0.0 - 1.0 | 计算得出 | 最终播放音量 |

### 音效并发限制

```
if (activeSoundsCount >= MAX_CONCURRENT_SOUNDS) {
    stopOldestSound();
}
playSound(soundId);
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| MAX_CONCURRENT_SOUNDS | number | 3-8 | 配置常量 | 最大同时播放音效数 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **音频文件加载失败** | 静默失败，不影响游戏 | 游戏不应因音频问题崩溃 |
| **快速连续触发同一音效** | 只播放最新的，打断之前的 | 防止音频混乱和性能问题 |
| **玩家静音后触发音效** | 不播放，但正常处理游戏逻辑 | 静音只影响音频，不影响玩法 |
| **场景切换时音乐正在播放** | 渐出当前音乐，渐入新音乐 | 平滑过渡 |
| **应用切换到后台** | 暂停背景音乐 | 节省资源，符合平台规范 |
| **音量设置为0** | 相当于静音该通道 | 边界情况处理 |

## Dependencies

| System | Direction | Nature of Dependency | Status |
|--------|-----------|---------------------|--------|
| **画线反弹系统** | 输入 ← | 触发反弹音效 | 未设计 |
| **光点收集系统** | 输入 ← | 触发收集音效 | 未设计 |
| **出界检测系统** | 输入 ← | 触发失败音效 | 未设计 |
| **星级评价系统** | 输入 ← | 触发过关音效 | 未设计 |
| **场景管理** | 输入 ← | 切换背景音乐 | Approved |
| **UI系统** | 双向 | 音量控制接口 | 未设计 |

**注意**：音频系统是 Foundation 层，没有上游依赖。所有依赖它的系统都在 Feature 或 Presentation 层。

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **MASTER_VOLUME_DEFAULT** | 1.0 | 0.5-1.0 | 所有音频更响 | 所有音频更轻 |
| **SFX_VOLUME_DEFAULT** | 1.0 | 0.5-1.0 | 音效更响 | 音效更轻 |
| **BGM_VOLUME_DEFAULT** | 0.7 | 0.3-0.8 | 背景音乐更突出 | 背景音乐更含蓄 |
| **MAX_CONCURRENT_SOUNDS** | 4 | 3-8 | 更丰富的音频层次 | 更干净但可能丢失音效 |
| **MUSIC_FADE_TIME** | 0.5s | 0.3-1.0s | 过渡更平滑 | 过渡更快但可能突兀 |

## Visual/Audio Requirements

音频系统本身不需要视觉反馈，但需要以下音频资源：

| Audio Resource | Format | Duration | Description |
|----------------|--------|----------|-------------|
| `bounce.mp3` | MP3/OGG | 0.2-0.3s | 清脆的反弹音效 |
| `collect.mp3` | MP3/OGG | 0.3-0.5s | 收集光点的满足音效 |
| `win.mp3` | MP3/OGG | 1.0-2.0s | 过关的成就音效 |
| `lose.mp3` | MP3/OGG | 0.5-1.0s | 失败的失落音效 |
| `menu_music.mp3` | MP3/OGG | 60-120s (loop) | 主菜单背景音乐 |
| `gameplay_music.mp3` | MP3/OGG | 60-120s (loop) | 游戏场景背景音乐 |

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|-------------|-----------------|-----------------|-----------|
| 音量滑块 | 设置界面 | 即时 | 玩家打开设置 |
| 静音按钮 | 设置界面 / 主菜单 | 即时 | 始终可见 |

## Acceptance Criteria

- [ ] `playSound('bounce')` 在球撞到线时正确播放
- [ ] `playSound('collect')` 在收集光点时正确播放
- [ ] `playSound('win')` 在过关时正确播放
- [ ] `playSound('lose')` 在出界时正确播放
- [ ] 背景音乐在场景切换时正确切换
- [ ] 音量控制功能正常工作（主音量、音效、音乐分别控制）
- [ ] 静音功能正常工作
- [ ] 快速连续触发音效不会导致音频混乱
- [ ] 音频加载失败不会导致游戏崩溃
- [ ] 性能：音效播放延迟 < 50ms
- [ ] 无硬编码值：所有音量参数可通过配置文件调整

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 音效资源从哪里获取？ | 美术/音效师 | — | 待定（可使用免费音效库） |
| 是否需要音效变调（根据反弹速度改变音调）？ | 原型测试后决定 | — | 待定 |
