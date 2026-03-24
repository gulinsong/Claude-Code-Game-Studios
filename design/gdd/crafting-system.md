# 手工艺系统 (Crafting System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 3: 手艺的温度 — 制作不是点击按钮，是一次小小的仪式

## Overview

手工艺系统是《岁时记》的**核心玩法**，让玩家通过迷你游戏制作节日物品。制作过程不是简单的"点击完成"，而是有节奏、有操作、有仪式感的互动体验——包粽子要折叠、扎绳；做月饼要揉面、包馅、压模。

手工艺采用**配方驱动 + 迷你游戏**模式——玩家选择食谱，确认材料，进入制作迷你游戏，完成后获得物品。迷你游戏难度适中，失败不会损失材料，只会重新开始。熟练度提升可以提高制作效率和品质。

玩家**直接与手工艺系统交互**——这是游戏最核心的玩法循环。制作的手感、节奏、反馈直接决定游戏的"温度感"。

此系统主要支撑 **Pillar 3: 手艺的温度** —— 让制作成为一次小小的仪式，有动作、有节奏、有成果。

## Player Fantasy

**直接体验**：
- **仪式感**：按照传统步骤制作，感受手艺的温度
- **参与感**：不是自动完成，而是亲手操作
- **成就感**：完成制作看到成品，满足感油然而生
- **熟练感**：越做越熟练，操作更流畅

**迷你游戏情感设计**：

| Stage | Player Feeling | Duration |
|-------|---------------|----------|
| **备料** | 期待，准备开始 | 2-3秒 |
| **操作** | 专注，享受节奏 | 10-20秒 |
| **完成** | 满足，欣赏成果 | 3-5秒 |

**设计原则**：
- 操作简单但有节奏感
- 失败不惩罚，鼓励尝试
- 熟练后有成就感
- 每种手艺有独特操作

## Detailed Design

### Core Rules

1. **制作流程**

```
1. 选择食谱（从已解锁的食谱中选择）
2. 确认材料（检查背包，显示所需材料）
3. 消耗材料（扣除背包中的材料）
4. 进入迷你游戏（根据手艺类型加载对应游戏）
5. 完成迷你游戏（成功/重试）
6. 消耗体力
7. 产出物品（添加到背包）
8. 累计制作次数
9. 发布事件
```

2. **迷你游戏类型**

| 类型 | 手艺示例 | 核心操作 | 难度 |
|------|---------|---------|------|
| **揉捏类** | 月饼、汤圆 | 点击节奏、滑动轨迹 | 低 |
| **折叠类** | 粽子、饺子 | 拖拽折叠、点击固定 | 中 |
| **剪裁类** | 剪纸、窗花 | 沿线滑动、点击切除 | 中 |
| **组装类** | 灯笼、风筝 | 拖拽组装、点击固定 | 中 |
| **调配类** | 年糕、酱料 | 点击添加、滑动混合 | 低 |

3. **迷你游戏设计示例：做月饼**

```
阶段1：揉面（3秒）
- 操作：快速点击屏幕
- 目标：进度条满
- 反馈：面团逐渐光滑

阶段2：包馅（5秒）
- 操作：拖拽馅料到面皮中心，点击包裹
- 目标：准确放置
- 反馈：面皮包裹馅料

阶段3：压模（4秒）
- 操作：选择模具，点击压下
- 目标：选择正确的模具图案
- 反馈：月饼成型，显示图案

阶段4：烘烤（等待）
- 操作：无，观看动画
- 时长：3秒
- 反馈：月饼逐渐变金黄
```

4. **熟练度系统**

| 等级 | 制作次数 | 效果 |
|------|---------|------|
| 新手 | 0-4 | 正常速度 |
| 入门 | 5-9 | 迷你游戏时间 -10% |
| 熟练 | 10-19 | 迷你游戏时间 -20%，成功率 +5% |
| 精通 | 20+ | 迷你游戏时间 -30%，成功率 +10%，有概率产出高品质 |

5. **失败处理**
- 迷你游戏失败不消耗材料
- 可无限重试
- 提供"跳过"选项（产出普通品质，不计入熟练度）

### States and Transitions

**制作流程状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **SelectRecipe** | 开始制作 | 选择食谱 | 显示可制作食谱列表 |
| **ConfirmMaterials** | 选择食谱 | 确认材料 | 显示所需材料，检查背包 |
| **Playing** | 确认材料 | 完成迷你游戏 | 运行迷你游戏 |
| **Success** | 迷你游戏成功 | 动画结束 | 显示产出，添加到背包 |
| **Retry** | 迷你游戏失败 | 选择重试 | 返回迷你游戏开始 |
| **Skip** | 选择跳过 | 动画结束 | 产出普通品质 |

**状态转换图**：
```
SelectRecipe → ConfirmMaterials → Playing → Success
                     ↑                ↓
                     └──── Retry ←───┘
                            ↓
                         Skip → Success(普通)
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **食谱系统** | 读取食谱 | 食谱 → 手工艺 | 获取配方数据 |
| **背包系统** | 消耗/添加 | 手工艺 ↔ 背包 | 消耗材料，添加成品 |
| **体力系统** | 消耗体力 | 手工艺 → 体力 | 制作完成时扣除体力 |
| **事件系统** | 发布事件 | 手工艺 → 事件 | 发布制作事件 |
| **UI框架系统** | 提供数据 | 手工艺 → UI | 显示迷你游戏界面 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `craft:started` | `{ recipeId, recipeName }` | 开始制作 |
| `craft:completed` | `{ recipeId, outputItem, quality }` | 制作完成 |
| `craft:failed` | `{ recipeId, stage }` | 迷你游戏失败 |
| `craft:skipped` | `{ recipeId }` | 跳过迷你游戏 |
| `craft:mastery_up` | `{ recipeId, newLevel }` | 熟练度提升 |

## Formulas

### 1. 熟练度等级计算

```
masteryLevel = floor(craftCount / 5) + 1
masteryLevel = min(masteryLevel, 4)  // 最高4级
```

| craftCount | masteryLevel | 名称 |
|------------|--------------|------|
| 0-4 | 1 | 新手 |
| 5-9 | 2 | 入门 |
| 10-19 | 3 | 熟练 |
| 20+ | 4 | 精通 |

### 2. 时间减免

```
timeReduction = masteryLevel × 0.1  // 每级-10%
actualGameTime = baseGameTime × (1 - timeReduction)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseGameTime | int | 15-30s | config | 基础迷你游戏时长 |
| timeReduction | float | 0-0.3 | computed | 时间减免比例 |
| actualGameTime | float | 10-30s | computed | 实际时长 |

### 3. 高品质产出概率

```
qualityChance = baseChance + (masteryLevel - 1) × 0.05
if (random() < qualityChance):
    outputItem = recipe.output.itemIdQuality
else:
    outputItem = recipe.output.itemId
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseChance | float | 0.1 | config | 基础高品质概率 |
| qualityChance | float | 0.1-0.25 | computed | 实际概率 |

### 4. 成功率加成

```
successRateBonus = (masteryLevel - 1) × 0.05
```

| masteryLevel | successRateBonus |
|--------------|-----------------|
| 1 (新手) | 0% |
| 2 (入门) | 0% |
| 3 (熟练) | +5% |
| 4 (精通) | +10% |

**Expected output range**:
- 迷你游戏时长：10-30秒
- 单次制作总时长：20-45秒（含动画）
- 高品质产出：10-25%

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 材料不足 | 阻止制作，显示缺少的材料 | 引导收集材料 |
| 体力不足 | 阻止制作，显示体力不足提示 | 温和引导 |
| 迷你游戏失败 | 显示"再试一次"，可重试或跳过 | 不惩罚，鼓励尝试 |
| 中途退出 | 材料已消耗，记录为未完成 | 防止刷熟练度 |
| 背包已满 | 产出物品溢出，显示提示 | 温和提醒 |
| 熟练度满级 | 继续累计次数，不再升级 | 保持上限 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **食谱系统** | Hard | `getRecipeById(id)` | ✅ Designed |
| **背包系统** | Hard | `removeItem()`, `addItem()` | ✅ Designed |
| **体力系统** | Hard | `consumeStamina(amount)` | ✅ Designed |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **节日筹备系统** | Hard | 完成制作任务 | Not Started |
| **任务系统** | Soft | 制作计数 | Not Started |
| **收集系统** | Soft | 制作品质记录 | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **迷你游戏基础时长** | 20s | 10-40s | 更长的制作体验 | 更快的制作节奏 |
| **熟练度升级间隔** | 5次 | 3-10次 | 更慢的熟练度提升 | 更快的熟练度提升 |
| **时间减免上限** | 30% | 10-50% | 更大的熟练优势 | 更小的熟练优势 |
| **高品质基础概率** | 10% | 5-20% | 更容易获得高品质 | 更稀有的高品质 |
| **跳过惩罚** | 普通品质 | 无产出/材料损失 | 更强的跳过惩罚 | 更宽松的跳过 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **材料展示** | 动画展示投入的材料 |
| **操作提示** | 清晰的手势/点击提示 |
| **进度反馈** | 实时进度条和动画 |
| **完成动画** | 成品展示，品质标识 |
| **熟练度徽章** | 显示当前熟练等级 |

### 迷你游戏视觉风格

- 中国传统美学
- 温暖的手绘风格
- 柔和的色彩
- 流畅的动画过渡

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `craft_start` | 开始制作 |
| `craft_action` | 每次操作 |
| `craft_success` | 阶段成功 |
| `craft_fail` | 操作失败 |
| `craft_complete` | 制作完成 |
| `craft_quality` | 高品质产出 |
| `craft_mastery` | 熟练度提升 |

## UI Requirements

### 选择食谱界面

```
┌─────────────────────────────────┐
│        选择要制作的物品          │
├─────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │月饼 │ │粽子 │ │汤圆 │       │
│  │ ★★☆│ │ ★☆☆│ │ ★★☆│       │
│  │可制作│ │缺材料│ │可制作│       │
│  └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
```

### 确认材料界面

```
┌─────────────────────────────────┐
│  制作：月饼 x3                   │
├─────────────────────────────────┤
│  所需材料：                      │
│  ✓ 面粉 x2                       │
│  ✓ 红豆沙 x1                     │
│  ✓ 蛋黄 x1                       │
│                                 │
│  消耗体力：10                    │
│  预计时间：20秒                  │
│                                 │
│  [确认制作]        [取消]       │
└─────────────────────────────────┘
```

### 迷你游戏界面

```
┌─────────────────────────────────┐
│  阶段 2/4: 包馅                  │
│  ████████░░░░░░ 60%             │
├─────────────────────────────────┤
│                                 │
│      [面皮和馅料显示区域]        │
│                                 │
│  💡 拖拽馅料到面皮中心           │
│                                 │
├─────────────────────────────────┤
│  [跳过] (产出普通品质)          │
└─────────────────────────────────┘
```

### 完成界面

```
┌─────────────────────────────────┐
│        制作完成！                │
│                                 │
│       🥮 ✨                      │
│      高品质月饼 x3               │
│                                 │
│   熟练度: 入门 → 熟练            │
│                                 │
│          [确定]                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 选择食谱正确显示可制作状态
- [ ] 材料不足时正确阻止制作
- [ ] 迷你游戏正确加载和运行
- [ ] 完成迷你游戏正确产出物品
- [ ] 失败后可重试
- [ ] 跳过产出普通品质
- [ ] 熟练度正确累计和升级
- [ ] 高品质产出概率正确

**事件测试**:
- [ ] 开始制作时发布 `craft:started`
- [ ] 完成制作时发布 `craft:completed`
- [ ] 熟练度提升时发布 `craft:mastery_up`

**UI测试**:
- [ ] 迷你游戏操作提示清晰
- [ ] 进度反馈准确
- [ ] 完成动画流畅

**性能测试**:
- [ ] 迷你游戏帧率 ≥ 60fps
- [ ] 无卡顿

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要制作动画可跳过？ | 设计者 | MVP阶段 | 是，跳过产出普通品质 |
| 迷你游戏难度是否可调节？ | 设计者 | Alpha阶段 | 暂不支持 |
| 是否支持批量制作？ | 设计者 | Beta阶段 | 不支持，保持仪式感 |

## Implementation Notes

```typescript
enum CraftingStage {
    SELECT_RECIPE = 'SELECT_RECIPE',
    CONFIRM_MATERIALS = 'CONFIRM_MATERIALS',
    PLAYING = 'PLAYING',
    SUCCESS = 'SUCCESS',
    RETRY = 'RETRY'
}

enum Quality {
    NORMAL = 'NORMAL',
    HIGH = 'HIGH'
}

interface CraftingSession {
    recipeId: string;
    stage: CraftingStage;
    currentMiniGameStage: number;
    totalMiniGameStages: number;
    startTime: number;
}

interface CraftingProgress {
    recipeId: string;
    craftCount: number;
    masteryLevel: number;
}

interface MiniGameResult {
    success: boolean;
    quality: Quality;
    skipped: boolean;
}

class CraftingManager {
    private recipes: RecipeManager;
    private backpack: BackpackManager;
    private stamina: StaminaManager;
    private eventSystem: EventSystem;
    private progress: Map<string, CraftingProgress>;

    startCrafting(recipeId: string): boolean;
    confirmMaterials(): boolean;
    playMiniGame(): MiniGameResult;
    retryMiniGame(): void;
    skipMiniGame(): MiniGameResult;
    completeCrafting(result: MiniGameResult): void;
    getMasteryLevel(recipeId: string): number;
}
```