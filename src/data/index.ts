/**
 * 数据模块导出
 */

export {
    MaterialSystem,
    materialSystem,
    MaterialRarity,
    MaterialType,
    MATERIAL_CONFIG_KEY
} from './MaterialSystem';
export type {
    MaterialData,
    IMaterialSystem
} from './MaterialSystem';

export {
    BackpackSystem,
    backpackSystem,
    ItemType,
    SlotState,
    BackpackEvents
} from './BackpackSystem';
export type {
    Slot,
    AddItemResult,
    RemoveItemResult,
    BackpackData,
    IBackpackSystem,
    ItemAddedPayload,
    ItemRemovedPayload,
    SlotChangedPayload,
    InventoryFullPayload,
    InventoryExpandedPayload
} from './BackpackSystem';

export {
    RecipeSystem,
    recipeSystem,
    RecipeRarity,
    RecipeCategory,
    RecipeEvents
} from './RecipeSystem';
export type {
    Recipe,
    InputItem,
    OutputItem,
    RecipeProgress,
    RecipeView,
    RecipeSystemData,
    IRecipeSystem,
    RecipeUnlockedPayload,
    RecipeMasteredPayload
} from './RecipeSystem';
