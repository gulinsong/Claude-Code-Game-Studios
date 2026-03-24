# 微信登录系统 (WeChat Login System)

> **Status**: Designed
> **Author**: User + Claude
> **Last Updated**: 2026-03-24
> **Implements Pillar**: 平台集成 — 微信小程序的账号系统

## Overview

微信登录系统是《岁时记》的**账号基础设施**，负责用户身份验证、获取用户信息、管理登录状态。使用微信小程序的一键登录能力，玩家无需注册账号即可开始游戏。

登录采用**静默登录 + 授权登录**模式——首次进入自动获取临时身份，需要昵称头像时弹窗授权。登录状态由微信管理，token 有效期内无需重复登录。

玩家**首次打开游戏时与登录系统交互**——看到授权弹窗，点击允许后进入游戏。后续登录自动完成，玩家无感知。

此系统是**平台层基础设施**，支撑云存档、社交等功能。

## Player Fantasy

**直接体验**：
- **便捷感**：一键登录，无需注册
- **安全感**：使用微信账号，可信可靠
- **无感知**：后续登录自动完成

**登录流程情感设计**：

| Stage | Player Feeling |
|-------|---------------|
| 首次打开 | 期待，想快速开始游戏 |
| 看到授权弹窗 | 理解，点击允许 |
| 进入游戏 | 满足，开始游玩 |
| 后续登录 | 无感知，直接进入 |

## Detailed Design

### Core Rules

1. **登录流程**

```
1. 检查本地是否有有效 token
2. 如有有效 token:
   a. 使用 token 恢复登录状态
   b. 进入游戏
3. 如无有效 token:
   a. 调用 wx.login() 获取 code
   b. 发送 code 到服务器换取 openid 和 session_key
   c. 存储登录凭证
   d. 检查是否需要获取用户信息
   e. 如需要，弹窗授权获取昵称头像
   f. 进入游戏
```

2. **用户数据结构**

| 属性 | 类型 | 说明 |
|------|------|------|
| `openid` | string | 用户唯一标识（微信提供） |
| `unionid` | string | 跨应用唯一标识（可选） |
| `nickname` | string | 用户昵称 |
| `avatarUrl` | string | 头像URL |
| `sessionKey` | string | 会话密钥（服务器使用） |
| `token` | string | 登录凭证 |
| `tokenExpireTime` | timestamp | token过期时间 |

3. **登录状态**

| State | Condition | Behavior |
|-------|-----------|----------|
| **NotLoggedIn** | 无有效token | 显示加载，尝试登录 |
| **LoggingIn** | 正在调用微信API | 显示加载动画 |
| **LoggedIn** | 有有效token | 正常游戏 |
| **LoginFailed** | 登录失败 | 显示错误，提供重试 |
| **TokenExpired** | token过期 | 自动刷新token |

4. **Token管理**
- Token有效期：7天
- 过期前1天自动刷新
- 刷新失败提示重新登录

5. **授权策略**
- 静默登录：只获取 openid，无需用户确认
- 授权登录：获取昵称头像，需要用户点击允许
- 首次进入只做静默登录，需要用户信息时再授权

### States and Transitions

**登录状态机**

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| **Idle** | 默认 | 调用登录 | 未登录状态 |
| **LoggingIn** | 调用 wx.login() | 登录成功/失败 | 显示加载 |
| **LoggedIn** | 登录成功 | token过期/退出登录 | 正常游戏 |
| **Refreshing** | token即将过期 | 刷新成功/失败 | 后台刷新 |
| **Failed** | 登录失败 | 重试 | 显示错误提示 |

### Interactions with Other Systems

| 系统 | 交互方式 | 数据流 | 说明 |
|------|---------|--------|------|
| **云存档系统** | 提供身份 | 登录 → 存档 | 存档与 openid 关联 |
| **社交系统** | 提供用户信息 | 登录 → 社交 | 获取好友信息 |
| **内购系统** | 提供身份 | 登录 → 内购 | 内购订单与用户关联 |
| **事件系统** | 发布事件 | 登录 → 事件 | 发布登录状态变化事件 |

**事件定义**：

| 事件ID | Payload | 触发时机 |
|--------|---------|----------|
| `auth:login_started` | `{ }` | 开始登录 |
| `auth:login_success` | `{ openid, nickname }` | 登录成功 |
| `auth:login_failed` | `{ error }` | 登录失败 |
| `auth:token_refreshed` | `{ }` | Token刷新成功 |
| `auth:logout` | `{ }` | 退出登录 |

## Formulas

### 1. Token有效期检查

```
isTokenValid = (token != null) && (currentTime < tokenExpireTime)
shouldRefresh = (tokenExpireTime - currentTime) < refreshThreshold
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| tokenExpireTime | timestamp | - | server | Token过期时间 |
| currentTime | timestamp | - | runtime | 当前时间 |
| refreshThreshold | int | 86400000 | config | 刷新阈值（1天=毫秒） |

### 2. 登录超时

```
if (loginDuration > loginTimeout):
    loginState = Failed
    error = "登录超时"
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| loginTimeout | int | 10000 | config | 登录超时时间（毫秒） |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 网络断开 | 显示"网络连接失败"，提供重试 | 优雅处理网络问题 |
| 用户拒绝授权 | 使用默认昵称头像，功能不受限 | 不强制授权 |
| Token刷新失败 | 提示重新登录 | 保证登录有效性 |
| 微信API返回错误 | 记录错误，显示通用提示 | 防止敏感信息泄露 |
| 小程序被注销 | 显示"服务暂不可用" | 处理极端情况 |
| 多设备登录 | 允许，token共享 | 微信账号唯一 |

## Dependencies

### 上游依赖

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **事件系统** | Hard | `emit(eventId, payload)` | ✅ Designed |

**微信API依赖**：
- `wx.login()` - 获取登录凭证
- `wx.getUserProfile()` - 获取用户信息
- `wx.checkSession()` - 检查session有效性

### 下游依赖者

| System | Hard/Soft | Interface | Status |
|--------|-----------|-----------|--------|
| **云存档系统** | Hard | `getOpenId()` | Not Started |
| **社交系统** | Hard | `getUserInfo()` | Not Started |
| **内购系统** | Hard | `getOpenId()` | Not Started |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| **Token有效期** | 7天 | 1-30天 | 更少的重新登录 | 更频繁的重新登录 |
| **刷新阈值** | 1天 | 0.5-3天 | 更早的刷新 | 更晚的刷新 |
| **登录超时** | 10秒 | 5-30秒 | 更长的等待时间 | 更快的失败反馈 |
| **重试次数** | 3 | 1-5 | 更多的重试机会 | 更少的重试机会 |

## Visual/Audio Requirements

### 视觉需求

| 元素 | 说明 |
|------|------|
| **加载动画** | 登录过程中显示 |
| **授权弹窗** | 获取用户信息时显示 |
| **错误提示** | 登录失败时显示 |
| **默认头像** | 未授权时使用的默认头像 |

### 授权弹窗

```
┌─────────────────────────────────┐
│                                 │
│   《岁时记》需要获取您的         │
│   昵称和头像                    │
│                                 │
│   [允许]         [拒绝]         │
│                                 │
└─────────────────────────────────┘
```

## Acceptance Criteria

**功能测试**:
- [ ] 首次登录成功获取 openid
- [ ] 授权获取昵称头像成功
- [ ] Token 存储和读取正确
- [ ] Token 过期检测正确
- [ ] Token 自动刷新正常
- [ ] 网络失败正确处理
- [ ] 拒绝授权使用默认值

**事件测试**:
- [ ] 登录开始发布 `auth:login_started`
- [ ] 登录成功发布 `auth:login_success`
- [ ] 登录失败发布 `auth:login_failed`

**性能测试**:
- [ ] 登录耗时 < 3秒（正常网络）
- [ ] 内存占用 < 1KB

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 是否支持游客模式？ | 设计者 | MVP阶段 | 不支持，必须微信登录 |
| 是否支持账号注销？ | 设计者 | Beta阶段 | 支持，符合法规要求 |

## Implementation Notes

```typescript
interface WeChatUserInfo {
    openid: string;
    unionid?: string;
    nickname: string;
    avatarUrl: string;
}

interface AuthState {
    isLoggedIn: boolean;
    userInfo: WeChatUserInfo | null;
    token: string | null;
    tokenExpireTime: number | null;
}

class WeChatLoginManager {
    private state: AuthState;
    private eventSystem: EventSystem;

    login(): Promise<WeChatUserInfo>;
    logout(): void;
    refreshToken(): Promise<boolean>;
    getUserInfo(): WeChatUserInfo | null;
    getOpenId(): string | null;
    isLoggedIn(): boolean;
    checkSession(): Promise<boolean>;
}
```