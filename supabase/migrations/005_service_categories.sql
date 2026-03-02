-- Phase 5.1: Update existing services to match the correct service_category ENUM ('lavage', 'vidange', 'pneumatique')

UPDATE public.services 
SET category = 'vidange'::service_category 
WHERE name ILIKE '%vidange%' OR name ILIKE '%huile%';

UPDATE public.services 
SET category = 'pneumatique'::service_category 
WHERE name ILIKE '%pneu%' OR name ILIKE '%équili%';

-- Index the category column for faster filtering in the portfolio
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- Phase 5.2: Allow public/anonymous reads on queue tickets for today so the Landing Page Live Queue works.
-- Customer's own tickets are covered by another policy, but this one relies on just basic ticket info for today.
DROP POLICY IF EXISTS "Anyone can view today's active tickets" ON queue_tickets;

CREATE POLICY "Anyone can view today's active tickets" ON queue_tickets
    FOR SELECT 
    USING (
        created_at >= CURRENT_DATE 
        AND status IN ('pending', 'in_progress')
    );

-- Phase 5.3: Activer Realtime pour la table queue_tickets (si non activé)
-- Cela permet à la page d'accueil d'écouter les changements en direct
-- Note: Déjà activé !
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
