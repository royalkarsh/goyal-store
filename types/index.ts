// types/index.ts — Goyal General Store
// Single source of truth for all TypeScript types

export type UserRole = 'customer' | 'admin'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'razorpay' | 'cod' | 'upi' | 'card' | 'netbanking'
export type ProductBadge = 'sale' | 'new' | 'popular' | 'hot' | null
export type DiscountType = 'percent' | 'flat'
export type InventoryReason = 'order' | 'restock' | 'adjustment' | 'return' | 'damage'

// ── Database Row Types ──────────────────────────────────────

export interface Profile {
  id: string
  phone: string | null
  full_name: string | null
  email: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  line1: string
  line2: string | null
  landmark: string | null
  city: string
  pincode: string
  is_default: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  emoji: string | null
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string
  brand: string | null
  sku: string | null
  weight: string | null
  unit: string
  price: number
  mrp: number | null
  cost_price: number | null
  tax_rate: number
  hsn_code: string | null
  stock_qty: number
  low_stock_threshold: number
  emoji: string | null
  image_url: string | null
  images: string[]
  is_active: boolean
  is_featured: boolean
  badge: ProductBadge
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  category?: Category
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  delivery_address: AddressSnapshot
  subtotal: number
  discount_amount: number
  delivery_charge: number
  tax_amount: number
  total_amount: number
  coupon_code: string | null
  placed_at: string
  confirmed_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  updated_at: string
  customer_note: string | null
  admin_note: string | null
  // Joined
  items?: OrderItem[]
  profile?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_emoji: string | null
  product_weight: string | null
  unit_price: number
  quantity: number
  subtotal: number
  tax_rate: number
  hsn_code: string | null
  product?: Product
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryLog {
  id: string
  product_id: string
  change_qty: number
  reason: InventoryReason
  reference_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

// ── Non-DB / Utility Types ──────────────────────────────────

export interface AddressSnapshot {
  label: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  pincode: string
}

// Cart (client-side only, stored in Zustand)
export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
  coupon: Coupon | null
}

// Computed cart totals
export interface CartTotals {
  subtotal: number
  discountAmount: number
  deliveryCharge: number
  taxAmount: number
  total: number
  isFreeDelivery: boolean
}

// Razorpay
export interface RazorpayOrderResponse {
  id: string
  amount: number
  currency: string
  receipt: string
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  order_id: string  // our DB order UUID
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Admin dashboard stats
export interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  lowStockCount: number
  totalProducts: number
  totalCustomers: number
  monthRevenue: number
  monthOrders: number
  lowStockItems?: any[]
}

// Product form (for admin create/edit)
export interface ProductFormData {
  name: string
  description: string
  category_id: string
  brand: string
  weight: string
  unit: string
  price: number
  mrp: number | null
  cost_price: number | null
  tax_rate: number
  hsn_code: string
  stock_qty: number
  low_stock_threshold: number
  emoji: string
  badge: ProductBadge
  is_active: boolean
  is_featured: boolean
}

// Checkout form
export interface CheckoutFormData {
  full_name: string
  phone: string
  address_id?: string
  line1: string
  line2: string
  landmark: string
  city: string
  pincode: string
  save_address: boolean
  payment_method: PaymentMethod
  coupon_code: string
  customer_note: string
}
