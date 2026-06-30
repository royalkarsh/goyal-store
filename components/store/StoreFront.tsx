'use client'
// components/store/StoreFront.tsx — Shares category + subcategory state between nav and grid
import { useState } from 'react'
import CategoryScroll from './CategoryScroll'
import ProductGrid from './ProductGrid'
import type { Category, Product } from '@/types'

interface Props {
  categories:      Category[]
  initialProducts: Product[]
  initialSearch?:  string
}

export default function StoreFront({ categories, initialProducts, initialSearch = '' }: Props) {
  const [activeCategory,    setActiveCategory]    = useState('all')
  const [activeSubcategory, setActiveSubcategory] = useState('')

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug)
    setActiveSubcategory('')  // reset subcategory whenever category changes
  }

  return (
    <>
      <CategoryScroll
        categories={categories}
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        onCategoryChange={handleCategoryChange}
        onSubcategoryChange={setActiveSubcategory}
      />
      <ProductGrid
        initialProducts={initialProducts}
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        initialSearch={initialSearch}
      />
    </>
  )
}
