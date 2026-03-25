# Sprint 7 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现节日筹备系统** — 核心循环驱动，围绕中国传统节日组织游戏节奏。

## Capacity

| 项目 | 数值 |
|------|------|
| 总天数 | 7 天 |
| 缓冲（20%）| 1.4 天 |
| 可用天数 | ~5.5 天 |

## Tasks

### Must Have (Critical Path)

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T1 | FestivalSystem 核心逻辑 | 1.5 | Sprint 006 | 节日注册、阶段管理、进度追踪 | ✅ Complete |
| T2 | FestivalSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ✅ Complete |
| T3 | 节日任务系统 | 1 | T1 | 任务提交、进度计算 | ✅ Complete |
| T4 | 奖励档次系统 | 0.5 | T1 | 基础/良好/完美三档 | ✅ Complete |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 庆典小游戏 | 1 | T1 | 奖励递减机制 | ✅ Complete |
| T6 | 节日循环 | 0.5 | T1 | 年度节日循环 | ✅ Complete |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 节日系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 时间系统依赖 | Medium | High | 使用接口占位 |
| 任务系统集成 | Medium | Medium | 先实现独立逻辑 |

## Dependencies on External Factors

- 时间系统（未完全实现）- 使用接口占位
- 任务系统（已实现）- 节日任务创建
- 背包系统（已实现）- 物品提交

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] FestivalSystem 单元测试通过（41 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（446 个测试）
- [x] 节日阶段正确切换
- [x] 任务提交正确
- [x] 完成度正确计算
- [x] 奖励档次正确

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：FestivalSystem 核心逻辑实现（src/gameplay/FestivalSystem.ts）
  - 节日注册、阶段管理、进度追踪
  - 4 个阶段：NORMAL, PREPARATION, CELEBRATION, AFTERGLOW
  - 4 种任务类型：COLLECT, CRAFT, DECORATE, PARTICIPATE
  - 3 个奖励档次：BASIC, GOOD, PERFECT
- ✅ T2 完成：41 个单元测试全部通过
- ✅ T3 完成：节日任务系统
  - 任务提交、进度计算
  - 完成度计算、奖励档次判断
- ✅ T4 完成：奖励档次系统
  - BASIC (0-49%), GOOD (50-99%), PERFECT (100%)
- ✅ T5 完成：庆典小游戏
  - 奖励递减机制 (0.8^n)
  - 最低奖励倍率 0.3
- ✅ T6 完成：节日循环
  - 年度节日循环
  - 跨年处理
- ✅ 所有测试通过：446 个测试（14 个测试套件）

### Sprint 007 完成 ✅

---

## Technical Notes

### 节日阶段

```
NORMAL → PREPARATION → CELEBRATION → AFTERGLOW → NORMAL
             ↑___________________________________|
                     (下一个节日)
```

### 节日任务类型

| 类型 | 说明 |
|------|------|
| COLLECT | 收集材料 |
| CRAFT | 制作物品 |
| DECORATE | 装饰场景 |
| PARTICIPATE | 参与活动 |

### 奖励档次

| Tier | Requirement | Multiplier |
|------|-------------|------------|
| BASIC | 0-49% | 1x |
| GOOD | 50-99% | 1.5x |
| PERFECT | 100% | 2x |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `festival:approaching` | `{ festivalId, daysUntil }` |
| `festival:started` | `{ festivalId }` |
| `festival:task_completed` | `{ festivalId, taskId }` |
| `festival:celebration_started` | `{ festivalId }` |
| `festival:ended` | `{ festivalId, completionRate }` |
| `festival:reward_claimed` | `{ festivalId, tier }` |
