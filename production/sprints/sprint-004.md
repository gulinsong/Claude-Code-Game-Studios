# Sprint 4 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现对话系统** — 玩家与 NPC 之间的交互桥梁，支持分支选择、条件触发、变量插值。

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
| T1 | DialogueSystem 核心逻辑 | 1.5 | Sprint 002 | 对话流程、节点管理、选项处理 | ⬜ Pending |
| T2 | DialogueSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ⬜ Pending |
| T3 | 条件系统实现 | 1 | T1 | 触发条件、选项条件判断 | ⬜ Pending |
| T4 | 效果系统实现 | 0.5 | T1 | 好感度、物品、任务效果 | ⬜ Pending |
| T5 | 变量插值系统 | 0.5 | T1 | 玩家名、NPC名、季节等 | ⬜ Pending |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T6 | 对话历史记录 | 0.5 | T1 | 保留最近对话记录 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 对话系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 条件判断复杂度超预期 | Medium | Medium | 先实现核心条件，扩展留到后续 |
| 村民关系系统未实现 | High | Medium | 使用接口抽象，后续注入 |

## Dependencies on External Factors

- 村民关系系统（未实现）- 使用接口占位
- 任务系统（未实现）- 使用接口占位

## Definition of Done for this Sprint

- [ ] T1-T5 全部完成
- [ ] DialogueSystem 单元测试通过
- [ ] 代码通过 TypeScript 编译
- [ ] 所有测试通过（目标 320+ 个测试）
- [ ] 条件判断正确
- [ ] 选项效果正确执行
- [ ] 变量插值正确

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：DialogueSystem 核心逻辑实现（src/gameplay/DialogueSystem.ts）
  - 状态机：IDLE → SELECTING → PLAYING ↔ CHOOSING → ENDED
  - 对话注册、触发条件、效果系统
  - 变量插值、存档支持
- ✅ T2 完成：42 个单元测试全部通过
- ✅ T3 完成：条件系统实现
  - ALWAYS, FIRST_MEET, FRIENDSHIP_LEVEL, QUEST_COMPLETE
  - FLAG_SET, SEASON, TIME_PERIOD, ITEM_OWNED
- ✅ T4 完成：效果系统实现
  - SET_FLAG, GIVE_ITEM, UNLOCK_RECIPE
  - CHANGE_FRIENDSHIP, START_QUEST, COMPLETE_QUEST
- ✅ T5 完成：变量插值系统
- ✅ 所有测试通过：312 个测试（11 个测试套件）

### Sprint 004 完成 ✅

---

## Technical Notes

### 对话状态机

```
IDLE → SELECTING → PLAYING ↔ CHOOSING → ENDED → IDLE
```

### 触发条件类型

| 类型 | 说明 |
|------|------|
| ALWAYS | 总是可触发 |
| FIRST_MEET | 首次见面 |
| FRIENDSHIP_LEVEL | 好感度达到 |
| QUEST_COMPLETE | 任务完成 |
| FESTIVAL_APPROACHING | 节日临近 |
| SEASON | 特定季节 |
| TIME_PERIOD | 特定时段 |
| ITEM_OWNED | 拥有物品 |
| FLAG_SET | 标志位设置 |

### 效果类型

| 类型 | 说明 |
|------|------|
| CHANGE_FRIENDSHIP | 改变好感度 |
| SET_FLAG | 设置标志位 |
| GIVE_ITEM | 获得物品 |
| UNLOCK_RECIPE | 解锁食谱 |
| START_QUEST | 开始任务 |
| COMPLETE_QUEST | 完成任务 |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `dialog:started` | `{ dialogId, npcId }` |
| `dialog:node_entered` | `{ dialogId, nodeId }` |
| `dialog:choice_made` | `{ dialogId, nodeId, choiceIndex }` |
| `dialog:completed` | `{ dialogId, npcId }` |
