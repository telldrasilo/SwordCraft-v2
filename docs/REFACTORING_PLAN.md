# План рефакторинга Store архитектуры

> **Цель**: Превратить `game-store-composed.ts` из монстра (1744 строки) в тонкий слой сборки (~200 строк)
> 
> **Дата создания**: 2026-03-22
> 
> **Ветка**: `feature/project-optimization`

---

## Текущее состояние

### Проблемы

| Проблема | Описание |
|----------|----------|
| 🐘 **Монстр composed** | 1744 строки кода — вся логика в одном файле |
| 👻 **Мёртвые слайсы** | Слайсы написаны (~3000 строк), но НЕ используются |
| 🔁 **Дублирование** | Логика повторяется: composed + slices + utils |
| 🎲 **Случайные импорты** | Часть функций из utils, часть локальные |
| ⚠️ **Кросс-зависимости** | Slice не может вызвать другой slice |

### Статистика файлов

```
game-store-composed.ts    1744 строки  ← МОНСТР (цель: ~200)
slices/                   ~3000 строк  ← НЕ ИСПОЛЬЗУЮТСЯ
store-utils/              ~2200 строк  ← Частично используются
```

---

## Целевая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     game-store-composed.ts                      │
│                        (~200 строк)                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Объединение slices через Zustand compose                  ││
│  │ • Транзакции между slices (cross-slice operations)          ││
│  │ • Persist middleware                                         ││
│  │ • Экспорт типов для компонентов                             ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────────┘
                            │ использует
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          slices/                                 │
│                       (~3000 строк)                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  player-   │ │  workers-  │ │  craft-    │ │  guild-    │   │
│  │  slice.ts  │ │  slice.ts  │ │  slice.ts  │ │  slice.ts  │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │
│        │              │              │              │           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ resources- │ │  orders-   │ │enchantments│ │ tutorial-  │   │
│  │  slice.ts  │ │  slice.ts  │ │  -slice.ts │ │  slice.ts  │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │
└────────┼──────────────┼──────────────┼──────────────┼───────────┘
         │              │              │              │
         │              │ использует   │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        store-utils/                              │
│                       (~2200 строк)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ constants.ts│ │ generators.ts│ │ types.ts    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ player-     │ │ worker-     │ │ craft-      │               │
│  │ utils.ts    │ │ utils.ts    │ │ utils.ts    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ enchantment │ │ expedition- │ │ order-      │               │
│  │ -utils.ts   │ │ utils.ts    │ │ utils.ts    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         data/                                    │
│  weapon-recipes.ts | refining-recipes.ts | enchantments.ts      │
│  expedition-templates.ts | market-data.ts | repair-system.ts    │
└─────────────────────────────────────────────────────────────────┘
```

### Принципы

1. **Utils — чистые функции**: Нет доступа к store, только входные данные → выходные данные
2. **Slices — инкапсуляция**: Управляют своей частью state, используют utils
3. **Composed — координация**: Объединяет slices, решает cross-slice задачи

---

## Фазы рефакторинга

### Фаза 1: Подготовка и анализ (1-2 часа)

#### 1.1 Аудит текущего состояния
- [ ] Составить карту всех функций в `game-store-composed.ts`
- [ ] Определить какие функции относятся к какому slice
- [ ] Найти cross-slice функции (используют state из нескольких slices)
- [ ] Зафиксировать текущие тесты (если есть)

#### 1.2 Создание тестовой инфраструктуры
- [ ] Установить Vitest (легче чем Jest для ESM)
- [ ] Создать базовые тесты для utils (smoke tests)
- [ ] Создать тесты для критических путей (крафт, экспедиции)

#### 1.3 Создание backup точки
- [ ] Commit текущего рабочего состояния
- [ ] Тег `before-store-refactoring`

---

### Фаза 2: Унификация Utils (2-3 часа)

#### 2.1 Удаление дубликатов в slices
**Проблема**: В slices есть свои локальные функции, которые уже есть в utils

**Файлы для обновления**:
| Slice | Локальная функция | Заменить на |
|-------|-------------------|-------------|
| workers-slice.ts | `generateId()` | `@/lib/store-utils/generators` |
| workers-slice.ts | `generateWorkerName()` | `@/lib/store-utils/generators` |
| workers-slice.ts | `getExpForWorkerLevel()` | `@/lib/store-utils/worker-utils` |
| craft-slice.ts | `generateId()` | `@/lib/store-utils/generators` |
| craft-slice.ts | `getQualityGrade()` | `@/lib/store-utils/craft-utils` |
| craft-slice.ts | `getQualityMultiplier()` | `@/lib/store-utils/craft-utils` |
| guild-slice.ts | `generateId()` | `@/lib/store-utils/generators` |

**Действия**:
```typescript
// ДО (craft-slice.ts)
const generateId = (): string => Math.random().toString(36).substring(2, 9)
const getQualityGrade = (quality: number): QualityGrade => { ... }

// ПОСЛЕ
import { generateId, getQualityGrade } from '@/lib/store-utils'
```

#### 2.2 Проверка полноты utils
- [ ] Убедиться что все константы в `constants.ts`
- [ ] Проверить что все генераторы в `generators.ts`
- [ ] Добавить недостающие функции в utils

#### 2.3 Типы для utils
- [ ] Унифицировать типы в `types.ts`
- [ ] Экспортировать типы из `index.ts`

---

### Фаза 3: Обновление Slices (3-4 часа)

#### 3.1 Паттерн правильного slice
```typescript
// player-slice.ts — ПРАВИЛЬНЫЙ ПРИМЕР (уже готов)

import { StateCreator } from 'zustand'
import {
  getTitleByLevel,
  addExperience as addExperienceUtil,
} from '@/lib/store-utils/player-utils'

export interface PlayerSlice {
  // State
  player: Player
  statistics: GameStatistics
  
  // Actions
  setPlayerName: (name: string) => void
  addExperience: (amount: number) => void
  addFame: (amount: number) => void
}

export const createPlayerSlice: StateCreator<PlayerSlice> = (set, get) => ({
  player: initialPlayer,
  statistics: initialStatistics,

  addExperience: (amount) => set((state) => {
    // Используем utility для логики
    const result = addExperienceUtil(
      state.player.experience,
      state.player.level,
      state.player.experienceToNextLevel,
      state.player.fame,
      amount
    )
    return { player: { ...state.player, ...result } }
  }),
  
  // ...остальные actions
})
```

#### 3.2 Обновление каждого slice

| Slice | Статус | Нужно сделать |
|-------|--------|---------------|
| player-slice.ts | ✅ Готов | Импорт из utils |
| resources-slice.ts | ✅ Готов | Импорт из utils |
| workers-slice.ts | ⚠️ Частично | Удалить локальные функции |
| craft-slice.ts | ⚠️ Частично | Удалить локальные функции |
| guild-slice.ts | ⚠️ Частично | Удалить локальные функции |
| orders-slice.ts | ❓ Проверить | Возможно обновить |
| enchantments-slice.ts | ❓ Проверить | Возможно обновить |
| tutorial-slice.ts | ❓ Проверить | Возможно обновить |

#### 3.3 Cross-slice зависимости
**Проблема**: Slice не может вызвать action другого slice напрямую

**Решение**: 
1. Utils для чистой логики
2. Composed store для координации

```typescript
// НЕПРАВИЛЬНО (в slice):
hireWorker: (workerClass) => {
  // ❌ Нет доступа к resources для списания золота
}

// ПРАВИЛЬНО:
// workers-slice.ts — только создаёт рабочего
hireWorker: (workerClass) => {
  const worker = createWorker(workerClass)
  set({ workers: [...state.workers, worker] })
  return { success: true, cost: worker.hireCost }
}

// game-store-composed.ts — координация
hireWorker: (workerClass) => {
  const cost = workersSlice.getWorkerHireCost(workerClass)
  if (!resourcesSlice.canAfford({ gold: cost })) return false
  
  resourcesSlice.spendResource('gold', cost)
  workersSlice.hireWorker(workerClass)
  statisticsSlice.updateStatistics({ totalWorkersHired: +1 })
  
  return true
}
```

---

### Фаза 4: Переписывание Composed Store (4-5 часов)

#### 4.1 Структура нового composed
```typescript
// game-store-composed.ts (~200 строк)

import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'

// Импорт slices
import { createPlayerSlice, PlayerSlice } from './slices/player-slice'
import { createResourcesSlice, ResourcesSlice } from './slices/resources-slice'
import { createWorkersSlice, WorkersSlice } from './slices/workers-slice'
import { createCraftSlice, CraftSlice } from './slices/craft-slice'
import { createGuildSlice, GuildSlice } from './slices/guild-slice'
// ...другие slices

// Объединённый тип
type GameStore = PlayerSlice & ResourcesSlice & WorkersSlice & CraftSlice & GuildSlice & CrossSliceActions

// Cross-slice actions (координация)
interface CrossSliceActions {
  // Найм рабочего с списанием золота
  hireWorkerWithCost: (workerClass: WorkerClass) => boolean
  
  // Крафт с использованием ресурсов и опыта
  startCraftWithResources: (recipe: WeaponRecipe) => boolean
  completeCraftWithExperience: () => CraftedWeapon | null
  
  // Экспедиция с оружием и наградами
  startExpeditionFull: (...) => boolean
  completeExpeditionFull: (...) => ExpeditionResult
}

// Compose slices
const createStore = create<GameStore>()(
  persist(
    (...args) => ({
      ...createPlayerSlice(...args),
      ...createResourcesSlice(...args),
      ...createWorkersSlice(...args),
      ...createCraftSlice(...args),
      ...createGuildSlice(...args),
      
      // Cross-slice actions
      hireWorkerWithCost: (workerClass) => { /* координация */ },
      startCraftWithResources: (recipe) => { /* координация */ },
      // ...
    }),
    { name: 'swordcraft-store' }
  )
)

export const useGameStore = createStore
```

#### 4.2 Последовательность переписывания

1. **Создать новый файл** `game-store-composed-v2.ts` (параллельно с существующим)
2. **Импортировать slices** и объединить
3. **Реализовать cross-slice actions**
4. **Протестировать** с компонентами
5. **Заменить** старый файл

#### 4.3 Cross-slice операции для реализации

| Операция | Затрагивает slices | Описание |
|----------|-------------------|----------|
| `hireWorker` | resources, workers, statistics | Найм с оплатой |
| `fireWorker` | resources, workers | Увольнение с возвратом |
| `startCraft` | resources, craft, recipes | Крафт с расходом ресурсов |
| `completeCraft` | craft, player, statistics | Завершение с опытом |
| `startExpedition` | resources, guild, craft | Экспедиция с затратами |
| `completeExpedition` | guild, resources, player, craft | Награды |
| `sellWeapon` | craft, resources, statistics | Продажа |
| `sacrificeWeapon` | craft, resources, statistics | Жертвование |
| `completeOrder` | orders, craft, resources, player | Заказ |

---

### Фаза 5: Тестирование и валидация (2-3 часа)

#### 5.1 Unit-тесты для utils
```typescript
// __tests__/store-utils/craft-utils.test.ts
import { describe, it, expect } from 'vitest'
import { getQualityGrade, calculateCraftQuality } from '@/lib/store-utils/craft-utils'

describe('craft-utils', () => {
  it('should return correct quality grade', () => {
    expect(getQualityGrade(10)).toBe('poor')
    expect(getQualityGrade(50)).toBe('normal')
    expect(getQualityGrade(75)).toBe('excellent')
    expect(getQualityGrade(98)).toBe('legendary')
  })
  
  it('should calculate craft quality based on inputs', () => {
    const quality = calculateCraftQuality(50, 5, 1)
    expect(quality).toBeGreaterThan(0)
    expect(quality).toBeLessThanOrEqual(100)
  })
})
```

#### 5.2 Integration тесты для slices
```typescript
// __tests__/store/slices/player-slice.test.ts
import { describe, it, expect } from 'vitest'
import { createPlayerSlice } from '@/store/slices/player-slice'

describe('player-slice', () => {
  it('should add experience and level up', () => {
    const store = createPlayerSlice(() => {}, () => store)
    
    store.addExperience(100)
    
    expect(store.player.level).toBe(2)
    expect(store.player.fame).toBe(10)
  })
})
```

#### 5.3 E2E тесты для composed store
```typescript
// __tests__/store/game-store.test.ts
describe('game-store integration', () => {
  it('should complete full craft flow', () => {
    const store = useGameStore.getState()
    
    // Устанавливаем ресурсы
    store.addResource('iron', 100)
    store.addResource('coal', 50)
    
    // Начинаем крафт
    const recipe = { id: 'iron_sword', cost: { iron: 10, coal: 5 }, ... }
    const started = store.startCraftWithResources(recipe)
    
    expect(started).toBe(true)
    expect(store.resources.iron).toBe(90)
    
    // Завершаем
    const weapon = store.completeCraftWithExperience()
    
    expect(weapon).not.toBeNull()
    expect(store.player.experience).toBeGreaterThan(0)
  })
})
```

#### 5.4 Чек-лист валидации
- [ ] Все компоненты работают с новым store
- [ ] Persist работает (сохранение/загрузка)
- [ ] Нет regressions в UI
- [ ] Performance не ухудшилась

---

### Фаза 6: Очистка и документация (1-2 часа)

#### 6.1 Удаление мёртвого кода
- [ ] Удалить дубликаты функций из старого composed
- [ ] Удалить неиспользуемые экспорты
- [ ] Почистить импорты

#### 6.2 Документация
- [ ] JSDoc для всех публичных функций
- [ ] README для архитектуры store
- [ ] Примеры использования для новых модулей

#### 6.3 Финальный commit
- [ ] Review изменений
- [ ] Commit в ветку
- [ ] PR в main (или merge)

---

## Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сломать persist | Средняя | Высокое | Миграция данных, версионирование |
| Regressions в UI | Средняя | Среднее | E2E тесты, ручное тестирование |
| Cross-slice зависимости | Высокая | Среднее | Чёткое разделение ответственности |
| Производительность | Низкая | Низкое | Бенчмарки до/после |

---

## Критерии успеха

### Количественные
- [ ] `game-store-composed.ts` < 300 строк
- [ ] Все slices используют utils (0 локальных функций)
- [ ] Test coverage > 60% для utils
- [ ] 0 regressions в функциональности

### Качественные
- [ ] Легко найти где находится логика
- [ ] Новый разработчик понимает архитектуру за 10 минут
- [ ] Можно добавить новый модуль без изменения existing code

---

## План-резерв (если что-то пойдёт не так)

1. **Откат к backup тегу** `before-store-refactoring`
2. **Пошаговый откат** по фазам (git revert)
3. **Гибридный подход** — постепенно мигрировать по одному slice

---

## Расширяемость (подготовка к новым модулям)

### Добавление нового модуля

```
1. Создать types/new-module.ts
2. Создать data/new-module-data.ts
3. Создать lib/store-utils/new-module-utils.ts
4. Создать store/slices/new-module-slice.ts
5. Добавить в game-store-composed.ts:
   - Импорт slice
   - Добавление в тип GameStore
   - Cross-slice actions (если нужно)
```

### Пример: Добавление системы достижений

```typescript
// 1. lib/store-utils/achievement-utils.ts
export const checkAchievement = (stats: GameStatistics, achievement: Achievement): boolean => { ... }
export const calculateReward = (achievement: Achievement): AchievementReward => { ... }

// 2. store/slices/achievements-slice.ts
export const createAchievementsSlice: StateCreator<AchievementsSlice> = (set, get) => ({
  unlockedAchievements: [],
  unlockAchievement: (id) => { /* uses achievement-utils */ },
})

// 3. game-store-composed.ts
import { createAchievementsSlice, AchievementsSlice } from './slices/achievements-slice'

type GameStore = ... & AchievementsSlice

// Cross-slice: проверка достижений при каждом действии
const checkAchievementsOnAction = (action: string) => {
  const store = get()
  achievementsSlice.checkAndUnlock(store.statistics)
}
```

---

## Итоговая структура файлов

```
src/
├── store/
│   ├── index.ts                      # Публичный API
│   ├── game-store-composed.ts        # ~200 строк, только сборка
│   └── slices/
│       ├── player-slice.ts           # ~150 строк
│       ├── resources-slice.ts        # ~190 строк
│       ├── workers-slice.ts          # ~200 строк (обновлён)
│       ├── craft-slice.ts            # ~250 строк (обновлён)
│       ├── guild-slice.ts            # ~300 строк (обновлён)
│       ├── orders-slice.ts           # ~280 строк
│       ├── enchantments-slice.ts     # ~220 строк
│       ├── tutorial-slice.ts         # ~140 строк
│       └── index.ts                  # Экспорт всех slices
│
├── lib/
│   └── store-utils/
│       ├── index.ts                  # Публичный API
│       ├── types.ts                  # Общие типы
│       ├── constants.ts              # Константы
│       ├── generators.ts             # Генераторы ID, имён
│       ├── player-utils.ts           # Логика игрока
│       ├── worker-utils.ts           # Логика рабочих
│       ├── craft-utils.ts            # Логика крафта
│       ├── enchantment-utils.ts      # Логика зачарований
│       ├── expedition-utils.ts       # Логика экспедиций
│       ├── order-utils.ts            # Логика заказов
│       └── repair-utils.ts           # Логика ремонта
│
├── __tests__/
│   ├── store-utils/
│   │   ├── craft-utils.test.ts
│   │   └── ...
│   └── store/
│       ├── player-slice.test.ts
│       └── game-store.test.ts
│
└── docs/
    ├── REFACTORING_PLAN.md           # Этот документ
    └── STORE_ARCHITECTURE.md         # Документация архитектуры
```

---

## Следующие шаги

1. **Прочитать и утвердить план**
2. **Создать backup тег**
3. **Начать с Фазы 1** — аудит и тесты
4. **Действовать по плану**

---

*Последнее обновление: 2026-03-22*
