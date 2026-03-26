/**
 * TutorialSystem 单元测试
 */

import {
    TutorialSystem,
    TutorialStepType,
    TutorialEvents,
    TutorialSequenceConfig,
    createBasicTutorialSequences
} from '../../src/gameplay/TutorialSystem';
import { EventSystem } from '../../src/core/EventSystem';

// 创建测试序列
const createTestSequence = (id: string = 'test-sequence'): TutorialSequenceConfig => ({
    id,
    name: '测试序列',
    description: '用于测试的序列',
    priority: 1,
    required: false,
    steps: [
        {
            id: 'step-1',
            type: TutorialStepType.DIALOGUE,
            content: '第一步'
        },
        {
            id: 'step-2',
            type: TutorialStepType.ACTION,
            target: 'test-target',
            hint: '执行操作'
        },
        {
            id: 'step-3',
            type: TutorialStepType.DIALOGUE,
            content: '第三步'
        }
    ]
});

describe('TutorialSystem', () => {
    let tutorialSystem: TutorialSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        TutorialSystem.resetInstance();
        EventSystem.resetInstance();

        tutorialSystem = TutorialSystem.getInstance();
        eventSystem = EventSystem.getInstance();
    });

    afterEach(() => {
        eventSystem.clearAll();
    });

    describe('序列注册', () => {
        it('应该能注册序列', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);

            const retrieved = tutorialSystem.getSequence(sequence.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('测试序列');
        });

        it('重复注册相同 ID 应该被忽略', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.registerSequence(sequence);

            const all = tutorialSystem.getAllSequences();
            expect(all.length).toBe(1);
        });

        it('应该能批量注册序列', () => {
            const sequences = [
                createTestSequence('seq-1'),
                createTestSequence('seq-2'),
                createTestSequence('seq-3')
            ];

            tutorialSystem.registerSequences(sequences);

            expect(tutorialSystem.getAllSequences().length).toBe(3);
        });

        it('应该设置默认优先级', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);

            const retrieved = tutorialSystem.getSequence(sequence.id);
            expect(retrieved?.priority).toBe(1);
        });
    });

    describe('开始序列', () => {
        it('应该能开始序列', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);

            const result = tutorialSystem.startSequence(sequence.id);

            expect(result).toBe(true);
            expect(tutorialSystem.getActiveSequence()).not.toBeNull();
        });

        it('开始不存在的序列应该返回 false', () => {
            const result = tutorialSystem.startSequence('non-existent');

            expect(result).toBe(false);
        });

        it('开始序列应该发布 SEQUENCE_STARTED 事件', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.SEQUENCE_STARTED, handler);

            tutorialSystem.startSequence(sequence.id);

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                sequenceId: sequence.id,
                sequenceName: sequence.name
            }));
        });

        it('开始序列应该发布 STEP_STARTED 事件', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.STEP_STARTED, handler);

            tutorialSystem.startSequence(sequence.id);

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'step-1',
                stepType: TutorialStepType.DIALOGUE
            }));
        });

        it('未满足依赖应该无法开始序列', () => {
            const sequence = createTestSequence();
            sequence.dependencies = ['other-sequence'];
            tutorialSystem.registerSequence(sequence);

            const result = tutorialSystem.startSequence(sequence.id);

            expect(result).toBe(false);
        });

        it('满足依赖后应该能开始序列', () => {
            const depSequence = createTestSequence('dep-sequence');
            depSequence.steps = [{ id: 'single-step', type: TutorialStepType.DIALOGUE, content: 'x' }];
            tutorialSystem.registerSequence(depSequence);

            const sequence = createTestSequence();
            sequence.dependencies = ['dep-sequence'];
            tutorialSystem.registerSequence(sequence);

            // 完成依赖序列
            tutorialSystem.startSequence('dep-sequence');
            tutorialSystem.completeCurrentStep();

            // 现在应该能开始
            const result = tutorialSystem.startSequence(sequence.id);
            expect(result).toBe(true);
        });

        it('触发条件不满足应该无法开始', () => {
            const sequence = createTestSequence();
            sequence.triggerCondition = () => false;
            tutorialSystem.registerSequence(sequence);

            const result = tutorialSystem.startSequence(sequence.id);

            expect(result).toBe(false);
        });

        it('已完成的非可重复序列不应该重新开始', () => {
            const sequence = createTestSequence();
            sequence.steps = [{ id: 'single-step', type: TutorialStepType.DIALOGUE, content: 'x' }];
            tutorialSystem.registerSequence(sequence);

            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            const result = tutorialSystem.startSequence(sequence.id);

            expect(result).toBe(false);
        });

        it('可重复序列可以重新开始', () => {
            const sequence = createTestSequence();
            sequence.steps = [{ id: 'single-step', type: TutorialStepType.DIALOGUE, content: 'x' }];
            sequence.repeatable = true;
            tutorialSystem.registerSequence(sequence);

            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            const result = tutorialSystem.startSequence(sequence.id);

            expect(result).toBe(true);
        });
    });

    describe('步骤完成', () => {
        it('应该能完成当前步骤', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const result = tutorialSystem.completeCurrentStep();

            expect(result).toBe(true);
        });

        it('完成步骤应该发布 STEP_COMPLETED 事件', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.STEP_COMPLETED, handler);

            tutorialSystem.completeCurrentStep();

            expect(handler).toHaveBeenCalled();
        });

        it('完成步骤应该移动到下一步', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            tutorialSystem.completeCurrentStep();

            const currentStep = tutorialSystem.getCurrentStep();
            expect(currentStep?.id).toBe('step-2');
        });

        it('完成所有步骤应该完成序列', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.SEQUENCE_COMPLETED, handler);

            tutorialSystem.completeCurrentStep();
            tutorialSystem.completeCurrentStep();
            tutorialSystem.completeCurrentStep();

            expect(handler).toHaveBeenCalled();
            expect(tutorialSystem.getActiveSequence()).toBeNull();
        });

        it('没有活动序列时完成应该返回 false', () => {
            const result = tutorialSystem.completeCurrentStep();

            expect(result).toBe(false);
        });
    });

    describe('步骤跳过', () => {
        it('应该能跳过当前步骤', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const result = tutorialSystem.skipCurrentStep();

            expect(result).toBe(true);
        });

        it('跳过步骤应该发布 STEP_SKIPPED 事件', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.STEP_SKIPPED, handler);

            tutorialSystem.skipCurrentStep();

            expect(handler).toHaveBeenCalled();
        });

        it('不可跳过的步骤应该无法跳过', () => {
            const sequence = createTestSequence();
            sequence.steps[0].skippable = false;
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const result = tutorialSystem.skipCurrentStep();

            expect(result).toBe(false);
        });

        it('必须序列应该无法整体跳过', () => {
            const sequence = createTestSequence();
            sequence.required = true;
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const result = tutorialSystem.skipCurrentSequence();

            expect(result).toBe(false);
        });

        it('非必须序列可以整体跳过', () => {
            const sequence = createTestSequence();
            sequence.required = false;
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const result = tutorialSystem.skipCurrentSequence();

            expect(result).toBe(true);
            expect(tutorialSystem.getActiveSequence()).toBeNull();
        });
    });

    describe('暂停和恢复', () => {
        it('应该能暂停和恢复', () => {
            expect(tutorialSystem.isPaused()).toBe(false);

            tutorialSystem.pause();
            expect(tutorialSystem.isPaused()).toBe(true);

            tutorialSystem.resume();
            expect(tutorialSystem.isPaused()).toBe(false);
        });
    });

    describe('状态查询', () => {
        it('应该能检查序列是否完成', () => {
            const sequence = createTestSequence();
            sequence.steps = [{ id: 'single-step', type: TutorialStepType.DIALOGUE, content: 'x' }];
            tutorialSystem.registerSequence(sequence);

            expect(tutorialSystem.isSequenceCompleted(sequence.id)).toBe(false);

            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            expect(tutorialSystem.isSequenceCompleted(sequence.id)).toBe(true);
        });

        it('应该能获取序列进度', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            expect(tutorialSystem.getSequenceProgress(sequence.id)).toBe(0);

            tutorialSystem.completeCurrentStep();

            expect(tutorialSystem.getSequenceProgress(sequence.id)).toBeCloseTo(1/3, 1);
        });

        it('应该能获取下一个可用序列', () => {
            const seq1 = createTestSequence('seq-1');
            seq1.priority = 2;
            const seq2 = createTestSequence('seq-2');
            seq2.priority = 1;

            tutorialSystem.registerSequences([seq1, seq2]);

            const next = tutorialSystem.getNextAvailableSequence();

            expect(next?.id).toBe('seq-2'); // 优先级更高
        });

        it('已完成的非可重复序列不应该出现在可用列表中', () => {
            const sequence = createTestSequence();
            sequence.steps = [{ id: 'single-step', type: TutorialStepType.DIALOGUE, content: 'x' }];
            tutorialSystem.registerSequence(sequence);

            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            const next = tutorialSystem.getNextAvailableSequence();

            expect(next).toBeNull();
        });
    });

    describe('存档功能', () => {
        it('应该能导出和导入数据', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            const data = tutorialSystem.exportData();
            expect(data.completedSequences.length).toBe(0);
            expect(data.activeSequenceId).toBe(sequence.id);
            expect(data.currentStepIndex).toBe(1);

            // 重置并导入
            tutorialSystem.reset();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.importData(data);

            expect(tutorialSystem.getActiveSequence()?.sequenceId).toBe(sequence.id);
        });

        it('reset 应该清除所有状态', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);
            tutorialSystem.completeCurrentStep();

            tutorialSystem.reset();

            expect(tutorialSystem.getActiveSequence()).toBeNull();
            // reset 只清除状态，不清除注册的序列
            expect(tutorialSystem.isSequenceCompleted(sequence.id)).toBe(false);
        });
    });

    describe('进度事件', () => {
        it('完成步骤应该发布 PROGRESS_UPDATED 事件', () => {
            const sequence = createTestSequence();
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.PROGRESS_UPDATED, handler);

            tutorialSystem.completeCurrentStep();

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                sequenceId: sequence.id,
                completedSteps: 1,
                totalSteps: 3
            }));
        });
    });

    describe('跳过条件', () => {
        it('满足 skipIf 条件应该自动跳过步骤', () => {
            const sequence = createTestSequence();
            sequence.steps[0].skipIf = () => true;
            tutorialSystem.registerSequence(sequence);

            const handler = jest.fn();
            eventSystem.on(TutorialEvents.STEP_SKIPPED, handler);

            tutorialSystem.startSequence(sequence.id);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('自定义下一步', () => {
        it('nextStep 应该跳转到指定步骤', () => {
            const sequence = createTestSequence();
            sequence.steps[0].nextStep = 'step-3';
            tutorialSystem.registerSequence(sequence);
            tutorialSystem.startSequence(sequence.id);

            tutorialSystem.completeCurrentStep();

            const currentStep = tutorialSystem.getCurrentStep();
            expect(currentStep?.id).toBe('step-3');
        });
    });
});

describe('createBasicTutorialSequences', () => {
    it('应该返回基础引导序列', () => {
        const sequences = createBasicTutorialSequences();

        expect(sequences.length).toBeGreaterThan(0);
        expect(sequences.find(s => s.id === 'welcome')).toBeDefined();
        expect(sequences.find(s => s.id === 'gathering-basics')).toBeDefined();
        expect(sequences.find(s => s.id === 'crafting-basics')).toBeDefined();
        expect(sequences.find(s => s.id === 'villager-basics')).toBeDefined();
    });

    it('序列应该有正确的依赖关系', () => {
        const sequences = createBasicTutorialSequences();

        const gathering = sequences.find(s => s.id === 'gathering-basics');
        expect(gathering?.dependencies).toContain('welcome');

        const crafting = sequences.find(s => s.id === 'crafting-basics');
        expect(crafting?.dependencies).toContain('gathering-basics');
    });

    it('序列应该有正确的优先级顺序', () => {
        const sequences = createBasicTutorialSequences();

        const welcome = sequences.find(s => s.id === 'welcome');
        const gathering = sequences.find(s => s.id === 'gathering-basics');

        expect((welcome?.priority ?? 0)).toBeLessThan((gathering?.priority ?? 0));
    });
});
