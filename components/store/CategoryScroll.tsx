'use client'
// components/store/CategoryScroll.tsx
import type { Category } from '@/types'

interface Props {
  categories: Category[]
  activeCategory: string
  onCategoryChange: (slug: string) => void
}

export default function CategoryScroll({ categories, activeCategory, onCategoryChange }: Props) {
  if (categories.length === 0) return null

  return (
    <div className="bg-cream-dark/40 border-b border-cream-dark">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* All pill */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all duration-200
              ${activeCategory === 'all' || !activeCategory
                ? 'bg-green-deep text-white shadow-md'
                : 'bg-white text-green-deep border border-cream-dark hover:border-green-muted hover:bg-white'}`}
          >
            🏪 All
          </button>

          {categories.map(cat => {
            const active = activeCategory === cat.slug
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.slug)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all duration-200
                  ${active
                    ? 'bg-green-deep text-white shadow-md'
                    : 'bg-white text-green-deep border border-cream-dark hover:border-green-muted hover:bg-white'}`}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
