# Milestone: MVP Playable

> **Created**: 2026-04-04
> **Target Date**: 2026-05-02
> **Status**: In Progress (Sprint 1 Active)

---

## Milestone Definition

A **playable, completable** version of 反弹达人 (Bounce Master) that validates the core game concept. A player can draw lines, bounce a ball, collect light points, lose by going out of bounds, and progress through levels with star ratings.

## Scope: 14 MVP Systems

| # | System | Category | Sprint | Design Status |
|---|--------|----------|--------|---------------|
| 1 | 输入系统 | Foundation | Sprint 2 | Approved |
| 2 | 场景管理 | Foundation | Sprint 2 | Approved |
| 3 | 音频系统 | Foundation | Sprint 2 | Approved |
| 4 | 视觉反馈系统 | Foundation | Sprint 2 | Approved |
| 5 | 碰撞系统 | Core | Sprint 2 | Approved |
| 6 | 边界系统 | Core | Sprint 2 | Approved |
| 7 | 游戏状态管理 | Core | Sprint 2 | Approved |
| 8 | 球物理系统 | Feature | Sprint 1 (proto) + Sprint 3 | Approved |
| 9 | 画线反弹系统 | Feature | Sprint 1 (proto) + Sprint 3 | Approved |
| 10 | 光点收集系统 | Feature | Sprint 3 | Approved |
| 11 | 出界检测系统 | Feature | Sprint 3 | Approved |
| 12 | 关卡系统 | Feature | Sprint 3 | Approved |
| 13 | 星级评价系统 | Presentation | Sprint 4 | Approved |
| 14 | UI系统 | Presentation | Sprint 4 | Approved |

## Acceptance Criteria

### Must Have (Milestone is blocked without these)
- [ ] Player can draw lines on screen (up to 3 per level)
- [ ] Ball bounces off drawn lines with satisfying physics
- [ ] Ball collects light points on contact
- [ ] Ball out-of-bounds triggers lose condition
- [ ] At least 10 levels are playable and completable
- [ ] Star rating displayed on level completion
- [ ] Main menu, level select, gameplay, result screens all functional
- [ ] No crash bugs, no soft-locks

### Should Have (Milestone quality bar)
- [ ] 20 levels playable
- [ ] All levels completable with 3 stars
- [ ] Audio feedback on all core events
- [ ] Visual feedback (particles) on all core events
- [ ] Performance: 60fps sustained, <100 draw calls

### Nice to Have (Defer to VS if needed)
- [ ] Tutorial overlay for new players
- [ ] Pause menu
- [ ] WeChat share integration
- [ ] 20 levels fully balanced

## Go/No-Go Gate

At the end of Sprint 5, evaluate:

| Criterion | Threshold | Decision |
|-----------|-----------|----------|
| Core loop fun factor | "Would I play this for 15 minutes?" | Go/No-Go |
| Crash-free rate | 100% through all levels | Go/No-Go |
| Performance | 60fps on target device | Go/Conditional |
| Level count | Minimum 10 levels | Go/Conditional |
| Star system working | Calculated and displayed correctly | Go/Conditional |

**Decision matrix**:
- All Go -> Ship MVP
- Performance Conditional -> Optimize for 2 more days, then ship
- Fun No-Go -> Schedule creative review, may need mechanic pivot
- Crash No-Go -> Extend sprint to fix, do not ship broken

## Sub-Milestones

| Milestone | Sprint | Date | Gate |
|-----------|--------|------|------|
| M0: Core Prototype | Sprint 1 | 2026-04-07 | Prototype Go/No-Go |
| M1: Foundation Layer | Sprint 2 | 2026-04-14 | All 7 systems passing acceptance |
| M2: Feature Layer | Sprint 3 | 2026-04-22 | Full core loop playable |
| M3: Presentation Layer | Sprint 4 | 2026-04-28 | Full UI flow functional |
| M4: Polish & Release | Sprint 5 | 2026-05-02 | MVP Release |

---

*Part of MVP Milestone tracking. See sprint-plan.md for detailed sprint breakdown.*
