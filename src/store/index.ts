/**
 * Store Entry Point
 * Экспорт composed store (модульная архитектура)
 */

// Основные экспорты
export {
  useGameStore,
  useFormattedResources,
  useWorkerHireCost,
  workerClassData,
  // Типы
  type Resources,
  type ResourceKey,
  type CraftingCost,
  type Player,
  type GameStatistics,
  type Worker,
  type WorkerClass,
  type WorkerStats,
  type ProductionBuilding,
  type CraftedWeapon,
  type ActiveCraft,
  type ActiveRefining,
  type WeaponInventory,
  type UnlockedRecipes,
  type RecipeSource,
  type GameScreen,
  type NPCOrder,
  type TutorialState,
} from './game-store-composed'
