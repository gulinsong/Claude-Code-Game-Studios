/**
 * ConfigSystem 单元测试
 */

import { ConfigSystem, configSystem, ConfigEvents } from '../../src/core/ConfigSystem';
import { eventSystem } from '../../src/core/EventSystem';

describe('ConfigSystem', () => {
    beforeEach(() => {
        configSystem.clear();
        eventSystem.clearAll();
    });

    describe('单例模式', () => {
        it('应该返回同一个实例', () => {
            const instance1 = ConfigSystem.getInstance();
            const instance2 = ConfigSystem.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('configSystem 应该是单例实例', () => {
            expect(configSystem).toBe(ConfigSystem.getInstance());
        });
    });

    describe('load() 和 get()', () => {
        it('应该正确加载和获取配置', () => {
            const testConfig = { setting1: 'value1', setting2: 42 };
            configSystem.load('test:config', testConfig);

            const result = configSystem.get<typeof testConfig>('test:config');
            expect(result).toEqual(testConfig);
        });

        it('不存在的配置应该返回 undefined', () => {
            const result = configSystem.get('nonexistent:config');
            expect(result).toBeUndefined();
        });

        it('应该触发 CONFIG_LOADED 事件', () => {
            const callback = jest.fn();
            eventSystem.on(ConfigEvents.CONFIG_LOADED, callback);

            configSystem.load('test:loaded', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({
                configKey: 'test:loaded',
                oldValue: undefined,
                newValue: { data: 'test' }
            });
        });
    });

    describe('getOrDefault()', () => {
        it('存在配置时返回配置值', () => {
            configSystem.load('test:default', { value: 100 });
            const result = configSystem.getOrDefault('test:default', { value: 0 });
            expect(result).toEqual({ value: 100 });
        });

        it('不存在配置时返回默认值', () => {
            const result = configSystem.getOrDefault('nonexistent:config', { value: 999 });
            expect(result).toEqual({ value: 999 });
        });
    });

    describe('has()', () => {
        it('存在配置时返回 true', () => {
            configSystem.load('test:exists', { data: 'test' });
            expect(configSystem.has('test:exists')).toBe(true);
        });

        it('不存在配置时返回 false', () => {
            expect(configSystem.has('nonexistent:config')).toBe(false);
        });
    });

    describe('set()', () => {
        it('应该正确设置配置值', () => {
            configSystem.set('test:set', { value: 1 });
            expect(configSystem.get('test:set')).toEqual({ value: 1 });
        });

        it('应该触发 CONFIG_CHANGED 事件', () => {
            const callback = jest.fn();
            eventSystem.on(ConfigEvents.CONFIG_CHANGED, callback);

            configSystem.set('test:change', { data: 'new' });

            expect(callback).toHaveBeenCalledWith({
                configKey: 'test:change',
                oldValue: undefined,
                newValue: { data: 'new' }
            });
        });

        it('更新已存在的配置时应该包含旧值', () => {
            configSystem.load('test:update', { version: 1 });

            const callback = jest.fn();
            eventSystem.on(ConfigEvents.CONFIG_CHANGED, callback);

            configSystem.set('test:update', { version: 2 });

            expect(callback).toHaveBeenCalledWith({
                configKey: 'test:update',
                oldValue: { version: 1 },
                newValue: { version: 2 }
            });
        });
    });

    describe('clear()', () => {
        it('应该清除所有配置', () => {
            configSystem.load('test:a', { data: 1 });
            configSystem.load('test:b', { data: 2 });

            configSystem.clear();

            expect(configSystem.has('test:a')).toBe(false);
            expect(configSystem.has('test:b')).toBe(false);
        });
    });

    describe('getAllKeys()', () => {
        it('应该返回所有配置键', () => {
            configSystem.load('test:key1', { data: 1 });
            configSystem.load('test:key2', { data: 2 });

            const keys = configSystem.getAllKeys();

            expect(keys).toContain('test:key1');
            expect(keys).toContain('test:key2');
            expect(keys.length).toBe(2);
        });

        it('没有配置时返回空数组', () => {
            const keys = configSystem.getAllKeys();
            expect(keys).toEqual([]);
        });
    });
});
