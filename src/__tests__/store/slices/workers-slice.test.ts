/**
 * Integration тесты для Workers Slice
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import {
  createWorkersSlice,
  WorkersSlice,
  WorkerClass,
  initialBuildings,
  workerClassData,
} from '@/store/slices/workers-slice'

// Создаём тестовый store только с workers slice
const createTestStore = () => create<WorkersSlice>()((...args) => ({
  ...createWorkersSlice(...args),
}))

describe('workers-slice', () => {
  let store: ReturnType<typeof createTestStore>['getState']

  beforeEach(() => {
    store = createTestStore().getState
  })

  describe('initial state', () => {
    it('should start with no workers', () => {
      expect(store().workers).toHaveLength(0)
    })

    it('should have max workers limit', () => {
      expect(store().maxWorkers).toBe(5)
    })

    it('should have initial buildings', () => {
      expect(store().buildings.length).toBeGreaterThan(0)
    })

    it('should have unlocked and locked buildings', () => {
      const unlocked = store().buildings.filter(b => b.unlocked)
      const locked = store().buildings.filter(b => !b.unlocked)
      expect(unlocked.length).toBeGreaterThan(0)
      expect(locked.length).toBeGreaterThan(0)
    })
  })

  describe('hireWorker', () => {
    it('should hire a worker', () => {
      const result = store().hireWorker('apprentice')
      expect(result).toBe(true)
      expect(store().workers).toHaveLength(1)
    })

    it('should create worker with correct class', () => {
      store().hireWorker('blacksmith')
      const worker = store().workers[0]
      expect(worker.class).toBe('blacksmith')
    })

    it('should fail when max workers reached', () => {
      // Hire max workers
      for (let i = 0; i < store().maxWorkers; i++) {
        store().hireWorker('apprentice')
      }
      const result = store().hireWorker('apprentice')
      expect(result).toBe(false)
    })

    it('should generate unique IDs for workers', () => {
      store().hireWorker('apprentice')
      store().hireWorker('apprentice')
      const [w1, w2] = store().workers
      expect(w1.id).not.toBe(w2.id)
    })

    it('should set initial stamina to max', () => {
      store().hireWorker('blacksmith')
      const worker = store().workers[0]
      expect(worker.stamina).toBe(worker.stats.stamina_max)
    })

    it('should calculate increasing hire cost', () => {
      const cost1 = store().getWorkerHireCost('apprentice')
      store().hireWorker('apprentice')
      const cost2 = store().getWorkerHireCost('apprentice')
      expect(cost2).toBeGreaterThan(cost1)
    })
  })

  describe('fireWorker', () => {
    it('should remove worker', () => {
      store().hireWorker('apprentice')
      const workerId = store().workers[0].id
      store().fireWorker(workerId)
      expect(store().workers).toHaveLength(0)
    })

    it('should handle non-existent worker', () => {
      store().fireWorker('non-existent')
      expect(store().workers).toHaveLength(0)
    })
  })

  describe('assignWorker', () => {
    it('should change worker assignment', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      store().assignWorker(workerId, 'forge')
      expect(store().workers[0].assignment).toBe('forge')
    })
  })

  describe('updateWorkerStamina', () => {
    it('should decrease stamina', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      const initialStamina = store().workers[0].stamina
      store().updateWorkerStamina(workerId, -10)
      expect(store().workers[0].stamina).toBe(initialStamina - 10)
    })

    it('should increase stamina', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      store().updateWorkerStamina(workerId, -50)
      store().updateWorkerStamina(workerId, 20)
      expect(store().workers[0].stamina).toBe(store().workers[0].stats.stamina_max - 30)
    })

    it('should not exceed max stamina', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      const maxStamina = store().workers[0].stats.stamina_max
      store().updateWorkerStamina(workerId, 100)
      expect(store().workers[0].stamina).toBe(maxStamina)
    })

    it('should not go below zero', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      store().updateWorkerStamina(workerId, -1000)
      expect(store().workers[0].stamina).toBe(0)
    })
  })

  describe('addWorkerExperience', () => {
    it('should add experience to worker', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      store().addWorkerExperience(workerId, 50)
      expect(store().workers[0].experience).toBeGreaterThan(0)
    })

    it('should level up worker when threshold reached', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      store().addWorkerExperience(workerId, 200) // Enough for level up
      expect(store().workers[0].level).toBe(2)
    })

    it('should improve stats on level up', () => {
      store().hireWorker('blacksmith')
      const workerId = store().workers[0].id
      const initialQuality = store().workers[0].stats.quality
      store().addWorkerExperience(workerId, 200)
      expect(store().workers[0].stats.quality).toBeGreaterThanOrEqual(initialQuality)
    })
  })

  describe('getWorkersQuality', () => {
    it('should return baseline quality when no blacksmiths', () => {
      // Когда нет кузнецов, возвращается baseline quality (20)
      expect(store().getWorkersQuality()).toBe(20)
    })

    it('should return average quality', () => {
      store().hireWorker('blacksmith') // high quality
      const quality = store().getWorkersQuality()
      expect(quality).toBeGreaterThan(0)
      expect(quality).toBeLessThanOrEqual(100)
    })
  })

  describe('updateBuildingProgress', () => {
    it('should update building progress', () => {
      const buildingId = store().buildings[0].id
      store().updateBuildingProgress(buildingId, 0.75)
      expect(store().buildings[0].progress).toBe(75)
    })
  })

  describe('upgradeBuilding', () => {
    it('should increase building level', () => {
      const buildingId = store().buildings[0].id
      const initialLevel = store().buildings[0].level
      store().upgradeBuilding(buildingId)
      expect(store().buildings[0].level).toBe(initialLevel + 1)
    })

    it('should increase production', () => {
      const buildingId = store().buildings[0].id
      const initialProduction = store().buildings[0].baseProduction
      store().upgradeBuilding(buildingId)
      expect(store().buildings[0].baseProduction).toBeGreaterThan(initialProduction)
    })
  })

  describe('getWorkersByAssignment', () => {
    it('should return workers by assignment', () => {
      store().hireWorker('blacksmith')
      store().hireWorker('miner')
      const id1 = store().workers[0].id
      const id2 = store().workers[1].id
      store().assignWorker(id1, 'forge')
      store().assignWorker(id2, 'forge')
      expect(store().getWorkersByAssignment('forge')).toHaveLength(2)
    })

    it('should return empty array for no matches', () => {
      expect(store().getWorkersByAssignment('forge')).toHaveLength(0)
    })
  })

  describe('restAllWorkers', () => {
    it('should restore all workers stamina', () => {
      store().hireWorker('blacksmith')
      store().hireWorker('miner')
      const id1 = store().workers[0].id
      store().updateWorkerStamina(id1, -50)

      store().restAllWorkers()

      store().workers.forEach(w => {
        expect(w.stamina).toBe(w.stats.stamina_max)
        expect(w.assignment).toBe('rest')
      })
    })
  })
})
