// app/(store)/products/[slug]/page.tsx — Product detail page
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProductDetail from './ProductDetail'
import type { Product } from '@/types'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createClient()
  const { data }  = await supabase.from('products').select('name,description').eq('slug', slug).single()
  if (!data) return { title: 'Product not found' }
  return {
    title: `${data.name} — Goyal General Store`,
    description: data.description || `Buy ${data.name} online. Fast delivery in Rohini, Delhi.`,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const supabase  = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(id,name,slug,emoji)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  return <ProductDetail product={product as Product} />
}
