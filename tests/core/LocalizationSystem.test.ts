/**
 * LocalizationSystem 测试
 */

import {
    LocalizationSystem,
    Language,
    LocalizationEvents,
    t
} from '../../src/core/LocalizationSystem';
import { EventSystem } from '../../src/core/EventSystem';

describe('LocalizationSystem', () => {
    beforeEach(() => {
        LocalizationSystem.resetInstance();
        // Reset EventSystem singleton
        (EventSystem as unknown as { instance: EventSystem | null }).instance = null;
    });

    describe('单例模式', () => {
        it('应该返回同一实例', () => {
            const instance1 = LocalizationSystem.getInstance();
            const instance2 = LocalizationSystem.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('语言管理', () => {
        it('默认语言应该是简体中文', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.getLanguage()).toBe(Language.ZH_CN);
        });

        it('应该能够切换语言', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.setLanguage(Language.EN);

            expect(i18n.getLanguage()).toBe(Language.EN);
        });

        it('切换语言应该触发事件', () => {
            const i18n = LocalizationSystem.getInstance();
            const eventSystem = EventSystem.getInstance();
            const handler = jest.fn();

            eventSystem.on(LocalizationEvents.LANGUAGE_CHANGED, handler);

            i18n.setLanguage(Language.EN);

            expect(handler).toHaveBeenCalledWith({
                previousLanguage: Language.ZH_CN,
                newLanguage: Language.EN
            });
        });

        it('切换到相同语言不应该触发事件', () => {
            const i18n = LocalizationSystem.getInstance();
            const eventSystem = EventSystem.getInstance();
            const handler = jest.fn();

            eventSystem.on(LocalizationEvents.LANGUAGE_CHANGED, handler);

            i18n.setLanguage(Language.ZH_CN);

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('t() 获取字符串', () => {
        it('应该返回正确的本地化字符串', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('common.confirm')).toBe('确认');
        });

        it('切换语言后应该返回对应语言的字符串', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.setLanguage(Language.EN);

            expect(i18n.t('common.confirm')).toBe('Confirm');
        });

        it('找不到键时应该返回键名', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
        });

        it('应该支持插值', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.loadStrings(Language.ZH_CN, {
                greeting: '你好，{name}！'
            });

            expect(i18n.t('greeting', { name: '小明' })).toBe('你好，小明！');
        });

        it('应该支持多个插值参数', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.loadStrings(Language.ZH_CN, {
                message: '{greeting}，{name}！你有{count}条消息。'
            });

            expect(i18n.t('message', { greeting: '你好', name: '小明', count: 3 }))
                .toBe('你好，小明！你有3条消息。');
        });

        it('找不到插值参数时应该保留占位符', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.loadStrings(Language.ZH_CN, {
                greeting: '你好，{name}！'
            });

            expect(i18n.t('greeting')).toBe('你好，{name}！');
        });
    });

    describe('has() 检查键存在', () => {
        it('存在的键应该返回 true', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.has('common.confirm')).toBe(true);
        });

        it('不存在的键应该返回 false', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.has('nonexistent.key')).toBe(false);
        });
    });

    describe('loadStrings() 加载字符串', () => {
        it('应该加载新字符串', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.loadStrings(Language.ZH_CN, {
                new: {
                    key: '新字符串'
                }
            });

            expect(i18n.t('new.key')).toBe('新字符串');
        });

        it('应该合并字符串表', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.loadStrings(Language.ZH_CN, {
                test: {
                    key1: '值1'
                }
            });

            i18n.loadStrings(Language.ZH_CN, {
                test: {
                    key2: '值2'
                }
            });

            expect(i18n.t('test.key1')).toBe('值1');
            expect(i18n.t('test.key2')).toBe('值2');
        });

        it('加载字符串应该触发事件', () => {
            const i18n = LocalizationSystem.getInstance();
            const eventSystem = EventSystem.getInstance();
            const handler = jest.fn();

            eventSystem.on(LocalizationEvents.STRINGS_LOADED, handler);

            i18n.loadStrings(Language.ZH_CN, { test: { key: 'test' } });

            expect(handler).toHaveBeenCalledWith({ language: Language.ZH_CN });
        });
    });

    describe('exportData() / importData()', () => {
        it('应该正确导出数据', () => {
            const i18n = LocalizationSystem.getInstance();
            i18n.setLanguage(Language.EN);

            const data = i18n.exportData();

            expect(data).toEqual({ language: Language.EN });
        });

        it('应该正确导入数据', () => {
            const i18n = LocalizationSystem.getInstance();

            i18n.importData({ language: Language.EN });

            expect(i18n.getLanguage()).toBe(Language.EN);
        });
    });

    describe('便捷函数', () => {
        it('t() 函数应该工作', () => {
            LocalizationSystem.resetInstance();
            (EventSystem as unknown as { instance: EventSystem | null }).instance = null;

            expect(t('common.confirm')).toBe('确认');
        });
    });

    describe('内置字符串', () => {
        it('应该包含食谱锁定字符串', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('recipe.locked.name')).toBe('???');
            expect(i18n.t('recipe.locked.description')).toBe('尚未解锁');
        });

        it('应该包含节日名称', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('festival.qingming')).toBe('清明');
            expect(i18n.t('festival.duanwu')).toBe('端午');
            expect(i18n.t('festival.zhongqiu')).toBe('中秋');
            expect(i18n.t('festival.chunjie')).toBe('春节');
        });

        it('应该包含迷你游戏字符串', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('minigame.mooncake.knead.name')).toBe('揉面');
            expect(i18n.t('minigame.mooncake.filling.hint')).toBe('拖拽馅料到面皮中心');
        });

        it('应该包含默认昵称', () => {
            const i18n = LocalizationSystem.getInstance();

            expect(i18n.t('user.default_nickname')).toBe('旅行者');
        });
    });
});
