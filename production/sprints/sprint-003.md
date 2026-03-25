# Sprint 3 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现手工艺系统** — 游戏的核心玩法循环。让玩家通过迷你游戏制作节日物品，体验"手艺的温度"。

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
| T1 | CraftingSystem 核心逻辑 | 1.5 | Sprint 002 | 流程状态机、熟练度计算、事件发布 | ⬜ Pending |
| T2 | CraftingSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ⬜ Pending |
| T3 | 迷你游戏框架 | 1 | T1 | MiniGame 基类、阶段管理、结果计算 | ⬜ Pending |
| T4 | 月饼迷你游戏实现 | 1 | T3 | 揉面→包馅→压模→烘烤 四阶段 | ⬜ Pending |
| T5 | 迷你游戏测试 | 0.5 | T4 | 迷你游戏逻辑测试 | ⬜ Pending |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T6 | 熟练度系统集成 | 0.5 | T1, T2 | 制作次数累计、等级提升、效果生效 | ⬜ Pending |
| T7 | 高品质产出逻辑 | 0.5 | T1 | 概率计算、品质标识 | ⬜ Pending |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T8 | 第二种迷你游戏（粽子） | 1 | T4 | 折叠类操作实现 | ⬜ Pending |
| T9 | 手工艺系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 迷你游戏复杂度超预期 | Medium | High | 先实现简化版，后续迭代 |
| 熟练度与时间减免计算复杂 | Low | Medium | 参考 GDD 公式，增量实现 |
| 迷你游戏可玩性需调优 | High | Medium | 先跑通流程，调优留到 Polish 阶段 |

## Dependencies on External Factors

- Cocos Creator 3.8.8 已安装（UI 实现需要）
- Node.js 环境已配置

## Definition of Done for this Sprint

- [x] T1-T5 全部完成（核心逻辑 + 迷你游戏框架 + 月饼游戏）
- [x] CraftingSystem 单元测试通过
- [x] 迷你游戏测试通过
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（270 个测试）
- [x] 熟练度系统正确工作
- [x] 高品质产出概率正确
- [ ] Web 预览可运行（可选 - 需要 Cocos Creator 环境）

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：CraftingSystem 核心逻辑实现（src/gameplay/CraftingSystem.ts）
  - 状态机：SelectRecipe → ConfirmMaterials → Playing → Success/Retry
  - 熟练度系统：NOVICE → APPRENTICE → SKILLED → MASTER
  - 时间减免：每级 10%，最高 30%
  - 高品质概率：基础 10% + 每级 5%
  - 事件发布：started, completed, failed, skipped, mastery_up
- ✅ T2 完成：38 个单元测试全部通过
- ✅ T3 完成：迷你游戏框架（src/gameplay/MiniGameBase.ts）
  - 抽象基类 MiniGameBase
  - 阶段管理：STARTED, PLAYING, PAUSED, SUCCESS, FAILED
  - 操作类型：TAP, SWIPE, HOLD, DRAG_DROP, SEQUENCE, WAIT
  - 事件系统：started, stage_started, stage_completed, progress_updated, completed
- ✅ T4 完成：月饼迷你游戏实现（src/gameplay/MiniGameMooncake.ts）
  - 4 个阶段：揉面 → 包馅 → 压模 → 烘烤
  - 模具系统：ROUND, FLOWER, FISH, HAPPINESS
  - 评分系统：根据准确度和速度计算
- ✅ T5 完成：迷你游戏测试（tests/gameplay/MiniGame.test.ts）
  - 31 个测试全部通过
- ✅ 所有测试通过：270 个测试（10 个测试套件）

### Sprint 003 完成 ✅

可以开始规划 Sprint 004（对话系统或继续完善手工艺系统）。

---

## Technical Notes

### CraftingSystem 核心接口设计

```typescript
// 状态机
enum CraftingStage {
    SELECT_RECIPE = 'SELECT_RECIPE',
    CONFIRM_MATERIALS = 'CONFIRM_MATERIALS',
    PLAYING = 'PLAYING',
    SUCCESS = 'SUCCESS',
    RETRY = 'RETRY'
}

// 品质
enum Quality {
    NORMAL = 'NORMAL',
    HIGH = 'HIGH'
}

// 制作会话
interface CraftingSession {
    recipeId: string;
    stage: CraftingStage;
    currentMiniGameStage: number;
    totalMiniGameStages: number;
    startTime: number;
}

// 熟练度进度
interface CraftingProgress {
    recipeId: string;
    craftCount: number;
    masteryLevel: number;
}

// 迷你游戏结果
interface MiniGameResult {
    success: boolean;
    quality: Quality;
    skipped: boolean;
}
```

### 迷你游戏类型

| 类型 | 示例 | 核心操作 | Sprint |
|------|------|---------|--------|
| 揉捏类 | 月饼、汤圆 | 点击节奏、滑动轨迹 | 003 |
| 折叠类 | 粽子、饺子 | 拖拽折叠、点击固定 | 003 (Nice to Have) |

### 事件定义

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `craft:started` | `{ recipeId, recipeName }` | 开始制作 |
| `craft:completed` | `{ recipeId, outputItem, quality }` | 制作完成 |
| `craft:failed` | `{ recipeId }` | 迷你游戏失败 |
| `craft:skipped` | `{ recipeId }` | 跳过迷你游戏 |
| `craft:mastery_up` | `{ recipeId, newLevel }` | 熟练度提升 |

### 公式参考

```
// 熟练度等级
masteryLevel = floor(craftCount / 5) + 1
masteryLevel = min(masteryLevel, 4)

// 时间减免
timeReduction = masteryLevel × 0.1
actualGameTime = baseGameTime × (1 - timeReduction)

// 高品质概率
qualityChance = 0.1 + (masteryLevel - 1) × 0.05

// 成功率加成
successRateBonus = (masteryLevel - 1) × 0.05
```
