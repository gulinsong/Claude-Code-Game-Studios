/**
 * 游戏玩法系统导出
 */

export {
    GatheringSystem,
    GatheringSpotState,
    GatheringEvents,
    gatheringSystem
} from './GatheringSystem';
export type {
    MaterialDrop,
    GatheringSpot,
    SpotRuntimeState,
    GatheringResult,
    DroppedMaterial,
    GatheringStartedPayload,
    GatheringCompletedPayload,
    GatheringRareDropPayload,
    GatheringLegendaryDropPayload,
    GatheringPityTriggeredPayload,
    GatheringSystemData,
    IGatheringSystem
} from './GatheringSystem';

export {
    CraftingSystem,
    CraftingStage,
    Quality,
    MiniGameType,
    MasteryLevel,
    CraftingEvents,
    craftingSystem
} from './CraftingSystem';
export type {
    CraftingSession,
    CraftingProgress,
    MiniGameResult,
    CraftingCheckResult,
    CraftingCompleteResult,
    CraftStartedPayload,
    CraftCompletedPayload,
    CraftFailedPayload,
    CraftSkippedPayload,
    CraftMasteryUpPayload,
    CraftingSystemData,
    ICraftingSystem
} from './CraftingSystem';

// 迷你游戏框架
export {
    MiniGameBase,
    MiniGameActionType,
    MiniGameState,
    MiniGameEvents
} from './MiniGameBase';
export type {
    MiniGameStageData,
    StageResult,
    MiniGameCompleteResult,
    MiniGameStartedPayload,
    StageStartedPayload,
    StageCompletedPayload,
    ProgressUpdatedPayload,
    MiniGameCompletedPayload
} from './MiniGameBase';

// 月饼迷你游戏
export {
    MooncakeMiniGame,
    MooncakeMoldType
} from './MiniGameMooncake';
export type {
    FillingData,
    MoldData,
    MooncakeStageExtraData
} from './MiniGameMooncake';

// 对话系统
export {
    DialogueSystem,
    Speaker,
    TriggerType,
    EffectType,
    DialogueState,
    DialogueEvents,
    dialogueSystem
} from './DialogueSystem';
export type {
    DialogueTrigger,
    Condition,
    DialogueEffect,
    DialogueChoice,
    DialogueNode,
    Dialogue,
    DialogueRuntimeState,
    DialogueStartedPayload,
    DialogueNodeEnteredPayload,
    DialogueChoiceMadePayload,
    DialogueCompletedPayload,
    DialogueSystemData,
    IConditionEvaluator,
    IEffectExecutor,
    IDialogueSystem
} from './DialogueSystem';

// 任务系统
export {
    QuestSystem,
    QuestType,
    QuestState,
    ObjectiveType,
    RewardType,
    QuestEvents,
    questSystem
} from './QuestSystem';
export type {
    Objective,
    Reward,
    Quest,
    ObjectiveProgress,
    QuestProgress,
    QuestStartedPayload,
    QuestProgressPayload,
    QuestCompletedPayload,
    QuestClaimedPayload,
    QuestAbandonedPayload,
    QuestFailedPayload,
    QuestSystemData,
    IRewardExecutor,
    IQuestSystem
} from './QuestSystem';

// 村民关系系统
export {
    VillagerSystem,
    Personality,
    GiftReaction,
    RelationshipStatus,
    VillagerEvents,
    villagerSystem
} from './VillagerSystem';
export type {
    Schedule,
    Villager,
    Relationship,
    GiftResult,
    VillagerMetPayload,
    VillagerFriendshipChangedPayload,
    VillagerLevelUpPayload,
    VillagerGiftSentPayload,
    VillagerMaxLevelPayload,
    VillagerSystemData,
    ITimeProvider,
    IFestivalProvider,
    IVillagerSystem
} from './VillagerSystem';

// 节日筹备系统
export {
    FestivalSystem,
    Season,
    FestivalPhase,
    FestivalTaskType,
    RewardTier,
    FestivalEvents,
    festivalSystem
} from './FestivalSystem';
export type {
    FestivalTaskDefinition,
    FestivalTaskProgress,
    FestivalReward,
    FestivalDefinition,
    FestivalState,
    CelebrationResult,
    FestivalApproachingPayload,
    FestivalStartedPayload,
    FestivalTaskCompletedPayload,
    FestivalCelebrationStartedPayload,
    FestivalEndedPayload,
    FestivalRewardClaimedPayload,
    FestivalSystemData,
    ITimeProvider as IFestivalTimeProvider,
    IFestivalSystem
} from './FestivalSystem';
