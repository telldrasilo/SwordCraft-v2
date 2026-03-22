/**
 * Integration тесты для Resources Slice
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import {
  createResourcesSlice,
  ResourcesSlice,
  initialResources,
  ResourceKey,
  CraftingCost,
} from '@/store/slices/resources-slice'

// Создаём тестовый store только с resources slice
const createTestStore = () => create<ResourcesSlice>()((...args) => ({
  ...createResourcesSlice(...args),
}))

describe('resources-slice', () => {
  let store: ReturnType<typeof createTestStore>['getState']

  beforeEach(() => {
    store = createTestStore().getState
  })

  describe('initial state', () => {
    it('should have correct initial resources', () => {
      expect(store().resources.gold).toBe(200)
      expect(store().resources.soulEssence).toBe(0)
      expect(store().resources.iron).toBe(30)
      expect(store().resources.coal).toBe(25)
      expect(store().resources.wood).toBe(50)
      expect(store().resources.stone).toBe(30)
    })

    it('should have initial processed materials', () => {
      expect(store().resources.ironIngot).toBe(10)
      expect(store().resources.planks).toBe(15)
    })
  })

  describe('addResource', () => {
    it('should add resources', () => {
      store().addResource('gold', 100)
      expect(store().resources.gold).toBe(300)
    })

    it('should accumulate resources', () => {
      store().addResource('iron', 10)
      store().addResource('iron', 20)
      expect(store().resources.iron).toBe(60) // 30 + 10 + 20
    })

    it('should handle zero amount', () => {
      const initialGold = store().resources.gold
      store().addResource('gold', 0)
      expect(store().resources.gold).toBe(initialGold)
    })
  })

  describe('spendResource', () => {
    it('should spend resources when available', () => {
      const result = store().spendResource('gold', 50)
      expect(result).toBe(true)
      expect(store().resources.gold).toBe(150)
    })

    it('should fail when not enough resources', () => {
      const result = store().spendResource('gold', 500)
      expect(result).toBe(false)
      expect(store().resources.gold).toBe(200)
    })

    it('should not allow negative resources', () => {
      store().spendResource('iron', 100)
      expect(store().resources.iron).toBe(30) // unchanged
    })
  })

  describe('canAfford', () => {
    it('should return true when can afford', () => {
      const cost: CraftingCost = { gold: 100, iron: 20 }
      expect(store().canAfford(cost)).toBe(true)
    })

    it('should return false when cannot afford', () => {
      const cost: CraftingCost = { gold: 500 }
      expect(store().canAfford(cost)).toBe(false)
    })

    it('should handle partial costs', () => {
      const cost: CraftingCost = { gold: 100 } // only gold, no other resources
      expect(store().canAfford(cost)).toBe(true)
    })

    it('should check all resources in cost', () => {
      const cost: CraftingCost = { gold: 100, iron: 100, coal: 100 }
      expect(store().canAfford(cost)).toBe(false) // not enough coal
    })
  })

  describe('spendResources', () => {
    it('should spend multiple resources', () => {
      const cost: CraftingCost = { gold: 50, iron: 10 }
      const result = store().spendResources(cost)
      expect(result).toBe(true)
      expect(store().resources.gold).toBe(150)
      expect(store().resources.iron).toBe(20)
    })

    it('should fail if any resource insufficient', () => {
      const cost: CraftingCost = { gold: 50, mithril: 10 } // no mithril
      const result = store().spendResources(cost)
      expect(result).toBe(false)
      expect(store().resources.gold).toBe(200) // unchanged
    })

    it('should be atomic - all or nothing', () => {
      const cost: CraftingCost = { gold: 50, iron: 100 } // not enough iron
      const result = store().spendResources(cost)
      expect(result).toBe(false)
      expect(store().resources.gold).toBe(200) // gold not spent
      expect(store().resources.iron).toBe(30) // iron not spent
    })
  })

  describe('sellResource', () => {
    it('should sell resource for gold', () => {
      const initialGold = store().resources.gold
      const result = store().sellResource('iron', 10)
      expect(result).toBe(true)
      expect(store().resources.iron).toBe(20)
      expect(store().resources.gold).toBeGreaterThan(initialGold)
    })

    it('should fail when not enough resource', () => {
      const result = store().sellResource('mithril', 10) // no mithril
      expect(result).toBe(false)
    })
  })

  describe('getResourceSellPrice', () => {
    it('should return price for known resources', () => {
      const ironPrice = store().getResourceSellPrice('iron')
      expect(ironPrice).toBeGreaterThan(0)
    })

    it('should return 1 for unknown resources', () => {
      const price = store().getResourceSellPrice('unknown' as ResourceKey)
      expect(price).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('should handle selling all of a resource', () => {
      const ironAmount = store().resources.iron
      store().sellResource('iron', ironAmount)
      expect(store().resources.iron).toBe(0)
    })

    it('should not go below zero', () => {
      store().addResource('gold', -1000)
      expect(store().resources.gold).toBe(0)
    })
  })
})
