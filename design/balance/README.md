# Balance Data Configuration

游戏平衡数据配置目录。所有数值通过外部 JSON 文件配置，支持热更新和 A/B 测试。

## 配置文件

| 文件 | 用途 | 关联系统 |
|------|------|----------|
| `economy.json` | 经济系统：货币、定价、奖励 | EconomySystem |
| `stamina.json` | 体力系统：恢复、消耗、上限 | StaminaSystem |
| `gathering.json` | 采集系统：采集点、掉落、冷却 | GatheringSystem |
| `crafting.json` | 制作系统：配方、材料、时间 | CraftingSystem |
| `festival.json` | 节日系统：节日定义、任务、奖励 | FestivalSystem |
| `villager.json` | 村民系统：好感度、性格、偏好 | VillagerSystem |

## 配置原则

### 数据驱动
- 所有游戏数值必须来自配置文件
- 代码中禁止硬编码平衡数值
- 配置变更不需要重新编译

### 版本控制
- 每个配置文件包含 `version` 字段
- 配置变更需要更新版本号
- 重大变更需要迁移计划

### 验证
- 配置文件使用 JSON Schema 验证
- 加载时检查必填字段
- 数值范围校验

## 配置示例

### 体力恢复
```json
{
  "recovery": {
    "intervalMinutes": 3,
    "amountPerInterval": 1
  }
}
```
→ 每 3 分钟恢复 1 点体力

### 采集掉落
```json
{
  "materials": [
    { "materialId": "herb", "weight": 50, "minAmount": 1, "maxAmount": 3 }
  ]
}
```
→ 50% 权重，产出 1-3 个

### 好感度奖励
```json
{
  "friendshipSources": {
    "giftLike": 10,
    "dailyFirstTalk": 2
  }
}
```
→ 喜欢的礼物 +10，每日首次对话 +2

## 修改流程

1. **修改配置文件**
2. **更新版本号**
3. **运行测试验证**
4. **提交 PR**
5. **Playtest 验证**

## 相关文档

- [ADR-0002: 配置系统架构](../../docs/architecture/adr-0002-config-system.md)
- [ADR-0011: 体力系统](../../docs/architecture/adr-0011-stamina-system.md)
- [ADR-0014: 采集系统](../../docs/architecture/adr-0014-gathering-system.md)
- [ADR-0007: 节日系统](../../docs/architecture/adr-0007-festival-system.md)
- [ADR-0008: 村民系统](../../docs/architecture/adr-0008-villager-system.md)
