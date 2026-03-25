/**
 * 平台层导出
 */

export {
    WeChatLoginSystem,
    LoginState,
    AuthEvents,
    weChatLoginSystem
} from './WeChatLoginSystem';
export type {
    WeChatUserInfo,
    WeChatLoginResult,
    WeChatUserProfile,
    AuthState,
    ServerLoginResponse,
    IWeChatAPI,
    IServerAPI,
    IStorage,
    WeChatLoginSystemData,
    IWeChatLoginSystem,
    LoginStartedPayload,
    LoginSuccessPayload,
    LoginFailedPayload,
    TokenRefreshedPayload,
    LogoutPayload
} from './WeChatLoginSystem';

export {
    CloudSaveSystem,
    CloudSaveState,
    CloudSaveEvents,
    cloudSaveSystem
} from './CloudSaveSystem';
export type {
    SaveType,
    GameSettings,
    PlayerData,
    SaveData,
    SaveMetadata,
    ConflictInfo,
    ICloudStorage,
    ILocalStorage,
    ISystemDataProvider,
    CloudSaveSystemData,
    ICloudSaveSystem,
    SaveStartedPayload,
    SaveCompletedPayload,
    SaveFailedPayload,
    LoadStartedPayload,
    LoadCompletedPayload,
    LoadFailedPayload,
    SyncConflictPayload
} from './CloudSaveSystem';
