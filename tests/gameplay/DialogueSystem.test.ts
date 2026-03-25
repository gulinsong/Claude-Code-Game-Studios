/**
 * DialogueSystem 单元测试
 */

import {
    DialogueSystem,
    Speaker,
    TriggerType,
    EffectType,
    DialogueState,
    DialogueEvents,
    Dialogue,
    IConditionEvaluator,
    IEffectExecutor
} from '../../src/gameplay/DialogueSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { BackpackSystem, ItemType } from '../../src/data/BackpackSystem';
import { RecipeSystem, RecipeCategory, RecipeRarity } from '../../src/data/RecipeSystem';
import { TimeSystem } from '../../src/core/TimeSystem';
import { MaterialSystem, MaterialType, MaterialRarity } from '../../src/data/MaterialSystem';

// 测试用对话
const createTestDialogue = (id: string, npcId: string, options: Partial<Dialogue> = {}): Dialogue => ({
    id,
    npcId,
    trigger: { type: TriggerType.ALWAYS, params: {} },
    priority: 1,
    nodes: [
        {
            id: 'node1',
            text: '你好，旅行者！',
            speaker: Speaker.NPC,
            choices: [],
            effects: []
        }
    ],
    repeatable: true,
    ...options
});

// 带选项的测试对话
const createDialogueWithChoices = (): Dialogue => ({
    id: 'dialogue_choices',
    npcId: 'npc_test',
    trigger: { type: TriggerType.ALWAYS, params: {} },
    priority: 1,
    nodes: [
        {
            id: 'node1',
            text: '今天天气真好！',
            speaker: Speaker.NPC,
            choices: [
                {
                    text: '是啊，很棒！',
                    effects: [],
                    nextNodeId: 'node2'
                },
                {
                    text: '我觉得一般...',
                    effects: [],
                    nextNodeId: 'node3'
                }
            ],
            effects: []
        },
        {
            id: 'node2',
            text: '很高兴你也这么觉得！',
            speaker: Speaker.NPC,
            choices: [],
            effects: []
        },
        {
            id: 'node3',
            text: '好吧，每个人都有自己的看法。',
            speaker: Speaker.NPC,
            choices: [],
            effects: []
        }
    ],
    repeatable: true
});

// 带效果的测试对话
const createDialogueWithEffects = (): Dialogue => ({
    id: 'dialogue_effects',
    npcId: 'npc_test',
    trigger: { type: TriggerType.ALWAYS, params: {} },
    priority: 1,
    nodes: [
        {
            id: 'node1',
            text: '这是给你的礼物！',
            speaker: Speaker.NPC,
            choices: [],
            effects: [
                { type: EffectType.SET_FLAG, params: { flagName: 'received_gift', value: true } },
                { type: EffectType.GIVE_ITEM, params: { itemId: 'test_item', amount: 1 } }
            ],
            nextNodeId: 'node2'
        },
        {
            id: 'node2',
            text: '收下吧！',
            speaker: Speaker.NPC,
            choices: [],
            effects: []
        }
    ],
    repeatable: false
});

// Mock 条件评估器
const createMockConditionEvaluator = (): IConditionEvaluator => ({
    getFriendship: jest.fn().mockReturnValue(50),
    isQuestComplete: jest.fn().mockReturnValue(false),
    isQuestActive: jest.fn().mockReturnValue(false)
});

// Mock 效果执行器
const createMockEffectExecutor = (): IEffectExecutor => ({
    changeFriendship: jest.fn(),
    startQuest: jest.fn(),
    completeQuest: jest.fn()
});

describe('DialogueSystem', () => {
    let dialogueSystem: DialogueSystem;
    let eventSystem: EventSystem;

    beforeEach(() => {
        // 重置所有单例
        DialogueSystem.resetInstance();
        EventSystem.resetInstance();
        BackpackSystem.resetInstance();
        RecipeSystem.resetInstance();
        MaterialSystem.resetInstance();
        TimeSystem.resetInstance();

        dialogueSystem = DialogueSystem.getInstance();
        eventSystem = EventSystem.getInstance();

        // 注册测试材料
        const materialSystem = MaterialSystem.getInstance();
        materialSystem.initialize([
            { id: 'test_item', name: '测试物品', description: '', type: MaterialType.RESOURCE, rarity: MaterialRarity.COMMON, maxStack: 99, icon: '', sellPrice: 1, sources: [] }
        ]);

        // 注册并解锁测试食谱
        const recipeSystem = RecipeSystem.getInstance();
        recipeSystem.registerRecipe({
            id: 'test_recipe',
            name: '测试食谱',
            description: '',
            lore: '',
            rarity: RecipeRarity.COMMON,
            category: RecipeCategory.FOOD,
            inputs: [],
            output: { itemId: 'output', amount: 1 },
            craftTime: 10,
            unlockCondition: ''
        });
    });

    describe('基础功能', () => {
        describe('registerDialogue', () => {
            it('应该成功注册对话', () => {
                const dialogue = createTestDialogue('test_1', 'npc_1');
                dialogueSystem.registerDialogue(dialogue);

                expect(dialogueSystem.getDialogue('test_1')).toEqual(dialogue);
            });

            it('重复注册同一对话应该警告', () => {
                const dialogue = createTestDialogue('test_1', 'npc_1');
                dialogueSystem.registerDialogue(dialogue);

                const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
                dialogueSystem.registerDialogue(dialogue);
                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });

            it('应该按 NPC 分组对话', () => {
                dialogueSystem.registerDialogue(createTestDialogue('d1', 'npc_1'));
                dialogueSystem.registerDialogue(createTestDialogue('d2', 'npc_1'));
                dialogueSystem.registerDialogue(createTestDialogue('d3', 'npc_2'));

                // 通过触发对话来验证分组
                expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            });
        });

        describe('registerDialogues', () => {
            it('应该批量注册对话', () => {
                const dialogues = [
                    createTestDialogue('d1', 'npc_1'),
                    createTestDialogue('d2', 'npc_1')
                ];
                dialogueSystem.registerDialogues(dialogues);

                expect(dialogueSystem.getDialogue('d1')).toBeDefined();
                expect(dialogueSystem.getDialogue('d2')).toBeDefined();
            });
        });
    });

    describe('对话流程', () => {
        describe('startDialogue', () => {
            it('应该成功开始对话', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                const result = dialogueSystem.startDialogue('npc_1');

                expect(result).toBe(true);
                expect(dialogueSystem.getState()).toBe(DialogueState.PLAYING);
            });

            it('应该发布 STARTED 事件', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                const handler = jest.fn();
                eventSystem.on(DialogueEvents.STARTED, handler);

                dialogueSystem.startDialogue('npc_1');

                expect(handler).toHaveBeenCalledWith({
                    dialogueId: 'test',
                    npcId: 'npc_1'
                });
            });

            it('NPC 没有对话时应该返回 false', () => {
                const result = dialogueSystem.startDialogue('npc_no_dialogues');
                expect(result).toBe(false);
            });

            it('已在对话中时应该返回 false', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                const result = dialogueSystem.startDialogue('npc_1');

                expect(result).toBe(false);
            });
        });

        describe('advance', () => {
            it('应该推进到下一个节点', () => {
                const dialogue: Dialogue = {
                    id: 'test',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.ALWAYS, params: {} },
                    priority: 1,
                    nodes: [
                        { id: 'n1', text: '第一句', speaker: Speaker.NPC, choices: [], effects: [], nextNodeId: 'n2' },
                        { id: 'n2', text: '第二句', speaker: Speaker.NPC, choices: [], effects: [] }
                    ],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                dialogueSystem.startDialogue('npc_1');
                expect(dialogueSystem.getCurrentNode()?.id).toBe('n1');

                dialogueSystem.advance();
                expect(dialogueSystem.getCurrentNode()?.id).toBe('n2');
            });

            it('没有下一个节点时应该结束对话', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.advance();

                expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
            });

            it('有选项时应该进入 CHOOSING 状态', () => {
                dialogueSystem.registerDialogue(createDialogueWithChoices());

                dialogueSystem.startDialogue('npc_test');
                dialogueSystem.advance();

                expect(dialogueSystem.getState()).toBe(DialogueState.CHOOSING);
            });

            it('非 PLAYING 状态下应该无效', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.advance();

                expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
            });
        });

        describe('selectChoice', () => {
            it('应该正确选择选项', () => {
                dialogueSystem.registerDialogue(createDialogueWithChoices());

                dialogueSystem.startDialogue('npc_test');
                dialogueSystem.advance();

                const handler = jest.fn();
                eventSystem.on(DialogueEvents.CHOICE_MADE, handler);

                dialogueSystem.selectChoice(0);

                expect(handler).toHaveBeenCalledWith({
                    dialogueId: 'dialogue_choices',
                    nodeId: 'node1',
                    choiceIndex: 0,
                    choiceText: '是啊，很棒！'
                });

                expect(dialogueSystem.getCurrentNode()?.id).toBe('node2');
            });

            it('无效索引应该被忽略', () => {
                dialogueSystem.registerDialogue(createDialogueWithChoices());

                dialogueSystem.startDialogue('npc_test');
                dialogueSystem.advance();

                dialogueSystem.selectChoice(99);

                expect(dialogueSystem.getState()).toBe(DialogueState.CHOOSING);
            });

            it('非 CHOOSING 状态下应该无效', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.selectChoice(0);

                expect(dialogueSystem.getState()).toBe(DialogueState.PLAYING);
            });
        });

        describe('endDialogue', () => {
            it('应该结束当前对话', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.endDialogue();

                expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
                expect(dialogueSystem.getCurrentDialogue()).toBeNull();
            });

            it('应该发布 COMPLETED 事件', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                const handler = jest.fn();
                eventSystem.on(DialogueEvents.COMPLETED, handler);

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.endDialogue();

                expect(handler).toHaveBeenCalledWith({
                    dialogueId: 'test',
                    npcId: 'npc_1'
                });
            });

            it('应该标记对话完成', () => {
                dialogueSystem.registerDialogue(createDialogueWithEffects());

                dialogueSystem.startDialogue('npc_test');
                dialogueSystem.endDialogue();

                expect(dialogueSystem.isDialogueCompleted('dialogue_effects')).toBe(true);
            });
        });
    });

    describe('状态查询', () => {
        describe('getState', () => {
            it('初始状态应该是 IDLE', () => {
                expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
            });
        });

        describe('getCurrentDialogue', () => {
            it('没有对话时应该返回 null', () => {
                expect(dialogueSystem.getCurrentDialogue()).toBeNull();
            });

            it('应该返回当前对话', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');

                expect(dialogueSystem.getCurrentDialogue()?.id).toBe('test');
            });
        });

        describe('getCurrentNode', () => {
            it('应该返回当前节点', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');

                expect(dialogueSystem.getCurrentNode()?.id).toBe('node1');
            });
        });

        describe('getAvailableChoices', () => {
            it('没有选项时应该返回空数组', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');

                expect(dialogueSystem.getAvailableChoices()).toEqual([]);
            });

            it('应该返回所有可用选项', () => {
                dialogueSystem.registerDialogue(createDialogueWithChoices());

                dialogueSystem.startDialogue('npc_test');
                dialogueSystem.advance();

                const choices = dialogueSystem.getAvailableChoices();
                expect(choices.length).toBe(2);
                expect(choices[0].text).toBe('是啊，很棒！');
            });

            it('应该过滤不满足条件的选项', () => {
                const dialogue: Dialogue = {
                    id: 'test',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.ALWAYS, params: {} },
                    priority: 1,
                    nodes: [
                        {
                            id: 'n1',
                            text: '选择',
                            speaker: Speaker.NPC,
                            choices: [
                                { text: '选项1', effects: [], nextNodeId: 'n2' },
                                {
                                    text: '选项2',
                                    condition: { type: TriggerType.FLAG_SET, params: { flagName: 'hidden', value: true } },
                                    effects: [],
                                    nextNodeId: 'n2'
                                }
                            ],
                            effects: []
                        },
                        { id: 'n2', text: '结束', speaker: Speaker.NPC, choices: [], effects: [] }
                    ],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.advance();

                const choices = dialogueSystem.getAvailableChoices();
                expect(choices.length).toBe(1);
                expect(choices[0].text).toBe('选项1');
            });
        });

        describe('isDialogueCompleted', () => {
            it('未完成对话应该返回 false', () => {
                expect(dialogueSystem.isDialogueCompleted('unknown')).toBe(false);
            });

            it('已完成对话应该返回 true', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.endDialogue();

                expect(dialogueSystem.isDialogueCompleted('test')).toBe(true);
            });
        });
    });

    describe('条件和效果', () => {
        describe('触发条件', () => {
            it('FIRST_MEET 条件应该只在首次见面时触发', () => {
                const dialogue: Dialogue = {
                    id: 'first_meet',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.FIRST_MEET, params: { npcId: 'npc_1' } },
                    priority: 1,
                    nodes: [{ id: 'n1', text: '初次见面！', speaker: Speaker.NPC, choices: [], effects: [] }],
                    repeatable: false
                };
                dialogueSystem.registerDialogue(dialogue);

                // 第一次应该触发
                expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
                dialogueSystem.endDialogue();

                // 第二次不应该触发
                expect(dialogueSystem.startDialogue('npc_1')).toBe(false);
            });

            it('FLAG_SET 条件应该检查标志位', () => {
                const dialogue: Dialogue = {
                    id: 'flag_dialogue',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.FLAG_SET, params: { flagName: 'test_flag', value: true } },
                    priority: 1,
                    nodes: [{ id: 'n1', text: '标志位已设置！', speaker: Speaker.NPC, choices: [], effects: [] }],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                // 没有设置标志位时不触发
                expect(dialogueSystem.startDialogue('npc_1')).toBe(false);

                // 设置标志位后触发
                dialogueSystem.setFlag('test_flag', true);
                expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            });

            it('ITEM_OWNED 条件应该检查背包', () => {
                const dialogue: Dialogue = {
                    id: 'item_dialogue',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.ITEM_OWNED, params: { itemId: 'test_item', amount: 5 } },
                    priority: 1,
                    nodes: [{ id: 'n1', text: '你有物品！', speaker: Speaker.NPC, choices: [], effects: [] }],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                // 没有物品时不触发
                expect(dialogueSystem.startDialogue('npc_1')).toBe(false);

                // 添加物品后触发
                BackpackSystem.getInstance().addItem('test_item', ItemType.MATERIAL, 5);
                expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            });

            it('FRIENDSHIP_LEVEL 条件应该检查好感度', () => {
                const dialogue: Dialogue = {
                    id: 'friendship_dialogue',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.FRIENDSHIP_LEVEL, params: { npcId: 'npc_1', level: 3 } },
                    priority: 1,
                    nodes: [{ id: 'n1', text: '我们很熟了！', speaker: Speaker.NPC, choices: [], effects: [] }],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                // 设置 mock 评估器
                const mockEvaluator = createMockConditionEvaluator();
                (mockEvaluator.getFriendship as jest.Mock).mockReturnValue(2);
                dialogueSystem.setConditionEvaluator(mockEvaluator);

                expect(dialogueSystem.startDialogue('npc_1')).toBe(false);

                // 提升好感度
                (mockEvaluator.getFriendship as jest.Mock).mockReturnValue(3);
                expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            });
        });

        describe('效果执行', () => {
            it('SET_FLAG 效果应该设置标志位', () => {
                dialogueSystem.registerDialogue(createDialogueWithEffects());

                dialogueSystem.startDialogue('npc_test');

                expect(dialogueSystem.getFlag('received_gift')).toBe(true);
            });

            it('GIVE_ITEM 效果应该添加物品', () => {
                dialogueSystem.registerDialogue(createDialogueWithEffects());
                const backpack = BackpackSystem.getInstance();

                dialogueSystem.startDialogue('npc_test');

                expect(backpack.getItemCount('test_item')).toBe(1);
            });

            it('UNLOCK_RECIPE 效果应该解锁食谱', () => {
                const dialogue: Dialogue = {
                    id: 'recipe_dialogue',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.ALWAYS, params: {} },
                    priority: 1,
                    nodes: [
                        {
                            id: 'n1',
                            text: '教你一个食谱！',
                            speaker: Speaker.NPC,
                            choices: [],
                            effects: [
                                { type: EffectType.UNLOCK_RECIPE, params: { recipeId: 'test_recipe' } }
                            ]
                        }
                    ],
                    repeatable: false
                };
                dialogueSystem.registerDialogue(dialogue);

                const recipeSystem = RecipeSystem.getInstance();
                expect(recipeSystem.isUnlocked('test_recipe')).toBe(false);

                dialogueSystem.startDialogue('npc_1');

                expect(recipeSystem.isUnlocked('test_recipe')).toBe(true);
            });

            it('CHANGE_FRIENDSHIP 效果应该调用执行器', () => {
                const dialogue: Dialogue = {
                    id: 'friendship_effect',
                    npcId: 'npc_1',
                    trigger: { type: TriggerType.ALWAYS, params: {} },
                    priority: 1,
                    nodes: [
                        {
                            id: 'n1',
                            text: '谢谢你！',
                            speaker: Speaker.NPC,
                            choices: [],
                            effects: [
                                { type: EffectType.CHANGE_FRIENDSHIP, params: { npcId: 'npc_1', delta: 10 } }
                            ]
                        }
                    ],
                    repeatable: true
                };
                dialogueSystem.registerDialogue(dialogue);

                const mockExecutor = createMockEffectExecutor();
                dialogueSystem.setEffectExecutor(mockExecutor);

                dialogueSystem.startDialogue('npc_1');

                expect(mockExecutor.changeFriendship).toHaveBeenCalledWith('npc_1', 10);
            });
        });
    });

    describe('优先级', () => {
        it('应该选择优先级最高的对话', () => {
            dialogueSystem.registerDialogue(createTestDialogue('low', 'npc_1', { priority: 1 }));
            dialogueSystem.registerDialogue(createTestDialogue('high', 'npc_1', { priority: 10 }));
            dialogueSystem.registerDialogue(createTestDialogue('mid', 'npc_1', { priority: 5 }));

            dialogueSystem.startDialogue('npc_1');

            expect(dialogueSystem.getCurrentDialogue()?.id).toBe('high');
        });
    });

    describe('重复性', () => {
        it('不可重复对话只应触发一次', () => {
            const dialogue: Dialogue = {
                id: 'once',
                npcId: 'npc_1',
                trigger: { type: TriggerType.ALWAYS, params: {} },
                priority: 1,
                nodes: [{ id: 'n1', text: '只说一次', speaker: Speaker.NPC, choices: [], effects: [] }],
                repeatable: false
            };
            dialogueSystem.registerDialogue(dialogue);

            // 第一次触发
            expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            dialogueSystem.endDialogue();

            // 第二次不触发
            expect(dialogueSystem.startDialogue('npc_1')).toBe(false);
        });

        it('可重复对话可以多次触发', () => {
            dialogueSystem.registerDialogue(createTestDialogue('repeat', 'npc_1', { repeatable: true }));

            // 第一次
            expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
            dialogueSystem.endDialogue();

            // 第二次
            expect(dialogueSystem.startDialogue('npc_1')).toBe(true);
        });
    });

    describe('存档功能', () => {
        describe('exportData / importData', () => {
            it('应该正确导出和导入数据', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.setFlag('test_flag', 'test_value');
                dialogueSystem.endDialogue();

                const data = dialogueSystem.exportData();

                // 重置
                DialogueSystem.resetInstance();
                dialogueSystem = DialogueSystem.getInstance();

                // 导入
                dialogueSystem.importData(data);

                expect(dialogueSystem.isDialogueCompleted('test')).toBe(true);
                expect(dialogueSystem.getFlag('test_flag')).toBe('test_value');
            });
        });

        describe('reset', () => {
            it('应该重置所有状态', () => {
                dialogueSystem.registerDialogue(createTestDialogue('test', 'npc_1'));

                dialogueSystem.startDialogue('npc_1');
                dialogueSystem.setFlag('flag', 'value');
                dialogueSystem.endDialogue();

                dialogueSystem.reset();

                expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
                expect(dialogueSystem.isDialogueCompleted('test')).toBe(false);
                expect(dialogueSystem.getFlag('flag')).toBeUndefined();
            });
        });
    });

    describe('边界情况', () => {
        it('对话没有节点时应该正常处理', () => {
            const dialogue: Dialogue = {
                id: 'empty',
                npcId: 'npc_1',
                trigger: { type: TriggerType.ALWAYS, params: {} },
                priority: 1,
                nodes: [],
                repeatable: true
            };
            dialogueSystem.registerDialogue(dialogue);

            expect(dialogueSystem.startDialogue('npc_1')).toBe(false);
        });

        it('选项指向不存在的节点时应该结束对话', () => {
            const dialogue: Dialogue = {
                id: 'broken',
                npcId: 'npc_1',
                trigger: { type: TriggerType.ALWAYS, params: {} },
                priority: 1,
                nodes: [
                    {
                        id: 'n1',
                        text: '选择',
                        speaker: Speaker.NPC,
                        choices: [
                            { text: '继续', effects: [], nextNodeId: 'nonexistent' }
                        ],
                        effects: []
                    }
                ],
                repeatable: true
            };
            dialogueSystem.registerDialogue(dialogue);

            dialogueSystem.startDialogue('npc_1');
            dialogueSystem.advance();
            dialogueSystem.selectChoice(0);

            expect(dialogueSystem.getState()).toBe(DialogueState.IDLE);
        });
    });
});
