/**
 * Player Slice
 * Управление данными игрока: уровень, опыт, слава, титул
 */

import { StateCreator } from 'zustand'

// ================================
// ТИПЫ
// ================================

/** Данные игрока */
export interface Player {
  name: string
  level: number
  experience: number
  experienceToNextLevel: number
  fame: number
  title: string
}

/** Статистика игры */
export interface GameStatistics {
  totalCrafts: number
  totalRefines: number
  totalGoldEarned: number
  totalWorkersHired: number
  playTime: number
  weaponsSold: number
  recipesUnlocked: number
  ordersCompleted: number
  weaponsSacrificed: number
  enchantmentsApplied: number
}

/** Состояние игрока */
export interface PlayerState {
  player: Player
  statistics: GameStatistics
}

/** Actions для игрока */
export interface PlayerActions {
  setPlayerName: (name: string) => void
  addExperience: (amount: number) => void
  addFame: (amount: number) => void
  updateStatistics: (updates: Partial<GameStatistics>) => void
  getTitleByLevel: (level: number) => string
  getExperienceForLevel: (level: number) => number
}

/** Полный тип slice */
export type PlayerSlice = PlayerState & PlayerActions

// ================================
// НАЧАЛЬНОЕ СОСТОЯНИЕ
// ================================

export const initialPlayer: Player = {
  name: 'Кузнец',
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  fame: 0,
  title: 'Новичок',
}

export const initialStatistics: GameStatistics = {
  totalCrafts: 0,
  totalRefines: 0,
  totalGoldEarned: 0,
  totalWorkersHired: 0,
  playTime: 0,
  weaponsSold: 0,
  recipesUnlocked: 6,
  ordersCompleted: 0,
  weaponsSacrificed: 0,
  enchantmentsApplied: 0,
}

// Титулы по уровням
const PLAYER_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 50, title: 'Легендарный мастер' },
  { minLevel: 40, title: 'Великий мастер' },
  { minLevel: 30, title: 'Мастер-кузнец' },
  { minLevel: 20, title: 'Опытный кузнец' },
  { minLevel: 10, title: 'Подмастерье' },
  { minLevel: 5, title: 'Ученик' },
  { minLevel: 1, title: 'Новичок' },
]

// ================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================

function getTitleByLevelInternal(level: number): string {
  for (const { minLevel, title } of PLAYER_TITLES) {
    if (level >= minLevel) return title
  }
  return 'Новичок'
}

function getExperienceForLevelInternal(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

// ================================
// SLICE
// ================================

export const createPlayerSlice: StateCreator<
  PlayerSlice,
  [],
  [],
  PlayerSlice
> = (set, get) => ({
  // State
  player: initialPlayer,
  statistics: initialStatistics,

  // Actions
  setPlayerName: (name) => set((state) => ({
    player: { ...state.player, name }
  })),

  addExperience: (amount) => set((state) => {
    let newExp = state.player.experience + amount
    let newLevel = state.player.level
    let expToNext = state.player.experienceToNextLevel
    let newFame = state.player.fame

    // Обработка повышения уровня
    while (newExp >= expToNext) {
      newExp -= expToNext
      newLevel++
      expToNext = Math.floor(expToNext * 1.5)
      newFame += 10 // Бонус славы за уровень
    }

    const newTitle = getTitleByLevelInternal(newLevel)

    return {
      player: {
        ...state.player,
        experience: newExp,
        level: newLevel,
        experienceToNextLevel: expToNext,
        fame: newFame,
        title: newTitle,
      }
    }
  }),

  addFame: (amount) => set((state) => ({
    player: {
      ...state.player,
      fame: state.player.fame + amount
    }
  })),

  updateStatistics: (updates) => set((state) => ({
    statistics: {
      ...state.statistics,
      ...updates
    }
  })),

  getTitleByLevel: (level) => getTitleByLevelInternal(level),

  getExperienceForLevel: (level) => getExperienceForLevelInternal(level),
})
