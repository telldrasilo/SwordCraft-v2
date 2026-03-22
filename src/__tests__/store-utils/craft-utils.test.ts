import { describe, it, expect } from 'vitest'
import {
  getQualityGrade,
  calculateCraftQuality,
  calculateAttack,
  calculateSellPrice,
} from '@/lib/store-utils/craft-utils'

describe('craft-utils', () => {
  describe('getQualityGrade', () => {
    it('should return "poor" for quality 0-25', () => {
      expect(getQualityGrade(0)).toBe('poor')
      expect(getQualityGrade(10)).toBe('poor')
      expect(getQualityGrade(25)).toBe('poor')
    })

    it('should return "normal" for quality 26-50', () => {
      expect(getQualityGrade(26)).toBe('normal')
      expect(getQualityGrade(40)).toBe('normal')
      expect(getQualityGrade(50)).toBe('normal')
    })

    it('should return "good" for quality 51-70', () => {
      expect(getQualityGrade(51)).toBe('good')
      expect(getQualityGrade(60)).toBe('good')
      expect(getQualityGrade(70)).toBe('good')
    })

    it('should return "excellent" for quality 71-85', () => {
      expect(getQualityGrade(71)).toBe('excellent')
      expect(getQualityGrade(80)).toBe('excellent')
      expect(getQualityGrade(85)).toBe('excellent')
    })

    it('should return "masterwork" for quality 86-95', () => {
      expect(getQualityGrade(86)).toBe('masterwork')
      expect(getQualityGrade(90)).toBe('masterwork')
      expect(getQualityGrade(95)).toBe('masterwork')
    })

    it('should return "legendary" for quality 96-100', () => {
      expect(getQualityGrade(96)).toBe('legendary')
      expect(getQualityGrade(99)).toBe('legendary')
      expect(getQualityGrade(100)).toBe('legendary')
    })
  })

  describe('calculateCraftQuality', () => {
    it('should return quality between 0 and 100', () => {
      const quality = calculateCraftQuality(50, 5, 1)
      expect(quality).toBeGreaterThanOrEqual(0)
      expect(quality).toBeLessThanOrEqual(100)
    })

    it('should increase quality with higher workers quality', () => {
      const lowQuality = calculateCraftQuality(20, 5, 1)
      const highQuality = calculateCraftQuality(80, 5, 1)
      expect(highQuality).toBeGreaterThan(lowQuality)
    })

    it('should increase quality with higher player level', () => {
      const lowLevel = calculateCraftQuality(50, 1, 1)
      const highLevel = calculateCraftQuality(50, 20, 1)
      expect(highLevel).toBeGreaterThan(lowLevel)
    })

    it('should decrease quality with higher tier', () => {
      const tier1 = calculateCraftQuality(50, 5, 1)
      const tier5 = calculateCraftQuality(50, 5, 5)
      expect(tier1).toBeGreaterThan(tier5)
    })
  })

  describe('calculateAttack', () => {
    it('should return positive attack value', () => {
      const attack = calculateAttack('sword', 1, 'iron', 50)
      expect(attack).toBeGreaterThan(0)
    })

    it('should increase attack with higher quality', () => {
      const lowQuality = calculateAttack('sword', 1, 'iron', 30)
      const highQuality = calculateAttack('sword', 1, 'iron', 90)
      expect(highQuality).toBeGreaterThan(lowQuality)
    })

    it('should increase attack with higher tier', () => {
      const tier1 = calculateAttack('sword', 1, 'iron', 50)
      const tier5 = calculateAttack('sword', 5, 'mithril', 50)
      expect(tier5).toBeGreaterThan(tier1)
    })

    it('should have different attack for different weapon types', () => {
      const sword = calculateAttack('sword', 1, 'iron', 50)
      const dagger = calculateAttack('dagger', 1, 'iron', 50)
      const hammer = calculateAttack('hammer', 1, 'iron', 50)
      // Different weapons should have different base attacks
      expect(sword).not.toEqual(dagger)
    })
  })

  describe('calculateSellPrice', () => {
    it('should return positive sell price', () => {
      const price = calculateSellPrice(100, 50, 1)
      expect(price).toBeGreaterThan(0)
    })

    it('should increase price with higher quality', () => {
      const lowQuality = calculateSellPrice(100, 30, 1)
      const highQuality = calculateSellPrice(100, 90, 1)
      expect(highQuality).toBeGreaterThan(lowQuality)
    })

    it('should increase price with higher tier', () => {
      const tier1 = calculateSellPrice(100, 50, 1)
      const tier5 = calculateSellPrice(100, 50, 5)
      expect(tier5).toBeGreaterThan(tier1)
    })

    it('should increase price with higher base price', () => {
      const cheap = calculateSellPrice(50, 50, 1)
      const expensive = calculateSellPrice(200, 50, 1)
      expect(expensive).toBeGreaterThan(cheap)
    })
  })
})
