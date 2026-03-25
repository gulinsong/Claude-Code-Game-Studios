/**
 * 迷你游戏框架和月饼迷你游戏测试
 */

import {
    MiniGameBase,
    MiniGameActionType,
    MiniGameState,
    MiniGameEvents,
    MiniGameStageData,
    StageResult
} from '../../src/gameplay/MiniGameBase';
import {
    MooncakeMiniGame,
    MooncakeMoldType
} from '../../src/gameplay/MiniGameMooncake';
import { MiniGameType, Quality } from '../../src/gameplay/CraftingSystem';
import { EventSystem } from '../../src/core/EventSystem';

// 测试用的简单迷你游戏实现
class TestMiniGame extends MiniGameBase {
    protected readonly gameType = MiniGameType.KNEAD;

    private testStages: MiniGameStageData[] = [
        {
            id: 'stage1',
            name: '阶段1',
            hint: '点击',
            actionType: MiniGameActionType.TAP,
            targetValue: 10,
            timeLimit: 5,
            tolerance: 0.1
        },
        {
            id: 'stage2',
            name: '阶段2',
            hint: '等待',
            actionType: MiniGameActionType.WAIT,
            targetValue: 1,
            timeLimit: 2,
            tolerance: 0
        }
    ];

    protected getStages(): MiniGameStageData[] {
        return this.testStages;
    }

    protected calculateStageScore(result: StageResult): number {
        if (!result.success) return 0;
        return Math.round(result.completion * 100);
    }
}

describe('MiniGameBase', () => {
    let miniGame: TestMiniGame;
    let eventSystem: EventSystem;

    beforeEach(() => {
        EventSystem.resetInstance();
        eventSystem = EventSystem.getInstance();
        miniGame = new TestMiniGame();
    });

    describe('基础状态', () => {
        it('初始状态应该是 READY', () => {
            expect(miniGame.getState()).toBe(MiniGameState.READY);
        });

        it('应该返回正确的游戏类型', () => {
            expect(miniGame.getGameType()).toBe(MiniGameType.KNEAD);
        });

        it('应该返回正确的总阶段数', () => {
            expect(miniGame.getTotalStages()).toBe(2);
        });

        it('初始阶段索引应该是 0', () => {
            expect(miniGame.getCurrentStageIndex()).toBe(0);
        });
    });

    describe('游戏流程', () => {
        it('开始游戏后状态应该是 PLAYING', () => {
            miniGame.start();
            expect(miniGame.getState()).toBe(MiniGameState.PLAYING);
        });

        it('开始游戏应该发布 STARTED 事件', () => {
            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.STARTED, handler);

            miniGame.start();

            expect(handler).toHaveBeenCalledWith({
                gameType: MiniGameType.KNEAD,
                totalStages: 2,
                timeLimit: 7 // 5 + 2
            });
        });

        it('开始后应该返回当前阶段', () => {
            miniGame.start();
            const stage = miniGame.getCurrentStage();

            expect(stage).not.toBeNull();
            expect(stage?.id).toBe('stage1');
        });

        it('提交操作应该更新进度', () => {
            miniGame.start();

            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.PROGRESS_UPDATED, handler);

            miniGame.submitAction(5);

            expect(handler).toHaveBeenCalledWith({
                stageIndex: 0,
                progress: 0.5,
                currentValue: 5,
                targetValue: 10
            });
        });

        it('达到目标值应该完成当前阶段', () => {
            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.STAGE_COMPLETED, handler);

            miniGame.start();
            miniGame.submitAction(10);

            expect(handler).toHaveBeenCalled();
            expect(handler.mock.calls[0][0].stageId).toBe('stage1');
            expect(handler.mock.calls[0][0].success).toBe(true);
        });

        it('完成所有阶段后状态应该是 SUCCESS', () => {
            miniGame.start();
            miniGame.submitAction(10); // 完成阶段1
            miniGame.submitAction(1);  // 完成阶段2

            expect(miniGame.getState()).toBe(MiniGameState.SUCCESS);
        });

        it('失败后状态应该是 FAILED', () => {
            miniGame.start();
            miniGame.failCurrentStage();

            expect(miniGame.getState()).toBe(MiniGameState.FAILED);
        });
    });

    describe('暂停/恢复', () => {
        it('暂停后状态应该是 PAUSED', () => {
            miniGame.start();
            miniGame.pause();
            expect(miniGame.getState()).toBe(MiniGameState.PAUSED);
        });

        it('恢复后状态应该是 PLAYING', () => {
            miniGame.start();
            miniGame.pause();
            miniGame.resume();
            expect(miniGame.getState()).toBe(MiniGameState.PLAYING);
        });

        it('PAUSED 状态下提交操作应该无效', () => {
            miniGame.start();
            miniGame.pause();

            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.PROGRESS_UPDATED, handler);

            miniGame.submitAction(5);

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('跳过阶段', () => {
        it('跳过阶段应该给 50 分并继续下一阶段', () => {
            miniGame.start();
            miniGame.skipCurrentStage();

            // 跳过后应该进入下一阶段
            expect(miniGame.getCurrentStageIndex()).toBe(1);
        });

        it('跳过所有阶段后应该获得结果', () => {
            miniGame.start();
            miniGame.skipCurrentStage();
            miniGame.skipCurrentStage();

            const result = miniGame.getResult();
            expect(result).not.toBeNull();
            expect(result?.stageResults[0].score).toBe(50);
            expect(result?.stageResults[1].score).toBe(50);
        });
    });

    describe('熟练度加成', () => {
        it('设置熟练度加成应该减少时间限制', () => {
            miniGame.setMasteryBonus(3, 0.2); // 等级3，20%时间减免

            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.STARTED, handler);

            miniGame.start();

            // 基础时间: 5 + 2 = 7
            // 每阶段单独计算减免后取整: round(5*0.8) + round(2*0.8) = 4 + 2 = 6
            expect(handler.mock.calls[0][0].timeLimit).toBe(6);
        });
    });

    describe('获取结果', () => {
        it('游戏中获取结果应该返回 null', () => {
            miniGame.start();
            expect(miniGame.getResult()).toBeNull();
        });

        it('完成后应该返回完整结果', () => {
            miniGame.start();
            miniGame.submitAction(10);
            miniGame.submitAction(1);

            const result = miniGame.getResult();

            expect(result).not.toBeNull();
            expect(result?.success).toBe(true);
            expect(result?.stageResults.length).toBe(2);
            expect(result?.quality).toBeDefined();
        });

        it('高评分应该获得高品质', () => {
            miniGame.start();
            miniGame.submitAction(10); // 100分
            miniGame.submitAction(1);  // 100分

            const result = miniGame.getResult();
            expect(result?.quality).toBe(Quality.HIGH);
        });
    });

    describe('重置', () => {
        it('重置后应该回到初始状态', () => {
            miniGame.start();
            miniGame.submitAction(10);
            miniGame.reset();

            expect(miniGame.getState()).toBe(MiniGameState.READY);
            expect(miniGame.getCurrentStageIndex()).toBe(0);
        });
    });
});

describe('MooncakeMiniGame', () => {
    let mooncakeGame: MooncakeMiniGame;
    let eventSystem: EventSystem;

    beforeEach(() => {
        EventSystem.resetInstance();
        eventSystem = EventSystem.getInstance();
        mooncakeGame = new MooncakeMiniGame();
    });

    describe('阶段定义', () => {
        it('应该有 4 个阶段', () => {
            expect(mooncakeGame.getTotalStages()).toBe(4);
        });

        it('游戏类型应该是 KNEAD', () => {
            expect(mooncakeGame.getGameType()).toBe(MiniGameType.KNEAD);
        });
    });

    describe('揉面阶段', () => {
        it('应该正确处理揉面操作', () => {
            mooncakeGame.start();

            // 提交 20 次点击
            mooncakeGame.submitAction(20);

            expect(mooncakeGame.getCurrentStageIndex()).toBe(1);
        });
    });

    describe('包馅阶段', () => {
        it('高准确度应该成功', () => {
            mooncakeGame.start();
            mooncakeGame.submitAction(20); // 完成揉面

            mooncakeGame.submitFilling(0.9); // 90% 准确度

            expect(mooncakeGame.getCurrentStageIndex()).toBe(2);
        });

        it('低准确度应该失败', () => {
            mooncakeGame.start();
            mooncakeGame.submitAction(20);

            mooncakeGame.submitFilling(0.5); // 50% 准确度

            expect(mooncakeGame.getState()).toBe(MiniGameState.FAILED);
        });

        it('准确度应该影响评分', () => {
            mooncakeGame.start();
            mooncakeGame.submitAction(20);
            mooncakeGame.submitFilling(0.9);
            mooncakeGame.submitMold(mooncakeGame.getCorrectMold());
            // 等待烘烤阶段自动完成

            // 手动触发烘烤完成
            mooncakeGame.submitAction(1);

            const result = mooncakeGame.getResult();
            const fillingResult = result?.stageResults.find(r => r.stageId === 'filling');
            expect(fillingResult?.score).toBeGreaterThan(80);
        });
    });

    describe('压模阶段', () => {
        it('选择正确模具应该成功', () => {
            mooncakeGame.start();
            mooncakeGame.submitAction(20);
            mooncakeGame.submitFilling(0.9);

            const correctMold = mooncakeGame.getCorrectMold();
            mooncakeGame.submitMold(correctMold);

            expect(mooncakeGame.getCurrentStageIndex()).toBe(3);
        });

        it('选择错误模具应该失败', () => {
            mooncakeGame.start();
            mooncakeGame.submitAction(20);
            mooncakeGame.submitFilling(0.9);

            // 选择一个错误的模具
            const correctMold = mooncakeGame.getCorrectMold();
            const wrongMold = Object.values(MooncakeMoldType).find(m => m !== correctMold)!;
            mooncakeGame.submitMold(wrongMold);

            expect(mooncakeGame.getState()).toBe(MiniGameState.FAILED);
        });
    });

    describe('完整流程', () => {
        it('应该能够完成整个制作流程', () => {
            const completedHandler = jest.fn();
            eventSystem.on(MiniGameEvents.COMPLETED, completedHandler);

            mooncakeGame.start();

            // 阶段1: 揉面
            mooncakeGame.submitAction(20);

            // 阶段2: 包馅
            mooncakeGame.submitFilling(0.95);

            // 阶段3: 压模
            mooncakeGame.submitMold(mooncakeGame.getCorrectMold());

            // 阶段4: 烘烤
            mooncakeGame.submitAction(1);

            expect(mooncakeGame.getState()).toBe(MiniGameState.SUCCESS);

            const result = mooncakeGame.getResult();
            expect(result).not.toBeNull();
            expect(result?.success).toBe(true);
            expect(result?.stageResults.length).toBe(4);
        });
    });

    describe('熟练度时间减免', () => {
        it('高熟练度应该减少时间限制', () => {
            mooncakeGame.setMasteryBonus(4, 0.3); // MASTER, 30% 减免

            const handler = jest.fn();
            eventSystem.on(MiniGameEvents.STARTED, handler);

            mooncakeGame.start();

            // 基础时间: 8 + 10 + 8 + 4 = 30
            // 减免后: 30 * 0.7 = 21
            expect(handler.mock.calls[0][0].timeLimit).toBe(21);
        });
    });
});
