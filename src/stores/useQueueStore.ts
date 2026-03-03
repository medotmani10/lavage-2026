import { create } from 'zustand';
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
      if (!navigator.onLine) {
        throw new Error("Impossible de charger les tickets: Aucune connexion Internet.");
      }

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

      if (data && data.length > 0) {
        const supaResolved = data as any[];
        set({ tickets: supaResolved.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), isLoading: false });
      } else {
        set({ tickets: [], isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tickets';
      console.error("fetchTickets error:", error);
      set({ error: errorMessage, isLoading: false, tickets: [] });
    }
  },

  subscribeToTickets: () => {
    // Native Supabase Realtime subscription on queue_tickets table
    const channel = supabase
      .channel(`realtime:queue_tickets:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_tickets' },
        () => { get().fetchTickets(); }
      )
      .subscribe();

    // Also listen to manual event (for queueOperation dispatch)
    const handleManualUpdate = () => get().fetchTickets();
    window.addEventListener('supabase-data-update', handleManualUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('supabase-data-update', handleManualUpdate);
    };
  },

  createTicket: async (ticketData) => {
    set({ isLoading: true, error: null });

    try {
      const newTicketId = crypto.randomUUID();

      // Generate ticket number — fetch ALL existing ticket numbers with this prefix
      // and find the MAX client-side (more reliable than ORDER BY on strings)
      const prefix = ticketData.requested_service === 'lavage' ? 'L'
        : ticketData.requested_service === 'vidange' ? 'V' : 'P';

      const { data: allWithPrefix } = await supabase
        .from('queue_tickets')
        .select('ticket_number')
        .ilike('ticket_number', `${prefix}%`) as { data: any[] | null };

      const lastNum = (allWithPrefix || []).reduce((max: number, t: any) => {
        const num = parseInt((t.ticket_number || '').replace(/[^0-9]/g, '') || '0', 10);
        return Math.max(max, num);
      }, 0);

      // Try inserting with incrementing ticket numbers until one succeeds
      let ticketNumber = `${prefix}${(lastNum + 1).toString().padStart(4, '0')}`;
      let attempt = 0;
      const MAX_ATTEMPTS = 5;

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

      while (attempt < MAX_ATTEMPTS) {
        newTicket.ticket_number = ticketNumber;
        const { error } = await supabase.from('queue_tickets').insert([newTicket] as any);

        if (!error) {
          // Success! Notify components
          window.dispatchEvent(new CustomEvent('supabase-data-update'));
          break;
        }

        if (error.code === '23505') {
          // Duplicate ticket_number — try next number
          attempt++;
          const nextNum = lastNum + 1 + attempt;
          ticketNumber = `${prefix}${nextNum.toString().padStart(4, '0')}`;
          console.warn(`Ticket number collision, retrying with ${ticketNumber} (attempt ${attempt})`);
        } else {
          // Different error — propagate
          if (error.code === '23503') throw new Error(`Référence introuvable — vérifiez que le client et le véhicule existent: ${error.message}`);
          throw error;
        }
      }

      if (attempt >= MAX_ATTEMPTS) {
        throw new Error(`Impossible de générer un numéro de ticket unique après ${MAX_ATTEMPTS} tentatives.`);
      }

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
      const { data: ticket, error: ticketError } = await supabase.from('queue_tickets').select('*').eq('id', ticketId).single();
      if (!ticket || ticketError) throw new Error("Ticket introuvable");

      const updateData: any = { status };

      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const newTicket = { ...(ticket as any), ...updateData };
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
      const { data: ticket, error: ticketError } = await supabase.from('queue_tickets').select('*').eq('id', ticketId).single();
      if (!ticket || ticketError) throw new Error("Ticket introuvable");

      const newTicket = { ...(ticket as any), assigned_employee_id: employeeId };
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
