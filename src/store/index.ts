/**
 * Store Entry Point
 * Экспорт composed store v2 (модульная архитектура)
 * 
 * @see docs/REFACTORING_PLAN.md - план рефакторинга
 */

// Основные экспорты из v2
export {
  useGameStore,
  // Типы
  type Resources,
  type ResourceKey,
  type CraftingCost,
  type Player,
  type GameStatistics,
  type Worker,
  type ProductionBuilding,
  type CraftedWeapon,
  type ActiveCraft,
  type ActiveRefining,
  type WeaponInventory,
  type UnlockedRecipes,
  type RecipeSource,
  type WeaponType,
  type WeaponTier,
  type WeaponMaterial,
  type QualityGrade,
  type GameScreen,
  // Начальные значения
  initialPlayer,
  initialStatistics,
  initialResources,
  initialBuildings,
  initialActiveCraft,
  initialActiveRefining,
  initialWeaponInventory,
  initialUnlockedRecipes,
  // Данные
  workerClassData,
} from './game-store-composed-v2'

// Типы из game-store-composed (для обратной совместимости)
export type { NPCOrder, TutorialState } from './game-store-composed'

// Hooks (утилиты) - теперь из v2
export { useFormattedResources, useWorkerHireCost } from './game-store-composed-v2'

// Типы из workers-slice
export type { WorkerStats, WorkerClass } from './slices/workers-slice'
