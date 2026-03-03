-- ================================================================
-- LAVAGE VIDA — SCRIPT DE CORRECTION COMPLET v3
-- Exécutez CE FICHIER ENTIER dans Supabase → SQL Editor → Run
-- ================================================================

-- ============================================================
-- PARTIE 0: CONTRAINTES — Supprimer les contraintes problématiques
-- ============================================================
ALTER TABLE queue_tickets DROP CONSTRAINT IF EXISTS queue_tickets_ticket_number_key;

-- ============================================================
-- PARTIE 1: SCHEMA — Ajouter les colonnes manquantes
-- ============================================================

-- vehicles: colonne 'active' manquante dans le code
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
UPDATE vehicles SET active = true WHERE active IS NULL;

-- vehicles: colonne 'updated_at' manquante
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- services: colonne 'category' utilisée dans le code mais absente du schema
ALTER TABLE services ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- ============================================================
-- PARTIE 2: REALTIME — Publication pour toutes les tables
-- ============================================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  customers, vehicles, services, products, employees,
  queue_tickets, ticket_services, ticket_products,
  payments, debts, financial_transactions, suppliers,
  users, commissions, purchase_invoices, stock_movements;

-- ============================================================
-- PARTIE 3: RLS — Politiques d'accès (authenticated users)
-- ============================================================

-- CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON customers;
CREATE POLICY "Allow all for authenticated" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- VEHICLES
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;
CREATE POLICY "Allow all for authenticated" ON vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SERVICES
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON services;
CREATE POLICY "Allow all for authenticated" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON products;
CREATE POLICY "Allow all for authenticated" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLOYEES
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON employees;
CREATE POLICY "Allow all for authenticated" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- QUEUE_TICKETS
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON queue_tickets;
CREATE POLICY "Allow all for authenticated" ON queue_tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TICKET_SERVICES
ALTER TABLE ticket_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON ticket_services;
CREATE POLICY "Allow all for authenticated" ON ticket_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TICKET_PRODUCTS
ALTER TABLE ticket_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON ticket_products;
CREATE POLICY "Allow all for authenticated" ON ticket_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON payments;
CREATE POLICY "Allow all for authenticated" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEBTS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON debts;
CREATE POLICY "Allow all for authenticated" ON debts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FINANCIAL_TRANSACTIONS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON financial_transactions;
CREATE POLICY "Allow all for authenticated" ON financial_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SUPPLIERS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON suppliers;
CREATE POLICY "Allow all for authenticated" ON suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON users;
CREATE POLICY "Allow all for authenticated" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMMISSIONS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON commissions;
CREATE POLICY "Allow all for authenticated" ON commissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PURCHASE_INVOICES
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON purchase_invoices;
CREATE POLICY "Allow all for authenticated" ON purchase_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STOCK_MOVEMENTS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON stock_movements;
CREATE POLICY "Allow all for authenticated" ON stock_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LOYALTY_TRANSACTIONS (optionnel)
DO $$ BEGIN
  ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all for authenticated" ON loyalty_transactions;
  CREATE POLICY "Allow all for authenticated" ON loyalty_transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- PARTIE 4: VERIFICATION
-- ============================================================
SELECT
  t.tablename,
  CASE WHEN p.policyname IS NOT NULL THEN '✅ OK' ELSE '❌ MANQUANT' END as rls_status
FROM (
  VALUES
    ('customers'), ('vehicles'), ('services'), ('products'),
    ('employees'), ('queue_tickets'), ('ticket_services'), ('ticket_products'),
    ('payments'), ('debts'), ('financial_transactions'), ('suppliers'),
    ('users'), ('commissions'), ('purchase_invoices'), ('stock_movements')
) t(tablename)
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
ORDER BY t.tablename;
