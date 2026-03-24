/**
 * EventSystem 单元测试
 */
import { EventSystem, eventSystem } from '../../src/core/EventSystem';
describe('EventSystem', () => {
    beforeEach(() => {
        // 每个测试前重置单例状态
        eventSystem.clearAll();
    });
    describe('单例模式', () => {
        it('应该返回同一个实例', () => {
            const instance1 = EventSystem.getInstance();
            const instance2 = EventSystem.getInstance();
            expect(instance1).toBe(instance2);
        });
        it('eventSystem 应该是单例实例', () => {
            expect(eventSystem).toBe(EventSystem.getInstance());
        });
    });
    describe('on() 和 emit()', () => {
        it('应该正确注册和触发监听器', () => {
            const callback = jest.fn();
            eventSystem.on('test:event', callback);
            eventSystem.emit('test:event', { data: 'hello' });
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ data: 'hello' });
        });
        it('应该支持无载荷的事件', () => {
            const callback = jest.fn();
            eventSystem.on('test:empty', callback);
            eventSystem.emit('test:empty');
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(undefined);
        });
        it('应该支持多个监听器', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            eventSystem.on('test:multi', callback1);
            eventSystem.on('test:multi', callback2);
            eventSystem.emit('test:multi', { value: 42 });
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });
        it('应该按优先级顺序执行监听器', () => {
            const order = [];
            eventSystem.on('test:priority', () => order.push(1), 1);
            eventSystem.on('test:priority', () => order.push(3), 3);
            eventSystem.on('test:priority', () => order.push(2), 2);
            eventSystem.emit('test:priority');
            expect(order).toEqual([3, 2, 1]);
        });
    });
    describe('once()', () => {
        it('应该只触发一次后自动移除', () => {
            const callback = jest.fn();
            eventSystem.once('test:once', callback);
            eventSystem.emit('test:once', { data: 1 });
            eventSystem.emit('test:once', { data: 2 });
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ data: 1 });
        });
    });
    describe('off()', () => {
        it('应该正确移除监听器', () => {
            const callback = jest.fn();
            eventSystem.on('test:off', callback);
            eventSystem.off('test:off', callback);
            eventSystem.emit('test:off', { data: 'test' });
            expect(callback).not.toHaveBeenCalled();
        });
        it('移除不存在的监听器不应该报错', () => {
            const callback = jest.fn();
            expect(() => {
                eventSystem.off('nonexistent:event', callback);
            }).not.toThrow();
        });
    });
    describe('hasListener()', () => {
        it('有监听器时返回 true', () => {
            eventSystem.on('test:has', () => { });
            expect(eventSystem.hasListener('test:has')).toBe(true);
        });
        it('无监听器时返回 false', () => {
            expect(eventSystem.hasListener('test:empty')).toBe(false);
        });
        it('移除监听器后返回 false', () => {
            const callback = () => { };
            eventSystem.on('test:remove', callback);
            eventSystem.off('test:remove', callback);
            expect(eventSystem.hasListener('test:remove')).toBe(false);
        });
    });
    describe('getListenerCount()', () => {
        it('应该返回正确的监听器数量', () => {
            eventSystem.on('test:count', () => { });
            eventSystem.on('test:count', () => { });
            eventSystem.once('test:count', () => { });
            expect(eventSystem.getListenerCount('test:count')).toBe(3);
        });
        it('没有监听器时返回 0', () => {
            expect(eventSystem.getListenerCount('test:zero')).toBe(0);
        });
    });
    describe('clearAll()', () => {
        it('应该清除所有监听器', () => {
            eventSystem.on('test:a', () => { });
            eventSystem.on('test:b', () => { });
            eventSystem.clearAll();
            expect(eventSystem.hasListener('test:a')).toBe(false);
            expect(eventSystem.hasListener('test:b')).toBe(false);
        });
    });
    describe('重复注册', () => {
        it('相同回调不应该重复注册', () => {
            const callback = jest.fn();
            eventSystem.on('test:dup', callback);
            eventSystem.on('test:dup', callback);
            eventSystem.emit('test:dup');
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
    describe('错误处理', () => {
        it('监听器抛出错误不应该影响其他监听器', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = jest.fn();
            eventSystem.on('test:error', errorCallback);
            eventSystem.on('test:error', normalCallback);
            eventSystem.emit('test:error');
            expect(errorCallback).toHaveBeenCalled();
            expect(normalCallback).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=EventSystem.test.js.map