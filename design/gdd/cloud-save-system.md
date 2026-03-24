# 云存档系统 (Cloud Save System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 持久化 — 跨设备同步游戏进度

## Overview

云存档系统是《岁时记》的**数据持久化层**，负责保存和恢复玩家的游戏进度。使用微信云开发的云存储能力，实现跨设备同步。玩家可以在不同设备上无缝继续游戏。

存档采用**自动存档 + 手动存档**模式——关键事件自动触发存档，玩家也可手动存档。存档数据与 openid 关联，登录后自动恢复。

玩家**间接与云存档系统交互**——自动存档在后台进行，手动存档通过设置菜单触发。存档失败时会有提示。

此系统是**持久化层基础设施**，保证玩家进度不丢失。

## Player Fantasy

**直接体验**：
- **安全感**：进度自动保存，不用担心丢失
- **便捷感**：换设备后自动恢复进度
- **控制感**：可以手动存档和读档

**存档流程情感设计**：

| Stage | Player Feeling |
|-------|---------------|
| 自动存档 | 无感知，游戏不中断 |
| 手动存档 | 确认，看到存档成功提示 |
| 读档恢复 | 期待，进度回来了 |
| 存档冲突 | 困惑，需要选择保留哪个 |

## Detailed Design

### Core Rules

1. **存档数据结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `version` | string | 存档版本号 |
| `timestamp` | timestamp | 存档时间 |
| `playerData` | object | 玩家基础数据 |
| `inventoryData` | object | 背包数据 |
| `timeData` | object | 时间系统数据 |
| `staminaData` | object | 体力系统数据 |
| `questData` | object | 任务数据 |
| `villagerData` | object | 村民关系数据 |
| `festivalData` | object | 节日数据 |
| `recipeData` | object | 食谱数据 |
| `settings` | object | 游戏设置 |

2. **自动存档触发条件**

| 触发事件 | 存档范围 |
|---------|---------|
| 完成任务 | 任务数据 |
| 获得物品 | 背包数据 |
| 村民好感度变化 | 村民数据 |
| 节日完成 | 节日数据 |
| 离开游戏 | 全量存档 |
| 切换场景 | 全量存档 |

3. **存档流程**

```
1. 收集需要存档的数据
2. 序列化为 JSON
3. 压缩数据（可选）
4. 上传到云存储
5. 记录本地存档时间戳
6. 发布存档事件
```

4. **读档流程**

```
1. 检查本地是否有存档
2. 检查云端是否有存档
3. 比较时间戳，选择最新的
4. 如有冲突，提示用户选择
5. 下载存档数据
6. 解析并恢复各系统状态
7. 发布读档事件
```

5. **存档冲突处理**
- 比较本地和云端存档的时间戳
- 如果时间差 < 5分钟：使用云端的（防止多设备冲突）
- 如果时间差 > 5分钟：提示用户选择

### States and Transitions

**存档系统状态**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Idle** | 默认 | 触发存档/读档 | 无操作 |
| **Saving** | 触发存档 | 存档完成/失败 | 上传数据 |
| **Loading** | 触发读档 | 读档完成/失败 | 下载数据 |
| **Conflict** | 存档冲突 | 用户选择 | 等待用户选择 |

**状态转换图**：
```
Idle ←→ Saving → Idle
  ↑         ↓
  └── Loading ← Conflict
```

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **微信登录系统** | 获取身份 | 登录 → 存档 | 存档与 openid 关联 |
| **背包系统** | 导出/导入数据 | 存档 ↔ 背包 | 保存背包数据 |
| **时间系统** | 导出/导入数据 | 存档 ↔ 时间 | 保存时间数据 |
| **体力系统** | 导出/导入数据 | 存档 ↔ 体力 | 保存体力数据 |
| **任务系统** | 导出/导入数据 | 存档 ↔ 任务 | 保存任务数据 |
| **村民关系系统** | 导出/导入数据 | 存档 ↔ 村民 | 保存关系数据 |
| **节日筹备系统** | 导出/导入数据 | 存档 ↔ 节日 | 保存节日数据 |
| **食谱系统** | 导出/导入数据 | 存档 ↔ 食谱 | 保存解锁状态 |
| **事件系统** | 发布事件 | 存档 → 事件 | 发布存档事件 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `save:started` | `{ type }` | 开始存档 |
| `save:completed` | `{ timestamp }` | 存档完成 |
| `save:failed` | `{ error }` | 存档失败 |
| `load:started` | `{ }` | 开始读档 |
| `load:completed` | `{ timestamp }` | 读档完成 |
| `load:failed` | `{ error }` | 读档失败 |
| `save:conflict` | `{ localTime, cloudTime }` | 存档冲突 |

## Formulas

### 1. 存档大小估算

```
saveSize = version.length + timestamp + sum(systemDataSize)
totalSize ≈ 10-50KB
```

| System | Est. Size |
|--------|-----------|
| 玩家基础数据 | ~1KB |
| 背包数据 | ~5KB |
| 时间数据 | ~0.5KB |
| 体力数据 | ~0.5KB |
| 任务数据 | ~5KB |
| 村民数据 | ~5KB |
| 节日数据 | ~2KB |
| 食谱数据 | ~3KB |
| 设置 | ~1KB |
| **总计** | **~25KB** |

### 2. 存档冲突判断

```
timeDiff = abs(localTimestamp - cloudTimestamp)
if (timeDiff < conflictThreshold):
    useCloudSave = true  // 使用云端
else:
    showConflictDialog = true
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| timeDiff | int | 0-∞ | computed | 时间差（毫秒） |
| conflictThreshold | int | 300000 | config | 冲突阈值（5分钟） |

### 3. 自动存档间隔

```
if (currentTime - lastAutoSaveTime > autoSaveInterval):
    triggerAutoSave()
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| autoSaveInterval | int | 60000 | config | 自动存档间隔（1分钟） |

**Expected output range**:
- 存档大小：10-50KB
- 存档耗时：1-5秒
- 读档耗时：1-3秒

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 首次游戏无存档 | 使用默认数据开始 | 正常新游戏流程 |
| 网络断开时存档 | 保存到本地，下次联网同步 | 离线可用 |
| 网络断开时读档 | 使用本地存档 | 离线可用 |
| 存档版本不兼容 | 尝试迁移，失败则使用默认 | 向前兼容 |
| 存档数据损坏 | 使用默认数据，记录错误 | 优雅降级 |
| 云存储配额不足 | 只保留本地存档 | 限制处理 |
| 多设备同时存档 | 后存档的覆盖，提示冲突 | 简化处理 |
| 登录失败 | 使用本地存档，提示重新登录 | 可离线游玩 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **微信登录系统** | Hard | `getOpenId()` | ✅ Designed |
| **背包系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **时间系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **体力系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **任务系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **村民关系系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **节日筹备系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **食谱系统** | Hard | `exportData()`, `importData()` | ✅ Designed |
| **事件系统** | Hard | `emit()` | ✅ Designed |

### 下游依赖者

无 — 云存档系统是终端系统

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **自动存档间隔** | 60秒 | 30-300秒 | 更少的丢失风险 | 更少的IO开销 |
| **最大存档数量** | 3 | 1-10 | 更多的回退选项 | 更少的存储空间 |
| **存档压缩** | 启用 | 启用/禁用 | 更小的存储空间 | 更快的存档速度 |
| **冲突阈值** | 5分钟 | 1-15分钟 | 更严格的冲突检测 | 更宽松的自动选择 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **存档中提示** | 显示"正在保存..." |
| **存档成功提示** | 显示"保存成功"（1秒后消失） |
| **存档失败提示** | 显示"保存失败，已保存到本地" |
| **读档进度** | 显示读档进度条 |
| **冲突弹窗** | 显示两个存档的时间和预览 |

### 存档冲突弹窗

```
┌─────────────────────────────────┐
│         存档冲突                 │
├─────────────────────────────────┤
│  检测到不同设备上的存档          │
│                                 │
│  本地存档: 2026-03-24 10:30     │
│  云端存档: 2026-03-24 10:35     │
│                                 │
│  [使用云端存档]  [使用本地存档]  │
└─────────────────────────────────┘
```

## UI Requirements

### 设置菜单存档选项

```
┌─────────────────────────────────┐
│           设 置                 │
├─────────────────────────────────┤
│  存档管理                       │
│  [立即存档]                     │
│  [从云端恢复]                   │
│  [清除本地存档]                 │
│                                 │
│  上次存档: 2026-03-24 10:30     │
│  存档大小: 25KB                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 自动存档正确触发
- [ ] 手动存档正常工作
- [ ] 读档正确恢复所有系统状态
- [ ] 存档冲突正确检测和处理
- [ ] 离线存档正常工作
- [ ] 联网后自动同步
- [ ] 存档版本迁移正确

**事件测试**:
- [ ] 存档开始发布 `save:started`
- [ ] 存档完成发布 `save:completed`
- [ ] 存档失败发布 `save:failed`
- [ ] 读档完成发布 `load:completed`

**性能测试**:
- [ ] 存档耗时 < 5秒
- [ ] 读档耗时 < 3秒
- [ ] 存档大小 < 50KB

**兼容性测试**:
- [ ] 旧版本存档可迁移
- [ ] 跨设备同步正常

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否支持多存档槽位？ | 设计者 | Beta阶段 | 不支持，单一存档 |
| 是否支持存档导出？ | 设计者 | Beta阶段 | 不支持，仅云端 |

## Implementation Notes

```typescript
interface SaveData {
    version: string;
    timestamp: number;
    playerData: PlayerData;
    inventoryData: InventoryData;
    timeData: TimeData;
    staminaData: StaminaData;
    questData: QuestData;
    villagerData: VillagerData;
    festivalData: FestivalData;
    recipeData: RecipeData;
    settings: GameSettings;
}

interface SaveMetadata {
    timestamp: number;
    size: number;
    version: string;
}

class CloudSaveManager {
    private localSave: SaveData | null;
    private cloudSave: SaveData | null;
    private wechatLogin: WeChatLoginManager;
    private eventSystem: EventSystem;

    save(type: 'auto' | 'manual'): Promise<boolean>;
    load(): Promise<SaveData>;
    sync(): Promise<boolean>;
    clearLocalSave(): void;
    hasConflict(): boolean;
    resolveConflict(useCloud: boolean): Promise<boolean>;
    exportSystemData(): SaveData;
    importSystemData(data: SaveData): void;
    migrateSaveData(oldVersion: string, data: any): SaveData;
}
```