# Systems Index: 反弹达人 (Bounce Master)

> **Status**: Approved
> **Created**: 2026-03-27
> **Last Updated**: 2026-04-04
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

《反弹达人》是一个休闲益智物理弹球游戏，核心玩法是"画线→弹球→收集"。
游戏系统相对精简，共 17 个系统，其中 14 个为 MVP 必需。
设计重点在于**物理手感**和**画线反弹**两个高风险系统，需要早期原型验证。

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | 输入系统 | Core | MVP | Approved | design/gdd/input-system.md | — |
| 2 | 场景管理 | Core | MVP | Approved | design/gdd/scene-management.md | — |
| 3 | 碰撞系统 | Core | MVP | Approved | design/gdd/collision-system.md | 场景管理 |
| 4 | 边界系统 | Core | MVP | Approved | design/gdd/boundary-system.md | 场景管理 |
| 5 | 游戏状态管理 | Core | MVP | Approved | design/gdd/game-state-management.md | 场景管理 |
| 6 | 球物理系统 | Gameplay | MVP | Approved | design/gdd/ball-physics-system.md | 碰撞系统, 边界系统 |
| 7 | 画线反弹系统 | Gameplay | MVP | Approved | design/gdd/line-bounce-system.md | 输入系统, 碰撞系统, 视觉反馈系统 |
| 8 | 光点收集系统 | Gameplay | MVP | Approved | design/gdd/light-point-collection-system.md | 碰撞系统, 视觉反馈系统, 音频系统 |
| 9 | 出界检测系统 | Gameplay | MVP | Approved | design/gdd/out-of-bounds-system.md | 边界系统, 碰撞系统, 游戏状态管理, 球物理系统 |
| 10 | 关卡系统 | Gameplay | MVP | Approved | design/gdd/level-system.md | 场景管理, 游戏状态管理 |
| 11 | 音频系统 | Audio | MVP | Approved | design/gdd/audio-system.md | — |
| 12 | 视觉反馈系统 | Core | MVP | Approved | design/gdd/visual-feedback-system.md | — |
| 13 | 星级评价系统 | Progression | MVP | Approved | design/gdd/star-rating-system.md | 游戏状态管理, 关卡系统 |
| 14 | UI系统 | UI | MVP | Approved | design/gdd/ui-system.md | 游戏状态管理, 关卡系统, 星级评价系统 |
| 15 | 存档系统 | Persistence | VS | Not Started | — | 游戏状态管理, 关卡系统, 星级评价系统 |
| 16 | 皮肤系统 | Progression | VS | Not Started | — | UI系统 |
| 17 | 排行榜系统 | Meta | Alpha | Not Started | — | 游戏状态管理, 关卡系统 |

---

## Categories

| Category | Description | Systems in This Game |
|----------|-------------|---------------------|
| **Core** | 基础系统 | 输入系统, 场景管理, 碰撞系统, 边界系统, 游戏状态管理, 视觉反馈系统 |
| **Gameplay** | 核心玩法 | 球物理系统, 画线反弹系统, 光点收集系统, 出界检测系统, 关卡系统 |
| **Progression** | 成长系统 | 星级评价系统, 皮肤系统 |
| **UI** | 界面系统 | UI系统 |
| **Audio** | 音效系统 | 音频系统 |
| **Persistence** | 存档系统 | 存档系统 |
| **Meta** | 元系统 | 排行榜系统 |

---

## Priority Tiers

| Tier | Definition | Systems | Milestone |
|------|------------|---------|-----------|
| **MVP** | 核心循环必需 | 14个 | 第一个可玩原型 |
| **Vertical Slice** | 完整体验 | 2个 | 完整Demo |
| **Alpha** | 完整功能 | 1个 | Alpha版本 |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **输入系统** — 处理触摸事件，是最底层的输入
2. **场景管理** — 管理游戏场景切换
3. **音频系统** — 播放音效
4. **视觉反馈系统** — 粒子/动画渲染

### Core Layer (depends on foundation)

1. **碰撞系统** — depends on: 场景管理
2. **边界系统** — depends on: 场景管理
3. **游戏状态管理** — depends on: 场景管理

### Feature Layer (depends on core)

1. **球物理系统** — depends on: 碰撞系统, 边界系统
2. **画线反弹系统** — depends on: 输入系统, 碰撞系统, 视觉反馈系统
3. **光点收集系统** — depends on: 碰撞系统, 视觉反馈系统, 音频系统
4. **出界检测系统** — depends on: 边界系统, 碰撞系统, 游戏状态管理, 球物理系统
5. **关卡系统** — depends on: 场景管理, 游戏状态管理

### Presentation Layer (depends on features)

1. **星级评价系统** — depends on: 游戏状态管理, 关卡系统
2. **UI系统** — depends on: 游戏状态管理, 关卡系统, 星级评价系统

### Polish Layer (depends on presentation)

1. **存档系统** — depends on: 游戏状态管理, 关卡系统, 星级评价系统
2. **皮肤系统** — depends on: UI系统
3. **排行榜系统** — depends on: 游戏状态管理, 关卡系统

---

## Recommended Design Order

| Order | System | Priority | Layer | Risk | Est. Effort |
|-------|--------|----------|-------|------|-------------|
| 1 | 输入系统 | MVP | Foundation | Low | S |
| 2 | 场景管理 | MVP | Foundation | Low | S |
| 3 | 音频系统 | MVP | Foundation | Low | S |
| 4 | 视觉反馈系统 | MVP | Foundation | Low | S |
| 5 | 碰撞系统 | MVP | Core | Medium | M |
| 6 | 边界系统 | MVP | Core | Low | S |
| 7 | 游戏状态管理 | MVP | Core | Low | S |
| 8 | 球物理系统 | MVP | Feature | **HIGH** | M |
| 9 | 画线反弹系统 | MVP | Feature | **HIGH** | M |
| 10 | 光点收集系统 | MVP | Feature | Low | S |
| 11 | 出界检测系统 | MVP | Feature | Low | S |
| 12 | 关卡系统 | MVP | Feature | Medium | M |
| 13 | 星级评价系统 | MVP | Presentation | Low | S |
| 14 | UI系统 | MVP | Presentation | Low | M |
| 15 | 存档系统 | VS | Polish | Low | S |
| 16 | 皮肤系统 | VS | Presentation | Low | S |
| 17 | 排行榜系统 | Alpha | Polish | Medium | M |

**Effort estimates**: S = 1 session, M = 2-3 sessions, L = 4+ sessions

---

## Circular Dependencies

- **None found** — 所有依赖都是单向的，无循环依赖

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|------------------|------------|
| 球物理系统 | Design | 反弹手感是核心体验，可能需要大量调参 | 早期原型验证手感 |
| 画线反弹系统 | Technical + Design | 画线→物理挡板的转换需要精确，线段碰撞检测 | 早期原型验证，考虑使用成熟物理库 |
| 碰撞系统 | Technical | 2D物理碰撞可能有性能问题 | 使用 Cocos Creator 内置物理或成熟库 |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 17 |
| Design docs started | 14 |
| Design docs reviewed | 14 |
| Design docs approved | 14 |
| MVP systems designed | 14/14 |
| VS systems designed | 0/2 |
| Alpha systems designed | 0/1 |

---

## Next Steps

- [x] ~~设计第一个系统：输入系统 (`/design-system 输入系统`)~~
- [x] ~~或者先原型验证高风险系统：球物理系统 (`/prototype 球物理`)~~
- [x] ~~每个GDD完成后运行 `/design-review`~~
- [x] ~~MVP系统全部设计完成后运行 `/gate-check pre-production`~~
- [ ] 运行 `/gate-check pre-production` 验证可进入生产阶段
- [ ] 开始 Sprint 1：核心反弹原型验证
- [ ] 设计存档系统（VS priority）和皮肤系统（VS priority）
