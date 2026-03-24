/**
 * 背包系统 - 物品存储和管理
 *
 * 参考: design/gdd/backpack-system.md
 */

import { EventSystem } from '../core/EventSystem';
import { MaterialSystem } from './MaterialSystem';

/**
 * 物品类型
 */
export enum ItemType {
    MATERIAL = 'MATERIAL',  // 材料（采集获得）
    CRAFTED = 'CRAFTED'     // 成品（手工艺制作）
}

/**
 * 背包格子状态
 */
export enum SlotState {
    EMPTY = 'EMPTY',       // 空格
    OCCUPIED = 'OCCUPIED', // 有物品但未满
    FULL = 'FULL'          // 已满
}

/**
 * 背包格子
 */
export interface Slot {
    /** 物品ID（null 表示空格） */
    itemId: string | null;
    /** 物品类型 */
    itemType: ItemType;
    /** 当前数量 */
    count: number;
    /** 最大堆叠数 */
    maxStack: number;
}

/**
 * 添加物品结果
 */
export interface AddItemResult {
    /** 实际添加的数量 */
    added: number;
    /** 溢出数量（无法添加的部分） */
    overflow: number;
}

/**
 * 移除物品结果
 */
export interface RemoveItemResult {
    /** 是否成功 */
    success: boolean;
    /** 实际移除的数量 */
    removed: number;
    /** 背包中剩余数量 */
    remaining: number;
}

/**
 * 背包事件 Payload 类型
 */
export interface ItemAddedPayload {
    itemId: string;
    itemType: ItemType;
    amount: number;
    slotIndex: number;
}

export interface ItemRemovedPayload {
    itemId: string;
    itemType: ItemType;
    amount: number;
    slotIndex: number;
}

export interface SlotChangedPayload {
    slotIndex: number;
    tabType: ItemType;
    oldItem: Slot | null;
    newItem: Slot | null;
}

export interface InventoryFullPayload {
    itemType: ItemType;
}

export interface InventoryExpandedPayload {
    oldMax: number;
    newMax: number;
}

/**
 * 背包事件 ID
 */
export const BackpackEvents = {
    ITEM_ADDED: 'inventory:item_added',
    ITEM_REMOVED: 'inventory:item_removed',
    SLOT_CHANGED: 'inventory:slot_changed',
    INVENTORY_FULL: 'inventory:full',
    INVENTORY_EXPANDED: 'inventory:expanded'
} as const;

/**
 * 背包数据（用于存档）
 */
export interface BackpackData {
    materialSlots: Slot[];
    craftedSlots: Slot[];
    maxSlotsPerTab: number;
}

/**
 * 背包系统配置
 */
const BACKPACK_CONFIG = {
    /** 初始每标签页格数 */
    INITIAL_SLOTS_PER_TAB: 12,
    /** 最大每标签页格数 */
    MAX_SLOTS_PER_TAB: 24,
    /** 默认最大堆叠数（如果材料配置中没有） */
    DEFAULT_MAX_STACK: 99
};

/**
 * 背包系统接口
 */
export interface IBackpackSystem {
    /** 添加物品 */
    addItem(itemId: string, itemType: ItemType, amount: number): AddItemResult;
    /** 移除物品 */
    removeItem(itemId: string, amount: number): RemoveItemResult;
    /** 检查是否拥有足够物品 */
    hasItem(itemId: string, amount: number): boolean;
    /** 获取物品总数量 */
    getItemCount(itemId: string): number;
    /** 获取指定标签页的所有格子 */
    getSlotsByType(itemType: ItemType): Slot[];
    /** 获取指定格子 */
    getSlot(slotIndex: number, itemType: ItemType): Slot | null;
    /** 获取当前每标签页最大格数 */
    getMaxSlotsPerTab(): number;
    /** 获取已使用的格数 */
    getUsedSlots(itemType: ItemType): number;
    /** 获取空闲格数 */
    getFreeSlots(itemType: ItemType): number;
    /** 扩展容量 */
    expandSlots(amount: number): boolean;
    /** 导出数据（用于存档） */
    exportData(): BackpackData;
    /** 导入数据（用于读档） */
    importData(data: BackpackData): void;
    /** 清空背包 */
    clear(): void;
}

/**
 * 背包系统实现
 */
export class BackpackSystem implements IBackpackSystem {
    private static instance: BackpackSystem | null = null;

    /** 材料标签页格子 */
    private materialSlots: Slot[] = [];
    /** 成品标签页格子 */
    private craftedSlots: Slot[] = [];
    /** 每标签页最大格数 */
    private maxSlotsPerTab: number = BACKPACK_CONFIG.INITIAL_SLOTS_PER_TAB;

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {
        this.initializeSlots();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): BackpackSystem {
        if (!BackpackSystem.instance) {
            BackpackSystem.instance = new BackpackSystem();
        }
        return BackpackSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        BackpackSystem.instance = null;
    }

    /**
     * 初始化格子
     */
    private initializeSlots(): void {
        this.materialSlots = this.createEmptySlots(this.maxSlotsPerTab, ItemType.MATERIAL);
        this.craftedSlots = this.createEmptySlots(this.maxSlotsPerTab, ItemType.CRAFTED);
    }

    /**
     * 创建空格子数组
     */
    private createEmptySlots(count: number, itemType: ItemType): Slot[] {
        const slots: Slot[] = [];
        for (let i = 0; i < count; i++) {
            slots.push(this.createEmptySlot(itemType));
        }
        return slots;
    }

    /**
     * 创建空格子
     */
    private createEmptySlot(itemType: ItemType): Slot {
        return {
            itemId: null,
            itemType,
            count: 0,
            maxStack: 0
        };
    }

    /**
     * 获取物品的最大堆叠数
     */
    private getMaxStack(itemId: string, itemType: ItemType): number {
        if (itemType === ItemType.MATERIAL) {
            const material = MaterialSystem.getInstance().getMaterial(itemId);
            return material?.maxStack ?? BACKPACK_CONFIG.DEFAULT_MAX_STACK;
        }
        // CRAFTED 类型的物品暂时使用默认值
        // TODO: 后续可以从成品配置系统获取
        return BACKPACK_CONFIG.DEFAULT_MAX_STACK;
    }

    /**
     * 获取指定类型的格子数组
     */
    private getSlotArray(itemType: ItemType): Slot[] {
        return itemType === ItemType.MATERIAL ? this.materialSlots : this.craftedSlots;
    }

    /**
     * 添加物品
     */
    public addItem(itemId: string, itemType: ItemType, amount: number): AddItemResult {
        // 边界检查
        if (amount <= 0) {
            console.warn('[BackpackSystem] Invalid amount:', amount);
            return { added: 0, overflow: 0 };
        }

        const slots = this.getSlotArray(itemType);
        const maxStack = this.getMaxStack(itemId, itemType);
        let remaining = amount;
        let totalAdded = 0;

        // 第一步：尝试堆叠到现有格子
        for (let i = 0; i < slots.length && remaining > 0; i++) {
            const slot = slots[i];
            if (slot.itemId === itemId && slot.count < slot.maxStack) {
                const canAdd = Math.min(remaining, slot.maxStack - slot.count);
                const oldSlot = { ...slot };

                slot.count += canAdd;
                remaining -= canAdd;
                totalAdded += canAdd;

                // 发布格子变化事件
                this.emitSlotChanged(i, itemType, oldSlot, { ...slot });

                // 如果刚好填满，发布格子填满事件
                if (slot.count === slot.maxStack) {
                    // 格子已满，继续处理剩余物品
                }
            }
        }

        // 第二步：尝试放入空格子
        for (let i = 0; i < slots.length && remaining > 0; i++) {
            const slot = slots[i];
            if (slot.itemId === null) {
                const canAdd = Math.min(remaining, maxStack);
                const oldSlot = { ...slot };

                slot.itemId = itemId;
                slot.itemType = itemType;
                slot.count = canAdd;
                slot.maxStack = maxStack;
                remaining -= canAdd;
                totalAdded += canAdd;

                // 发布格子变化事件
                this.emitSlotChanged(i, itemType, oldSlot, { ...slot });
            }
        }

        // 发布添加事件
        if (totalAdded > 0) {
            EventSystem.getInstance().emit<ItemAddedPayload>(BackpackEvents.ITEM_ADDED, {
                itemId,
                itemType,
                amount: totalAdded,
                slotIndex: -1 // 多格添加，使用 -1 表示
            });
        }

        // 发布背包满事件
        if (remaining > 0) {
            EventSystem.getInstance().emit<InventoryFullPayload>(BackpackEvents.INVENTORY_FULL, {
                itemType
            });
        }

        return {
            added: totalAdded,
            overflow: remaining
        };
    }

    /**
     * 移除物品
     */
    public removeItem(itemId: string, amount: number): RemoveItemResult {
        // 边界检查
        if (amount <= 0) {
            console.warn('[BackpackSystem] Invalid amount:', amount);
            return { success: false, removed: 0, remaining: 0 };
        }

        // 先检查是否拥有足够数量
        const totalCount = this.getItemCount(itemId);
        if (totalCount < amount) {
            return {
                success: false,
                removed: 0,
                remaining: totalCount
            };
        }

        let remaining = amount;
        let totalRemoved = 0;
        let itemType: ItemType | null = null;

        // 从两个标签页中移除（按数量升序，优先消耗少的）
        const removeFromSlots = (slots: Slot[], type: ItemType) => {
            // 找出所有包含该物品的格子，按数量升序
            const slotIndices: { index: number; count: number }[] = [];
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].itemId === itemId) {
                    slotIndices.push({ index: i, count: slots[i].count });
                    if (itemType === null) {
                        itemType = type;
                    }
                }
            }
            slotIndices.sort((a, b) => a.count - b.count);

            // 逐格消耗
            for (const { index } of slotIndices) {
                if (remaining <= 0) break;

                const slot = slots[index];
                const canRemove = Math.min(remaining, slot.count);
                const oldSlot = { ...slot };

                slot.count -= canRemove;
                remaining -= canRemove;
                totalRemoved += canRemove;

                // 如果格子空了，重置
                if (slot.count === 0) {
                    Object.assign(slot, this.createEmptySlot(type));
                }

                // 发布格子变化事件
                this.emitSlotChanged(index, type, oldSlot, slot.count === 0 ? null : { ...slot });

                // 发布移除事件
                EventSystem.getInstance().emit<ItemRemovedPayload>(BackpackEvents.ITEM_REMOVED, {
                    itemId,
                    itemType: type,
                    amount: canRemove,
                    slotIndex: index
                });
            }
        };

        removeFromSlots(this.materialSlots, ItemType.MATERIAL);
        removeFromSlots(this.craftedSlots, ItemType.CRAFTED);

        const newTotal = this.getItemCount(itemId);

        return {
            success: totalRemoved === amount,
            removed: totalRemoved,
            remaining: newTotal
        };
    }

    /**
     * 检查是否拥有足够物品
     */
    public hasItem(itemId: string, amount: number): boolean {
        return this.getItemCount(itemId) >= amount;
    }

    /**
     * 获取物品总数量
     */
    public getItemCount(itemId: string): number {
        let count = 0;

        for (const slot of this.materialSlots) {
            if (slot.itemId === itemId) {
                count += slot.count;
            }
        }

        for (const slot of this.craftedSlots) {
            if (slot.itemId === itemId) {
                count += slot.count;
            }
        }

        return count;
    }

    /**
     * 获取指定类型的所有格子
     */
    public getSlotsByType(itemType: ItemType): Slot[] {
        return itemType === ItemType.MATERIAL ? [...this.materialSlots] : [...this.craftedSlots];
    }

    /**
     * 获取指定格子
     */
    public getSlot(slotIndex: number, itemType: ItemType): Slot | null {
        const slots = this.getSlotArray(itemType);
        if (slotIndex < 0 || slotIndex >= slots.length) {
            return null;
        }
        return { ...slots[slotIndex] };
    }

    /**
     * 获取当前每标签页最大格数
     */
    public getMaxSlotsPerTab(): number {
        return this.maxSlotsPerTab;
    }

    /**
     * 获取已使用的格数
     */
    public getUsedSlots(itemType: ItemType): number {
        const slots = this.getSlotArray(itemType);
        return slots.filter(slot => slot.itemId !== null).length;
    }

    /**
     * 获取空闲格数
     */
    public getFreeSlots(itemType: ItemType): number {
        return this.maxSlotsPerTab - this.getUsedSlots(itemType);
    }

    /**
     * 扩展容量
     */
    public expandSlots(amount: number): boolean {
        const newMax = this.maxSlotsPerTab + amount;

        if (newMax > BACKPACK_CONFIG.MAX_SLOTS_PER_TAB) {
            console.warn('[BackpackSystem] Cannot exceed max slots:', BACKPACK_CONFIG.MAX_SLOTS_PER_TAB);
            return false;
        }

        const oldMax = this.maxSlotsPerTab;
        this.maxSlotsPerTab = newMax;

        // 添加新格子
        const newMaterialSlots = this.createEmptySlots(amount, ItemType.MATERIAL);
        const newCraftedSlots = this.createEmptySlots(amount, ItemType.CRAFTED);

        this.materialSlots.push(...newMaterialSlots);
        this.craftedSlots.push(...newCraftedSlots);

        // 发布扩展事件
        EventSystem.getInstance().emit<InventoryExpandedPayload>(BackpackEvents.INVENTORY_EXPANDED, {
            oldMax,
            newMax
        });

        return true;
    }

    /**
     * 导出数据
     */
    public exportData(): BackpackData {
        return {
            materialSlots: this.materialSlots.map(s => ({ ...s })),
            craftedSlots: this.craftedSlots.map(s => ({ ...s })),
            maxSlotsPerTab: this.maxSlotsPerTab
        };
    }

    /**
     * 导入数据
     */
    public importData(data: BackpackData): void {
        this.maxSlotsPerTab = data.maxSlotsPerTab;
        this.materialSlots = data.materialSlots.map(s => ({ ...s }));
        this.craftedSlots = data.craftedSlots.map(s => ({ ...s }));
    }

    /**
     * 清空背包
     */
    public clear(): void {
        this.initializeSlots();
    }

    /**
     * 发布格子变化事件
     */
    private emitSlotChanged(
        slotIndex: number,
        tabType: ItemType,
        oldItem: Slot | null,
        newItem: Slot | null
    ): void {
        EventSystem.getInstance().emit<SlotChangedPayload>(BackpackEvents.SLOT_CHANGED, {
            slotIndex,
            tabType,
            oldItem,
            newItem
        });
    }
}

/**
 * 全局背包系统实例
 */
export const backpackSystem = BackpackSystem.getInstance();
