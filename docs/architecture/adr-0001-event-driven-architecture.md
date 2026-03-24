# ADR-0001: Event驱动架构

## Status
Proposed

## Date
2026-03-24

## Context

### Problem Statement
《岁时记》有 30 个系统需要相互通信。如果每个系统直接引用其他系统，会导致高度耦合和代码难以维护。我们需要一个统一的事件分发机制来解耦系统间的通信。

### Constraints
- **平台限制**: 微信小游戏环境，内存 < 150MB
- **性能要求**: 事件分发不能造成帧率下降
- **代码复杂度**: 需要保持简单，易于理解和调试
- **序列化**: 存档系统需要序列化/反序列化存档数据

### Requirements
- 支持游戏内所有系统的事件通信
- 事件必须按优先级顺序分发
- 支持同步和异步处理（可选）
- 支持事件监听器的动态注册和移除
- 事件载荷支持任意数据类型
- 性能开销可最小化

## Decision

采用**发布-订阅模式** 作为事件分发机制。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         │  EventSystem (单例)                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  listeners        │   │  listeners        │   │  listeners        │   │  listeners        │   │  listeners        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┘   │
│  emit(event, payload) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────▶│
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  System A         │   │  System B         │   │  System C         │   │  System D         │   │  System E         │
│  callback(data)    │   │  callback(data)    │   │  callback(data)    │   │  callback(data)    │   │  callback(data)    │
└───┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

### Key Interfaces

```typescript
/**
 * 事件标识符
 */
type EventId = string;

/**
 * 事件载荷
 */
type EventPayload = any;

/**
 * 事件监听器回调
 */
type EventCallback = (payload: EventPayload) => void;

/**
 * 事件监听器
 */
interface EventListener {
    eventId: EventId;
    callback: EventCallback;
    priority: number;
    once: boolean;
}

/**
 * 事件系统接口
 */
interface IEventSystem {
    /**
     * 注册事件监听器
     */
    on(eventId: EventId, callback: EventCallback, priority?: number): void;

    /**
     * 注册一次性监听器
     */
    once(eventId: EventId, callback: EventCallback, priority?: number): void;

    /**
     * 移除事件监听器
     */
    off(eventId: EventId, callback: EventCallback): void;

    /**
     * 发布事件
     */
    emit(eventId: EventId, payload?: EventPayload): void;

    /**
     * 检查是否有监听器
     */
    hasListener(eventId: EventId): boolean;
}
```

## Alternatives Considered

### Alternative 1: 直接引用（硬耦合）
- **Description**: 每个系统直接持有其他系统的引用
- **Pros**:
  - 实现简单，  - 调用直接，性能开销小
- **Cons**:
  - 高度耦合，系统间依赖关系复杂
  - 难以测试（需要 mock 所有依赖）
  - 难以重构（修改一个系统影响多个）
- **Rejection Reason**: 不符合项目的可维护性要求，随着系统数量增加会导致代码难以维护

### Alternative 2: 全局状态管理器（单例）
- **Description**: 使用全局单例存储状态，其他系统直接读取
- **Pros**:
  - 实现简单
  - 访问状态方便
- **Cons**:
  - 隐式依赖，难以追踪数据流向
  - 状态变更难以追踪
  - 并发问题（多个系统同时修改状态）
- **Rejection Reason**: 状态管理混乱，不符合事件驱动的设计理念

### Alternative 3: RxJS / 观察者模式
- **Description**: 使用 RxJS 库实现响应式编程
- **Pros**:
  - 功能强大，支持复杂的数据流
- **Cons**:
  - 增加依赖
  - 学习曲线陡峭
  - 对于小游戏可能过重
- **Rejection Reason**: 过于复杂，不符合项目的简单性要求

## Consequences

### Positive
- 篮代码耦合度：系统间通过事件通信，互不直接引用
- 易于扩展： 新系统只需监听事件，无需修改现有代码
- 便于调试： 可以通过日志追踪事件流
- 支持序列化： 存档时可以序列化事件历史
- 易于测试: 可以通过 mock 事件系统进行单元测试

### Negative
- 调试复杂度： 异步事件流可能难以追踪
- 性能开销： 事件分发有少量开销（通常可忽略不计）
- 内存占用: 需要存储监听器列表（通常 < 100KB）

### Risks
- **事件风暴**: 大量事件同时触发可能影响性能
  - *缓解*: 使用事件节流，合并相关事件
- **内存泄漏**: 监听器未正确移除
  - *缓解*: 在组件销毁时自动移除所有监听器
- **循环依赖**: 事件处理中触发新事件可能导致无限循环
  - *缓解*: 使用事件队列，防止递归

## Performance Implications
- **CPU**: 事件分发开销 < 0.1ms（100 个监听器）
- **Memory**: < 100KB（1000 个监听器）
- **Load Time**: 无影响（系统启动时初始化）
- **Network**: 无影响（本地系统）

## Migration Plan
不适用 — 这是新项目的第一个架构决策

## Validation Criteria
- [ ] 所有系统间通信都通过事件系统
- [ ] 单元测试覆盖率 > 80%
- [ ] 事件分发时间 < 1ms
- [ ] 无内存泄漏（压力测试）
- [ ] 事件优先级排序正确

## Related Decisions
- [事件系统设计文档](../../design/gdd/event-system.md)
- [技术偏好](../../.claude/docs/technical-preferences.md)
