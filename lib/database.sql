-- =============================================================
-- GOYAL GENERAL STORE — SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone         TEXT UNIQUE,
  full_name     TEXT,
  email         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================
-- 2. ADDRESSES
-- =============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Home',      -- Home / Office / Other
  line1         TEXT NOT NULL,
  line2         TEXT,
  landmark      TEXT,
  city          TEXT NOT NULL DEFAULT 'Delhi',
  pincode       TEXT NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 3. CATEGORIES
-- =============================================================
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  emoji         TEXT,
  description   TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, slug, emoji, display_order) VALUES
  ('All Items',     'all',        '🛒', 0),
  ('Staples',       'staples',    '🌾', 1),
  ('Dairy & Eggs',  'dairy',      '🥛', 2),
  ('Snacks',        'snacks',     '🍿', 3),
  ('Beverages',     'beverages',  '☕', 4),
  ('Personal Care', 'personal',   '🧴', 5),
  ('Household',     'household',  '🧹', 6),
  ('Spices',        'spices',     '🌶️', 7),
  ('Frozen',        'frozen',     '🧊', 8)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- 4. PRODUCTS
-- =============================================================
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  category_id     UUID NOT NULL REFERENCES categories(id),
  brand           TEXT,
  sku             TEXT UNIQUE,
  weight          TEXT,                            -- "1 kg", "500 ml"
  unit            TEXT NOT NULL DEFAULT 'piece',  -- piece/kg/litre/pack
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp             NUMERIC(10,2) CHECK (mrp >= 0), -- max retail price
  cost_price      NUMERIC(10,2),                  -- purchase cost (hidden from customers)
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 5.00, -- GST %
  hsn_code        TEXT,                           -- for GST invoices
  stock_qty       INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 10,
  emoji           TEXT,
  image_url       TEXT,
  images          JSONB DEFAULT '[]',              -- array of image URLs
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  badge           TEXT CHECK (badge IN ('sale','new','popular','hot', NULL)),
  sort_order      INT NOT NULL DEFAULT 0,
  meta_title      TEXT,
  meta_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS products_search_idx ON products
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || COALESCE(brand,'')));
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);

-- Seed sample products
INSERT INTO products (name, slug, category_id, brand, weight, price, mrp, stock_qty, emoji, badge, is_featured, hsn_code) VALUES
  ('Aashirvaad Atta',       'aashirvaad-atta-5kg',     (SELECT id FROM categories WHERE slug='staples'),   'Aashirvaad', '5 kg',     249, 279, 150, '🌾', 'popular', true,  '1101'),
  ('Tata Salt',             'tata-salt-1kg',           (SELECT id FROM categories WHERE slug='staples'),   'Tata',       '1 kg',      24,  26,  80, '🧂',  NULL,     false, '2501'),
  ('Fortune Sunflower Oil', 'fortune-oil-1l',          (SELECT id FROM categories WHERE slug='staples'),   'Fortune',    '1 L',      145, 160, 60, '🛢️',  'sale',   true,  '1512'),
  ('Amul Butter',           'amul-butter-500g',        (SELECT id FROM categories WHERE slug='dairy'),     'Amul',       '500 g',    275, 295, 40, '🧈',  'new',    true,  '0405'),
  ('Amul Taaza Milk',       'amul-taaza-500ml',        (SELECT id FROM categories WHERE slug='dairy'),     'Amul',       '500 ml',    28,  28, 100, '🥛',  NULL,     false, '0401'),
  ('Maggi Noodles 4-pack',  'maggi-noodles-4pack',     (SELECT id FROM categories WHERE slug='snacks'),    'Nestlé',     '70g×4',     56,  60, 120, '🍜',  NULL,     false, '1902'),
  ('Lays Classic Salted',   'lays-classic-26g',        (SELECT id FROM categories WHERE slug='snacks'),    'PepsiCo',    '26 g',      20,  20, 200, '🥔',  'popular',true,  '2008'),
  ('Tata Tea Gold',         'tata-tea-gold-250g',      (SELECT id FROM categories WHERE slug='beverages'), 'Tata',       '250 g',    115, 130, 70, '☕',  'sale',   true,  '0902'),
  ('Dettol Soap 3-pack',    'dettol-soap-3pack',       (SELECT id FROM categories WHERE slug='personal'),  'Dettol',     '75g×3',     96, 110, 90, '🧼',  NULL,     false, '3401'),
  ('Harpic Power Plus',     'harpic-power-plus-500ml', (SELECT id FROM categories WHERE slug='household'), 'Harpic',     '500 ml',    95,  95, 55, '🧴',  NULL,     false, '3402'),
  ('MDH Garam Masala',      'mdh-garam-masala-100g',   (SELECT id FROM categories WHERE slug='spices'),    'MDH',        '100 g',     85,  95, 85, '🌶️', 'sale',   false, '0910'),
  ('Good Day Biscuits',     'good-day-biscuits-200g',  (SELECT id FROM categories WHERE slug='snacks'),    'Britannia',  '200 g',     35,  35, 150, '🍪', 'new',    false, '1905')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- 5. ORDERS
-- =============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8))),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled','refunded')),
  payment_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method    TEXT CHECK (payment_method IN ('razorpay','cod','upi','card','netbanking')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,

  -- Address snapshot (denormalized so it doesn't change if customer updates address)
  delivery_address  JSONB NOT NULL,

  -- Pricing
  subtotal          NUMERIC(10,2) NOT NULL,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_charge   NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL,

  -- Coupon
  coupon_code       TEXT,

  -- Timestamps
  placed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes
  customer_note     TEXT,
  admin_note        TEXT
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_idx ON orders(razorpay_order_id);

-- =============================================================
-- 6. ORDER ITEMS
-- =============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),

  -- Snapshot of product at time of order (prices can change)
  product_name    TEXT NOT NULL,
  product_emoji   TEXT,
  product_weight  TEXT,
  unit_price      NUMERIC(10,2) NOT NULL,
  quantity        INT NOT NULL CHECK (quantity > 0),
  subtotal        NUMERIC(10,2) NOT NULL,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  hsn_code        TEXT
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- =============================================================
-- 7. COUPONS
-- =============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(10,2),                  -- cap for percent discounts
  usage_limit     INT,                            -- NULL = unlimited
  used_count      INT NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, usage_limit)
VALUES ('GOYAL10', 'Welcome offer — 10% off first order', 'percent', 10, 200, 1000)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- 8. INVENTORY LOGS (audit trail of stock changes)
-- =============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  change_qty      INT NOT NULL,                   -- negative = deducted, positive = added
  reason          TEXT NOT NULL CHECK (reason IN ('order','restock','adjustment','return','damage')),
  reference_id    UUID,                           -- order_id if reason=order
  note            TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_logs_product_idx ON inventory_logs(product_id, created_at DESC);

-- =============================================================
-- 9. AUTO-DEDUCT INVENTORY ON ORDER CONFIRMED
-- =============================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only deduct when status changes TO confirmed
  IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    -- Deduct stock for each item
    UPDATE products p
    SET stock_qty = p.stock_qty - oi.quantity,
        updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;

    -- Write inventory log
    INSERT INTO inventory_logs (product_id, change_qty, reason, reference_id)
    SELECT oi.product_id, -oi.quantity, 'order', NEW.id
    FROM order_items oi WHERE oi.order_id = NEW.id;
  END IF;

  -- Restore stock on cancellation
  IF OLD.status NOT IN ('cancelled','refunded') AND NEW.status = 'cancelled' THEN
    UPDATE products p
    SET stock_qty = p.stock_qty + oi.quantity,
        updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;

    INSERT INTO inventory_logs (product_id, change_qty, reason, reference_id, note)
    SELECT oi.product_id, oi.quantity, 'return', NEW.id, 'Order cancelled'
    FROM order_items oi WHERE oi.order_id = NEW.id;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_inventory_trigger ON orders;
CREATE TRIGGER order_inventory_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_order();

-- =============================================================
-- 10. AUTO-UPDATE updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_products_updated_at    BEFORE UPDATE ON products    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- 11. ROW LEVEL SECURITY (RLS) — CRITICAL SECURITY LAYER
-- =============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs  ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER function to check admin role without triggering RLS recursion.
-- Direct EXISTS (SELECT 1 FROM profiles ...) in policies causes infinite recursion
-- because evaluating profiles policies requires checking profiles again.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- profiles: users read/update own row; admin full access via SECURITY DEFINER fn
CREATE POLICY "profiles_self_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"   ON profiles FOR ALL   USING (is_admin());

-- addresses: users own their addresses
CREATE POLICY "addresses_owner" ON addresses FOR ALL USING (auth.uid() = user_id);

-- categories: public read, admin write
CREATE POLICY "categories_public_read"  ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "categories_admin_write"  ON categories FOR ALL    USING (is_admin());

-- products: public read of active products, admin full access
CREATE POLICY "products_public_read"    ON products FOR SELECT USING (is_active = true);
CREATE POLICY "products_admin_all"      ON products FOR ALL    USING (is_admin());

-- orders: customers see only their own orders
CREATE POLICY "orders_owner_select"    ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_owner_insert"    ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_admin_all"       ON orders FOR ALL USING (is_admin());

-- order_items: accessible via parent order
CREATE POLICY "order_items_owner"      ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "order_items_admin"      ON order_items FOR ALL USING (is_admin());

-- coupons: public can read active ones (to validate), admin manages
CREATE POLICY "coupons_public_read"    ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "coupons_admin_all"      ON coupons FOR ALL    USING (is_admin());

-- inventory_logs: admin only
CREATE POLICY "inventory_logs_admin"   ON inventory_logs FOR ALL USING (is_admin());

-- =============================================================
-- 12. USEFUL VIEWS FOR ADMIN DASHBOARD
-- =============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales AS
SELECT
  DATE(placed_at) AS date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) AS delivered_revenue,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM orders
GROUP BY DATE(placed_at)
ORDER BY date DESC;

-- Low stock alert view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT p.id, p.name, p.emoji, p.stock_qty, p.low_stock_threshold,
       c.name AS category
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.stock_qty <= p.low_stock_threshold AND p.is_active = true
ORDER BY p.stock_qty ASC;

-- =============================================================
-- Done! Schema v1.0 — Goyal General Store
-- =============================================================
