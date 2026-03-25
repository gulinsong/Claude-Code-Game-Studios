/**
 * 对话系统 - 玩家与 NPC 之间的交互桥梁
 *
 * 参考: design/gdd/dialogue-system.md
 *
 * 对话系统管理玩家与 NPC 之间的对话内容，支持分支选择、条件触发、变量插值。
 */

import { EventSystem } from '../core/EventSystem';
import { BackpackSystem, ItemType } from '../data/BackpackSystem';
import { RecipeSystem } from '../data/RecipeSystem';
import { TimeSystem } from '../core/TimeSystem';

/**
 * 说话者
 */
export enum Speaker {
    NPC = 'NPC',
    PLAYER = 'PLAYER'
}

/**
 * 触发条件类型
 */
export enum TriggerType {
    ALWAYS = 'ALWAYS',
    FIRST_MEET = 'FIRST_MEET',
    FRIENDSHIP_LEVEL = 'FRIENDSHIP_LEVEL',
    QUEST_COMPLETE = 'QUEST_COMPLETE',
    FESTIVAL_APPROACHING = 'FESTIVAL_APPROACHING',
    SEASON = 'SEASON',
    TIME_PERIOD = 'TIME_PERIOD',
    ITEM_OWNED = 'ITEM_OWNED',
    FLAG_SET = 'FLAG_SET'
}

/**
 * 效果类型
 */
export enum EffectType {
    CHANGE_FRIENDSHIP = 'CHANGE_FRIENDSHIP',
    SET_FLAG = 'SET_FLAG',
    GIVE_ITEM = 'GIVE_ITEM',
    UNLOCK_RECIPE = 'UNLOCK_RECIPE',
    START_QUEST = 'START_QUEST',
    COMPLETE_QUEST = 'COMPLETE_QUEST'
}

/**
 * 对话状态
 */
export enum DialogueState {
    IDLE = 'IDLE',
    SELECTING = 'SELECTING',
    PLAYING = 'PLAYING',
    CHOOSING = 'CHOOSING',
    ENDED = 'ENDED'
}

/**
 * 触发条件
 */
export interface DialogueTrigger {
    type: TriggerType;
    params: Record<string, unknown>;
}

/**
 * 条件（用于选项显示）
 */
export interface Condition {
    type: TriggerType;
    params: Record<string, unknown>;
}

/**
 * 对话效果
 */
export interface DialogueEffect {
    type: EffectType;
    params: Record<string, unknown>;
}

/**
 * 对话选项
 */
export interface DialogueChoice {
    /** 选项文本 */
    text: string;
    /** 显示条件（可选，满足才显示） */
    condition?: Condition;
    /** 选择后效果 */
    effects: DialogueEffect[];
    /** 下一个节点 ID */
    nextNodeId: string;
}

/**
 * 对话节点
 */
export interface DialogueNode {
    /** 节点 ID */
    id: string;
    /** 对话文本（支持变量插值） */
    text: string;
    /** 说话者 */
    speaker: Speaker;
    /** 选项列表（空表示继续） */
    choices: DialogueChoice[];
    /** 进入节点时的效果 */
    effects: DialogueEffect[];
    /** 下一个节点 ID（空表示结束） */
    nextNodeId?: string;
}

/**
 * 对话定义
 */
export interface Dialogue {
    /** 对话 ID */
    id: string;
    /** NPC ID */
    npcId: string;
    /** 触发条件 */
    trigger: DialogueTrigger;
    /** 优先级（数值越大越优先） */
    priority: number;
    /** 对话节点列表 */
    nodes: DialogueNode[];
    /** 是否可重复触发 */
    repeatable: boolean;
}

/**
 * 对话运行时状态
 */
export interface DialogueRuntimeState {
    /** 当前对话 ID */
    currentDialogueId: string | null;
    /** 当前节点 ID */
    currentNodeId: string | null;
    /** 对话历史（对话 ID 列表） */
    completedDialogues: string[];
    /** 标志位存储 */
    flags: Record<string, unknown>;
}

/**
 * 对话事件 Payload
 */
export interface DialogueStartedPayload {
    dialogueId: string;
    npcId: string;
}

export interface DialogueNodeEnteredPayload {
    dialogueId: string;
    nodeId: string;
    text: string;
    speaker: Speaker;
}

export interface DialogueChoiceMadePayload {
    dialogueId: string;
    nodeId: string;
    choiceIndex: number;
    choiceText: string;
}

export interface DialogueCompletedPayload {
    dialogueId: string;
    npcId: string;
}

/**
 * 对话事件 ID
 */
export const DialogueEvents = {
    STARTED: 'dialogue:started',
    NODE_ENTERED: 'dialogue:node_entered',
    CHOICE_MADE: 'dialogue:choice_made',
    COMPLETED: 'dialogue:completed'
} as const;

/**
 * 对话系统配置
 */
const DIALOGUE_CONFIG = {
    /** 最大历史记录数 */
    MAX_HISTORY_SIZE: 10,
    /** 默认好感度变化 */
    DEFAULT_FRIENDSHIP_DELTA: 5
};

/**
 * 对话系统数据（用于存档）
 */
export interface DialogueSystemData {
    completedDialogues: string[];
    flags: Record<string, unknown>;
}

/**
 * 条件评估器接口（用于依赖注入）
 */
export interface IConditionEvaluator {
    /** 获取好感度 */
    getFriendship(npcId: string): number;
    /** 检查任务是否完成 */
    isQuestComplete(questId: string): boolean;
    /** 检查任务是否进行中 */
    isQuestActive(questId: string): boolean;
}

/**
 * 效果执行器接口（用于依赖注入）
 */
export interface IEffectExecutor {
    /** 改变好感度 */
    changeFriendship(npcId: string, delta: number): void;
    /** 开始任务 */
    startQuest(questId: string): void;
    /** 完成任务 */
    completeQuest(questId: string): void;
}

/**
 * 对话系统接口
 */
export interface IDialogueSystem {
    // 对话注册
    /** 注册对话 */
    registerDialogue(dialogue: Dialogue): void;
    /** 批量注册对话 */
    registerDialogues(dialogues: Dialogue[]): void;
    /** 获取对话定义 */
    getDialogue(id: string): Dialogue | null;

    // 对话流程
    /** 开始与 NPC 对话 */
    startDialogue(npcId: string): boolean;
    /** 推进对话（进入下一节点） */
    advance(): void;
    /** 选择选项 */
    selectChoice(choiceIndex: number): void;
    /** 结束当前对话 */
    endDialogue(): void;

    // 状态查询
    /** 获取当前状态 */
    getState(): DialogueState;
    /** 获取当前对话 */
    getCurrentDialogue(): Dialogue | null;
    /** 获取当前节点 */
    getCurrentNode(): DialogueNode | null;
    /** 获取可用选项 */
    getAvailableChoices(): DialogueChoice[];
    /** 检查对话是否已完成 */
    isDialogueCompleted(dialogueId: string): boolean;

    // 条件和效果
    /** 设置条件评估器 */
    setConditionEvaluator(evaluator: IConditionEvaluator): void;
    /** 设置效果执行器 */
    setEffectExecutor(executor: IEffectExecutor): void;
    /** 设置标志位 */
    setFlag(name: string, value: unknown): void;
    /** 获取标志位 */
    getFlag(name: string): unknown;

    // 存档
    /** 导出数据 */
    exportData(): DialogueSystemData;
    /** 导入数据 */
    importData(data: DialogueSystemData): void;
    /** 重置 */
    reset(): void;
}

/**
 * 对话系统实现
 */
export class DialogueSystem implements IDialogueSystem {
    private static instance: DialogueSystem | null = null;

    /** 已注册的对话 */
    private dialogues: Map<string, Dialogue> = new Map();

    /** 按 NPC 分组的对话 */
    private dialoguesByNpc: Map<string, Dialogue[]> = new Map();

    /** 运行时状态 */
    private runtimeState: DialogueRuntimeState = {
        currentDialogueId: null,
        currentNodeId: null,
        completedDialogues: [],
        flags: {}
    };

    /** 当前对话状态 */
    private state: DialogueState = DialogueState.IDLE;

    /** 条件评估器 */
    private conditionEvaluator: IConditionEvaluator | null = null;

    /** 效果执行器 */
    private effectExecutor: IEffectExecutor | null = null;

    private constructor() {}

    public static getInstance(): DialogueSystem {
        if (!DialogueSystem.instance) {
            DialogueSystem.instance = new DialogueSystem();
        }
        return DialogueSystem.instance;
    }

    public static resetInstance(): void {
        DialogueSystem.instance = null;
    }

    // ========== 对话注册 ==========

    public registerDialogue(dialogue: Dialogue): void {
        if (this.dialogues.has(dialogue.id)) {
            console.warn('[DialogueSystem] Dialogue already registered:', dialogue.id);
            return;
        }

        this.dialogues.set(dialogue.id, dialogue);

        // 按 NPC 分组
        if (!this.dialoguesByNpc.has(dialogue.npcId)) {
            this.dialoguesByNpc.set(dialogue.npcId, []);
        }
        this.dialoguesByNpc.get(dialogue.npcId)!.push(dialogue);
    }

    public registerDialogues(dialogues: Dialogue[]): void {
        for (const dialogue of dialogues) {
            this.registerDialogue(dialogue);
        }
    }

    public getDialogue(id: string): Dialogue | null {
        return this.dialogues.get(id) || null;
    }

    // ========== 对话流程 ==========

    public startDialogue(npcId: string): boolean {
        if (this.state !== DialogueState.IDLE) {
            console.warn('[DialogueSystem] Already in dialogue');
            return false;
        }

        this.state = DialogueState.SELECTING;

        // 获取可触发的对话
        const availableDialogues = this.getAvailableDialogues(npcId);

        if (availableDialogues.length === 0) {
            // 没有可触发的对话
            this.state = DialogueState.IDLE;
            return false;
        }

        // 选择优先级最高的对话
        const selectedDialogue = availableDialogues[0];

        // 设置当前对话
        this.runtimeState.currentDialogueId = selectedDialogue.id;
        this.runtimeState.currentNodeId = selectedDialogue.nodes[0]?.id || null;

        this.state = DialogueState.PLAYING;

        // 发布开始事件
        EventSystem.getInstance().emit<DialogueStartedPayload>(DialogueEvents.STARTED, {
            dialogueId: selectedDialogue.id,
            npcId: selectedDialogue.npcId
        });

        // 进入第一个节点
        const firstNode = selectedDialogue.nodes[0];
        if (firstNode) {
            this.enterNode(firstNode);
        } else {
            // 没有节点，结束对话
            this.endDialogue();
            return false;
        }

        return true;
    }

    public advance(): void {
        if (this.state !== DialogueState.PLAYING) {
            return;
        }

        const currentNode = this.getCurrentNode();
        if (!currentNode) {
            this.endDialogue();
            return;
        }

        // 检查是否有选项
        if (currentNode.choices.length > 0) {
            // 进入选择状态
            this.state = DialogueState.CHOOSING;
            return;
        }

        // 没有选项，进入下一个节点
        if (currentNode.nextNodeId) {
            const dialogue = this.getCurrentDialogue();
            const nextNode = dialogue?.nodes.find(n => n.id === currentNode.nextNodeId);
            if (nextNode) {
                this.enterNode(nextNode);
            } else {
                this.endDialogue();
            }
        } else {
            // 没有下一个节点，结束对话
            this.endDialogue();
        }
    }

    public selectChoice(choiceIndex: number): void {
        if (this.state !== DialogueState.CHOOSING) {
            return;
        }

        const availableChoices = this.getAvailableChoices();
        if (choiceIndex < 0 || choiceIndex >= availableChoices.length) {
            return;
        }

        const choice = availableChoices[choiceIndex];
        const dialogue = this.getCurrentDialogue();
        const currentNode = this.getCurrentNode();

        // 发布选择事件
        EventSystem.getInstance().emit<DialogueChoiceMadePayload>(DialogueEvents.CHOICE_MADE, {
            dialogueId: dialogue?.id || '',
            nodeId: currentNode?.id || '',
            choiceIndex,
            choiceText: choice.text
        });

        // 执行选项效果
        this.executeEffects(choice.effects);

        // 进入下一个节点
        const nextNode = dialogue?.nodes.find(n => n.id === choice.nextNodeId);
        if (nextNode) {
            this.runtimeState.currentNodeId = nextNode.id;
            this.state = DialogueState.PLAYING;
            this.enterNode(nextNode);
        } else {
            this.endDialogue();
        }
    }

    public endDialogue(): void {
        const dialogue = this.getCurrentDialogue();

        if (dialogue) {
            // 标记对话完成
            if (!this.runtimeState.completedDialogues.includes(dialogue.id)) {
                this.runtimeState.completedDialogues.push(dialogue.id);

                // 限制历史大小
                if (this.runtimeState.completedDialogues.length > DIALOGUE_CONFIG.MAX_HISTORY_SIZE) {
                    this.runtimeState.completedDialogues.shift();
                }
            }

            // 发布完成事件
            EventSystem.getInstance().emit<DialogueCompletedPayload>(DialogueEvents.COMPLETED, {
                dialogueId: dialogue.id,
                npcId: dialogue.npcId
            });
        }

        // 重置状态
        this.runtimeState.currentDialogueId = null;
        this.runtimeState.currentNodeId = null;
        this.state = DialogueState.IDLE;
    }

    // ========== 状态查询 ==========

    public getState(): DialogueState {
        return this.state;
    }

    public getCurrentDialogue(): Dialogue | null {
        if (!this.runtimeState.currentDialogueId) return null;
        return this.dialogues.get(this.runtimeState.currentDialogueId) || null;
    }

    public getCurrentNode(): DialogueNode | null {
        const dialogue = this.getCurrentDialogue();
        if (!dialogue || !this.runtimeState.currentNodeId) return null;
        return dialogue.nodes.find(n => n.id === this.runtimeState.currentNodeId) || null;
    }

    public getAvailableChoices(): DialogueChoice[] {
        const currentNode = this.getCurrentNode();
        if (!currentNode) return [];

        // 过滤满足条件的选项
        return currentNode.choices.filter(choice => {
            if (!choice.condition) return true;
            return this.evaluateCondition(choice.condition);
        });
    }

    public isDialogueCompleted(dialogueId: string): boolean {
        return this.runtimeState.completedDialogues.includes(dialogueId);
    }

    // ========== 条件和效果 ==========

    public setConditionEvaluator(evaluator: IConditionEvaluator): void {
        this.conditionEvaluator = evaluator;
    }

    public setEffectExecutor(executor: IEffectExecutor): void {
        this.effectExecutor = executor;
    }

    public setFlag(name: string, value: unknown): void {
        this.runtimeState.flags[name] = value;
    }

    public getFlag(name: string): unknown {
        return this.runtimeState.flags[name];
    }

    // ========== 存档 ==========

    public exportData(): DialogueSystemData {
        return {
            completedDialogues: [...this.runtimeState.completedDialogues],
            flags: { ...this.runtimeState.flags }
        };
    }

    public importData(data: DialogueSystemData): void {
        this.runtimeState.completedDialogues = [...data.completedDialogues];
        this.runtimeState.flags = { ...data.flags };
    }

    public reset(): void {
        this.runtimeState = {
            currentDialogueId: null,
            currentNodeId: null,
            completedDialogues: [],
            flags: {}
        };
        this.state = DialogueState.IDLE;
    }

    // ========== 私有方法 ==========

    /**
     * 获取可触发的对话列表（按优先级排序）
     */
    private getAvailableDialogues(npcId: string): Dialogue[] {
        const npcDialogues = this.dialoguesByNpc.get(npcId) || [];

        return npcDialogues
            .filter(dialogue => this.canTriggerDialogue(dialogue))
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * 检查对话是否可以触发
     */
    private canTriggerDialogue(dialogue: Dialogue): boolean {
        // 检查是否已完成且不可重复
        if (!dialogue.repeatable && this.isDialogueCompleted(dialogue.id)) {
            return false;
        }

        // 检查触发条件
        return this.evaluateCondition(dialogue.trigger);
    }

    /**
     * 评估条件
     */
    private evaluateCondition(condition: Condition | DialogueTrigger): boolean {
        switch (condition.type) {
            case TriggerType.ALWAYS:
                return true;

            case TriggerType.FIRST_MEET:
                // 首次见面 = 该 NPC 的对话从未完成过
                const npcDialogues = this.dialoguesByNpc.get(condition.params.npcId as string) || [];
                return !npcDialogues.some(d => this.isDialogueCompleted(d.id));

            case TriggerType.FRIENDSHIP_LEVEL:
                if (!this.conditionEvaluator) return false;
                return this.conditionEvaluator.getFriendship(
                    condition.params.npcId as string
                ) >= (condition.params.level as number);

            case TriggerType.QUEST_COMPLETE:
                if (!this.conditionEvaluator) return false;
                return this.conditionEvaluator.isQuestComplete(
                    condition.params.questId as string
                );

            case TriggerType.FLAG_SET:
                return this.getFlag(condition.params.flagName as string) === condition.params.value;

            case TriggerType.SEASON:
                const timeSystem = TimeSystem.getInstance();
                return timeSystem.getCurrentSeason() === condition.params.season;

            case TriggerType.TIME_PERIOD:
                const time = TimeSystem.getInstance();
                return time.getCurrentPeriod() === condition.params.period;

            case TriggerType.ITEM_OWNED:
                const backpack = BackpackSystem.getInstance();
                return backpack.hasItem(
                    condition.params.itemId as string,
                    (condition.params.amount as number) || 1
                );

            case TriggerType.FESTIVAL_APPROACHING:
                // TODO: 实现节日临近检测
                return false;

            default:
                return false;
        }
    }

    /**
     * 执行效果
     */
    private executeEffects(effects: DialogueEffect[]): void {
        for (const effect of effects) {
            this.executeEffect(effect);
        }
    }

    /**
     * 执行单个效果
     */
    private executeEffect(effect: DialogueEffect): void {
        switch (effect.type) {
            case EffectType.SET_FLAG:
                this.setFlag(
                    effect.params.flagName as string,
                    effect.params.value
                );
                break;

            case EffectType.GIVE_ITEM:
                const backpack = BackpackSystem.getInstance();
                backpack.addItem(
                    effect.params.itemId as string,
                    ItemType.MATERIAL,
                    (effect.params.amount as number) || 1
                );
                break;

            case EffectType.UNLOCK_RECIPE:
                const recipeSystem = RecipeSystem.getInstance();
                recipeSystem.unlockRecipe(effect.params.recipeId as string);
                break;

            case EffectType.CHANGE_FRIENDSHIP:
                if (this.effectExecutor) {
                    this.effectExecutor.changeFriendship(
                        effect.params.npcId as string,
                        (effect.params.delta as number) || DIALOGUE_CONFIG.DEFAULT_FRIENDSHIP_DELTA
                    );
                }
                break;

            case EffectType.START_QUEST:
                if (this.effectExecutor) {
                    this.effectExecutor.startQuest(effect.params.questId as string);
                }
                break;

            case EffectType.COMPLETE_QUEST:
                if (this.effectExecutor) {
                    this.effectExecutor.completeQuest(effect.params.questId as string);
                }
                break;

            default:
                console.warn('[DialogueSystem] Unknown effect type:', effect.type);
        }
    }

    /**
     * 进入节点
     */
    private enterNode(node: DialogueNode): void {
        // 更新当前节点 ID
        this.runtimeState.currentNodeId = node.id;

        // 执行节点效果
        this.executeEffects(node.effects);

        // 发布节点进入事件
        EventSystem.getInstance().emit<DialogueNodeEnteredPayload>(DialogueEvents.NODE_ENTERED, {
            dialogueId: this.runtimeState.currentDialogueId || '',
            nodeId: node.id,
            text: this.interpolateText(node.text),
            speaker: node.speaker
        });
    }

    /**
     * 变量插值
     */
    private interpolateText(text: string): string {
        // TODO: 实现完整的变量插值
        // 目前支持简单的标志位插值
        return text.replace(/\{(\w+)\}/g, (match, name) => {
            const value = this.getFlag(name);
            return value !== undefined ? String(value) : match;
        });
    }
}

/**
 * 全局对话系统实例
 */
export const dialogueSystem = DialogueSystem.getInstance();
