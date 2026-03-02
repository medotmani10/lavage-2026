You are a Senior Security-Focused Full-Stack Developer. We are building a standalone, Mobile-First PWA (Customer App) for a Car Wash & Oil Change station using Vite, React, TailwindCSS, Zustand, and Supabase. 

This app is COMPLETELY ISOLATED from the internal POS system. It will reside in a new folder (e.g., `/customer-app`). Do NOT modify the internal POS logic or `APP LOGIC.md`.

CRITICAL SECURITY REQUIREMENT (Zero-Trust Architecture):
We must achieve maximum security using Supabase native RLS. Customers will log in using their Phone Number and a 4-digit PIN. To map this to Supabase Auth securely:
- Phone numbers will be formatted under the hood as dummy emails (e.g., `phone@lavage.local`).
- The 4-digit PIN will act as the password.
- This ensures we can use `auth.uid()` in all our RLS policies.

Please execute this project in 3 sequential phases:

### PHASE 1: The Security Bridge (Supabase SQL Migrations)
Create a new SQL migration file to set up the secure backend for the Customer App:

1. **Guest Booking RPC (Unauthenticated):**
   - Create a `SECURITY DEFINER` function `rpc_create_guest_ticket(p_name, p_phone, p_service)`.
   - It inserts a row into `queue_tickets` (without a customer_id) and returns the generated `ticket_number`.
   - This allows public users to book without giving `anon` role INSERT permissions on the table.

2. **Customer Auth Setup (Trigger/RPC):**
   - Add an `auth_id` (UUID) column to the `customers` table.
   - Create a secure RPC `rpc_convert_guest_to_customer(p_ticket_id, p_plate_number)`. This function (called ONLY by the cashier/authenticated POS user) will:
     a) Generate a random 4-digit PIN.
     b) Create a user in `auth.users` with email `[phone]@lavage.local` and password `PIN`.
     c) Create the `customer` record linked to the `auth_id`.
     d) Link the ticket and return the PIN so the cashier can print it.

3. **Strict RLS Policies for Customer App:**
   - `queue_tickets` (for remote booking): Allow `anon` to insert ONLY via the `rpc_create_guest_ticket` function (revoke direct insert).
   - `customers`: Allow `SELECT` where `auth_id = auth.uid()`.
   - `vehicles`: Allow `SELECT` where `customer_id` belongs to `auth_id = auth.uid()`.
   - `loyalty_transactions`: Allow `SELECT` where `customer_id` belongs to `auth_id = auth.uid()`.

### PHASE 2: Project Setup & Public Routes
Initialize the `/customer-app` Vite project.
1. Install dependencies: `supabase-js`, `zustand`, `react-router-dom`, `lucide-react`, `tailwindcss`.
2. Configure PWA manifest (Mobile-first UI).
3. **Landing Page (`/`):** - A modern hero section.
   - A Guest Booking Form (Name, Phone, Service: Lavage or Vidange).
   - Calls `rpc_create_guest_ticket` and displays a success screen with their ticket number (e.g., "K-015").
4. **Login Page (`/login`):**
   - Inputs: Phone Number & 4-digit PIN.
   - Action: Formats email as `[phone]@lavage.local` and calls `supabase.auth.signInWithPassword()`. On success, redirect to `/dashboard`.

### PHASE 3: Protected Routes (Espace Client)
Build the protected screens ensuring they only fetch data bound to `auth.uid()`.
1. **Dashboard (`/dashboard`):**
   - Display Customer Name and current `loyalty_points`.
   - Visual progress bar for free washes.
   - A static QR Code containing their Phone Number (for the cashier to scan easily).
2. **My Garage (`/garage`):**
   - Fetch their vehicles.
   - For each vehicle, fetch the most recent ticket with `requested_service = 'vidange'` and `current_mileage != null`.
   - Display a visual progress bar indicating remaining distance until `next_oil_change`.
3. **History (`/history`):**
   - A simple list of their past completed tickets, dates, and amounts paid.

Start with Phase 1. Output the exact SQL required to create the Guest RPC, the Auth RPC, and the strict RLS policies. Do not proceed to Phase 2 until the SQL is reviewed.