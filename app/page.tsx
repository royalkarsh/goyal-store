// app/page.tsx — Homepage (Server Component fetches initial data)
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/store/Navbar'
import Hero from '@/components/store/Hero'
import AnnouncementStrip from '@/components/store/AnnouncementStrip'
import StoreFront from '@/components/store/StoreFront'
import PromoBanners from '@/components/store/PromoBanners'
import Footer from '@/components/store/Footer'
import CartDrawer from '@/components/store/CartDrawer'
import type { Category, Product } from '@/types'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('products')
      .select('*, category:categories(id,name,slug,emoji)')
      .eq('is_active', true)
      .order('sort_order')
      .order('is_featured', { ascending: false })
      .limit(24),
  ])

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AnnouncementStrip />
        <StoreFront
          categories={(categories as Category[]) || []}
          initialProducts={(products as Product[]) || []}
        />
        <PromoBanners />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
