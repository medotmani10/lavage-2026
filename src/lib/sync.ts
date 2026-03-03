import { supabase } from './supabase';
import { useNotificationStore } from '../stores/useNotificationStore';

// Name of the global event dispatched when data changes in Supabase
export const SUPABASE_UPDATE_EVENT = 'supabase-data-update';

// Helper to queue an operation (online-only: writes directly to Supabase)
export async function queueOperation(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: Record<string, unknown>) {
    if (!navigator.onLine) {
        throw new Error("Impossible d'enregistrer: Aucune connexion Internet.");
    }

    try {
        if (operation === 'INSERT') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from(table as never) as any).insert([payload]);
            if (error) {
                // Provide human-readable error messages
                if (error.code === '23505') throw new Error(`Enregistrement déjà existant (doublon): ${error.message}`);
                if (error.code === '23503') throw new Error(`Référence introuvable — vérifiez que le client et le véhicule existent: ${error.message}`);
                if (error.code === '42703') throw new Error(`Colonne inconnue dans la base de données: ${error.message}`);
                throw error;
            }
        } else if (operation === 'UPDATE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from(table as never) as any).update(payload).eq('id', payload.id as string);
            if (error) {
                if (error.code === '42703') throw new Error(`Colonne inconnue: ${error.message}`);
                throw error;
            }
        } else if (operation === 'DELETE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from(table as never) as any).delete().eq('id', payload.id as string);
            if (error) throw error;
        }

        // Notify all components subscribed to data changes to re-fetch
        window.dispatchEvent(new CustomEvent(SUPABASE_UPDATE_EVENT));
    } catch (e: unknown) {
        console.error(`Supabase [${operation}] on [${table}] failed:`, e);
        throw e; // Propagate error to UI
    }
}

// Subscribe to real-time changes from Supabase and notify the UI
export function setupRealtimeSync(retryCount = 0): () => void {
    const MAX_RETRIES = 3;
    const channel = supabase.channel('schema-db-changes');

    const processPayload = (payload: { table?: string; eventType?: string; new?: Record<string, unknown> }) => {
        const { table, eventType, new: newRec } = payload;
        console.log(`Realtime: ${eventType} on ${table}`);

        // Notify all components to re-fetch fresh data
        window.dispatchEvent(new CustomEvent(SUPABASE_UPDATE_EVENT));

        // Trigger in-app notification for new kiosk tickets
        const isTicketTable = table?.toLowerCase().includes('queue_tickets');
        const isInsert = eventType?.toUpperCase() === 'INSERT';

        if (isTicketTable && isInsert && newRec) {
            try {
                useNotificationStore.getState().addNotification({
                    type: 'ticket_new',
                    title: 'Nouveau Ticket Kiosque',
                    message: `Le ticket #${newRec.ticket_number || 'K???'} vient d'être créé.`,
                    metadata: {
                        ticket_id: String(newRec.id ?? ''),
                        ticket_number: String(newRec.ticket_number ?? '')
                    }
                });
            } catch (notifErr) {
                console.error('Failed to add notification to store:', notifErr);
            }
        }
    };

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    console.log('Setting up Supabase Realtime subscription...');
    channel
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => processPayload(payload)
        )
        .subscribe((status) => {
            console.log('Supabase Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to Supabase Realtime');
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Supabase Realtime Channel Error: Check RLS and publication settings.');
                }
                if (retryCount < MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
                    console.warn(`Realtime ${status} — retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                    retryTimeout = setTimeout(() => {
                        supabase.removeChannel(channel);
                        setupRealtimeSync(retryCount + 1);
                    }, delay);
                } else {
                    console.error('Supabase Realtime failed after max retries.');
                }
            }
        });

    return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
        supabase.removeChannel(channel);
    };
}
