/**
 * 材料系统 - 游戏内材料的定义和管理
 *
 * 参考: design/gdd/material-system.md
 */

import { configSystem } from '../core/ConfigSystem';

/**
 * 材料稀有度
 */
export enum MaterialRarity {
    COMMON = 'common',      // 普通
    UNCOMMON = 'uncommon',  // 稀有
    RARE = 'rare',          // 罕见
    LEGENDARY = 'legendary' // 传说
}

/**
 * 材料类型
 */
export enum MaterialType {
    RESOURCE = 'resource',   // 资源（花草、竹子等）
    INGREDIENT = 'ingredient', // 食材
    CRAFTING = 'crafting',   // 手工艺材料（纸张、布料等）
    SPECIAL = 'special'      // 特殊材料
}

/**
 * 材料数据定义
 */
export interface MaterialData {
    /** 材料唯一标识符 */
    id: string;
    /** 显示名称 */
    name: string;
    /** 描述 */
    description: string;
    /** 材料类型 */
    type: MaterialType;
    /** 稀有度 */
    rarity: MaterialRarity;
    /** 最大堆叠数量 */
    maxStack: number;
    /** 图标资源路径 */
    icon: string;
    /** 售价（金币） */
    sellPrice: number;
    /** 获取来源（地点 ID 列表） */
    sources: string[];
    /** 季节限定（为空表示全年可获取） */
    seasons?: string[];
}

/**
 * 配置键名
 */
export const MATERIAL_CONFIG_KEY = 'materials';

/**
 * 材料系统接口
 */
export interface IMaterialSystem {
    /**
     * 初始化材料系统（加载配置）
     * @param materials 材料数据数组
     */
    initialize(materials: MaterialData[]): void;

    /**
     * 获取材料数据
     * @param materialId 材料标识符
     */
    getMaterial(materialId: string): MaterialData | undefined;

    /**
     * 获取所有材料
     */
    getAllMaterials(): MaterialData[];

    /**
     * 获取指定类型的材料
     * @param type 材料类型
     */
    getMaterialsByType(type: MaterialType): MaterialData[];

    /**
     * 获取指定稀有度的材料
     * @param rarity 稀有度
     */
    getMaterialsByRarity(rarity: MaterialRarity): MaterialData[];

    /**
     * 检查材料是否存在
     * @param materialId 材料标识符
     */
    hasMaterial(materialId: string): boolean;

    /**
     * 获取材料数量
     */
    getMaterialCount(): number;
}

/**
 * 材料系统实现
 */
export class MaterialSystem implements IMaterialSystem {
    private static instance: MaterialSystem | null = null;

    /**
     * 材料数据映射
     */
    private materials: Map<string, MaterialData> = new Map();

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): MaterialSystem {
        if (!MaterialSystem.instance) {
            MaterialSystem.instance = new MaterialSystem();
        }
        return MaterialSystem.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        MaterialSystem.instance = null;
    }

    public initialize(materials: MaterialData[]): void {
        this.materials.clear();

        for (const material of materials) {
            this.materials.set(material.id, material);
        }

        // 同时存储到配置系统
        configSystem.load(MATERIAL_CONFIG_KEY, materials);
    }

    public getMaterial(materialId: string): MaterialData | undefined {
        return this.materials.get(materialId);
    }

    public getAllMaterials(): MaterialData[] {
        return Array.from(this.materials.values());
    }

    public getMaterialsByType(type: MaterialType): MaterialData[] {
        return this.getAllMaterials().filter(m => m.type === type);
    }

    public getMaterialsByRarity(rarity: MaterialRarity): MaterialData[] {
        return this.getAllMaterials().filter(m => m.rarity === rarity);
    }

    public hasMaterial(materialId: string): boolean {
        return this.materials.has(materialId);
    }

    public getMaterialCount(): number {
        return this.materials.size;
    }
}

/**
 * 全局材料系统实例
 */
export const materialSystem = MaterialSystem.getInstance();
