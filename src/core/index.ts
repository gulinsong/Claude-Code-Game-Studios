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
