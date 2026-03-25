# Sprint 6 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现村民关系系统** — 管理玩家与 NPC 之间的好感度、关系等级和互动历史。

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
| T1 | VillagerSystem 核心逻辑 | 1.5 | Sprint 005 | 村民注册、关系管理、好感度计算 | ✅ Complete |
| T2 | VillagerSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ✅ Complete |
| T3 | 送礼系统实现 | 1 | T1 | 喜好判断、每日限制、节日加成 | ✅ Complete |
| T4 | 关系等级系统 | 0.5 | T1 | 等级计算、升级事件 | ✅ Complete |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 性格系统 | 0.5 | T1 | 5 种性格类型 | ✅ Complete |
| T6 | 每日重置 | 0.5 | T1 | 送礼次数重置 | ✅ Complete |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 村民系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 背包系统依赖 | Low | Medium | 使用接口抽象 |
| 时间系统依赖 | Medium | Medium | 使用接口占位 |

## Dependencies on External Factors

- 背包系统（已实现）- 送礼消耗物品
- 材料系统（已实现）- 查询物品信息
- 时间系统（未实现）- 每日重置，使用接口占位

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] VillagerSystem 单元测试通过（56 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（405 个测试）
- [x] 送礼正确消耗物品和增加好感度
- [x] 关系等级正确计算
- [x] 喜好判断正确
- [x] 每日送礼限制正确

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：VillagerSystem 核心逻辑实现（src/gameplay/VillagerSystem.ts）
  - 村民注册、首次见面、关系管理
  - 好感度 0-100，等级 1-5
  - 5 种性格类型：GENTLE, ENTHUSIASTIC, INTROVERTED, TRADITIONAL, PLAYFUL
  - 关系状态：UNMET, ACQUAINTED, FRIEND, CLOSE_FRIEND
- ✅ T2 完成：56 个单元测试全部通过
- ✅ T3 完成：送礼系统
  - 喜欢 +10，普通 +5，不喜欢 +1
  - 节日加成 2x
  - 每日限制检查
- ✅ T4 完成：关系等级系统
  - 等级阈值：0/20/40/70/100
  - 升级事件发布
- ✅ T5 完成：性格系统
- ✅ T6 完成：每日重置
- ✅ 所有测试通过：405 个测试（13 个测试套件）

### Sprint 006 完成 ✅

---

## Technical Notes

### 关系状态

```
Unmet → Acquainted → Friend → CloseFriend
         (首次对话)    (等级≥4)    (等级=5)
```

### 好感度等级

| Level | 所需好感度 | 名称 |
|-------|-----------|------|
| 1 | 0 | 陌生人 |
| 2 | 20 | 认识 |
| 3 | 40 | 熟人 |
| 4 | 70 | 朋友 |
| 5 | 100 | 好友 |

### 送礼好感度

| 类型 | 好感度 |
|------|--------|
| 喜欢 | +10 |
| 普通 | +5 |
| 不喜欢 | +1 |
| 节日加成 | 2x |

### 性格类型

| 类型 | 特点 |
|------|------|
| GENTLE | 温和、友善 |
| ENTHUSIASTIC | 热情、开朗 |
| INTROVERTED | 内向、细腻 |
| TRADITIONAL | 古板、传统 |
| PLAYFUL | 顽皮、爱玩 |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `villager:met` | `{ npcId, npcName }` |
| `villager:friendship_changed` | `{ npcId, oldLevel, newLevel, delta }` |
| `villager:level_up` | `{ npcId, newLevel }` |
| `villager:gift_sent` | `{ npcId, itemId, reaction }` |
| `villager:max_level` | `{ npcId }` |
