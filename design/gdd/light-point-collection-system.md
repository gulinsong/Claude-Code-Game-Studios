# 光点收集系统 (Light Point Collection System)

> **Status**: In Design
> **Author**: User + Claude
> **Last Updated**: 2026-03-27
> **Implements Pillar**: 物理爽感, 一球清台

## Overview

光点收集系统负责管理关卡中所有光点的生命周期和收集逻辑。它将光点注册为碰撞系统的触发器，在球与光点接触时触发收集事件，通知游戏状态更新进度，并协调视觉反馈和音频系统播放收集效果。对于玩家来说，光点是**收集的目标**——他们画的每条线、反弹的每次轨迹，都是为了让球能够触碰到更多光点。这个系统的核心价值是**明确的胜利条件**：当所有光点被收集，关卡通过。没有光点收集系统，游戏没有目标，只有无意义的弹球。

## Player Fantasy

玩家应该感觉收集光点是**满足感的来源**——每次球碰到光点，清脆的"叮"声配合闪光效果，像收集宝石一样让人愉悦。光点不是障碍，而是奖励——你不需要精确瞄准，只需要让球"经过"就能收集。

玩家应该感到**清晰的进度感**——屏幕上还有几个光点？还差多少就能过关？这些信息应该一目了然。当最后一个光点被收集时，玩家应该感到"完成了！"的成就感。

**关键体验目标**：
- **收集的快感**：每次收集都有即时、令人满意的视觉和音频反馈
- **进度可见性**：玩家随时知道"还差几个"就能过关
- **一球清台的挑战**：用有限的反弹次数收集所有光点，是策略与技巧的结合

**参考游戏**：
- **割绳子**：收集星星的满足感
- **弹珠台**：击中目标的即时反馈

## Detailed Design

### Core Rules

[To be designed]

### States and Transitions

[To be designed]

### Interactions with Other Systems

[To be designed]

## Formulas

[To be designed]

## Edge Cases

[To be designed]

## Dependencies

[To be designed]

## Tuning Knobs

[To be designed]

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

[To be designed]

## Open Questions

[To be designed]
