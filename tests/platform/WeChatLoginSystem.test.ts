/**
 * WeChatLoginSystem 单元测试
 */

import {
    WeChatLoginSystem,
    LoginState,
    AuthEvents,
    IWeChatAPI,
    IServerAPI,
    IStorage
} from '../../src/platform/WeChatLoginSystem';
import { EventSystem } from '../../src/core/EventSystem';

// Mock 微信 API
const createMockWeChatAPI = (): jest.Mocked<IWeChatAPI> => ({
    login: jest.fn(),
    getUserProfile: jest.fn(),
    checkSession: jest.fn()
});

// Mock 服务器 API
const createMockServerAPI = (): jest.Mocked<IServerAPI> => ({
    loginWithCode: jest.fn(),
    refreshToken: jest.fn()
});

// Mock 存储
const createMockStorage = (): jest.Mocked<IStorage> => {
    const store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; })
    };
};

// 创建有效的 Token 过期时间（7天后）
const createValidExpireTime = (): number => Date.now() + 7 * 24 * 60 * 60 * 1000;

// 创建即将过期的 Token 过期时间（12小时后）
const createExpiringSoonExpireTime = (): number => Date.now() + 12 * 60 * 60 * 1000;

// 创建已过期的 Token 过期时间
const createExpiredExpireTime = (): number => Date.now() - 1000;

describe('WeChatLoginSystem', () => {
    let loginSystem: WeChatLoginSystem;
    let eventSystem: EventSystem;
    let mockWeChatAPI: jest.Mocked<IWeChatAPI>;
    let mockServerAPI: jest.Mocked<IServerAPI>;
    let mockStorage: jest.Mocked<IStorage>;

    beforeEach(() => {
        // 重置所有单例
        WeChatLoginSystem.resetInstance();
        EventSystem.resetInstance();

        loginSystem = WeChatLoginSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 创建 mock
        mockWeChatAPI = createMockWeChatAPI();
        mockServerAPI = createMockServerAPI();
        mockStorage = createMockStorage();

        // 设置依赖
        loginSystem.setWeChatAPI(mockWeChatAPI);
        loginSystem.setServerAPI(mockServerAPI);
        loginSystem.setStorage(mockStorage);
    });

    describe('初始状态', () => {
        it('初始应该是未登录状态', () => {
            expect(loginSystem.isLoggedIn()).toBe(false);
            expect(loginSystem.getCurrentState()).toBe(LoginState.NOT_LOGGED_IN);
        });

        it('初始用户信息应该是 null', () => {
            expect(loginSystem.getUserInfo()).toBeNull();
        });

        it('初始 openid 应该是 null', () => {
            expect(loginSystem.getOpenId()).toBeNull();
        });

        it('初始 Token 应该是 null', () => {
            expect(loginSystem.getToken()).toBeNull();
        });
    });

    describe('登录流程', () => {
        it('登录成功应该返回用户信息', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            const userInfo = await loginSystem.login();

            expect(userInfo.openid).toBe('test_openid');
            expect(userInfo.nickname).toBe('旅行者'); // 默认昵称
        });

        it('登录成功应该发布 LOGIN_SUCCESS 事件', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            const handler = jest.fn();
            eventSystem.on(AuthEvents.LOGIN_SUCCESS, handler);

            await loginSystem.login();

            expect(handler).toHaveBeenCalledWith({
                openid: 'test_openid',
                nickname: '旅行者'
            });
        });

        it('登录开始应该发布 LOGIN_STARTED 事件', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            const handler = jest.fn();
            eventSystem.on(AuthEvents.LOGIN_STARTED, handler);

            await loginSystem.login();

            expect(handler).toHaveBeenCalled();
        });

        it('登录失败应该发布 LOGIN_FAILED 事件', async () => {
            mockWeChatAPI.login.mockRejectedValue(new Error('网络错误'));

            const handler = jest.fn();
            eventSystem.on(AuthEvents.LOGIN_FAILED, handler);

            await expect(loginSystem.login()).rejects.toThrow();

            expect(handler).toHaveBeenCalledWith({
                error: '网络错误'
            });
        });

        it('登录失败状态应该是 LOGIN_FAILED', async () => {
            mockWeChatAPI.login.mockRejectedValue(new Error('网络错误'));

            await expect(loginSystem.login()).rejects.toThrow();

            expect(loginSystem.getCurrentState()).toBe(LoginState.LOGIN_FAILED);
        });

        it('微信登录失败应该正确处理', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: false,
                openid: '',
                token: '',
                tokenExpireTime: 0,
                error: '服务器错误'
            });

            await expect(loginSystem.login()).rejects.toThrow('服务器错误');
        });

        it('登录中状态应该是 LOGGING_IN', async () => {
            mockWeChatAPI.login.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve({ code: 'test_code' }), 100);
            }));
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            const loginPromise = loginSystem.login();

            // 检查登录中状态
            expect(loginSystem.getCurrentState()).toBe(LoginState.LOGGING_IN);

            await loginPromise;
        });
    });

    describe('退出登录', () => {
        beforeEach(async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();
        });

        it('退出登录应该清除用户信息', () => {
            loginSystem.logout();

            expect(loginSystem.getUserInfo()).toBeNull();
            expect(loginSystem.getOpenId()).toBeNull();
        });

        it('退出登录应该清除 Token', () => {
            loginSystem.logout();

            expect(loginSystem.getToken()).toBeNull();
        });

        it('退出登录状态应该是 NOT_LOGGED_IN', () => {
            loginSystem.logout();

            expect(loginSystem.getCurrentState()).toBe(LoginState.NOT_LOGGED_IN);
        });

        it('退出登录应该发布 LOGOUT 事件', () => {
            const handler = jest.fn();
            eventSystem.on(AuthEvents.LOGOUT, handler);

            loginSystem.logout();

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('用户信息授权', () => {
        beforeEach(async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();
        });

        it('授权成功应该更新用户信息', async () => {
            mockWeChatAPI.getUserProfile.mockResolvedValue({
                nickName: '测试玩家',
                avatarUrl: 'https://example.com/avatar.png'
            });

            const profile = await loginSystem.requestUserProfile();

            expect(profile.nickName).toBe('测试玩家');
            expect(loginSystem.getUserInfo()?.nickname).toBe('测试玩家');
        });

        it('授权拒绝应该抛出错误', async () => {
            mockWeChatAPI.getUserProfile.mockRejectedValue(new Error('用户拒绝授权'));

            await expect(loginSystem.requestUserProfile()).rejects.toThrow('用户拒绝授权');
        });
    });

    describe('Token 管理', () => {
        it('有效 Token 应该返回 true', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();

            expect(loginSystem.isTokenValid()).toBe(true);
        });

        it('过期 Token 应该返回 false', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createExpiredExpireTime()
            });

            await loginSystem.login();

            expect(loginSystem.isTokenValid()).toBe(false);
        });

        it('无 Token 应该返回 false', () => {
            expect(loginSystem.isTokenValid()).toBe(false);
        });

        it('即将过期的 Token 应该需要刷新', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createExpiringSoonExpireTime()
            });

            await loginSystem.login();

            expect(loginSystem.needsRefresh()).toBe(true);
        });

        it('有效 Token 不应该需要刷新', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();

            expect(loginSystem.needsRefresh()).toBe(false);
        });
    });

    describe('Token 刷新', () => {
        beforeEach(async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'old_token',
                tokenExpireTime: createExpiringSoonExpireTime()
            });

            await loginSystem.login();
        });

        it('刷新成功应该更新 Token', async () => {
            mockServerAPI.refreshToken.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'new_token',
                tokenExpireTime: createValidExpireTime()
            });

            const result = await loginSystem.refreshToken();

            expect(result).toBe(true);
            expect(loginSystem.getToken()).toBe('new_token');
        });

        it('刷新成功应该发布 TOKEN_REFRESHED 事件', async () => {
            mockServerAPI.refreshToken.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'new_token',
                tokenExpireTime: createValidExpireTime()
            });

            const handler = jest.fn();
            eventSystem.on(AuthEvents.TOKEN_REFRESHED, handler);

            await loginSystem.refreshToken();

            expect(handler).toHaveBeenCalled();
        });

        it('刷新失败应该返回 false', async () => {
            mockServerAPI.refreshToken.mockResolvedValue({
                success: false,
                openid: '',
                token: '',
                tokenExpireTime: 0
            });

            const result = await loginSystem.refreshToken();

            expect(result).toBe(false);
        });

        it('刷新失败状态应该是 TOKEN_EXPIRED', async () => {
            mockServerAPI.refreshToken.mockRejectedValue(new Error('网络错误'));

            await loginSystem.refreshToken();

            expect(loginSystem.getCurrentState()).toBe(LoginState.TOKEN_EXPIRED);
        });
    });

    describe('会话检查', () => {
        it('会话有效应该返回 true', async () => {
            mockWeChatAPI.checkSession.mockResolvedValue(true);

            const result = await loginSystem.checkSession();

            expect(result).toBe(true);
        });

        it('会话无效应该返回 false', async () => {
            mockWeChatAPI.checkSession.mockResolvedValue(false);

            const result = await loginSystem.checkSession();

            expect(result).toBe(false);
        });

        it('检查失败应该返回 false', async () => {
            mockWeChatAPI.checkSession.mockRejectedValue(new Error('检查失败'));

            const result = await loginSystem.checkSession();

            expect(result).toBe(false);
        });
    });

    describe('存储功能', () => {
        it('登录成功应该保存到存储', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();

            expect(mockStorage.setItem).toHaveBeenCalledWith('wechat_token', 'test_token');
        });

        it('退出登录应该清除存储', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();
            loginSystem.logout();

            expect(mockStorage.removeItem).toHaveBeenCalledWith('wechat_token');
        });

        it('从存储加载有效 Token 应该自动登录', () => {
            mockStorage.getItem.mockImplementation((key: string) => {
                if (key === 'wechat_token') return 'cached_token';
                if (key === 'wechat_token_expire') return createValidExpireTime().toString();
                if (key === 'wechat_user_info') return JSON.stringify({
                    openid: 'cached_openid',
                    nickname: '缓存用户',
                    avatarUrl: ''
                });
                return null;
            });

            // 重新创建实例，触发加载
            WeChatLoginSystem.resetInstance();
            loginSystem = WeChatLoginSystem.getInstance();
            loginSystem.setStorage(mockStorage);

            expect(loginSystem.isLoggedIn()).toBe(true);
            expect(loginSystem.getOpenId()).toBe('cached_openid');
        });

        it('从存储加载过期 Token 不应该自动登录', () => {
            mockStorage.getItem.mockImplementation((key: string) => {
                if (key === 'wechat_token') return 'cached_token';
                if (key === 'wechat_token_expire') return createExpiredExpireTime().toString();
                if (key === 'wechat_user_info') return JSON.stringify({
                    openid: 'cached_openid',
                    nickname: '缓存用户',
                    avatarUrl: ''
                });
                return null;
            });

            // 重新创建实例，触发加载
            WeChatLoginSystem.resetInstance();
            loginSystem = WeChatLoginSystem.getInstance();
            loginSystem.setStorage(mockStorage);

            expect(loginSystem.isLoggedIn()).toBe(false);
        });
    });

    describe('存档功能', () => {
        it('应该正确导出和导入数据', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();

            const data = loginSystem.exportData();

            // 重置
            WeChatLoginSystem.resetInstance();
            loginSystem = WeChatLoginSystem.getInstance();

            // 导入
            loginSystem.importData(data);

            expect(loginSystem.getOpenId()).toBe('test_openid');
            expect(loginSystem.getToken()).toBe('test_token');
        });

        it('reset 应该重置所有状态', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            await loginSystem.login();
            loginSystem.reset();

            expect(loginSystem.isLoggedIn()).toBe(false);
            expect(loginSystem.getUserInfo()).toBeNull();
        });
    });

    describe('登录超时', () => {
        it('登录超时应该抛出错误', async () => {
            jest.useFakeTimers();

            mockWeChatAPI.login.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve({ code: 'test_code' }), 15000);
            }));

            const loginPromise = loginSystem.login();

            // 快进时间 11 秒（超过 10 秒超时）
            jest.advanceTimersByTime(11000);

            await expect(loginPromise).rejects.toThrow('登录超时');

            jest.useRealTimers();
        });
    });

    describe('重复登录', () => {
        it('已登录时再次登录应该返回缓存的用户信息', async () => {
            mockWeChatAPI.login.mockResolvedValue({ code: 'test_code' });
            mockServerAPI.loginWithCode.mockResolvedValue({
                success: true,
                openid: 'test_openid',
                token: 'test_token',
                tokenExpireTime: createValidExpireTime()
            });

            const userInfo1 = await loginSystem.login();
            const userInfo2 = await loginSystem.login();

            expect(userInfo1.openid).toBe(userInfo2.openid);
            // 应该只调用一次微信登录
            expect(mockWeChatAPI.login).toHaveBeenCalledTimes(1);
        });
    });

    describe('依赖检查', () => {
        it('未配置微信 API 应该抛出错误', async () => {
            WeChatLoginSystem.resetInstance();
            loginSystem = WeChatLoginSystem.getInstance();
            loginSystem.setServerAPI(mockServerAPI);
            loginSystem.setStorage(mockStorage);

            await expect(loginSystem.login()).rejects.toThrow('API 未配置');
        });

        it('未配置服务器 API 应该抛出错误', async () => {
            WeChatLoginSystem.resetInstance();
            loginSystem = WeChatLoginSystem.getInstance();
            loginSystem.setWeChatAPI(mockWeChatAPI);
            loginSystem.setStorage(mockStorage);

            await expect(loginSystem.login()).rejects.toThrow('API 未配置');
        });
    });
});
