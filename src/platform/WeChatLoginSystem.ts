/**
 * 微信登录系统 - 账号基础设施
 *
 * 参考: design/gdd/wechat-login-system.md
 *
 * 负责用户身份验证、获取用户信息、管理登录状态。
 * 使用微信小程序的一键登录能力，玩家无需注册账号即可开始游戏。
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 登录状态
 */
export enum LoginState {
    /** 未登录 */
    NOT_LOGGED_IN = 'NOT_LOGGED_IN',
    /** 登录中 */
    LOGGING_IN = 'LOGGING_IN',
    /** 已登录 */
    LOGGED_IN = 'LOGGED_IN',
    /** 登录失败 */
    LOGIN_FAILED = 'LOGIN_FAILED',
    /** Token 过期 */
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    /** 刷新中 */
    REFRESHING = 'REFRESHING'
}

/**
 * 微信用户信息
 */
export interface WeChatUserInfo {
    /** 用户唯一标识（微信提供） */
    openid: string;
    /** 跨应用唯一标识（可选） */
    unionid?: string;
    /** 用户昵称 */
    nickname: string;
    /** 头像 URL */
    avatarUrl: string;
}

/**
 * 微信登录结果
 */
export interface WeChatLoginResult {
    /** 登录凭证 */
    code: string;
}

/**
 * 微信用户资料
 */
export interface WeChatUserProfile {
    /** 昵称 */
    nickName: string;
    /** 头像 URL */
    avatarUrl: string;
}

/**
 * 登录状态数据
 */
export interface AuthState {
    /** 是否已登录 */
    isLoggedIn: boolean;
    /** 用户信息 */
    userInfo: WeChatUserInfo | null;
    /** 登录凭证 */
    token: string | null;
    /** Token 过期时间 */
    tokenExpireTime: number | null;
    /** 当前状态 */
    state: LoginState;
    /** 错误信息 */
    lastError: string | null;
}

/**
 * 服务器登录响应
 */
export interface ServerLoginResponse {
    /** 是否成功 */
    success: boolean;
    /** 用户 openid */
    openid: string;
    /** 会话密钥 */
    sessionKey?: string;
    /** 登录凭证 */
    token: string;
    /** Token 过期时间（时间戳） */
    tokenExpireTime: number;
    /** 错误信息 */
    error?: string;
}

/**
 * 事件 Payload
 */
export interface LoginStartedPayload {}

export interface LoginSuccessPayload {
    openid: string;
    nickname: string;
}

export interface LoginFailedPayload {
    error: string;
}

export interface TokenRefreshedPayload {}

export interface LogoutPayload {}

/**
 * 登录事件 ID
 */
export const AuthEvents = {
    LOGIN_STARTED: 'auth:login_started',
    LOGIN_SUCCESS: 'auth:login_success',
    LOGIN_FAILED: 'auth:login_failed',
    TOKEN_REFRESHED: 'auth:token_refreshed',
    LOGOUT: 'auth:logout'
} as const;

/**
 * 系统配置
 */
const AUTH_CONFIG = {
    /** Token 有效期（7天，毫秒） */
    TOKEN_EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000,
    /** 刷新阈值（1天，毫秒） */
    REFRESH_THRESHOLD: 24 * 60 * 60 * 1000,
    /** 登录超时（10秒） */
    LOGIN_TIMEOUT: 10000,
    /** 最大重试次数 */
    MAX_RETRY_COUNT: 3,
    /** 默认昵称 */
    DEFAULT_NICKNAME: '旅行者',
    /** 默认头像 */
    DEFAULT_AVATAR: ''
};

/**
 * 微信 API 抽象接口
 */
export interface IWeChatAPI {
    /** 调用微信登录 */
    login(): Promise<WeChatLoginResult>;
    /** 获取用户资料 */
    getUserProfile(): Promise<WeChatUserProfile>;
    /** 检查会话有效性 */
    checkSession(): Promise<boolean>;
}

/**
 * 服务器 API 抽象接口
 */
export interface IServerAPI {
    /** 使用 code 换取 token */
    loginWithCode(code: string): Promise<ServerLoginResponse>;
    /** 刷新 token */
    refreshToken(token: string): Promise<ServerLoginResponse>;
}

/**
 * 存储接口
 */
export interface IStorage {
    /** 获取数据 */
    getItem(key: string): string | null;
    /** 设置数据 */
    setItem(key: string, value: string): void;
    /** 删除数据 */
    removeItem(key: string): void;
}

/**
 * 微信登录系统数据（用于存档）
 */
export interface WeChatLoginSystemData {
    /** 用户信息 */
    userInfo: WeChatUserInfo | null;
    /** Token */
    token: string | null;
    /** Token 过期时间 */
    tokenExpireTime: number | null;
}

/**
 * 微信登录系统接口
 */
export interface IWeChatLoginSystem {
    // 登录流程
    /** 开始登录 */
    login(): Promise<WeChatUserInfo>;
    /** 退出登录 */
    logout(): void;
    /** 请求用户信息授权 */
    requestUserProfile(): Promise<WeChatUserProfile>;

    // 状态查询
    /** 是否已登录 */
    isLoggedIn(): boolean;
    /** 获取当前状态 */
    getCurrentState(): LoginState;
    /** 获取用户信息 */
    getUserInfo(): WeChatUserInfo | null;
    /** 获取 openid */
    getOpenId(): string | null;
    /** 获取 Token */
    getToken(): string | null;

    // Token 管理
    /** 检查 Token 是否有效 */
    isTokenValid(): boolean;
    /** 检查是否需要刷新 */
    needsRefresh(): boolean;
    /** 刷新 Token */
    refreshToken(): Promise<boolean>;
    /** 检查会话 */
    checkSession(): Promise<boolean>;

    // 依赖注入
    /** 设置微信 API */
    setWeChatAPI(api: IWeChatAPI): void;
    /** 设置服务器 API */
    setServerAPI(api: IServerAPI): void;
    /** 设置存储 */
    setStorage(storage: IStorage): void;

    // 存档
    /** 导出数据 */
    exportData(): WeChatLoginSystemData;
    /** 导入数据 */
    importData(data: WeChatLoginSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 微信登录系统实现
 */
export class WeChatLoginSystem implements IWeChatLoginSystem {
    private static instance: WeChatLoginSystem | null = null;

    /** 当前状态 */
    private state: AuthState = {
        isLoggedIn: false,
        userInfo: null,
        token: null,
        tokenExpireTime: null,
        state: LoginState.NOT_LOGGED_IN,
        lastError: null
    };

    /** 微信 API */
    private weChatAPI: IWeChatAPI | null = null;

    /** 服务器 API */
    private serverAPI: IServerAPI | null = null;

    /** 存储 */
    private storage: IStorage | null = null;

    private constructor() {}

    public static getInstance(): WeChatLoginSystem {
        if (!WeChatLoginSystem.instance) {
            WeChatLoginSystem.instance = new WeChatLoginSystem();
        }
        return WeChatLoginSystem.instance;
    }

    public static resetInstance(): void {
        WeChatLoginSystem.instance = null;
    }

    // ========== 登录流程 ==========

    public async login(): Promise<WeChatUserInfo> {
        // 检查是否已登录
        if (this.state.isLoggedIn && this.isTokenValid()) {
            return this.state.userInfo!;
        }

        // 检查是否有缓存的 token
        if (this.loadTokenFromStorage() && this.isTokenValid()) {
            return this.state.userInfo!;
        }

        // 发布登录开始事件
        EventSystem.getInstance().emit<LoginStartedPayload>(AuthEvents.LOGIN_STARTED, {});

        this.state.state = LoginState.LOGGING_IN;
        this.state.lastError = null;

        try {
            // 设置超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('登录超时')), AUTH_CONFIG.LOGIN_TIMEOUT);
            });

            // 执行登录
            const loginPromise = this.performLogin();

            const userInfo = await Promise.race([loginPromise, timeoutPromise]);

            this.state.isLoggedIn = true;
            this.state.state = LoginState.LOGGED_IN;

            // 保存到存储
            this.saveTokenToStorage();

            // 发布登录成功事件
            EventSystem.getInstance().emit<LoginSuccessPayload>(AuthEvents.LOGIN_SUCCESS, {
                openid: userInfo.openid,
                nickname: userInfo.nickname
            });

            return userInfo;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '登录失败';

            this.state.isLoggedIn = false;
            this.state.state = LoginState.LOGIN_FAILED;
            this.state.lastError = errorMessage;

            // 发布登录失败事件
            EventSystem.getInstance().emit<LoginFailedPayload>(AuthEvents.LOGIN_FAILED, {
                error: errorMessage
            });

            throw error;
        }
    }

    public logout(): void {
        const hadUser = this.state.userInfo !== null;

        this.state = {
            isLoggedIn: false,
            userInfo: null,
            token: null,
            tokenExpireTime: null,
            state: LoginState.NOT_LOGGED_IN,
            lastError: null
        };

        // 清除存储
        this.clearTokenFromStorage();

        // 发布退出登录事件
        if (hadUser) {
            EventSystem.getInstance().emit<LogoutPayload>(AuthEvents.LOGOUT, {});
        }
    }

    public async requestUserProfile(): Promise<WeChatUserProfile> {
        if (!this.weChatAPI) {
            throw new Error('微信 API 未配置');
        }

        try {
            const profile = await this.weChatAPI.getUserProfile();

            // 更新用户信息
            if (this.state.userInfo) {
                this.state.userInfo.nickname = profile.nickName;
                this.state.userInfo.avatarUrl = profile.avatarUrl;
                this.saveTokenToStorage();
            }

            return profile;
        } catch (error) {
            // 用户拒绝授权，使用默认值
            if (this.state.userInfo) {
                this.state.userInfo.nickname = AUTH_CONFIG.DEFAULT_NICKNAME;
                this.state.userInfo.avatarUrl = AUTH_CONFIG.DEFAULT_AVATAR;
            }
            throw error;
        }
    }

    // ========== 状态查询 ==========

    public isLoggedIn(): boolean {
        return this.state.isLoggedIn && this.isTokenValid();
    }

    public getCurrentState(): LoginState {
        return this.state.state;
    }

    public getUserInfo(): WeChatUserInfo | null {
        return this.state.userInfo ? { ...this.state.userInfo } : null;
    }

    public getOpenId(): string | null {
        return this.state.userInfo?.openid || null;
    }

    public getToken(): string | null {
        return this.state.token;
    }

    // ========== Token 管理 ==========

    public isTokenValid(): boolean {
        if (!this.state.token || !this.state.tokenExpireTime) {
            return false;
        }

        return Date.now() < this.state.tokenExpireTime;
    }

    public needsRefresh(): boolean {
        if (!this.state.tokenExpireTime) {
            return false;
        }

        const timeUntilExpiry = this.state.tokenExpireTime - Date.now();
        return timeUntilExpiry < AUTH_CONFIG.REFRESH_THRESHOLD && timeUntilExpiry > 0;
    }

    public async refreshToken(): Promise<boolean> {
        if (!this.state.token || !this.serverAPI) {
            return false;
        }

        this.state.state = LoginState.REFRESHING;

        try {
            const response = await this.serverAPI.refreshToken(this.state.token);

            if (response.success) {
                this.state.token = response.token;
                this.state.tokenExpireTime = response.tokenExpireTime;
                this.state.state = LoginState.LOGGED_IN;

                this.saveTokenToStorage();

                // 发布 Token 刷新事件
                EventSystem.getInstance().emit<TokenRefreshedPayload>(AuthEvents.TOKEN_REFRESHED, {});

                return true;
            } else {
                this.state.state = LoginState.TOKEN_EXPIRED;
                return false;
            }
        } catch (error) {
            this.state.state = LoginState.TOKEN_EXPIRED;
            return false;
        }
    }

    public async checkSession(): Promise<boolean> {
        if (!this.weChatAPI) {
            return false;
        }

        try {
            return await this.weChatAPI.checkSession();
        } catch {
            return false;
        }
    }

    // ========== 依赖注入 ==========

    public setWeChatAPI(api: IWeChatAPI): void {
        this.weChatAPI = api;
    }

    public setServerAPI(api: IServerAPI): void {
        this.serverAPI = api;
    }

    public setStorage(storage: IStorage): void {
        this.storage = storage;
        // 尝试从存储加载 token
        this.loadTokenFromStorage();
    }

    // ========== 存档 ==========

    public exportData(): WeChatLoginSystemData {
        return {
            userInfo: this.state.userInfo ? { ...this.state.userInfo } : null,
            token: this.state.token,
            tokenExpireTime: this.state.tokenExpireTime
        };
    }

    public importData(data: WeChatLoginSystemData): void {
        this.state.userInfo = data.userInfo ? { ...data.userInfo } : null;
        this.state.token = data.token;
        this.state.tokenExpireTime = data.tokenExpireTime;

        if (this.isTokenValid()) {
            this.state.isLoggedIn = true;
            this.state.state = LoginState.LOGGED_IN;
        }
    }

    public reset(): void {
        this.state = {
            isLoggedIn: false,
            userInfo: null,
            token: null,
            tokenExpireTime: null,
            state: LoginState.NOT_LOGGED_IN,
            lastError: null
        };
        this.clearTokenFromStorage();
    }

    // ========== 私有方法 ==========

    /**
     * 执行登录
     */
    private async performLogin(): Promise<WeChatUserInfo> {
        if (!this.weChatAPI || !this.serverAPI) {
            throw new Error('API 未配置');
        }

        // 调用微信登录获取 code
        const loginResult = await this.weChatAPI.login();

        // 使用 code 向服务器换取 token
        const serverResponse = await this.serverAPI.loginWithCode(loginResult.code);

        if (!serverResponse.success) {
            throw new Error(serverResponse.error || '服务器登录失败');
        }

        // 更新状态
        this.state.token = serverResponse.token;
        this.state.tokenExpireTime = serverResponse.tokenExpireTime;

        // 创建用户信息（基本信息，昵称头像后续通过授权获取）
        this.state.userInfo = {
            openid: serverResponse.openid,
            nickname: AUTH_CONFIG.DEFAULT_NICKNAME,
            avatarUrl: AUTH_CONFIG.DEFAULT_AVATAR
        };

        return this.state.userInfo;
    }

    /**
     * 从存储加载 Token
     */
    private loadTokenFromStorage(): boolean {
        if (!this.storage) {
            return false;
        }

        try {
            const token = this.storage.getItem('wechat_token');
            const expireTimeStr = this.storage.getItem('wechat_token_expire');
            const userInfoStr = this.storage.getItem('wechat_user_info');

            if (token && expireTimeStr && userInfoStr) {
                this.state.token = token;
                this.state.tokenExpireTime = parseInt(expireTimeStr, 10);
                this.state.userInfo = JSON.parse(userInfoStr);

                if (this.isTokenValid()) {
                    this.state.isLoggedIn = true;
                    this.state.state = LoginState.LOGGED_IN;
                    return true;
                }
            }
        } catch (error) {
            console.warn('[WeChatLoginSystem] 加载存储失败:', error);
        }

        return false;
    }

    /**
     * 保存 Token 到存储
     */
    private saveTokenToStorage(): void {
        if (!this.storage) {
            return;
        }

        try {
            if (this.state.token) {
                this.storage.setItem('wechat_token', this.state.token);
            }
            if (this.state.tokenExpireTime) {
                this.storage.setItem('wechat_token_expire', this.state.tokenExpireTime.toString());
            }
            if (this.state.userInfo) {
                this.storage.setItem('wechat_user_info', JSON.stringify(this.state.userInfo));
            }
        } catch (error) {
            console.warn('[WeChatLoginSystem] 保存存储失败:', error);
        }
    }

    /**
     * 清除存储中的 Token
     */
    private clearTokenFromStorage(): void {
        if (!this.storage) {
            return;
        }

        try {
            this.storage.removeItem('wechat_token');
            this.storage.removeItem('wechat_token_expire');
            this.storage.removeItem('wechat_user_info');
        } catch (error) {
            console.warn('[WeChatLoginSystem] 清除存储失败:', error);
        }
    }
}

/**
 * 全局微信登录系统实例
 */
export const weChatLoginSystem = WeChatLoginSystem.getInstance();
