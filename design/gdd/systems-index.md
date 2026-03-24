# Systems Index: 岁时记 (Suìshí Jì)

*Created: 2026-03-24*
*Last Updated: 2026-03-24*
*Source Concept: design/gdd/game-concept.md*

---

## Overview

《岁时记》是一款温馨治愈的经营模拟游戏，以中国传统节日为核心循环。玩家作为"节令官"，筹备四季节日、与村民建立情谊、制作手工艺、探索村庄周边。

本游戏需要 **30 个系统**，按依赖关系和优先级分层设计。

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | 事件系统 | 基础设施 | MVP | ✅ Designed | [event-system.md](event-system.md) | — |
| 2 | 配置系统 | 基础设施 | MVP | ✅ Approved | [config-system.md](config-system.md) | — |
| 3 | 材料系统 | 数据 | MVP | ✅ Approved | [material-system.md](material-system.md) | 配置系统 |
| 4 | 背包系统 | 数据 | MVP | ✅ Designed | [backpack-system.md](backpack-system.md) | 材料系统, 事件系统 |
| 5 | 时间系统 | 世界 | MVP | ✅ Designed | [time-system.md](time-system.md) | 配置系统, 事件系统 |
| 6 | 体力系统 | 资源 | MVP | ✅ Designed | [stamina-system.md](stamina-system.md) | 配置系统, 事件系统, 背包系统 |
| 7 | 食谱系统 | 数据 | MVP | ✅ Designed | [recipe-system.md](recipe-system.md) | 配置系统, 材料系统 |
| 8 | 采集系统 | 核心玩法 | MVP | ✅ Designed | [gathering-system.md](gathering-system.md) | 背包系统, 材料系统, 体力系统, 时间系统 |
| 9 | 手工艺系统 | 核心玩法 | MVP | ✅ Designed | [crafting-system.md](crafting-system.md) | 背包系统, 食谱系统, 体力系统, 事件系统 |
| 10 | 对话系统 | 交互 | MVP | ✅ Designed | [dialogue-system.md](dialogue-system.md) | 配置系统, 事件系统 |
| 11 | 任务系统 | 引导 | MVP | ✅ Designed | [quest-system.md](quest-system.md) | 事件系统, 背包系统, 对话系统 |
| 12 | 村民关系系统 | 核心玩法 | MVP | ✅ Designed | [villager-system.md](villager-system.md) | 对话系统, 任务系统, 背包系统, 事件系统 |
| 13 | 节日筹备系统 | 核心玩法 | MVP | ✅ Designed | [festival-system.md](festival-system.md) | 时间系统, 任务系统, 手工艺系统, 事件系统 |
| 14 | 微信登录系统 | 平台 | MVP | Not Started | — | — |
| 15 | 云存档系统 | 持久化 | MVP | Not Started | — | 微信登录系统, 背包系统, 事件系统 |
| 16 | UI框架系统 | 表现 | MVP | Not Started | — | 事件系统 |
| 17 | 资源加载系统 | 基础设施 | Alpha | Not Started | — | — |
| 18 | 场景管理系统 | 表现 | Alpha | Not Started | — | 资源加载系统 |
| 19 | 探索系统 | 核心玩法 | Alpha | Not Started | — | 场景管理系统, 背包系统, 事件系统 |
| 20 | 收集系统 | 核心玩法 | Alpha | Not Started | — | 背包系统, 事件系统, 配置系统 |
| 21 | 装饰系统 | 表达 | Alpha | Not Started | — | 背包系统, 场景管理系统, 事件系统 |
| 22 | 服装系统 | 表达 | Alpha | Not Started | — | 背包系统, 事件系统 |
| 23 | 社交系统 | 社交 | Alpha | Not Started | — | 微信登录系统, 云存档系统, 事件系统 |
| 24 | 内购系统 | 变现 | Alpha | Not Started | — | 微信登录系统, 背包系统, 装饰系统, 服装系统, 体力系统 |
| 25 | 激励视频系统 | 变现 | Alpha | Not Started | — | 背包系统, 体力系统 |
| 26 | 音频系统 | 表现 | Alpha | Not Started | — | 事件系统, 时间系统 |
| 27 | 通知系统 | 反馈 | Alpha | Not Started | — | 事件系统, UI框架系统 |
| 28 | 村庄发展系统 | 进度 | Beta | Not Started | — | 节日筹备系统, 事件系统 |
| 29 | 日记系统 | 叙事 | Beta | Not Started | — | 事件系统, 时间系统 |
| 30 | 每日奖励系统 | 留存 | Beta | Not Started | — | 时间系统, 背包系统, 事件系统 |

---

## Categories

| Category | Description | Systems |
|----------|-------------|---------|
| **基础设施** | 无依赖，所有系统的基础 | 事件系统, 配置系统, 资源加载系统 |
| **数据** | 数据定义和存储 | 材料系统, 背包系统, 食谱系统 |
| **世界** | 游戏世界的状态和时间 | 时间系统, 微信登录系统, 云存档系统 |
| **核心玩法** | 玩家直接交互的游戏机制 | 采集系统, 手工艺系统, 探索系统, 收集系统, 村民关系系统, 节日筹备系统 |
| **资源** | 玩家资源管理 | 体力系统 |
| **交互** | 玩家与游戏交互的方式 | 对话系统 |
| **引导** | 引导玩家目标 | 任务系统 |
| **表达** | 玩家自我表达 | 装饰系统, 服装系统 |
| **社交** | 与其他玩家互动 | 社交系统 |
| **变现** | 商业化机制 | 内购系统, 激励视频系统 |
| **平台** | 平台集成 | 微信登录系统 |
| **持久化** | 数据保存和同步 | 云存档系统 |
| **表现** | 视觉和听觉呈现 | UI框架系统, 场景管理系统, 音频系统 |
| **反馈** | 给玩家的反馈 | 通知系统 |
| **进度** | 长期进度感 | 村庄发展系统 |
| **叙事** | 故事和记录 | 日记系统 |
| **留存** | 玩家留存机制 | 每日奖励系统 |

---

## Priority Tiers

| Tier | Definition | Target Milestone | System Count |
|------|------------|------------------|--------------|
| **MVP** | 核心循环必需，验证"有趣"假设 | First playable prototype | 16 |
| **Alpha** | 功能扩展，2节日+社交+变现 | Alpha milestone | 11 |
| **Beta** | 完整体验，小程序首发 | Beta / Release | 3 |

---

## Dependency Map

### Layer 1: 基础设施（无依赖）

```
事件系统 ✅ ────────────────────────────────────┐
配置系统 ─────────────────────────────────────┤
资源加载系统 (Alpha) ─────────────────────────┘
```

### Layer 2: 数据层

```
材料系统 ◄── 配置系统
食谱系统 ◄── 配置系统, 材料系统
背包系统 ◄── 材料系统, 事件系统
```

### Layer 3: 世界层

```
时间系统 ◄── 配置系统, 事件系统
微信登录系统 (独立)
云存档系统 ◄── 微信登录系统, 背包系统, 事件系统
```

### Layer 4: 核心玩法层

```
体力系统 ◄── 配置系统, 事件系统, 背包系统
采集系统 ◄── 背包系统, 材料系统, 体力系统, 时间系统
手工艺系统 ◄── 背包系统, 食谱系统, 体力系统, 事件系统
对话系统 ◄── 配置系统, 事件系统
任务系统 ◄── 事件系统, 背包系统, 对话系统
```

### Layer 5: 社交/关系层

```
村民关系系统 ◄── 对话系统, 任务系统, 背包系统, 事件系统
节日筹备系统 ◄── 时间系统, 任务系统, 手工艺系统, 事件系统
探索系统 (Alpha) ◄── 场景管理系统, 背包系统, 事件系统
收集系统 (Alpha) ◄── 背包系统, 事件系统, 配置系统
社交系统 (Alpha) ◄── 微信登录系统, 云存档系统, 事件系统
```

### Layer 6: 表达/进度层

```
装饰系统 (Alpha) ◄── 背包系统, 场景管理系统, 事件系统
服装系统 (Alpha) ◄── 背包系统, 事件系统
村庄发展系统 (Beta) ◄── 节日筹备系统, 事件系统
日记系统 (Beta) ◄── 事件系统, 时间系统
```

### Layer 7: 变现/表现层

```
内购系统 (Alpha) ◄── 微信登录系统, 背包系统, 装饰系统, 服装系统, 体力系统
激励视频系统 (Alpha) ◄── 背包系统, 体力系统
每日奖励系统 (Beta) ◄── 时间系统, 背包系统, 事件系统
UI框架系统 ◄── 事件系统
场景管理系统 (Alpha) ◄── 资源加载系统
音频系统 (Alpha) ◄── 事件系统, 时间系统
通知系统 (Alpha) ◄── 事件系统, UI框架系统
```

---

## Recommended Design Order

| Order | System | Priority | Layer | Est. Effort |
|-------|--------|----------|-------|-------------|
| 1 | 事件系统 ✅ | MVP | 基础设施 | S |
| 2 | 配置系统 ✅ | MVP | 基础设施 | S |
| 3 | 材料系统 ✅ | MVP | 数据 | M |
| 4 | 背包系统 ✅ | MVP | 数据 | M |
| 5 | 时间系统 | MVP | 世界 | M |
| 6 | 体力系统 | MVP | 资源 | S |
| 7 | 食谱系统 | MVP | 数据 | S |
| 8 | 采集系统 | MVP | 核心玩法 | M |
| 9 | 手工艺系统 | MVP | 核心玩法 | L |
| 10 | 对话系统 | MVP | 交互 | M |
| 11 | 任务系统 | MVP | 引导 | M |
| 12 | 村民关系系统 | MVP | 核心玩法 | L |
| 13 | 节日筹备系统 | MVP | 核心玩法 | L |
| 14 | 微信登录系统 | MVP | 平台 | S |
| 15 | 云存档系统 | MVP | 持久化 | M |
| 16 | UI框架系统 | MVP | 表现 | M |
| — | — | — | — | — |
| 17 | 资源加载系统 | Alpha | 基础设施 | M |
| 18 | 场景管理系统 | Alpha | 表现 | M |
| 19 | 探索系统 | Alpha | 核心玩法 | M |
| 20 | 收集系统 | Alpha | 核心玩法 | M |
| 21 | 装饰系统 | Alpha | 表达 | M |
| 22 | 服装系统 | Alpha | 表达 | S |
| 23 | 社交系统 | Alpha | 社交 | L |
| 24 | 内购系统 | Alpha | 变现 | L |
| 25 | 激励视频系统 | Alpha | 变现 | S |
| 26 | 音频系统 | Alpha | 表现 | M |
| 27 | 通知系统 | Alpha | 反馈 | S |
| — | — | — | — | — |
| 28 | 村庄发展系统 | Beta | 进度 | M |
| 29 | 日记系统 | Beta | 叙事 | S |
| 30 | 每日奖励系统 | Beta | 留存 | S |

**Effort estimates**: S = 1 session, M = 2-3 sessions, L = 4+ sessions

---

## Circular Dependencies

**None found.** All dependencies are unidirectional and form a clean layered architecture.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| **手工艺系统** | Design | 迷你游戏的"仪式感"设计不确定，可能太简单或太复杂 | 早期原型测试多种操作方式 |
| **节日筹备系统** | Design | 节日准备期可能显得重复或空洞 | 先设计1个节日完整流程，验证后再扩展 |
| **云存档系统** | Technical | 离线/在线状态切换，数据冲突处理 | 使用微信云开发，参考官方最佳实践 |
| **内购系统** | Technical/Design | 内购平衡可能影响口碑 | 严格遵循"无P2W"原则，只卖外观和便利 |
| **小程序包体** | Technical | 资源可能超限 | 严格资源压缩，分包+CDN方案 |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 30 |
| Design docs started | 16 |
| Design docs reviewed | 2 |
| Design docs approved | 2 |
| MVP systems designed | 16 / 16 ✅ |
| Alpha systems designed | 0 / 11 |
| Beta systems designed | 0 / 3 |

---

## Next Steps

- [x] ~~设计第一个系统：**事件系统**~~ ✅ Done
- [x] ~~设计第二个系统：**配置系统**~~ ✅ Done
- [x] ~~设计第三个系统：**材料系统**~~ ✅ Approved
- [x] ~~设计第四个系统：**背包系统**~~ ✅ Designed
- [x] ~~设计第五个系统：**时间系统**~~ ✅ Designed
- [x] ~~设计第六个系统：**体力系统**~~ ✅ Designed
- [x] ~~设计第七个系统：**食谱系统**~~ ✅ Designed
- [x] ~~设计第八个系统：**采集系统**~~ ✅ Designed
- [x] ~~设计第九个系统：**手工艺系统**~~ ✅ Designed
- [x] ~~设计第十个系统：**对话系统**~~ ✅ Designed
- [x] ~~设计第十一个系统：**任务系统**~~ ✅ Designed
- [x] ~~设计第十二个系统：**村民关系系统**~~ ✅ Designed
- [x] ~~设计第十三个系统：**节日筹备系统**~~ ✅ Designed
- [x] ~~设计第十四个系统：**微信登录系统**~~ ✅ Designed
- [x] ~~设计第十五个系统：**云存档系统**~~ ✅ Designed
- [x] ~~设计第十六个系统：**UI框架系统**~~ ✅ Designed
- [ ] 运行 `/gate-check pre-production` 验证 MVP 设计完成度
- [ ] 原型核心循环 `/prototype 手工艺系统`
- [ ] 开始 Alpha 阶段系统设计
