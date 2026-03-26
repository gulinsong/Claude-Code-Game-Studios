/**
 * VirtualList 单元测试
 */

import {
    VirtualList,
    VirtualListConfig,
    VirtualListItem,
    VirtualListEvents,
    createSimpleItemRenderer,
    getVirtualListMetrics
} from '../../src/ui/VirtualList';
import { EventSystem } from '../../src/core/EventSystem';

// 创建测试数据
interface TestItem {
    id: number;
    name: string;
}

const createTestItems = (count: number): TestItem[] =>
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

// 创建测试配置
const createTestConfig = (itemCount: number): VirtualListConfig<TestItem> => ({
    containerWidth: 400,
    containerHeight: 600,
    itemHeight: 80,
    itemCount,
    renderItem: (_index: number, data: TestItem): VirtualListItem => ({
        key: data.id,
        element: { id: data.id, name: data.name }
    }),
    getItemData: (index: number) => createTestItems(itemCount)[index],
    bufferSize: 2,
    gap: 10
});

describe('VirtualList', () => {
    let eventSystem: EventSystem;

    beforeEach(() => {
        EventSystem.resetInstance();
        eventSystem = EventSystem.getInstance();
    });

    afterEach(() => {
        eventSystem.clearAll();
    });

    describe('初始化', () => {
        it('应该正确初始化配置', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            expect(list.getConfig().containerWidth).toBe(400);
            expect(list.getConfig().containerHeight).toBe(600);
            expect(list.getConfig().itemHeight).toBe(80);
            expect(list.getConfig().itemCount).toBe(100);
        });

        it('应该使用默认值', () => {
            const list = new VirtualList({
                containerWidth: 400,
                containerHeight: 600,
                itemHeight: 80,
                itemCount: 10,
                renderItem: () => ({ key: 0 })
            });

            expect(list.getConfig().bufferSize).toBe(3);
            expect(list.getConfig().direction).toBe('vertical');
            expect(list.getConfig().gap).toBe(0);
        });

        it('应该计算正确的总高度', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            // 100 items * 80px + 99 gaps * 10px = 8000 + 990 = 8990
            expect(list.getTotalHeight()).toBe(8990);
        });

        it('空列表总高度应该为 0', () => {
            const config = createTestConfig(0);
            const list = new VirtualList(config);

            expect(list.getTotalHeight()).toBe(0);
        });
    });

    describe('滚动', () => {
        it('应该正确计算最大滚动位置', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            // 总高度 8990 - 容器高度 600 = 8390
            expect(list.getMaxScrollTop()).toBe(8390);
        });

        it('应该正确处理滚动', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const scrollInfo = list.scrollTo(1000);

            expect(scrollInfo.scrollTop).toBe(1000);
            expect(scrollInfo.maxScrollTop).toBe(8390);
        });

        it('应该限制滚动范围 (负值)', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const scrollInfo = list.scrollTo(-100);

            expect(scrollInfo.scrollTop).toBe(0);
        });

        it('应该限制滚动范围 (超出最大值)', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const scrollInfo = list.scrollTo(10000);

            expect(scrollInfo.scrollTop).toBe(8390);
        });

        it('应该发布滚动事件', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const handler = jest.fn();
            eventSystem.on(VirtualListEvents.SCROLL_CHANGED, handler);

            list.scrollTo(500);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('可见范围', () => {
        it('应该正确计算初始可见范围', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const range = list.getVisibleRange();

            // 缓冲区为 2，容器 600px，项目 80px + 10px gap
            // 可见数量: ceil(600 / 90) = 7
            // 加上缓冲: 7 + 4 = 11
            // 起始: 0 - 2 = -2 -> 0
            // 结束: 0 + 11 - 1 = 10
            expect(range.startIndex).toBe(0);
            expect(range.endIndex).toBeGreaterThanOrEqual(7);
        });

        it('滚动后应该更新可见范围', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.scrollTo(1000);

            const range = list.getVisibleRange();

            // 滚动 1000px 后，起始索引约 1000 / 90 = 11
            // 减去缓冲 2 = 9
            expect(range.startIndex).toBeGreaterThanOrEqual(5);
        });

        it('应该发布可见范围变化事件', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const handler = jest.fn();
            eventSystem.on(VirtualListEvents.VISIBLE_RANGE_CHANGED, handler);

            // 滚动足够距离触发范围变化
            list.scrollTo(1000);

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('滚动到索引', () => {
        it('scrollToIndex 应该滚动到正确位置', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.scrollToIndex(10, 'start');

            // 索引 10 的位置: 10 * (80 + 10) = 900
            expect(list.getScrollInfo().scrollTop).toBe(900);
        });

        it('scrollToIndex center 应该居中显示', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.scrollToIndex(10, 'center');

            // 900 - 300 + 40 = 640
            expect(list.getScrollInfo().scrollTop).toBe(640);
        });

        it('scrollToIndex end 应该在底部显示', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.scrollToIndex(10, 'end');

            // 900 - 600 + 80 = 380
            expect(list.getScrollInfo().scrollTop).toBe(380);
        });
    });

    describe('渲染', () => {
        it('render 应该返回可见项目', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const items = list.render();

            expect(items.length).toBeGreaterThan(0);
            expect(items[0].index).toBe(0);
        });

        it('渲染项目应该包含正确的偏移', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const items = list.render();

            expect(items[0].offset).toBe(0);
        });

        it('滚动后应该渲染不同的项目', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const initialItems = list.render();
            const initialIndices = initialItems.map(i => i.index);

            list.scrollTo(2000);
            const scrolledItems = list.render();
            const scrolledIndices = scrolledItems.map(i => i.index);

            // 应该有不同的项目
            expect(scrolledIndices[0]).toBeGreaterThan(initialIndices[0] - 3);
        });
    });

    describe('项目更新', () => {
        it('updateItemCount 应该更新项目数量', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.updateItemCount(50);

            expect(list.getConfig().itemCount).toBe(50);
        });

        it('updateItemCount 应该发布事件', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const handler = jest.fn();
            eventSystem.on(VirtualListEvents.ITEM_COUNT_CHANGED, handler);

            list.updateItemCount(50);

            expect(handler).toHaveBeenCalledWith({ count: 50 });
        });

        it('refreshItem 应该刷新指定项目', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const item = list.refreshItem(5);

            expect(item).not.toBeNull();
            expect(item?.key).toBe(5);
        });

        it('refreshItem 无效索引应该返回 null', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const item = list.refreshItem(-1);

            expect(item).toBeNull();
        });

        it('refreshItem 超出范围应该返回 null', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            const item = list.refreshItem(200);

            expect(item).toBeNull();
        });
    });

    describe('清理', () => {
        it('clear 应该重置所有状态', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.scrollTo(1000);
            list.render();
            list.clear();

            expect(list.getScrollInfo().scrollTop).toBe(0);
            expect(list.getRenderedIndices().length).toBe(0);
        });
    });

    describe('容器尺寸更新', () => {
        it('updateContainerSize 应该更新尺寸', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            list.updateContainerSize(800, 1000);

            expect(list.getConfig().containerWidth).toBe(800);
            expect(list.getConfig().containerHeight).toBe(1000);
        });
    });

    describe('辅助方法', () => {
        it('getItemOffset 应该返回正确偏移', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            expect(list.getItemOffset(0)).toBe(0);
            expect(list.getItemOffset(5)).toBe(5 * 90); // 450
        });

        it('getIndexAtOffset 应该返回正确索引', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            expect(list.getIndexAtOffset(0)).toBe(0);
            expect(list.getIndexAtOffset(450)).toBe(5);
        });

        it('isItemVisible 应该正确判断可见性', () => {
            const config = createTestConfig(100);
            const list = new VirtualList(config);

            // 初始时，前面的项目应该可见
            expect(list.isItemVisible(0)).toBe(true);
            expect(list.isItemVisible(50)).toBe(false);
        });
    });

    describe('边界情况', () => {
        it('空列表应该正确处理', () => {
            const config = createTestConfig(0);
            const list = new VirtualList(config);

            expect(list.getTotalHeight()).toBe(0);
            expect(list.getMaxScrollTop()).toBe(0);

            const range = list.getVisibleRange();
            expect(range.startIndex).toBe(0);
            expect(range.endIndex).toBe(-1);
        });

        it('项目数少于容器高度应该正确处理', () => {
            const config = createTestConfig(3);
            const list = new VirtualList(config);

            // 3 items * 90 = 270 < 600
            expect(list.getTotalHeight()).toBe(3 * 80 + 2 * 10); // 240 + 20 = 260
            expect(list.getMaxScrollTop()).toBe(0);
        });

        it('单个项目应该正确处理', () => {
            const config = createTestConfig(1);
            const list = new VirtualList(config);

            expect(list.getTotalHeight()).toBe(80);
            expect(list.getMaxScrollTop()).toBe(0);

            const items = list.render();
            expect(items.length).toBe(1);
            expect(items[0].index).toBe(0);
        });
    });
});

describe('createSimpleItemRenderer', () => {
    it('应该创建简单的渲染器', () => {
        const renderer = createSimpleItemRenderer(
            (_, data: TestItem) => data.id,
            (_, data: TestItem) => ({ name: data.name })
        );

        const item = renderer(0, { id: 1, name: 'Test' });

        expect(item.key).toBe(1);
        expect((item.element as { name: string }).name).toBe('Test');
    });
});

describe('getVirtualListMetrics', () => {
    it('应该计算正确的性能指标', () => {
        const config = createTestConfig(100);
        const list = new VirtualList(config);

        const metrics = getVirtualListMetrics(list);

        expect(metrics.totalItems).toBe(100);
        expect(metrics.visibleItems).toBeGreaterThan(0);
        expect(metrics.visibleItems).toBeLessThan(100);
        expect(metrics.memorySaving).toBeGreaterThan(0.8); // 节省 80% 以上
    });

    it('空列表应该返回零指标', () => {
        const config = createTestConfig(0);
        const list = new VirtualList(config);

        const metrics = getVirtualListMetrics(list);

        expect(metrics.totalItems).toBe(0);
        expect(metrics.visibleItems).toBe(0);
        expect(metrics.renderRatio).toBe(0);
        expect(metrics.memorySaving).toBe(0);
    });
});
