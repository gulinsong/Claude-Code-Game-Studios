# Sprint 8 -- 2026-03-25 to 2026-03-31

## Sprint Goal

**实现微信登录系统** — 账号基础设施，为云存档、社交、内购提供身份认证。

## Capacity

| 项目 | 数值 |
|------|------|
| 总天数 | 7 天 |
| 缓冲（20%）| 1.4 天 |
| 可用天数 | ~5.5 天 |

## Tasks

### Must Have (Critical Path)

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T1 | WeChatLoginSystem 核心逻辑 | 1 | Sprint 007 | 登录流程、状态管理、Token 管理 | ✅ Complete |
| T2 | WeChatLoginSystem 单元测试 | 0.5 | T1 | 覆盖所有核心逻辑 | ✅ Complete |
| T3 | 微信 API 抽象层 | 0.5 | T1 | wx.login, wx.getUserProfile 抽象 | ✅ Complete |
| T4 | Token 管理系统 | 0.5 | T1 | 过期检测、自动刷新 | ✅ Complete |

### Should Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T5 | 授权弹窗逻辑 | 0.5 | T1 | 获取用户信息授权 | ✅ Complete |
| T6 | 错误处理 | 0.5 | T1 | 网络失败、拒绝授权处理 | ✅ Complete |

### Nice to Have

| ID | Task | Est. Days | Dependencies | Acceptance Criteria | Status |
|----|------|-----------|-------------|-------------------|--------|
| T7 | 微信登录系统 ADR | 0.5 | T1 | 架构决策记录 | ⬜ Pending |

## Carryover from Previous Sprint

- [ ] Web 预览可运行（需要 Cocos Creator 环境）

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 微信 API 模拟困难 | Medium | Medium | 使用接口抽象，测试环境注入 mock |
| 网络请求测试 | Medium | Low | 使用 mock 服务器 |

## Dependencies on External Factors

- 微信小程序 API（需要抽象层）
- 服务器接口（需要 mock）

## Definition of Done for this Sprint

- [x] T1-T6 全部完成
- [x] WeChatLoginSystem 单元测试通过（39 个测试）
- [x] 代码通过 TypeScript 编译
- [x] 所有测试通过（485 个测试）
- [x] 登录流程正确
- [x] Token 管理正确
- [x] 错误处理正确

## Progress Log

### 2026-03-25 - Sprint Day 1

- 冲刺计划创建
- ✅ T1 完成：WeChatLoginSystem 核心逻辑实现（src/platform/WeChatLoginSystem.ts）
  - 登录流程、状态管理、Token 管理
  - 5 种状态：NOT_LOGGED_IN, LOGGING_IN, LOGGED_IN, LOGIN_FAILED, TOKEN_EXPIRED
  - 微信 API 抽象层：IWeChatAPI, IServerAPI, IStorage
- ✅ T2 完成：39 个单元测试全部通过
- ✅ T3 完成：微信 API 抽象层
  - wx.login(), wx.getUserProfile(), wx.checkSession() 抽象
  - 服务器 API 抽象
  - 存储接口抽象
- ✅ T4 完成：Token 管理系统
  - 7 天有效期
  - 1 天刷新阈值
  - 10 秒登录超时
- ✅ T5 完成：授权弹窗逻辑
  - 获取用户信息授权
  - 默认昵称"旅行者"
- ✅ T6 完成：错误处理
  - 网络失败处理
  - 拒绝授权处理
  - 登录超时处理
- ✅ 所有测试通过：485 个测试（15 个测试套件）

### Sprint 008 完成 ✅

---

## Technical Notes

### 登录状态

```
NotLoggedIn → LoggingIn → LoggedIn
                  ↓
              LoginFailed
                  ↓
              TokenExpired → Refreshing → LoggedIn
```

### Token 管理

| 参数 | 值 |
|------|-----|
| Token 有效期 | 7 天 |
| 刷新阈值 | 1 天 |
| 登录超时 | 10 秒 |
| 最大重试次数 | 3 |

### 事件定义

| 事件ID | Payload |
|--------|---------|
| `auth:login_started` | `{ }` |
| `auth:login_success` | `{ openid, nickname }` |
| `auth:login_failed` | `{ error }` |
| `auth:token_refreshed` | `{ }` |
| `auth:logout` | `{ }` |

### 微信 API 抽象

```typescript
interface IWeChatAPI {
    login(): Promise<WeChatLoginResult>;
    getUserProfile(): Promise<WeChatUserProfile>;
    checkSession(): Promise<boolean>;
}
```
