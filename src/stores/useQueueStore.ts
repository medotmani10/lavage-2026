import { create } from 'zustand';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { queueOperation } from '../lib/sync';
import type { QueueTicket, TicketStatus } from '../types';

interface QueueState {
  tickets: QueueTicket[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTickets: (status?: TicketStatus[]) => Promise<void>;
  subscribeToTickets: () => () => void;
  createTicket: (ticket: {
    customer_id: string;
    vehicle_id: string;
    priority?: 'normal' | 'priority' | 'vip';
    status?: TicketStatus;
    subtotal?: number;
    tax_rate?: number;
    discount?: number;
    total_amount?: number;
    paid_amount?: number;
    payment_method?: 'cash' | 'card' | 'credit' | 'mixed';
    notes?: string;
    assigned_employee_id?: string | null;
    requested_service: 'lavage' | 'vidange' | 'pneumatique';
  }) => Promise<QueueTicket | null>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  updateTicketEmployee: (ticketId: string, employeeId: string | null) => Promise<void>;
  clearTickets: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  tickets: [],
  isLoading: false,
  error: null,
  fetchTickets: async (status) => {
    set({ isLoading: true, error: null });

    try {
      let resolvedTickets = [];

      if (navigator.onLine) {
        try {
          // Fetch from Supabase directly
          let query = supabase
            .from('queue_tickets')
            .select(`
              *,
              customer:customers(id, full_name, phone, email),
              vehicle:vehicles(id, plate_number, brand, model, year),
              employee:employees(id, position, user:users(full_name))
            `)
            .order('created_at', { ascending: true });

          if (status && status.length > 0) {
            query = query.in('status', status);
          }

          const { data, error } = await query;
          if (error) throw error;

          resolvedTickets = data || [];

          // Silently cache to dexie
          if (data && data.length > 0) {
            const plainTickets = data.map((t: any) => {
              const { customer, vehicle, employee, ...rest } = t;
              return rest;
            });
            db.queue_tickets.bulkPut(plainTickets as any).catch(console.error);
          }
        } catch (e) {
          console.warn("Supabase fetch failed in queueStore, falling back to Dexie", e);
        }
      }

      // Fallback to Dexie if offline or Supabase failed
      if (resolvedTickets.length === 0) {
        let tickets = await db.queue_tickets.orderBy('created_at').toArray();

        if (status && status.length > 0) {
          tickets = tickets.filter(t => status.includes(t.status));
        }

        // Resolve relations manually for offline view
        resolvedTickets = await Promise.all(tickets.map(async (t) => {
          let customer = null;
          if (t.customer_id) {
            customer = await db.customers.get(t.customer_id).catch(() => null);
          }

          let vehicle = null;
          if (t.vehicle_id && t.vehicle_id !== t.customer_id) {
            vehicle = await db.vehicles.get(t.vehicle_id).catch(() => null);
          }

          const employee = t.assigned_employee_id ? await db.employees.get(t.assigned_employee_id).catch(() => null) : null;

          return {
            ...t,
            customer: customer ? {
              id: customer.id,
              full_name: customer.full_name,
              phone: customer.phone,
              email: customer.email
            } : { full_name: 'Client Kiosque' }, // Fallback for kiosk tickets before customer syncs
            vehicle: vehicle ? {
              id: vehicle.id,
              plate_number: vehicle.plate_number,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year
            } : { plate_number: 'N/A' }, // Fallback for kiosk tickets without explicit vehicles
            employee: employee ? {
              id: employee.id,
              position: employee.position,
              user: { full_name: (employee as any).user?.full_name || 'Inconnu' }
            } : null
          };
        })) as any;
      }

      set({ tickets: resolvedTickets as any, isLoading: false });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tickets';
      set({ error: errorMessage, isLoading: false });
    }
  },

  subscribeToTickets: () => {
    // Basic polling fallback for when we can't use live query directly
    // Ideally components will use Dexie useLiveQuery.
    // Listen to custom event dispatched by sync.ts
    const handleSync = () => get().fetchTickets();
    window.addEventListener('dexie-sync-update', handleSync);
    return () => { window.removeEventListener('dexie-sync-update', handleSync); };
  },

  createTicket: async (ticketData) => {
    set({ isLoading: true, error: null });

    try {
      const newTicketId = crypto.randomUUID();

      // Generate client-side ticket number for immediate printing
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Bug #5 fix: Use MAX existing ticket number, not COUNT (count causes duplicates when cache is partial)
      const allToday = await db.queue_tickets
        .filter(t => new Date(t.created_at) >= today && t.requested_service === ticketData.requested_service)
        .toArray();

      const prefix = ticketData.requested_service === 'lavage' ? 'L' : ticketData.requested_service === 'vidange' ? 'V' : 'P';
      const maxNum = allToday.reduce((max, t) => {
        const num = parseInt((t.ticket_number || '').replace(/[^0-9]/g, '') || '0', 10);
        return Math.max(max, num);
      }, 0);
      const ticketNumber = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;

      const newTicket = {
        id: newTicketId,
        ticket_number: ticketNumber,
        customer_id: ticketData.customer_id,
        vehicle_id: ticketData.vehicle_id,
        priority: ticketData.priority || 'normal',
        status: ticketData.status || 'pending',
        subtotal: ticketData.subtotal || 0,
        tax_rate: ticketData.tax_rate || 0,
        discount: ticketData.discount || 0,
        total_amount: ticketData.total_amount || 0,
        paid_amount: ticketData.paid_amount || 0,
        payment_method: ticketData.payment_method || null,
        notes: ticketData.notes || null,
        internal_notes: null,
        assigned_employee_id: ticketData.assigned_employee_id || null,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancelled_reason: null,
        service_ids: [],
        product_items: [],
        requested_service: ticketData.requested_service
      };

      await queueOperation('queue_tickets', 'INSERT', newTicket);

      // Refresh tickets list
      await get().fetchTickets();

      set({ isLoading: false });
      return newTicket as any;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ticket';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  updateTicketStatus: async (ticketId, status) => {
    set({ isLoading: true, error: null });

    try {
      const ticket = await db.queue_tickets.get(ticketId);
      if (!ticket) throw new Error("Ticket introuvable");

      const updateData: any = { status };

      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const newTicket = { ...ticket, ...updateData };
      await queueOperation('queue_tickets', 'UPDATE', newTicket);

      // Refresh tickets list
      await get().fetchTickets();

      set({ isLoading: false });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ticket';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateTicketEmployee: async (ticketId, employeeId) => {
    set({ isLoading: true, error: null });

    try {
      const ticket = await db.queue_tickets.get(ticketId);
      if (!ticket) throw new Error("Ticket introuvable");

      const newTicket = { ...ticket, assigned_employee_id: employeeId };
      await queueOperation('queue_tickets', 'UPDATE', newTicket);

      // Refresh tickets list
      await get().fetchTickets();

      set({ isLoading: false });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update employee';
      set({ error: errorMessage, isLoading: false });
    }
  },

  clearTickets: () => {
    set({ tickets: [], error: null });
  },
}));
