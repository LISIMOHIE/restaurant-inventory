-- Restaurant Inventory Management System
-- Initial Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ROLES & AUTH
-- =========================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  branch_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- BRANCHES (Locations/Outlets)
-- =========================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed branches from the Excel data
INSERT INTO branches (name, name_ar) VALUES
  ('Soul', 'سول'),
  ('Venz', 'فينز'),
  ('Adour Branch', 'أدور (فرع)'),
  ('Tree Trunk', 'ترى ترنك'),
  ('Muwajjah', 'موجه');

-- Update profiles to reference branches
ALTER TABLE profiles ADD CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

-- =========================================
-- SUPPLIERS
-- =========================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed suppliers from Excel data
INSERT INTO suppliers (name, name_ar) VALUES
  ('Jet', 'جيت'),
  ('Cola', 'كولا'),
  ('Splayed', 'سبلايد'),
  ('Jersey', 'جيرسى'),
  ('Om Mahmoud / Abu Ouf', 'عم محمود / ابو عوف'),
  ('Om Mahmoud / Ben Shahin', 'عم محمود / بن شاهين'),
  ('Kunur', 'كنور'),
  ('Om Mahmoud / Samy Salama', 'عم محمود / سامى سلامة'),
  ('Al-Raei', 'الراعى'),
  ('Al-Qubaisi', 'القبيصى'),
  ('Eye To Me', 'ايه توا م'),
  ('Helmar', 'هيلمر'),
  ('Al-Mustafa', 'المصطفى'),
  ('Halwani', 'حلوانى'),
  ('Amkay', 'امكاى'),
  ('Al-Sharq', 'الشرق'),
  ('Tamry', 'تمرى'),
  ('Feegon', 'فيجن'),
  ('Smiley', 'سمايلى'),
  ('King M', 'كينج ام'),
  ('Bird Fast', 'بيرد فست'),
  ('Chef Ismail', 'شيف اسماعيل'),
  ('Al-Alamiya', 'العالمية'),
  ('Al-Moraa', 'المراعى'),
  ('Ouh', 'اوه'),
  ('Prints', 'مطبوعات'),
  ('Meats', 'لحوم'),
  ('Factory Prep', 'مصنع تجهيزات'),
  ('Johaina', 'جهينة');

-- =========================================
-- PRODUCT CATEGORIES
-- =========================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  parent_id UUID REFERENCES categories(id),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, name_ar, color) VALUES
  ('Barista/Beverages', 'بارستا /مشروبات', '#8b5cf6'),
  ('Hall/Packaging', 'صاله /تغليف', '#f59e0b'),
  ('Hall/Cleaning', 'صاله /نظافة', '#10b981'),
  ('Kitchen/Grocery', 'مطبخ /بقاله', '#ef4444');

-- =========================================
-- PRODUCTS / ITEMS
-- =========================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  category_id UUID REFERENCES categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  unit TEXT NOT NULL DEFAULT 'piece',
  unit_ar TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);

-- =========================================
-- INVENTORY (stock per branch per product)
-- =========================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) DEFAULT 0,
  last_counted_at TIMESTAMPTZ,
  last_counted_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);

-- =========================================
-- INVENTORY TRANSACTIONS
-- =========================================
CREATE TYPE transaction_type AS ENUM (
  'purchase',      -- received from supplier
  'adjustment',    -- manual count correction
  'transfer_in',   -- received from another branch
  'transfer_out',  -- sent to another branch
  'consumption',   -- used in production/service
  'waste',         -- spoilage/loss
  'return'         -- returned to supplier
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  type transaction_type NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  reference_id UUID, -- links to purchase_order_items or transfers
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_txn_product ON inventory_transactions(product_id);
CREATE INDEX idx_txn_branch ON inventory_transactions(branch_id);
CREATE INDEX idx_txn_created ON inventory_transactions(created_at DESC);

-- =========================================
-- PURCHASE ORDERS
-- =========================================
CREATE TYPE po_status AS ENUM (
  'draft',
  'ordered',     -- sent to supplier
  'partial',     -- partially received
  'received',    -- fully received
  'cancelled'
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  status po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_branch ON purchase_orders(branch_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- PO counter for auto-numbering
CREATE SEQUENCE po_number_seq START 1000;

-- =========================================
-- PURCHASE ORDER ITEMS
-- =========================================
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_ordered DECIMAL(12,3) NOT NULL,
  quantity_received DECIMAL(12,3) DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  is_received BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_product ON purchase_order_items(product_id);

-- =========================================
-- INVENTORY COUNTS (Audit/Stocktake)
-- =========================================
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE inventory_count_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  system_quantity DECIMAL(12,3),
  counted_quantity DECIMAL(12,3),
  variance DECIMAL(12,3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  notes TEXT
);

-- =========================================
-- VIEWS
-- =========================================

-- Low stock view
CREATE VIEW low_stock_alerts AS
SELECT
  p.id AS product_id,
  p.name,
  p.name_ar,
  p.reorder_level,
  p.unit,
  c.name AS category,
  s.name AS supplier,
  b.id AS branch_id,
  b.name AS branch,
  i.quantity AS current_quantity,
  (p.reorder_level - i.quantity) AS shortage
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN branches b ON b.id = i.branch_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE i.quantity <= p.reorder_level
  AND p.reorder_level > 0
  AND p.is_active = TRUE
ORDER BY (p.reorder_level - i.quantity) DESC;

-- Inventory valuation view
CREATE VIEW inventory_valuation AS
SELECT
  b.id AS branch_id,
  b.name AS branch,
  c.name AS category,
  SUM(i.quantity * p.price) AS total_value,
  COUNT(p.id) AS product_count,
  SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) AS zero_stock_count,
  SUM(CASE WHEN i.quantity <= p.reorder_level AND p.reorder_level > 0 THEN 1 ELSE 0 END) AS low_stock_count
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN branches b ON b.id = i.branch_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE
GROUP BY b.id, b.name, c.name;

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_po_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('po_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_number BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION generate_po_number();

-- Update PO total when items change
CREATE OR REPLACE FUNCTION update_po_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET total_amount = (
    SELECT COALESCE(SUM(total_cost), 0)
    FROM purchase_order_items
    WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
  )
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_poi_update_total AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_po_total();

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

-- Profiles: users see their own, admins see all
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager'))
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- All authenticated users can read reference tables
CREATE POLICY "branches_select" ON branches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_select" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventory_select" ON inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "transactions_select" ON inventory_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "po_select" ON purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "poi_select" ON purchase_order_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "counts_select" ON inventory_counts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "count_items_select" ON inventory_count_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write access for authenticated users (admin/manager for sensitive ops)
CREATE POLICY "branches_write" ON branches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "suppliers_write" ON suppliers FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_write" ON categories FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_write" ON products FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventory_write" ON inventory FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "transactions_write" ON inventory_transactions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "po_write" ON purchase_orders FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "poi_write" ON purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "counts_write" ON inventory_counts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "count_items_write" ON inventory_count_items FOR ALL USING (auth.uid() IS NOT NULL);
