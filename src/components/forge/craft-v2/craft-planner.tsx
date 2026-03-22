/**
 * Craft Planner V2
 * Интерфейс планирования крафта
 * 
 * @see docs/CRAFT_SYSTEM_CONCEPT.md - секция 5.1
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Sword, Hammer, Wrench, Package, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Info, Clock, Star, Zap, Shield,
  Timer, Sparkles, ShoppingBag
} from 'lucide-react'
import { cn } from '@/lib/utils'

import type { WeaponRecipe } from '@/types/craft-v2'
import type { Resources } from '@/store/slices/resources-slice'
import { allRecipes, getAvailableRecipes, getRecipeById } from '@/data/recipes'
import { allMaterials, getMaterialsByCategory, getMaterialsForPart, getMaterialById } from '@/data/materials'
import { allTechniques, basicTechniques, getTechniqueById } from '@/data/techniques'
import { 
  checkInventoryForCraft, 
  getMaterialAmountInInventory, 
  getResourceKeyForMaterial,
  type InventoryCheckResult,
  type MaterialToBuy
} from '@/lib/craft/inventory-check'

// ================================
// ПОДКОМПОНЕНТЫ
// ================================

/** Карточка рецепта */
function RecipeCard({ 
  recipe, 
  isSelected, 
  isAvailable,
  onSelect 
}: { 
  recipe: WeaponRecipe
  isSelected: boolean
  isAvailable: boolean
  onSelect: () => void 
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    sword: <Sword className="w-5 h-5" />,
    dagger: <Sword className="w-4 h-4" />,
    axe: <Hammer className="w-5 h-5" />,
  }
  
  return (
    <motion.div
      whileHover={isAvailable ? { scale: 1.02 } : {}}
      whileTap={isAvailable ? { scale: 0.98 } : {}}
      onClick={isAvailable ? onSelect : undefined}
      className={cn(
        "p-3 rounded-lg border-2 transition-all cursor-pointer",
        isSelected 
          ? "border-amber-500 bg-amber-900/30" 
          : isAvailable
            ? "border-stone-700 bg-stone-800/50 hover:border-stone-600"
            : "border-stone-800 bg-stone-900/30 opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isSelected ? "bg-amber-600/30 text-amber-400" : "bg-stone-700 text-stone-400"
        )}>
          {typeIcons[recipe.type] || <Sword className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium truncate",
            isSelected ? "text-amber-200" : "text-stone-200"
          )}>
            {recipe.name}
          </p>
          <p className="text-xs text-stone-500 truncate">
            {recipe.parts.length} частей • ATK {recipe.baseStats.attackBase}
          </p>
        </div>
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
        )}
      </div>
    </motion.div>
  )
}

/** Селектор материала для части */
function PartMaterialSelector({
  partId,
  partName,
  allowedCategories,
  selectedMaterial,
  onSelect,
  availableMaterials,
}: {
  partId: string
  partName: string
  allowedCategories: string[]
  selectedMaterial: string | null
  onSelect: (materialId: string) => void
  availableMaterials: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  
  const materials = useMemo(() => {
    return getMaterialsForPart(partId, allowedCategories)
      .filter(m => availableMaterials.includes(m.id))
  }, [partId, allowedCategories, availableMaterials])
  
  const selected = useMemo(() => {
    return selectedMaterial ? allMaterials.find(m => m.id === selectedMaterial) : null
  }, [selectedMaterial])
  
  const categoryIcons: Record<string, React.ReactNode> = {
    metal: '⚒️',
    alloy: '🔧',
    wood: '🪵',
    leather: '🟤',
    stone: '🪨',
  }
  
  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between bg-stone-800/50 hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {selected ? categoryIcons[selected.category] : '❓'}
          </span>
          <div className="text-left">
            <p className="font-medium text-stone-200">{partName}</p>
            <p className="text-xs text-stone-500">
              {selected ? selected.name : 'Выберите материал'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 grid grid-cols-2 gap-2 bg-stone-900/50">
              {materials.map(material => (
                <button
                  key={material.id}
                  onClick={() => {
                    onSelect(material.id)
                    setExpanded(false)
                  }}
                  className={cn(
                    "p-2 rounded text-left transition-colors",
                    selectedMaterial === material.id
                      ? "bg-amber-600/30 border border-amber-500"
                      : "bg-stone-800 border border-stone-700 hover:border-stone-600"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{categoryIcons[material.category]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-200 truncate">
                        {material.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        ATK +{material.weaponEffects.attackBonus}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Селектор техник */
function TechniqueSelector({
  selectedTechniques,
  onToggle,
  unlockedTechniques,
}: {
  selectedTechniques: string[]
  onToggle: (techniqueId: string) => void
  unlockedTechniques: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  
  const techniques = useMemo(() => {
    return allTechniques.filter(t => unlockedTechniques.includes(t.id))
  }, [unlockedTechniques])
  
  const selected = useMemo(() => {
    return techniques.filter(t => selectedTechniques.includes(t.id))
  }, [techniques, selectedTechniques])
  
  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between bg-stone-800/50 hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <div className="text-left">
            <p className="font-medium text-stone-200">Техники</p>
            <p className="text-xs text-stone-500">
              {selected.length > 0 
                ? selected.map(t => t.name).join(', ')
                : 'Не выбраны'
              }
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-stone-700">
          {selected.length}/{3}
        </Badge>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2 bg-stone-900/50">
              {techniques.map(technique => (
                <label
                  key={technique.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded cursor-pointer transition-colors",
                    selectedTechniques.includes(technique.id)
                      ? "bg-purple-600/20 border border-purple-500"
                      : "bg-stone-800 border border-stone-700 hover:border-stone-600"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTechniques.includes(technique.id)}
                    onChange={() => onToggle(technique.id)}
                    disabled={!selectedTechniques.includes(technique.id) && selectedTechniques.length >= 3}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-200">{technique.name}</p>
                    <p className="text-xs text-stone-500">{technique.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Проверка материалов */
function MaterialsCheck({
  inventory,
  selectedMaterials,
  recipe,
  gold,
  onBuyMaterials,
}: {
  inventory: Resources
  selectedMaterials: Record<string, string>
  recipe: WeaponRecipe | null
  gold: number
  onBuyMaterials?: (materials: MaterialToBuy[], totalCost: number) => void
}) {
  if (!recipe) return null
  
  // Преобразуем выбранные материалы в формат для проверки
  const materialAssignment: Record<string, { materialId: string; quantity: number }> = {}
  recipe.parts.forEach(part => {
    const materialId = selectedMaterials[part.id]
    if (materialId) {
      materialAssignment[part.id] = {
        materialId,
        quantity: part.minQuantity,
      }
    }
  })
  
  // Используем новую систему проверки
  const checkResult = checkInventoryForCraft(recipe, materialAssignment, inventory)
  
  if (checkResult.requirements.length === 0) return null
  
  const canAffordPurchase = gold >= checkResult.totalPurchaseCost
  
  return (
    <Card className={cn(
      "bg-stone-900/50 border-stone-700",
      !checkResult.canCraft && "border-red-500/50"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className={cn(
            "w-4 h-4",
            checkResult.canCraft ? "text-green-400" : "text-red-400"
          )} />
          Материалы
          {!checkResult.canCraft && (
            <Badge variant="destructive" className="ml-auto">
              Не хватает
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Общая потребность в сырье */}
        <div className="space-y-1">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Требуется сырья:</p>
          {checkResult.requirements.map(req => (
            <div key={req.resourceKey} className="flex items-center justify-between text-sm">
              <span className="text-stone-400">
                {req.resourceName}
              </span>
              <span className={cn(
                "font-mono",
                req.sufficient ? "text-green-400" : "text-red-400"
              )}>
                {req.available}/{req.quantity}
                {!req.sufficient && ' ❌'}
              </span>
            </div>
          ))}
        </div>
        
        {/* Топливо */}
        {checkResult.fuelRequired && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-stone-700">
            <span className="text-stone-400">Уголь (топливо)</span>
            <span className={cn(
              "font-mono",
              checkResult.fuelRequired.sufficient ? "text-green-400" : "text-red-400"
            )}>
              {checkResult.fuelRequired.available}/{checkResult.fuelRequired.quantity}
              {!checkResult.fuelRequired.sufficient && ' ❌'}
            </span>
          </div>
        )}
        
        {/* Детализация по частям */}
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500 hover:text-stone-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Детализация по частям
          </summary>
          <div className="mt-2 pl-4 space-y-2 border-l-2 border-stone-700">
            {checkResult.breakdownByPart.map(part => (
              <div key={part.partId}>
                <p className="text-stone-300 font-medium">
                  {part.partName}: <span className="text-amber-400">{part.materialName}</span>
                </p>
                {part.requirements.map((req, i) => (
                  <p key={i} className="text-xs text-stone-500 pl-2">
                    → {req.resourceName}: {req.quantity} ед.
                  </p>
                ))}
              </div>
            ))}
          </div>
        </details>
        
        {/* Кнопка покупки недостающих материалов */}
        {!checkResult.canCraft && checkResult.canPurchaseMissing && onBuyMaterials && (
          <div className="pt-3 border-t border-stone-700 space-y-2">
            <p className="text-xs text-amber-400">
              💡 Можно купить недостающие материалы прямо сейчас
            </p>
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
              <p className="text-xs text-stone-400 mb-2">К покупке:</p>
              {checkResult.materialsToBuy.map(mat => (
                <div key={mat.resourceKey} className="flex justify-between text-sm">
                  <span className="text-stone-300">{mat.resourceName} ×{mat.quantity}</span>
                  <span className="text-amber-400 font-mono">{mat.totalPrice} 💰</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 mt-2 border-t border-stone-600 font-bold">
                <span className="text-stone-200">Итого:</span>
                <span className={cn(
                  "font-mono",
                  canAffordPurchase ? "text-amber-400" : "text-red-400"
                )}>
                  {checkResult.totalPurchaseCost} 💰
                  {!canAffordPurchase && ' (не хватает золота)'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                ⚠️ Цена включает +10% наценку за срочность
              </p>
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500"
              disabled={!canAffordPurchase}
              onClick={() => onBuyMaterials(checkResult.materialsToBuy, checkResult.totalPurchaseCost)}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Купить материалы за {checkResult.totalPurchaseCost} 💰
            </Button>
          </div>
        )}
        
        {/* Если нельзя купить */}
        {!checkResult.canCraft && !checkResult.canPurchaseMissing && (
          <div className="pt-3 border-t border-stone-700">
            <p className="text-xs text-red-400">
              ⚠️ Некоторые материалы недоступны для покупки. Найдите их в экспедициях.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Превью характеристик */
function StatsPreview({
  stats,
  quality,
  time,
}: {
  stats: {
    attack: number
    durability: number
    balance: number
    soulCapacity: number
  } | null
  quality: string | null
  time: number | null
}) {
  if (!stats) return null
  
  const qualityColors: Record<string, string> = {
    poor: 'text-red-400',
    common: 'text-gray-400',
    good: 'text-green-400',
    excellent: 'text-blue-400',
    masterpiece: 'text-purple-400',
    legendary: 'text-amber-400',
  }
  
  return (
    <Card className="bg-stone-900/50 border-stone-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Предварительный расчёт
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Sword className="w-4 h-4 text-red-400" />
            <span className="text-stone-400">Атака:</span>
            <span className="font-bold text-stone-200">{stats.attack}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-stone-400">Прочность:</span>
            <span className="font-bold text-stone-200">{stats.durability}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-stone-400">Баланс:</span>
            <span className="font-bold text-stone-200">{stats.balance}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-stone-400">Душа:</span>
            <span className="font-bold text-stone-200">{stats.soulCapacity}</span>
          </div>
        </div>
        
        {quality && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-700">
            <span className="text-stone-400">Качество:</span>
            <span className={cn("font-bold uppercase", qualityColors[quality] || 'text-stone-200')}>
              {quality}
            </span>
          </div>
        )}
        
        {time && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-700">
            <span className="text-stone-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Время:
            </span>
            <span className="font-bold text-stone-200">
              ~{Math.ceil(time / 60)} мин
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ================================
// ОСНОВНОЙ КОМПОНЕНТ
// ================================

interface CraftPlannerProps {
  playerLevel: number
  inventory: Resources
  gold: number
  availableMaterials: string[]
  unlockedRecipes: string[]
  unlockedTechniques: string[]
  onStartCraft: (plan: {
    recipeId: string
    materials: Record<string, { materialId: string; quantity: number }>
    techniques: string[]
  }) => void
  onBuyMaterials?: (materials: MaterialToBuy[], totalCost: number) => void
}

export function CraftPlanner({
  playerLevel,
  inventory,
  gold,
  availableMaterials,
  unlockedRecipes,
  unlockedTechniques,
  onStartCraft,
  onBuyMaterials,
}: CraftPlannerProps) {
  // Состояние выбора
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<Record<string, string>>({})
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([])
  
  // Получаем рецепт
  const selectedRecipe = useMemo(() => {
    return selectedRecipeId ? getRecipeById(selectedRecipeId) : null
  }, [selectedRecipeId])
  
  // Доступные рецепты
  const recipes = useMemo(() => {
    return getAvailableRecipes(playerLevel, unlockedRecipes)
  }, [playerLevel, unlockedRecipes])
  
  // Проверка готовности к крафту
  const canStartCraft = useMemo(() => {
    if (!selectedRecipe) return false
    
    // Все части выбраны
    const requiredParts = selectedRecipe.parts.filter(p => !p.optional)
    const hasAllMaterials = requiredParts.every(p => selectedMaterials[p.id])
    
    if (!hasAllMaterials) return false
    
    // Проверяем наличие в инвентаре
    for (const part of requiredParts) {
      const materialId = selectedMaterials[part.id]
      if (!materialId) continue
      
      const resourceKey = getResourceKeyForMaterial(materialId)
      if (!resourceKey) continue
      
      const available = inventory[resourceKey] || 0
      if (available < part.minQuantity) return false
    }
    
    // Проверяем топливо
    if ((inventory.coal || 0) < 3) return false
    
    return true
  }, [selectedRecipe, selectedMaterials, inventory])
  
  // Обработчики
  const handleSelectRecipe = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId)
    setSelectedMaterials({})
  }, [])
  
  const handleSelectMaterial = useCallback((partId: string, materialId: string) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [partId]: materialId,
    }))
  }, [])
  
  const handleToggleTechnique = useCallback((techniqueId: string) => {
    setSelectedTechniques(prev => 
      prev.includes(techniqueId)
        ? prev.filter(id => id !== techniqueId)
        : prev.length < 3 
          ? [...prev, techniqueId]
          : prev
    )
  }, [])
  
  const handleStartCraft = useCallback(() => {
    if (!selectedRecipeId || !canStartCraft) return
    
    // Формируем план
    const materials: Record<string, { materialId: string; quantity: number }> = {}
    
    selectedRecipe?.parts.forEach(part => {
      const materialId = selectedMaterials[part.id]
      if (materialId) {
        materials[part.id] = {
          materialId,
          quantity: part.minQuantity,
        }
      }
    })
    
    onStartCraft({
      recipeId: selectedRecipeId,
      materials,
      techniques: selectedTechniques,
    })
  }, [selectedRecipeId, selectedRecipe, selectedMaterials, selectedTechniques, canStartCraft, onStartCraft])
  
  return (
    <div className="space-y-6">
      {/* Выбор рецепта */}
      <Card className="bg-stone-900/50 border-stone-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            Выберите рецепт
          </CardTitle>
          <CardDescription>
            Доступно {recipes.length} рецептов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4">
              {recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  isAvailable={true}
                  onSelect={() => handleSelectRecipe(recipe.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Выбор материалов */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-stone-900/50 border-stone-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  Материалы
                </CardTitle>
                <CardDescription>
                  Выберите материал для каждой части
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedRecipe.parts.map(part => (
                  <PartMaterialSelector
                    key={part.id}
                    partId={part.id}
                    partName={part.name}
                    allowedCategories={part.materialTypes}
                    selectedMaterial={selectedMaterials[part.id] || null}
                    onSelect={(materialId) => handleSelectMaterial(part.id, materialId)}
                    availableMaterials={availableMaterials}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Проверка материалов */}
      <AnimatePresence>
        {selectedRecipe && Object.keys(selectedMaterials).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MaterialsCheck
              inventory={inventory}
              selectedMaterials={selectedMaterials}
              recipe={selectedRecipe}
              gold={gold}
              onBuyMaterials={onBuyMaterials}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Выбор техник */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TechniqueSelector
              selectedTechniques={selectedTechniques}
              onToggle={handleToggleTechnique}
              unlockedTechniques={unlockedTechniques}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Кнопка запуска */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Button
              size="lg"
              className={cn(
                "w-full text-lg py-6",
                canStartCraft 
                  ? "bg-amber-600 hover:bg-amber-500" 
                  : "bg-stone-700 cursor-not-allowed"
              )}
              disabled={!canStartCraft}
              onClick={handleStartCraft}
            >
              {canStartCraft ? (
                <>
                  <Hammer className="w-5 h-5 mr-2" />
                  Начать крафт
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Недостаточно материалов
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CraftPlanner
