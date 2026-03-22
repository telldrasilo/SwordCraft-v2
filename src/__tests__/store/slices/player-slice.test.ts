/**
 * Integration тесты для Player Slice
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { createPlayerSlice, PlayerSlice, initialPlayer, initialStatistics } from '@/store/slices/player-slice'

// Создаём тестовый store только с player slice
const createTestStore = () => create<PlayerSlice>()((...args) => ({
  ...createPlayerSlice(...args),
}))

describe('player-slice', () => {
  let store: ReturnType<typeof createTestStore>['getState']

  beforeEach(() => {
    store = createTestStore().getState
  })

  describe('initial state', () => {
    it('should have correct initial player data', () => {
      expect(store().player.name).toBe('Кузнец')
      expect(store().player.level).toBe(1)
      expect(store().player.experience).toBe(0)
      expect(store().player.fame).toBe(0)
      expect(store().player.title).toBe('Новичок')
    })

    it('should have correct initial statistics', () => {
      expect(store().statistics.totalCrafts).toBe(0)
      expect(store().statistics.totalRefines).toBe(0)
      expect(store().statistics.totalGoldEarned).toBe(0)
      expect(store().statistics.totalWorkersHired).toBe(0)
    })
  })

  describe('setPlayerName', () => {
    it('should update player name', () => {
      store().setPlayerName('Мастер Кузнец')
      expect(store().player.name).toBe('Мастер Кузнец')
    })
  })

  describe('addExperience', () => {
    it('should add experience without level up', () => {
      store().addExperience(50)
      expect(store().player.experience).toBe(50)
      expect(store().player.level).toBe(1)
    })

    it('should level up when experience threshold reached', () => {
      store().addExperience(100)
      expect(store().player.level).toBe(2)
      expect(store().player.experience).toBe(0)
    })

    it('should add fame on level up', () => {
      store().addExperience(100)
      expect(store().player.fame).toBe(10)
    })

    it('should update title when reaching level 5', () => {
      // Level 5 gives "Ученик" title according to PLAYER_TITLES
      store().addExperience(100 + 150 + 225 + 337 + 505) // Enough for level 5
      expect(store().player.level).toBeGreaterThanOrEqual(5)
      expect(store().player.title).toBe('Ученик')
    })

    it('should handle multiple level ups', () => {
      // 100 + 150 = 250 exp for 2 levels
      store().addExperience(250)
      expect(store().player.level).toBe(3)
    })
  })

  describe('addFame', () => {
    it('should add fame to player', () => {
      store().addFame(50)
      expect(store().player.fame).toBe(50)
    })

    it('should accumulate fame', () => {
      store().addFame(30)
      store().addFame(20)
      expect(store().player.fame).toBe(50)
    })
  })

  describe('updateStatistics', () => {
    it('should update single statistic', () => {
      store().updateStatistics({ totalCrafts: 5 })
      expect(store().statistics.totalCrafts).toBe(5)
    })

    it('should update multiple statistics', () => {
      store().updateStatistics({
        totalCrafts: 10,
        totalRefines: 5,
        totalGoldEarned: 1000,
      })
      expect(store().statistics.totalCrafts).toBe(10)
      expect(store().statistics.totalRefines).toBe(5)
      expect(store().statistics.totalGoldEarned).toBe(1000)
    })

    it('should preserve other statistics', () => {
      store().updateStatistics({ totalCrafts: 5 })
      store().updateStatistics({ totalRefines: 3 })
      expect(store().statistics.totalCrafts).toBe(5)
      expect(store().statistics.totalRefines).toBe(3)
    })
  })

  describe('getTitleByLevel', () => {
    it('should return correct titles for levels', () => {
      expect(store().getTitleByLevel(1)).toBe('Новичок')
      expect(store().getTitleByLevel(5)).toBe('Ученик')
      expect(store().getTitleByLevel(10)).toBe('Подмастерье')
      expect(store().getTitleByLevel(20)).toBe('Опытный кузнец')
    })
  })

  describe('getExperienceForLevel', () => {
    it('should return experience required for level', () => {
      expect(store().getExperienceForLevel(1)).toBe(100)
      expect(store().getExperienceForLevel(2)).toBe(150)
    })
  })
})
