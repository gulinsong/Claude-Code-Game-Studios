# Sprint 14 -- 2026-04-16 to 2026-04-22

## Sprint Goal

**Release 准备** — 完成性能验证、商店资源制作、提交审核准备，达到可发布状态。

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
| T1 | 性能基准测试 (延续 Sprint 013) | 1 | Cocos Creator | 建立性能基准，生成报告 | ⬜ Pending |
| T2 | Playtest 报告 (延续 Sprint 013) | 1 | Cocos Creator | 完成至少1次正式Playtest | ⬜ Pending |
| T3 | Release 候选版本构建 | 0.5 | T1, T2 | RC 版本构建成功，无阻塞问题 | ⬜ Pending |
| T4 | 最终 QA 检查 | 1 | T3 | 所有测试用例通过 | ⬜ Pending |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 商店资源制作 | 1 | — | 图标、截图、宣传图完成 | ⬜ Pending |
| T6 | 商店页面文案 | 0.5 | — | 描述、标签、关键词完成 | ⬜ Pending |
| T7 | 隐私政策和用户协议 | 0.5 | — | 法律文档准备完成 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T8 | 宣传视频制作 | 1 | T5 | 30秒宣传视频完成 | ⬜ Pending |
| T9 | 社交媒体预告 | 0.5 | T5, T6 | 发布预告内容 | ⬜ Pending |

## Release Checklist

### 技术检查

| 检查项 | 目标 | 状态 |
|--------|------|------|
| 性能基准 | 60 FPS (高端), 30 FPS (低端) | ⬜ |
| Draw Calls | < 100 | ⬜ |
| 内存占用 | < 150 MB | ⬜ |
| 启动时间 | < 3s | ⬜ |
| 存档大小 | < 50 KB | ✅ |
| 所有测试通过 | 849 tests | ✅ |
| 代码覆盖率 | > 70% | ✅ |

### 微信小游戏提交要求

| 检查项 | 要求 | 状态 |
|--------|------|------|
| 主包大小 | < 4 MB | ⬜ |
| 总包大小 | < 20 MB | ⬜ |
| 隐私政策 | 必须包含 | ⬜ |
| 用户协议 | 必须包含 | ⬜ |
| 软件著作权登记 | 推荐有 | ⬜ |
| 游戏版号 | 如需内购 | ⬜ |

### 商店资源清单

| 资源类型 | 规格 | 数量 | 状态 |
|----------|------|------|------|
| 应用图标 | 512x512 PNG | 1 | ⬜ |
| 小图标 | 192x192 PNG | 1 | ⬜ |
| 宣传图 | 1024x500 PNG | 1 | ⬜ |
| 截图 | 1280x720 PNG | 5 | ⬜ |
| 宣传视频 | 30s MP4 | 1 | ⬜ (Optional) |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 性能不达标 | Medium | High | 已有 VirtualList 优化，可进一步调整 |
| Playtest 发现严重问题 | Medium | High | 预留修复时间 |
| 商店审核被拒 | Low | High | 提前检查审核指南 |
| 资源制作延迟 | Low | Medium | 使用占位资源先行提交 |

## Gate Check for Release

### 必须满足 (Blockers)

- [ ] 性能基准达标
- [ ] Playtest 无严重问题
- [ ] 所有测试通过
- [ ] 主包大小 < 4 MB

### 应该满足 (Warnings)

- [ ] 代码覆盖率 > 70%
- [ ] 商店资源完成
- [ ] 隐私政策就绪

## Definition of Done for this Sprint

- [ ] T1-T2 完成 (性能验证)
- [ ] T3-T4 完成 (版本构建和 QA)
- [ ] T5-T7 完成 (商店准备)
- [ ] Release Checklist 全部通过
- [ ] RC 版本就绪

## Progress Log

### 2026-04-16 - Sprint Day 1

**计划任务**:
- [ ] T1 性能基准测试 (需要 Cocos Creator)
- [ ] T5 商店资源制作开始

**完成情况**:
- Sprint 014 创建

---

## Release Timeline

```
Sprint 014 (Week 1)
├── Day 1-2: T1 性能测试 + T2 Playtest
├── Day 3: T3 RC 构建
├── Day 4: T4 最终 QA
├── Day 5-6: T5-T7 商店准备
└── Day 7: 缓冲 + 提交准备

提交后:
├── 审核周期: 1-7 天
├── 审核通过: 发布上线
└── 审核拒绝: 快速修复并重新提交
```

---

## Next Sprint Preview (Sprint 015)

- 发布上线
- 监控和快速修复
- 玩家反馈收集
- 运营活动准备
