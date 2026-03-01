-- ============================================================
-- CLEAN RLS AND RPC MASTER FILE
-- ============================================================

-- --- Source: 002_rls_policies_clean.sql ---
-- ============================================================
-- Lavage & Vidange ERP 2026
-- Row Level Security (RLS) Policies - CLEAN INSTALL
-- Supabase PostgreSQL
-- ============================================================
-- This script drops existing policies before recreating them
-- Safe to run multiple times
-- ============================================================

-- ============================================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================================

-- Users policies
DROP POLICY IF EXISTS users_read_own_profile ON users;
DROP POLICY IF EXISTS users_insert_admin_only ON users;
DROP POLICY IF EXISTS users_update_own_profile ON users;
DROP POLICY IF EXISTS users_delete_admin_only ON users;

-- Customers policies
DROP POLICY IF EXISTS customers_read_all ON customers;
DROP POLICY IF EXISTS customers_insert_manager ON customers;
DROP POLICY IF EXISTS customers_update_manager ON customers;
DROP POLICY IF EXISTS customers_delete_admin ON customers;

-- Vehicles policies
DROP POLICY IF EXISTS vehicles_read_all ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_manager ON vehicles;
DROP POLICY IF EXISTS vehicles_update_manager ON vehicles;
DROP POLICY IF EXISTS vehicles_delete_admin ON vehicles;

-- Services policies
DROP POLICY IF EXISTS services_read_all ON services;
DROP POLICY IF EXISTS services_modify_manager ON services;

-- Products policies
DROP POLICY IF EXISTS products_read_all ON products;
DROP POLICY IF EXISTS products_insert_manager ON products;
DROP POLICY IF EXISTS products_update_manager ON products;
DROP POLICY IF EXISTS products_delete_admin ON products;

-- Suppliers policies
DROP POLICY IF EXISTS suppliers_read_all ON suppliers;
DROP POLICY IF EXISTS suppliers_modify_manager ON suppliers;

-- Employees policies
DROP POLICY IF EXISTS employees_read_own ON employees;
DROP POLICY IF EXISTS employees_modify_manager ON employees;

-- Attendance policies
DROP POLICY IF EXISTS attendance_read_own ON attendance;
DROP POLICY IF EXISTS attendance_insert_own ON attendance;
DROP POLICY IF EXISTS attendance_update_manager ON attendance;

-- Queue tickets policies
DROP POLICY IF EXISTS queue_tickets_read_all ON queue_tickets;
DROP POLICY IF EXISTS queue_tickets_insert_all ON queue_tickets;
DROP POLICY IF EXISTS queue_tickets_update_assigned ON queue_tickets;
DROP POLICY IF EXISTS queue_tickets_delete_manager ON queue_tickets;

-- Ticket services policies
DROP POLICY IF EXISTS ticket_services_read_all ON ticket_services;
DROP POLICY IF EXISTS ticket_services_insert_all ON ticket_services;
DROP POLICY IF EXISTS ticket_services_modify_manager ON ticket_services;

-- Ticket products policies
DROP POLICY IF EXISTS ticket_products_read_all ON ticket_products;
DROP POLICY IF EXISTS ticket_products_insert_all ON ticket_products;
DROP POLICY IF EXISTS ticket_products_modify_manager ON ticket_products;

-- Commissions policies
DROP POLICY IF EXISTS commissions_read_own ON commissions;
DROP POLICY IF EXISTS commissions_modify_manager ON commissions;

-- Debts policies
DROP POLICY IF EXISTS debts_read_all ON debts;
DROP POLICY IF EXISTS debts_modify_manager ON debts;
DROP POLICY IF EXISTS debts_delete_admin ON debts;

-- Payments policies
DROP POLICY IF EXISTS payments_read_all ON payments;
DROP POLICY IF EXISTS payments_insert_all ON payments;
DROP POLICY IF EXISTS payments_modify_manager ON payments;

-- Purchase invoices policies
DROP POLICY IF EXISTS purchase_invoices_read_all ON purchase_invoices;
DROP POLICY IF EXISTS purchase_invoices_modify_manager ON purchase_invoices;
DROP POLICY IF EXISTS purchase_invoices_delete_admin ON purchase_invoices;

-- Financial transactions policies
DROP POLICY IF EXISTS financial_transactions_read_manager ON financial_transactions;
DROP POLICY IF EXISTS financial_transactions_insert_manager ON financial_transactions;
DROP POLICY IF EXISTS financial_transactions_modify_admin ON financial_transactions;

-- Stock movements policies
DROP POLICY IF EXISTS stock_movements_read_all ON stock_movements;
DROP POLICY IF EXISTS stock_movements_insert_manager ON stock_movements;

-- Loyalty transactions policies
DROP POLICY IF EXISTS loyalty_transactions_read_own ON loyalty_transactions;
DROP POLICY IF EXISTS loyalty_transactions_insert_manager ON loyalty_transactions;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_user_record(UUID, TEXT, TEXT, user_role, TEXT);
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS user_has_role(user_role);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM users
  WHERE id = auth.uid();
  
  RETURN user_role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
  current_role user_role;
BEGIN
  SELECT role INTO current_role
  FROM users
  WHERE id = auth.uid();
  
  CASE required_role
    WHEN 'admin' THEN
      RETURN current_role = 'admin';
    WHEN 'manager' THEN
      RETURN current_role IN ('admin', 'manager');
    WHEN 'cashier' THEN
      RETURN current_role IN ('admin', 'manager', 'cashier');
    WHEN 'worker' THEN
      RETURN current_role IN ('admin', 'manager', 'cashier', 'worker');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Policy: Users can read their own profile
CREATE POLICY users_read_own_profile ON users
  FOR SELECT
  USING (
    id = auth.uid() 
    OR user_has_role('manager')
  );

-- Policy: Only admins can insert users
CREATE POLICY users_insert_admin_only ON users
  FOR INSERT
  WITH CHECK (user_has_role('admin'));

-- Policy: Users can update their own profile, admins can update anyone
CREATE POLICY users_update_own_profile ON users
  FOR UPDATE
  USING (
    id = auth.uid() 
    OR user_has_role('admin')
  );

-- Policy: Only admins can delete users
CREATE POLICY users_delete_admin_only ON users
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read customers
CREATE POLICY customers_read_all ON customers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Managers and admins can insert customers
CREATE POLICY customers_insert_manager ON customers
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- Policy: Managers and admins can update customers
CREATE POLICY customers_update_manager ON customers
  FOR UPDATE
  USING (user_has_role('manager'));

-- Policy: Only admins can delete customers
CREATE POLICY customers_delete_admin ON customers
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- VEHICLES TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read vehicles
CREATE POLICY vehicles_read_all ON vehicles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Managers and admins can insert vehicles
CREATE POLICY vehicles_insert_manager ON vehicles
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- Policy: Managers and admins can update vehicles
CREATE POLICY vehicles_update_manager ON vehicles
  FOR UPDATE
  USING (user_has_role('manager'));

-- Policy: Only admins can delete vehicles
CREATE POLICY vehicles_delete_admin ON vehicles
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- SERVICES TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read active services
CREATE POLICY services_read_all ON services
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only managers and admins can modify services
CREATE POLICY services_modify_manager ON services
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read products
CREATE POLICY products_read_all ON products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Managers and admins can insert products
CREATE POLICY products_insert_manager ON products
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- Policy: Managers and admins can update products
CREATE POLICY products_update_manager ON products
  FOR UPDATE
  USING (user_has_role('manager'));

-- Policy: Only admins can delete products
CREATE POLICY products_delete_admin ON products
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- SUPPLIERS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read suppliers
CREATE POLICY suppliers_read_all ON suppliers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only managers and admins can modify suppliers
CREATE POLICY suppliers_modify_manager ON suppliers
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================

-- Policy: Employees can read their own record, managers can read all
CREATE POLICY employees_read_own ON employees
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_role('manager')
  );

-- Policy: Only managers and admins can modify employees
CREATE POLICY employees_modify_manager ON employees
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- ATTENDANCE TABLE POLICIES
-- ============================================================

-- Policy: Employees can read their own attendance, managers can read all
CREATE POLICY attendance_read_own ON attendance
  FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR user_has_role('manager')
  );

-- Policy: Employees can insert their own check-in/out, managers can do anything
CREATE POLICY attendance_insert_own ON attendance
  FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR user_has_role('manager')
  );

-- Policy: Only managers can update attendance records
CREATE POLICY attendance_update_manager ON attendance
  FOR UPDATE
  USING (user_has_role('manager'));

-- ============================================================
-- QUEUE TICKETS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read tickets
CREATE POLICY queue_tickets_read_all ON queue_tickets
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: All authenticated users can insert tickets (for POS)
CREATE POLICY queue_tickets_insert_all ON queue_tickets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Workers can update their assigned tickets, managers can update all
CREATE POLICY queue_tickets_update_assigned ON queue_tickets
  FOR UPDATE
  USING (
    assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR user_has_role('manager')
  );

-- Policy: Only managers can delete tickets
CREATE POLICY queue_tickets_delete_manager ON queue_tickets
  FOR DELETE
  USING (user_has_role('manager'));

-- ============================================================
-- TICKET SERVICES TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read ticket services
CREATE POLICY ticket_services_read_all ON ticket_services
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: All authenticated users can insert ticket services
CREATE POLICY ticket_services_insert_all ON ticket_services
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Managers can update/delete ticket services
CREATE POLICY ticket_services_modify_manager ON ticket_services
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- TICKET PRODUCTS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read ticket products
CREATE POLICY ticket_products_read_all ON ticket_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: All authenticated users can insert ticket products
CREATE POLICY ticket_products_insert_all ON ticket_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Managers can update/delete ticket products
CREATE POLICY ticket_products_modify_manager ON ticket_products
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- COMMISSIONS TABLE POLICIES
-- ============================================================

-- Policy: Employees can read their own commissions, managers can read all
CREATE POLICY commissions_read_own ON commissions
  FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR user_has_role('manager')
  );

-- Policy: Only managers can insert/update commissions (auto-created by triggers)
CREATE POLICY commissions_modify_manager ON commissions
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- DEBTS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read debts
CREATE POLICY debts_read_all ON debts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only managers can insert/update debts
CREATE POLICY debts_modify_manager ON debts
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- Policy: Only admins can delete debts
CREATE POLICY debts_delete_admin ON debts
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read payments
CREATE POLICY payments_read_all ON payments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: All authenticated users can insert payments
CREATE POLICY payments_insert_all ON payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only managers can update/delete payments
CREATE POLICY payments_modify_manager ON payments
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- PURCHASE INVOICES TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read invoices
CREATE POLICY purchase_invoices_read_all ON purchase_invoices
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only managers can insert/update invoices
CREATE POLICY purchase_invoices_modify_manager ON purchase_invoices
  FOR ALL
  USING (user_has_role('manager'))
  WITH CHECK (user_has_role('manager'));

-- Policy: Only admins can delete invoices
CREATE POLICY purchase_invoices_delete_admin ON purchase_invoices
  FOR DELETE
  USING (user_has_role('admin'));

-- ============================================================
-- FINANCIAL TRANSACTIONS TABLE POLICIES
-- ============================================================

-- Policy: Only managers and admins can read financial transactions
CREATE POLICY financial_transactions_read_manager ON financial_transactions
  FOR SELECT
  USING (user_has_role('manager'));

-- Policy: Only managers can insert financial transactions
CREATE POLICY financial_transactions_insert_manager ON financial_transactions
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- Policy: Only admins can update/delete financial transactions
CREATE POLICY financial_transactions_modify_admin ON financial_transactions
  FOR ALL
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

-- ============================================================
-- STOCK MOVEMENTS TABLE POLICIES
-- ============================================================

-- Policy: All authenticated users can read stock movements
CREATE POLICY stock_movements_read_all ON stock_movements
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only managers can insert stock movements (auto-created by triggers)
CREATE POLICY stock_movements_insert_manager ON stock_movements
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- LOYALTY TRANSACTIONS TABLE POLICIES
-- ============================================================

-- Policy: Customers can read their own loyalty transactions, managers can read all
CREATE POLICY loyalty_transactions_read_own ON loyalty_transactions
  FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE id = auth.uid())
    OR user_has_role('manager')
  );

-- Policy: Only managers can insert loyalty transactions (auto-created by triggers)
CREATE POLICY loyalty_transactions_insert_manager ON loyalty_transactions
  FOR INSERT
  WITH CHECK (user_has_role('manager'));

-- ============================================================
-- HELPER FUNCTION FOR USER CREATION
-- ============================================================

-- Function to create user record (can be called manually or via Edge Function)
CREATE OR REPLACE FUNCTION create_user_record(
  p_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'worker',
  p_phone TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role, phone)
  VALUES (
    p_id,
    p_email,
    COALESCE(p_full_name, SPLIT_PART(p_email, '@', 1)),
    p_role,
    p_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- END OF RLS POLICIES
-- ============================================================


-- --- Source: 010_kiosk_secure_rpc.sql ---
-- ============================================================
-- Lavage & Vidange ERP 2026
-- Migration: Secure Kiosk RPC
-- ============================================================

-- 1. DROP INSECURE POLICIES FOR 'anon' ROLE
-- This revokes public SELECT access to sensitive tables.
DROP POLICY IF EXISTS customers_read_anon ON customers;
DROP POLICY IF EXISTS customers_insert_anon ON customers;

DROP POLICY IF EXISTS vehicles_read_anon ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_anon ON vehicles;

DROP POLICY IF EXISTS queue_tickets_insert_anon ON queue_tickets;
-- Note: queue_tickets_read_anon is KEPT so the Kiosk can see active tickets and queue position.

-- 2. CREATE SECURE RPC FUNCTION
-- This function runs with elevated privileges (SECURITY DEFINER)
-- acting as a secure black box for the Kiosk application.
CREATE OR REPLACE FUNCTION kiosk_create_ticket(
    p_name TEXT,
    p_phone TEXT,
    p_plate TEXT,
    p_brand TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: executes with the privileges of the creator
SET search_path = public -- Secure the search path
AS $$
DECLARE
    v_customer_id UUID;
    v_vehicle_id UUID;
    v_ticket_number TEXT;
BEGIN
    -- 1. Find or create customer
    SELECT id INTO v_customer_id FROM customers WHERE phone = p_phone LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (full_name, phone, credit_limit, current_balance, loyalty_points, notes, active)
        VALUES (p_name, p_phone, 0, 0, 0, 'Client Kiosque', true)
        RETURNING id INTO v_customer_id;
    END IF;

    -- 2. Find or create vehicle
    SELECT id INTO v_vehicle_id FROM vehicles WHERE customer_id = v_customer_id LIMIT 1;

    IF v_vehicle_id IS NULL THEN
        INSERT INTO vehicles (customer_id, plate_number, brand, model, year)
        VALUES (v_customer_id, p_plate, p_brand, 'Inconnu', EXTRACT(YEAR FROM CURRENT_DATE)::INT)
        RETURNING id INTO v_vehicle_id;
    END IF;

    -- 3. Create ticket
    -- The trigger "generate_ticket_number" on queue_tickets will automatically 
    -- generate the #K0001 sequence number before insert.
    INSERT INTO queue_tickets (
        customer_id, 
        vehicle_id, 
        status, 
        priority, 
        subtotal, 
        tax_rate, 
        tax_amount, 
        discount, 
        total_amount, 
        paid_amount, 
        notes, 
        service_ids, 
        product_items
    ) VALUES (
        v_customer_id,
        v_vehicle_id,
        'pending',
        'normal',
        0, 0, 0, 0, 0, 0,
        'Ticket Kiosque',
        ARRAY[]::UUID[],
        '[]'::JSONB
    ) RETURNING ticket_number INTO v_ticket_number;

    RETURN v_ticket_number;
END;
$$;

-- 3. GRANT EXECUTION RIGHTS TO ANON
-- Allow the public Kiosk app to execute this specific function only.
GRANT EXECUTE ON FUNCTION kiosk_create_ticket(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION kiosk_create_ticket(TEXT, TEXT, TEXT, TEXT) TO authenticated;


