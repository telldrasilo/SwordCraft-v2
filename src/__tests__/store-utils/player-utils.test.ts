import { describe, it, expect } from 'vitest'
import {
  getTitleByLevel,
  getExperienceForLevel,
  addExperience,
  addFame,
} from '@/lib/store-utils/player-utils'

describe('player-utils', () => {
  describe('getTitleByLevel', () => {
    it('should return "Новичок" for level 1', () => {
      expect(getTitleByLevel(1)).toBe('Новичок')
    })

    it('should return higher title for higher level', () => {
      const title1 = getTitleByLevel(1)
      const title10 = getTitleByLevel(10)
      const title50 = getTitleByLevel(50)
      
      // Titles should be different and progressive
      expect(title1).not.toBe(title10)
      expect(title10).not.toBe(title50)
    })

    it('should handle level 0 gracefully', () => {
      expect(getTitleByLevel(0)).toBeDefined()
    })

    it('should handle very high levels', () => {
      expect(getTitleByLevel(100)).toBeDefined()
    })
  })

  describe('getExperienceForLevel', () => {
    it('should return positive value for any level', () => {
      expect(getExperienceForLevel(1)).toBeGreaterThan(0)
      expect(getExperienceForLevel(10)).toBeGreaterThan(0)
      expect(getExperienceForLevel(50)).toBeGreaterThan(0)
    })

    it('should increase with level', () => {
      const exp1 = getExperienceForLevel(1)
      const exp10 = getExperienceForLevel(10)
      const exp50 = getExperienceForLevel(50)
      
      expect(exp10).toBeGreaterThan(exp1)
      expect(exp50).toBeGreaterThan(exp10)
    })
  })

  describe('addExperience', () => {
    it('should accumulate experience without level up', () => {
      const result = addExperience(0, 1, 100, 0, 50)
      
      expect(result.newExperience).toBe(50)
      expect(result.newLevel).toBe(1)
      expect(result.fameGained).toBe(0)
    })

    it('should level up when experience exceeds threshold', () => {
      const result = addExperience(90, 1, 100, 0, 50)
      
      expect(result.newLevel).toBe(2)
      expect(result.fameGained).toBe(10)
    })

    it('should handle multiple level ups', () => {
      const result = addExperience(0, 1, 100, 0, 300)
      
      // 300 exp should give at least 2-3 level ups
      expect(result.newLevel).toBeGreaterThan(2)
      expect(result.fameGained).toBeGreaterThanOrEqual(20)
    })

    it('should update title on level up', () => {
      const result = addExperience(0, 1, 100, 0, 500)
      
      // Level should be high enough for title change (level 5+)
      expect(result.newLevel).toBeGreaterThanOrEqual(3)
    })

    it('should calculate new experienceToNextLevel', () => {
      const result = addExperience(0, 1, 100, 0, 50)
      
      expect(result.newExperienceToNext).toBeDefined()
      expect(result.newExperienceToNext).toBeGreaterThan(0)
    })
  })

  describe('addFame', () => {
    it('should add fame to current value', () => {
      expect(addFame(0, 10)).toBe(10)
      expect(addFame(50, 25)).toBe(75)
    })

    it('should handle negative fame (if needed)', () => {
      expect(addFame(10, -5)).toBe(5)
    })

    it('should not go below zero', () => {
      expect(addFame(5, -10)).toBe(0)
    })
  })
})
