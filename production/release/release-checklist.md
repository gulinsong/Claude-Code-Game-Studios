# Release Checklist - 岁时记 (Suìshí Jì)

**Version**: MVP 0.1.0
**Platform**: 微信小游戏
**Target Date**: TBD
**Last Updated**: 2026-03-25

---

## 1. Build Verification

| Item | Status | Notes |
|------|--------|-------|
| Cocos Creator 项目可构建 | ⬜ | |
| 微信小游戏包构建成功 | ⬜ | |
| 主包大小 < 4MB | ⬜ | |
| 总包大小 < 20MB | ⬜ | |
| 无构建错误或警告 | ⬜ | |
| 版本号正确设置 | ⬜ | |

---

## 2. Code Quality

| Item | Status | Notes |
|------|--------|-------|
| 所有单元测试通过 (626+ tests) | ✅ | |
| 无 TypeScript 编译错误 | ✅ | |
| 无 ESLint 错误 | ⬜ | |
| 无 console.log 残留 (生产代码) | ⬜ | |
| TODOs 已清理 (0 remaining) | ✅ | |

---

## 3. Feature Completeness

| System | Implemented | Tested | Notes |
|--------|-------------|--------|-------|
| 事件系统 | ✅ | ✅ | |
| 配置系统 | ✅ | ✅ | |
| 时间系统 | ✅ | ✅ | |
| 材料系统 | ✅ | ✅ | |
| 背包系统 | ✅ | ✅ | |
| 体力系统 | ✅ | ✅ | |
| 食谱系统 | ✅ | ✅ | |
| 采集系统 | ✅ | ✅ | |
| 手工艺系统 | ✅ | ✅ | |
| 对话系统 | ✅ | ✅ | |
| 任务系统 | ✅ | ✅ | |
| 村民关系系统 | ✅ | ✅ | |
| 节日筹备系统 | ✅ | ✅ | |
| 微信登录系统 | ✅ | ✅ | |
| 云存档系统 | ✅ | ✅ | |
| UI框架系统 | ✅ | ✅ | |
| 本地化系统 | ✅ | ✅ | 新增 |
| 对象池系统 | ✅ | ✅ | 新增 |
| 无障碍系统 | ✅ | ✅ | 新增 |

---

## 4. Performance Verification

| Metric | Target | Status | Actual |
|--------|--------|--------|--------|
| 帧率 (高端) | 60 FPS | ⬜ | ❓ 待测试 |
| 帧率 (低端) | 30 FPS | ⬜ | ❓ 待测试 |
| 内存使用 | < 150MB | ⬜ | ❓ 待测试 |
| Draw Calls | < 100 | ⬜ | ❓ 待测试 |
| 启动时间 | < 3s | ⬜ | ❓ 待测试 |
| 存档大小 | < 50KB | ✅ | 已验证 |

---

## 5. Content Verification

| Item | Status | Notes |
|------|--------|-------|
| 游戏资源完整 (纹理、音频) | ⬜ | `assets/` 目录需创建 |
| UI 文字已本地化 | ✅ | LocalizationSystem 已实现 |
| 节日数据配置完整 | ⬜ | |
| 村民数据配置完整 | ⬜ | |
| 任务数据配置完整 | ⬜ | |

---

## 6. Platform Compliance

### 微信小游戏要求

| Item | Status | Notes |
|------|--------|-------|
| 用户隐私协议 | ⬜ | 需准备 |
| 用户协议 (EULA) | ⬜ | 需准备 |
| 年龄分级声明 | ⬜ | 需准备 |
| 敏感权限说明 | ⬜ | |
| 支付功能报备 | ⬜ | MVP 无内购 |

---

## 7. Store Metadata

### 微信小游戏商店

| Item | Status | Notes |
|------|--------|-------|
| 游戏名称 | ✅ | 岁时记 |
| 游戏简介 | ⬜ | 需准备 |
| 详细描述 | ⬜ | 需准备 |
| 游戏截图 (至少3张) | ⬜ | 需准备 |
| 游戏图标 | ⬜ | 需准备 |
| 游戏视频 (可选) | ⬜ | |
| 关键词 | ⬜ | 需准备 |
| 分类标签 | ⬜ | 模拟、休闲 |

---

## 8. Documentation

| Document | Status | Notes |
|----------|--------|-------|
| CHANGELOG.md | ⬜ | 需创建 |
| 用户指南 (可选) | ⬜ | |
| API 文档 (内部) | ✅ | ADRs 已完成 |
| Sprint 记录 | ✅ | Sprint 001-011 |
| Gate Check 报告 | ✅ | polish-to-release.md |

---

## 9. Testing Sign-off

| Test Type | Status | Notes |
|-----------|--------|-------|
| 单元测试 | ✅ | 626 passing |
| 集成测试 | ⬜ | 需在 Cocos Creator 中执行 |
| Playtest | ⬜ | Sprint 011 T2 pending |
| 性能测试 | ⬜ | Sprint 011 T1 pending |
| 兼容性测试 (iOS) | ⬜ | |
| 兼容性测试 (Android) | ⬜ | |

---

## 10. Launch Readiness

### Go/No-Go Criteria

| Criterion | Status | Blocking? |
|-----------|--------|-----------|
| 核心功能可玩 | ⬜ | ✅ Yes |
| 无 Critical/High bugs | ⬜ | ✅ Yes |
| 性能达标 | ⬜ | ✅ Yes |
| 微信审核通过 | ⬜ | ✅ Yes |
| 法律文档完备 | ⬜ | ✅ Yes |

### Final Sign-off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Technical Director | — | — | ⬜ |
| Creative Director | — | — | ⬜ |
| QA Lead | — | — | ⬜ |
| Producer | — | — | ⬜ |

---

## 11. Post-Launch

| Item | Status | Notes |
|------|--------|-------|
| 监控告警配置 | ⬜ | |
| 崩溃上报接入 | ⬜ | |
| 用户反馈渠道 | ⬜ | |
| 热更新机制 | ⬜ | |

---

## Blockers Summary

| # | Blocker | Priority | Owner |
|---|---------|----------|-------|
| 1 | 性能基准测试 (Sprint 011 T1) | High | — |
| 2 | Playtest 报告 (Sprint 011 T2) | High | — |
| 3 | 游戏资源制作 | High | — |
| 4 | 法律文档准备 | High | — |
| 5 | 商店元数据准备 | Medium | — |
| 6 | CHANGELOG 创建 | Medium | — |

---

*This checklist should be reviewed and updated at each sprint milestone.*
