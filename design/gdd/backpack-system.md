# 背包系统 (Backpack System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 4: 发现民间之美 — 背包不只是存储，是玩家收集的文化博物馆

## Overview

背包系统是《岁时记》的**物品存储中心**，负责管理玩家拥有的所有物品。玩家通过采集、制作、收礼获得物品，通过制作、送礼、任务交付消耗物品。

背包采用**网格布局**，每格存放一种物品（相同ID自动堆叠）。初始容量为 24 格，可通过游戏进度或内购扩展。背包分为「材料」和「物品」两个标签页，方便玩家快速查找。

玩家**直接与背包交互**——打开背包查看物品、选中物品查看详情、拖拽整理、长按批量使用。背包是玩家管理游戏资源的核心界面，是"收集感"和"富有感"的直接体现。

此系统主要支撑 **Pillar 4: 发现民间之美** —— 打开背包看到各种有名字、有故事的物品，让收集不只是数字堆砌。

## Player Fantasy

**直接体验**：
- **富有感**：打开背包看到满满当当的格子，每样物品都有独特的图标和名称，感受到"我拥有一个丰富的世界"
- **整理的满足感**：拖拽物品整理格子，像整理真实的收纳盒，有秩序感
- **发现的惊喜**：查看物品详情，阅读材料的文化背景故事，每次都是小小的文化探索

**稀有度情感设计**（继承自材料系统）：

| Rarity | Player Feeling in Backpack |
|--------|---------------------------|
| **普通** | 随处可得，日常使用，格子里的"背景" |
| **稀有** | 格子里的亮点，看到会想起获取它的经历 |
| **传说** | 珍贵的收藏，舍不得用，偶尔打开看看 |

**背包满时**：
- 不应该产生焦虑，而是给出选择："你想保留哪个？"
- 提供便捷的"快速整理"功能，自动堆叠同类物品
- 容量设计应保证正常游玩不会频繁遇到满包情况

此系统主要支撑 **Pillar 4: 发现民间之美** —— 背包不只是存储，是玩家收集的文化博物馆。

## Detailed Design

### Core Rules

1. **背包结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `slots` | Slot[] | 格子数组，每格可存放一个物品堆叠 |
| `maxSlots` | int | 最大格数（初始 24） |
| `activeTab` | enum | 当前标签页（材料/物品） |

2. **格子 (Slot) 结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `itemId` | string | 物品ID（材料ID或成品ID） |
| `itemType` | enum | 物品类型（MATERIAL / CRAFTED） |
| `count` | int | 当前数量 |
| `maxStack` | int | 最大堆叠数（来自配置） |

3. **添加物品流程**

```
addItem(itemId, itemType, amount):
1. 查找是否存在相同 itemId 且 count < maxStack 的格子
2. 如果存在：
   a. 尝试堆叠：newCount = min(count + amount, maxStack)
   b. added = newCount - count
   c. overflow = amount - added
   d. 更新格子 count
   e. 如 overflow > 0，递归处理溢出
3. 如果不存在可堆叠格子：
   a. 查找空格子（itemId = null）
   b. 如有空格子：
      - 创建新堆叠：newCount = min(amount, maxStack)
      - overflow = amount - newCount
      - 如 overflow > 0，递归处理
   c. 如无空格子，返回 overflow
4. 发布 inventory:item_added 事件
5. 返回 { added: totalAdded, overflow: remainingOverflow }
```

4. **移除物品流程**

```
removeItem(itemId, amount):
1. 查找所有包含该 itemId 的格子（按 count 升序排列，优先消耗少的）
2. 逐格消耗直到满足 amount 或格子耗尽
3. 如某格消耗后 count = 0，清空该格子
4. 发布 inventory:item_removed 事件
5. 返回 { success: boolean, removed: actualRemoved, remaining: remainingInBackpack }
```

5. **标签页分类**

| 标签页 | 内容 | itemType |
|--------|------|----------|
| 材料 | 采集获得的原料（竹叶、面粉、红豆等） | MATERIAL |
| 物品 | 手工艺制作的成品（月饼、灯笼等） | CRAFTED |

6. **容量扩展规则**
- 初始容量：24 格（材料标签 12 + 物品标签 12）
- 游戏进度解锁：完成每个节日后 +4 格（两标签各 +2）
- 内购解锁：+8 格（两标签各 +4），可多次购买
- 最大容量：48 格

7. **查询接口**
- `getItemCount(itemId)`: 返回背包中该物品的总数量
- `hasItem(itemId, amount)`: 返回是否拥有足够数量
- `getSlotsByType(itemType)`: 返回指定类型的所有格子
- `findEmptySlot(itemType)`: 返回指定类型的空格子

### States and Transitions

**背包状态机**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Closed** | 默认状态 | 玩家打开背包 | 背包UI不可见，物品数据在后台 |
| **Open** | 玩家打开背包 | 玩家关闭背包 | 显示背包UI，响应玩家操作 |
| **Inspecting** | 玩家选中物品查看详情 | 玩家关闭详情 | 显示物品详情面板 |

**格子状态机**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Empty** | 默认/物品消耗完 | 添加物品 | 格子为空，可接受新物品 |
| **Occupied** | 添加物品 | 消耗完/移除 | 格子有物品，0 < count < maxStack |
| **Full** | count = maxStack | 消耗物品 | 格子已满，同ID物品不能再堆叠到此格 |

**状态转换图**：

```
背包状态：
Closed ←→ Open ←→ Inspecting

格子状态：
Empty ←→ Occupied ←→ Full
         ↑_____________|
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **材料系统** | 调用接口 | 材料 → 背包 | 创建材料实例时获取物品定义（名称、图标、maxStack） |
| **事件系统** | 发布/监听 | 背包 ↔ 事件 | 发布背包事件，监听配置热更新事件 |
| **采集系统** | 被调用 | 采集 → 背包 | 采集完成后调用 `addItem()` 添加材料 |
| **手工艺系统** | 双向 | 背包 ↔ 手工艺 | 制作时调用 `removeItem()` 消耗材料，完成后调用 `addItem()` 添加成品 |
| **任务系统** | 被调用 | 任务 → 背包 | 任务交付时调用 `removeItem()`，任务奖励时调用 `addItem()` |
| **村民关系系统** | 被调用 | 村民 → 背包 | 送礼时调用 `removeItem()`，收到回礼时调用 `addItem()` |
| **云存档系统** | 被调用 | 存档 → 背包 | 存档时导出背包数据，读档时导入背包数据 |
| **内购系统** | 被调用 | 内购 → 背包 | 购买容量扩展后更新 `maxSlots` |
| **UI框架系统** | 提供数据 | 背包 → UI | 提供格子数据供UI渲染 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `inventory:item_added` | `{ itemId, itemType, amount, slotIndex }` | 物品添加成功 |
| `inventory:item_removed` | `{ itemId, itemType, amount, slotIndex }` | 物品移除成功 |
| `inventory:slot_changed` | `{ slotIndex, oldItem, newItem }` | 格子内容变化 |
| `inventory:full` | `{ itemType }` | 某标签页格子已满 |
| `inventory:expanded` | `{ oldMax, newMax }` | 容量扩展成功 |

## Formulas

### 1. 添加物品计算

```
// 单格堆叠
newCount = min(currentCount + addAmount, maxStack)
added = newCount - currentCount
overflow = addAmount - added

// 总添加（递归处理多格）
totalAdded = sum(added per slot)
remainingOverflow = addAmount - totalAdded
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| currentCount | int | 0-maxStack | runtime | 格子当前数量 |
| addAmount | int | 1-∞ | caller | 要添加的数量 |
| maxStack | int | 5-99 | config | 最大堆叠数（来自材料配置） |
| added | int | 0-addAmount | computed | 实际添加数量 |
| overflow | int | 0-addAmount | computed | 溢出数量 |

### 2. 移除物品计算

```
removed = min(currentCount, remainingNeeded)
remainingNeeded = requestedAmount - sum(removed so far)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| requestedAmount | int | 1-∞ | caller | 请求移除的数量 |
| removed | int | 0-currentCount | computed | 实际移除数量 |
| remainingNeeded | int | 0-requestedAmount | computed | 剩余需要数量 |

### 3. 容量计算

```
usedSlots = count(slots where itemId != null)
freeSlots = maxSlots - usedSlots
utilizationRate = usedSlots / maxSlots
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| maxSlots | int | 24-48 | config/runtime | 最大格数 |
| usedSlots | int | 0-maxSlots | runtime | 已使用格数 |
| utilizationRate | float | 0.0-1.0 | computed | 容量利用率 |

### 4. 内存占用估算

```
memoryUsage = baseOverhead + (slotCount * slotSize)
slotSize ≈ 50 bytes (itemId + itemType + count + maxStack)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseOverhead | int | ~500 bytes | constant | 背包管理器基础内存 |
| slotCount | int | 24-48 | config | 格子总数 |
| slotSize | int | ~50 bytes | constant | 单格内存占用 |

**Expected output range**: < 3KB（48格）

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 添加物品时背包已满 | 返回 `{ added: 0, overflow: fullAmount }`，发布 `inventory:full` 事件 | 调用方应处理溢出（如显示提示、丢弃、邮件暂存） |
| 添加物品时部分溢出 | 返回 `{ added: partialAmount, overflow: remainingAmount }` | 尽可能添加，返回无法添加的部分 |
| 移除物品时数量不足 | 返回 `{ success: false, removed: 0, remaining: currentAmount }` | 不执行移除，告知调用方当前拥有数量 |
| 移除不存在的物品 | 返回 `{ success: false, removed: 0, remaining: 0 }` | 优雅处理，不抛出异常 |
| 同时添加多种物品 | 按调用顺序逐个处理，任一溢出不影响其他 | 保证操作原子性 |
| 格子在操作中被其他系统修改 | 使用锁机制或版本号检测，冲突时重试或失败 | 防止并发问题 |
| 物品配置被热更新删除 | 保留物品但标记为"未知物品"，显示默认图标 | 不丢失玩家数据 |
| maxStack 配置减小导致 count > maxStack | 保持当前 count，下次消耗时才恢复正常 | 不强制丢弃玩家物品 |
| 标签页切换时正在操作物品 | 操作完成后再切换，或取消操作 | 避免数据不一致 |
| 存档数据格式不兼容 | 使用默认空背包，记录警告，尝试迁移旧数据 | 向前兼容 |
| 负数或零数量添加 | 返回 `{ added: 0, overflow: 0 }`，记录警告 | 无效输入，静默忽略 |
| 超大数量添加（> 9999） | 分批处理，每批不超过单格 maxStack | 防止数值溢出 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **材料系统** | Hard | `getMaterialById(id): MaterialConfig` | ✅ Approved |
| **事件系统** | Hard | `emit(eventId, payload): void` | ✅ Designed |
| **配置系统** | Soft | `getGlobalParam(key): value` | ✅ Designed |

**材料系统接口**：
```typescript
interface MaterialConfig {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'legendary';
    maxStack: number;
    itemType: 'MATERIAL' | 'CRAFTED';
}
```

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **采集系统** | Hard | `addItem(itemId, itemType, amount)` | Not Started |
| **手工艺系统** | Hard | `addItem()`, `removeItem()`, `hasItem()` | Not Started |
| **任务系统** | Hard | `removeItem()`, `hasItem()` | Not Started |
| **村民关系系统** | Hard | `removeItem()`, `getItemCount()` | Not Started |
| **云存档系统** | Hard | `exportData()`, `importData()` | Not Started |
| **内购系统** | Soft | `expandSlots(amount)` | Not Started |
| **UI框架系统** | Soft | `getSlots()`, `getSlotByIndex()` | Not Started |
| **收集系统** | Soft | `getItemCount()` | Not Started |
| **装饰系统** | Soft | `removeItem()` | Not Started |
| **服装系统** | Soft | `removeItem()` | Not Started |
| **激励视频系统** | Soft | `addItem()` | Not Started |

### 数据流图

```
┌─────────────┐     getMaterialById()     ┌─────────────┐
│  材料系统   │ ──────────────────────────▶│  背包系统   │
└─────────────┘                            └─────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
            ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
            │  采集系统   │              │ 手工艺系统  │              │  任务系统   │
            └─────────────┘              └─────────────┘              └─────────────┘
                    │                             │                             │
                    │                             │                             │
                    ▼                             ▼                             ▼
            ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
            │  事件系统   │◀─────────────│  事件系统   │◀─────────────│  事件系统   │
            └─────────────┘  emit()      └─────────────┘  emit()      └─────────────┘  emit()
```

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **初始容量（每标签）** | 12 | 8-20 | 更宽松的背包空间 | 更频繁的背包管理 |
| **最大容量（每标签）** | 24 | 16-40 | 更大的收集上限 | 限制收集深度 |
| **节日完成奖励格数** | 4 | 2-8 | 更快的容量增长 | 更依赖内购扩展 |
| **内购扩展格数** | 8 | 4-12 | 更高的内购价值 | 更低的内购吸引力 |
| **内购扩展次数上限** | 3 | 1-5 | 更大的付费空间 | 更早达到容量上限 |
| **背包满提示阈值** | 90% | 70-100 | 更早提醒玩家整理 | 可能突然满包 |
| **快速整理动画时长** | 0.3s | 0.1-0.5s | 更流畅的视觉反馈 | 更快的整理速度 |

**参数交互**：
- `初始容量` + `节日完成奖励格数` × 4节日 + `内购扩展格数` × `内购扩展次数上限` ≤ `最大容量`
- 当前计算：12 + 4×4 + 8×3 = 12 + 16 + 24 = 52，需要调整
- 修正：节日奖励每标签+2（总+4），内购每标签+4（总+8），最多1次
- 修正计算：12 + 2×4 + 4×1 = 12 + 8 + 4 = 24 ✓

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **格子背景** | 根据稀有度显示不同边框颜色（普通灰、稀有蓝、传说金） |
| **物品图标** | 来自材料/成品配置，64×64 像素 |
| **数量显示** | 右下角显示堆叠数量，count=1时不显示 |
| **满格标识** | count=maxStack 时显示小绿点或高亮边框 |
| **空格样式** | 显示淡淡的格子边框，表示可用空间 |
| **标签页切换** | 平滑过渡动画，0.2s |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `backpack_open` | 打开背包界面 |
| `backpack_close` | 关闭背包界面 |
| `item_add` | 物品添加成功（短促的"叮"声） |
| `item_remove` | 物品移除（轻微的"嗖"声） |
| `inventory_full` | 背包满时尝试添加（低沉的提示音） |
| `tab_switch` | 切换标签页 |
| `slot_sort` | 快速整理完成 |

### 稀有度视觉设计

| Rarity | 边框颜色 | 光效 | 数量字体 |
|--------|---------|------|---------|
| 普通 | #888888 | 无 | 白色 |
| 稀有 | #4A90D9 | 微弱蓝光 | 蓝色 |
| 传说 | #FFD700 | 金色粒子 | 金色 |

## UI Requirements

### 布局结构

```
┌─────────────────────────────────┐
│  [材料]  [物品]         容量:18/24│  ← 标签页 + 容量显示
├─────────────────────────────────┤
│  ┌───┬───┬───┬───┬───┬───┐     │
│  │   │   │   │   │   │   │     │  ← 格子网格（6列）
│  ├───┼───┼───┼───┼───┼───┤     │
│  │   │   │   │   │   │   │     │
│  ├───┼───┼───┼───┼───┼───┤     │
│  │   │   │   │   │   │   │     │
│  └───┴───┴───┴───┴───┴───┘     │
├─────────────────────────────────┤
│  [快速整理]           [关闭]   │  ← 底部操作栏
└─────────────────────────────────┘
```

### 交互规范

| 操作 | 行为 |
|------|------|
| **点击格子** | 选中格子，显示物品详情面板 |
| **长按格子** | 弹出操作菜单（使用、丢弃、取消） |
| **拖拽格子** | 交换两个格子的内容 |
| **双击格子** | 快速使用（如有可用功能） |
| **点击空格** | 无响应 |
| **点击标签页** | 切换到对应标签页 |
| **点击快速整理** | 自动堆叠同类物品，排序（稀有度优先） |

### 物品详情面板

```
┌─────────────────────────┐
│  [物品图标]  物品名称    │
│              ★★★☆☆      │  ← 稀有度
├─────────────────────────┤
│  物品描述文本...         │
│                         │
│  文化背景故事...         │
├─────────────────────────┤
│  拥有: 15               │
├─────────────────────────┤
│  [使用]  [丢弃]  [取消] │
└─────────────────────────┘
```

### 响应式适配

- 竖屏：6列网格，滚动浏览
- 横屏：8列网格，固定显示
- 格子大小：64×64 dp（适配各种屏幕密度）

## Acceptance Criteria

**功能测试**:
- [ ] `addItem(itemId, itemType, amount)` 能正确添加物品到背包
- [ ] 相同ID物品自动堆叠到同一格子
- [ ] 堆叠满后自动使用新格子
- [ ] 背包满时返回正确的 overflow
- [ ] `removeItem(itemId, amount)` 能正确移除物品
- [ ] 数量不足时返回 `{ success: false }`
- [ ] 移除后 count=0 的格子变为空
- [ ] `hasItem(itemId, amount)` 返回正确结果
- [ ] `getItemCount(itemId)` 返回正确的总数量
- [ ] 标签页切换正常，各标签物品独立
- [ ] 容量扩展后 maxSlots 正确更新

**事件测试**:
- [ ] 添加物品时发布 `inventory:item_added` 事件
- [ ] 移除物品时发布 `inventory:item_removed` 事件
- [ ] 格子内容变化时发布 `inventory:slot_changed` 事件
- [ ] 背包满时发布 `inventory:full` 事件
- [ ] 容量扩展时发布 `inventory:expanded` 事件

**UI测试**:
- [ ] 格子正确显示物品图标和数量
- [ ] 稀有度边框颜色正确
- [ ] 点击格子显示详情面板
- [ ] 拖拽格子能交换内容
- [ ] 快速整理能正确堆叠和排序
- [ ] 标签页切换平滑

**性能测试**:
- [ ] `addItem()` 执行时间 < 5ms
- [ ] `removeItem()` 执行时间 < 5ms
- [ ] `getItemCount()` 执行时间 < 1ms
- [ ] 背包内存占用 < 5KB（48格满载）
- [ ] UI渲染帧率 ≥ 60fps

**存档测试**:
- [ ] `exportData()` 导出正确的背包数据
- [ ] `importData()` 能正确恢复背包状态
- [ ] 存档数据格式向后兼容

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要物品过期/腐坏机制？ | 设计者 | 设计阶段 | 暂不需要，保持简单 |
| 是否支持物品拆分（把一堆拆成两堆）？ | 设计者 | 实现阶段 | 待定，看UI复杂度 |
| 背包满时的溢出物品如何处理？ | 设计者 | MVP阶段 | 方案A：丢弃并提示；方案B：邮件暂存 |
| 是否需要物品收藏/锁定功能（防止误删）？ | 设计者 | Beta阶段 | 待定 |

## Implementation Notes

### 推荐实现方式 (Cocos Creator / TypeScript)

```typescript
// 简化示例 - 完整实现在代码阶段

enum ItemType {
    MATERIAL = 'MATERIAL',
    CRAFTED = 'CRAFTED'
}

interface Slot {
    itemId: string | null;
    itemType: ItemType;
    count: number;
    maxStack: number;
}

interface BackpackData {
    materialSlots: Slot[];
    craftedSlots: Slot[];
    maxSlotsPerTab: number;
}

class BackpackManager {
    private data: BackpackData;
    private eventSystem: EventSystem;

    addItem(itemId: string, itemType: ItemType, amount: number): { added: number; overflow: number };
    removeItem(itemId: string, amount: number): { success: boolean; removed: number; remaining: number };
    hasItem(itemId: string, amount: number): boolean;
    getItemCount(itemId: string): number;
    expandSlots(amount: number): void;
    exportData(): BackpackData;
    importData(data: BackpackData): void;
}
```
