# Sprint 12 -- 2026-04-02 to 2026-04-08

## Sprint Goal

**性能优化冲刺** — 建立性能基准、优化代码、准备游戏资源，推进 Gate Check 阻碍项。

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
| T1 | 性能基准测试 (延续 Sprint 011) | 1 | Cocos Creator | 建立性能基准，识别瓶颈 | ⬜ Pending |
| T2 | Playtest 报告 (延续 Sprint 011) | 1 | Cocos Creator | 完成至少1次正式Playtest | ⬜ Pending |
| T3 | 游戏资源目录结构 | 0.5 | — | 创建 assets/ 目录结构 | ⬜ Pending |
| T4 | 平衡数据配置 | 1 | — | 创建 design/balance/ 配置文件 | ⬜ Pending |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 渲染优化准备 | 1 | — | Draw Call 减少策略文档 | ⬜ Pending |
| T6 | 资源加载策略 | 0.5 | — | 分包加载方案设计 | ⬜ Pending |
| T7 | 商店元数据 | 0.5 | — | 微信小店商店信息 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T8 | 性能监控系统 | 0.5 | — | FPS/内存监控组件 | ⬜ Pending |
| T9 | 错误上报系统 | 0.5 | — | 崩溃日志收集 | ⬜ Pending |

## Technical Debt

| Item | Priority | Est. Effort |
|------|----------|-------------|
| Flaky async test (CloudSaveSystem) | Medium | 0.5 day |
| 性能基准测试 | High | 1 day |
| 代码审查 | Medium | Ongoing |

## Performance Targets

| 指标 | 目标 | Sprint 011 状态 | Sprint 012 目标 |
|------|------|----------------|-----------------|
| 帧率 | 60 FPS (高端), 30 FPS (低端) | ❓ 待测试 | 📊 建立基准 |
| Draw Calls | < 100 | ❓ 待测试 | 📊 建立基准 |
| 内存 | < 150MB | ❓ 待测试 | 📊 建立基准 |
| 启动时间 | < 3s | ❓ 待测试 | 📊 建立基准 |
| 存档大小 | < 50KB | ✅ 已验证 | ✅ 保持 |

## Gate Check Blockers (from Sprint 011)

| Blocker | Status | Sprint 012 Target |
|---------|--------|-------------------|
| Performance baseline | ⬜ Pending | T1 完成后解决 |
| Playtest report | ⬜ Pending | T2 完成后解决 |
| Game assets | ⬜ Pending | T3 创建目录结构 |
| Balance data | ⬜ Pending | T4 创建配置 |
| Store metadata | ⬜ Pending | T7 完成 |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 性能不达标 | Medium | High | 早期profiling，预留优化时间 |
| Playtest发现严重问题 | Medium | High | 快速迭代修复 |
| 资源制作延迟 | Medium | Medium | 使用占位资源先跑通流程 |
| Cocos Creator环境问题 | Low | Medium | 文档记录，社区支持 |

## Definition of Done for this Sprint

- [ ] T1-T2 完成 (需要 Cocos Creator 运行时)
- [ ] T3-T4 完成 (代码/配置层面)
- [ ] T5-T7 完成 (文档/设计层面)
- [ ] 性能基准报告完成
- [ ] 至少1次Playtest报告
- [ ] assets/ 目录结构创建
- [ ] design/balance/ 配置创建
- [ ] 所有测试继续通过

## Progress Log

### 2026-04-02 - Sprint Day 1

**计划任务**:
- [ ] T3 创建 assets/ 目录结构
- [ ] T4 创建 design/balance/ 配置文件
- [ ] T7 商店元数据准备

---

## Assets Directory Structure (T3 Target)

```
assets/
├── scenes/
│   └── MainScene.scene
├── scripts/
│   └── (TypeScript files from src/)
├── textures/
│   ├── ui/
│   ├── items/
│   ├── characters/
│   └── backgrounds/
├── audio/
│   ├── bgm/
│   ├── sfx/
│   └── voice/
├── prefabs/
│   ├── ui/
│   └── gameplay/
├── animations/
│   ├── ui/
│   └── characters/
├── fonts/
├── data/
│   └── config/
└── resources/
    └── (runtime loaded assets)
```

## Balance Data Structure (T4 Target)

```
design/balance/
├── economy.json          # 经济系统配置
├── stamina.json          # 体力恢复配置
├── gathering.json        # 采集点配置
├── crafting.json         # 手工艺配置
├── festival.json         # 节日配置
├── villager.json         # 村民好感度配置
└── README.md             # 配置说明
```

## Store Metadata (T7 Target)

| 字段 | 内容 |
|------|------|
| 游戏名称 | 岁时记 |
| 游戏简介 | 温馨治愈的中国传统节日模拟游戏 |
| 详细描述 | [待填写] |
| 关键词 | 模拟,经营,节日,中国风,治愈 |
| 分类 | 模拟 > 休闲 |
| 截图1 | [待制作] |
| 截图2 | [待制作] |
| 截图3 | [待制作] |
| 图标 | [待制作] |

---

## Polish Phase Roadmap

| Sprint | Focus | Target | Status |
|--------|-------|--------|--------|
| 011 | 性能基准 + Playtest + Release Prep | T3-T8 Done, T1-T2 Pending | 75% Complete |
| 012 | 性能优化 + Assets + Balance | 达成 Gate Check 目标 | In Progress |
| 013 | Bug修复 + Polish | 稳定性 | Planned |
| 014 | Release准备 | 可发布状态 | Planned |
