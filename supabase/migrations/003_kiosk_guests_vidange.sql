-- ============================================================
-- Lavage & Vidange ERP 2026
-- Phase 1 Structural Update: Guest Tickets & Vidange Tracking
-- Migration: 003_kiosk_guests_vidange.sql
-- ============================================================

-- 1. Modify queue_tickets to allow NULL for customer_id and vehicle_id (For guests)
ALTER TABLE public.queue_tickets ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.queue_tickets ALTER COLUMN vehicle_id DROP NOT NULL;

-- 2. Add Guest fields to queue_tickets
ALTER TABLE public.queue_tickets 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS requested_service TEXT; -- 'lavage' or 'vidange'

-- 3. Add Vidange tracking fields to queue_tickets
ALTER TABLE public.queue_tickets 
ADD COLUMN IF NOT EXISTS current_mileage INTEGER,
ADD COLUMN IF NOT EXISTS next_oil_change INTEGER,
ADD COLUMN IF NOT EXISTS filters_changed JSONB DEFAULT '[]'::JSONB;

-- 4. Create the new SECURITY DEFINER RPC for guest ticket creation
-- This replaces the old kiosk_create_ticket (from 010) or updates it
-- We will name it create_guest_ticket as requested
CREATE OR REPLACE FUNCTION public.create_guest_ticket(
    p_name TEXT,
    p_phone TEXT,
    p_service TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket_number TEXT;
BEGIN
    -- Insert the guest ticket directly without creating a customer/vehicle yet
    -- The generate_ticket_number trigger will automatically sequence the ticket_number
    INSERT INTO queue_tickets (
        customer_id, 
        vehicle_id,
        guest_name,
        guest_phone,
        requested_service,
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
        NULL, -- No customer yet
        NULL, -- No vehicle yet
        p_name,
        p_phone,
        p_service,
        'pending',
        CASE WHEN p_service = 'vidange' THEN 'priority'::ticket_priority ELSE 'normal'::ticket_priority END,
        0, 0, 0, 0, 0, 0,
        'Client Kiosque (Visiteur)',
        ARRAY[]::UUID[],
        '[]'::JSONB
    ) RETURNING ticket_number INTO v_ticket_number;

    RETURN v_ticket_number;
END;
$$;

-- 5. Grant EXECUTE permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.create_guest_ticket(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_guest_ticket(TEXT, TEXT, TEXT) TO authenticated;

-- Force schema cache reload (Supabase convention)
NOTIFY pgrst, 'reload schema';
