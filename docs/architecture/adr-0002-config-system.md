# ADR-0002: 配置系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》有大量可配置参数（时间倍率、堆叠上限、节日定义等）。这些配置需要：
1. 在运行时加载（支持热更新）
2. 类型安全访问
3. 跨系统共享（多个系统依赖同一配置）
4. 支持默认值回退

### Constraints
- **平台限制**: 微信小游戏环境，无法使用 Node.js 文件系统 API
- **性能要求**: 配置访问必须 O(1) 时间复杂度
- **类型安全**: TypeScript 项目需要类型推断
- **序列化**: 配置需要支持导出/导入（云存档）

### Requirements
- 支持 JSON 配置的加载和存储
- 支持泛型类型访问
- 支持配置热更新和事件通知
- 支持默认值回退
- 单例模式，全局唯一实例

## Decision

采用**单例模式 + Map 存储** 的配置管理架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    ConfigSystem (单例)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  configs: Map<string, unknown>                   │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐  │   │
│  │  │ key1     │ key2     │ key3     │ ...      │  │   │
│  │  └──────────┴──────────┴──────────┴──────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  load<T>(key, data)  ──────►  存储配置                │
│  get<T>(key)  ────────────►  获取配置（类型推断）      │
│  getOrDefault<T>(key, def) ►  获取配置（带默认值）     │
│  set<T>(key, value)  ──────►  更新配置 + 发布事件       │
└─────────────────────────────────────────────────────────┘
          │
          │ config:changed 事件
          ▼
┌─────────────────────────────────────────────────────────┐
│                    其他系统监听                          │
│  EventSystem.on('config:changed', callback)             │
└─────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
interface IConfigSystem {
    load<T>(configKey: string, configData: T): void;
    get<T>(configKey: string): T | undefined;
    getOrDefault<T>(configKey: string, defaultValue: T): T;
    has(configKey: string): boolean;
    set<T>(configKey: string, value: T): void;
    clear(): void;
    getAllKeys(): string[];
}
```

### 使用示例

```typescript
// 加载时间配置
configSystem.load('time', {
    timeScale: 60,
    daysPerSeason: 7,
    festivalPrepDays: 3
});

// 获取配置（带类型推断）
const timeConfig = configSystem.getOrDefault<TimeConfig>('time', DEFAULT_CONFIG);

// 热更新配置
configSystem.set('time.timeScale', 120);  // 触发 config:changed 事件
```

## Alternatives Considered

### Alternative 1: 硬编码配置
- **Description**: 直接在代码中定义常量
- **Pros**:
  - 实现简单
  - 无额外开销
- **Cons**:
  - 无法热更新
  - 修改需要重新部署
- **Rejection Reason**: 不符合设计文档要求"所有游戏数值必须数据驱动"

### Alternative 2: JSON 文件加载
- **Description**: 从外部 JSON 文件加载配置
- **Pros**:
  - 配置与代码分离
  - 非开发者可编辑
- **Cons**:
  - 微信小游戏资源加载复杂
  - 异步加载增加启动时间
- **Rejection Reason**: MVP 阶段优先简单实现，后续可扩展

### Alternative 3: 全局变量
- **Description**: 使用全局对象存储配置
- **Pros**:
  - 访问简单
- **Cons**:
  - 命名空间污染
  - 无类型安全
  - 难以追踪变更
- **Rejection Reason**: 不符合 TypeScript 最佳实践

## Consequences

### Positive
- 类型安全：泛型接口提供类型推断
- 统一管理：所有配置集中存储
- 事件驱动：配置变更自动通知相关系统
- 易于测试：可注入测试配置

### Negative
- 单例模式：测试时需要手动重置
- 类型擦除：内部使用 `unknown` 类型存储

### Risks
- **配置键冲突**: 不同系统使用相同键名
  - *缓解*: 使用命名空间前缀，如 `time:scale`
- **类型断言错误**: 运行时类型可能与声明不符
  - *缓解*: 添加运行时类型检查（可选）

## Performance Implications
- **CPU**: O(1) Map 访问
- **Memory**: < 10KB（100 个配置项）
- **Load Time**: 无影响（内存存储）

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 单例模式正确实现
- [x] 泛型接口类型安全
- [x] 配置变更发布事件
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [配置系统设计文档](../../design/gdd/config-system.md)
