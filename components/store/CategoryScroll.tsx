'use client'
// components/store/CategoryScroll.tsx — Two-level category navigation
import { useEffect, useState } from 'react'
import type { Category, Subcategory } from '@/types'

interface Props {
  categories:          Category[]
  activeCategory:      string
  activeSubcategory:   string
  onCategoryChange:    (slug: string) => void
  onSubcategoryChange: (slug: string) => void
}

export default function CategoryScroll({
  categories,
  activeCategory,
  activeSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: Props) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loadingSubs,   setLoadingSubs]   = useState(false)

  // Fetch subcategories whenever a real category is selected
  useEffect(() => {
    if (!activeCategory || activeCategory === 'all') {
      setSubcategories([])
      return
    }
    setLoadingSubs(true)
    fetch(`/api/subcategories?category=${activeCategory}`)
      .then(r => r.json())
      .then(j => setSubcategories(j.data?.subcategories || []))
      .catch(() => setSubcategories([]))
      .finally(() => setLoadingSubs(false))
  }, [activeCategory])

  if (categories.length === 0) return null

  const showSubs = activeCategory !== 'all' && (loadingSubs || subcategories.length > 0)

  return (
    <div className="bg-cream-dark/40 border-b border-cream-dark">
      {/* ── Row 1: Main categories ── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all duration-200
              ${activeCategory === 'all'
                ? 'bg-green-deep text-white shadow-md'
                : 'bg-white text-green-deep border border-cream-dark hover:border-green-muted'}`}
          >
            🏪 All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all duration-200
                ${activeCategory === cat.slug
                  ? 'bg-green-deep text-white shadow-md'
                  : 'bg-white text-green-deep border border-cream-dark hover:border-green-muted'}`}
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 2: Subcategory pills (slide down) ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out
          ${showSubs ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {/* "All" pill clears subcategory */}
            <button
              onClick={() => onSubcategoryChange('')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200 border
                ${!activeSubcategory
                  ? 'bg-green-deep text-white border-green-deep'
                  : 'bg-white text-green-deep border-green-muted/50 hover:border-green-muted'}`}
            >
              Sab kuch
            </button>

            {loadingSubs
              ? [...Array(5)].map((_, i) => (
                  <div key={i} className="h-7 w-20 bg-cream-dark rounded-full animate-pulse shrink-0" />
                ))
              : subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => onSubcategoryChange(sub.slug)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200 border
                      ${activeSubcategory === sub.slug
                        ? 'bg-green-deep text-white border-green-deep'
                        : 'bg-white text-green-deep border-green-muted/50 hover:border-green-muted hover:bg-cream'}`}
                  >
                    {sub.emoji && <span>{sub.emoji}</span>}
                    {sub.name}
                  </button>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
