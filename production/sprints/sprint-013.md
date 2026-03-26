# Sprint 13 -- 2026-04-09 to 2026-04-15

## Sprint Goal

**Bug 修复 + Polish** — 解决已知问题、完成性能测试、准备发布候选版本。

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
| T1 | 性能基准测试 (延续 Sprint 012) | 1 | Cocos Creator | 建立性能基准，生成报告 | ⬜ Pending |
| T2 | Playtest 报告 (延续 Sprint 012) | 1 | Cocos Creator | 完成至少1次正式Playtest | ⬜ Pending |
| T3 | Flaky Test 修复 | 0.5 | — | CloudSaveSystem 异步测试稳定 | ✅ Done |
| T4 | 代码审查完成 | 1 | — | 所有核心系统代码审查完成 | ✅ Done |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 存档迁移工具 | 0.5 | — | 版本升级存档迁移脚本 | ✅ Done |
| T6 | 性能优化实施 | 1 | T1 | 根据基准报告实施优化 | ⬜ Pending |
| T7 | 可访问性检查 | 0.5 | — | WCAG 2.1 AA 合规检查 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T8 | 玩家引导优化 | 0.5 | — | 新手引导流程改进 | ⬜ Pending |
| T9 | 成就系统完善 | 0.5 | — | 成就图标和描述完善 | ⬜ Pending |

## Technical Debt

| Item | Priority | Est. Effort | Sprint Target |
|------|----------|-------------|---------------|
| Flaky async test (CloudSaveSystem) | High | 0.5 day | ✅ T3 已解决 |
| 代码审查积压 | Medium | 1 day | ✅ T4 已完成 |
| 性能基准缺失 | High | 1 day | T1 完成 |
| 文档同步 | Low | Ongoing | 持续 |

## Bug Backlog

| Bug | Priority | Status | Sprint Target |
|-----|----------|--------|---------------|
| 无已知 Bug | — | — | 保持 |

## Performance Targets

| 指标 | 目标 | Sprint 012 状态 | Sprint 013 目标 |
|------|------|----------------|-----------------|
| 帧率 | 60 FPS (高端), 30 FPS (低端) | ❓ 待测试 | ✅ 验证达标 |
| Draw Calls | < 100 | ❓ 待测试 | ✅ 验证达标 |
| 内存 | < 150MB | ❓ 待测试 | ✅ 验证达标 |
| 启动时间 | < 3s | ❓ 待测试 | ✅ 验证达标 |
| 存档大小 | < 50KB | ✅ 已验证 | ✅ 保持 |

## Gate Check Status (from Sprint 012)

| Blocker | Status | Sprint 013 Target |
|---------|--------|-------------------|
| Performance baseline | ⬜ Pending | T1 完成后解决 |
| Playtest report | ⬜ Pending | T2 完成后解决 |
| Game assets | ✅ Resolved | — |
| Balance data | ✅ Resolved | — |
| Store metadata | ✅ Resolved | — |
| Monitoring systems | ✅ Resolved | — |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 性能不达标 | Medium | High | T6 预留优化时间 |
| Playtest 发现严重问题 | Medium | High | 快速迭代修复 |
| Cocos Creator 环境问题 | Low | Medium | 文档记录，社区支持 |
| 资源制作延迟 | Low | Medium | 使用占位资源 |

## Definition of Done for this Sprint

- [ ] T1-T2 完成 (需要 Cocos Creator 运行时)
- [x] T3-T4 完成 (代码质量)
- [x] T5 完成 (存档迁移工具)
- [ ] T6-T7 完成 (可选优化)
- [ ] 性能基准报告完成
- [ ] 至少1次 Playtest 报告
- [x] 所有测试继续通过 (705 tests)
- [x] 代码审查完成
- [ ] Gate Check 所有阻碍项解决

## Progress Log

### 2026-04-09 - Sprint Day 1

**计划任务**:
- [ ] T1 性能基准测试 (需要 Cocos Creator)
- [x] T3 Flaky Test 修复
- [x] T4 代码审查完成

**完成情况**:
- T3: 修复 CloudSaveSystem 异步测试
  - 清除超时定时器 (save/load 完成后)
  - 使用 `clearAll()` 替代 `removeAllListeners()`
  - 38 个测试全部通过，无异步警告
- T4: 完成全部系统代码审查
  - Core: 7 文件, 155 测试, 73.68% 覆盖率
  - Gameplay: 10 文件, 267 测试, 86.94% 覆盖率
  - UI: 3 文件, 91 测试, 82.22% 覆盖率
  - Platform: 3 文件, 107 测试, 86.05% 覆盖率
  - 总计: 23 文件, 670 测试
  - 发现 6 个系统覆盖率需改进 (<70%)
  - 详见: `docs/code-review/sprint-013-code-review.md`

**提交**: `189962a`, `fa802eb`

### 2026-03-26 - Sprint Day 2 (继续)

**计划任务**:
- [x] T5 存档迁移工具

**完成情况**:
- T5: 存档迁移工具 (SaveMigration)
  - 版本解析和比较 (语义化版本)
  - 迁移函数注册和执行
  - 多步迁移路径查找
  - 内置迁移: 1.0.0→1.1.0→1.2.0
  - 版本兼容性检查
  - 35 个单元测试, 95.19% 覆盖率
  - 总测试数: 705 tests

**提交**: `50c2564`

---

## Performance Test Plan (T1)

### 测试环境

| 设备类型 | 规格 | 目标 FPS |
|----------|------|----------|
| 高端 Android | 骁龙 888+, 8GB+ RAM | 60 FPS |
| 中端 Android | 骁龙 765, 4GB RAM | 45 FPS |
| 低端 Android | 骁龙 660, 3GB RAM | 30 FPS |
| iPhone | iPhone 12+ | 60 FPS |
| 微信开发者工具 | 模拟器 | 60 FPS |

### 测试场景

1. **启动场景** - 冷启动时间测量
2. **主界面** - UI 渲染性能
3. **游戏主循环** - 帧率稳定性
4. **节日庆典** - 特效和动画压力测试
5. **背包界面** - 列表滚动性能

### 测试指标

| 指标 | 测量方法 | 目标值 |
|------|----------|--------|
| FPS | PerformanceMonitor | 60/30 FPS |
| Draw Calls | Cocos Creator 调试器 | < 100 |
| 内存 | wx.getPerformance() | < 150 MB |
| 启动时间 | performance.now() | < 3 s |
| 帧时间 | PerformanceMonitor | < 16.6 ms |

## Playtest Plan (T2)

### 测试目标

- 验证核心玩法循环
- 验证节日系统流程
- 收集用户体验反馈
- 发现 Bug 和问题

### 测试用例

| 用例 | 场景 | 预期结果 |
|------|------|----------|
| PT-001 | 新游戏开始 | 引导完成，进入主界面 |
| PT-002 | 采集资源 | 正确获得材料 |
| PT-003 | 制作物品 | 配方解锁和制作成功 |
| PT-004 | 送礼给村民 | 好感度正确变化 |
| PT-005 | 节日准备 | 任务进度追踪正确 |
| PT-006 | 节日庆典 | 小游戏正常运行 |
| PT-007 | 存档/读档 | 数据正确保存和恢复 |
| PT-008 | 离线恢复 | 体力正确恢复 |

### 测试报告模板

```markdown
## Playtest Report

**日期**: YYYY-MM-DD
**测试者**: 姓名
**版本**: x.x.x
**设备**: 设备信息

### 测试结果

| 用例 | 结果 | 备注 |
|------|------|------|
| PT-001 | ✅/❌ | |
| ... | | |

### 发现的问题

1. [严重程度] 问题描述
   - 复现步骤
   - 预期行为
   - 实际行为

### 用户反馈

- 正面反馈
- 改进建议

### 总结

[整体评价和建议]
```

---

## Code Review Checklist (T4) ✅

### 核心系统

- [x] EventSystem (100% 覆盖率)
- [x] ConfigSystem (95.23% 覆盖率)
- [x] TimeSystem (92.41% 覆盖率)
- [x] CloudSaveSystem (86.32% 覆盖率)
- [x] LocalizationSystem (94.28% 覆盖率)
- [x] PerformanceMonitor (67.69% 覆盖率) ⚠️
- [x] ErrorReporter (48.06% 覆盖率) ⚠️

### 游戏系统

- [x] BackpackSystem (已审查)
- [x] CraftingSystem (95.62% 覆盖率)
- [x] FestivalSystem (92.2% 覆盖率)
- [x] GatheringSystem (80.51% 覆盖率)
- [x] QuestSystem (88.57% 覆盖率)
- [x] VillagerSystem (96.42% 覆盖率)
- [x] StaminaSystem (38.09% 覆盖率) ⚠️
- [x] RecipeSystem (51% 覆盖率) ⚠️
- [x] DialogueSystem (76.88% 覆盖率)
- [x] MiniGameMooncake (60.97% 覆盖率) ⚠️

### UI 系统

- [x] UIFramework (78.17% 覆盖率)
- [x] AccessibilitySystem (91.66% 覆盖率)

### 测试覆盖

- [x] 核心系统 > 70% (实际: 73.68%)
- [x] 游戏系统 > 70% (实际: 86.94%)
- [x] UI 系统 > 60% (实际: 82.22%)
- [x] 平台系统 > 70% (实际: 86.05%)

### 需改进系统 (<70%)

| 系统 | 当前覆盖率 | 目标 | 优先级 |
|------|-----------|------|--------|
| StaminaSystem | 38.09% | 70% | P1 |
| RecipeSystem | 51% | 70% | P1 |
| ErrorReporter | 48.06% | 70% | P2 |
| PerformanceMonitor | 67.69% | 70% | P2 |

---

## Polish Phase Roadmap

| Sprint | Focus | Target | Status |
|--------|-------|--------|--------|
| 011 | 性能基准 + Playtest + Release Prep | T3-T8 Done, T1-T2 Pending | 75% Complete |
| 012 | 性能优化 + Assets + Balance + Monitoring | T3-T9 Done, T1-T2 Pending | 78% Complete |
| 013 | Bug修复 + Polish | T3-T5 Done, T1-T2 Pending | 33% Complete |
| 014 | Release准备 | 可发布状态 | Planned |

---

## Next Sprint Preview (Sprint 014)

- 最终性能验证
- 商店资源制作 (图标、截图)
- 提交审核
- 发布准备
