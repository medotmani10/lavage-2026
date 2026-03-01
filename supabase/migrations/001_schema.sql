-- ============================================================
-- CLEAN SCHEMA MASTER FILE
-- ============================================================

-- --- Source: 000_verify_setup.sql ---
-- ============================================================
-- SETUP VERIFICATION SCRIPT
-- Run this to check if your database is properly configured
-- ============================================================

-- Check if tables exist
SELECT 
  'Tables Check' as step,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- Check if users table has data
SELECT 
  'Users Table' as step,
  COUNT(*) as user_count
FROM users;

-- Check if RLS is enabled on tables
SELECT 
  'RLS Check' as step,
  COUNT(*) as rls_enabled_count
FROM pg_policies 
WHERE schemaname = 'public';

-- Check if helper functions exist
SELECT 
  'Functions Check' as step,
  COUNT(*) as function_count
FROM pg_proc 
WHERE proname IN ('get_current_user_id', 'get_current_user_role', 'user_has_role', 'create_user_record');

-- List all tables (for debugging)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- --- Source: 001_complete_schema.sql ---
-- ============================================================
-- Lavage & Vidange ERP 2026
-- COMPLETE DATABASE MIGRATION (Clean Install)
-- Copy this entire file and run it in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: CLEANUP (Drop everything if re-running)
-- ============================================================

-- Drop the auth trigger safely (auth.users always exists)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- Drop all functions (CASCADE removes dependent triggers automatically)
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS public.update_ticket_totals() CASCADE;
DROP FUNCTION IF EXISTS public.update_stock_on_ticket_complete() CASCADE;
DROP FUNCTION IF EXISTS public.create_commission_on_ticket_complete() CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_balance_on_payment() CASCADE;
DROP FUNCTION IF EXISTS public.update_loyalty_points_on_payment() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(user_role) CASCADE;



DROP VIEW IF EXISTS view_daily_revenue;
DROP VIEW IF EXISTS view_current_queue;
DROP VIEW IF EXISTS view_low_stock_products;
DROP VIEW IF EXISTS view_employee_commissions;
DROP VIEW IF EXISTS view_customer_debts;
DROP VIEW IF EXISTS view_dashboard_stats;

DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS purchase_invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS ticket_products CASCADE;
DROP TABLE IF EXISTS ticket_services CASCADE;
DROP TABLE IF EXISTS queue_tickets CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS product_category CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS debt_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS loyalty_transaction_type CASCADE;

-- ============================================================
-- STEP 2: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 3: ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'worker');
CREATE TYPE product_category AS ENUM ('tire', 'oil', 'accessory', 'other');
CREATE TYPE ticket_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE ticket_priority AS ENUM ('normal', 'priority', 'vip');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'credit', 'mixed');
CREATE TYPE debt_status AS ENUM ('pending', 'partial', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('pending', 'partial', 'completed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('revenue', 'expense', 'transfer', 'adjustment');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'return', 'damage');
CREATE TYPE loyalty_transaction_type AS ENUM ('earned', 'redeemed', 'adjusted', 'expired');

-- ============================================================
-- STEP 4: TABLES
-- ============================================================

-- 4.1 USERS (mirrors auth.users)
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) UNIQUE NOT NULL,
  full_name   VARCHAR(255),
  role        user_role NOT NULL DEFAULT 'worker',
  phone       VARCHAR(50),
  avatar_url  VARCHAR(500),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email  ON public.users(email);
CREATE INDEX idx_users_role   ON public.users(role);
CREATE INDEX idx_users_active ON public.users(active);

-- 4.2 CUSTOMERS
CREATE TABLE public.customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50) NOT NULL,
  email           VARCHAR(255),
  address         TEXT,
  credit_limit    DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  loyalty_points  INTEGER DEFAULT 0,
  notes           TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_phone   ON public.customers(phone);
CREATE INDEX idx_customers_email   ON public.customers(email);
CREATE INDEX idx_customers_active  ON public.customers(active);

-- 4.3 VEHICLES
CREATE TABLE public.vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plate_number  VARCHAR(50) NOT NULL,
  brand         VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          INTEGER NOT NULL,
  odometer      INTEGER DEFAULT 0,
  vin           VARCHAR(100),
  color         VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX idx_vehicles_plate       ON public.vehicles(plate_number);

-- 4.4 SERVICES
CREATE TABLE public.services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  price            DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost             DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 30,
  commission_rate  DECIMAL(5,2) DEFAULT 0,
  commission_fixed DECIMAL(10,2) DEFAULT 0,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_services_active ON public.services(active);

-- 4.5 SUPPLIERS
CREATE TABLE public.suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name    VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255),
  phone           VARCHAR(50) NOT NULL,
  email           VARCHAR(255),
  address         TEXT,
  tax_id          VARCHAR(100),
  balance_owed    DECIMAL(12,2) DEFAULT 0,
  credit_limit    DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_suppliers_phone  ON public.suppliers(phone);
CREATE INDEX idx_suppliers_active ON public.suppliers(active);

-- 4.6 PRODUCTS
CREATE TABLE public.products (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  category       product_category NOT NULL DEFAULT 'other',
  sku            VARCHAR(100) UNIQUE NOT NULL,
  barcode        VARCHAR(100),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock      INTEGER NOT NULL DEFAULT 5,
  unit_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_id    UUID REFERENCES public.suppliers(id),
  tire_width     INTEGER,
  tire_height    INTEGER,
  tire_diameter  INTEGER,
  oil_viscosity  VARCHAR(20),
  oil_volume     DECIMAL(8,2),
  brand          VARCHAR(100),
  active         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_sku      ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_stock    ON public.products(stock_quantity);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);

-- 4.7 EMPLOYEES
CREATE TABLE public.employees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  position            VARCHAR(100) NOT NULL,
  phone               VARCHAR(50) NOT NULL,
  emergency_contact   VARCHAR(255),
  base_salary         DECIMAL(10,2) DEFAULT 0,
  commission_rate     DECIMAL(5,2) DEFAULT 0,
  total_commissions   DECIMAL(12,2) DEFAULT 0,
  paid_commissions    DECIMAL(12,2) DEFAULT 0,
  pending_commissions DECIMAL(12,2) DEFAULT 0,
  hire_date           DATE,
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_active  ON public.employees(active);

-- 4.8 ATTENDANCE
CREATE TABLE public.attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in    TIMESTAMPTZ NOT NULL,
  check_out   TIMESTAMPTZ,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, date);

-- 4.9 QUEUE TICKETS
CREATE TABLE public.queue_tickets (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number        VARCHAR(50) UNIQUE,
  customer_id          UUID NOT NULL REFERENCES public.customers(id),
  vehicle_id           UUID NOT NULL REFERENCES public.vehicles(id),
  service_ids          UUID[] DEFAULT '{}',
  product_items        JSONB DEFAULT '[]'::jsonb,
  status               ticket_status NOT NULL DEFAULT 'pending',
  priority             ticket_priority NOT NULL DEFAULT 'normal',
  assigned_employee_id UUID REFERENCES public.employees(id),
  subtotal             DECIMAL(12,2) DEFAULT 0,
  tax_rate             DECIMAL(5,2) DEFAULT 0,
  tax_amount           DECIMAL(12,2) DEFAULT 0,
  discount             DECIMAL(12,2) DEFAULT 0,
  total_amount         DECIMAL(12,2) DEFAULT 0,
  paid_amount          DECIMAL(12,2) DEFAULT 0,
  payment_method       payment_method,
  notes                TEXT,
  internal_notes       TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancelled_reason     TEXT
);
CREATE INDEX idx_queue_tickets_status   ON public.queue_tickets(status);
CREATE INDEX idx_queue_tickets_customer ON public.queue_tickets(customer_id);
CREATE INDEX idx_queue_tickets_created  ON public.queue_tickets(created_at);

-- 4.10 TICKET SERVICES
CREATE TABLE public.ticket_services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES public.services(id),
  quantity    INTEGER DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_services_ticket ON public.ticket_services(ticket_id);

-- 4.11 TICKET PRODUCTS
CREATE TABLE public.ticket_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_products_ticket ON public.ticket_products(ticket_id);

-- 4.12 COMMISSIONS
CREATE TABLE public.commissions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  ticket_id           UUID NOT NULL REFERENCES public.queue_tickets(id),
  service_id          UUID REFERENCES public.services(id),
  amount              DECIMAL(10,2) NOT NULL,
  calculation_method  VARCHAR(50) DEFAULT 'percentage',
  rate_applied        DECIMAL(5,2) DEFAULT 0,
  paid                BOOLEAN DEFAULT false,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_commissions_employee ON public.commissions(employee_id);
CREATE INDEX idx_commissions_paid     ON public.commissions(paid);

-- 4.13 DEBTS
CREATE TABLE public.debts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ticket_id        UUID REFERENCES public.queue_tickets(id),
  original_amount  DECIMAL(12,2) NOT NULL,
  paid_amount      DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) NOT NULL,
  due_date         DATE,
  status           debt_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_debts_customer ON public.debts(customer_id);
CREATE INDEX idx_debts_status   ON public.debts(status);

-- 4.14 PAYMENTS
CREATE TABLE public.payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id        UUID REFERENCES public.queue_tickets(id),
  debt_id          UUID REFERENCES public.debts(id),
  customer_id      UUID NOT NULL REFERENCES public.customers(id),
  amount           DECIMAL(12,2) NOT NULL,
  payment_method   payment_method NOT NULL,
  reference_number VARCHAR(100),
  received_by      UUID REFERENCES public.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_created  ON public.payments(created_at);

-- 4.15 PURCHASE INVOICES
CREATE TABLE public.purchase_invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id),
  invoice_number   VARCHAR(100) NOT NULL,
  invoice_date     DATE NOT NULL,
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal         DECIMAL(12,2) DEFAULT 0,
  tax_amount       DECIMAL(12,2) DEFAULT 0,
  total_amount     DECIMAL(12,2) NOT NULL,
  paid_amount      DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  status           invoice_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id);
CREATE INDEX idx_purchase_invoices_status   ON public.purchase_invoices(status);

-- 4.16 FINANCIAL TRANSACTIONS
CREATE TABLE public.financial_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            transaction_type NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  description_fr  TEXT NOT NULL,
  description_ar  TEXT NOT NULL,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  category        VARCHAR(100),
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_financial_transactions_type    ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_created ON public.financial_transactions(created_at);

-- 4.17 STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_cost     DECIMAL(10,2),
  reference_type VARCHAR(50),
  reference_id  UUID,
  performed_by  UUID REFERENCES public.users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);

-- 4.18 LOYALTY TRANSACTIONS
CREATE TABLE public.loyalty_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ticket_id        UUID REFERENCES public.queue_tickets(id),
  transaction_type loyalty_transaction_type NOT NULL,
  points           INTEGER NOT NULL,
  balance_after    INTEGER NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);

-- ============================================================
-- STEP 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- 5.1 Auto-create public.users when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'worker';
BEGIN
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'worker';
  END;

  INSERT INTO public.users (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    v_role,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5.2 Update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at              BEFORE UPDATE ON public.users              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at          BEFORE UPDATE ON public.customers          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at           BEFORE UPDATE ON public.vehicles           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at           BEFORE UPDATE ON public.services           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at           BEFORE UPDATE ON public.products           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at          BEFORE UPDATE ON public.suppliers          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at          BEFORE UPDATE ON public.employees          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_debts_updated_at              BEFORE UPDATE ON public.debts              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_invoices_updated_at  BEFORE UPDATE ON public.purchase_invoices  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5.3 Auto-generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  v_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM LENGTH(v_prefix)+2) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.queue_tickets
   WHERE ticket_number LIKE v_prefix || '-%';
  NEW.ticket_number := v_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_queue_ticket
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

-- 5.4 Auto-calculate ticket totals
CREATE OR REPLACE FUNCTION public.update_ticket_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal     := COALESCE(NEW.subtotal, 0);
  NEW.tax_rate     := COALESCE(NEW.tax_rate, 0);
  NEW.discount     := COALESCE(NEW.discount, 0);
  NEW.tax_amount   := NEW.subtotal * (NEW.tax_rate / 100);
  NEW.total_amount := NEW.subtotal + NEW.tax_amount - NEW.discount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_ticket_totals
  BEFORE INSERT OR UPDATE ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_totals();

-- 5.5 Decrease stock when ticket is completed
CREATE OR REPLACE FUNCTION public.update_stock_on_ticket_complete()
RETURNS TRIGGER AS $$
DECLARE v_item JSONB; v_prod RECORD;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.product_items) LOOP
      SELECT id, stock_quantity INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::UUID;
      IF FOUND THEN
        UPDATE public.products SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER WHERE id = v_prod.id;
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id)
          VALUES (v_prod.id, 'out', (v_item->>'quantity')::INTEGER, 'ticket', NEW.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_ticket_complete_update_stock
  AFTER UPDATE ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_ticket_complete();

-- 5.6 Create commission when ticket is completed
CREATE OR REPLACE FUNCTION public.create_commission_on_ticket_complete()
RETURNS TRIGGER AS $$
DECLARE v_emp RECORD; v_commission DECIMAL(10,2);
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.assigned_employee_id IS NOT NULL THEN
    SELECT id, commission_rate INTO v_emp FROM public.employees WHERE id = NEW.assigned_employee_id;
    IF FOUND AND v_emp.commission_rate > 0 THEN
      v_commission := NEW.total_amount * (v_emp.commission_rate / 100);
      INSERT INTO public.commissions (employee_id, ticket_id, amount, calculation_method, rate_applied)
        VALUES (v_emp.id, NEW.id, v_commission, 'percentage', v_emp.commission_rate);
      UPDATE public.employees
        SET pending_commissions = pending_commissions + v_commission,
            total_commissions   = total_commissions   + v_commission
       WHERE id = v_emp.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_ticket_complete_create_commission
  AFTER UPDATE ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_on_ticket_complete();

-- 5.7 Update customer balance on payment
CREATE OR REPLACE FUNCTION public.update_customer_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.customers SET current_balance = current_balance - NEW.amount WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_update_customer_balance
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_balance_on_payment();

-- 5.8 Update loyalty points on payment
CREATE OR REPLACE FUNCTION public.update_loyalty_points_on_payment()
RETURNS TRIGGER AS $$
DECLARE v_points INTEGER;
BEGIN
  v_points := FLOOR(NEW.amount)::INTEGER;
  IF v_points > 0 THEN
    UPDATE public.customers SET loyalty_points = loyalty_points + v_points WHERE id = NEW.customer_id;
    INSERT INTO public.loyalty_transactions (customer_id, ticket_id, transaction_type, points, balance_after)
      SELECT NEW.customer_id, NEW.ticket_id, 'earned', v_points, loyalty_points
        FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_update_loyalty_points
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_points_on_payment();

-- ============================================================
-- STEP 6: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_role(required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN CASE required_role
    WHEN 'admin'   THEN v_role = 'admin'
    WHEN 'manager' THEN v_role IN ('admin', 'manager')
    WHEN 'cashier' THEN v_role IN ('admin', 'manager', 'cashier')
    WHEN 'worker'  THEN v_role IN ('admin', 'manager', 'cashier', 'worker')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions  ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Note: SECURITY DEFINER functions bypass RLS automatically (runs as postgres)
-- So the trigger handle_new_auth_user will always work regardless of these policies
CREATE POLICY users_select  ON public.users FOR SELECT  USING (id = auth.uid() OR public.user_has_role('manager'));
CREATE POLICY users_insert  ON public.users FOR INSERT  WITH CHECK (true); -- trigger needs this open
CREATE POLICY users_update  ON public.users FOR UPDATE  USING (id = auth.uid() OR public.user_has_role('admin'));
CREATE POLICY users_delete  ON public.users FOR DELETE  USING (public.user_has_role('admin'));

-- Customers policies
CREATE POLICY customers_select  ON public.customers FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY customers_insert  ON public.customers FOR INSERT  WITH CHECK (public.user_has_role('cashier'));
CREATE POLICY customers_update  ON public.customers FOR UPDATE  USING (public.user_has_role('cashier'));
CREATE POLICY customers_delete  ON public.customers FOR DELETE  USING (public.user_has_role('admin'));

-- Vehicles policies
CREATE POLICY vehicles_select  ON public.vehicles FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY vehicles_insert  ON public.vehicles FOR INSERT  WITH CHECK (public.user_has_role('cashier'));
CREATE POLICY vehicles_update  ON public.vehicles FOR UPDATE  USING (public.user_has_role('cashier'));
CREATE POLICY vehicles_delete  ON public.vehicles FOR DELETE  USING (public.user_has_role('manager'));

-- Services policies
CREATE POLICY services_select ON public.services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY services_modify ON public.services FOR ALL   USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));

-- Products policies
CREATE POLICY products_select ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (public.user_has_role('manager'));
CREATE POLICY products_update ON public.products FOR UPDATE USING (public.user_has_role('manager'));
CREATE POLICY products_delete ON public.products FOR DELETE USING (public.user_has_role('admin'));

-- Suppliers policies
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY suppliers_modify ON public.suppliers FOR ALL   USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));

-- Employees policies
CREATE POLICY employees_select ON public.employees FOR SELECT USING (user_id = auth.uid() OR public.user_has_role('manager'));
CREATE POLICY employees_modify ON public.employees FOR ALL   USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));

-- Attendance policies
CREATE POLICY attendance_select ON public.attendance FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR public.user_has_role('manager'));
CREATE POLICY attendance_insert ON public.attendance FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR public.user_has_role('manager'));
CREATE POLICY attendance_update ON public.attendance FOR UPDATE USING (public.user_has_role('manager'));

-- Queue tickets policies
CREATE POLICY queue_tickets_select ON public.queue_tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY queue_tickets_insert ON public.queue_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY queue_tickets_update ON public.queue_tickets FOR UPDATE USING (assigned_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR public.user_has_role('manager'));
CREATE POLICY queue_tickets_delete ON public.queue_tickets FOR DELETE USING (public.user_has_role('manager'));

-- Ticket services/products policies
CREATE POLICY ticket_services_select ON public.ticket_services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY ticket_services_insert ON public.ticket_services FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY ticket_services_modify ON public.ticket_services FOR ALL   USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));
CREATE POLICY ticket_products_select ON public.ticket_products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY ticket_products_insert ON public.ticket_products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY ticket_products_modify ON public.ticket_products FOR ALL   USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));

-- Finance/commissions/debts/payments
CREATE POLICY commissions_select ON public.commissions        FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR public.user_has_role('manager'));
CREATE POLICY commissions_modify ON public.commissions        FOR ALL    USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));
CREATE POLICY debts_select       ON public.debts              FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY debts_modify       ON public.debts              FOR ALL    USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));
CREATE POLICY payments_select    ON public.payments           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY payments_insert    ON public.payments           FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY payments_modify    ON public.payments           FOR ALL    USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));
CREATE POLICY invoices_select    ON public.purchase_invoices  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY invoices_modify    ON public.purchase_invoices  FOR ALL    USING (public.user_has_role('manager')) WITH CHECK (public.user_has_role('manager'));
CREATE POLICY finance_select     ON public.financial_transactions FOR SELECT USING (public.user_has_role('manager'));
CREATE POLICY finance_insert     ON public.financial_transactions FOR INSERT WITH CHECK (public.user_has_role('manager'));
CREATE POLICY finance_modify     ON public.financial_transactions FOR ALL   USING (public.user_has_role('admin')) WITH CHECK (public.user_has_role('admin'));
CREATE POLICY stock_select       ON public.stock_movements    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY stock_insert       ON public.stock_movements    FOR INSERT WITH CHECK (public.user_has_role('manager'));
CREATE POLICY loyalty_select     ON public.loyalty_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY loyalty_insert     ON public.loyalty_transactions FOR INSERT WITH CHECK (public.user_has_role('manager'));

-- ============================================================
-- STEP 8: PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================
-- STEP 9: DEFAULT SERVICES SEED DATA
-- ============================================================
INSERT INTO public.services (name_fr, name_ar, price, duration_minutes, commission_rate) VALUES
  ('Lavage Complet',   'غسيل كامل',            1500, 30, 10),
  ('Vidange Moteur',   'تغيير زيت المحرك',      3500, 45, 15),
  ('Lavage + Vidange', 'غسيل + تغيير زيت',      4500, 60, 12),
  ('Équilibrage',      'موازنة العجلات',         2000, 30, 10),
  ('Alignement 3D',    'محاذاة 3D',              3000, 45, 15),
  ('Climatisation',    'صيانة المكيف',            5000, 60, 20),
  ('Freins',           'صيانة الفرامل',          4000, 60, 15),
  ('Diagnostic',       'تشخيص الأعطال',          2500, 30, 10);

-- ============================================================
-- DONE! Now go to Supabase Auth > Users > Create User
-- The trigger will automatically create the public.users record
-- ============================================================


-- --- Source: 003_fix_users_table.sql ---
-- ============================================================
-- FIX: Full schema repair - users table + auth trigger
-- Migration: 003_fix_users_table.sql
-- ============================================================

-- STEP 1: Create user_role enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'worker');
  END IF;
END$$;

-- STEP 2: Create users table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'worker',
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Add full_name column if table exists but column is missing
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- STEP 4: Add other potentially missing columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'worker';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- STEP 5: Fill NULL full_name with email prefix
UPDATE public.users
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL;

-- ============================================================
-- STEP 6: Create auth trigger to auto-create public.users record
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Safely cast role from metadata, fallback to 'worker'
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'worker'::user_role;
  END;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- STEP 8: Grant permissions
-- ============================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- ============================================================
-- VERIFICATION (uncomment to check):
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position;
-- SELECT typname FROM pg_type WHERE typname = 'user_role';
-- ============================================================


-- --- Source: 004_add_service_categories.sql ---
-- Migration to add category column to services table

-- Create the service category enum if it does not exist
DO $$ BEGIN
    CREATE TYPE service_category AS ENUM ('lavage', 'vidange', 'pneumatique');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the category column to the services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category service_category DEFAULT 'lavage'::service_category;


-- --- Source: 005_add_pin_code_to_users.sql ---
-- Add pin_code to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pin_code text;

-- Add comment
COMMENT ON COLUMN public.users.pin_code IS 'Optional PIN code for offline login access';

-- Force schema cache reload (Supabase convention)
NOTIFY pgrst, 'reload schema';


-- --- Source: 006_enable_realtime.sql ---
-- Enable Realtime for all core tables

-- First, drop the publication if it exists to recreate it clean
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add all tables that the app needs to sync in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE services;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_services;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_products;
ALTER PUBLICATION supabase_realtime ADD TABLE commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE debts;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_transactions;

-- Note: In Supabase, you also need to ensure replication is enabled in the Dashboard > Database > Replication
-- but this SQL handles the Postgres publication side.


-- --- Source: 007_add_employee_name.sql ---
-- Add full_name column to employees to allow standalone creation
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS full_name text;

-- Populate existing employees with their linked user's full_name
UPDATE public.employees e
SET full_name = u.full_name
FROM public.users u
WHERE e.user_id = u.id AND e.full_name IS NULL;

-- Make full_name NOT NULL now that existing rows are populated
ALTER TABLE public.employees
ALTER COLUMN full_name SET NOT NULL;

-- Update RLS policies to allow employees to be viewed/managed
-- (This shouldn't change the existing logic, just making sure the column is accessible)


-- --- Source: 009_enforce_ticket_sequence.sql ---
-- ============================================================
-- 009: Race-safe sequential ticket numbering via counter table
-- ============================================================

-- 1. Clean up all old triggers and functions
DROP TRIGGER IF EXISTS before_insert_queue_ticket_force_sequence ON public.queue_tickets;
DROP TRIGGER IF EXISTS before_insert_queue_ticket ON public.queue_tickets;
DROP FUNCTION IF EXISTS public.generate_ticket_number();
DROP FUNCTION IF EXISTS public.enforce_daily_ticket_sequence();

-- 2. Create a dedicated atomic counter table (one row per day)
CREATE TABLE IF NOT EXISTS public.ticket_counters (
  counter_date DATE PRIMARY KEY,
  counter      INTEGER NOT NULL DEFAULT 0
);

-- Allow the trigger function (SECURITY DEFINER) to access this table
GRANT ALL ON public.ticket_counters TO postgres, service_role;

-- 3. The trigger function: uses INSERT ... ON CONFLICT DO UPDATE 
--    which is 100% atomic in PostgreSQL — no race condition possible.
CREATE OR REPLACE FUNCTION public.enforce_daily_ticket_sequence()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- Atomically increment or initialize today's counter
  INSERT INTO public.ticket_counters (counter_date, counter)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (counter_date) DO UPDATE
    SET counter = ticket_counters.counter + 1
  RETURNING counter INTO v_seq;

  -- Format: 20260301-0001, 20260301-0002, ... (resets each midnight)
  NEW.ticket_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to queue_tickets (fires on every INSERT)
CREATE TRIGGER before_insert_queue_ticket_force_sequence
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_ticket_sequence();

-- 5. Seed today's counter from existing tickets (so we don't re-use old numbers)
INSERT INTO public.ticket_counters (counter_date, counter)
SELECT CURRENT_DATE,
       COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 10) AS INTEGER)), 0)
  FROM public.queue_tickets
 WHERE created_at::date = CURRENT_DATE
   AND ticket_number LIKE TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
ON CONFLICT (counter_date) DO UPDATE
  SET counter = EXCLUDED.counter;
