-- Phase 1.1: Add auth_id to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Phase 1.2: Guest Booking RPC (Unauthenticated)
CREATE OR REPLACE FUNCTION rpc_create_guest_ticket(
    p_name text,
    p_phone text,
    p_service text,
    p_vehicle_type text DEFAULT 'voiture'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_number text;
BEGIN
    -- insert into queue_tickets (leaving ticket_number out so the native DB trigger auto-generates it)
    INSERT INTO queue_tickets (
        status,
        requested_service,
        guest_name,
        guest_phone,
        created_at
    ) VALUES (
        'pending',
        p_service,
        p_name,
        p_phone,
        now()
    ) RETURNING ticket_number INTO v_ticket_number;

    RETURN v_ticket_number;
END;
$$;

-- Grant execute permissions so public users can call this RPC
GRANT EXECUTE ON FUNCTION rpc_create_guest_ticket(text, text, text, text) TO anon, authenticated;

-- Phase 1.3: Customer Auth Setup (Convert Guest to Customer)
CREATE OR REPLACE FUNCTION rpc_convert_guest_to_customer(
    p_ticket_id uuid,
    p_plate_number text
)
RETURNS text -- returns the generated PIN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pin text;
    v_phone text;
    v_name text;
    v_email text;
    v_auth_id uuid;
    v_customer_id uuid;
    v_vehicle_id uuid;
    v_ticket_record record;
BEGIN
    -- get the ticket details
    SELECT * INTO v_ticket_record FROM queue_tickets WHERE id = p_ticket_id;
    IF v_ticket_record IS NULL THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;
    
    v_phone := v_ticket_record.guest_phone;
    v_name := v_ticket_record.guest_name;
    
    IF v_phone IS NULL OR v_phone = '' THEN
        RAISE EXCEPTION 'Phone number is required for conversion';
    END IF;

    -- format dummy email
    v_email := v_phone || '@lavage.local';
    
    -- generate 4-digit PIN
    v_pin := lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Check if user exists in auth.users
    SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
    
    IF v_auth_id IS NULL THEN
        -- Create user in auth.users
        v_auth_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
        VALUES (
            v_auth_id,
            '00000000-0000-0000-0000-000000000000',
            v_email,
            crypt(v_pin, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            json_build_object('full_name', v_name, 'phone', v_phone),
            now(),
            now(),
            'authenticated'
        );
        
        -- Create customer record
        v_customer_id := gen_random_uuid();
        INSERT INTO customers (id, full_name, phone, auth_id, created_at, updated_at)
        VALUES (v_customer_id, v_name, v_phone, v_auth_id, now(), now());
    ELSE
        -- Update the PIN if user exists
        UPDATE auth.users SET encrypted_password = crypt(v_pin, gen_salt('bf')) WHERE id = v_auth_id;
        
        -- Get customer id
        SELECT id INTO v_customer_id FROM customers WHERE auth_id = v_auth_id LIMIT 1;
        IF v_customer_id IS NULL THEN
            v_customer_id := gen_random_uuid();
            INSERT INTO customers (id, full_name, phone, auth_id, created_at, updated_at)
            VALUES (v_customer_id, v_name, v_phone, v_auth_id, now(), now());
        END IF;
    END IF;

    -- Create or find vehicle
    SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = p_plate_number AND customer_id = v_customer_id LIMIT 1;
    IF v_vehicle_id IS NULL THEN
        v_vehicle_id := gen_random_uuid();
        INSERT INTO vehicles (id, customer_id, plate_number, make, model, type, created_at, updated_at)
        VALUES (v_vehicle_id, v_customer_id, p_plate_number, 'Unknown', 'Unknown', COALESCE(v_ticket_record.vehicle_type, 'voiture'), now(), now());
    END IF;

    -- Link the ticket to customer and vehicle
    UPDATE queue_tickets 
    SET customer_id = v_customer_id, 
        vehicle_id = v_vehicle_id
    WHERE id = p_ticket_id;

    RETURN v_pin;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_convert_guest_to_customer(uuid, text) TO authenticated;

-- Phase 1.4: Strict RLS Policies for Customer App

-- Enable RLS
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Drop previous policies for customer app if any (keeping clean)
DROP POLICY IF EXISTS "Customers can view their own tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Customers can view their own profile" ON customers;
DROP POLICY IF EXISTS "Customers can view their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Customers can view their own loyalty transactions" ON loyalty_transactions;

-- Allow customers to see their own profile
CREATE POLICY "Customers can view their own profile" ON customers
    FOR SELECT TO authenticated
    USING (auth_id = auth.uid());

-- Allow customers to see their own tickets
CREATE POLICY "Customers can view their own tickets" ON queue_tickets
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

-- Allow customers to see their own vehicles
CREATE POLICY "Customers can view their own vehicles" ON vehicles
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

-- Allow customers to see their own loyalty transactions
CREATE POLICY "Customers can view their own loyalty transactions" ON loyalty_transactions
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
