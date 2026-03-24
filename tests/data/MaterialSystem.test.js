/**
 * MaterialSystem 单元测试
 */
import { MaterialSystem, materialSystem, MaterialRarity, MaterialType, MATERIAL_CONFIG_KEY } from '../../src/data/MaterialSystem';
import { configSystem } from '../../src/core/ConfigSystem';
import { eventSystem } from '../../src/core/EventSystem';
describe('MaterialSystem', () => {
    const testMaterials = [
        {
            id: 'bamboo',
            name: '竹子',
            description: '常见的竹子，可用于制作各种物品',
            type: MaterialType.RESOURCE,
            rarity: MaterialRarity.COMMON,
            maxStack: 99,
            icon: 'textures/items/bamboo.png',
            sellPrice: 5,
            sources: ['village:forest'],
            seasons: []
        },
        {
            id: 'lotus_leaf',
            name: '荷叶',
            description: '新鲜的荷叶，用于包裹粽子',
            type: MaterialType.INGREDIENT,
            rarity: MaterialRarity.COMMON,
            maxStack: 50,
            icon: 'textures/items/lotus_leaf.png',
            sellPrice: 3,
            sources: ['village:pond'],
            seasons: ['summer']
        },
        {
            id: 'red_paper',
            name: '红纸',
            description: '用于制作灯笼和剪纸',
            type: MaterialType.CRAFTING,
            rarity: MaterialRarity.UNCOMMON,
            maxStack: 30,
            icon: 'textures/items/red_paper.png',
            sellPrice: 10,
            sources: ['village:market'],
            seasons: []
        },
        {
            id: 'moon_rabbit_hair',
            name: '月兔毛',
            description: '传说中的月兔掉落的毛发',
            type: MaterialType.SPECIAL,
            rarity: MaterialRarity.LEGENDARY,
            maxStack: 10,
            icon: 'textures/items/moon_rabbit_hair.png',
            sellPrice: 1000,
            sources: ['secret:moon_palace'],
            seasons: ['autumn']
        }
    ];
    beforeEach(() => {
        materialSystem.initialize([]);
        configSystem.clear();
        eventSystem.clearAll();
    });
    describe('单例模式', () => {
        it('应该返回同一个实例', () => {
            const instance1 = MaterialSystem.getInstance();
            const instance2 = MaterialSystem.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('initialize()', () => {
        it('应该正确初始化材料数据', () => {
            materialSystem.initialize(testMaterials);
            expect(materialSystem.getMaterialCount()).toBe(4);
            expect(materialSystem.hasMaterial('bamboo')).toBe(true);
            expect(materialSystem.hasMaterial('lotus_leaf')).toBe(true);
        });
        it('初始化应该覆盖之前的数据', () => {
            materialSystem.initialize(testMaterials);
            materialSystem.initialize([testMaterials[0]]);
            expect(materialSystem.getMaterialCount()).toBe(1);
        });
        it('应该同时存储到配置系统', () => {
            materialSystem.initialize(testMaterials);
            const configData = configSystem.get(MATERIAL_CONFIG_KEY);
            expect(configData).toEqual(testMaterials);
        });
    });
    describe('getMaterial()', () => {
        it('应该返回正确的材料数据', () => {
            materialSystem.initialize(testMaterials);
            const bamboo = materialSystem.getMaterial('bamboo');
            expect(bamboo).toBeDefined();
            expect(bamboo === null || bamboo === void 0 ? void 0 : bamboo.name).toBe('竹子');
            expect(bamboo === null || bamboo === void 0 ? void 0 : bamboo.type).toBe(MaterialType.RESOURCE);
            expect(bamboo === null || bamboo === void 0 ? void 0 : bamboo.rarity).toBe(MaterialRarity.COMMON);
        });
        it('不存在的材料应该返回 undefined', () => {
            materialSystem.initialize(testMaterials);
            const result = materialSystem.getMaterial('nonexistent');
            expect(result).toBeUndefined();
        });
    });
    describe('getAllMaterials()', () => {
        it('应该返回所有材料', () => {
            materialSystem.initialize(testMaterials);
            const all = materialSystem.getAllMaterials();
            expect(all.length).toBe(4);
            expect(all.map(m => m.id)).toContain('bamboo');
            expect(all.map(m => m.id)).toContain('lotus_leaf');
        });
    });
    describe('getMaterialsByType()', () => {
        it('应该返回指定类型的材料', () => {
            materialSystem.initialize(testMaterials);
            const resources = materialSystem.getMaterialsByType(MaterialType.RESOURCE);
            expect(resources.length).toBe(1);
            expect(resources[0].id).toBe('bamboo');
        });
        it('没有匹配类型时返回空数组', () => {
            materialSystem.initialize([]);
            const result = materialSystem.getMaterialsByType(MaterialType.RESOURCE);
            expect(result).toEqual([]);
        });
    });
    describe('getMaterialsByRarity()', () => {
        it('应该返回指定稀有度的材料', () => {
            materialSystem.initialize(testMaterials);
            const commons = materialSystem.getMaterialsByRarity(MaterialRarity.COMMON);
            const legendaries = materialSystem.getMaterialsByRarity(MaterialRarity.LEGENDARY);
            expect(commons.length).toBe(2);
            expect(legendaries.length).toBe(1);
            expect(legendaries[0].id).toBe('moon_rabbit_hair');
        });
    });
    describe('hasMaterial()', () => {
        it('存在材料时返回 true', () => {
            materialSystem.initialize(testMaterials);
            expect(materialSystem.hasMaterial('bamboo')).toBe(true);
        });
        it('不存在材料时返回 false', () => {
            materialSystem.initialize(testMaterials);
            expect(materialSystem.hasMaterial('nonexistent')).toBe(false);
        });
    });
    describe('getMaterialCount()', () => {
        it('应该返回正确的材料数量', () => {
            expect(materialSystem.getMaterialCount()).toBe(0);
            materialSystem.initialize(testMaterials);
            expect(materialSystem.getMaterialCount()).toBe(4);
        });
    });
});
//# sourceMappingURL=MaterialSystem.test.js.map