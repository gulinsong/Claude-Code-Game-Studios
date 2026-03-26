/**
 * 新手引导系统
 *
 * 提供可配置的新手引导流程，帮助新玩家了解游戏核心机制。
 * 支持步骤追踪、跳过、恢复、条件触发等功能。
 *
 * @example
 * ```typescript
 * const tutorial = TutorialSystem.getInstance();
 *
 * // 注册引导序列
 * tutorial.registerSequence({
 *     id: 'basic-gathering',
 *     name: '资源采集基础',
 *     steps: [
 *         { id: 'intro', type: 'dialogue', content: '欢迎来到岁时记！' },
 *         { id: 'tap-tree', type: 'action', target: 'tree', hint: '点击树木采集资源' }
 *     ]
 * });
 *
 * // 开始引导
 * tutorial.startSequence('basic-gathering');
 * ```
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 引导步骤类型
 */
export enum TutorialStepType {
    /** 对话/说明 */
    DIALOGUE = 'DIALOGUE',
    /** 高亮提示 */
    HIGHLIGHT = 'HIGHLIGHT',
    /** 玩家操作 */
    ACTION = 'ACTION',
    /** 动画演示 */
    DEMO = 'DEMO',
    /** 选择分支 */
    CHOICE = 'CHOICE',
    /** 等待时间 */
    WAIT = 'WAIT'
}

/**
 * 引导步骤状态
 */
export enum TutorialStepStatus {
    /** 未开始 */
    PENDING = 'PENDING',
    /** 进行中 */
    ACTIVE = 'ACTIVE',
    /** 已完成 */
    COMPLETED = 'COMPLETED',
    /** 已跳过 */
    SKIPPED = 'SKIPPED'
}

/**
 * 引导步骤配置
 */
export interface TutorialStepConfig {
    /** 步骤唯一标识 */
    id: string;
    /** 步骤类型 */
    type: TutorialStepType;
    /** 步骤内容 (对话文本、提示等) */
    content?: string;
    /** 目标元素 (用于高亮/操作) */
    target?: string;
    /** 提示文本 */
    hint?: string;
    /** 触发条件 */
    condition?: () => boolean;
    /** 完成条件 (ACTION 类型) */
    completeCondition?: () => boolean;
    /** 等待时间 (毫秒, WAIT 类型) */
    duration?: number;
    /** 选择项 (CHOICE 类型) */
    choices?: Array<{
        id: string;
        text: string;
        nextStep?: string;
    }>;
    /** 跳过此步骤的条件 */
    skipIf?: () => boolean;
    /** 下一步骤 (默认为序列中的下一个) */
    nextStep?: string;
    /** 是否可跳过 */
    skippable?: boolean;
    /** 位置偏移 (用于高亮框) */
    position?: { x: number; y: number };
    /** 附加数据 */
    data?: Record<string, unknown>;
}

/**
 * 引导序列配置
 */
export interface TutorialSequenceConfig {
    /** 序列唯一标识 */
    id: string;
    /** 序列名称 */
    name: string;
    /** 序列描述 */
    description?: string;
    /** 步骤列表 */
    steps: TutorialStepConfig[];
    /** 触发条件 */
    triggerCondition?: () => boolean;
    /** 是否必须完成 */
    required?: boolean;
    /** 依赖的其他序列 */
    dependencies?: string[];
    /** 优先级 (数字越小越优先) */
    priority?: number;
    /** 是否可重复 */
    repeatable?: boolean;
}

/**
 * 引导步骤运行时状态
 */
export interface TutorialStepState {
    /** 步骤 ID */
    stepId: string;
    /** 序列 ID */
    sequenceId: string;
    /** 状态 */
    status: TutorialStepStatus;
    /** 开始时间 */
    startTime: number;
    /** 完成时间 */
    endTime?: number;
    /** 选择结果 (CHOICE 类型) */
    selectedChoice?: string;
    /** 重试次数 */
    retryCount?: number;
}

/**
 * 引导序列运行时状态
 */
export interface TutorialSequenceState {
    /** 序列 ID */
    sequenceId: string;
    /** 当前步骤索引 */
    currentStepIndex: number;
    /** 当前步骤 ID */
    currentStepId: string;
    /** 状态 */
    status: TutorialStepStatus;
    /** 开始时间 */
    startTime: number;
    /** 完成时间 */
    endTime?: number;
    /** 已完成步骤数 */
    completedSteps: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 步骤状态记录 */
    stepStates: Map<string, TutorialStepState>;
}

/**
 * 引导系统事件
 */
export const TutorialEvents = {
    /** 序列开始 */
    SEQUENCE_STARTED: 'tutorial:sequence_started',
    /** 序列完成 */
    SEQUENCE_COMPLETED: 'tutorial:sequence_completed',
    /** 序列跳过 */
    SEQUENCE_SKIPPED: 'tutorial:sequence_skipped',
    /** 步骤开始 */
    STEP_STARTED: 'tutorial:step_started',
    /** 步骤完成 */
    STEP_COMPLETED: 'tutorial:step_completed',
    /** 步骤跳过 */
    STEP_SKIPPED: 'tutorial:step_skipped',
    /** 步骤更新 */
    STEP_UPDATED: 'tutorial:step_updated',
    /** 进度更新 */
    PROGRESS_UPDATED: 'tutorial:progress_updated',
    /** 引导提示 */
    HINT_SHOWN: 'tutorial:hint_shown',
    /** 引导隐藏 */
    HINT_HIDDEN: 'tutorial:hint_hidden'
} as const;

/**
 * 引导系统数据 (用于存档)
 */
export interface TutorialSystemData {
    /** 已完成的序列 */
    completedSequences: string[];
    /** 已跳过的序列 */
    skippedSequences: string[];
    /** 当前活动序列 */
    activeSequenceId: string | null;
    /** 当前步骤索引 */
    currentStepIndex: number;
    /** 步骤完成记录 */
    stepProgress: Record<string, TutorialStepState>;
    /** 引导版本 (用于重置) */
    version: string;
}

/**
 * 新手引导系统
 */
export class TutorialSystem {
    private static instance: TutorialSystem | null = null;

    /** 注册的引导序列 */
    private sequences: Map<string, TutorialSequenceConfig> = new Map();

    /** 序列状态 */
    private sequenceStates: Map<string, TutorialSequenceState> = new Map();

    /** 已完成的序列 */
    private completedSequences: Set<string> = new Set();

    /** 已跳过的序列 */
    private skippedSequences: Set<string> = new Set();

    /** 当前活动序列 */
    private activeSequence: TutorialSequenceState | null = null;

    /** 事件系统 */
    private eventSystem: EventSystem;

    /** 是否暂停 */
    private paused: boolean = false;

    /** 引导版本 */
    private version: string = '1.0.0';

    /** 最大重试次数 */
    private maxRetryCount: number = 3;

    private constructor() {
        this.eventSystem = EventSystem.getInstance();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): TutorialSystem {
        if (!TutorialSystem.instance) {
            TutorialSystem.instance = new TutorialSystem();
        }
        return TutorialSystem.instance;
    }

    /**
     * 重置单例
     */
    public static resetInstance(): void {
        TutorialSystem.instance = null;
    }

    // ============================================================
    // 序列管理
    // ============================================================

    /**
     * 注册引导序列
     */
    registerSequence(config: TutorialSequenceConfig): void {
        if (this.sequences.has(config.id)) {
            console.warn(`[TutorialSystem] Sequence ${config.id} already registered`);
            return;
        }

        this.sequences.set(config.id, {
            ...config,
            priority: config.priority ?? 100,
            required: config.required ?? false,
            repeatable: config.repeatable ?? false
        });
    }

    /**
     * 批量注册序列
     */
    registerSequences(configs: TutorialSequenceConfig[]): void {
        configs.forEach(config => this.registerSequence(config));
    }

    /**
     * 获取序列配置
     */
    getSequence(id: string): TutorialSequenceConfig | undefined {
        return this.sequences.get(id);
    }

    /**
     * 获取所有序列
     */
    getAllSequences(): TutorialSequenceConfig[] {
        return Array.from(this.sequences.values());
    }

    // ============================================================
    // 引导控制
    // ============================================================

    /**
     * 开始引导序列
     */
    startSequence(sequenceId: string): boolean {
        const config = this.sequences.get(sequenceId);
        if (!config) {
            console.warn(`[TutorialSystem] Sequence ${sequenceId} not found`);
            return false;
        }

        // 检查是否已完成且不可重复
        if (this.completedSequences.has(sequenceId) && !config.repeatable) {
            console.log(`[TutorialSystem] Sequence ${sequenceId} already completed`);
            return false;
        }

        // 检查依赖
        if (config.dependencies) {
            for (const dep of config.dependencies) {
                if (!this.completedSequences.has(dep)) {
                    console.warn(`[TutorialSystem] Dependency ${dep} not completed`);
                    return false;
                }
            }
        }

        // 检查触发条件
        if (config.triggerCondition && !config.triggerCondition()) {
            console.log(`[TutorialSystem] Trigger condition not met for ${sequenceId}`);
            return false;
        }

        // 创建状态
        const state: TutorialSequenceState = {
            sequenceId,
            currentStepIndex: 0,
            currentStepId: config.steps[0]?.id ?? '',
            status: TutorialStepStatus.ACTIVE,
            startTime: Date.now(),
            completedSteps: 0,
            totalSteps: config.steps.length,
            stepStates: new Map()
        };

        this.sequenceStates.set(sequenceId, state);
        this.activeSequence = state;

        // 发布事件
        this.eventSystem.emit(TutorialEvents.SEQUENCE_STARTED, {
            sequenceId,
            sequenceName: config.name,
            totalSteps: config.steps.length
        });

        // 开始第一步
        if (config.steps.length > 0) {
            this.startStep(sequenceId, 0);
        }

        return true;
    }

    /**
     * 完成当前步骤
     */
    completeCurrentStep(): boolean {
        if (!this.activeSequence) {
            return false;
        }

        return this.completeStep(this.activeSequence.sequenceId, this.activeSequence.currentStepId);
    }

    /**
     * 跳过当前步骤
     */
    skipCurrentStep(): boolean {
        if (!this.activeSequence) {
            return false;
        }

        return this.skipStep(this.activeSequence.sequenceId, this.activeSequence.currentStepId);
    }

    /**
     * 跳过当前序列
     */
    skipCurrentSequence(): boolean {
        if (!this.activeSequence) {
            return false;
        }

        return this.skipSequence(this.activeSequence.sequenceId);
    }

    /**
     * 暂停引导
     */
    pause(): void {
        this.paused = true;
    }

    /**
     * 恢复引导
     */
    resume(): void {
        this.paused = false;
    }

    /**
     * 是否暂停
     */
    isPaused(): boolean {
        return this.paused;
    }

    // ============================================================
    // 状态查询
    // ============================================================

    /**
     * 获取当前活动序列
     */
    getActiveSequence(): TutorialSequenceState | null {
        return this.activeSequence;
    }

    /**
     * 获取当前步骤
     */
    getCurrentStep(): TutorialStepConfig | null {
        if (!this.activeSequence) {
            return null;
        }

        const config = this.sequences.get(this.activeSequence.sequenceId);
        if (!config) {
            return null;
        }

        return config.steps[this.activeSequence.currentStepIndex] ?? null;
    }

    /**
     * 检查序列是否完成
     */
    isSequenceCompleted(sequenceId: string): boolean {
        return this.completedSequences.has(sequenceId);
    }

    /**
     * 检查序列是否跳过
     */
    isSequenceSkipped(sequenceId: string): boolean {
        return this.skippedSequences.has(sequenceId);
    }

    /**
     * 获取序列进度
     */
    getSequenceProgress(sequenceId: string): number {
        const state = this.sequenceStates.get(sequenceId);
        if (!state) {
            return 0;
        }

        return state.completedSteps / state.totalSteps;
    }

    /**
     * 获取下一个可用序列
     */
    getNextAvailableSequence(): TutorialSequenceConfig | null {
        const available: TutorialSequenceConfig[] = [];

        for (const config of this.sequences.values()) {
            // 跳过已完成的非可重复序列
            if (this.completedSequences.has(config.id) && !config.repeatable) {
                continue;
            }

            // 检查依赖
            if (config.dependencies) {
                const depsMet = config.dependencies.every(
                    dep => this.completedSequences.has(dep)
                );
                if (!depsMet) continue;
            }

            // 检查触发条件
            if (config.triggerCondition && !config.triggerCondition()) {
                continue;
            }

            available.push(config);
        }

        // 按优先级排序
        available.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

        return available[0] ?? null;
    }

    // ============================================================
    // 存档功能
    // ============================================================

    /**
     * 导出数据
     */
    exportData(): TutorialSystemData {
        const stepProgress: Record<string, TutorialStepState> = {};

        this.sequenceStates.forEach((state, sequenceId) => {
            state.stepStates.forEach((stepState, stepId) => {
                stepProgress[`${sequenceId}:${stepId}`] = stepState;
            });
        });

        return {
            completedSequences: Array.from(this.completedSequences),
            skippedSequences: Array.from(this.skippedSequences),
            activeSequenceId: this.activeSequence?.sequenceId ?? null,
            currentStepIndex: this.activeSequence?.currentStepIndex ?? 0,
            stepProgress,
            version: this.version
        };
    }

    /**
     * 导入数据
     */
    importData(data: TutorialSystemData): void {
        this.completedSequences = new Set(data.completedSequences);
        this.skippedSequences = new Set(data.skippedSequences);

        // 恢复活动序列
        if (data.activeSequenceId) {
            const config = this.sequences.get(data.activeSequenceId);
            if (config) {
                const state: TutorialSequenceState = {
                    sequenceId: data.activeSequenceId,
                    currentStepIndex: data.currentStepIndex,
                    currentStepId: config.steps[data.currentStepIndex]?.id ?? '',
                    status: TutorialStepStatus.ACTIVE,
                    startTime: Date.now(),
                    completedSteps: data.currentStepIndex,
                    totalSteps: config.steps.length,
                    stepStates: new Map()
                };

                // 恢复步骤状态
                for (const [key, stepState] of Object.entries(data.stepProgress)) {
                    if (key.startsWith(`${data.activeSequenceId}:`)) {
                        state.stepStates.set(stepState.stepId, stepState);
                    }
                }

                this.sequenceStates.set(data.activeSequenceId, state);
                this.activeSequence = state;
            }
        }
    }

    /**
     * 重置系统
     */
    reset(): void {
        this.sequenceStates.clear();
        this.completedSequences.clear();
        this.skippedSequences.clear();
        this.activeSequence = null;
        this.paused = false;
    }

    // ============================================================
    // 私有方法
    // ============================================================

    /**
     * 开始步骤
     */
    private startStep(sequenceId: string, stepIndex: number): void {
        const config = this.sequences.get(sequenceId);
        const state = this.sequenceStates.get(sequenceId);

        if (!config || !state || stepIndex >= config.steps.length) {
            return;
        }

        const step = config.steps[stepIndex];

        // 检查跳过条件
        if (step.skipIf && step.skipIf()) {
            this.skipStep(sequenceId, step.id);
            return;
        }

        // 更新状态
        state.currentStepIndex = stepIndex;
        state.currentStepId = step.id;

        const stepState: TutorialStepState = {
            stepId: step.id,
            sequenceId,
            status: TutorialStepStatus.ACTIVE,
            startTime: Date.now(),
            retryCount: 0
        };

        state.stepStates.set(step.id, stepState);

        // 发布事件
        this.eventSystem.emit(TutorialEvents.STEP_STARTED, {
            sequenceId,
            stepId: step.id,
            stepType: step.type,
            content: step.content,
            target: step.target,
            hint: step.hint,
            skippable: step.skippable !== false
        });

        // 处理特定类型
        switch (step.type) {
            case TutorialStepType.WAIT:
                if (step.duration) {
                    setTimeout(() => {
                        if (state.currentStepId === step.id) {
                            this.completeStep(sequenceId, step.id);
                        }
                    }, step.duration);
                }
                break;

            case TutorialStepType.ACTION:
                // 等待玩家操作完成条件
                if (step.completeCondition) {
                    this.waitForActionCondition(sequenceId, step.id, step.completeCondition);
                }
                break;
        }
    }

    /**
     * 完成步骤
     */
    private completeStep(sequenceId: string, stepId: string): boolean {
        const config = this.sequences.get(sequenceId);
        const state = this.sequenceStates.get(sequenceId);

        if (!config || !state) {
            return false;
        }

        const stepState = state.stepStates.get(stepId);
        if (!stepState || stepState.status !== TutorialStepStatus.ACTIVE) {
            return false;
        }

        // 更新步骤状态
        stepState.status = TutorialStepStatus.COMPLETED;
        stepState.endTime = Date.now();
        state.completedSteps++;

        // 发布事件
        this.eventSystem.emit(TutorialEvents.STEP_COMPLETED, {
            sequenceId,
            stepId,
            duration: stepState.endTime - stepState.startTime
        });

        // 发布进度更新
        this.eventSystem.emit(TutorialEvents.PROGRESS_UPDATED, {
            sequenceId,
            progress: state.completedSteps / state.totalSteps,
            completedSteps: state.completedSteps,
            totalSteps: state.totalSteps
        });

        // 检查下一步
        const currentStep = config.steps[state.currentStepIndex];
        if (currentStep?.id === stepId) {
            // 检查是否有自定义下一步
            if (currentStep.nextStep) {
                const nextIndex = config.steps.findIndex(s => s.id === currentStep.nextStep);
                if (nextIndex !== -1) {
                    this.startStep(sequenceId, nextIndex);
                    return true;
                }
            }

            // 默认下一步
            if (state.currentStepIndex + 1 < config.steps.length) {
                this.startStep(sequenceId, state.currentStepIndex + 1);
            } else {
                // 序列完成
                this.completeSequence(sequenceId);
            }
        }

        return true;
    }

    /**
     * 跳过步骤
     */
    private skipStep(sequenceId: string, stepId: string): boolean {
        const config = this.sequences.get(sequenceId);
        const state = this.sequenceStates.get(sequenceId);

        if (!config || !state) {
            return false;
        }

        const step = config.steps.find(s => s.id === stepId);
        if (!step || step.skippable === false) {
            return false;
        }

        const stepState = state.stepStates.get(stepId);
        if (stepState) {
            stepState.status = TutorialStepStatus.SKIPPED;
            stepState.endTime = Date.now();
        }

        // 发布事件
        this.eventSystem.emit(TutorialEvents.STEP_SKIPPED, {
            sequenceId,
            stepId
        });

        // 移动到下一步
        const currentIndex = config.steps.findIndex(s => s.id === stepId);
        if (currentIndex !== -1 && currentIndex === state.currentStepIndex) {
            if (state.currentStepIndex + 1 < config.steps.length) {
                this.startStep(sequenceId, state.currentStepIndex + 1);
            } else {
                this.completeSequence(sequenceId);
            }
        }

        return true;
    }

    /**
     * 完成序列
     */
    private completeSequence(sequenceId: string): void {
        const state = this.sequenceStates.get(sequenceId);
        const config = this.sequences.get(sequenceId);

        if (!state || !config) {
            return;
        }

        state.status = TutorialStepStatus.COMPLETED;
        state.endTime = Date.now();

        this.completedSequences.add(sequenceId);
        this.activeSequence = null;

        // 发布事件
        this.eventSystem.emit(TutorialEvents.SEQUENCE_COMPLETED, {
            sequenceId,
            sequenceName: config.name,
            duration: state.endTime - state.startTime,
            completedSteps: state.completedSteps
        });
    }

    /**
     * 跳过序列
     */
    private skipSequence(sequenceId: string): boolean {
        const config = this.sequences.get(sequenceId);

        if (!config || config.required) {
            console.warn(`[TutorialSystem] Cannot skip required sequence ${sequenceId}`);
            return false;
        }

        const state = this.sequenceStates.get(sequenceId);
        if (state) {
            state.status = TutorialStepStatus.SKIPPED;
            state.endTime = Date.now();
        }

        this.skippedSequences.add(sequenceId);
        this.activeSequence = null;

        // 发布事件
        this.eventSystem.emit(TutorialEvents.SEQUENCE_SKIPPED, {
            sequenceId,
            sequenceName: config.name
        });

        return true;
    }

    /**
     * 等待操作条件
     */
    private waitForActionCondition(
        sequenceId: string,
        stepId: string,
        condition: () => boolean
    ): void {
        const checkInterval = setInterval(() => {
            if (this.paused) {
                return;
            }

            const state = this.sequenceStates.get(sequenceId);
            if (!state || state.currentStepId !== stepId) {
                clearInterval(checkInterval);
                return;
            }

            const stepState = state.stepStates.get(stepId);
            if (!stepState || stepState.status !== TutorialStepStatus.ACTIVE) {
                clearInterval(checkInterval);
                return;
            }

            if (condition()) {
                clearInterval(checkInterval);
                this.completeStep(sequenceId, stepId);
            } else {
                // 增加重试计数
                stepState.retryCount = (stepState.retryCount ?? 0) + 1;

                // 超过最大重试次数时给出提示
                if (stepState.retryCount >= this.maxRetryCount) {
                    const config = this.sequences.get(sequenceId);
                    const step = config?.steps.find(s => s.id === stepId);

                    if (step?.hint) {
                        this.eventSystem.emit(TutorialEvents.HINT_SHOWN, {
                            sequenceId,
                            stepId,
                            hint: step.hint
                        });
                    }

                    stepState.retryCount = 0;
                }
            }
        }, 500);
    }
}

// ============================================================
// 内置引导序列
// ============================================================

/**
 * 创建基础引导序列
 */
export function createBasicTutorialSequences(): TutorialSequenceConfig[] {
    return [
        {
            id: 'welcome',
            name: '欢迎来到岁时记',
            description: '游戏基础介绍',
            priority: 1,
            required: false,
            steps: [
                {
                    id: 'welcome-dialogue',
                    type: TutorialStepType.DIALOGUE,
                    content: '欢迎来到岁时记！这是一个关于中国传统节日的模拟游戏。',
                    skippable: true
                },
                {
                    id: 'village-intro',
                    type: TutorialStepType.DIALOGUE,
                    content: '你将在一个美丽的小村庄中生活，体验四季变换和传统节日。',
                    skippable: true
                },
                {
                    id: 'goal-intro',
                    type: TutorialStepType.DIALOGUE,
                    content: '你的目标是采集资源、制作物品、与村民交流，并准备各种节日庆典！',
                    skippable: true
                }
            ]
        },
        {
            id: 'gathering-basics',
            name: '资源采集基础',
            description: '学习如何采集资源',
            priority: 2,
            required: false,
            dependencies: ['welcome'],
            steps: [
                {
                    id: 'find-resource',
                    type: TutorialStepType.HIGHLIGHT,
                    target: 'resource-node',
                    content: '看到那些发光的资源点了吗？',
                    hint: '点击资源点可以采集材料'
                },
                {
                    id: 'tap-resource',
                    type: TutorialStepType.ACTION,
                    target: 'resource-node',
                    hint: '点击任意资源点开始采集',
                    skippable: true
                },
                {
                    id: 'collect-reward',
                    type: TutorialStepType.DIALOGUE,
                    content: '太棒了！你获得了材料。材料可以用来制作各种物品。',
                    skippable: true
                }
            ]
        },
        {
            id: 'crafting-basics',
            name: '制作基础',
            description: '学习如何制作物品',
            priority: 3,
            required: false,
            dependencies: ['gathering-basics'],
            steps: [
                {
                    id: 'open-backpack',
                    type: TutorialStepType.ACTION,
                    target: 'backpack-button',
                    hint: '点击背包图标查看你收集的材料'
                },
                {
                    id: 'open-crafting',
                    type: TutorialStepType.ACTION,
                    target: 'crafting-button',
                    hint: '点击制作图标打开制作界面'
                },
                {
                    id: 'select-recipe',
                    type: TutorialStepType.HIGHLIGHT,
                    target: 'recipe-list',
                    content: '这里显示你可以制作的配方。选择一个试试！'
                },
                {
                    id: 'craft-item',
                    type: TutorialStepType.ACTION,
                    target: 'craft-button',
                    hint: '点击制作按钮开始制作'
                }
            ]
        },
        {
            id: 'villager-basics',
            name: '村民互动',
            description: '学习如何与村民交流',
            priority: 4,
            required: false,
            dependencies: ['crafting-basics'],
            steps: [
                {
                    id: 'find-villager',
                    type: TutorialStepType.HIGHLIGHT,
                    target: 'villager',
                    content: '村庄里有许多村民，你可以与他们交流和送礼。'
                },
                {
                    id: 'tap-villager',
                    type: TutorialStepType.ACTION,
                    target: 'villager',
                    hint: '点击任意村民开始对话'
                },
                {
                    id: 'gift-intro',
                    type: TutorialStepType.DIALOGUE,
                    content: '送礼物可以提升村民对你的好感度。每个村民都有自己喜欢的礼物！',
                    skippable: true
                }
            ]
        }
    ];
}
