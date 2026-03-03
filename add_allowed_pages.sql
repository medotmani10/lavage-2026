-- Add allowed_pages column to users table for role-based access control
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allowed_pages jsonb;
