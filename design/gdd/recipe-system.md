# 食谱系统 (Recipe System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 3: 手艺的温度 — 每个食谱有来源故事

## Overview

食谱系统是《岁时记》的**配方管理中心**，定义了所有可制作物品的配方。每个食谱包含：输入材料、输出物品、制作时间、文化背景故事。玩家通过探索、任务、NPC赠送获得新食谱。

食谱系统从**配置系统**读取食谱定义，为**手工艺系统**提供配方数据。玩家通过**收集系统**追踪已解锁的食谱。

玩家**间接与食谱系统交互**——通过手工艺界面查看可制作的物品，看到食谱的文化背景故事。食谱系统让"制作"不只是"消耗A得到B"，而是"学习一道传统手艺"。

此系统主要支撑 **Pillar 3: 手艺的温度** 和 **Pillar 4: 发现民间之美** —— 每个食谱都有文化背景，学习食谱就是学习传统文化。

## Player Fantasy

**直接体验**：
- **学习感**：获得新食谱时像学到了一项新技能，有成就感
- **探索动力**：想知道还有什么食谱没解锁，主动探索和与NPC互动
- **文化发现**：阅读食谱的背景故事，了解传统手艺的文化内涵
- **仪式感**：按照食谱"备料-制作-完成"的过程有仪式感

**食谱稀有度情感设计**：

| Rarity | Player Feeling | Example |
|--------|---------------|---------|
| **普通** | 基础技能，日常制作 | 做月饼、包粽子 |
| **稀有** | 需要探索或任务获得，珍贵 | 特殊节日限定食谱 |
| **传说** | 极其珍贵，有特殊故事 | 传承百年的秘方 |

此系统主要支撑 **Pillar 3: 手艺的温度** —— 制作不是点击按钮，是一次小小的文化学习。

## Detailed Design

### Core Rules

1. **食谱核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符 |
| `name` | string | 显示名称 |
| `description` | string | 简短描述 |
| `lore` | string | 文化背景故事 |
| `rarity` | enum | 稀有度：COMMON / RARE / LEGENDARY |
| `category` | enum | 分类：FOOD / DECORATION / TOOL |
| `inputs` | InputItem[] | 输入材料列表 |
| `output` | OutputItem | 输出物品 |
| `craftTime` | int | 制作时间（秒） |
| `unlockCondition` | string | 解锁条件描述 |

2. **输入材料结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `materialId` | string | 材料ID |
| `amount` | int | 所需数量 |
| `optional` | boolean | 是否可选（可选材料影响品质） |

3. **输出物品结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `itemId` | string | 输出物品ID |
| `amount` | int | 输出数量 |
| `itemIdQuality` | string | 高品质输出物品ID（使用可选材料时） |

4. **食谱分类**

| Category | Description | Examples |
|----------|-------------|----------|
| **FOOD** | 节日食品 | 月饼、粽子、汤圆、年糕 |
| **DECORATION** | 节日装饰 | 灯笼、剪纸、对联 |
| **TOOL** | 制作工具 | 模具、竹篮 |

5. **解锁规则**
- 初始解锁：3-5 个基础食谱
- 探索解锁：在特定地点发现食谱
- 任务解锁：完成 NPC 请求后获得
- 节日解锁：参与节日活动获得限定食谱

### States and Transitions

**单个食谱的解锁状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Locked** | 默认 | 满足解锁条件 | 食谱不可见或显示为"???" |
| **Unlocked** | 满足解锁条件 | 永久 | 食谱可见，可制作 |
| **Mastered** | 制作 10 次 | 永久 | 显示"已精通"徽章 |

**食谱系统状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Uninitialized** | 系统启动 | 配置加载完成 | 食谱数据不可用 |
| **Ready** | 配置加载完成 | 系统销毁 | 响应查询请求 |

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **配置系统** | 读取配置 | 配置 → 食谱 | 获取食谱定义 |
| **材料系统** | 查询材料 | 食谱 → 材料 | 获取输入材料的信息 |
| **手工艺系统** | 提供食谱 | 食谱 → 手工艺 | 提供配方数据供制作 |
| **背包系统** | 查询拥有 | 食谱 → 背包 | 检查是否有足够材料 |
| **收集系统** | 同步解锁 | 食谱 ↔ 收集 | 追踪已解锁食谱 |
| **任务系统** | 奖励解锁 | 任务 → 食谱 | 任务完成时解锁食谱 |
| **事件系统** | 发布事件 | 食谱 → 事件 | 食谱解锁时发布事件 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `recipe:unlocked` | `{ recipeId, recipeName }` | 解锁新食谱 |
| `recipe:mastered` | `{ recipeId, craftCount }` | 精通食谱 |

## Formulas

### 1. 可制作判断

```
canCraft = all(input.materialId satisfies backpack.hasItem(materialId, amount))
```

### 2. 制作次数统计

```
craftCount[recipeId] = craftCount[recipeId] + 1
isMastered = craftCount[recipeId] >= 10
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| craftCount | int | 0-∞ | runtime | 每个食谱的制作次数 |
| isMastered | boolean | true/false | computed | 是否精通 |

### 3. 食谱完成度

```
completionRate = unlockedCount / totalRecipeCount
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| unlockedCount | int | 0-total | runtime | 已解锁食谱数 |
| totalRecipeCount | int | 30-50 | config | 总食谱数 |

**Expected output range**:
- 初始解锁：3-5 个（10-15%）
- MVP 完成度：15-20 个（50-60%）
- 全收集：30-50 个（100%）

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 查询未解锁的食谱 | 返回基础信息（名称显示为"???"），不显示详情 | 保持神秘感，激励探索 |
| 材料不足时查询可制作 | 返回 `canCraft: false`，显示缺少的材料 | 引导玩家收集 |
| 食谱配置被删除 | 保留解锁状态，制作时提示"食谱已失效" | 不丢失玩家进度 |
| 同一食谱重复解锁 | 忽略，不重复计数 | 防止重复奖励 |
| 制作次数溢出 | 使用安全整数，上限 9999 | 防止数值问题 |
| 可选材料全部使用 | 输出高品质物品 | 奖励完美准备 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **配置系统** | Hard | `getRecipeById(id)` | ✅ Designed |
| **材料系统** | Hard | `getMaterialById(id)` | ✅ Approved |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **手工艺系统** | Hard | `getRecipeById()`, `getCraftableRecipes()` | Not Started |
| **收集系统** | Hard | `getUnlockedRecipes()` | Not Started |
| **任务系统** | Soft | `unlockRecipe(recipeId)` | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **初始解锁食谱数** | 5 | 3-10 | 更容易开始制作 | 更强的探索动力 |
| **精通所需次数** | 10 | 5-20 | 更难精通 | 更容易获得徽章 |
| **单食谱材料种类** | 2-4 | 1-6 | 更复杂的制作 | 更简单的制作 |
| **总食谱数量** | 40 | 20-60 | 更多的收集内容 | 更快的完成度 |
| **稀有食谱比例** | 20% | 10-30% | 更珍贵的收集 | 更容易完成 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **食谱卡片** | 显示图标、名称、稀有度边框 |
| **未解锁状态** | 显示轮廓和"???"，保持神秘感 |
| **精通徽章** | 金色徽章，显示制作次数 |
| **材料清单** | 显示所需材料，拥有/缺少用颜色区分 |

### 稀有度视觉

| Rarity | 边框颜色 | 背景 |
|--------|---------|------|
| 普通 | #888888 | 白色 |
| 稀有 | #4A90D9 | 淡蓝 |
| 传说 | #FFD700 | 淡金 |

## UI Requirements

### 食谱列表界面

```
┌─────────────────────────────────┐
│        食 谱 图 鉴              │
│      已解锁: 15/40 (37%)        │
├─────────────────────────────────┤
│  [全部] [食品] [装饰] [工具]    │
├─────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │月饼 │ │粽子 │ │ ??? │       │
│  │ ★☆☆│ │ ★☆☆│ │ 🔒  │       │
│  └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │灯笼 │ │汤圆 │ │ ??? │       │
│  │ ★★☆│ │ ★☆☆│ │ 🔒  │       │
│  └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
```

### 食谱详情界面

```
┌─────────────────────────────────┐
│  [图标]  月饼                   │
│          ★★☆ 稀有              │
├─────────────────────────────────┤
│  "中秋佳节，月圆人团圆..."      │
│                                 │
│  【材料】                       │
│  ✓ 面粉 x2                      │
│  ✓ 红豆沙 x1                    │
│  ✗ 蛋黄 x1 (缺少)               │
│                                 │
│  【产出】                       │
│  月饼 x3                        │
│                                 │
│  【制作时间】30秒               │
│  已制作: 5次                    │
├─────────────────────────────────┤
│  [制作]           [返回]        │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] `getRecipeById(id)` 返回正确的食谱数据
- [ ] `getCraftableRecipes()` 返回当前可制作的食谱列表
- [ ] `unlockRecipe(id)` 正确解锁食谱
- [ ] 未解锁的食谱显示为"???"
- [ ] 制作次数正确累计
- [ ] 精通徽章正确显示

**事件测试**:
- [ ] 解锁食谱时发布 `recipe:unlocked`
- [ ] 精通食谱时发布 `recipe:mastered`

**UI测试**:
- [ ] 食谱列表正确显示
- [ ] 分类筛选正常
- [ ] 详情界面信息完整

**性能测试**:
- [ ] `getCraftableRecipes()` < 5ms
- [ ] 内存占用 < 10KB（40 食谱）

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要食谱升级系统？ | 设计者 | Alpha阶段 | 暂不需要 |
| 可选材料如何影响品质？ | 设计者 | MVP阶段 | 待定 |

## Implementation Notes

```typescript
enum RecipeCategory {
    FOOD = 'FOOD',
    DECORATION = 'DECORATION',
    TOOL = 'TOOL'
}

interface InputItem {
    materialId: string;
    amount: number;
    optional: boolean;
}

interface OutputItem {
    itemId: string;
    amount: number;
    itemIdQuality?: string;  // 高品质版本
}

interface Recipe {
    id: string;
    name: string;
    description: string;
    lore: string;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    category: RecipeCategory;
    inputs: InputItem[];
    output: OutputItem;
    craftTime: number;  // 秒
    unlockCondition: string;
}

interface RecipeProgress {
    recipeId: string;
    unlocked: boolean;
    craftCount: number;
    mastered: boolean;
}

class RecipeManager {
    private recipes: Map<string, Recipe>;
    private progress: Map<string, RecipeProgress>;
    private eventSystem: EventSystem;

    getRecipeById(id: string): Recipe | undefined;
    getCraftableRecipes(): Recipe[];
    unlockRecipe(id: string): boolean;
    incrementCraftCount(id: string): void;
    isUnlocked(id: string): boolean;
    isMastered(id: string): boolean;
}
```