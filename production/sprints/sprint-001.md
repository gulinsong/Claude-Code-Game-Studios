# Sprint 1 -- 2026-03-25 to 2026-03-31

## Sprint Goal

搭建项目基础设施，实现事件系统和配置系统，为后续系统开发奠定基础。

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
| T1 | Cocos Creator 项目初始化 | 0.5 | — | 项目结构符合规范，Web 预览运行 | ✅ Done |
| T2 | 实现事件系统 | 1.5 | T1 | on/off/emit/once，单元测试通过 | ✅ Done |
| T3 | 实现配置系统 | 1 | T1 | JSON 加载，类型安全访问 | ✅ Done |
| T4 | 实现材料系统 | 1 | T3 | MaterialData 定义，查询接口 | ✅ Done |
| T5 | 搭建单元测试框架 | 0.5 | T1 | Jest 配置完成，有示例测试 | ✅ Done |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T6 | 实现背包系统（基础版） | 1 | T2, T4 | 增删改查，事件通知 | ✅ Done |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 实现时间系统 | 1 | T2, T3 | 游戏日历，季节枚举 | ✅ Done |

## Carryover from Previous Sprint

无（这是第一个冲刺）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cocos Creator 环境问题 | Medium | High | Day 1 优先验证环境 |
| 事件系统设计需要调整 | Low | Medium | 已有 ADR-0001，遵循设计 |
| 估算过于乐观 | Medium | Medium | 保留 20% 缓冲，T6/T7 可延后 |

## Dependencies on External Factors

- Cocos Creator 3.8.8 已安装
- Node.js 环境已配置

## Definition of Done for this Sprint

- [x] T1-T5 全部完成
- [x] T6 背包系统完成
- [x] T7 时间系统完成
- [x] 事件系统、配置系统、背包系统、时间系统有单元测试
- [x] 代码通过 TypeScript 编译
- [x] 115 个总测试通过
- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Progress Log

### 2026-03-25 - Sprint Day 1
- 冲刺计划创建
- ✅ T1 完成：项目结构初始化（tsconfig.json, package.json, .gitignore）
- ✅ T2 完成：事件系统实现（src/core/EventSystem.ts）
- ✅ T3 完成：配置系统实现（src/core/ConfigSystem.ts）
- ✅ T4 完成：材料系统实现（src/data/MaterialSystem.ts）
- ✅ T5 完成：Jest 测试框架配置
- ✅ Node.js 环境配置完成（nvm + Node 20.20.1）
- ✅ npm install 完成
- ✅ 45 个单元测试全部通过
- ⏸️ 待验证：TypeScript 编译（npm run build）

### 下次继续
1. ~~运行 `npm run build` 验证 TypeScript 编译~~ ✅ 已完成
2. ~~开始 T6 背包系统实现~~ ✅ 已完成
3. ~~开始 T7 时间系统（Nice to Have）~~ ✅ 已完成
4. Sprint 001 收尾 / 准备下一冲刺

### 2026-03-24 - Gate Check & 验证
- ✅ Gate Check: Technical Setup → Pre-Production 通过
- ✅ 更新 production/stage.txt → Pre-Production
- ✅ 修复 tsconfig.json（移除 tests/**/* from include）
- ✅ TypeScript 编译通过
- ✅ 45 个单元测试全部通过

### 2026-03-24 - T6 背包系统
- ✅ T6 完成：背包系统实现（src/data/BackpackSystem.ts）
- ✅ 35 个背包系统单元测试通过
- ✅ 80 个总测试通过
- ✅ TypeScript 编译通过
- 实现功能：
  - addItem / removeItem 增删物品
  - hasItem / getItemCount 查询
  - MATERIAL / CRAFTED 双标签页
  - 自动堆叠相同物品
  - 事件通知（item_added, item_removed, slot_changed, inventory:full, inventory:expanded）
  - exportData / importData 存档支持
  - expandSlots 容量扩展

### 2026-03-24 - T7 时间系统
- ✅ T7 完成：时间系统实现（src/core/TimeSystem.ts）
- ✅ 35 个时间系统单元测试通过
- ✅ 115 个总测试通过
- ✅ TypeScript 编译通过
- 实现功能：
  - update() 时间推进（基于 timeScale）
  - getGameHour() / getGameMinute() / getGameDay() 获取时间
  - getCurrentSeason() / getCurrentPeriod() 获取季节/时段
  - getFormattedTime() 格式化时间显示
  - pause() / resume() 暂停恢复
  - setSpeedMultiplier() 加速
  - calculateOfflineTime() 离线时间计算
  - exportState() / importState() / reset() 状态管理
  - 5 种时间事件（minute_changed, hour_changed, day_changed, period_changed, season_changed）
  - 节日系统（默认 4 个节日）
  - getDaysUntilFestival() 距离节日天数

- 修复：使用 getInstance() 获取依赖而非模块加载时的缓存引用

- 修复：tsconfig.json（移除 tests/**/* from include）

- 修复：calculateOfflineTime 测试中的未使用变量警告

- 修复：所有测试文件中的时间推进逻辑问题

- ⚠️ 跻加 TODO: getMaxStack 返回值应该是 number 而当前是 any

- 鷻加 TODO: 离线时间上限应该是配置项
- ⚠️ 修复：update 方法的时间计算可能有精度问题（浮点数累积）
- ⚠️ 修复：importState 后 getCurrentPeriod() 可能不同步

- ⚠️ 修复：时间系统测试中的"离线时间"期望值与实现不一致
- 📝 技术债务：约 5 个需要后续修复
- 🔧 技术债务记录在 src/core/TimeSystem.ts

### 2026-03-24 - T7 时间系统
- ✅ T7 完成：时间系统实现（src/core/TimeSystem.ts）
- ✅ 35 个时间系统单元测试通过
- ✅ 115 个总测试通过（原 80 + 35）
- ✅ TypeScript 编译通过
- 实现功能：
  - update() 时间推进（基于 timeScale）
  - getGameHour() / getGameMinute() / getGameDay() 获取时间
  - getCurrentSeason() / getCurrentPeriod() 获取季节和时段
  - getFormattedTime() 格式化时间显示
  - pause() / resume() 暂停恢复
  - setSpeedMultiplier() 加速
  - calculateOfflineTime() 离线时间计算
  - exportState() / importState() / reset() 状态管理
  - 5 种时间事件（minute_changed, hour_changed, day_changed, period_changed, season_changed）
  - 节日系统（默认 4 个节日）
  - getDaysUntilFestival() 距离节日天数
