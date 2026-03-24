# 采集系统 (Gathering System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: Pillar 4: 发现民间之美 — 每次采集都是一次发现

## Overview

采集系统是《岁时记》的**资源获取核心**，让玩家通过点击采集点获取材料。采集点分布在村庄和周边区域，不同区域、不同时段、不同季节有不同的采集产出。

采集采用**点击交互 + 等待刷新**模式——点击采集点消耗体力并获得材料，采集点进入冷却期，冷却结束后可再次采集。稀有材料有概率掉落，连续未获得时触发保底机制。

玩家**直接与采集系统交互**——探索地图发现采集点，点击采集，查看获得材料。采集是"探索-发现-收获"循环的核心，让玩家感受世界的丰富性。

此系统主要支撑 **Pillar 4: 发现民间之美** —— 每次采集都是一次小小的发现，材料背后的故事等待玩家去了解。

## Player Fantasy

**直接体验**：
- **发现感**：探索新区域，发现新的采集点和材料
- **期待感**：点击采集时期待获得什么，尤其是稀有材料
- **规划感**：根据季节和时间规划采集路线
- **收获满足**：看到背包里新增的材料，满足感油然而生

**采集情感设计**：

| Outcome | Player Feeling |
|---------|---------------|
| **普通材料** | 日常收获，稳步积累 |
| **稀有材料** | 惊喜！想着可以做什么 |
| **传说材料** | 哇！今天运气真好！ |
| **采集点冷却** | 下次再来，先去别的地方 |
| **体力不足** | 今天差不多了，下次继续 |

此系统主要支撑 **Pillar 4: 发现民间之美** —— 让采集不只是"点击获取"，而是"探索发现"。

## Detailed Design

### Core Rules

1. **采集点核心属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | string | 采集点唯一ID |
| `name` | string | 显示名称 |
| `locationId` | string | 所在地点ID |
| `materials` | MaterialDrop[] | 可产出材料列表 |
| `cooldown` | int | 冷却时间（秒） |
| `staminaCost` | int | 消耗体力 |
| `unlockCondition` | string | 解锁条件 |

2. **材料掉落结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `materialId` | string | 材料ID |
| `weight` | int | 权重（用于概率计算） |
| `minAmount` | int | 最小掉落数量 |
| `maxAmount` | int | 最大掉落数量 |
| `seasonRestriction` | Season[] | 季节限制（空=不限） |
| `timeRestriction` | Period[] | 时段限制（空=不限） |

3. **采集流程**

```
1. 玩家点击采集点
2. 检查条件：
   - 体力是否足够
   - 采集点是否冷却中
   - 是否已解锁
3. 消耗体力
4. 根据权重随机选择材料
5. 应用季节/时段限制
6. 计算掉落数量（min-max随机）
7. 触发保底检查（传说材料）
8. 添加材料到背包
9. 采集点进入冷却
10. 发布采集事件
```

4. **冷却规则**
- 普通采集点：60 秒冷却
- 稀有采集点：180 秒冷却
- 特殊采集点：300 秒冷却
- 冷却期间采集点显示"休息中"状态

5. **保底机制**
- 传说材料基础掉率：2.5%
- 连续未获得传说材料计数
- 计数达到 50 时，下一次必定掉落传说材料
- 获得传说材料后计数重置

### States and Transitions

**采集点状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Available** | 默认/冷却结束 | 玩家采集 | 可采集 |
| **Cooldown** | 玩家采集 | 冷却时间结束 | 显示"休息中"，不可采集 |
| **Locked** | 未满足解锁条件 | 满足条件 | 显示锁定图标，不可采集 |

**状态转换图**：
```
Locked → Available ←→ Cooldown
          ↑_____________|
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **背包系统** | 添加物品 | 采集 → 背包 | 采集获得的材料添加到背包 |
| **体力系统** | 消耗体力 | 采集 → 体力 | 采集时扣除体力 |
| **时间系统** | 查询时间 | 采集 → 时间 | 判断季节/时段限制 |
| **材料系统** | 获取定义 | 采集 → 材料 | 获取材料图标、名称等 |
| **配置系统** | 读取配置 | 配置 → 采集 | 获取采集点定义 |
| **事件系统** | 发布事件 | 采集 → 事件 | 发布采集事件 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `gathering:started` | `{ spotId, locationId }` | 开始采集 |
| `gathering:completed` | `{ spotId, materials: [] }` | 采集完成 |
| `gathering:rare_drop` | `{ spotId, materialId, rarity }` | 稀有掉落 |
| `gathering:legendary_drop` | `{ spotId, materialId }` | 传说掉落 |
| `gathering:pity_triggered` | `{ spotId }` | 保底触发 |

## Formulas

### 1. 掉落概率计算

```
totalWeight = sum(material.weight for all materials in spot)
dropChance = material.weight / totalWeight
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| totalWeight | int | 1-1000 | config | 总权重 |
| dropChance | float | 0.0-1.0 | computed | 掉落概率 |

### 2. 实际掉落概率（含稀有度倍率）

```
actualDropChance = baseDropRate × rarityMultiplier[rarity] × seasonMultiplier × timeMultiplier
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| baseDropRate | float | 0.0-1.0 | computed | 基础掉落率 |
| rarityMultiplier | object | {common:1.0, rare:0.3, legendary:0.05} | config | 稀有度倍率 |
| seasonMultiplier | float | 0.0-1.5 | runtime | 季节加成（当季=1.5，非当季=0.0或1.0） |
| timeMultiplier | float | 0.0-1.2 | runtime | 时段加成 |

### 3. 保底计数

```
pityCounter = pityCounter + 1
if (pityCounter >= pityThreshold || actualDropChance triggers legendary):
    drop legendary material
    pityCounter = 0
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| pityCounter | int | 0-50 | runtime | 保底计数 |
| pityThreshold | int | 50 | config | 保底阈值 |

### 4. 掉落数量

```
dropAmount = random(minAmount, maxAmount)
```

**Expected output range**:
- 普通材料：1-5 个
- 稀有材料：1-2 个
- 传说材料：1 个

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 背包已满 | 材料溢出，显示"背包已满，材料丢失"提示 | 温和提醒，不阻止采集 |
| 体力不足 | 阻止采集，显示体力不足提示 | 引导恢复体力 |
| 采集点冷却中 | 显示剩余冷却时间，不可点击 | 防止重复采集 |
| 季节/时段不匹配 | 该材料不掉落，其他材料正常 | 符合自然规律 |
| 所有材料都不满足条件 | 显示"现在没什么可采集的" | 优雅处理 |
| 保底计数跨会话 | 保存计数，下次继续 | 不丢失进度 |
| 同时多人采集（社交功能） | 各自独立，互不影响 | 简化设计 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **背包系统** | Hard | `addItem(itemId, type, amount)` | ✅ Designed |
| **体力系统** | Hard | `consumeStamina(amount)` | ✅ Designed |
| **时间系统** | Hard | `getCurrentSeason()`, `getCurrentPeriod()` | ✅ Designed |
| **材料系统** | Hard | `getMaterialById(id)` | ✅ Approved |
| **配置系统** | Hard | `getGatheringSpotById(id)` | ✅ Designed |
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **场景管理系统** | Soft | 采集点位置数据 | Not Started |
| **收集系统** | Soft | 采集记录 | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **普通采集点冷却** | 60s | 30-120s | 更慢的资源获取 | 更快的资源获取 |
| **稀有采集点冷却** | 180s | 60-300s | 更稀有的资源 | 更容易获得 |
| **传说掉率** | 2.5% | 1-5% | 更容易获得传说 | 更稀有的传说 |
| **保底阈值** | 50 | 20-100 | 更快触发保底 | 更难获得传说 |
| **普通体力消耗** | 5 | 3-10 | 更快的体力消耗 | 更慢的体力消耗 |
| **季节加成倍率** | 1.5x | 1.2-2.0x | 更强的季节差异 | 更弱的季节差异 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **采集点图标** | 根据类型显示（植物、矿石、水源等） |
| **可用状态** | 正常显示，点击时有高亮 |
| **冷却状态** | 灰暗显示，显示剩余时间 |
| **锁定状态** | 显示锁图标，点击显示解锁条件 |
| **掉落动画** | 材料图标从采集点飞向背包 |

### 稀有度掉落特效

| Rarity | 特效 |
|--------|------|
| 普通 | 简单的弹出动画 |
| 稀有 | 蓝色光效 + 音效 |
| 传说 | 金色光效 + 特殊音效 + 屏幕震动 |

### 音频需求

| 音效 | 触发时机 |
|------|---------|
| `gathering_start` | 开始采集 |
| `gathering_complete` | 采集完成 |
| `gathering_rare` | 稀有掉落 |
| `gathering_legendary` | 传说掉落 |
| `gathering_cooldown` | 点击冷却中的采集点 |

## UI Requirements

### 采集点交互

```
点击可用采集点:
┌─────────────────────────────────┐
│  🌿 竹林                         │
│                                 │
│  消耗体力: 5                     │
│  可能获得: 竹叶、竹笋、(稀有)竹荪 │
│                                 │
│      [采集]        [取消]       │
└─────────────────────────────────┘
```

### 采集结果

```
┌─────────────────────────────────┐
│        采集完成！                │
│                                 │
│  获得:                          │
│  🍃 竹叶 x3                      │
│  🎋 竹笋 x1                      │
│                                 │
│          [确定]                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 点击采集点正确消耗体力
- [ ] 材料正确添加到背包
- [ ] 冷却时间正确计算
- [ ] 季节限制正确生效
- [ ] 时段限制正确生效
- [ ] 保底机制正确触发
- [ ] 体力不足时阻止采集

**事件测试**:
- [ ] 采集完成时发布 `gathering:completed`
- [ ] 稀有掉落时发布 `gathering:rare_drop`
- [ ] 传说掉落时发布 `gathering:legendary_drop`

**性能测试**:
- [ ] 掉落计算 < 10ms
- [ ] 内存占用 < 5KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否需要采集工具系统？ | 设计者 | Alpha阶段 | 暂不需要 |
| 是否需要采集技能升级？ | 设计者 | Beta阶段 | 暂不需要 |

## Implementation Notes

```typescript
interface MaterialDrop {
    materialId: string;
    weight: number;
    minAmount: number;
    maxAmount: number;
    seasonRestriction: Season[];
    timeRestriction: Period[];
}

interface GatheringSpot {
    id: string;
    name: string;
    locationId: string;
    materials: MaterialDrop[];
    cooldown: number;
    staminaCost: number;
    unlockCondition: string;
}

interface GatheringSpotState {
    spotId: string;
    lastGatherTime: number;
    pityCounter: number;
}

class GatheringManager {
    private spots: Map<string, GatheringSpot>;
    private spotStates: Map<string, GatheringSpotState>;
    private backpackSystem: BackpackManager;
    private staminaSystem: StaminaManager;
    private timeSystem: TimeManager;
    private eventSystem: EventSystem;

    gather(spotId: string): GatheringResult;
    isAvailable(spotId: string): boolean;
    getRemainingCooldown(spotId: string): number;
    private calculateDrop(spot: GatheringSpot): MaterialDrop[];
}
```