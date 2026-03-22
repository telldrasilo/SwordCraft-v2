/**
 * Workers Slice
 * Управление рабочими и производственными зданиями
 */

import { StateCreator } from 'zustand'
import { ResourceKey } from './resources-slice'

// ================================
// ТИПЫ
// ================================

/** Классы рабочих */
export type WorkerClass = 
  | 'apprentice' 
  | 'blacksmith' 
  | 'miner' 
  | 'merchant' 
  | 'enchanter' 
  | 'loggers' 
  | 'mason' 
  | 'smelter'

/** Характеристики рабочего */
export interface WorkerStats {
  speed: number
  quality: number
  stamina_max: number
  intelligence: number
  loyalty: number
}

/** Рабочий */
export interface Worker {
  id: string
  name: string
  class: WorkerClass
  level: number
  experience: number
  stamina: number
  stats: WorkerStats
  assignment: string
  hiredAt: number
  hireCost: number
}

/** Производственное здание */
export interface ProductionBuilding {
  id: string
  name: string
  type: string
  level: number
  produces: string
  baseProduction: number
  requiredWorkers: number
  staminaCost: number
  progress: number
  unlocked: boolean
}

/** Данные класса рабочего */
export interface WorkerClassData {
  name: string
  description: string
  baseCost: number
  baseStats: WorkerStats
}

/** Состояние рабочих и зданий */
export interface WorkersState {
  workers: Worker[]
  maxWorkers: number
  buildings: ProductionBuilding[]
}

/** Actions для рабочих */
export interface WorkersActions {
  // Найм и увольнение
  hireWorker: (workerClass: WorkerClass) => boolean
  fireWorker: (workerId: string) => void
  
  // Назначение
  assignWorker: (workerId: string, assignment: string) => void
  
  // Стамина
  updateWorkerStamina: (workerId: string, delta: number) => void
  restAllWorkers: () => void
  
  // Опыт
  addWorkerExperience: (workerId: string, amount: number) => void
  
  // Здания
  updateBuildingProgress: (buildingId: string, efficiency: number) => void
  upgradeBuilding: (buildingId: string) => boolean
  unlockBuilding: (buildingId: string) => void
  
  // Утилиты
  getWorkersQuality: () => number
  getWorkersByAssignment: (assignment: string) => Worker[]
  getWorkerHireCost: (workerClass: WorkerClass) => number
}

/** Полный тип slice */
export type WorkersSlice = WorkersState & WorkersActions

// ================================
// ДАННЫЕ КЛАССОВ РАБОЧИХ
// ================================

export const workerClassData: Record<WorkerClass, WorkerClassData> = {
  apprentice: { 
    name: 'Ученик', 
    description: 'Начинающий работник', 
    baseCost: 50, 
    baseStats: { speed: 30, quality: 20, stamina_max: 80, intelligence: 25, loyalty: 50 } 
  },
  blacksmith: { 
    name: 'Кузнец', 
    description: 'Мастер ковки', 
    baseCost: 200, 
    baseStats: { speed: 50, quality: 70, stamina_max: 100, intelligence: 45, loyalty: 60 } 
  },
  miner: { 
    name: 'Шахтёр', 
    description: 'Добыча руды', 
    baseCost: 150, 
    baseStats: { speed: 60, quality: 30, stamina_max: 120, intelligence: 35, loyalty: 55 } 
  },
  merchant: { 
    name: 'Торговец', 
    description: 'Торговля', 
    baseCost: 300, 
    baseStats: { speed: 40, quality: 40, stamina_max: 80, intelligence: 80, loyalty: 40 } 
  },
  enchanter: { 
    name: 'Чародей', 
    description: 'Зачарования', 
    baseCost: 500, 
    baseStats: { speed: 30, quality: 50, stamina_max: 70, intelligence: 90, loyalty: 45 } 
  },
  loggers: { 
    name: 'Дровосек', 
    description: 'Заготовка дерева', 
    baseCost: 100, 
    baseStats: { speed: 70, quality: 25, stamina_max: 110, intelligence: 30, loyalty: 60 } 
  },
  mason: { 
    name: 'Каменщик', 
    description: 'Добыча камня', 
    baseCost: 120, 
    baseStats: { speed: 65, quality: 30, stamina_max: 115, intelligence: 35, loyalty: 58 } 
  },
  smelter: { 
    name: 'Плавильщик', 
    description: 'Обработка металлов', 
    baseCost: 180, 
    baseStats: { speed: 55, quality: 45, stamina_max: 100, intelligence: 50, loyalty: 55 } 
  },
}

// ================================
// НАЧАЛЬНЫЕ ЗДАНИЯ
// ================================

export const initialBuildings: ProductionBuilding[] = [
  { id: 'sawmill', name: 'Лесопилка', type: 'sawmill', level: 1, produces: 'wood', baseProduction: 0.8, requiredWorkers: 2, staminaCost: 1, progress: 0, unlocked: true },
  { id: 'quarry', name: 'Каменоломня', type: 'quarry', level: 1, produces: 'stone', baseProduction: 0.6, requiredWorkers: 2, staminaCost: 1.5, progress: 0, unlocked: true },
  { id: 'iron_mine', name: 'Железный рудник', type: 'iron_mine', level: 1, produces: 'iron', baseProduction: 0.4, requiredWorkers: 2, staminaCost: 2, progress: 0, unlocked: true },
  { id: 'coal_mine', name: 'Угольная шахта', type: 'coal_mine', level: 1, produces: 'coal', baseProduction: 0.35, requiredWorkers: 2, staminaCost: 2, progress: 0, unlocked: true },
  { id: 'copper_mine', name: 'Медная шахта', type: 'copper_mine', level: 1, produces: 'copper', baseProduction: 0.25, requiredWorkers: 3, staminaCost: 2, progress: 0, unlocked: false },
  { id: 'tin_mine', name: 'Оловянная шахта', type: 'tin_mine', level: 1, produces: 'tin', baseProduction: 0.25, requiredWorkers: 3, staminaCost: 2, progress: 0, unlocked: false },
  { id: 'silver_mine', name: 'Серебряный рудник', type: 'silver_mine', level: 1, produces: 'silver', baseProduction: 0.15, requiredWorkers: 4, staminaCost: 2.5, progress: 0, unlocked: false },
  { id: 'gold_mine', name: 'Золотой рудник', type: 'gold_mine', level: 1, produces: 'goldOre', baseProduction: 0.1, requiredWorkers: 5, staminaCost: 3, progress: 0, unlocked: false },
  { id: 'smelter', name: 'Плавильня', type: 'smelter', level: 1, produces: 'ironIngot', baseProduction: 0.2, requiredWorkers: 1, staminaCost: 1.5, progress: 0, unlocked: true },
  { id: 'workshop', name: 'Столярная мастерская', type: 'workshop', level: 1, produces: 'planks', baseProduction: 0.3, requiredWorkers: 1, staminaCost: 1, progress: 0, unlocked: true },
]

// ================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================

const generateId = (): string => Math.random().toString(36).substring(2, 9)

const workerNames = [
  'Грегор', 'Иван', 'Борис', 'Виктор', 'Алексей', 'Дмитрий', 
  'Николай', 'Мария', 'Анна', 'Елена', 'Пётр', 'Сергей', 
  'Андрей', 'Михаил', 'Артём', 'Максим'
]

const generateWorkerName = (): string => {
  return workerNames[Math.floor(Math.random() * workerNames.length)]
}

const MAX_WORKER_LEVEL = 50

const getExpForWorkerLevel = (level: number): number => {
  return 100 + level * 50
}

// ================================
// SLICE
// ================================

export const createWorkersSlice: StateCreator<
  WorkersSlice,
  [],
  [],
  WorkersSlice
> = (set, get) => ({
  // State
  workers: [],
  maxWorkers: 5,
  buildings: initialBuildings,

  // Actions - Найм и увольнение
  hireWorker: (workerClass) => {
    const state = get()
    const classData = workerClassData[workerClass]
    
    if (state.workers.length >= state.maxWorkers) return false
    
    const cost = state.getWorkerHireCost(workerClass)
    
    // Проверка золота будет делаться на уровне game-store
    // Здесь только создаём рабочего
    
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
      workers: [...state.workers, newWorker]
    }))
    
    return true
  },

  fireWorker: (workerId) => {
    const state = get()
    const worker = state.workers.find(w => w.id === workerId)
    if (!worker) return
    
    // Возврат золота будет делаться на уровне game-store
    set((state) => ({
      workers: state.workers.filter(w => w.id !== workerId)
    }))
  },

  // Actions - Назначение
  assignWorker: (workerId, assignment) => set((state) => ({
    workers: state.workers.map(w => 
      w.id === workerId ? { ...w, assignment } : w
    )
  })),

  // Actions - Стамина
  updateWorkerStamina: (workerId, delta) => set((state) => ({
    workers: state.workers.map(w => {
      if (w.id !== workerId) return w
      const newStamina = Math.max(0, Math.min(w.stats.stamina_max, w.stamina + delta))
      return { ...w, stamina: newStamina }
    })
  })),

  restAllWorkers: () => set((state) => ({
    workers: state.workers.map(w => ({
      ...w,
      stamina: w.stats.stamina_max,
      assignment: 'rest'
    }))
  })),

  // Actions - Опыт
  addWorkerExperience: (workerId, amount) => set((state) => {
    const worker = state.workers.find(w => w.id === workerId)
    if (!worker) return state
    
    // Интеллект влияет на скорость прокачки
    const expMultiplier = 1 + (worker.stats.intelligence - 25) / 100
    const actualExp = amount * expMultiplier
    
    const newExperience = worker.experience + actualExp
    const expToLevel = getExpForWorkerLevel(worker.level)
    
    if (newExperience >= expToLevel && worker.level < MAX_WORKER_LEVEL) {
      const newLevel = worker.level + 1
      const leftoverExp = newExperience - expToLevel
      
      // Улучшение характеристик при повышении уровня (+2-5% к каждой)
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

  // Actions - Здания
  updateBuildingProgress: (buildingId, efficiency) => set((state) => ({
    buildings: state.buildings.map(b => 
      b.id === buildingId ? { ...b, progress: efficiency * 100 } : b
    )
  })),

  upgradeBuilding: (buildingId) => {
    const state = get()
    const building = state.buildings.find(b => b.id === buildingId)
    if (!building) return false
    
    // Проверка золота будет делаться на уровне game-store
    
    set((state) => ({
      buildings: state.buildings.map(b => b.id === buildingId ? {
        ...b,
        level: b.level + 1,
        baseProduction: b.baseProduction * 1.25,
        requiredWorkers: Math.ceil(b.requiredWorkers * 1.1)
      } : b)
    }))
    
    return true
  },

  unlockBuilding: (buildingId) => set((state) => ({
    buildings: state.buildings.map(b => 
      b.id === buildingId ? { ...b, unlocked: true } : b
    )
  })),

  // Actions - Утилиты
  getWorkersQuality: () => {
    const state = get()
    const blacksmiths = state.workers.filter(w => w.class === 'blacksmith' && w.assignment === 'forge')
    if (blacksmiths.length === 0) return 20
    return blacksmiths.reduce((sum, w) => sum + w.stats.quality, 0) / blacksmiths.length
  },

  getWorkersByAssignment: (assignment) => {
    return get().workers.filter(w => w.assignment === assignment)
  },

  getWorkerHireCost: (workerClass) => {
    const state = get()
    const baseCost = workerClassData[workerClass].baseCost
    const count = state.workers.filter(w => w.class === workerClass).length
    const costMultiplier = 1 + count * 0.5
    return Math.floor(baseCost * costMultiplier)
  },
})
