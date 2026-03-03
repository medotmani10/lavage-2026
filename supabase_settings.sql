-- SQL Script to create app_settings table in Supabase
-- Please run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_name TEXT NOT NULL DEFAULT 'Lavage Vida',
    phone TEXT,
    address TEXT,
    rc TEXT,
    nif TEXT,
    logo_url TEXT,
    opening_time TEXT DEFAULT '08:00',
    closing_time TEXT DEFAULT '20:00',
    working_days JSONB DEFAULT '["Samedi", "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Active RLS and allow authenticated users to read/update
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated on app_settings" ON public.app_settings;
CREATE POLICY "Allow all for authenticated on app_settings" ON public.app_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert a default row if empty
INSERT INTO public.app_settings (station_name)
SELECT 'Lavage Vida'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Enable Realtime for the table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    customers, vehicles, services, products, employees,
    queue_tickets, ticket_services, ticket_products,
    payments, debts, financial_transactions, suppliers,
    users, commissions, purchase_invoices, stock_movements,
    app_settings;
COMMIT;
