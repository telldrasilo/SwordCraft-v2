/**
 * Enchantments Slice
 * Управление зачарованиями и жертвоприношениями оружия
 */

import { StateCreator } from 'zustand'

// ================================
// ТИПЫ
// ================================

/** Зачарование на оружии */
export interface WeaponEnchantment {
  id: string
  enchantmentId: string
  appliedAt: number
}

/** Результат жертвоприношения */
export interface SacrificeResult {
  soulEssence: number
  bonusGold: number
}

/** Состояние зачарований */
export interface EnchantmentsState {
  unlockedEnchantments: string[]
}

/** Actions для зачарований */
export interface EnchantmentsActions {
  sacrificeWeapon: (weaponId: string, weapon: {
    quality: number
    tier: number
    warSoul: number
    epicMultiplier: number
    sellPrice: number
  }) => SacrificeResult | null
  unlockEnchantment: (enchantmentId: string, cost: { soulEssence: number; gold: number }) => boolean
  isEnchantmentUnlocked: (enchantmentId: string) => boolean
  enchantWeapon: (weaponId: string, enchantmentId: string) => boolean
  removeEnchantment: (weaponId: string, enchantmentId: string) => boolean
  addSoulEssence: (amount: number) => void
  spendGold: (amount: number) => boolean
  spendSoulEssence: (amount: number) => boolean
  removeWeapon: (weaponId: string) => boolean
  addEnchantmentToWeapon: (weaponId: string, enchantment: WeaponEnchantment) => boolean
  removeEnchantmentFromWeapon: (weaponId: string, enchantmentId: string) => boolean
  addStatisticsValue: (key: string, value: number) => void
  getPlayerLevel: () => number
  getPlayerFame: () => number
}

/** Полный тип slice */
export type EnchantmentsSlice = EnchantmentsState & EnchantmentsActions

// ================================
// НАЧАЛЬНОЕ СОСТОЯНИЕ
// ================================

export const initialEnchantmentsState: EnchantmentsState = {
  unlockedEnchantments: [], // Начальные разблокированные зачарования
}

// ================================
// КОНСТАНТЫ
// ================================

export const MAX_ENCHANTMENTS_PER_WEAPON = 3

// ================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================

const generateId = (): string => Math.random().toString(36).substring(2, 9)

/**
 * Расчёт ценности жертвоприношения
 */
export function calculateSacrificeValue(
  quality: number,
  tier: number,
  warSoul: number,
  epicMultiplier: number
): SacrificeResult {
  // Базовая эссенция от качества
  let soulEssence = Math.floor(quality / 10)
  
  // Бонус от тира
  soulEssence += tier * 2
  
  // Бонус от Души Войны
  soulEssence += Math.floor(warSoul / 5)
  
  // Бонус от эпичности
  soulEssence = Math.floor(soulEssence * epicMultiplier)
  
  // Бонусное золото
  const bonusGold = Math.floor(quality * tier * epicMultiplier)
  
  return {
    soulEssence: Math.max(1, soulEssence),
    bonusGold,
  }
}

/**
 * Проверка доступности зачарования
 */
export function canAffordEnchantment(
  cost: { soulEssence: number; gold: number },
  playerSoulEssence: number,
  playerGold: number,
  playerLevel: number,
  requiredLevel: number,
  playerFame: number,
  requiredFame: number
): boolean {
  if (playerSoulEssence < cost.soulEssence) return false
  if (playerGold < cost.gold) return false
  if (playerLevel < requiredLevel) return false
  if (playerFame < requiredFame) return false
  return true
}

// ================================
// SLICE
// ================================

export const createEnchantmentsSlice: StateCreator<
  EnchantmentsSlice,
  [],
  [],
  EnchantmentsSlice
> = (set, get) => ({
  // State
  unlockedEnchantments: [],

  // Actions
  sacrificeWeapon: (weaponId, weapon) => {
    const state = get()
    
    // Рассчитываем награду
    const result = calculateSacrificeValue(
      weapon.quality,
      weapon.tier,
      weapon.warSoul,
      weapon.epicMultiplier
    )

    // Добавляем эссенцию и золото
    state.addSoulEssence(result.soulEssence)
    
    // Удаляем оружие
    if (!state.removeWeapon(weaponId)) {
      return null
    }

    // Обновляем статистику
    state.addStatisticsValue('weaponsSacrificed', 1)

    return result
  },

  unlockEnchantment: (enchantmentId, cost) => {
    const state = get()
    
    if (state.unlockedEnchantments.includes(enchantmentId)) return false
    
    // Проверяем ресурсы
    if (!state.spendSoulEssence(cost.soulEssence)) return false
    if (!state.spendGold(cost.gold)) {
      // Возвращаем эссенцию если не хватило золота
      state.addSoulEssence(cost.soulEssence)
      return false
    }

    set((state) => ({
      unlockedEnchantments: [...state.unlockedEnchantments, enchantmentId]
    }))

    return true
  },

  isEnchantmentUnlocked: (enchantmentId) => {
    return get().unlockedEnchantments.includes(enchantmentId)
  },

  enchantWeapon: (weaponId, enchantmentId) => {
    const state = get()
    
    if (!state.unlockedEnchantments.includes(enchantmentId)) return false

    const enchantment: WeaponEnchantment = {
      id: generateId(),
      enchantmentId,
      appliedAt: Date.now(),
    }

    if (!state.addEnchantmentToWeapon(weaponId, enchantment)) {
      return false
    }

    state.addStatisticsValue('enchantmentsApplied', 1)
    return true
  },

  removeEnchantment: (weaponId, enchantmentId) => {
    const state = get()
    return state.removeEnchantmentFromWeapon(weaponId, enchantmentId)
  },

  // Заглушки для методов, делегируемых в основной store
  addSoulEssence: () => {},
  spendGold: () => false,
  spendSoulEssence: () => false,
  removeWeapon: () => false,
  addEnchantmentToWeapon: () => false,
  removeEnchantmentFromWeapon: () => false,
  addStatisticsValue: () => {},
  getPlayerLevel: () => 1,
  getPlayerFame: () => 0,
})
