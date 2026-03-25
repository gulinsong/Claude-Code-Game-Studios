# QA Test Plan - 岁时记 (Suìshí Jì)

**Version**: MVP 0.1.0
**Platform**: 微信小游戏
**Last Updated**: 2026-03-25

---

## 1. Test Scope

### In Scope
- 16 MVP 系统功能测试
- 存档/读档流程
- 微信登录集成
- UI 响应和导航
- 核心游戏循环 (采集 → 手工艺 → 节日筹备)

### Out of Scope (Alpha/Beta)
- 社交系统
- 内购系统
- 装饰/服装系统
- 多语言切换 (英语)

---

## 2. Test Environment

| Environment | Purpose | Status |
|-------------|---------|--------|
| 微信开发者工具 | 开发调试 | ✅ Ready |
| 真机 iOS | 兼容性测试 | ⬜ Pending |
| 真机 Android | 兼容性测试 | ⬜ Pending |
| 性能测试环境 | 帧率/内存测试 | ⬜ Pending |

---

## 3. Functional Test Cases

### 3.1 时间系统 (TimeSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-TIME-001 | 游戏启动时从存档恢复时间 | 正确恢复到上次保存的时间 | High | ⬜ |
| TC-TIME-002 | 时间推进（每秒游戏时间） | 时间按配置速度推进 | High | ⬜ |
| TC-TIME-003 | 季节切换 | 到达季节末尾时正确切换 | High | ⬜ |
| TC-TIME-004 | 节日触发 | 在正确日期触发节日 | High | ⬜ |
| TC-TIME-005 | 暂停/恢复 | 暂停后时间停止推进 | Medium | ⬜ |
| TC-TIME-006 | 无效 deltaMs 处理 | 传入负数/NaN 时安全忽略 | Medium | ⬜ |

### 3.2 背包系统 (BackpackSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-BP-001 | 添加物品 | 物品正确添加到背包 | High | ⬜ |
| TC-BP-002 | 背包满时添加 | 返回 false，不崩溃 | High | ⬜ |
| TC-BP-003 | 移除物品 | 物品正确移除 | High | ⬜ |
| TC-BP-004 | 堆叠物品 | 相同物品正确堆叠 | High | ⬜ |
| TC-BP-005 | 容量升级 | 扩容后可容纳更多物品 | Medium | ⬜ |
| TC-BP-006 | 存档/读档 | 背包状态正确保存恢复 | High | ⬜ |

### 3.3 体力系统 (StaminaSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-STAM-001 | 消耗体力 | 正确扣减体力值 | High | ⬜ |
| TC-STAM-002 | 体力不足时行动 | 返回 false，行动失败 | High | ⬜ |
| TC-STAM-003 | 自然恢复 | 每分钟恢复配置量 | High | ⬜ |
| TC-STAM-004 | 物品恢复 | 使用物品恢复体力 | High | ⬜ |
| TC-STAM-005 | 体力溢出 | 恢复后不超过上限 | Medium | ⬜ |

### 3.4 采集系统 (GatheringSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-GATH-001 | 采集点刷新 | 采集后冷却时间正确 | High | ⬜ |
| TC-GATH-002 | 体力消耗 | 采集消耗正确体力 | High | ⬜ |
| TC-GATH-003 | 掉落物品 | 按权重掉落正确物品 | High | ⬜ |
| TC-GATH-004 | 背包满时采集 | 无法采集，提示背包满 | High | ⬜ |
| TC-GATH-005 | 错误处理 | 异常情况优雅降级 | Medium | ⬜ |

### 3.5 手工艺系统 (CraftingSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-CRAFT-001 | 开始制作 | 正确进入迷你游戏 | High | ⬜ |
| TC-CRAFT-002 | 材料消耗 | 制作成功后消耗材料 | High | ⬜ |
| TC-CRAFT-003 | 材料不足 | 无法开始制作 | High | ⬜ |
| TC-CRAFT-004 | 迷你游戏成功 | 获得成品 | High | ⬜ |
| TC-CRAFT-005 | 迷你游戏失败 | 材料损失或不损失 | Medium | ⬜ |
| TC-CRAFT-006 | 品质加成 | 可选材料影响品质 | Medium | ⬜ |

### 3.6 节日筹备系统 (FestivalSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-FEST-001 | 节日周期 | 节日准备期 → 节日当天 → 节后 | High | ⬜ |
| TC-FEST-002 | 任务生成 | 准备期生成筹备任务 | High | ⬜ |
| TC-FEST-003 | 任务完成奖励 | 完成任务获得奖励 | High | ⬜ |
| TC-FEST-004 | 节日评分 | 根据完成度计算评分 | Medium | ⬜ |
| TC-FEST-005 | 村民满意度 | 节日质量影响村民关系 | Medium | ⬜ |

### 3.7 对话系统 (DialogueSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-DIAL-001 | 开始对话 | 正确显示对话节点 | High | ⬜ |
| TC-DIAL-002 | 选项分支 | 选择不同选项走向不同分支 | High | ⬜ |
| TC-DIAL-003 | 条件检查 | 满足条件才能选择选项 | High | ⬜ |
| TC-DIAL-004 | 效果执行 | 对话结束后执行效果 | High | ⬜ |
| TC-DIAL-005 | 变量插值 | {time:*}, {npc:*} 正确替换 | Medium | ⬜ |
| TC-DIAL-006 | 节日触发器 | FESTIVAL_APPROACHING 正确触发 | Medium | ⬜ |

### 3.8 村民关系系统 (VillagerSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-VILL-001 | 好感度变化 | 交互后好感度正确变化 | High | ⬜ |
| TC-VILL-002 | 好感度等级 | 到达阈值升级 | High | ⬜ |
| TC-VILL-003 | 礼物赠送 | 送礼物增加好感度 | High | ⬜ |
| TC-VILL-004 | 解锁内容 | 好感度等级解锁新对话 | Medium | ⬜ |
| TC-VILL-005 | 存档恢复 | 关系状态正确保存恢复 | High | ⬜ |

### 3.9 任务系统 (QuestSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-QUEST-001 | 接受任务 | 任务添加到活跃列表 | High | ⬜ |
| TC-QUEST-002 | 目标追踪 | 正确追踪目标进度 | High | ⬜ |
| TC-QUEST-003 | 任务完成 | 完成后获得奖励 | High | ⬜ |
| TC-QUEST-004 | 任务放弃 | 从列表移除 | Medium | ⬜ |
| TC-QUEST-005 | 前置任务 | 未完成前置时无法接受 | Medium | ⬜ |

### 3.10 云存档系统 (CloudSaveSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-SAVE-001 | 本地存档 | 正确保存到本地 | High | ⬜ |
| TC-SAVE-002 | 云端同步 | 正确上传到云端 | High | ⬜ |
| TC-SAVE-003 | 冲突解决 | 提示用户选择版本 | High | ⬜ |
| TC-SAVE-004 | 离线模式 | 离线时使用本地存档 | High | ⬜ |
| TC-SAVE-005 | 存档大小 | 存档 < 50KB | Medium | ⬜ |

### 3.11 微信登录系统 (WeChatLoginSystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-WX-001 | 一键登录 | 成功获取 openid | High | ⬜ |
| TC-WX-002 | 登录失败处理 | 显示错误提示 | High | ⬜ |
| TC-WX-003 | Token 刷新 | Token 过期后自动刷新 | High | ⬜ |
| TC-WX-004 | 退出登录 | 清除本地登录状态 | Medium | ⬜ |

### 3.12 UI框架系统 (UIFramework)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-UI-001 | 打开 UI | 正确显示 UI 界面 | High | ⬜ |
| TC-UI-002 | 关闭 UI | 正确隐藏并清理 | High | ⬜ |
| TC-UI-003 | 层级管理 | 多个 UI 正确叠加 | High | ⬜ |
| TC-UI-004 | Loading 显示 | 异步操作时显示加载 | Medium | ⬜ |
| TC-UI-005 | Toast 提示 | 正确显示并自动消失 | Medium | ⬜ |

### 3.13 无障碍系统 (AccessibilitySystem)

| ID | Test Case | Expected Result | Priority | Status |
|----|-----------|-----------------|----------|--------|
| TC-ACC-001 | 文字缩放 | 50%-150% 正确缩放 | Medium | ⬜ |
| TC-ACC-002 | 色盲模式 | 颜色正确转换 | Medium | ⬜ |
| TC-ACC-003 | 高对比度 | 文字清晰可读 | Medium | ⬜ |
| TC-ACC-004 | 动画减弱 | 动画时长缩短或禁用 | Low | ⬜ |

---

## 4. Performance Test Cases

| ID | Test Case | Target | Priority | Status |
|----|-----------|--------|----------|--------|
| PERF-001 | 帧率测试 (高端) | 60 FPS | High | ⬜ |
| PERF-002 | 帧率测试 (低端) | 30 FPS | High | ⬜ |
| PERF-003 | 内存使用 | < 150MB | High | ⬜ |
| PERF-004 | Draw Calls | < 100 | High | ⬜ |
| PERF-005 | 启动时间 | < 3s | High | ⬜ |
| PERF-006 | 存档大小 | < 50KB | Medium | ⬜ |

---

## 5. Edge Case Testing

| ID | Scenario | Expected Behavior | Priority | Status |
|----|----------|-------------------|----------|--------|
| EDGE-001 | 背包满时采集 | 提示并阻止 | High | ⬜ |
| EDGE-002 | 体力为 0 时行动 | 提示并阻止 | High | ⬜ |
| EDGE-003 | 网络断开时云存档 | 使用本地存档 | High | ⬜ |
| EDGE-004 | 存档损坏 | 提示并允许重新开始 | High | ⬜ |
| EDGE-005 | 时间穿越 (修改系统时间) | 安全处理 | Medium | ⬜ |
| EDGE-006 | 长时间后台运行 | 正确恢复状态 | Medium | ⬜ |

---

## 6. Regression Checklist

每次发布前必须验证:

- [ ] 所有单元测试通过 (626+ tests)
- [ ] 游戏可启动并进入主界面
- [ ] 核心循环可完成 (采集 → 手工艺 → 节日)
- [ ] 存档/读档功能正常
- [ ] 微信登录功能正常
- [ ] 无崩溃和异常日志

---

## 7. Bug Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | 游戏崩溃、数据丢失、无法继续 | 立即修复 |
| **High** | 核心功能无法使用 | 24小时内 |
| **Medium** | 功能异常但有替代方案 | 当前Sprint |
| **Low** | 小问题、UI瑕疵 | 下个Sprint |

---

## 8. Test Execution Log

| Date | Build | Tester | Result | Notes |
|------|-------|--------|--------|-------|
| 2026-03-25 | MVP 0.1.0 | — | ⬜ Pending | 等待 Cocos Creator 构建 |

---

## 9. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | — | — | ⬜ |
| Lead Programmer | — | — | ⬜ |
| Producer | — | — | ⬜ |
