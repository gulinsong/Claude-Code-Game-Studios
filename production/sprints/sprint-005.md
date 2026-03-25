# Sprint 5 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现任务系统** — 目标引导系统，为玩家提供短期和中期目标。

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
| T1 | QuestSystem 核心逻辑 | 1.5 | Sprint 004 | 任务接受、放弃、完成、奖励领取 | ⬜ Pending |
| T2 | QuestSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ⬜ Pending |
| T3 | 目标追踪系统 | 1 | T1 | COLLECT, CRAFT, TALK 等目标类型 | ⬜ Pending |
| T4 | 前置任务检查 | 0.5 | T1 | prerequisites 检查 | ⬜ Pending |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 时间限制任务 | 0.5 | T1 | timeLimit 处理 | ⬜ Pending |
| T6 | 日常任务刷新 | 0.5 | T1 | 每日重置 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 任务系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 村民关系系统未实现 | High | Medium | 使用接口占位，后续注入 |
| 目标追踪复杂度 | Medium | Medium | 先实现核心类型 |

## Dependencies on External Factors

- 村民关系系统（未实现）- 使用接口占位

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] QuestSystem 单元测试通过（37 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（349 个测试）
- [x] 目标追踪正确
- [x] 前置任务检查正确
- [x] 奖励发放正确
- [ ] Web 预览可运行（可选 - 需要 Cocos Creator 环境）

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：QuestSystem 核心逻辑实现（src/gameplay/QuestSystem.ts）
  - 任务注册、接受、放弃、完成、奖励领取
  - 状态机：LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED → CLAIMED
  - 6 种目标类型：COLLECT, CRAFT, TALK, GIVE_ITEM, VISIT, COMPLETE_FESTIVAL
  - 4 种奖励类型：ITEM, FRIENDSHIP, RECIPE, AREA_UNLOCK
- ✅ T2 完成：37 个单元测试全部通过
- ✅ T3 完成：目标追踪系统
  - updateObjective 方法
  - 自动完成检测
  - 多任务同时追踪
- ✅ T4 完成：前置任务检查
  - arePrerequisitesMet 方法
  - LOCKED 状态处理
- ✅ T5 完成：时间限制任务
  - deadline 设置
  - checkTimeLimits 方法
  - FAILED 状态
- ✅ T6 完成：可重复任务支持
- ✅ 所有测试通过：349 个测试（12 个测试套件）

### Sprint 005 完成 ✅

---

## Technical Notes

### 任务状态流转

```
LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED → CLAIMED
                          ↓
                       FAILED
                          ↓
                       ABANDONED → AVAILABLE (重新接受)
```

### 目标类型

| 类型 | 说明 |
|------|------|
| COLLECT | 收集物品 |
| CRAFT | 制作物品 |
| TALK | 与NPC对话 |
| GIVE_ITEM | 送给NPC物品 |
| VISIT | 访问地点 |
| COMPLETE_FESTIVAL | 完成节日 |

### 奖励类型

| 类型 | 说明 |
|------|------|
| ITEM | 物品奖励 |
| FRIENDSHIP | 好感度奖励 |
| RECIPE | 食谱解锁 |
| AREA_UNLOCK | 区域解锁 |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `quest:started` | `{ questId, questTitle }` |
| `quest:progress` | `{ questId, objectiveIndex, current, required }` |
| `quest:completed` | `{ questId, questTitle }` |
| `quest:claimed` | `{ questId, rewards }` |
| `quest:abandoned` | `{ questId }` |
| `quest:failed` | `{ questId, reason }` |
