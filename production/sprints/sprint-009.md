# Sprint 9 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现云存档系统** — 数据持久化层，实现跨设备同步游戏进度。

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
| T1 | CloudSaveSystem 核心逻辑 | 1.5 | Sprint 008 | 存档、读档、同步逻辑 | ✅ Complete |
| T2 | CloudSaveSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ✅ Complete |
| T3 | 数据收集与恢复 | 1 | T1 | 收集各系统数据、恢复各系统状态 | ✅ Complete |
| T4 | 存档冲突处理 | 0.5 | T1 | 时间戳比较、用户选择 | ✅ Complete |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 自动存档 | 0.5 | T1 | 定时自动存档 | ✅ Complete |
| T6 | 版本迁移 | 0.5 | T1 | 旧版本存档迁移 | ✅ Complete |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 云存档系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 系统数据收集复杂 | Medium | Medium | 使用接口抽象，逐系统集成 |
| 存档冲突逻辑复杂 | Medium | Medium | 清晰的时间戳比较策略 |

## Dependencies on External Factors

- 微信云开发 API（需要抽象层）
- 各游戏系统（已实现）- 数据导出/导入接口

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] CloudSaveSystem 单元测试通过（38 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（523 个测试）
- [x] 存档正确保存
- [x] 读档正确恢复
- [x] 冲突正确处理

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：CloudSaveSystem 核心逻辑实现（src/platform/CloudSaveSystem.ts）
  - 存档、读档、同步逻辑
  - 4 种状态：IDLE, SAVING, LOADING, CONFLICT
  - 云存储和本地存储抽象接口
- ✅ T2 完成：38 个单元测试全部通过
- ✅ T3 完成：数据收集与恢复
  - 收集各系统数据：inventory, time, stamina, quest, villager, festival, recipe, auth, settings
  - 恢复各系统状态
- ✅ T4 完成：存档冲突处理
  - 时间戳比较（5分钟阈值）
  - 冲突信息获取和解决
- ✅ T5 完成：自动存档
  - startAutoSave() / stopAutoSave()
  - 60秒间隔自动存档
- ✅ T6 完成：版本迁移
  - 存档版本号管理
  - 版本兼容性检查
- ✅ 所有测试通过：523 个测试（16 个测试套件）

### Sprint 009 完成 ✅

---

## Technical Notes

### 存档数据结构

```typescript
interface SaveData {
    version: string;
    timestamp: number;
    playerData: PlayerData;
    inventoryData: InventoryData;
    timeData: TimeData;
    staminaData: StaminaData;
    questData: QuestData;
    villagerData: VillagerData;
    festivalData: FestivalData;
    recipeData: RecipeData;
    settings: GameSettings;
}
```

### 存档类型

| 类型 | 触发条件 |
|------|---------|
| auto | 定时、事件触发 |
| manual | 玩家手动 |
| exit | 退出游戏 |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `save:started` | `{ type }` |
| `save:completed` | `{ timestamp, size }` |
| `save:failed` | `{ error }` |
| `load:started` | `{ }` |
| `load:completed` | `{ timestamp }` |
| `load:failed` | `{ error }` |
| `sync:conflict` | `{ localTime, cloudTime }` |
