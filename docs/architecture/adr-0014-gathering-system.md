# ADR-0014: 采集系统 (Gathering System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要让玩家通过采集点获取材料。不同区域、时段、季节应有不同的产出，并且采集需要消耗体力、有冷却时间。

### Constraints
- **平台限制**: 微信小游戏，需要考虑离线冷却计算
- **资源平衡**: 采集需要消耗体力，控制资源获取速度
- **时间关联**: 产出与游戏内时间和季节相关
- **存档支持**: 采集点状态需要持久化

### Requirements
- 定义采集点（位置、产出、冷却、体力消耗）
- 支持多种材料产出（权重随机）
- 支持季节/时段限制
- 支持冷却机制
- 支持解锁条件
- 支持保底机制（可选）

## Decision

采用**采集点配置 + 权重掉落 + 冷却追踪**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      GatheringSystem                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ SpotRegistry    │  │ SpotStates                          │  │
│  │ (采集点配置)     │  │ Map<string, SpotRuntimeState>       │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Dependencies:                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ BackpackSys │  │ StaminaSys  │  │ TimeSystem              │ │
│  │ (添加材料)   │  │ (消耗体力)   │  │ (季节/时段检查)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
/**
 * 材料掉落配置
 */
interface MaterialDrop {
    materialId: string;
    weight: number;           // 权重（用于概率计算）
    minAmount: number;
    maxAmount: number;
    seasonRestriction: Season[];  // 空=不限
    timeRestriction: Period[];    // 空=不限
}

/**
 * 采集点配置
 */
interface GatheringSpot {
    id: string;
    name: string;
    locationId: string;
    materials: MaterialDrop[];
    cooldown: number;         // 冷却时间（秒）
    staminaCost: number;
    unlockCondition: string;
}

/**
 * 采集点状态
 */
enum GatheringSpotState {
    AVAILABLE = 'AVAILABLE',
    COOLDOWN = 'COOLDOWN',
    LOCKED = 'LOCKED'
}

/**
 * 采集点运行时状态
 */
interface SpotRuntimeState {
    spotId: string;
    lastGatherTime: number;   // 上次采集时间戳
    pityCounter: number;      // 保底计数
}

/**
 * 采集结果
 */
interface GatheringResult {
    success: boolean;
    materials?: { id: string; amount: number }[];
    staminaRemaining?: number;
    cooldownEnd?: number;
    error?: string;
}
```

### 掉落算法

```typescript
private calculateDrop(spot: GatheringSpot): { id: string; amount: number }[] {
    const currentTime = this.timeSystem.getCurrentTime();
    const results: { id: string; amount: number }[] = [];

    // 过滤当前可用的材料
    const availableDrops = spot.materials.filter(drop => {
        // 季节检查
        if (drop.seasonRestriction.length > 0 &&
            !drop.seasonRestriction.includes(currentTime.season)) {
            return false;
        }
        // 时段检查
        if (drop.timeRestriction.length > 0 &&
            !drop.timeRestriction.includes(currentTime.period)) {
            return false;
        }
        return true;
    });

    // 权重随机选择
    const totalWeight = availableDrops.reduce((sum, d) => sum + d.weight, 0);
    let random = Math.random() * totalWeight;

    for (const drop of availableDrops) {
        random -= drop.weight;
        if (random <= 0) {
            const amount = Math.floor(
                Math.random() * (drop.maxAmount - drop.minAmount + 1)
            ) + drop.minAmount;
            results.push({ id: drop.materialId, amount });
            break;
        }
    }

    return results;
}
```

## Alternatives Considered

### 1. 固定产出
**方案**: 每个采集点固定产出特定材料。

**优点**: 简单可预测。

**缺点**:
- 缺乏惊喜感
- 无需玩家规划

**结论**: 不采用，随机产出更有趣。

### 2. 无冷却机制
**方案**: 采集点可无限采集，只受体力限制。

**优点**: 玩家可连续采集。

**缺点**:
- 资源获取过快
- 破坏游戏经济

**结论**: 不采用，冷却机制是必要的平衡手段。

### 3. 服务器控制掉落
**方案**: 掉落结果由服务器计算。

**优点**: 防止作弊。

**缺点**:
- 需要网络连接
- 增加服务器负载

**结论**: 暂不采用，单机体验优先。

## Consequences

### Positive
- **时间关联**: 季节和时段影响产出，增加策略性
- **资源平衡**: 冷却和体力消耗控制资源获取速度
- **惊喜感**: 随机掉落增加采集乐趣
- **离线友好**: 冷却基于时间戳，支持离线计算

### Negative
- **配置复杂度**: 采集点配置需要详细设计
- **随机性**: 玩家可能连续获得不满意的结果

### Risks
- **资源通胀**: 如果掉落率过高，可能破坏游戏经济
- **挫败感**: 长时间得不到想要材料

## Implementation Notes

### 采集流程

```typescript
async gather(spotId: string): Promise<GatheringResult> {
    // 1. 检查采集点状态
    const spot = this.getSpot(spotId);
    if (!spot) {
        return { success: false, error: 'spot_not_found' };
    }

    if (this.getState(spotId) === GatheringSpotState.LOCKED) {
        return { success: false, error: 'spot_locked' };
    }

    if (this.getState(spotId) === GatheringSpotState.COOLDOWN) {
        return { success: false, error: 'on_cooldown' };
    }

    // 2. 检查并消耗体力
    const staminaResult = this.staminaSystem.consume(
        spot.staminaCost,
        'gathering'
    );
    if (!staminaResult.success) {
        return { success: false, error: 'not_enough_stamina' };
    }

    // 3. 计算掉落
    const materials = this.calculateDrop(spot);

    // 4. 添加到背包
    for (const item of materials) {
        this.backpackSystem.addItem(item.id, item.amount);
    }

    // 5. 更新冷却
    this.updateCooldown(spotId);

    // 6. 发送事件
    this.eventSystem.emit(GatheringEvents.COMPLETED, {
        spotId,
        materials,
        staminaRemaining: staminaResult.remaining
    });

    return {
        success: true,
        materials,
        staminaRemaining: staminaResult.remaining,
        cooldownEnd: Date.now() + spot.cooldown * 1000
    };
}
```

### 状态查询（懒计算）

```typescript
getState(spotId: string): GatheringSpotState {
    // 检查解锁
    if (!this.checkUnlock(spotId)) {
        return GatheringSpotState.LOCKED;
    }

    // 检查冷却（懒计算）
    const state = this.spotStates.get(spotId);
    if (state) {
        const elapsed = (Date.now() - state.lastGatherTime) / 1000;
        const spot = this.getSpot(spotId);
        if (elapsed < spot.cooldown) {
            return GatheringSpotState.COOLDOWN;
        }
    }

    return GatheringSpotState.AVAILABLE;
}
```

### 存档数据

```typescript
interface GatheringSaveData {
    spotStates: SpotRuntimeState[];
}
```

## Related Systems

- **EventSystem**: 采集事件发布
- **BackpackSystem**: 材料添加
- **StaminaSystem**: 体力消耗
- **TimeSystem**: 季节/时段检查
- **MaterialSystem**: 材料定义引用
- **CloudSaveSystem**: 采集点状态持久化
