-- Fix users_id_fkey constraint to allow PIN padding / non-auth users

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. (Optional) If you want to keep the link but make it optional, 
-- you can add it back with ON DELETE SET NULL if id is nullable, but a primary key can't be null.
-- So dropping it is the best way to allow local-only "users" that login via PIN instead of Auth.

-- Now you can insert directly into public.users without needing a corresponding row in auth.users.
