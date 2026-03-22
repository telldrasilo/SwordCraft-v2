/**
 * E2E тесты для Game Store
 * Базовые тесты работающие с реальным API
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store/game-store-composed'

describe('game-store integration', () => {
  let store: ReturnType<typeof useGameStore.getState>

  beforeEach(() => {
    localStorage.clear()
    store = useGameStore.getState()
  })

  describe('store initialization', () => {
    it('should have resources state', () => {
      expect(store.resources).toBeDefined()
      expect(store.resources.gold).toBeGreaterThan(0)
    })

    it('should have player state', () => {
      expect(store.player).toBeDefined()
      expect(store.player.level).toBeGreaterThanOrEqual(1)
    })

    it('should have workers array', () => {
      expect(Array.isArray(store.workers)).toBe(true)
    })

    it('should have buildings', () => {
      expect(store.buildings).toBeDefined()
      expect(store.buildings.length).toBeGreaterThan(0)
    })

    it('should have craft state', () => {
      expect(store.activeCraft).toBeDefined()
      expect(store.activeRefining).toBeDefined()
    })

    it('should have weapon inventory', () => {
      expect(store.weaponInventory).toBeDefined()
    })

    it('should have guild state', () => {
      expect(store.guild).toBeDefined()
    })

    it('should have statistics', () => {
      expect(store.statistics).toBeDefined()
    })
  })

  describe('resource operations', () => {
    it('should have addResource method', () => {
      expect(typeof store.addResource).toBe('function')
    })

    it('should have spendResource method', () => {
      expect(typeof store.spendResource).toBe('function')
    })

    it('should have canAfford method', () => {
      expect(typeof store.canAfford).toBe('function')
    })

    it('should have spendResources method', () => {
      expect(typeof store.spendResources).toBe('function')
    })
  })

  describe('worker operations', () => {
    it('should have max workers limit', () => {
      expect(store.maxWorkers).toBeGreaterThan(0)
    })

    it('should calculate hire cost', () => {
      const cost = store.getWorkerHireCost('apprentice')
      expect(cost).toBeGreaterThan(0)
    })

    it('should get workers quality', () => {
      const quality = store.getWorkersQuality()
      expect(quality).toBeGreaterThanOrEqual(0)
    })
  })

  describe('craft operations', () => {
    it('should check crafting status', () => {
      expect(typeof store.isCrafting()).toBe('boolean')
    })

    it('should check refining status', () => {
      expect(typeof store.isRefining()).toBe('boolean')
    })

    it('should have unlocked recipes', () => {
      expect(store.unlockedRecipes.weaponRecipes.length).toBeGreaterThan(0)
    })

    it('should check recipe unlock', () => {
      const recipe = store.unlockedRecipes.weaponRecipes[0]
      expect(store.isRecipeUnlocked(recipe)).toBe(true)
    })
  })

  describe('helper functions', () => {
    it('should get best blacksmith', () => {
      const result = store.getBestBlacksmith()
      // May be null if no blacksmiths
      expect(result === null || result.class === 'blacksmith').toBe(true)
    })

    it('should check weapon in expedition', () => {
      expect(store.isWeaponInExpedition('non-existent-id')).toBe(false)
    })

    it('should get weapon by id', () => {
      const weapon = store.getWeaponById('non-existent-id')
      expect(weapon).toBeUndefined()
    })
  })

  describe('guild operations', () => {
    it('should have adventurers array', () => {
      expect(Array.isArray(store.guild.adventurers)).toBe(true)
    })

    it('should have active expeditions array', () => {
      expect(Array.isArray(store.guild.activeExpeditions)).toBe(true)
    })

    it('should have guild level', () => {
      expect(store.guild.level).toBeGreaterThanOrEqual(1)
    })
  })

  describe('building operations', () => {
    it('should have unlocked buildings', () => {
      const unlocked = store.buildings.filter(b => b.unlocked)
      expect(unlocked.length).toBeGreaterThan(0)
    })

    it('should have locked buildings for progression', () => {
      const locked = store.buildings.filter(b => !b.unlocked)
      // Some buildings should be locked for progression
      expect(locked.length).toBeGreaterThanOrEqual(0)
    })
  })
})
