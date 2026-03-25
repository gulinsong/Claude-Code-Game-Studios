/**
 * 迷你游戏框架 - 基础抽象类
 *
 * 参考: design/gdd/crafting-system.md
 *
 * 迷你游戏是手工艺系统的核心交互，提供有节奏、有仪式感的制作体验。
 */

import { EventSystem } from '../core/EventSystem';
import { Quality, MiniGameType } from './CraftingSystem';

/**
 * 迷你游戏阶段数据
 */
export interface MiniGameStageData {
    /** 阶段 ID */
    id: string;
    /** 阶段名称 */
    name: string;
    /** 阶段描述/提示 */
    hint: string;
    /** 目标操作类型 */
    actionType: MiniGameActionType;
    /** 目标值（如点击次数） */
    targetValue: number;
    /** 时间限制（秒），0 表示无限制 */
    timeLimit: number;
    /** 容错率 (0-1) */
    tolerance: number;
}

/**
 * 迷你游戏操作类型
 */
export enum MiniGameActionType {
    /** 快速点击 */
    TAP = 'TAP',
    /** 滑动/拖拽 */
    SWIPE = 'SWIPE',
    /** 长按 */
    HOLD = 'HOLD',
    /** 拖拽放置 */
    DRAG_DROP = 'DRAG_DROP',
    /** 顺序点击 */
    SEQUENCE = 'SEQUENCE',
    /** 等待（无操作） */
    WAIT = 'WAIT'
}

/**
 * 迷你游戏状态
 */
export enum MiniGameState {
    /** 准备开始 */
    READY = 'READY',
    /** 进行中 */
    PLAYING = 'PLAYING',
    /** 暂停 */
    PAUSED = 'PAUSED',
    /** 成功完成 */
    SUCCESS = 'SUCCESS',
    /** 失败 */
    FAILED = 'FAILED'
}

/**
 * 阶段结果
 */
export interface StageResult {
    /** 阶段 ID */
    stageId: string;
    /** 是否成功 */
    success: boolean;
    /** 完成度 (0-1) */
    completion: number;
    /** 实际操作值 */
    actualValue: number;
    /** 目标值 */
    targetValue: number;
    /** 用时（秒） */
    timeSpent: number;
    /** 评分 (0-100) */
    score: number;
}

/**
 * 迷你游戏完整结果
 */
export interface MiniGameCompleteResult {
    /** 是否成功 */
    success: boolean;
    /** 总评分 (0-100) */
    totalScore: number;
    /** 各阶段结果 */
    stageResults: StageResult[];
    /** 产出品质 */
    quality: Quality;
    /** 总用时（秒） */
    totalTime: number;
}

/**
 * 迷你游戏事件
 */
export const MiniGameEvents = {
    STARTED: 'minigame:started',
    STAGE_STARTED: 'minigame:stage_started',
    STAGE_COMPLETED: 'minigame:stage_completed',
    PROGRESS_UPDATED: 'minigame:progress_updated',
    COMPLETED: 'minigame:completed',
    FAILED: 'minigame:failed'
} as const;

/**
 * 事件 Payload 类型
 */
export interface MiniGameStartedPayload {
    gameType: MiniGameType;
    totalStages: number;
    timeLimit: number;
}

export interface StageStartedPayload {
    stageId: string;
    stageName: string;
    stageIndex: number;
    totalStages: number;
}

export interface StageCompletedPayload {
    stageId: string;
    success: boolean;
    score: number;
}

export interface ProgressUpdatedPayload {
    stageIndex: number;
    progress: number;
    currentValue: number;
    targetValue: number;
}

export interface MiniGameCompletedPayload {
    success: boolean;
    totalScore: number;
    quality: Quality;
}

/**
 * 迷你游戏配置
 */
const MINIGAME_CONFIG = {
    /** 优秀评分阈值 */
    EXCELLENT_THRESHOLD: 90,
    /** 良好评分阈值 */
    GOOD_THRESHOLD: 70,
    /** 及格评分阈值 */
    PASS_THRESHOLD: 50,
    /** 高品质所需平均评分 */
    QUALITY_SCORE_THRESHOLD: 85
};

/**
 * 迷你游戏基类
 *
 * 子类需要实现：
 * - getStages(): 返回阶段定义
 * - calculateStageScore(result): 计算阶段评分
 */
export abstract class MiniGameBase {
    /** 游戏类型 */
    protected abstract readonly gameType: MiniGameType;

    /** 当前状态 */
    protected state: MiniGameState = MiniGameState.READY;

    /** 当前阶段索引 */
    protected currentStageIndex: number = 0;

    /** 阶段结果 */
    protected stageResults: StageResult[] = [];

    /** 开始时间 */
    protected startTime: number = 0;

    /** 阶段开始时间 */
    protected stageStartTime: number = 0;

    /** 当前阶段进度 */
    protected currentProgress: number = 0;

    /** 当前操作值 */
    protected currentValue: number = 0;

    /** 熟练度等级 (1-4) */
    protected masteryLevel: number = 1;

    /** 时间减免 (0-0.3) */
    protected timeReduction: number = 0;

    /**
     * 获取所有阶段定义
     */
    protected abstract getStages(): MiniGameStageData[];

    /**
     * 计算阶段评分
     * @param result 阶段结果
     * @returns 评分 (0-100)
     */
    protected abstract calculateStageScore(result: StageResult): number;

    /**
     * 获取游戏类型
     */
    public getGameType(): MiniGameType {
        return this.gameType;
    }

    /**
     * 获取当前状态
     */
    public getState(): MiniGameState {
        return this.state;
    }

    /**
     * 获取当前阶段索引
     */
    public getCurrentStageIndex(): number {
        return this.currentStageIndex;
    }

    /**
     * 获取总阶段数
     */
    public getTotalStages(): number {
        return this.getStages().length;
    }

    /**
     * 获取当前阶段数据
     */
    public getCurrentStage(): MiniGameStageData | null {
        const stages = this.getStages();
        if (this.currentStageIndex >= stages.length) {
            return null;
        }
        return stages[this.currentStageIndex];
    }

    /**
     * 设置熟练度加成
     */
    public setMasteryBonus(level: number, timeReduction: number): void {
        this.masteryLevel = level;
        this.timeReduction = timeReduction;
    }

    /**
     * 开始游戏
     */
    public start(): boolean {
        if (this.state !== MiniGameState.READY) {
            console.warn('[MiniGame] Cannot start: invalid state');
            return false;
        }

        this.state = MiniGameState.PLAYING;
        this.currentStageIndex = 0;
        this.stageResults = [];
        this.startTime = Date.now();
        this.currentProgress = 0;
        this.currentValue = 0;

        const stages = this.getStages();
        const totalTime = this.calculateTotalTime();

        // 发布开始事件
        EventSystem.getInstance().emit<MiniGameStartedPayload>(MiniGameEvents.STARTED, {
            gameType: this.gameType,
            totalStages: stages.length,
            timeLimit: totalTime
        });

        // 开始第一阶段
        this.startStage(0);

        return true;
    }

    /**
     * 暂停游戏
     */
    public pause(): void {
        if (this.state === MiniGameState.PLAYING) {
            this.state = MiniGameState.PAUSED;
        }
    }

    /**
     * 恢复游戏
     */
    public resume(): void {
        if (this.state === MiniGameState.PAUSED) {
            this.state = MiniGameState.PLAYING;
        }
    }

    /**
     * 提交操作
     * @param value 操作值（如点击次数、完成度等）
     */
    public submitAction(value: number): void {
        if (this.state !== MiniGameState.PLAYING) {
            return;
        }

        const stage = this.getCurrentStage();
        if (!stage) return;

        this.currentValue = value;
        this.currentProgress = Math.min(1, value / stage.targetValue);

        // 发布进度更新事件
        EventSystem.getInstance().emit<ProgressUpdatedPayload>(MiniGameEvents.PROGRESS_UPDATED, {
            stageIndex: this.currentStageIndex,
            progress: this.currentProgress,
            currentValue: this.currentValue,
            targetValue: stage.targetValue
        });

        // 检查是否完成当前阶段
        if (this.currentProgress >= 1 - stage.tolerance) {
            this.completeCurrentStage(true);
        }
    }

    /**
     * 当前阶段失败
     */
    public failCurrentStage(): void {
        this.completeCurrentStage(false);
    }

    /**
     * 跳过当前阶段
     */
    public skipCurrentStage(): void {
        const stage = this.getCurrentStage();
        if (!stage) return;

        // 创建跳过结果
        const result: StageResult = {
            stageId: stage.id,
            success: true,
            completion: 0.5, // 跳过算 50% 完成度
            actualValue: 0,
            targetValue: stage.targetValue,
            timeSpent: 0,
            score: 50 // 跳过给 50 分
        };

        this.stageResults.push(result);
        this.advanceToNextStage();
    }

    /**
     * 获取完整结果
     */
    public getResult(): MiniGameCompleteResult | null {
        if (this.state !== MiniGameState.SUCCESS && this.state !== MiniGameState.FAILED) {
            return null;
        }

        const totalScore = this.calculateTotalScore();
        const totalTime = (Date.now() - this.startTime) / 1000;
        const success = this.state === MiniGameState.SUCCESS;

        return {
            success,
            totalScore,
            stageResults: [...this.stageResults],
            quality: this.determineQuality(totalScore),
            totalTime
        };
    }

    /**
     * 重置游戏
     */
    public reset(): void {
        this.state = MiniGameState.READY;
        this.currentStageIndex = 0;
        this.stageResults = [];
        this.startTime = 0;
        this.stageStartTime = 0;
        this.currentProgress = 0;
        this.currentValue = 0;
    }

    // ========== 私有方法 ==========

    /**
     * 开始指定阶段
     */
    private startStage(index: number): void {
        const stages = this.getStages();
        if (index >= stages.length) {
            // 所有阶段完成
            this.completeGame(true);
            return;
        }

        this.currentStageIndex = index;
        this.currentProgress = 0;
        this.currentValue = 0;
        this.stageStartTime = Date.now();

        const stage = stages[index];

        // 发布阶段开始事件
        EventSystem.getInstance().emit<StageStartedPayload>(MiniGameEvents.STAGE_STARTED, {
            stageId: stage.id,
            stageName: stage.name,
            stageIndex: index,
            totalStages: stages.length
        });
    }

    /**
     * 完成当前阶段
     */
    private completeCurrentStage(success: boolean): void {
        const stage = this.getCurrentStage();
        if (!stage) return;

        const timeSpent = (Date.now() - this.stageStartTime) / 1000;

        const result: StageResult = {
            stageId: stage.id,
            success,
            completion: success ? this.currentProgress : 0,
            actualValue: this.currentValue,
            targetValue: stage.targetValue,
            timeSpent,
            score: 0 // 先设为 0，子类会计算
        };

        // 计算评分
        result.score = this.calculateStageScore(result);

        this.stageResults.push(result);

        // 发布阶段完成事件
        EventSystem.getInstance().emit<StageCompletedPayload>(MiniGameEvents.STAGE_COMPLETED, {
            stageId: stage.id,
            success,
            score: result.score
        });

        if (success) {
            this.advanceToNextStage();
        } else {
            // 阶段失败，游戏失败
            this.completeGame(false);
        }
    }

    /**
     * 进入下一阶段
     */
    private advanceToNextStage(): void {
        this.startStage(this.currentStageIndex + 1);
    }

    /**
     * 完成游戏
     */
    private completeGame(success: boolean): void {
        this.state = success ? MiniGameState.SUCCESS : MiniGameState.FAILED;

        const totalScore = success ? this.calculateTotalScore() : 0;
        const quality = this.determineQuality(totalScore);

        // 发布完成事件
        EventSystem.getInstance().emit<MiniGameCompletedPayload>(MiniGameEvents.COMPLETED, {
            success,
            totalScore,
            quality
        });
    }

    /**
     * 计算总评分
     */
    private calculateTotalScore(): number {
        if (this.stageResults.length === 0) return 0;

        const totalScore = this.stageResults.reduce((sum, result) => sum + result.score, 0);
        return Math.round(totalScore / this.stageResults.length);
    }

    /**
     * 根据评分确定品质
     */
    private determineQuality(score: number): Quality {
        if (score >= MINIGAME_CONFIG.QUALITY_SCORE_THRESHOLD) {
            return Quality.HIGH;
        }
        return Quality.NORMAL;
    }

    /**
     * 计算总时间限制
     */
    private calculateTotalTime(): number {
        const stages = this.getStages();
        const baseTime = stages.reduce((sum, stage) => sum + stage.timeLimit, 0);
        return Math.round(baseTime * (1 - this.timeReduction));
    }
}
