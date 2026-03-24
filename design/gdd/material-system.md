# 材料系统 (Material System)

> **Status**: Approved
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 数据层 — 游戏内容的基础

## Overview

材料系统是《岁时记》的**物品定义层**，负责管理游戏中所有可收集、可使用的材料数据。材料是游戏中最基础的物品类型，用于手工艺制作、任务交付、村民礼物等场景。

材料系统从**配置系统**读取材料定义，提供材料实例的创建、查询和验证功能。每个材料包含：唯一ID、名称、图标、稀有度、描述、文化背景、获取方式（采集、购买、节日奖励）和使用场景（手工艺原料、任务物品、礼物）。

玩家通过**采集系统**获取材料，通过**背包系统**查看和管理材料，通过**手工艺系统**消耗材料制作物品。材料系统本身不直接暴露给玩家，但玩家体验到的"丰富的物品种类"和"有意义的收集"是这个系统在后台支撑的。

此系统主要支撑 **Pillar 4: 发现民间之美** —— 每个材料都有文化背景故事，让收集不只是数字堆砌，而是文化探索。

## Player Fantasy

**直接体验**：
- **发现惊喜**：探索时发现新材料的喜悦，尤其是稀有材料带来的成就感
- **文化探索**：每个材料都有故事，收集材料就是收集民间文化
- **目标驱动**：为了制作某个节日物品而主动寻找特定材料，形成短期目标

**系统支撑的间接体验**：
- **背包丰富感**：打开背包看到各种有名字、有故事的物品，而不是"物品A"、"物品B"
- **价值感知**：稀有材料让玩家感到珍贵，思考如何最佳使用
- **季节感**：某些材料只在特定季节/地点出现，增强四季节日的时间感

**稀有度情感设计**：

| Rarity | Player Feeling | Example |
|--------|---------------|---------|
| **普通** | 随处可得，日常使用，不心疼消耗 | 竹叶、稻草、面粉 |
| **稀有** | 需要探索，值得保留，使用时思考 | 月光花、古井水、百年老酒 |
| **传说** | 非常珍贵，节日限定，舍不得用 | 岁末之星、祖先祝福 |

此系统主要支撑 **Pillar 4: 发现民间之美** —— 让材料不只是数据，而是文化的载体。

## Detailed Design

### Core Rules

1. **材料核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符（来自配置） |
| `name` | string | 显示名称 |
| `icon` | string | 图标资源路径 |
| `rarity` | enum | 稀有度： COMMON / RARE / LEGENDARY |
| `description` | string | 简短描述 |
| `lore` | string | 文化背景故事 |
| `season` | enum[] | 出现季节： SPRING / SUMMER / AUTUMN / WINTER / ALL |
| `sources` | string[] | 获取来源（采集点ID列表） |
| `maxStack` | int | 最大堆叠数量（来自配置） |
| `isStackable` | boolean | 是否可堆叠（默认 true） |
| `isGift` | boolean | 是否可作为礼物送给村民 |
| `giftPreference` | object | 各村民对此材料的喜好程度 |

2. **材料分类**

| Category | Description | Examples |
|----------|-------------|----------|
| **食材** | 用于手工艺制作的原料 | 糯米粉、红豆、竹叶 |
| **装饰** | 用于村庄装饰 | 灯笼、彩带、剪纸 |
| **工具** | 用于采集或制作的工具 | 竹篮、镰刀、模具 |
| **特殊** | 节日限定、任务专用 | 中秋月露、春分初雪 |

3. **堆叠规则**
- 同ID材料自动堆叠
- 普通材料 maxStack = 99
- 稀有材料 maxStack = 20
- 传说材料 maxStack = 5
- 堆叠时更新数量，触发 `material:stack_changed` 事件

4. **材料实例创建**
- 材料实例通过 `MaterialManager.createMaterial(id, count)` 创建
- 实例包含： `materialId`, `count`, `uniqueId`（可选，用于追踪）
- 创建时验证 `materialId` 存在于配置中
- 创建时验证 `count > 0 && count <= maxStack`

### States and Transitions

材料实例是无状态对象，count 变化触发事件：

| State | Entry Condition | Exit Condition | Behavior |
|------|----------------|------------------|----------|
| **Normal** | 创建或 count 变化 | count 变为 0 或 达到堆叠上限 | count = maxStack |
| **atMax** | count 达到堆叠上限 | 不可再堆叠 | count 固定在 maxStack，触发 `material:at_max` 事件 |
| **atZero** | 消耗到 count = 0 | 实例销毁或移出背包 | count 固定在 0，触发 `material:removed` 事件 |

**材料系统状态机**（管理材料定义）：

| State | Entry Condition | Exit Condition | Behavior |
|------|----------------|------------------|----------|
| **Uninitialized** | 系统启动 | 配置加载完成 | 配置未加载，返回空定义 |
| **Ready** | 配置加载完成 | 系统销毁 | 匼应配置查询请求 |
| **Error** | 配置加载失败 | 重试或 使用默认 | 配置不可用，使用默认值 |

### Interactions with Other Systems
| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **配置系统** | 读取配置 | 配置 → 材料 | 获取材料定义（名称、图标、稀有度、描述等） |
| **背包系统** | 提供材料实例 | 材料 → 背包 | 管理材料实例的存储和查询 |
| **采集系统** | 创建材料实例 | 采集 → 材料 | 采集时创建材料实例，添加到背包 |
| **手工艺系统** | 消耗材料 | 手工艺 → 材料 | 制作时从背包消耗材料 |
| **任务系统** | 查询材料 | 任务 → 材料 | 验证任务需要的材料是否存在 |
| **村民关系系统** | 查询材料 | 村民 → 材料 | 判断材料是否是村民喜好 |
| **事件系统** | 发布事件 | 材料 → 事件 | 材料数量变化时发布事件 |

**事件交互**：
- `material:added` — 材料添加到背包
- `material:removed` — 材料从背包移除
- `material:stack_changed` — 材料堆叠数量变化
- `material:at_max` — 材料堆叠达到上限（无法继续添加)
- `material:gift_sent` — 材料作为礼物送给村民

## Formulas
### 1. 添加材料逻辑
```
newCount = clamp(currentCount + addAmount, 0, maxStack)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| currentCount | int | 0-maxStack | runtime | 当前堆叠数量 |
| addAmount | int | 1-∞ | caller | 要添加的数量 |
| maxStack | int | 5-99 | config | 最大堆叠数量（来自配置系统） |

**返回值**：
- 若 `newCount < maxStack`: 返回 `{ count: newCount, overflow: 0 }`
- 若 `newCount >= maxStack`: 返回 `{ count: maxStack, overflow: newCount - maxStack }`

### 2. 消耗材料逻辑
```
canConsume = currentCount >= consumeAmount
newCount = currentCount - consumeAmount
```
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| currentCount | int | 0-maxStack | runtime | 当前堆叠数量 |
| consumeAmount | int | 1-∞ | caller | 要消耗的数量 |
| canConsume | boolean | true/false | runtime | 是否可以消耗 |

### 3. 稀有度掉落概率（供采集系统使用)
```
dropChance = baseDropRate × rarityMultiplier[rarity]
```
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseDropRate | float | 0.0-1.0 | config | 基础掉落率（来自配置系统） |
| rarityMultiplier | object | { common: 1.0, rare: 0.3, legendary: 0.05 } | config | 稀有度倍率（来自配置系统） |
| rarity | enum | common/rare/legendary | config | 材料稀有度（来自材料配置） |

**Expected output range**:

| Rarity | rarityMultiplier | Example (baseDropRate = 0.5) |
|--------|-------------------|------------------------------|
| common | 1.0 | 50% |
| rare | 0.3 | 15% |
| legendary | 0.05 | 2.5% |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| **count = 0 時嘗試消耗** | 返回 `{ success: false, reason: 'insufficient' }`，不觸發事件 | 無法消耗不存在的材料，需明確告知調用方失敗原因 |
| **count = maxStack 時嘗試添加** | 返回 `{ count: maxStack, overflow: addAmount }`，觸發 `material:at_max` 事件 | 溢出量需返回給調用方，由背包系統決定是否創建新堆疊 |
| **overflow > 0 且背包無空間** | 由背包系統處理，材料系統只負責返回 overflow | 職責分離：材料系統管理單個堆疊，背包系統管理空間 |
| **材料 ID 不存在於配置** | `createMaterial()` 返回 `null`，記錄警告 `Unknown material ID: {id}` | 防止創建無效材料實例，調用方應處理 null |
| **配置加載失敗** | 材料系統進入 Error 狀態，`getMaterialById()` 返回 `undefined` | 優雅降級，不阻塞遊戲啟動 |
| **count 超出 maxStack** | `createMaterial()` 拒絕，返回 `null`，記錄警告 | 強制調用方遵守堆疊規則 |
| **負數 count** | `createMaterial()` 拒絕，返回 `null` | count 必須 > 0 |
| **同時多個消耗請求** | 按請求順序處理，先到先得 | 避免競態條件導致負數 |
| **傳說材料掉落率過低** | 採用保底機制：連續 N 次未獲得傳說材料後，下一次必定掉落 | 防止玩家永遠無法獲得，提升體驗 |
| **材料實例 uniqueId 衝突** | 使用 UUID 生成，衝突概率極低，如發生則重新生成 | 保證實例唯一性 |
| **村民喜好配置缺失** | `giftPreference` 默認為空對象 `{}`，視為普通喜好 | 向後兼容，不阻塞功能 |

## Dependencies

### 上游依賴

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **配置系統** | Hard | `getMaterialById(id): MaterialConfig \| undefined` | ✅ Designed |
| **事件系統** | Hard | `emit(eventId: string, payload: any): void` | ✅ Designed |

**配置系統接口**：
```typescript
interface MaterialConfig {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'legendary';
    description: string;
    lore: string;
    season: ('spring' | 'summer' | 'autumn' | 'winter')[];
    sources: string[];
    maxStack: number;
    isStackable: boolean;
    isGift: boolean;
    giftPreference: Record<string, number>;
}
```

### 下游依賴者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **背包系統** | Hard | `createMaterial(id, count): MaterialInstance \| null` | Not Started |
| **采集系統** | Hard | `createMaterial(id, count): MaterialInstance \| null` | Not Started |
| **食譜系統** | Hard | `getMaterialById(id): MaterialConfig \| undefined` | Not Started |
| **手工藝系統** | Hard | `getMaterialById(id): MaterialConfig \| undefined` | Not Started |
| **任務系統** | Soft | `getMaterialById(id): MaterialConfig \| undefined` | Not Started |
| **村民關係系統** | Soft | `material.giftPreference` 查詢喜好 | Not Started |
| **收集系統** | Soft | `getAllMaterials(): MaterialConfig[]` | Not Started |

### 數據流圖

```
┌─────────────┐     getMaterialById()     ┌─────────────┐
│  配置系統   │ ──────────────────────────▶│  材料系統   │
└─────────────┘                            └─────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
            ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
            │  背包系統   │              │  采集系統   │              │ 手工藝系統  │
            └─────────────┘              └─────────────┘              └─────────────┘
                    │                             │                             │
                    │                             │                             │
                    ▼                             ▼                             ▼
            ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
            │  事件系統   │◀─────────────│  事件系統   │◀─────────────│  事件系統   │
            └─────────────┘  emit()      └─────────────┘  emit()      └─────────────┘  emit()
```

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **普通材料堆叠上限** | 99 | 50-999 | 背包压力减小 | 背包更快满 |
| **稀有材料堆叠上限** | 20 | 10-50 | 稀有材料更易囤积 | 稀有材料更珍贵 |
| **传说材料堆叠上限** | 5 | 1-10 | 传说材料更易囤积 | 传说材料极珍贵 |
| **普通掉落倍率** | 1.0 | 0.5-1.5 | 普通材料更易获取 | 需要更多采集 |
| **稀有掉落倍率** | 0.3 | 0.1-0.5 | 稀有材料更易获取 | 稀有材料更难获得 |
| **传说掉落倍率** | 0.05 | 0.01-0.1 | 传说材料更易获取 | 传说材料极难获得 |
| **传说保底次数** | 50 | 20-100 | 更快触发保底 | 更难获得传说 |
| **默认最大堆叠** | 99 | 20-999 | 单格容量更大 | 背包更紧张 |

**参数交互**:
- `传说掉落倍率` 和 `传说保底次数` 相互影响：如果倍率很低，保底次数应该相应降低，否则体验太差
- `普通材料堆叠上限` 和 `背包容量`（背包系统）交互：背包容量应该足够容纳合理的材料种类
- `稀有度堆叠上限` 应随稀有度递减：普通 > 稀有 > 传说

## Visual/Audio Requirements

材料系统是后台基础设施，**无直接的视觉/音频反馈**。

## UI Requirements

材料系统是后台基础设施，**无直接的UI显示**。

调试工具需求（开发阶段）：
- 材料配置验证错误日志输出到控制台
- 可选：材料浏览器工具（用于开发调试）

## Acceptance Criteria

**功能测试**:
- [ ] `createMaterial(id, count)` 能成功创建材料实例
- [ ] `createMaterial()` 对不存在的 ID 返回 `null` 并记录警告
- [ ] `createMaterial()` 对 count > maxStack 返回 `null`
- [ ] `createMaterial()` 对 count <= 0 返回 `null`
- [ ] `getMaterialById(id)` 返回正确的材料配置
- [ ] `getMaterialById()` 对不存在的 ID 返回 `undefined`
- [ ] `getAllMaterials()` 返回所有材料配置列表

**堆叠逻辑测试**:
- [ ] 添加材料时正确计算 `newCount` 和 `overflow`
- [ ] count 达到 maxStack 时返回正确的 overflow
- [ ] 消耗材料时正确验证 `canConsume`
- [ ] count 不足时消耗返回 `{ success: false, reason: 'insufficient' }`

**事件测试**:
- [ ] 材料添加时发布 `material:added` 事件
- [ ] 材料移除时发布 `material:removed` 事件
- [ ] 堆叠数量变化时发布 `material:stack_changed` 事件
- [ ] 堆叠达到上限时发布 `material:at_max` 事件

**性能测试**:
- [ ] `getMaterialById()` 查询时间 < 1ms
- [ ] `createMaterial()` 创建时间 < 1ms
- [ ] 材料系统内存占用 < 50KB

**配置集成测试**:
- [ ] 配置加载完成后材料系统进入 Ready 状态
- [ ] 配置加载失败时材料系统进入 Error 状态，使用默认值
- [ ] 热更新后材料系统能正确刷新缓存

## Open Questions

无待解决问题。
