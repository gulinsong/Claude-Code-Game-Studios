# ADR-0004: 背包系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》玩家会收集各种材料（采集获得）和成品（手工艺制作）。需要一个背包系统来：
1. 存储和管理玩家拥有的物品
2. 支持物品堆叠（相同物品合并）
3. 区分材料类型和成品类型（不同标签页）
4. 支持容量扩展

### Constraints
- **平台限制**: 微信小游戏，内存 < 150MB
- **UI 设计**: 双标签页（材料/成品），每页 24 格
- **设计要求**: 相同 ID 物品自动堆叠，不同物品不能堆叠
- **序列化**: 需要支持存档/读档

### Requirements
- 支持材料（MATERIAL）和成品（CRAFTED）两种类型
- 每种类型有独立的格子数组
- 相同物品自动堆叠，达到上限后使用新格子
- 支持添加、移除、查询操作
- 支持容量扩展
- 所有操作发布事件通知

## Decision

采用**双标签页 + 槽位式** 的背包架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BackpackSystem (单例)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  materialSlots: Slot[] (材料标签页，默认 12 格)              │   │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┐               │   │
│  │  │ 物品 │ 物品 │ 空格  │ 物品 │ ...  │ 空格  │               │   │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┘               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  craftedSlots: Slot[] (成品标签页，默认 12 格)               │   │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┐               │   │
│  │  │ 月饼 │ 粽子 │ 空格  │ 空格  │ ...  │ 空格  │               │   │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┘               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  addItem(itemId, type, amount) ──► 堆叠逻辑 ──► 发布事件          │
│  removeItem(itemId, amount) ──────► 移除逻辑 ──► 发布事件          │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 槽位 (Slot) 结构
```typescript
interface Slot {
    itemId: string | null;     // null 表示空格
    itemType: ItemType;        // MATERIAL 或 CRAFTED
    count: number;             // 当前数量
    maxStack: number;          // 最大堆叠数（来自配置）
}
```

**设计要点**:
- 空格用 `itemId: null` 表示，而非删除元素
- `maxStack` 来自材料/成品配置，支持不同物品不同堆叠上限

#### 2. 添加物品流程
```
addItem(itemId, itemType, amount):
1. 查找是否有相同 itemId 且 count < maxStack 的格子
2. 如果有：
   a. 堆叠：newCount = min(count + amount, maxStack)
   b. overflow = amount - (newCount - count)
   c. 递归处理 overflow
3. 如果没有可堆叠格子：
   a. 查找空格子
   b. 创建新堆叠：newCount = min(amount, maxStack)
   c. 递归处理 overflow
4. 如果没有空格子：
   a. 返回 overflow（无法添加的数量）
5. 发布 inventory:item_added 事件
```

#### 3. 堆叠上限配置
```typescript
const BACKPACK_CONFIG = {
    INITIAL_SLOTS_PER_TAB: 12,      // 初始每页 12 格
    MAX_SLOTS_PER_TAB: 24,          // 最大每页 24 格
    DEFAULT_MAX_STACK: 99,          // 材料默认堆叠上限
    DEFAULT_CRAFTED_MAX_STACK: 5    // 成品默认堆叠上限（成品较稀有）
};
```

**设计决策**:
- 材料堆叠上限高（99），因为采集会大量获得
- 成品堆叠上限低（5），因为成品是独特的手工艺品

### Key Interfaces

```typescript
interface IBackpackSystem {
    addItem(itemId: string, itemType: ItemType, amount: number): AddItemResult;
    removeItem(itemId: string, itemType: ItemType, amount: number): RemoveItemResult;
    hasItem(itemId: string, itemType: ItemType, amount?: number): boolean;
    getItemCount(itemId: string, itemType: ItemType): number;
    getSlot(slotIndex: number, itemType: ItemType): Slot | null;
    expandSlots(newMax: number): boolean;
    exportData(): BackpackData;
    importData(data: BackpackData): void;
}
```

## Alternatives Considered

### Alternative 1: 重量制背包
- **Description**: 每个物品有重量，背包有总重量上限
- **Pros**:
  - 更"真实"
  - 无需考虑格子数
- **Cons**:
  - UI 复杂（需要显示重量条）
  - 玩家难以直观估计剩余空间
  - 不符合移动端游戏习惯
- **Rejection Reason**: 格子制更符合移动端休闲游戏，玩家易于理解

### Alternative 2: 无限背包
- **Description**: 无容量限制，只记录物品数量
- **Pros**:
  - 实现简单
  - 玩家无压力
- **Cons**:
  - 失去"收集感"
  - 背包 UI 无意义
  - 无法实现内购扩展
- **Rejection Reason**: 设计要求有容量限制和扩展机制

### Alternative 3: 单一背包
- **Description**: 材料和成品混合存储
- **Pros**:
  - 实现更简单
- **Cons**:
  - UI 混乱，玩家难以查找
  - 不符合设计文档要求
- **Rejection Reason**: 设计明确要求双标签页分离

### Alternative 4: 链表式存储
- **Description**: 使用链表而非数组存储物品
- **Pros**:
  - 插入/删除 O(1)
- **Cons**:
  - 随机访问 O(n)
  - 序列化复杂
  - 过度设计
- **Rejection Reason**: 数组更简单，性能足够（最多 48 格）

## Consequences

### Positive
- 直观：格子制易于玩家理解
- 灵活：不同物品可有不同堆叠上限
- 可扩展：支持容量扩展（内购或游戏进度）
- 事件驱动：所有变更自动通知 UI

### Negative
- 碎片化：移除物品可能产生空格分散
- 复杂度：堆叠逻辑需要递归处理

### Risks
- **背包满**: 玩家无法获得新物品
  - *缓解*: 提供"快速整理"功能，提示丢弃低价值物品
- **格子碎片**: 频繁添加/移除导致空格分散
  - *缓解*: 整理功能自动合并和排序
- **堆叠上限变更**: 配置修改导致 count > maxStack
  - *缓解*: 保持当前 count，下次消耗时恢复

## Performance Implications
- **CPU**: addItem/removeItem O(n)，n ≤ 24，可忽略
- **Memory**: 约 50 bytes/slot，48 slots ≈ 2.4KB
- **Events**: 每次操作发布 1-2 个事件

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 相同物品自动堆叠
- [x] 堆叠满后使用新格子
- [x] 背包满时返回正确 overflow
- [x] 数量不足时返回失败
- [x] 移除后空格子变为空
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [背包系统设计文档](../../design/gdd/backpack-system.md)
- [材料系统设计文档](../../design/gdd/material-system.md)
