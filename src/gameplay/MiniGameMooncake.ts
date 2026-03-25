/**
 * 月饼迷你游戏 - 揉捏类迷你游戏实现
 *
 * 参考: design/gdd/crafting-system.md
 *
 * 阶段设计：
 * 1. 揉面 - 快速点击
 * 2. 包馅 - 拖拽放置
 * 3. 压模 - 选择正确模具
 * 4. 烘烤 - 等待
 */

import { MiniGameBase, MiniGameStageData, StageResult, MiniGameActionType } from './MiniGameBase';
import { MiniGameType } from './CraftingSystem';

/**
 * 月饼模具类型
 */
export enum MooncakeMoldType {
    /** 圆形模具 */
    ROUND = 'ROUND',
    /** 花形模具 */
    FLOWER = 'FLOWER',
    /** 鱼形模具 */
    FISH = 'FISH',
    /** 喜字模具 */
    HAPPINESS = 'HAPPINESS'
}

/**
 * 月饼阶段 2（包馅）数据
 */
export interface FillingData {
    /** 是否已放置 */
    placed: boolean;
    /** 放置准确度 (0-1) */
    accuracy: number;
}

/**
 * 月饼阶段 3（压模）数据
 */
export interface MoldData {
    /** 选择的模具类型 */
    selectedMold: MooncakeMoldType | null;
    /** 正确的模具类型 */
    correctMold: MooncakeMoldType;
}

/**
 * 月饼迷你游戏阶段特定数据
 */
export interface MooncakeStageExtraData {
    /** 阶段 2: 包馅数据 */
    filling?: FillingData;
    /** 阶段 3: 压模数据 */
    mold?: MoldData;
}

/**
 * 月饼迷你游戏配置
 */
const MOONCAKE_CONFIG = {
    /** 阶段 1: 揉面 - 目标点击次数 */
    KNEAD_TARGET_TAPS: 20,
    /** 阶段 1: 揉面 - 时间限制 */
    KNEAD_TIME_LIMIT: 8,
    /** 阶段 2: 包馅 - 时间限制 */
    FILLING_TIME_LIMIT: 10,
    /** 阶段 2: 包馅 - 准确度阈值 */
    FILLING_ACCURACY_THRESHOLD: 0.7,
    /** 阶段 3: 压模 - 时间限制 */
    MOLD_TIME_LIMIT: 8,
    /** 阶段 4: 烘烤 - 时间 */
    BAKE_TIME: 4,
    /** 优秀完成时间阈值（秒） */
    EXCELLENT_TIME_THRESHOLD: 20,
    /** 良好完成时间阈值（秒） */
    GOOD_TIME_THRESHOLD: 30
};

/**
 * 月饼迷你游戏
 */
export class MooncakeMiniGame extends MiniGameBase {
    protected readonly gameType = MiniGameType.KNEAD;

    /** 额外阶段数据 */
    private extraData: MooncakeStageExtraData = {};

    /** 正确的模具类型（随机生成） */
    private correctMold: MooncakeMoldType = MooncakeMoldType.ROUND;

    /** 烘烤定时器 ID */
    private bakingTimerId: ReturnType<typeof setTimeout> | null = null;

    /**
     * 获取所有阶段定义
     */
    protected getStages(): MiniGameStageData[] {
        return [
            {
                id: 'knead',
                name: '揉面',
                hint: '快速点击揉面团',
                actionType: MiniGameActionType.TAP,
                targetValue: MOONCAKE_CONFIG.KNEAD_TARGET_TAPS,
                timeLimit: MOONCAKE_CONFIG.KNEAD_TIME_LIMIT,
                tolerance: 0.1
            },
            {
                id: 'filling',
                name: '包馅',
                hint: '拖拽馅料到面皮中心',
                actionType: MiniGameActionType.DRAG_DROP,
                targetValue: 1,
                timeLimit: MOONCAKE_CONFIG.FILLING_TIME_LIMIT,
                tolerance: 0.3
            },
            {
                id: 'mold',
                name: '压模',
                hint: '选择正确的模具图案',
                actionType: MiniGameActionType.SEQUENCE,
                targetValue: 1,
                timeLimit: MOONCAKE_CONFIG.MOLD_TIME_LIMIT,
                tolerance: 0
            },
            {
                id: 'bake',
                name: '烘烤',
                hint: '等待月饼烘烤完成',
                actionType: MiniGameActionType.WAIT,
                targetValue: 1,
                timeLimit: MOONCAKE_CONFIG.BAKE_TIME,
                tolerance: 0
            }
        ];
    }

    /**
     * 计算阶段评分
     */
    protected calculateStageScore(result: StageResult): number {
        switch (result.stageId) {
            case 'knead':
                return this.calculateKneadScore(result);
            case 'filling':
                return this.calculateFillingScore(result);
            case 'mold':
                return this.calculateMoldScore(result);
            case 'bake':
                return this.calculateBakeScore(result);
            default:
                return 0;
        }
    }

    /**
     * 重置游戏
     */
    public reset(): void {
        // 清理烘烤定时器
        if (this.bakingTimerId !== null) {
            clearTimeout(this.bakingTimerId);
            this.bakingTimerId = null;
        }

        super.reset();
        this.extraData = {};
        // 随机选择正确的模具
        const molds = Object.values(MooncakeMoldType);
        this.correctMold = molds[Math.floor(Math.random() * molds.length)];
    }

    // ========== 阶段特定方法 ==========

    /**
     * 提交包馅数据
     */
    public submitFilling(accuracy: number): void {
        this.extraData.filling = {
            placed: true,
            accuracy: Math.max(0, Math.min(1, accuracy))
        };

        // 根据准确度决定是否成功
        if (accuracy >= MOONCAKE_CONFIG.FILLING_ACCURACY_THRESHOLD) {
            this.submitAction(1);
        } else {
            this.failCurrentStage();
        }
    }

    /**
     * 提交模具选择
     */
    public submitMold(moldType: MooncakeMoldType): void {
        this.extraData.mold = {
            selectedMold: moldType,
            correctMold: this.correctMold
        };

        if (moldType === this.correctMold) {
            this.submitAction(1);
        } else {
            this.failCurrentStage();
        }
    }

    /**
     * 获取正确的模具类型（用于提示）
     */
    public getCorrectMold(): MooncakeMoldType {
        return this.correctMold;
    }

    /**
     * 获取当前阶段提示
     */
    public getCurrentHint(): string {
        const stage = this.getCurrentStage();
        if (!stage) return '';

        // 为压模阶段添加模具提示
        if (stage.id === 'mold') {
            const moldNames: Record<MooncakeMoldType, string> = {
                [MooncakeMoldType.ROUND]: '圆形',
                [MooncakeMoldType.FLOWER]: '花形',
                [MooncakeMoldType.FISH]: '鱼形',
                [MooncakeMoldType.HAPPINESS]: '喜字'
            };
            return `选择${moldNames[this.correctMold]}模具`;
        }

        return stage.hint;
    }

    /**
     * 等待烘烤完成（自动调用）
     */
    public startBaking(): void {
        const stage = this.getCurrentStage();
        if (!stage || stage.id !== 'bake') return;

        // 清理之前的定时器
        if (this.bakingTimerId !== null) {
            clearTimeout(this.bakingTimerId);
            this.bakingTimerId = null;
        }

        // 烘烤是自动完成的，设置定时器
        this.bakingTimerId = setTimeout(() => {
            this.bakingTimerId = null;
            if (this.getCurrentStage()?.id === 'bake') {
                this.submitAction(1);
            }
        }, MOONCAKE_CONFIG.BAKE_TIME * 1000);
    }

    // ========== 私有评分计算方法 ==========

    /**
     * 计算揉面评分
     */
    private calculateKneadScore(result: StageResult): number {
        if (!result.success) return 0;

        // 基础分数：完成度
        let score = result.completion * 70;

        // 速度加成
        const timeRatio = result.timeSpent / MOONCAKE_CONFIG.KNEAD_TIME_LIMIT;
        if (timeRatio < 0.5) {
            // 快速完成有加成
            score += 30;
        } else if (timeRatio < 0.8) {
            score += 20;
        } else {
            score += 10;
        }

        return Math.min(100, Math.round(score));
    }

    /**
     * 计算包馅评分
     */
    private calculateFillingScore(result: StageResult): number {
        if (!result.success) return 0;

        // 根据准确度评分
        const accuracy = this.extraData.filling?.accuracy ?? 0;
        let score = accuracy * 100;

        // 速度加成
        const timeRatio = result.timeSpent / MOONCAKE_CONFIG.FILLING_TIME_LIMIT;
        if (timeRatio < 0.6) {
            score += 10;
        }

        return Math.min(100, Math.round(score));
    }

    /**
     * 计算压模评分
     */
    private calculateMoldScore(result: StageResult): number {
        if (!result.success) return 0;

        // 选对就是满分
        let score = 100;

        // 速度加成
        const timeRatio = result.timeSpent / MOONCAKE_CONFIG.MOLD_TIME_LIMIT;
        if (timeRatio < 0.5) {
            score = 100;
        } else if (timeRatio < 0.8) {
            score = 95;
        } else {
            score = 90;
        }

        return score;
    }

    /**
     * 计算烘烤评分
     */
    private calculateBakeScore(_result: StageResult): number {
        // 烘烤阶段总是满分
        return 100;
    }
}
