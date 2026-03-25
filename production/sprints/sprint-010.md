# Sprint 10 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现 UI 框架系统** — 表现层基础设施，提供统一的 UI 管理、层级控制、动画系统和事件分发。

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
| T1 | UIFramework 核心逻辑 | 1.5 | Sprint 009 | UI 打开/关闭、层级管理、对象池 | ✅ Complete |
| T2 | UIFramework 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ✅ Complete |
| T3 | UI 层级管理 | 0.5 | T1 | 8 层层级、zIndex 计算 | ✅ Complete |
| T4 | 动画系统 | 0.5 | T1 | 进入/退出动画、缓动函数 | ✅ Complete |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | Toast 提示系统 | 0.5 | T1 | 显示/隐藏、队列管理 | ✅ Complete |
| T6 | Loading 加载系统 | 0.5 | T1 | 显示/隐藏、进度显示 | ✅ Complete |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | UI 框架系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| UI 动画复杂 | Medium | Medium | 使用标准缓动函数 |
| 对象池管理复杂 | Low | Medium | 清晰的缓存策略 |

## Dependencies on External Factors

- Cocos Creator UI 组件（需要抽象层）
- 资源加载系统（软依赖，可 mock）

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] UIFramework 单元测试通过（36 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（559 个测试）
- [x] UI 正确打开和关闭
- [x] 层级管理正确
- [x] 动画流畅
- [x] Toast 和 Loading 系统完成

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：UIFramework 核心逻辑实现（src/ui/UIFramework.ts）
  - UI 打开/关闭、层级管理、对象池
  - 8 层层级：BACKGROUND, SCENE, HUD, POPUP, TOPBAR, LOADING, TOAST, DEBUG
  - 4 种缓存策略：PERMANENT, POOLED, ON_DEMAND, ASYNC
  - 4 种动画类型：NONE, SCALE, SLIDE, FADE
- ✅ T2 完成：36 个单元测试全部通过
- ✅ T3 完成：UI 层级管理
  - zIndex 计算：baseLayer + subIndex * 10
  - 置顶/置底功能
- ✅ T4 完成：动画系统
  - 进入/退出动画
  - DefaultUIAnimator 实现
- ✅ T5 完成：Toast 提示系统
  - 显示/隐藏、队列管理
  - 默认 2 秒显示时长
- ✅ T6 完成：Loading 加载系统
  - 显示/隐藏、进度更新
- ✅ 所有测试通过：559 个测试（17 个测试套件）

### Sprint 010 完成 ✅

---

## MVP 里程碑

**所有 16 个 MVP 系统已实现！**

| # | System | Sprint | Status |
|---|--------|--------|--------|
| 1 | 事件系统 | 001 | ✅ |
| 2 | 配置系统 | 001 | ✅ |
| 3 | 时间系统 | 001 | ✅ |
| 4 | 材料系统 | 001 | ✅ |
| 5 | 背包系统 | 001 | ✅ |
| 6 | 体力系统 | 002 | ✅ |
| 7 | 食谱系统 | 002 | ✅ |
| 8 | 采集系统 | 002 | ✅ |
| 9 | 手工艺系统 | 003 | ✅ |
| 10 | 对话系统 | 004 | ✅ |
| 11 | 任务系统 | 005 | ✅ |
| 12 | 村民关系系统 | 006 | ✅ |
| 13 | 节日筹备系统 | 007 | ✅ |
| 14 | 微信登录系统 | 008 | ✅ |
| 15 | 云存档系统 | 009 | ✅ |
| 16 | UI框架系统 | 010 | ✅ |

---

## Technical Notes

### UI 层级定义

| Layer | Z-Index | 用途 |
|-------|---------|------|
| BACKGROUND | 0 | 背景层 |
| SCENE | 100 | 场景层 |
| HUD | 200 | 主界面 |
| POPUP | 300 | 弹窗层 |
| TOPBAR | 400 | 顶部栏 |
| LOADING | 500 | 加载层 |
| TOAST | 600 | 提示层 |
| DEBUG | 700 | 调试层 |

### UI 状态

```
NONE → LOADING → ENTERING → ACTIVE → EXITING → POOLED
                    ↑                          |
                    └──────────────────────────┘
```

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `ui:opened` | `{ uiName }` |
| `ui:closed` | `{ uiName }` |
| `ui:button_clicked` | `{ buttonId }` |
| `ui:scroll_end` | `{ listId }` |

### 缓存策略

| 预制体类型 | 缓存策略 |
|-----------|---------|
| 常驻UI | 常驻内存 |
| 频繁UI | 对象池缓存 |
| 普通UI | 按需加载 |
| 大型UI | 异步加载 |
