# Sprint 11 -- 2026-03-26 to 2026-04-01

## Sprint Goal

**Polish Phase启动** — 性能优化、Playtesting、Bug修复，为发布做准备。

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
| T1 | 性能基准测试 | 1 | Sprint 010 | 建立性能基准，识别瓶颈 | ⬜ Pending |
| T2 | Playtest 报告 | 1 | Sprint 010 | 完成至少1次正式Playtest | ⬜ Pending |
| T3 | 修复 TODOs | 0.5 | — | 解决代码中3个TODOs | ✅ Done |
| T4 | 核心 ADR 补充 | 0.5 | — | 至少3个新ADR | ✅ Done |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 内存优化 | 1 | T1 | 内存使用 < 150MB | ✅ Done |
| T6 | 对象池优化 | 0.5 | T1 | 减少GC压力 | ✅ Done |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 无障碍功能 | 0.5 | — | 基础无障碍支持 | ✅ Done |
| T8 | 错误处理增强 | 0.5 | — | 优雅降级 | ✅ Done |

## Technical Debt

| Item | Priority | Est. Effort |
|------|----------|-------------|
| 补充架构决策记录 | Medium | 0.5 day each |
| 性能基准测试 | High | 1 day |
| 代码审查 | Medium | Ongoing |

## Performance Targets

| 指标 | 目标 | 当前状态 |
|------|------|---------|
| 帧率 | 60 FPS (高端), 30 FPS (低端) | ❓ 待测试 |
| Draw Calls | < 100 | ❓ 待测试 |
| 内存 | < 150MB | ❓ 待测试 |
| 启动时间 | < 3s | ❓ 待测试 |
| 存档大小 | < 50KB | ✅ 已验证 |

## Playtest Focus Areas

1. **核心循环验证**
   - 采集 → 手工艺 → 节日筹备 → 村民互动
   - 体力管理节奏
   - 时间推进感

2. **UI/UX 测试**
   - 界面导航流畅度
   - 按钮响应
   - 信息可读性

3. **边缘情况**
   - 背包满时的行为
   - 存档冲突处理
   - 网络断开时的行为

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 性能不达标 | Medium | High | 早期profiling，预留优化时间 |
| Playtest发现严重问题 | Medium | High | 快速迭代修复 |
| Cocos Creator环境问题 | Low | Medium | 文档记录，社区支持 |

## Definition of Done for this Sprint

- [ ] T1-T2 完成（T3-T4 已完成）
- [ ] 性能基准报告完成
- [ ] 至少1次Playtest报告
- [x] 所有TODOs已解决
- [x] 3个新ADR文档
- [x] 所有测试继续通过

## Progress Log

### 2026-03-25 - Sprint Day 1

**已完成**:
- ✅ T3 修复 TODOs
  - DialogueSystem: 实现 FESTIVAL_APPROACHING 触发器
  - DialogueSystem: 实现完整变量插值 {time:*}, {npc:*}
  - BackpackSystem: 添加 DEFAULT_CRAFTED_MAX_STACK = 5
- ✅ T4 核心 ADR 补充
  - ADR-0002: ConfigSystem 架构
  - ADR-0003: TimeSystem 架构
  - ADR-0004: BackpackSystem 架构
- ✅ 更新 project-stage-report.md

**测试状态**: 559 tests passing

**Commits**:
- `fix: Resolve all TODOs in codebase (Sprint 011 T3)`
- `docs: Add ADRs for core systems (Sprint 011 T4)`

---

## Polish Phase Roadmap

| Sprint | Focus | Target |
|--------|-------|--------|
| 011 | 性能基准 + Playtest | 建立baseline |
| 012 | 性能优化 | 达成目标 |
| 013 | Bug修复 + Polish | 稳定性 |
| 014 | Release准备 | 可发布状态 |
