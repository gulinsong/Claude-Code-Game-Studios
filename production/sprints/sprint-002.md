# Sprint 2 -- 2026-03-24 to 2026-03-30

## Sprint Goal

实现体力系统、食谱系统、采集系统，为手工艺系统（核心玩法）铺路。

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
| T1 | 实现体力系统 | 1 | Sprint 001 | 消耗/恢复，事件通知，存档支持 | ✅ Done |
| T2 | 实现食谱系统 | 1 | Sprint 001 | RecipeData 定义，查询接口 | ✅ Done |
| T3 | 实现采集系统 | 2 | T1, T2 | 采集点，产出计算，事件通知 | ✅ Done |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T4 | 修复 TimeSystem 技术债务 | 0.5 | — | calculateOfflineTime 修复 | ✅ Done |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 手工艺系统设计评审 | 0.5 | — | 设计文档验证 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 采集系统产出平衡需要调优 | Medium | Medium | 先实现基础功能，平衡值可配置 |
| 体力系统与时间系统联动复杂 | Low | Medium | 参考 GDD 设计，增量实现 |

## Dependencies on External Factors

- Cocos Creator 3.8.8 已安装
- Node.js 环境已配置

## Definition of Done for this Sprint

- [x] T1-T3 全部完成
- [x] T4 TimeSystem 离线时间计算修复完成
- [x] 体力系统、食谱系统、采集系统有单元测试
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（201 个测试）
- [ ] Web 预览可运行（可选）

## Progress Log

### 2026-03-24 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：体力系统实现（src/resource/StaminaSystem.ts）
- ✅ 38 个体力系统单元测试通过
- ✅ T2 完成：食谱系统实现（src/data/RecipeSystem.ts）
- ✅ 26 个食谱系统单元测试通过
- ✅ T3 完成：采集系统实现（src/gameplay/GatheringSystem.ts）
- ✅ 22 个采集系统单元测试通过
- ✅ T4 完成：TimeSystem.calculateOfflineTime 修复
  - 修复：离线时间计算现在正确返回游戏小时数
  - 之前：offlineRealMinutes * timeScale 返回游戏分钟
  - 现在：(offlineRealMinutes * timeScale) / 60 返回游戏小时
- ✅ 201 个总测试全部通过
- ✅ TypeScript 编译通过

### Sprint 002 完成 ✅

可以开始规划 Sprint 003（手工艺系统）。
