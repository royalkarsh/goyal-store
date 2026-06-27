'use client'
// components/store/StoreFront.tsx — Client wrapper that shares state between CategoryScroll and ProductGrid
import { useState } from 'react'
import CategoryScroll from './CategoryScroll'
import ProductGrid from './ProductGrid'
import type { Category, Product } from '@/types'

interface Props {
  categories: Category[]
  initialProducts: Product[]
}

export default function StoreFront({ categories, initialProducts }: Props) {
  const [activeCategory, setActiveCategory] = useState('all')

  return (
    <>
      <CategoryScroll
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <ProductGrid
        initialProducts={initialProducts}
        activeCategory={activeCategory}
      />
    </>
  )
}
