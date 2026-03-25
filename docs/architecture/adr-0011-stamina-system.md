# ADR-0011: 体力系统 (Stamina System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要一种机制来控制玩家的游戏节奏，防止单次游玩时间过长，同时为付费（体力恢复道具）提供合理的商业化点。体力系统需要平衡玩家体验和商业需求。

### Constraints
- **平台限制**: 微信小游戏，需要考虑离线时间计算
- **玩家体验**: 体力耗尽不应完全阻断游戏
- **商业平衡**: 体力恢复道具应有价值，但不能逼氪
- **存档支持**: 体力数据需要持久化和跨设备同步

### Requirements
- 体力上限可升级（初始 100，最高 150）
- 自然恢复机制（每 X 分钟恢复 1 点）
- 道具恢复机制（即时恢复）
- 体力状态事件通知（满、低、耗尽）
- 离线时间补偿（根据离线时长恢复体力）

## Decision

采用**时间戳 + 懒计算**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      StaminaSystem                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ StaminaData │  │ Config      │  │ TimeCalculator          │ │
│  │ - current   │  │ - maxStamina│  │ (离线恢复计算)           │ │
│  │ - max       │  │ - recovery  │  │                         │ │
│  │ - lastUpdate│  │   Interval  │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     EventSystem Integration                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ stamina:changed → UI 更新                                 │  │
│  │ stamina:exhausted → 禁止消耗操作                           │  │
│  │ stamina:low → 显示低体力警告                               │  │
│  │ stamina:restored → 显示恢复来源                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 核心算法：懒计算恢复

```typescript
/**
 * 懒计算：在需要时才计算离线恢复
 * 不依赖定时器，避免小程序后台限制
 */
get current(): number {
    const now = Date.now();
    const elapsed = now - this.data.lastUpdateTime;
    const recovered = Math.floor(
        elapsed / (this.config.recoveryIntervalMinutes * 60 * 1000)
    );

    if (recovered > 0) {
        this.data.current = Math.min(
            this.data.current + recovered,
            this.data.max
        );
        this.data.lastUpdateTime += recovered *
            this.config.recoveryIntervalMinutes * 60 * 1000;
    }

    return this.data.current;
}
```

### 状态判定

```typescript
enum StaminaState {
    FULL = 'FULL',           // current >= max
    NORMAL = 'NORMAL',       // 20% < current < max
    LOW = 'LOW',             // current <= 20%
    EXHAUSTED = 'EXHAUSTED'  // current == 0
}
```

### Key Interfaces

```typescript
/**
 * 体力数据（存档）
 */
interface StaminaData {
    current: number;      // 当前体力
    max: number;          // 体力上限
    lastUpdateTime: number; // 上次更新时间戳（毫秒）
}

/**
 * 体力事件
 */
const StaminaEvents = {
    CHANGED: 'stamina:changed',     // 体力变化
    EXHAUSTED: 'stamina:exhausted', // 体力耗尽
    FULL: 'stamina:full',           // 体力满
    LOW: 'stamina:low',             // 低体力
    RESTORED: 'stamina:restored'    // 道具恢复
};

/**
 * 消耗结果
 */
interface ConsumeResult {
    success: boolean;
    remaining: number;
    reason?: string;  // 失败原因
}
```

### 配置参数

```typescript
const STAMINA_CONFIG = {
    INITIAL_MAX_STAMINA: 100,        // 初始上限
    MAX_STAMINA_CAP: 150,            // 最大上限
    RECOVERY_INTERVAL_MINUTES: 3,    // 恢复间隔（分钟/点）
    LOW_STAMINA_THRESHOLD_PERCENT: 0.2  // 低体力阈值（20%）
};
```

## Alternatives Considered

### 1. 定时器驱动恢复
**方案**: 使用 setInterval 每分钟检查并恢复体力。

**优点**: 实时性好。

**缺点**:
- 小程序后台时定时器可能暂停
- 离线时无法计算恢复
- 持续消耗 CPU 资源

**结论**: 不采用，小程序环境限制。

### 2. 服务器时间校验
**方案**: 每次体力操作都向服务器请求当前时间。

**优点**: 防止玩家修改本地时间作弊。

**缺点**:
- 依赖网络连接
- 增加服务器负载
- 响应延迟

**结论**: 可选增强，但基础实现使用本地时间。

### 3. 固定上限不升级
**方案**: 体力上限固定为 100，不可升级。

**优点**: 简单。

**缺点**:
- 减少成长感
- 限制长期玩家体验

**结论**: 不采用，可升级上限提供更好的进度感。

## Consequences

### Positive
- **懒计算高效**: 不依赖定时器，减少资源消耗
- **离线友好**: 玩家离线期间体力自动恢复
- **商业化友好**: 体力恢复道具是合理的付费点
- **玩家体验好**: 体力耗尽不会完全阻断游戏（非核心操作仍可进行）

### Negative
- **时间依赖**: 依赖设备时间，玩家可能通过修改时间作弊
- **存档同步**: 需要正确处理跨设备存档的时间戳

### Risks
- **时间作弊**: 玩家可能修改设备时间快速恢复体力
- **存档冲突**: 跨设备存档时时间戳可能冲突

## Mitigation Strategies

### 时间作弊
1. **服务器时间校验**: 关键操作时与服务器时间对比
2. **异常检测**: 检测不合理的恢复速度
3. **宽松策略**: 对于单机体验为主的游戏，轻度作弊影响有限

### 存档冲突
1. **最后写入胜出**: 使用最新的时间戳
2. **服务器仲裁**: 云存档时使用服务器时间

## Implementation Notes

### 消耗体力

```typescript
consume(amount: number, action: string): ConsumeResult {
    const current = this.current; // 触发懒计算

    if (current < amount) {
        this.eventSystem.emit(StaminaEvents.EXHAUSTED, {
            current,
            required: amount,
            action
        });
        return { success: false, remaining: current, reason: 'not_enough' };
    }

    const old = current;
    this.data.current = current - amount;
    this.data.lastUpdateTime = Date.now();

    this.eventSystem.emit(StaminaEvents.CHANGED, {
        old,
        new: this.data.current,
        delta: -amount
    });

    // 检查低体力状态
    if (this.state === StaminaState.LOW) {
        this.eventSystem.emit(StaminaEvents.LOW, {
            current: this.data.current,
            threshold: this.data.max * LOW_STAMINA_THRESHOLD_PERCENT
        });
    }

    return { success: true, remaining: this.data.current };
}
```

### 道具恢复

```typescript
restore(amount: number, source: string): void {
    const old = this.current;
    this.data.current = Math.min(this.data.current + amount, this.data.max);
    this.data.lastUpdateTime = Date.now();

    this.eventSystem.emit(StaminaEvents.RESTORED, {
        amount: this.data.current - old,
        source
    });

    this.eventSystem.emit(StaminaEvents.CHANGED, {
        old,
        new: this.data.current,
        delta: this.data.current - old
    });

    if (this.data.current === this.data.max) {
        this.eventSystem.emit(StaminaEvents.FULL, {
            current: this.data.current
        });
    }
}
```

### 升级上限

```typescript
upgradeMax(newMax: number): boolean {
    if (newMax <= this.data.max || newMax > MAX_STAMINA_CAP) {
        return false;
    }

    this.data.max = newMax;
    // 升级时可以选择是否填满体力
    return true;
}
```

## Related Systems

- **EventSystem**: 体力事件发布/订阅
- **ConfigSystem**: 体力配置读取
- **BackpackSystem**: 体力恢复道具使用
- **GatheringSystem**: 采集消耗体力
- **CraftingSystem**: 制作消耗体力
- **CloudSaveSystem**: 体力数据持久化
