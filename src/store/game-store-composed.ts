/**
 * Composed Game Store
 * Полная интеграция Zustand slices для модульной архитектуры
 * 
 * Слайсы:
 * - resources-slice: управление ресурсами
 * - player-slice: данные игрока
 * - workers-slice: рабочие и здания
 * - craft-slice: крафт, переработка, инвентарь
 * - guild-slice: гильдия и экспедиции
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ================================
// SLICE IMPORTS
// ================================

import {
  initialResources,
  Resources,
  ResourceKey,
  CraftingCost,
} from './slices/resources-slice'

import {
  initialPlayer,
  initialStatistics,
  Player,
  GameStatistics,
} from './slices/player-slice'

import {
  initialBuildings,
  workerClassData,
  Worker,
  WorkerClass,
  WorkerStats,
  ProductionBuilding,
} from './slices/workers-slice'

import {
  initialActiveCraft,
  initialActiveRefining,
  initialWeaponInventory,
  initialUnlockedRecipes,
  CraftedWeapon,
  ActiveCraft,
  ActiveRefining,
  WeaponInventory,
  UnlockedRecipes,
  RecipeSource,
  WeaponEnchantment,
  WeaponMaterialUsed,
} from './slices/craft-slice'
import type { CraftedWeaponV2 } from '@/types/craft-v2'

import {
  initialGuildState,
  GuildState,
  Adventurer,
  ActiveExpedition,
  RecoveryQuest,
  getGuildLevel,
  GUILD_LEVELS,
} from '@/types/guild'
import type { AdventurerExtended } from '@/types/adventurer-extended'
import type { KnownAdventurer, MissionResultForStats } from '@/types/known-adventurer'
import { KNOWN_ADVENTURERS_CONFIG } from '@/types/known-adventurer'
import {
  updateKnownAdventurer,
  getKnownAdventurerInfo,
  getMetInfoText,
  getContractAvailabilityText,
} from '@/lib/known-adventurers-manager'
import {
  calculateExpeditionResult as calculateExpeditionResultV2,
  type ExpeditionCalculation,
} from '@/lib/expedition-calculator-v2'

// ================================
// ОСТАЛЬНЫЕ ИМПОРТЫ
// ================================

import { 
  WeaponRecipe, 
  getQualityGrade,
  calculateAttack,
  calculateSellPrice,
  calculateCraftQuality
} from '@/data/weapon-recipes'
import { 
  RefiningRecipe,
  refiningRecipes
} from '@/data/refining-recipes'
import {
  Enchantment,
  calculateSacrificeValue,
  canAffordEnchantment,
  areEnchantmentsCompatible,
  MAX_ENCHANTMENTS_PER_WEAPON
} from '@/data/enchantments'
import {
  expeditionTemplates,
} from '@/data/expedition-templates'
import {
  generateAdventurerPool,
  isAdventurerExpired,
  ADVENTURER_LIFETIME,
  getAdventurerFullName,
} from '@/lib/adventurer-generator'
import { ExpeditionResult } from './slices/guild-slice'
import {
  RepairOption,
  RepairType,
  ExecuteRepairResult,
} from '@/data/repair-system'

// Store utilities
import {
  findBestBlacksmith,
  getRepairOptionsForWeapon,
  calculateRepairCost,
  calculateMaxRepairPercent,
  executeRepair as executeRepairUtil,
  getMaterialDeductions,
  type WeaponForRepair,
} from '@/lib/store-utils/repair-utils'
import {
  calculateExpeditionOutcome,
  updateKnownAdventurersAfterMission,
  createRecoveryQuest,
  createHistoryEntry,
  updateGuildStats,
  calculateExpeditionPreview,
  type WeaponForExpedition,
} from '@/lib/store-utils/expedition-utils'

// ================================
// ТИПЫ (оставшиеся)
// ================================

export type GameScreen = 'forge' | 'resources' | 'workers' | 'shop' | 'guild' | 'dungeons' | 'altar'

export interface NPCOrder {
  id: string
  clientName: string
  clientTitle: string
  clientIcon: string
  weaponType: string
  material?: string
  minQuality: number
  minAttack?: number
  goldReward: number
  fameReward: number
  bonusItems?: { resource: string; amount: number }[]
  deadline: number
  status: 'available' | 'in_progress' | 'completed' | 'expired'
  acceptedAt?: number
  requiredLevel: number
  requiredFame: number
}

export interface TutorialState {
  isActive: boolean
  currentStep: number
  completedSteps: string[]
  skipped: boolean
}

// ================================
// НАЧАЛЬНЫЕ ЗНАЧЕНИЯ (дополнительные)
// ================================

const initialTutorial: TutorialState = {
  isActive: true,
  currentStep: 0,
  completedSteps: [],
  skipped: false,
}

// ================================
// ИНТЕРФЕЙС STORA
// ================================

interface GameState {
  // Resources slice
  resources: Resources
  addResource: (resource: ResourceKey, amount: number) => void
  spendResource: (resource: ResourceKey, amount: number) => boolean
  canAfford: (cost: CraftingCost) => boolean
  spendResources: (cost: CraftingCost) => boolean
  sellResource: (resource: ResourceKey, amount: number) => boolean
  getResourceSellPrice: (resource: ResourceKey) => number
  
  // Player slice
  player: Player
  statistics: GameStatistics
  setPlayerName: (name: string) => void
  addExperience: (amount: number) => void
  addFame: (amount: number) => void
  
  // Workers slice
  workers: Worker[]
  maxWorkers: number
  buildings: ProductionBuilding[]
  hireWorker: (workerClass: WorkerClass) => boolean
  assignWorker: (workerId: string, assignment: string) => void
  updateWorkerStamina: (workerId: string, delta: number) => void
  addWorkerExperience: (workerId: string, amount: number) => void
  fireWorker: (workerId: string) => void
  getWorkersQuality: () => number
  updateBuildingProgress: (buildingId: string, efficiency: number) => void
  upgradeBuilding: (buildingId: string) => boolean
  
  // Craft slice
  currentScreen: GameScreen
  activeCraft: ActiveCraft
  activeRefining: ActiveRefining
  weaponInventory: WeaponInventory
  unlockedRecipes: UnlockedRecipes
  recipeSources: RecipeSource[]
  unlockedEnchantments: string[]
  
  setCurrentScreen: (screen: GameScreen) => void
  startCraft: (recipe: WeaponRecipe) => boolean
  updateCraftProgress: (progress: number) => void
  completeCraft: () => CraftedWeapon | null
  isCrafting: () => boolean
  startRefining: (recipe: RefiningRecipe, amount: number) => boolean
  updateRefiningProgress: (progress: number) => void
  completeRefining: () => boolean
  isRefining: () => boolean
  canRefine: (recipe: RefiningRecipe, amount: number) => boolean
  unlockRecipe: (recipeId: string, source: 'purchase' | 'order' | 'expedition' | 'level') => boolean
  isRecipeUnlocked: (recipeId: string) => boolean
  getRecipeSource: (recipeId: string) => RecipeSource | undefined
  sellWeapon: (weaponId: string) => boolean
  getWeaponById: (weaponId: string) => CraftedWeapon | undefined
  addWeapon: (weapon: CraftedWeapon) => void
  addWeaponV2: (weapon: CraftedWeaponV2) => void
  
  // Orders
  orders: NPCOrder[]
  activeOrderId: string | null
  generateOrder: () => NPCOrder | null
  acceptOrder: (orderId: string) => boolean
  completeOrder: (orderId: string, weaponId: string) => boolean
  expireOrder: (orderId: string) => void
  getActiveOrder: () => NPCOrder | undefined
  
  // Tutorial
  tutorial: TutorialState
  nextTutorialStep: () => void
  skipTutorial: () => void
  completeTutorialStep: (stepId: string) => void
  isTutorialActive: () => boolean
  
  // Emergency help
  canGetEmergencyHelp: () => boolean
  getEmergencyHelp: () => boolean
  
  // Enchantments
  sacrificeWeapon: (weaponId: string) => { soulEssence: number; bonusGold: number } | null
  unlockEnchantment: (enchantmentId: string) => boolean
  isEnchantmentUnlocked: (enchantmentId: string) => boolean
  enchantWeapon: (weaponId: string, enchantmentId: string) => boolean
  removeEnchantment: (weaponId: string, enchantmentId: string) => boolean
  addWarSoulToWeapon: (weaponId: string, points: number, durabilityLoss?: number, epicGain?: number) => boolean
  
  // Repair
  getRepairOptions: (weaponId: string) => RepairOption[]
  getBestBlacksmith: () => Worker | null
  executeWeaponRepair: (weaponId: string, repairType: RepairType) => ExecuteRepairResult
  repairWeapon: (weaponId: string) => { success: boolean; cost: number; repairedAmount: number }
  getWeaponRepairCost: (weaponId: string) => number
  getMaxRepairPercent: (weaponId: string) => number
  
  // Guild
  guild: GuildState
  knownAdventurers: KnownAdventurer[]
  refreshAdventurers: () => void
  initializeAdventurers: () => void
  startExpedition: (expedition: ExpeditionTemplate, adventurer: Adventurer, weapon: CraftedWeapon, extendedAdventurer?: AdventurerExtended) => boolean
  cancelExpedition: (expeditionId: string) => boolean
  completeExpedition: (expeditionId: string) => ExpeditionResult | null
  startRecoveryQuest: (questId: string) => boolean
  completeRecoveryQuest: (questId: string) => boolean
  declineRecoveryQuest: (questId: string) => void
  addGlory: (amount: number) => void
  getAdventurerById: (id: string) => Adventurer | undefined
  getActiveExpeditionById: (id: string) => ActiveExpedition | undefined
  isWeaponInExpedition: (weaponId: string) => boolean
  // Known Adventurers
  getKnownAdventurer: (adventurerId: string) => KnownAdventurer | undefined
  getMetBadge: (adventurerId: string) => { isKnown: boolean; text: string; className: string } | null
  calculateExpedition: (adventurer: AdventurerExtended, expedition: ExpeditionTemplate, weapon: CraftedWeapon) => ExpeditionCalculation
}

// ================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================

const generateId = (): string => Math.random().toString(36).substring(2, 9)

const generateWorkerName = (): string => {
  const names = ['Грегор', 'Иван', 'Борис', 'Виктор', 'Алексей', 'Дмитрий', 'Николай', 'Мария', 'Анна', 'Елена', 'Пётр', 'Сергей', 'Андрей', 'Михаил', 'Артём', 'Максим']
  return names[Math.floor(Math.random() * names.length)]
}

const PLAYER_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 50, title: 'Легендарный мастер' },
  { minLevel: 40, title: 'Великий мастер' },
  { minLevel: 30, title: 'Мастер-кузнец' },
  { minLevel: 20, title: 'Опытный кузнец' },
  { minLevel: 10, title: 'Подмастерье' },
  { minLevel: 5, title: 'Ученик' },
  { minLevel: 1, title: 'Новичок' },
]

const getTitleByLevel = (level: number): string => {
  for (const { minLevel, title } of PLAYER_TITLES) {
    if (level >= minLevel) return title
  }
  return 'Новичок'
}

// ================================
// STORE
// ================================

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // === RESOURCES STATE ===
      resources: initialResources,
      
      addResource: (resource, amount) => set((state) => ({
        resources: { ...state.resources, [resource]: Math.max(0, state.resources[resource] + amount) }
      })),
      
      spendResource: (resource, amount) => {
        const state = get()
        if (state.resources[resource] >= amount) {
          set({ resources: { ...state.resources, [resource]: state.resources[resource] - amount } })
          return true
        }
        return false
      },
      
      canAfford: (cost) => {
        const state = get()
        for (const [resource, amount] of Object.entries(cost)) {
          if ((state.resources[resource as ResourceKey] || 0) < (amount || 0)) return false
        }
        return true
      },
      
      spendResources: (cost) => {
        const state = get()
        if (!state.canAfford(cost)) return false
        
        const newResources = { ...state.resources }
        for (const [resource, amount] of Object.entries(cost)) {
          if (amount) newResources[resource as ResourceKey] -= amount
        }
        set({ resources: newResources })
        return true
      },
      
      sellResource: (resource, amount) => {
        const state = get()
        if ((state.resources[resource] || 0) < amount) return false
        
        const price = state.getResourceSellPrice(resource)
        const totalGold = price * amount
        
        set((state) => ({
          resources: {
            ...state.resources,
            [resource]: state.resources[resource] - amount,
            gold: state.resources.gold + totalGold,
          },
          statistics: {
            ...state.statistics,
            totalGoldEarned: state.statistics.totalGoldEarned + totalGold,
          },
        }))
        
        return true
      },
      
      getResourceSellPrice: (resource) => {
        const sellPrices: Partial<Record<ResourceKey, number>> = {
          wood: 0.3, stone: 0.4, iron: 2, coal: 1.5,
          copper: 3, tin: 3, silver: 8, goldOre: 15, mithril: 50,
          ironIngot: 4, copperIngot: 6, tinIngot: 6, bronzeIngot: 10,
          steelIngot: 15, silverIngot: 16, goldIngot: 30, mithrilIngot: 100,
          planks: 0.5, stoneBlocks: 0.6,
        }
        return sellPrices[resource] || 1
      },
      
      // === PLAYER STATE ===
      player: initialPlayer,
      statistics: initialStatistics,
      
      setPlayerName: (name) => set((state) => ({ player: { ...state.player, name } })),
      
      addExperience: (amount) => set((state) => {
        let newExp = state.player.experience + amount
        let newLevel = state.player.level
        let expToNext = state.player.experienceToNextLevel
        let newFame = state.player.fame
        
        while (newExp >= expToNext) {
          newExp -= expToNext
          newLevel++
          expToNext = Math.floor(expToNext * 1.5)
          newFame += 10
        }
        
        const newTitle = getTitleByLevel(newLevel)
        
        return { player: { ...state.player, experience: newExp, level: newLevel, experienceToNextLevel: expToNext, fame: newFame, title: newTitle } }
      }),
      
      addFame: (amount) => set((state) => ({
        player: { ...state.player, fame: state.player.fame + amount }
      })),
      
      // === WORKERS STATE ===
      workers: [],
      maxWorkers: 5,
      buildings: initialBuildings,
      
      hireWorker: (workerClass) => {
        const state = get()
        const classData = workerClassData[workerClass]
        
        if (state.workers.length >= state.maxWorkers) return false
        
        const costMultiplier = 1 + state.workers.filter(w => w.class === workerClass).length * 0.5
        const cost = Math.floor(classData.baseCost * costMultiplier)
        
        if (state.resources.gold < cost) return false
        
        const newWorker: Worker = {
          id: generateId(),
          name: generateWorkerName(),
          class: workerClass,
          level: 1,
          experience: 0,
          stamina: classData.baseStats.stamina_max,
          stats: { ...classData.baseStats },
          assignment: 'rest',
          hiredAt: Date.now(),
          hireCost: cost,
        }
        
        set((state) => ({
          resources: { ...state.resources, gold: state.resources.gold - cost },
          workers: [...state.workers, newWorker],
          statistics: { ...state.statistics, totalWorkersHired: state.statistics.totalWorkersHired + 1 },
        }))
        
        return true
      },
      
      assignWorker: (workerId, assignment) => set((state) => ({
        workers: state.workers.map(w => w.id === workerId ? { ...w, assignment } : w)
      })),
      
      updateWorkerStamina: (workerId, delta) => set((state) => ({
        workers: state.workers.map(w => {
          if (w.id !== workerId) return w
          const newStamina = Math.max(0, Math.min(w.stats.stamina_max, w.stamina + delta))
          return { ...w, stamina: newStamina }
        })
      })),
      
      addWorkerExperience: (workerId, amount) => set((state) => {
        const worker = state.workers.find(w => w.id === workerId)
        if (!worker) return state
        
        const expMultiplier = 1 + (worker.stats.intelligence - 25) / 100
        const actualExp = amount * expMultiplier
        
        const newExperience = worker.experience + actualExp
        const expToLevel = 100 + (worker.level * 50)
        
        if (newExperience >= expToLevel && worker.level < 50) {
          const newLevel = worker.level + 1
          const leftoverExp = newExperience - expToLevel
          const statBonus = 1 + (0.02 + Math.random() * 0.03)
          
          return {
            workers: state.workers.map(w => w.id === workerId ? {
              ...w,
              level: newLevel,
              experience: leftoverExp,
              stats: {
                speed: Math.min(150, Math.floor(w.stats.speed * statBonus)),
                quality: Math.min(150, Math.floor(w.stats.quality * statBonus)),
                stamina_max: Math.min(200, Math.floor(w.stats.stamina_max * statBonus)),
                intelligence: Math.min(150, Math.floor(w.stats.intelligence * statBonus)),
                loyalty: Math.min(100, Math.floor(w.stats.loyalty * statBonus)),
              },
              stamina: Math.min(200, Math.floor(w.stats.stamina_max * statBonus)),
            } : w)
          }
        }
        
        return {
          workers: state.workers.map(w => w.id === workerId ? {
            ...w,
            experience: newExperience
          } : w)
        }
      }),
      
      fireWorker: (workerId) => {
        const state = get()
        const worker = state.workers.find(w => w.id === workerId)
        if (!worker) return
        
        const hireCost = worker.hireCost ?? workerClassData[worker.class]?.baseCost ?? 50
        const refund = Math.floor(hireCost * 0.3)
        
        set((state) => ({
          workers: state.workers.filter(w => w.id !== workerId),
          resources: {
            ...state.resources,
            gold: state.resources.gold + refund
          }
        }))
      },
      
      getWorkersQuality: () => {
        const state = get()
        const blacksmiths = state.workers.filter(w => w.class === 'blacksmith' && w.assignment === 'forge')
        if (blacksmiths.length === 0) return 20
        return blacksmiths.reduce((sum, w) => sum + w.stats.quality, 0) / blacksmiths.length
      },
      
      updateBuildingProgress: (buildingId, efficiency) => set((state) => ({
        buildings: state.buildings.map(b => b.id === buildingId ? { ...b, progress: efficiency * 100 } : b)
      })),
      
      upgradeBuilding: (buildingId) => {
        const state = get()
        const building = state.buildings.find(b => b.id === buildingId)
        if (!building) return false
        
        const upgradeCost = Math.floor(100 * Math.pow(1.8, building.level))
        if (state.resources.gold < upgradeCost) return false
        
        set((state) => ({
          resources: { ...state.resources, gold: state.resources.gold - upgradeCost },
          buildings: state.buildings.map(b => b.id === buildingId ? {
            ...b, level: b.level + 1, baseProduction: b.baseProduction * 1.25, requiredWorkers: Math.ceil(b.requiredWorkers * 1.1)
          } : b)
        }))
        
        return true
      },
      
      // === CRAFT STATE ===
      currentScreen: 'forge',
      activeCraft: initialActiveCraft,
      activeRefining: initialActiveRefining,
      weaponInventory: initialWeaponInventory,
      unlockedRecipes: initialUnlockedRecipes,
      recipeSources: [],
      unlockedEnchantments: [],
      
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      
      startCraft: (recipe) => {
        const state = get()
        if (state.activeCraft.recipeId) return false
        if (!state.isRecipeUnlocked(recipe.id)) return false
        if (!state.canAfford(recipe.cost)) return false
        if (state.player.level < recipe.requiredLevel) return false
        
        state.spendResources(recipe.cost)
        
        const now = Date.now()
        const endTime = now + recipe.baseCraftTime * 1000
        
        set({
          activeCraft: {
            recipeId: recipe.id,
            weaponName: recipe.name,
            progress: 0,
            startTime: now,
            endTime: endTime,
            quality: 0,
          }
        })
        return true
      },
      
      updateCraftProgress: (progress) => set((state) => ({
        activeCraft: { ...state.activeCraft, progress: Math.min(100, progress) }
      })),
      
      completeCraft: () => {
        const state = get()
        if (!state.activeCraft.recipeId) return null
        
        const { weaponRecipes } = require('@/data/weapon-recipes')
        const recipe = weaponRecipes.find((r: WeaponRecipe) => r.id === state.activeCraft.recipeId)
        if (!recipe) return null
        
        const workersQuality = state.getWorkersQuality()
        const quality = calculateCraftQuality(workersQuality, state.player.level, recipe.tier)
        const qualityGrade = getQualityGrade(quality)
        const attack = calculateAttack(recipe.type, recipe.tier, recipe.material, quality)
        const sellPrice = calculateSellPrice(recipe.baseSellPrice, quality, recipe.tier)
        
        const weapon: CraftedWeapon = {
          id: generateId(),
          recipeId: recipe.id,
          name: recipe.name,
          type: recipe.type,
          tier: recipe.tier,
          material: recipe.material,
          quality,
          qualityGrade,
          attack,
          durability: 100,
          maxDurability: 100,
          sellPrice,
          createdAt: Date.now(),
          warSoul: 0,
          adventureCount: 0,
          epicMultiplier: 1.0,
          materials: { ...recipe.cost },
          primaryMaterial: recipe.material,
        }
        
        set((state) => ({
          activeCraft: initialActiveCraft,
          weaponInventory: {
            ...state.weaponInventory,
            weapons: [...state.weaponInventory.weapons, weapon],
          },
          statistics: {
            ...state.statistics,
            totalCrafts: state.statistics.totalCrafts + 1,
          },
        }))
        
        state.addExperience(Math.floor(quality / 5) + 5)
        
        return weapon
      },
      
      isCrafting: () => get().activeCraft.recipeId !== null,
      
      startRefining: (recipe, amount) => {
        const state = get()
        if (state.activeRefining.recipeId) return false
        if (!state.canRefine(recipe, amount)) return false
        
        const newResources = { ...state.resources }
        recipe.inputs.forEach(input => {
          newResources[input.resource as ResourceKey] -= input.amount * amount
        })
        if (recipe.extraCost?.coal) {
          newResources.coal -= recipe.extraCost.coal * amount
        }
        set({ resources: newResources })
        
        const now = Date.now()
        const endTime = now + recipe.processTime * 1000 * amount
        
        set({
          activeRefining: {
            recipeId: recipe.id,
            resourceName: recipe.name,
            progress: 0,
            startTime: now,
            endTime: endTime,
            amount,
          }
        })
        return true
      },
      
      updateRefiningProgress: (progress) => set((state) => ({
        activeRefining: { ...state.activeRefining, progress: Math.min(100, progress) }
      })),
      
      completeRefining: () => {
        const state = get()
        if (!state.activeRefining.recipeId) return false
        
        const recipe = refiningRecipes.find(r => r.id === state.activeRefining.recipeId)
        if (!recipe) return false
        
        const amount = state.activeRefining.amount
        
        set((state) => ({
          activeRefining: initialActiveRefining,
          resources: {
            ...state.resources,
            [recipe.output.resource as ResourceKey]: state.resources[recipe.output.resource as ResourceKey] + recipe.output.amount * amount,
          },
          statistics: {
            ...state.statistics,
            totalRefines: state.statistics.totalRefines + 1,
          },
        }))
        
        state.addExperience(2 * amount)
        return true
      },
      
      isRefining: () => get().activeRefining.recipeId !== null,
      
      canRefine: (recipe, amount) => {
        const state = get()
        
        for (const input of recipe.inputs) {
          const needed = input.amount * amount
          if ((state.resources[input.resource as ResourceKey] || 0) < needed) {
            return false
          }
        }
        
        const coalNeeded = recipe.extraCost?.coal ? recipe.extraCost.coal * amount : 0
        if (state.resources.coal < coalNeeded) {
          return false
        }
        
        return state.player.level >= recipe.requiredLevel
      },
      
      unlockRecipe: (recipeId, source) => {
        const state = get()
        
        if (state.unlockedRecipes.weaponRecipes.includes(recipeId) ||
            state.unlockedRecipes.refiningRecipes.includes(recipeId)) {
          return false
        }
        
        const { weaponRecipes } = require('@/data/weapon-recipes')
        const isWeaponRecipe = weaponRecipes.find((r: WeaponRecipe) => r.id === recipeId)
        const isRefiningRecipe = refiningRecipes.find(r => r.id === recipeId)
        
        if (!isWeaponRecipe && !isRefiningRecipe) return false
        
        const newSource: RecipeSource = {
          recipeId,
          source,
          obtainedAt: Date.now(),
        }
        
        set((state) => ({
          unlockedRecipes: {
            weaponRecipes: isWeaponRecipe 
              ? [...state.unlockedRecipes.weaponRecipes, recipeId]
              : state.unlockedRecipes.weaponRecipes,
            refiningRecipes: isRefiningRecipe
              ? [...state.unlockedRecipes.refiningRecipes, recipeId]
              : state.unlockedRecipes.refiningRecipes,
          },
          recipeSources: [...state.recipeSources, newSource],
          statistics: {
            ...state.statistics,
            recipesUnlocked: state.statistics.recipesUnlocked + 1,
          },
        }))
        
        return true
      },
      
      isRecipeUnlocked: (recipeId) => {
        const state = get()
        return state.unlockedRecipes.weaponRecipes.includes(recipeId) ||
               state.unlockedRecipes.refiningRecipes.includes(recipeId)
      },
      
      getRecipeSource: (recipeId) => get().recipeSources.find(s => s.recipeId === recipeId),
      
      sellWeapon: (weaponId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return false
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.filter(w => w.id !== weaponId),
          },
          resources: {
            ...state.resources,
            gold: state.resources.gold + weapon.sellPrice,
          },
          statistics: {
            ...state.statistics,
            totalGoldEarned: state.statistics.totalGoldEarned + weapon.sellPrice,
            weaponsSold: state.statistics.weaponsSold + 1,
          },
        }))
        
        return true
      },
      
      getWeaponById: (weaponId) => get().weaponInventory.weapons.find(w => w.id === weaponId),
      
      addWeapon: (weapon) => set((state) => ({
        weaponInventory: {
          ...state.weaponInventory,
          weapons: [...state.weaponInventory.weapons, weapon],
        },
        statistics: {
          ...state.statistics,
          totalCrafts: state.statistics.totalCrafts + 1,
        },
      })),
      
      addWeaponV2: (weapon) => {
        // Конвертируем CraftedWeaponV2 в формат CraftedWeapon для совместимости
        
        // Конвертация числового tier в строковый
        const tierMap: Record<number, string> = {
          1: 'common',
          2: 'uncommon', 
          3: 'rare',
          4: 'epic',
          5: 'legendary',
          6: 'mythic',
        }
        
        // Конвертация qualityGrade
        const qualityGradeMap: Record<string, string> = {
          'poor': 'poor',
          'common': 'normal',
          'good': 'good',
          'excellent': 'excellent',
          'masterpiece': 'masterwork',
          'legendary': 'legendary',
        }
        
        // Названия частей оружия на русском
        const partNames: Record<string, string> = {
          blade: 'Лезвие',
          guard: 'Гарда',
          grip: 'Рукоять',
          pommel: 'Навершие',
          wrapping: 'Обмотка',
        }
        
        // Конвертируем материалы в новый формат
        const materialsUsed: WeaponMaterialUsed[] = weapon.materials.map(mat => ({
          partId: mat.partId,
          partName: partNames[mat.partId] || mat.partId,
          materialId: mat.materialId,
          materialName: mat.materialName,
          quantity: mat.quantity,
        }))
        
        const legacyWeapon: CraftedWeapon = {
          id: weapon.id,
          recipeId: weapon.recipeId,
          name: weapon.fullName,
          type: weapon.type as CraftedWeapon['type'],
          tier: (tierMap[weapon.tier] || 'common') as CraftedWeapon['tier'],
          material: (weapon.materials[0]?.materialId || 'iron') as CraftedWeapon['material'],
          quality: weapon.quality,
          qualityGrade: (qualityGradeMap[weapon.qualityGrade] || 'normal') as CraftedWeapon['qualityGrade'],
          attack: weapon.stats.attack,
          durability: weapon.stats.durability,
          maxDurability: weapon.stats.maxDurability,
          sellPrice: weapon.sellPrice,
          createdAt: weapon.createdAt,
          warSoul: weapon.warSoul,
          adventureCount: weapon.adventureCount,
          epicMultiplier: 1.0,
          materials: {},
          primaryMaterial: (weapon.materials[0]?.materialId || 'iron') as CraftedWeapon['material'],
          // НОВОЕ: Сохраняем детали материалов
          materialsUsed,
          techniquesUsed: [], // Будет заполнено при интеграции с техниками
        }
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: [...state.weaponInventory.weapons, legacyWeapon],
          },
          statistics: {
            ...state.statistics,
            totalCrafts: state.statistics.totalCrafts + 1,
          },
        }))
      },
      
      // === ORDERS ===
      orders: [],
      activeOrderId: null,
      
      generateOrder: () => {
        const state = get()
        const { generateRandomOrder } = require('@/data/market-data')
        const order = generateRandomOrder(state.player.level, state.player.fame)
        
        if (!order) return null
        
        if (state.orders.find(o => o.clientName === order.clientName && o.status === 'available')) {
          return null
        }
        
        set({ orders: [...state.orders, order] })
        return order
      },
      
      acceptOrder: (orderId) => {
        const state = get()
        const order = state.orders.find(o => o.id === orderId)
        if (!order || order.status !== 'available') return false
        if (state.activeOrderId) return false
        
        set({
          orders: state.orders.map(o => o.id === orderId ? {
            ...o,
            status: 'in_progress',
            acceptedAt: Date.now()
          } : o),
          activeOrderId: orderId,
        })
        
        return true
      },
      
      completeOrder: (orderId, weaponId) => {
        const state = get()
        const order = state.orders.find(o => o.id === orderId)
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        
        if (!order || !weapon || order.status !== 'in_progress') return false
        
        if (weapon.quality < order.minQuality) return false
        if (order.minAttack && weapon.attack < order.minAttack) return false
        if (order.material && weapon.recipeId && !weapon.recipeId.includes(order.material)) return false
        if (order.weaponType !== weapon.type) return false
        
        const newResources = { ...state.resources, gold: state.resources.gold + order.goldReward }
        if (order.bonusItems) {
          order.bonusItems.forEach(item => {
            const resourceKey = item.resource as ResourceKey
            if (resourceKey in newResources) {
              newResources[resourceKey] = (newResources[resourceKey] || 0) + item.amount
            }
          })
        }
        
        const newWeapons = state.weaponInventory.weapons.filter(w => w.id !== weaponId)
        
        set({
          orders: state.orders.map(o => o.id === orderId ? {
            ...o,
            status: 'completed',
            completedAt: Date.now()
          } : o),
          activeOrderId: null,
          resources: newResources,
          weaponInventory: { ...state.weaponInventory, weapons: newWeapons },
          player: { ...state.player, fame: state.player.fame + order.fameReward },
          statistics: {
            ...state.statistics,
            totalGoldEarned: state.statistics.totalGoldEarned + order.goldReward,
            ordersCompleted: state.statistics.ordersCompleted + 1,
          },
        })
        
        return true
      },
      
      expireOrder: (orderId) => {
        const state = get()
        set({
          orders: state.orders.map(o => o.id === orderId ? {
            ...o,
            status: 'expired'
          } : o),
          activeOrderId: state.activeOrderId === orderId ? null : state.activeOrderId,
        })
      },
      
      getActiveOrder: () => {
        const state = get()
        if (!state.activeOrderId) return undefined
        return state.orders.find(o => o.id === state.activeOrderId)
      },
      
      // === TUTORIAL ===
      tutorial: initialTutorial,
      
      nextTutorialStep: () => set((state) => ({
        tutorial: {
          ...state.tutorial,
          currentStep: state.tutorial.currentStep + 1,
        }
      })),
      
      skipTutorial: () => set((state) => ({
        tutorial: {
          ...state.tutorial,
          isActive: false,
          skipped: true,
        }
      })),
      
      completeTutorialStep: (stepId) => set((state) => ({
        tutorial: {
          ...state.tutorial,
          completedSteps: [...state.tutorial.completedSteps, stepId],
        }
      })),
      
      isTutorialActive: () => get().tutorial.isActive && !get().tutorial.skipped,
      
      // === EMERGENCY HELP ===
      canGetEmergencyHelp: () => {
        const state = get()
        return state.workers.length === 0 && state.resources.gold < 50
      },
      
      getEmergencyHelp: () => {
        const state = get()
        if (!state.canGetEmergencyHelp()) return false
        
        const classData = workerClassData['apprentice']
        const freeWorker: Worker = {
          id: generateId(),
          name: generateWorkerName(),
          class: 'apprentice',
          level: 1,
          experience: 0,
          stamina: classData.baseStats.stamina_max,
          stats: { ...classData.baseStats },
          assignment: 'rest',
          hiredAt: Date.now(),
          hireCost: 0,
        }
        
        set((state) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold + 75,
          },
          workers: [...state.workers, freeWorker],
          statistics: {
            ...state.statistics,
            totalWorkersHired: state.statistics.totalWorkersHired + 1,
          },
        }))
        
        return true
      },
      
      // === ENCHANTMENTS ===
      sacrificeWeapon: (weaponId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return null
        
        const result = calculateSacrificeValue(
          weapon.quality, 
          weapon.tier, 
          weapon.warSoul || 0,
          weapon.epicMultiplier || 1
        )
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.filter(w => w.id !== weaponId),
          },
          resources: {
            ...state.resources,
            soulEssence: state.resources.soulEssence + result.soulEssence,
            gold: state.resources.gold + result.bonusGold,
          },
          statistics: {
            ...state.statistics,
            weaponsSacrificed: (state.statistics.weaponsSacrificed || 0) + 1,
          },
        }))
        
        return result
      },
      
      unlockEnchantment: (enchantmentId) => {
        const state = get()
        const { enchantments: allEnchantments } = require('@/data/enchantments')
        const enchantment = allEnchantments.find((e: Enchantment) => e.id === enchantmentId)
        
        if (!enchantment) return false
        if (state.unlockedEnchantments.includes(enchantmentId)) return false
        
        if (!canAffordEnchantment(
          enchantment,
          state.resources.soulEssence,
          state.resources.gold,
          state.player.level,
          state.player.fame
        )) return false
        
        set((state) => ({
          unlockedEnchantments: [...state.unlockedEnchantments, enchantmentId],
          resources: {
            ...state.resources,
            soulEssence: state.resources.soulEssence - enchantment.cost.soulEssence,
            gold: state.resources.gold - enchantment.cost.gold,
          },
        }))
        
        return true
      },
      
      isEnchantmentUnlocked: (enchantmentId) => get().unlockedEnchantments.includes(enchantmentId),
      
      enchantWeapon: (weaponId, enchantmentId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return false
        
        const { getEnchantment } = require('@/data/enchantments')
        const enchantment = getEnchantment(enchantmentId)
        if (!enchantment) return false
        
        if (!state.unlockedEnchantments.includes(enchantmentId)) return false
        
        const currentEnchantments = weapon.enchantments || []
        if (currentEnchantments.length >= MAX_ENCHANTMENTS_PER_WEAPON) return false
        
        if (!areEnchantmentsCompatible(currentEnchantments, enchantment)) return false
        
        const newEnchantment: WeaponEnchantment = {
          id: generateId(),
          enchantmentId,
          appliedAt: Date.now(),
        }
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.map(w => 
              w.id === weaponId 
                ? { ...w, enchantments: [...(w.enchantments || []), newEnchantment] }
                : w
            ),
          },
          statistics: {
            ...state.statistics,
            enchantmentsApplied: state.statistics.enchantmentsApplied + 1,
          },
        }))
        
        return true
      },
      
      removeEnchantment: (weaponId, enchantmentId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return false
        
        const currentEnchantments = weapon.enchantments || []
        if (!currentEnchantments.find(e => e.enchantmentId === enchantmentId)) return false
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.map(w => 
              w.id === weaponId 
                ? { ...w, enchantments: currentEnchantments.filter(e => e.enchantmentId !== enchantmentId) }
                : w
            ),
          },
        }))
        
        return true
      },
      
      addWarSoulToWeapon: (weaponId, points, durabilityLoss = 0, epicGain = 0) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return false
        
        set((state) => ({
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.map(w => 
              w.id === weaponId 
                ? { 
                    ...w, 
                    warSoul: (w.warSoul || 0) + points,
                    adventureCount: (w.adventureCount || 0) + 1,
                    durability: Math.max(0, (w.durability ?? 100) - durabilityLoss),
                    epicMultiplier: Math.min(5, (w.epicMultiplier ?? 1) + epicGain),
                  }
                : w
            ),
          },
        }))
        
        return true
      },
      
      // === REPAIR ===
      getBestBlacksmith: () => {
        return findBestBlacksmith(get().workers)
      },
      
      getRepairOptions: (weaponId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return []
        
        const blacksmith = findBestBlacksmith(state.workers)
        return getRepairOptionsForWeapon(weapon as WeaponForRepair, blacksmith)
      },
      
      executeWeaponRepair: (weaponId, repairType) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return { success: false, error: 'Оружие не найдено' }
        
        const blacksmith = findBestBlacksmith(state.workers)
        const result = executeRepairUtil(
          weapon as WeaponForRepair,
          repairType,
          blacksmith,
          state.resources.gold,
          state.resources
        )
        
        if (!result.success) {
          return { success: false, error: result.error || 'Ремонт не удался' }
        }
        
        // Deduct resources
        const materials = getMaterialDeductions(repairType, weapon as WeaponForRepair, blacksmith)
        const newResources = { ...state.resources }
        for (const [mat, amount] of Object.entries(materials)) {
          const resourceKey = mat as ResourceKey
          newResources[resourceKey] = (newResources[resourceKey] || 0) - (amount || 0)
        }
        
        // Get option for costs
        const options = getRepairOptionsForWeapon(weapon as WeaponForRepair, blacksmith)
        const option = options.find(o => o.type === repairType)
        if (option) {
          newResources.gold -= option.goldCost
        }
        
        // Update weapon
        const updatedWeapon = { ...weapon }
        updatedWeapon.durability = Math.min(100, weapon.durability + result.durabilityRestored!)
        updatedWeapon.maxDurability = result.maxDurabilityAfter!
        updatedWeapon.warSoul = Math.max(0, weapon.warSoul - result.soulLost!)
        updatedWeapon.attack = Math.max(1, weapon.attack - result.attackLost!)
        updatedWeapon.epicMultiplier = Math.max(1, weapon.epicMultiplier - result.epicLost!)
        
        // Update blacksmith
        const updatedWorkers = blacksmith && option
          ? state.workers.map(w => {
              if (w.id === blacksmith.id) {
                return {
                  ...w,
                  stamina: w.stamina - option.staminaCost,
                  experience: w.experience + Math.floor(option.goldCost / 10),
                }
              }
              return w
            })
          : state.workers
        
        set((state) => ({
          resources: newResources,
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.map(w => 
              w.id === weaponId ? updatedWeapon : w
            ),
          },
          workers: updatedWorkers,
        }))
        
        return { success: true, result }
      },
      
      getWeaponRepairCost: (weaponId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return 0
        return calculateRepairCost(weapon as WeaponForRepair, state.player.level)
      },
      
      getMaxRepairPercent: (weaponId) => {
        return calculateMaxRepairPercent(get().player.level)
      },
      
      repairWeapon: (weaponId) => {
        const state = get()
        const weapon = state.weaponInventory.weapons.find(w => w.id === weaponId)
        if (!weapon) return { success: false, cost: 0, repairedAmount: 0 }
        
        const currentDurability = weapon.durability ?? 100
        const maxDurability = weapon.maxDurability ?? 100
        
        if (currentDurability >= maxDurability) {
          return { success: false, cost: 0, repairedAmount: 0 }
        }
        
        const cost = calculateRepairCost(weapon as WeaponForRepair, state.player.level)
        if (state.resources.gold < cost) {
          return { success: false, cost: 0, repairedAmount: 0 }
        }
        
        const maxRepair = calculateMaxRepairPercent(state.player.level)
        const maxRepaired = Math.min(maxRepair, maxDurability - currentDurability)
        
        set((state) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold - cost,
          },
          weaponInventory: {
            ...state.weaponInventory,
            weapons: state.weaponInventory.weapons.map(w => 
              w.id === weaponId 
                ? { ...w, durability: currentDurability + maxRepaired }
                : w
            ),
          },
        }))
        
        return { success: true, cost, repairedAmount: maxRepaired }
      },
      
      // === GUILD ===
      guild: initialGuildState,
      knownAdventurers: [],
      
      refreshAdventurers: () => {
        const state = get()
        const now = Date.now()

        // Remove expired adventurers
        const activeAdventurers = state.guild.adventurers.filter(
          a => !isAdventurerExpired(a)
        )

        // Generate new ones if needed
        const currentCount = activeAdventurers.length
        const targetCount = 3 + Math.floor(state.guild.glory / 100)

        if (currentCount < targetCount) {
          const newAdventurers = generateAdventurerPool(targetCount - currentCount, state.guild.glory)
          activeAdventurers.push(...newAdventurers)
        }

        set((state) => ({
          guild: {
            ...state.guild,
            adventurers: activeAdventurers,
            adventurerRefreshAt: now + ADVENTURER_LIFETIME,
          }
        }))
      },

      initializeAdventurers: () => {
        const state = get()
        if (!state.guild.adventurers || state.guild.adventurers.length === 0) {
          state.refreshAdventurers()
        }
      },
      
      startExpedition: (expedition, adventurer, weapon, extendedAdventurer) => {
        const state = get()

        // Check if weapon is available
        if (state.isWeaponInExpedition(weapon.id)) return false

        // Check if adventurer is available
        if (state.guild.activeExpeditions.some(e => e.adventurerId === adventurer.id)) return false

        // Check resources
        const totalCost = expedition.cost.supplies + expedition.cost.deposit
        if (state.resources.gold < totalCost) return false

        const now = Date.now()
        const duration = expedition.duration * 1000 // Convert seconds to ms

        // Deduct costs
        state.addResource('gold', -totalCost)

        const newExpedition: ActiveExpedition = {
          id: generateId(),
          expeditionId: expedition.id,
          expeditionName: expedition.name,
          expeditionIcon: expedition.icon,
          adventurerId: adventurer.id,
          adventurerName: adventurer.name,
          adventurerData: adventurer, // Старый формат для совместимости
          adventurerExtended: extendedAdventurer, // Полные Extended данные
          weaponId: weapon.id,
          weaponName: weapon.name,
          weaponData: weapon as any, // Store copy of weapon data
          startedAt: now,
          endsAt: now + duration,
          deposit: expedition.cost.deposit,
          suppliesCost: expedition.cost.supplies,
        }

        set((state) => ({
          guild: {
            ...state.guild,
            activeExpeditions: [...state.guild.activeExpeditions, newExpedition],
            adventurers: state.guild.adventurers.filter(a => a.id !== adventurer.id),
          }
        }))

        return true
      },

      cancelExpedition: (expeditionId) => {
        const state = get()
        const expedition = state.guild.activeExpeditions.find(e => e.id === expeditionId)
        if (!expedition) return false

        // Return deposit (partial)
        const returnedGold = Math.floor(expedition.deposit * 0.5)
        state.addResource('gold', returnedGold)

        set((state) => ({
          guild: {
            ...state.guild,
            activeExpeditions: state.guild.activeExpeditions.filter(e => e.id !== expeditionId),
          }
        }))

        return true
      },

      completeExpedition: (expeditionId) => {
        const state = get()
        const expedition = state.guild.activeExpeditions.find(e => e.id === expeditionId)
        if (!expedition) return null

        const template = expeditionTemplates.find(t => t.id === expedition.expeditionId)
        if (!template) return null

        const weapon = state.weaponInventory.weapons.find(w => w.id === expedition.weaponId)

        // Используем утилиту для расчёта результата
        const outcome = calculateExpeditionOutcome({
          expedition,
          guildLevel: state.guild.level,
          weapon: weapon as WeaponForExpedition,
        })

        const result: ExpeditionResult = {
          success: outcome.success,
          commission: outcome.commission,
          warSoul: outcome.warSoul,
          bonusGold: 0,
          glory: outcome.glory,
          weaponWear: outcome.weaponWear,
          weaponLost: outcome.weaponLost,
          isCrit: outcome.isCrit,
        }

        // Обновление базы известных искателей
        if (outcome.newKnownAdventurers) {
          set({ knownAdventurers: outcome.newKnownAdventurers })
        } else if (expedition.adventurerExtended) {
          const updatedKnown = updateKnownAdventurersAfterMission(
            state.knownAdventurers,
            expedition.adventurerExtended,
            outcome,
            weapon?.type
          )
          set({ knownAdventurers: updatedKnown })
        }

        // Apply rewards
        if (outcome.success) {
          state.addResource('gold', outcome.commission)
          if (weapon) {
            state.addWarSoulToWeapon(weapon.id, outcome.warSoul, 5, 0.05)
          }
          state.addGlory(outcome.glory)
        } else {
          state.addGlory(1)
        }

        // Apply weapon wear if not lost
        if (weapon && !outcome.weaponLost) {
          const newDurability = Math.max(0, weapon.durability - outcome.weaponWear)
          set((s) => ({
            weaponInventory: {
              ...s.weaponInventory,
              weapons: s.weaponInventory.weapons.map(w =>
                w.id === weapon.id ? { ...w, durability: newDurability } : w
              ),
            }
          }))
        }

        // Create history entry and update stats
        const historyEntry = createHistoryEntry(expedition, outcome)
        const newStats = updateGuildStats(state.guild.stats, outcome)

        set((state) => ({
          guild: {
            ...state.guild,
            activeExpeditions: state.guild.activeExpeditions.filter(e => e.id !== expeditionId),
            history: [...state.guild.history, historyEntry],
            stats: newStats,
          }
        }))

        // Handle weapon loss - create recovery quest
        if (outcome.weaponLost && weapon) {
          const recoveryQuest = createRecoveryQuest(expedition, template, weapon as WeaponForExpedition)

          set((state) => ({
            guild: {
              ...state.guild,
              recoveryQuests: [...state.guild.recoveryQuests, recoveryQuest],
            }
          }))

          // Remove weapon from inventory
          set((s) => ({
            weaponInventory: {
              ...s.weaponInventory,
              weapons: s.weaponInventory.weapons.filter(w => w.id !== weapon.id),
            }
          }))
        }

        return result
      },
      
      startRecoveryQuest: (questId) => {
        const state = get()
        const quest = state.guild.recoveryQuests.find(q => q.id === questId)
        if (!quest || quest.status !== 'available') return false

        // Pay the recovery cost
        if (state.resources.gold < quest.cost) return false
        state.addResource('gold', -quest.cost)

        const now = Date.now()

        set((state) => ({
          guild: {
            ...state.guild,
            recoveryQuests: state.guild.recoveryQuests.map(q =>
              q.id === questId
                ? { ...q, status: 'active' as const, startedAt: now, endsAt: now + q.duration }
                : q
            ),
          }
        }))

        return true
      },

      completeRecoveryQuest: (questId) => {
        const state = get()
        const quest = state.guild.recoveryQuests.find(q => q.id === questId)
        if (!quest || quest.status !== 'active') return false

        // Return weapon to inventory
        set((s) => ({
          weaponInventory: {
            ...s.weaponInventory,
            weapons: [...s.weaponInventory.weapons, quest.lostWeaponData as any],
          }
        }))

        set((state) => ({
          guild: {
            ...state.guild,
            recoveryQuests: state.guild.recoveryQuests.map(q =>
              q.id === questId ? { ...q, status: 'completed' as const } : q
            ),
            stats: {
              ...state.guild.stats,
              weaponsRecovered: state.guild.stats.weaponsRecovered + 1,
            }
          }
        }))

        return true
      },
      
      declineRecoveryQuest: (questId) => {
        set((state) => ({
          guild: {
            ...state.guild,
            recoveryQuests: state.guild.recoveryQuests.filter(q => q.id !== questId),
          }
        }))
      },
      
      addGlory: (amount) => set((state) => {
        const newGlory = state.guild.glory + amount
        const newLevel = getGuildLevel(newGlory)
        
        return {
          guild: {
            ...state.guild,
            glory: newGlory,
            totalGlory: state.guild.totalGlory + amount,
            level: newLevel,
            stats: {
              ...state.guild.stats,
              totalGlory: (state.guild.stats?.totalGlory ?? 0) + amount,
            }
          }
        }
      }),
      
      getAdventurerById: (id) => {
        const state = get()
        return state.guild.adventurers.find(a => a.id === id) ||
               state.guild.activeExpeditions.find(e => e.adventurerId === id) as unknown as Adventurer
      },
      
      getActiveExpeditionById: (id) => get().guild.activeExpeditions.find(e => e.id === id),
      
      isWeaponInExpedition: (weaponId) => {
        const state = get()
        return state.guild.activeExpeditions.some(e => e.weaponId === weaponId)
      },
      
      // === KNOWN ADVENTURERS ===
      getKnownAdventurer: (adventurerId) => {
        return get().knownAdventurers.find(k => k.adventurerId === adventurerId)
      },
      
      getMetBadge: (adventurerId) => {
        const known = get().knownAdventurers.find(k => k.adventurerId === adventurerId)
        if (!known) return null
        
        const isAvailable = known.isAvailableForContract
        const text = getMetInfoText(known)
        const contractInfo = getContractAvailabilityText(known)
        
        return {
          isKnown: true,
          text: isAvailable ? contractInfo.text : text,
          className: isAvailable ? contractInfo.className : 'text-amber-400',
        }
      },
      
      calculateExpedition: (adventurer, expedition, weapon) => {
        return calculateExpeditionPreview(
          adventurer,
          expedition,
          weapon as WeaponForExpedition,
          get().guild.level
        )
      },
    }),
    {
      name: 'swordcraft-game-storage',
      partialize: (state) => ({
        resources: state.resources,
        player: state.player,
        statistics: state.statistics,
        workers: state.workers,
        maxWorkers: state.maxWorkers,
        buildings: state.buildings,
        weaponInventory: state.weaponInventory,
        unlockedRecipes: state.unlockedRecipes,
        recipeSources: state.recipeSources,
        orders: state.orders,
        activeOrderId: state.activeOrderId,
        tutorial: state.tutorial,
        unlockedEnchantments: state.unlockedEnchantments,
        guild: state.guild,
        knownAdventurers: state.knownAdventurers,
      }),
    }
  )
)

// ================================
// EXPORT HOOKS
// ================================

export const useFormattedResources = () => {
  const resources = useGameStore((state) => state.resources)
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return Math.floor(num).toString()
  }
  
  return {
    ...resources,
    formatted: {
      gold: formatNumber(resources.gold),
      soulEssence: formatNumber(resources.soulEssence),
      wood: formatNumber(resources.wood),
      stone: formatNumber(resources.stone),
      iron: formatNumber(resources.iron),
      coal: formatNumber(resources.coal),
      copper: formatNumber(resources.copper),
      tin: formatNumber(resources.tin),
      silver: formatNumber(resources.silver),
      goldOre: formatNumber(resources.goldOre),
      mithril: formatNumber(resources.mithril),
      ironIngot: formatNumber(resources.ironIngot),
      copperIngot: formatNumber(resources.copperIngot),
      tinIngot: formatNumber(resources.tinIngot),
      bronzeIngot: formatNumber(resources.bronzeIngot),
      steelIngot: formatNumber(resources.steelIngot),
      silverIngot: formatNumber(resources.silverIngot),
      goldIngot: formatNumber(resources.goldIngot),
      mithrilIngot: formatNumber(resources.mithrilIngot),
      planks: formatNumber(resources.planks),
      stoneBlocks: formatNumber(resources.stoneBlocks),
    },
  }
}

export const useWorkerHireCost = (workerClass: WorkerClass): number => {
  const workers = useGameStore((state) => state.workers)
  const classData = workerClassData[workerClass]
  const sameClassCount = workers.filter(w => w.class === workerClass).length
  return Math.floor(classData.baseCost * (1 + sameClassCount * 0.5))
}

// Re-export types and data from slices
export { workerClassData }
export type { Resources, ResourceKey, CraftingCost } from './slices/resources-slice'
export type { Player, GameStatistics } from './slices/player-slice'
export type { Worker, WorkerClass, WorkerStats, ProductionBuilding } from './slices/workers-slice'
export type { CraftedWeapon, ActiveCraft, ActiveRefining, WeaponInventory, UnlockedRecipes, RecipeSource } from './slices/craft-slice'
