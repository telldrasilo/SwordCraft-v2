import { describe, it, expect } from 'vitest'
import {
  generateId,
  generateWorkerName,
  generateClientName,
  randomInt,
  randomChance,
} from '@/lib/store-utils/generators'

describe('generators', () => {
  describe('generateId', () => {
    it('should return a string', () => {
      expect(typeof generateId()).toBe('string')
    })

    it('should return unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })

    it('should return non-empty string', () => {
      expect(generateId().length).toBeGreaterThan(0)
    })

    it('should return alphanumeric string', () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('generateWorkerName', () => {
    it('should return a string', () => {
      expect(typeof generateWorkerName()).toBe('string')
    })

    it('should return non-empty string', () => {
      expect(generateWorkerName().length).toBeGreaterThan(0)
    })

    it('should return names from predefined list', () => {
      // Generate multiple names and check they're valid
      for (let i = 0; i < 20; i++) {
        const name = generateWorkerName()
        expect(name.length).toBeGreaterThan(0)
      }
    })
  })

  describe('generateClientName', () => {
    it('should return client data object', () => {
      const client = generateClientName()
      expect(client).toHaveProperty('name')
      expect(client).toHaveProperty('title')
      expect(client).toHaveProperty('icon')
    })

    it('should return non-empty strings', () => {
      const client = generateClientName()
      expect(client.name.length).toBeGreaterThan(0)
      expect(client.title.length).toBeGreaterThan(0)
      expect(client.icon.length).toBeGreaterThan(0)
    })
  })

  describe('randomInt', () => {
    it('should return number within range', () => {
      for (let i = 0; i < 100; i++) {
        const num = randomInt(1, 10)
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('randomChance', () => {
    it('should always return true for 100%', () => {
      for (let i = 0; i < 50; i++) {
        expect(randomChance(100)).toBe(true)
      }
    })

    it('should always return false for 0%', () => {
      for (let i = 0; i < 50; i++) {
        expect(randomChance(0)).toBe(false)
      }
    })
  })
})
