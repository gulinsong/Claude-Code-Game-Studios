# ADR-0015: 微信登录系统 (WeChat Login System)

## Status
Proposed

## Date
2026-03-25

## Context

### Problem Statement
《岁时记》作为微信小程序首发，需要集成微信登录系统。玩家应该能够使用微信一键登录，无需注册账号即可开始游戏。登录状态需要持久化，并支持 Token 刷新。

### Constraints
- **平台限制**: 必须使用微信小程序登录 API
- **用户体验**: 登录过程应该快速且无感知
- **安全性**: Token 需要安全存储，防止泄露
- **离线支持**: 短期离线时应该能继续游戏

### Requirements
- 微信一键登录（wx.login + wx.getUserProfile）
- 获取 openid/unionid 作为用户标识
- Token 管理和自动刷新
- 登录状态持久化
- 错误处理和重试机制

## Decision

采用**微信授权 + 服务器 Token 验证**架构。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    WeChatLoginSystem                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AuthState (认证状态)                                     │   │
│  │ - isLoggedIn: boolean                                    │   │
│  │ - userInfo: WeChatUserInfo | null                        │   │
│  │ - token: string | null                                   │   │
│  │ - tokenExpireTime: number | null                         │   │
│  │ - state: LoginState                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  微信 API 集成:                                                 │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ wx.login()      │  │ wx.getUserProfile()                 │  │
│  │ (获取 code)      │  │ (获取用户信息)                       │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  服务器通信:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /api/auth/login { code } → { token, userInfo }      │   │
│  │ POST /api/auth/refresh { token } → { newToken }          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 登录流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Player  │     │  Client  │     │  WeChat  │     │  Server  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  点击登录       │                │                │
     │───────────────▶│                │                │
     │                │  wx.login()    │                │
     │                │───────────────▶│                │
     │                │  code          │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │  POST /api/auth/login           │
     │                │─────────────────────────────────▶
     │                │                │                │
     │                │  { token, userInfo, openid }    │
     │                │◀─────────────────────────────────
     │                │                │                │
     │  登录成功       │                │                │
     │◀───────────────│                │                │
```

### Key Interfaces

```typescript
/**
 * 登录状态
 */
enum LoginState {
    NOT_LOGGED_IN = 'NOT_LOGGED_IN',
    LOGGING_IN = 'LOGGING_IN',
    LOGGED_IN = 'LOGGED_IN',
    LOGIN_FAILED = 'LOGIN_FAILED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    REFRESHING = 'REFRESHING'
}

/**
 * 微信用户信息
 */
interface WeChatUserInfo {
    openid: string;        // 用户唯一标识
    unionid?: string;      // 跨应用唯一标识
    nickname: string;
    avatarUrl: string;
}

/**
 * 认证状态
 */
interface AuthState {
    isLoggedIn: boolean;
    userInfo: WeChatUserInfo | null;
    token: string | null;
    tokenExpireTime: number | null;
    state: LoginState;
    lastError: string | null;
}

/**
 * 登录事件
 */
const WeChatLoginEvents = {
    LOGIN_START: 'wechat:login:start',
    LOGIN_SUCCESS: 'wechat:login:success',
    LOGIN_FAILED: 'wechat:login:failed',
    TOKEN_EXPIRED: 'wechat:token:expired',
    LOGOUT: 'wechat:logout'
};
```

## Alternatives Considered

### 1. 纯客户端登录
**方案**: 不使用服务器，openid 直接存储在本地。

**优点**: 简单，无服务器成本。

**缺点**:
- 无法验证用户身份
- 存档容易被篡改
- 无法实现跨设备同步

**结论**: 不采用，需要服务器验证。

### 2. 静默登录
**方案**: 使用 wx.login 静默获取 code，不请求用户信息。

**优点**: 完全无感知。

**缺点**:
- 无法获取用户昵称和头像
- 用户体验不完整

**结论**: 采用混合模式，首次登录请求授权，后续静默登录。

### 3. 每次启动重新登录
**方案**: 不存储 Token，每次启动都重新获取。

**优点**: 简化 Token 管理。

**缺点**:
- 启动速度慢
- 增加服务器负载

**结论**: 不采用，Token 缓存提升体验。

## Consequences

### Positive
- **一键登录**: 用户无需注册，降低门槛
- **安全验证**: 服务器端验证用户身份
- **自动刷新**: Token 过期自动刷新，无感知
- **跨设备同步**: openid 作为用户标识，支持云存档

### Negative
- **依赖微信**: 无法在非微信环境运行
- **服务器成本**: 需要维护认证服务器

### Risks
- **微信 API 变更**: 微信可能更新登录 API
- **Token 泄露**: 本地存储的 Token 可能被窃取

## Mitigation Strategies

### 微信 API 变更
- 关注微信官方更新公告
- 封装登录逻辑，便于适配

### Token 安全
- Token 设置合理过期时间
- 敏感操作需要二次验证
- 使用 HTTPS 传输

## Implementation Notes

### 登录实现

```typescript
class WeChatLoginSystem {
    private authState: AuthState;

    async login(): Promise<WeChatUserInfo> {
        this.authState.state = LoginState.LOGGING_IN;
        this.eventSystem.emit(WeChatLoginEvents.LOGIN_START);

        try {
            // 1. 获取微信 code
            const loginResult = await this.wxLogin();
            const code = loginResult.code;

            // 2. 发送到服务器换取 token
            const authResult = await this.serverLogin(code);

            // 3. 更新状态
            this.authState = {
                isLoggedIn: true,
                userInfo: authResult.userInfo,
                token: authResult.token,
                tokenExpireTime: authResult.expireTime,
                state: LoginState.LOGGED_IN,
                lastError: null
            };

            this.eventSystem.emit(WeChatLoginEvents.LOGIN_SUCCESS, {
                userInfo: authResult.userInfo
            });

            return authResult.userInfo;

        } catch (error) {
            this.authState.state = LoginState.LOGIN_FAILED;
            this.authState.lastError = error.message;

            this.eventSystem.emit(WeChatLoginEvents.LOGIN_FAILED, {
                error: error.message
            });

            throw error;
        }
    }

    private wxLogin(): Promise<WeChatLoginResult> {
        return new Promise((resolve, reject) => {
            wx.login({
                success: resolve,
                fail: reject
            });
        });
    }

    private async serverLogin(code: string): Promise<ServerAuthResult> {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
        return response.json();
    }
}
```

### Token 刷新

```typescript
async refreshToken(): Promise<void> {
    if (!this.authState.token) {
        throw new Error('No token to refresh');
    }

    this.authState.state = LoginState.REFRESHING;

    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authState.token}`
            }
        });

        const result = await response.json();

        this.authState.token = result.token;
        this.authState.tokenExpireTime = result.expireTime;
        this.authState.state = LoginState.LOGGED_IN;

    } catch (error) {
        this.authState.state = LoginState.TOKEN_EXPIRED;
        this.eventSystem.emit(WeChatLoginEvents.TOKEN_EXPIRED);
        throw error;
    }
}
```

### 自动刷新检查

```typescript
// 在每次 API 请求前检查 Token 是否即将过期
private async ensureValidToken(): Promise<void> {
    if (!this.authState.tokenExpireTime) return;

    const now = Date.now();
    const expireTime = this.authState.tokenExpireTime;

    // 提前 5 分钟刷新
    if (now > expireTime - 5 * 60 * 1000) {
        await this.refreshToken();
    }
}
```

### 存档数据

```typescript
interface WeChatLoginSaveData {
    token: string | null;
    tokenExpireTime: number | null;
    openid: string | null;
}
```

## Related Systems

- **EventSystem**: 登录事件发布
- **CloudSaveSystem**: 使用 openid 作为存档标识
- **ConfigSystem**: 服务器地址配置
