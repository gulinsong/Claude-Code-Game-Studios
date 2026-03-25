# ADR-0012: 材料系统 (Material System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要一个统一的材料定义和管理系统。材料是游戏的核心资源，被采集系统、制作系统、背包系统等多个系统使用。需要一个数据驱动的材料定义方案。

### Constraints
- **数据驱动**: 所有材料定义必须来自外部配置
- **可扩展性**: 新材料类型应易于添加
- **季节系统**: 部分材料有季节限定
- **本地化支持**: 材料名称和描述需要支持多语言

### Requirements
- 定义材料类型（资源、食材、手工艺材料、特殊材料）
- 定义稀有度（普通、稀有、罕见、传说）
- 支持堆叠上限
- 支持季节限定
- 支持获取来源追踪

## Decision

采用**配置驱动 + 类型枚举**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      MaterialSystem                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MaterialRegistry (材料注册表)                            │   │
│  │ Map<string, MaterialData>                                │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Query Methods                                            │   │
│  │ - getMaterial(id)                                        │   │
│  │ - getByType(type)                                        │   │
│  │ - getByRarity(rarity)                                    │   │
│  │ - getBySeason(season)                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
/**
 * 材料类型
 */
enum MaterialType {
    RESOURCE = 'resource',     // 资源（花草、竹子等）
    INGREDIENT = 'ingredient', // 食材
    CRAFTING = 'crafting',     // 手工艺材料
    SPECIAL = 'special'        // 特殊材料
}

/**
 * 材料稀有度
 */
enum MaterialRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    LEGENDARY = 'legendary'
}

/**
 * 材料数据定义
 */
interface MaterialData {
    id: string;
    name: string;
    description: string;
    type: MaterialType;
    rarity: MaterialRarity;
    maxStack: number;        // 堆叠上限
    icon: string;            // 图标资源路径
    sellPrice: number;       // 售价
    sources: string[];       // 获取来源（地点ID）
    seasons?: string[];      // 季节限定（空=全年）
}
```

### 配置示例

```json
{
  "materials": [
    {
      "id": "bamboo",
      "name": "竹子",
      "description": "村后的竹林中采集的竹子，可用于制作各种手工艺品。",
      "type": "resource",
      "rarity": "common",
      "maxStack": 99,
      "icon": "textures/items/bamboo",
      "sellPrice": 5,
      "sources": ["bamboo_grove", "village_outskirts"],
      "seasons": []
    },
    {
      "id": "osmanthus",
      "name": "桂花",
      "description": "金秋时节盛开的桂花，香气扑鼻。",
      "type": "ingredient",
      "rarity": "uncommon",
      "maxStack": 50,
      "icon": "textures/items/osmanthus",
      "sellPrice": 15,
      "sources": ["village_center"],
      "seasons": ["autumn"]
    }
  ]
}
```

## Alternatives Considered

### 1. 类继承体系
**方案**: 每种材料类型一个子类（ResourceMaterial, IngredientMaterial 等）。

**优点**: 类型安全，可添加类型特有逻辑。

**缺点**:
- 增加代码复杂度
- 配置反序列化复杂
- 数据驱动程度降低

**结论**: 不采用，枚举 + 接口更简洁。

### 2. 字符串类型
**方案**: 类型和稀有度都用字符串，不定义枚举。

**优点**: 最大灵活性。

**缺点**:
- 无类型检查
- 容易拼写错误
- IDE 无法自动补全

**结论**: 不采用，枚举提供更好的类型安全。

## Consequences

### Positive
- **简单直观**: 数据结构清晰易懂
- **易于配置**: JSON 配置即可定义新材料
- **查询灵活**: 支持按类型、稀有度、季节筛选
- **类型安全**: 枚举提供编译时检查

### Negative
- **扩展性限制**: 新属性需要修改接口定义
- **无运行时验证**: 配置错误只能在运行时发现

### Risks
- **配置错误**: 无效的材料 ID 或属性值

## Implementation Notes

### 初始化

```typescript
class MaterialSystem implements IMaterialSystem {
    private materials: Map<string, MaterialData> = new Map();

    initialize(materials: MaterialData[]): void {
        this.materials.clear();
        for (const material of materials) {
            this.materials.set(material.id, material);
        }
    }

    getMaterial(materialId: string): MaterialData | undefined {
        return this.materials.get(materialId);
    }

    getByType(type: MaterialType): MaterialData[] {
        return Array.from(this.materials.values())
            .filter(m => m.type === type);
    }

    getBySeason(season: string): MaterialData[] {
        return Array.from(this.materials.values())
            .filter(m => !m.seasons || m.seasons.includes(season));
    }
}
```

### 配置加载

```typescript
// 从 ConfigSystem 加载材料配置
const materials = configSystem.get<MaterialData[]>(MATERIAL_CONFIG_KEY);
materialSystem.initialize(materials);
```

## Related Systems

- **ConfigSystem**: 材料配置加载
- **BackpackSystem**: 材料存储和管理
- **GatheringSystem**: 材料获取
- **RecipeSystem**: 食谱输入材料引用
- **CraftingSystem**: 材料消耗
