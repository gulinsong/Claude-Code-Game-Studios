# ADR-0013: 食谱系统 (Recipe System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要一个食谱系统来定义所有可制作物品的配方。食谱包含输入材料、输出物品、制作时间、文化背景等信息，是手工艺系统的核心数据来源。

### Constraints
- **数据驱动**: 所有食谱定义必须来自外部配置
- **品质系统**: 支持高品质输出（使用可选材料时）
- **文化深度**: 每个食谱有文化背景故事
- **解锁机制**: 食谱需要通过任务/事件解锁

### Requirements
- 定义输入材料（必需和可选）
- 定义输出物品（普通和高品质）
- 支持稀有度分类
- 支持制作时间配置
- 支持解锁条件
- 追踪已解锁食谱（存档）

## Decision

采用**配置驱动 + 解锁追踪**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                       RecipeSystem                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ RecipeRegistry  │  │ UnlockedRecipes                     │  │
│  │ (所有食谱定义)   │  │ Set<string> (已解锁食谱ID)          │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Query Methods:                                                 │
│  - getRecipe(id) → Recipe                                       │
│  - getUnlockedRecipes() → Recipe[]                              │
│  - canCraft(recipeId, backpack) → boolean                       │
│  - getMissingMaterials(recipeId, backpack) → InputItem[]        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
/**
 * 食谱稀有度
 */
enum RecipeRarity {
    COMMON = 'COMMON',
    RARE = 'RARE',
    LEGENDARY = 'LEGENDARY'
}

/**
 * 食谱分类
 */
enum RecipeCategory {
    FOOD = 'FOOD',           // 食物（月饼、粽子等）
    DECORATION = 'DECORATION', // 装饰品（灯笼等）
    TOOL = 'TOOL'            // 工具
}

/**
 * 输入材料
 */
interface InputItem {
    materialId: string;
    amount: number;
    optional: boolean;  // 可选材料影响品质
}

/**
 * 输出物品
 */
interface OutputItem {
    itemId: string;
    amount: number;
    itemIdQuality?: string;  // 高品质版本
}

/**
 * 食谱数据
 */
interface Recipe {
    id: string;
    name: string;
    description: string;
    lore: string;            // 文化背景故事
    rarity: RecipeRarity;
    category: RecipeCategory;
    inputs: InputItem[];
    output: OutputItem;
    craftTime: number;       // 制作时间（秒）
    unlockCondition: string; // 解锁条件描述
}
```

### 配置示例

```json
{
  "recipes": [
    {
      "id": "mooncake",
      "name": "月饼",
      "description": "中秋节的传统美食，象征着团圆。",
      "lore": "月饼始于唐代，相传是唐高祖李渊与群臣欢度中秋时...",
      "rarity": "COMMON",
      "category": "FOOD",
      "inputs": [
        { "materialId": "flour", "amount": 2, "optional": false },
        { "materialId": "lotus_seed", "amount": 1, "optional": false },
        { "materialId": "egg_yolk", "amount": 1, "optional": true }
      ],
      "output": {
        "itemId": "mooncake",
        "amount": 1,
        "itemIdQuality": "mooncake_premium"
      },
      "craftTime": 30,
      "unlockCondition": "完成中秋准备任务"
    }
  ]
}
```

## Alternatives Considered

### 1. 简单输入输出映射
**方案**: 只存储 `{ inputs: [...], output: {...} }`，无额外元数据。

**优点**: 极简。

**缺点**:
- 无法支持品质系统
- 无文化背景
- 无分类和稀有度

**结论**: 不采用，缺少游戏需要的元数据。

### 2. 嵌套配方树
**方案**: 配方可以包含子配方，形成制作树。

**优点**: 支持复杂制作链。

**缺点**:
- 增加复杂度
- 当前游戏不需要复杂制作链

**结论**: 暂不采用，保持简单。

## Consequences

### Positive
- **文化深度**: 每个食谱有文化背景故事
- **品质系统**: 可选材料提供品质提升
- **数据驱动**: 食谱完全可配置
- **解锁追踪**: 存档支持食谱解锁状态

### Negative
- **配置复杂度**: 每个食谱需要详细配置
- **品质逻辑**: 需要在 CraftingSystem 中处理品质判定

### Risks
- **配置一致性**: 输入材料 ID 必须在 MaterialSystem 中存在

## Implementation Notes

### 解锁检查

```typescript
class RecipeSystem {
    private unlockedRecipes: Set<string> = new Set();

    unlock(recipeId: string): boolean {
        const recipe = this.getRecipe(recipeId);
        if (!recipe) return false;

        this.unlockedRecipes.add(recipeId);
        this.eventSystem.emit(RecipeEvents.UNLOCKED, { recipeId });
        return true;
    }

    isUnlocked(recipeId: string): boolean {
        return this.unlockedRecipes.has(recipeId);
    }
}
```

### 材料检查

```typescript
canCraft(recipeId: string, backpack: BackpackSystem): boolean {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return false;

    return recipe.inputs
        .filter(input => !input.optional)
        .every(input =>
            backpack.getItemCount(input.materialId) >= input.amount
        );
}

getMissingMaterials(recipeId: string, backpack: BackpackSystem): InputItem[] {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return [];

    return recipe.inputs
        .filter(input => !input.optional)
        .filter(input =>
            backpack.getItemCount(input.materialId) < input.amount
        );
}
```

### 存档数据

```typescript
interface RecipeSaveData {
    unlockedRecipes: string[];
}

// 保存
toSaveData(): RecipeSaveData {
    return {
        unlockedRecipes: Array.from(this.unlockedRecipes)
    };
}

// 加载
fromSaveData(data: RecipeSaveData): void {
    this.unlockedRecipes = new Set(data.unlockedRecipes);
}
```

## Related Systems

- **EventSystem**: 食谱解锁事件
- **MaterialSystem**: 输入材料定义
- **BackpackSystem**: 材料检查和消耗
- **CraftingSystem**: 使用食谱进行制作
- **QuestSystem**: 食谱解锁奖励
- **DialogueSystem**: 食谱解锁效果
