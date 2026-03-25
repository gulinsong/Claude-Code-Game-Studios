/**
 * 核心模块导出
 */

export { EventSystem, eventSystem } from './EventSystem';
export type {
    IEventSystem,
    EventId,
    EventPayload,
    EventCallback
} from './EventSystem';

export { ConfigSystem, configSystem, ConfigEvents } from './ConfigSystem';
export type {
    IConfigSystem,
    ConfigChangedPayload
} from './ConfigSystem';

export {
    TimeSystem,
    timeSystem,
    Season,
    Period,
    TimeEvents,
    SeasonNames,
    PeriodNames
} from './TimeSystem';
export type {
    TimeConfig,
    TimeState,
    Festival,
    ITimeSystem,
    MinuteChangedPayload,
    HourChangedPayload,
    DayChangedPayload,
    SeasonChangedPayload,
    PeriodChangedPayload,
    FestivalApproachingPayload,
    FestivalStartedPayload,
    FestivalEndedPayload
} from './TimeSystem';

// 对象池系统
export {
    ObjectPool,
    ObjectPoolManager,
    ObjectPoolEvents,
    objectPoolManager
} from './ObjectPool';
export type {
    ObjectPoolConfig,
    ObjectPoolStats
} from './ObjectPool';

// 本地化系统
export {
    LocalizationSystem,
    Language,
    LocalizationEvents,
    t
} from './LocalizationSystem';
export type {
    LocalizationConfig,
    StringTable
} from './LocalizationSystem';
