/**
 * 背包系统单元测试
 */

import {
    BackpackSystem,
    ItemType,
    BackpackEvents
} from '../../src/data/BackpackSystem';
import { EventSystem } from '../../src/core/EventSystem';
import { MaterialSystem, MaterialRarity, MaterialType } from '../../src/data/MaterialSystem';

describe('BackpackSystem', () => {
    // 测试用材料数据
    const testMaterials = [
        {
            id: 'bamboo_leaf',
            name: '竹叶',
            description: '新鲜的竹叶',
            type: MaterialType.RESOURCE,
            rarity: MaterialRarity.COMMON,
            maxStack: 50,
            icon: 'bamboo_leaf.png',
            sellPrice: 5,
            sources: ['village']
        },
        {
            id: 'flour',
            name: '面粉',
            description: '优质面粉',
            type: MaterialType.INGREDIENT,
            rarity: MaterialRarity.COMMON,
            maxStack: 30,
            icon: 'flour.png',
            sellPrice: 10,
            sources: ['market']
        },
        {
            id: 'red_bean',
            name: '红豆',
            description: '甜糯红豆',
            type: MaterialType.INGREDIENT,
            rarity: MaterialRarity.UNCOMMON,
            maxStack: 20,
            icon: 'red_bean.png',
            sellPrice: 15,
            sources: ['field']
        }
    ];

    beforeEach(() => {
        // 重置单例
        BackpackSystem.resetInstance();
        EventSystem.resetInstance();
        MaterialSystem.resetInstance();

        // 初始化材料系统
        const materialSystem = MaterialSystem.getInstance();
        materialSystem.initialize(testMaterials);
    });

    describe('单例模式', () => {
        it('应该返回同一个实例', () => {
            const instance1 = BackpackSystem.getInstance();
            const instance2 = BackpackSystem.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('backpackSystem 应该是单例实例', () => {
            const instance = BackpackSystem.getInstance();
            // 由于 beforeEach 重置了单例，重新导入会得到新实例
            // 这里只验证 getInstance() 的一致性
            expect(BackpackSystem.getInstance()).toBe(instance);
        });
    });

    describe('初始状态', () => {
        it('初始格数应该是 12', () => {
            const backpack = BackpackSystem.getInstance();
            expect(backpack.getMaxSlotsPerTab()).toBe(12);
        });

        it('初始空闲格数应该是 12', () => {
            const backpack = BackpackSystem.getInstance();
            expect(backpack.getFreeSlots(ItemType.MATERIAL)).toBe(12);
            expect(backpack.getFreeSlots(ItemType.CRAFTED)).toBe(12);
        });

        it('初始已用格数应该是 0', () => {
            const backpack = BackpackSystem.getInstance();
            expect(backpack.getUsedSlots(ItemType.MATERIAL)).toBe(0);
            expect(backpack.getUsedSlots(ItemType.CRAFTED)).toBe(0);
        });
    });

    describe('addItem()', () => {
        it('应该正确添加物品到空背包', () => {
            const backpack = BackpackSystem.getInstance();
            const result = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(result.added).toBe(10);
            expect(result.overflow).toBe(0);
            expect(backpack.getItemCount('bamboo_leaf')).toBe(10);
        });

        it('应该自动堆叠相同物品', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);
            const result = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 5);

            expect(result.added).toBe(5);
            expect(result.overflow).toBe(0);
            expect(backpack.getItemCount('bamboo_leaf')).toBe(15);
        });

        it('堆叠满后应该使用新格子', () => {
            const backpack = BackpackSystem.getInstance();

            // bamboo_leaf maxStack = 50
            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 50);
            const result = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(result.added).toBe(10);
            expect(result.overflow).toBe(0);
            expect(backpack.getUsedSlots(ItemType.MATERIAL)).toBe(2);
        });

        it('背包满时应该返回 overflow', () => {
            const backpack = BackpackSystem.getInstance();

            // 填满所有格子（12 格，每格 50）
            const result1 = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 600);

            expect(result1.added).toBe(600);
            expect(result1.overflow).toBe(0);

            // 再添加
            const result2 = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(result2.added).toBe(0);
            expect(result2.overflow).toBe(10);
        });

        it('部分溢出时应该返回正确的 overflow', () => {
            const backpack = BackpackSystem.getInstance();

            // 填满大部分格子
            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 550); // 11 格满

            // 再添加 30，只能添加 50（最后一格）
            const result = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 80);

            expect(result.added).toBe(50);
            expect(result.overflow).toBe(30);
        });

        it('无效数量应该返回 0', () => {
            const backpack = BackpackSystem.getInstance();

            const result1 = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 0);
            expect(result1.added).toBe(0);

            const result2 = backpack.addItem('bamboo_leaf', ItemType.MATERIAL, -5);
            expect(result2.added).toBe(0);
        });

        it('应该发布 item_added 事件', () => {
            const backpack = BackpackSystem.getInstance();
            const eventSystem = EventSystem.getInstance();

            const listener = jest.fn();
            eventSystem.on(BackpackEvents.ITEM_ADDED, listener);

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'bamboo_leaf',
                    itemType: ItemType.MATERIAL,
                    amount: 10
                })
            );
        });

        it('背包满时应该发布 inventory:full 事件', () => {
            const backpack = BackpackSystem.getInstance();
            const eventSystem = EventSystem.getInstance();

            // 填满背包
            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 600);

            const listener = jest.fn();
            eventSystem.on(BackpackEvents.INVENTORY_FULL, listener);

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemType: ItemType.MATERIAL
                })
            );
        });
    });

    describe('removeItem()', () => {
        it('应该正确移除物品', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 20);
            const result = backpack.removeItem('bamboo_leaf', 5);

            expect(result.success).toBe(true);
            expect(result.removed).toBe(5);
            expect(result.remaining).toBe(15);
        });

        it('数量不足时应该返回失败', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);
            const result = backpack.removeItem('bamboo_leaf', 20);

            expect(result.success).toBe(false);
            expect(result.removed).toBe(0);
            expect(result.remaining).toBe(10);
        });

        it('移除不存在的物品应该返回失败', () => {
            const backpack = BackpackSystem.getInstance();

            const result = backpack.removeItem('nonexistent', 5);

            expect(result.success).toBe(false);
            expect(result.removed).toBe(0);
            expect(result.remaining).toBe(0);
        });

        it('移除后 count=0 的格子应该变为空', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);
            backpack.removeItem('bamboo_leaf', 10);

            expect(backpack.getUsedSlots(ItemType.MATERIAL)).toBe(0);
            expect(backpack.getItemCount('bamboo_leaf')).toBe(0);
        });

        it('应该发布 item_removed 事件', () => {
            const backpack = BackpackSystem.getInstance();
            const eventSystem = EventSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 20);

            const listener = jest.fn();
            eventSystem.on(BackpackEvents.ITEM_REMOVED, listener);

            backpack.removeItem('bamboo_leaf', 5);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'bamboo_leaf',
                    amount: 5
                })
            );
        });

        it('无效数量应该返回失败', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            const result1 = backpack.removeItem('bamboo_leaf', 0);
            expect(result1.success).toBe(false);

            const result2 = backpack.removeItem('bamboo_leaf', -5);
            expect(result2.success).toBe(false);
        });
    });

    describe('hasItem()', () => {
        it('拥有足够数量时返回 true', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 20);

            expect(backpack.hasItem('bamboo_leaf', 10)).toBe(true);
            expect(backpack.hasItem('bamboo_leaf', 20)).toBe(true);
        });

        it('数量不足时返回 false', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            expect(backpack.hasItem('bamboo_leaf', 15)).toBe(false);
        });

        it('不存在时返回 false', () => {
            const backpack = BackpackSystem.getInstance();

            expect(backpack.hasItem('nonexistent', 1)).toBe(false);
        });
    });

    describe('getItemCount()', () => {
        it('应该返回正确的总数量', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 30);
            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 25);

            expect(backpack.getItemCount('bamboo_leaf')).toBe(55);
        });

        it('跨多格时应该正确汇总', () => {
            const backpack = BackpackSystem.getInstance();

            // bamboo_leaf maxStack = 50
            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 150); // 3 格

            expect(backpack.getItemCount('bamboo_leaf')).toBe(150);
        });

        it('不存在时返回 0', () => {
            const backpack = BackpackSystem.getInstance();

            expect(backpack.getItemCount('nonexistent')).toBe(0);
        });
    });

    describe('getSlotsByType()', () => {
        it('应该返回指定类型的所有格子', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);
            backpack.addItem('flour', ItemType.MATERIAL, 5);

            const slots = backpack.getSlotsByType(ItemType.MATERIAL);

            expect(slots.length).toBe(12);
            expect(slots.filter(s => s.itemId !== null).length).toBe(2);
        });

        it('MATERIAL 和 CRAFTED 应该独立', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 10);

            const materialSlots = backpack.getSlotsByType(ItemType.MATERIAL);
            const craftedSlots = backpack.getSlotsByType(ItemType.CRAFTED);

            expect(materialSlots.filter(s => s.itemId !== null).length).toBe(1);
            expect(craftedSlots.filter(s => s.itemId !== null).length).toBe(0);
        });
    });

    describe('expandSlots()', () => {
        it('应该正确扩展容量', () => {
            const backpack = BackpackSystem.getInstance();

            const result = backpack.expandSlots(4);

            expect(result).toBe(true);
            expect(backpack.getMaxSlotsPerTab()).toBe(16);
        });

        it('扩展后空闲格数应该增加', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.expandSlots(4);

            expect(backpack.getFreeSlots(ItemType.MATERIAL)).toBe(16);
            expect(backpack.getFreeSlots(ItemType.CRAFTED)).toBe(16);
        });

        it('超过最大限制应该失败', () => {
            const backpack = BackpackSystem.getInstance();

            // 最大 24，初始 12，最多扩展 12
            backpack.expandSlots(12);
            const result = backpack.expandSlots(1);

            expect(result).toBe(false);
            expect(backpack.getMaxSlotsPerTab()).toBe(24);
        });

        it('应该发布 inventory:expanded 事件', () => {
            const backpack = BackpackSystem.getInstance();
            const eventSystem = EventSystem.getInstance();

            const listener = jest.fn();
            eventSystem.on(BackpackEvents.INVENTORY_EXPANDED, listener);

            backpack.expandSlots(4);

            expect(listener).toHaveBeenCalledWith({
                oldMax: 12,
                newMax: 16
            });
        });
    });

    describe('exportData() / importData()', () => {
        it('应该正确导出和导入数据', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 30);
            backpack.addItem('flour', ItemType.MATERIAL, 15);

            const data = backpack.exportData();

            expect(data.materialSlots.filter(s => s.itemId !== null).length).toBe(2);
            expect(data.maxSlotsPerTab).toBe(12);

            // 重置并导入
            BackpackSystem.resetInstance();
            const newBackpack = BackpackSystem.getInstance();
            newBackpack.importData(data);

            expect(newBackpack.getItemCount('bamboo_leaf')).toBe(30);
            expect(newBackpack.getItemCount('flour')).toBe(15);
        });
    });

    describe('clear()', () => {
        it('应该清空所有物品', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 30);
            backpack.addItem('flour', ItemType.MATERIAL, 15);
            backpack.clear();

            expect(backpack.getItemCount('bamboo_leaf')).toBe(0);
            expect(backpack.getItemCount('flour')).toBe(0);
            expect(backpack.getUsedSlots(ItemType.MATERIAL)).toBe(0);
        });
    });

    describe('getSlot()', () => {
        it('应该返回正确的格子', () => {
            const backpack = BackpackSystem.getInstance();

            backpack.addItem('bamboo_leaf', ItemType.MATERIAL, 30);

            const slot = backpack.getSlot(0, ItemType.MATERIAL);

            expect(slot).not.toBeNull();
            expect(slot?.itemId).toBe('bamboo_leaf');
            expect(slot?.count).toBe(30);
        });

        it('无效索引应该返回 null', () => {
            const backpack = BackpackSystem.getInstance();

            expect(backpack.getSlot(-1, ItemType.MATERIAL)).toBeNull();
            expect(backpack.getSlot(100, ItemType.MATERIAL)).toBeNull();
        });
    });
});
