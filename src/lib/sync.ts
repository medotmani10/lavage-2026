import { db } from './db';
import { supabase } from './supabase';
import { useNotificationStore } from '../stores/useNotificationStore';

let isSyncing = false;
let isPulling = false;

// Basic push sync: push local changes to Supabase
export async function pushChanges() {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;

    try {
        const queue = await db.sync_queue.orderBy('created_at').toArray();
        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        for (const item of queue) {
            try {
                // ── Auto-fix known schema changes ──
                if (item.table === 'queue_tickets' && item.payload) {
                    if ('amount_paid' in item.payload) {
                        item.payload.paid_amount = item.payload.amount_paid;
                        delete item.payload.amount_paid;
                    }
                }

                if (item.operation === 'INSERT') {
                    // @ts-ignore: generic table insert
                    const { error } = await supabase.from(item.table as any).insert([item.payload]);
                    if (error && error.code !== '23505') { // ignore duplicate key errors if already synced
                        console.error(`Error inserting into ${item.table}:`, error);
                        throw error;
                    }
                } else if (item.operation === 'UPDATE') {
                    // @ts-ignore: generic table update
                    const { error } = await supabase.from(item.table as any).update(item.payload).eq('id', item.payload.id);
                    if (error) {
                        console.error(`Error updating ${item.table}:`, error);
                        throw error;
                    }
                } else if (item.operation === 'DELETE') {
                    // @ts-ignore: generic table delete
                    const { error } = await supabase.from(item.table as any).delete().eq('id', item.payload.id);
                    if (error) {
                        console.error(`Error deleting from ${item.table}:`, error);
                        throw error;
                    }
                }

                // Remove from queue after success
                if (item.id) await db.sync_queue.delete(item.id);
            } catch (err: any) {
                console.error('Failed to sync item:', item, err);
                // If it's a schema mismatch (e.g., column doesn't exist), delete to unblock queue
                if (item.id && (err?.code?.startsWith('PGRST') || err?.status === 400)) {
                    console.warn(`🗑️ Discarding invalid sync item ${item.id} to unblock queue!`, err);
                    await db.sync_queue.delete(item.id);
                    continue; // Continue to next item without breaking
                }
                // Break out to avoid syncing later items if earlier ones fail (maintain order for valid items)
                break;
            }
        }
    } finally {
        isSyncing = false;
    }
}

// Basic pull sync: pull changes from Supabase to Dexie
export async function pullChanges() {
    if (isPulling || !navigator.onLine) return;

    // Quick ping to Supabase to verify REAL internet access despite navigator.onLine lying
    try {
        const { error } = await supabase.from('services').select('id').limit(1);
        if (error && error.message.includes('FetchError')) {
            return; // Actual offline
        }
    } catch {
        return; // we are actually offline
    }

    isPulling = true;

    try {
        // Fetch ALL tables completely for local offline cache
        // Active flags are removed so local DB learns about deactivated rows too.
        const { data: services } = await supabase.from('services').select('*');
        if (services) await db.services.bulkPut(services);

        const { data: products } = await supabase.from('products').select('*');
        if (products) await db.products.bulkPut(products);

        const { data: employees } = await supabase.from('employees').select('*');
        if (employees) await db.employees.bulkPut(employees);

        const { data: users } = await supabase.from('users').select('*');
        if (users) await db.users.bulkPut(users);

        const { data: suppliers } = await supabase.from('suppliers').select('*');
        if (suppliers) await db.suppliers.bulkPut(suppliers);

        const { data: customers } = await supabase.from('customers').select('*');
        if (customers) await db.customers.bulkPut(customers);

        const { data: vehicles } = await supabase.from('vehicles').select('*');
        if (vehicles) await db.vehicles.bulkPut(vehicles);

        const { data: debts } = await supabase.from('debts').select('*');
        if (debts) await db.debts.bulkPut(debts);

        const { data: commissions } = await supabase.from('commissions').select('*');
        if (commissions) await db.commissions.bulkPut(commissions);

        const { data: financialTx } = await supabase.from('financial_transactions').select('*');
        if (financialTx) await db.financial_transactions.bulkPut(financialTx);

        // Fetch all tickets history
        const { data: tickets } = await supabase.from('queue_tickets').select('*');
        if (tickets) await db.queue_tickets.bulkPut(tickets);

        const { data: ticketServices } = await supabase.from('ticket_services').select('*');
        if (ticketServices) await db.ticket_services.bulkPut(ticketServices);

        const { data: ticketProducts } = await supabase.from('ticket_products').select('*');
        if (ticketProducts) await db.ticket_products.bulkPut(ticketProducts);

        const { data: payments } = await supabase.from('payments').select('*');
        if (payments) await db.payments.bulkPut(payments);

        const { data: purchaseInvoices } = await supabase.from('purchase_invoices').select('*');
        if (purchaseInvoices) await db.purchase_invoices.bulkPut(purchaseInvoices);

        const { data: stockMovements } = await supabase.from('stock_movements').select('*');
        if (stockMovements) await db.stock_movements.bulkPut(stockMovements);

    } catch (error) {
        console.error('Error pulling changes:', error);
    } finally {
        isPulling = false;
    }
}

// Helper to queue an operation to run locally and eventually push to Supabase
export async function queueOperation(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    // Try acting locally first
    if (operation === 'INSERT' || operation === 'UPDATE') {
        await (db as any)[table].put(payload);
    } else if (operation === 'DELETE') {
        await (db as any)[table].delete(payload.id);
    }

    // Queue it for remote
    await db.sync_queue.add({
        table,
        operation,
        payload,
        created_at: new Date().toISOString()
    });

    // Try immediate sync if online
    if (navigator.onLine) {
        pushChanges();
    }
}

// Subscribe to real-time changes from Supabase
export function setupRealtimeSync(retryCount = 0): () => void {
    const MAX_RETRIES = 3;
    const channel = supabase.channel('schema-db-changes');

    // Helper to process incoming realtime payloads
    const processPayload = async (payload: any) => {
        console.log('Realtime payload received:', payload);
        const { table, eventType, new: newRec, old: oldRec } = payload;

        // Skip tables we don't sync to Dexie
        const dexieTable = (db as any)[table];
        if (!dexieTable) {
            console.log(`Realtime: Table "${table}" not found in Dexie schema, skipping local sync.`);

            // SPECIAL CASE: Even if not in Dexie, we might want notifications for some tables
            if (table.toLowerCase().includes('queue_tickets')) {
                // proceed for notifications
            } else {
                return;
            }
        }

        try {
            let changed = false;
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (newRec && Object.keys(newRec).length > 0) {
                    if (dexieTable) await dexieTable.put(newRec);
                    changed = true;
                }
            } else if (eventType === 'DELETE') {
                if (oldRec && oldRec.id) {
                    if (dexieTable) await dexieTable.delete(oldRec.id);
                    changed = true;
                }
            }

            // Notify React components to re-fetch if they rely on manual store queries
            if (changed) {
                window.dispatchEvent(new CustomEvent('dexie-sync-update'));

                // TRIGGER NOTIFICATION: If it's a new ticket
                const isTicketTable = table.toLowerCase().includes('queue_tickets');
                const isInsert = eventType.toUpperCase() === 'INSERT';

                if (isTicketTable && isInsert && newRec) {
                    try {
                        console.log('🔔 Triggering notification for new ticket:', newRec.ticket_number);
                        useNotificationStore.getState().addNotification({
                            type: 'ticket_new',
                            title: 'Nouveau Ticket Kiosque',
                            message: `Le ticket #${newRec.ticket_number || 'K???'} vient d'être créé.`,
                            metadata: {
                                ticket_id: newRec.id,
                                ticket_number: newRec.ticket_number
                            }
                        });
                    } catch (notifErr) {
                        console.error('❌ Failed to add notification to store:', notifErr);
                    }
                }
            }
        } catch (err) {
            console.error('Error applying realtime update to Dexie:', err);
        }
    };

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    console.log('Setting up Supabase Realtime subscription...');
    channel
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                console.log('Postgres change overhead:', payload.table, payload.eventType);
                processPayload(payload);
            }
        )
        .subscribe((status) => {
            console.log('Supabase Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to Supabase Realtime');
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Supabase Realtime Channel Error: Check RLS and publication settings.');
                }
                if (retryCount < MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
                    console.warn(`⚡ Realtime ${status} — retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                    retryTimeout = setTimeout(() => {
                        supabase.removeChannel(channel);
                        setupRealtimeSync(retryCount + 1);
                    }, delay);
                } else {
                    console.error('❌ Supabase Realtime failed after max retries. Will not retry automatically.');
                }
            }
        });

    return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
        supabase.removeChannel(channel);
    };
}
