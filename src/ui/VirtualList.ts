/**
 * 虚拟列表组件
 *
 * 用于优化长列表渲染性能，只渲染可见区域的项目。
 * 适用于背包、任务列表、成就列表等场景。
 *
 * @example
 * ```typescript
 * const list = new VirtualList({
 *     containerWidth: 400,
 *     containerHeight: 600,
 *     itemHeight: 80,
 *     itemCount: items.length,
 *     renderItem: (index) => renderListItem(items[index])
 * });
 *
 * // 更新数据
 * list.updateItemCount(newItems.length);
 *
 * // 滚动处理
 * onScroll((scrollTop) => list.scrollTo(scrollTop));
 * ```
 */

import { EventSystem } from '../core/EventSystem';

/**
 * 虚拟列表配置
 */
export interface VirtualListConfig<T = unknown> {
    /** 容器宽度 */
    containerWidth: number;
    /** 容器高度 */
    containerHeight: number;
    /** 项目高度（固定高度模式） */
    itemHeight: number;
    /** 项目数量 */
    itemCount: number;
    /** 渲染项目函数 */
    renderItem: (index: number, data: T) => VirtualListItem;
    /** 获取项目数据函数 */
    getItemData?: (index: number) => T;
    /** 缓冲区项目数（上下额外渲染的项目） */
    bufferSize?: number;
    /** 列表方向 */
    direction?: 'vertical' | 'horizontal';
    /** 列间距 */
    gap?: number;
}

/**
 * 虚拟列表项目
 */
export interface VirtualListItem {
    /** 项目唯一标识 */
    key: string | number;
    /** 项目元素（在 Cocos 中为 Node，这里抽象为通用类型） */
    element?: unknown;
    /** 项目高度（可变高度模式） */
    height?: number;
}

/**
 * 可见范围信息
 */
export interface VisibleRange {
    /** 起始索引 */
    startIndex: number;
    /** 结束索引 */
    endIndex: number;
    /** 起始偏移 */
    startOffset: number;
}

/**
 * 滚动信息
 */
export interface ScrollInfo {
    /** 当前滚动位置 */
    scrollTop: number;
    /** 最大滚动位置 */
    maxScrollTop: number;
    /** 可见范围 */
    visibleRange: VisibleRange;
}

/**
 * 虚拟列表事件
 */
export const VirtualListEvents = {
    /** 可见范围变化 */
    VISIBLE_RANGE_CHANGED: 'virtuallist:visible_range_changed',
    /** 滚动位置变化 */
    SCROLL_CHANGED: 'virtuallist:scroll_changed',
    /** 项目数量变化 */
    ITEM_COUNT_CHANGED: 'virtuallist:item_count_changed'
} as const;

/**
 * 虚拟列表组件
 *
 * 核心原理:
 * 1. 只渲染可见区域内的项目
 * 2. 使用对象池复用项目元素
 * 3. 滚动时动态更新可见项目
 */
export class VirtualList<T = unknown> {
    /** 配置 */
    private config: Required<VirtualListConfig<T>>;

    /** 当前滚动位置 */
    private scrollTop: number = 0;

    /** 当前可见范围 */
    private visibleRange: VisibleRange = {
        startIndex: 0,
        endIndex: 0,
        startOffset: 0
    };

    /** 项目元素缓存（对象池） */
    private itemPool: Map<string | number, VirtualListItem> = new Map();

    /** 当前渲染的项目 */
    private renderedItems: Map<number, VirtualListItem> = new Map();

    /** 事件系统引用 */
    private eventSystem: EventSystem;

    /**
     * 创建虚拟列表
     */
    constructor(config: VirtualListConfig<T>) {
        this.config = {
            bufferSize: 3,
            direction: 'vertical',
            gap: 0,
            getItemData: () => ({} as T),
            ...config
        };

        this.eventSystem = EventSystem.getInstance();

        // 初始化可见范围
        this.updateVisibleRange();
    }

    /**
     * 获取总高度
     */
    getTotalHeight(): number {
        const { itemHeight, itemCount, gap } = this.config;
        if (itemCount === 0) return 0;
        return itemCount * itemHeight + (itemCount - 1) * gap;
    }

    /**
     * 获取最大滚动位置
     */
    getMaxScrollTop(): number {
        const totalHeight = this.getTotalHeight();
        const { containerHeight } = this.config;
        return Math.max(0, totalHeight - containerHeight);
    }

    /**
     * 滚动到指定位置
     */
    scrollTo(scrollTop: number): ScrollInfo {
        // 限制滚动范围
        const maxScrollTop = this.getMaxScrollTop();
        this.scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));

        // 更新可见范围
        this.updateVisibleRange();

        // 发布滚动事件
        const scrollInfo = this.getScrollInfo();
        this.eventSystem.emit(VirtualListEvents.SCROLL_CHANGED, scrollInfo);

        return scrollInfo;
    }

    /**
     * 滚动到指定索引
     */
    scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): void {
        const { itemHeight, gap, containerHeight } = this.config;

        let targetScrollTop: number;

        switch (align) {
            case 'start':
                targetScrollTop = index * (itemHeight + gap);
                break;
            case 'center':
                targetScrollTop = index * (itemHeight + gap) - containerHeight / 2 + itemHeight / 2;
                break;
            case 'end':
                targetScrollTop = index * (itemHeight + gap) - containerHeight + itemHeight;
                break;
        }

        this.scrollTo(targetScrollTop);
    }

    /**
     * 更新项目数量
     */
    updateItemCount(count: number): void {
        this.config.itemCount = count;
        this.updateVisibleRange();

        this.eventSystem.emit(VirtualListEvents.ITEM_COUNT_CHANGED, { count });
    }

    /**
     * 获取当前可见范围
     */
    getVisibleRange(): VisibleRange {
        return { ...this.visibleRange };
    }

    /**
     * 获取当前渲染的项目索引
     */
    getRenderedIndices(): number[] {
        return Array.from(this.renderedItems.keys());
    }

    /**
     * 获取滚动信息
     */
    getScrollInfo(): ScrollInfo {
        return {
            scrollTop: this.scrollTop,
            maxScrollTop: this.getMaxScrollTop(),
            visibleRange: this.getVisibleRange()
        };
    }

    /**
     * 渲染可见项目
     *
     * @returns 需要渲染的项目列表
     */
    render(): Array<{ index: number; item: VirtualListItem; offset: number; data: T }> {
        const { startIndex, endIndex, startOffset } = this.visibleRange;
        const { itemHeight, gap, renderItem, getItemData } = this.config;

        const result: Array<{ index: number; item: VirtualListItem; offset: number; data: T }> = [];

        // 清理不再可见的项目
        this.cleanupInvisibleItems(startIndex, endIndex);

        // 渲染可见项目
        for (let i = startIndex; i <= endIndex; i++) {
            // 检查是否已渲染
            let item = this.renderedItems.get(i);

            if (!item) {
                // 获取项目数据
                const data = getItemData(i);

                // 渲染新项目
                item = renderItem(i, data);
                item.height = itemHeight;

                // 缓存到对象池
                this.itemPool.set(item.key, item);
                this.renderedItems.set(i, item);
            }

            // 计算偏移
            const offset = startOffset + (i - startIndex) * (itemHeight + gap);

            result.push({
                index: i,
                item,
                offset,
                data: getItemData(i)
            });
        }

        return result;
    }

    /**
     * 刷新指定项目
     */
    refreshItem(index: number): VirtualListItem | null {
        if (index < 0 || index >= this.config.itemCount) {
            return null;
        }

        const { renderItem, getItemData } = this.config;
        const data = getItemData(index);
        const item = renderItem(index, data);

        // 更新缓存
        this.itemPool.set(item.key, item);

        // 如果当前可见，更新渲染
        if (this.renderedItems.has(index)) {
            this.renderedItems.set(index, item);
        }

        return item;
    }

    /**
     * 清理所有缓存
     */
    clear(): void {
        this.itemPool.clear();
        this.renderedItems.clear();
        this.scrollTop = 0;
        this.updateVisibleRange();
    }

    /**
     * 更新容器尺寸
     */
    updateContainerSize(width: number, height: number): void {
        this.config.containerWidth = width;
        this.config.containerHeight = height;
        this.updateVisibleRange();
    }

    /**
     * 获取项目在列表中的位置
     */
    getItemOffset(index: number): number {
        const { itemHeight, gap } = this.config;
        return index * (itemHeight + gap);
    }

    /**
     * 根据位置获取项目索引
     */
    getIndexAtOffset(offset: number): number {
        const { itemHeight, gap, itemCount } = this.config;
        const index = Math.floor(offset / (itemHeight + gap));
        return Math.max(0, Math.min(index, itemCount - 1));
    }

    /**
     * 检查项目是否可见
     */
    isItemVisible(index: number): boolean {
        const { startIndex, endIndex } = this.visibleRange;
        return index >= startIndex && index <= endIndex;
    }

    /**
     * 获取配置
     */
    getConfig(): Required<VirtualListConfig<T>> {
        return { ...this.config };
    }

    // ============================================================
    // 私有方法
    // ============================================================

    /**
     * 更新可见范围
     */
    private updateVisibleRange(): boolean {
        const { containerHeight, itemHeight, itemCount, bufferSize, gap } = this.config;

        if (itemCount === 0) {
            const newRange: VisibleRange = { startIndex: 0, endIndex: -1, startOffset: 0 };
            const changed = this.rangeChanged(newRange);
            this.visibleRange = newRange;
            return changed;
        }

        // 计算可见起始索引
        const startIndex = Math.max(0, Math.floor(this.scrollTop / (itemHeight + gap)) - bufferSize);

        // 计算可见结束索引
        const visibleCount = Math.ceil(containerHeight / (itemHeight + gap));
        const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + bufferSize * 2);

        // 计算起始偏移
        const startOffset = startIndex * (itemHeight + gap) - this.scrollTop;

        const newRange: VisibleRange = { startIndex, endIndex, startOffset };
        const changed = this.rangeChanged(newRange);

        this.visibleRange = newRange;

        if (changed) {
            this.eventSystem.emit(VirtualListEvents.VISIBLE_RANGE_CHANGED, {
                oldRange: this.visibleRange,
                newRange
            });
        }

        return changed;
    }

    /**
     * 检查范围是否变化
     */
    private rangeChanged(newRange: VisibleRange): boolean {
        return (
            this.visibleRange.startIndex !== newRange.startIndex ||
            this.visibleRange.endIndex !== newRange.endIndex
        );
    }

    /**
     * 清理不可见的项目
     */
    private cleanupInvisibleItems(startIndex: number, endIndex: number): void {
        const toRemove: number[] = [];

        this.renderedItems.forEach((_, index) => {
            if (index < startIndex || index > endIndex) {
                toRemove.push(index);
            }
        });

        for (const index of toRemove) {
            this.renderedItems.delete(index);
        }
    }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 创建简单的虚拟列表项渲染器
 */
export function createSimpleItemRenderer<T>(
    keyExtractor: (index: number, data: T) => string | number,
    elementFactory: (index: number, data: T) => unknown
): (index: number, data: T) => VirtualListItem {
    return (index: number, data: T) => ({
        key: keyExtractor(index, data),
        element: elementFactory(index, data)
    });
}

/**
 * 计算虚拟列表性能指标
 */
export interface VirtualListMetrics {
    /** 总项目数 */
    totalItems: number;
    /** 可见项目数 */
    visibleItems: number;
    /** 渲染比例 */
    renderRatio: number;
    /** 内存节省比例 */
    memorySaving: number;
}

/**
 * 获取虚拟列表性能指标
 */
export function getVirtualListMetrics<T = unknown>(list: VirtualList<T>): VirtualListMetrics {
    const totalItems = list.getConfig().itemCount;
    const visibleItems = list.getVisibleRange().endIndex - list.getVisibleRange().startIndex + 1;

    return {
        totalItems,
        visibleItems,
        renderRatio: totalItems > 0 ? visibleItems / totalItems : 0,
        memorySaving: totalItems > 0 ? 1 - visibleItems / totalItems : 0
    };
}
