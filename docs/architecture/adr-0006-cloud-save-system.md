# ADR-0006: 云存档系统架构

## Status
Accepted

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》需要在微信小游戏环境中保存玩家进度。需要一个存档系统来：
1. 持久化所有游戏状态（背包、时间、体力、任务、村民关系等）
2. 支持跨设备同步（手机更换、多设备游玩）
3. 处理离线游玩后的数据冲突
4. 自动存档防止进度丢失

### Constraints
- **平台限制**: 微信小游戏，使用微信云开发
- **存储限制**: 云存储单个文件 < 10MB
- **网络限制**: 离线时需要本地存档，在线时同步
- **版本兼容**: 需要支持存档版本迁移

### Requirements
- 支持自动存档（60秒间隔）+ 手动存档 + 退出存档
- 本地 + 云端双重存储
- 冲突检测和解决策略
- 存档版本管理和迁移
- 存档大小 < 50KB

## Decision

采用**本地优先 + 云端同步 + 时间戳冲突解决** 的存档架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CloudSaveSystem (单例)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  状态机: CloudSaveState                                      │   │
│  │  IDLE → SAVING → IDLE                                        │   │
│  │  IDLE → LOADING → IDLE                                       │   │
│  │  IDLE → CONFLICT → (用户选择) → LOADING/SAVING               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  save(type) ──► 序列化 ──► 本地存储 ──► 云端上传                   │
│  load() ──────► 云端下载 ──► 冲突检测 ──► 解冲突 ──► 反序列化      │
└─────────────────────────────────────────────────────────────────────┘
          │
          │ 微信云开发 API
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WeChat Cloud Storage                             │
│  wx.cloud.uploadFile() / wx.cloud.downloadFile()                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. 存档数据结构

```typescript
interface SaveData {
    version: string;           // 存档版本号 "1.0.0"
    timestamp: number;         // 存档时间戳（毫秒）
    type: SaveType;            // 'auto' | 'manual' | 'exit'
    playerData: PlayerData;    // 玩家基础信息
    inventoryData: BackpackData;     // 背包
    timeData: TimeState;             // 时间系统
    staminaData: StaminaData;        // 体力系统
    questData: QuestSystemData;      // 任务系统
    villagerData: VillagerSystemData;// 村民关系
    festivalData: FestivalSystemData;// 节日进度
    recipeData: RecipeSystemData;    // 食谱进度
    authData: WeChatLoginSystemData; // 登录信息
    settings: GameSettings;          // 游戏设置
}
```

**设计要点**:
- 所有系统实现 `exportData()` / `importData()` 接口
- 版本号用于未来迁移
- 时间戳用于冲突检测

#### 2. 冲突解决策略

```typescript
const SAVE_CONFIG = {
    CONFLICT_THRESHOLD: 5 * 60 * 1000,  // 5 分钟阈值
};

// 冲突检测逻辑
if (Math.abs(localTime - cloudTime) < CONFLICT_THRESHOLD) {
    // 时间接近：使用较新的存档
    return cloudTime > localTime ? 'cloud' : 'local';
} else {
    // 时间差异大：提示用户选择
    emit('sync:conflict', { localTime, cloudTime });
    return 'manual';
}
```

**冲突解决规则**:
1. **时间接近 (< 5分钟)**: 自动选择较新的存档
2. **时间差异大**: 提示用户选择（本地/云端）
3. **首次同步**: 使用当前存档

#### 3. 自动存档策略

```typescript
const SAVE_CONFIG = {
    AUTO_SAVE_INTERVAL: 60000,  // 60 秒
};

// 自动存档触发条件
- 定时器：每 60 秒
- 事件驱动：重要操作后（完成任务、制作成功等）
- 退出游戏：`wx.onHide()` 触发
```

#### 4. 版本迁移

```typescript
interface Migration {
    fromVersion: string;
    toVersion: string;
    migrate(data: SaveData): SaveData;
}

// 迁移链
const migrations: Migration[] = [
    { fromVersion: '1.0.0', toVersion: '1.1.0', migrate: v100ToV110 },
    { fromVersion: '1.1.0', toVersion: '1.2.0', migrate: v110ToV120 },
    // ...
];
```

**迁移原则**:
- 向后兼容：新版本能读取旧存档
- 逐级迁移：1.0.0 → 1.1.0 → 1.2.0
- 默认值填充：新增字段使用默认值

### Key Interfaces

```typescript
interface ICloudSaveSystem {
    save(type: SaveType): Promise<boolean>;
    load(): Promise<SaveData | null>;
    deleteSave(): Promise<boolean>;
    hasLocalSave(): boolean;
    hasCloudSave(): Promise<boolean>;
    getConflictInfo(): ConflictInfo | null;
    resolveConflict(choice: 'local' | 'cloud'): Promise<boolean>;
    exportData(): SaveData;
    importData(data: SaveData): boolean;
}
```

## Alternatives Considered

### Alternative 1: 仅本地存储
- **Description**: 只使用 `wx.setStorageSync()` 本地存储
- **Pros**:
  - 实现简单
  - 无网络依赖
- **Cons**:
  - 更换设备丢失进度
  - 卸载重装丢失进度
- **Rejection Reason**: 跨设备同步是微信小游戏的标准功能，玩家期望

### Alternative 2: 仅云端存储
- **Description**: 只使用云端存储，不保存本地
- **Pros**:
  - 数据一致
  - 无冲突问题
- **Cons**:
  - 离线无法游玩
  - 每次操作需要网络请求
- **Rejection Reason**: 离线游玩是微信小游戏的重要体验

### Alternative 3: 增量同步
- **Description**: 只同步变更的数据
- **Pros**:
  - 减少数据传输
- **Cons**:
  - 实现复杂
  - 需要追踪所有变更
  - 冲突解决更复杂
- **Rejection Reason**: 存档 < 50KB，全量同步足够快

### Alternative 4: 服务器权威
- **Description**: 所有数据存储在服务器，客户端只是显示
- **Pros**:
  - 数据安全
  - 防作弊
- **Cons**:
  - 需要自建服务器
  - 增加运营成本
  - 离线无法游玩
- **Rejection Reason**: 微信云开发提供免费额度，MVP 阶段无需自建服务器

## Consequences

### Positive
- 数据安全：本地 + 云端双重备份
- 跨设备：更换手机不丢失进度
- 离线支持：无网络时仍可游玩
- 自动化：自动存档防止进度丢失

### Negative
- 复杂度：冲突检测和解决增加代码复杂度
- 依赖微信：需要微信云开发环境

### Risks
- **云存储配额**: 微信云开发免费额度有限
  - *缓解*: 存档压缩，控制大小 < 50KB
- **网络故障**: 云端同步失败
  - *缓解*: 本地存档兜底，下次启动重试
- **版本不兼容**: 大版本更新后旧存档无法使用
  - *缓解*: 迁移脚本自动转换

## Performance Implications
- **CPU**: 序列化/反序列化 < 50ms
- **Memory**: 存档数据 < 50KB
- **Network**: 云端同步 < 2s（正常网络）
- **Storage**: 本地 + 云端各 < 50KB

## Migration Plan
不适用 — 这是新项目的架构决策

## Validation Criteria
- [x] 自动存档正常工作
- [x] 手动存档/读档正常
- [x] 冲突检测正确触发
- [x] 存档大小 < 50KB
- [x] 单元测试覆盖率 > 80%

## Related Decisions
- [ADR-0001: 事件驱动架构](adr-0001-event-driven-architecture.md)
- [ADR-0008: 微信登录系统](adr-0008-wechat-login-system.md)
- [云存档系统设计文档](../../design/gdd/cloud-save-system.md)
