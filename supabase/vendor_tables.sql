-- Vendor Management Tables
-- Run this in Supabase SQL Editor

-- 1. vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  schedule TEXT,
  payment_terms TEXT,
  rate TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. vendor_order_guide
CREATE TABLE IF NOT EXISTS vendor_order_guide (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'each',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  min_order_qty INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. vendor_orders
CREATE TABLE IF NOT EXISTS vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(10,2) DEFAULT 0,
  logged_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. vendor_order_items
CREATE TABLE IF NOT EXISTS vendor_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES vendor_orders(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  qty NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. vendor_events (recurring + one-time)
CREATE TABLE IF NOT EXISTS vendor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'delivery',
  recurrence TEXT NOT NULL DEFAULT 'one_time',
  day_of_week INTEGER,
  week_of_month INTEGER,
  specific_date DATE,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. vendor_expenses (COGS / spending tracker)
CREATE TABLE IF NOT EXISTS vendor_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_order_id UUID REFERENCES vendor_orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by TEXT,
  expense_type TEXT NOT NULL DEFAULT 'order',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_hotel ON vendors(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_order_guide_vendor ON vendor_order_guide(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_hotel ON vendor_orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor ON vendor_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_order_items_order ON vendor_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_events_hotel ON vendor_events(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_events_vendor ON vendor_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_expenses_hotel ON vendor_expenses(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vendor_expenses_date ON vendor_expenses(expense_date);

-- RLS Policies
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_order_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_expenses ENABLE ROW LEVEL SECURITY;

-- vendors
CREATE POLICY vendors_auth_select ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY vendors_auth_insert ON vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vendors_auth_update ON vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vendors_auth_delete ON vendors FOR DELETE TO authenticated USING (true);

-- vendor_order_guide
CREATE POLICY vog_auth_select ON vendor_order_guide FOR SELECT TO authenticated USING (true);
CREATE POLICY vog_auth_insert ON vendor_order_guide FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vog_auth_update ON vendor_order_guide FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vog_auth_delete ON vendor_order_guide FOR DELETE TO authenticated USING (true);

-- vendor_orders
CREATE POLICY vo_auth_select ON vendor_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY vo_auth_insert ON vendor_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vo_auth_update ON vendor_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vo_auth_delete ON vendor_orders FOR DELETE TO authenticated USING (true);

-- vendor_order_items
CREATE POLICY voi_auth_select ON vendor_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY voi_auth_insert ON vendor_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY voi_auth_update ON vendor_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY voi_auth_delete ON vendor_order_items FOR DELETE TO authenticated USING (true);

-- vendor_events
CREATE POLICY ve_auth_select ON vendor_events FOR SELECT TO authenticated USING (true);
CREATE POLICY ve_auth_insert ON vendor_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ve_auth_update ON vendor_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ve_auth_delete ON vendor_events FOR DELETE TO authenticated USING (true);

-- vendor_expenses
CREATE POLICY vex_auth_select ON vendor_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY vex_auth_insert ON vendor_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY vex_auth_update ON vendor_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vex_auth_delete ON vendor_expenses FOR DELETE TO authenticated USING (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vog_updated_at BEFORE UPDATE ON vendor_order_guide FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vo_updated_at BEFORE UPDATE ON vendor_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ve_updated_at BEFORE UPDATE ON vendor_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();