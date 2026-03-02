import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import type { Ticket } from '../types';
import { History as HistoryIcon, Receipt, Droplets, Wrench } from 'lucide-react';

export default function HistoryPage() {
    const { customer, user } = useAuthStore();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!customer?.id || !user?.id) return;

        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('queue_tickets')
                    .select('*')
                    .eq('customer_id', customer.id)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false });

                if (error) throw error;
                setTickets(data as Ticket[] || []);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [customer?.id, user?.id]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
                    <HistoryIcon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Historique</h2>
            </div>

            {tickets.length === 0 ? (
                <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-heavy)] rounded-[32px] p-8 text-center">
                    <Receipt className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-white font-bold mb-2">Aucune transaction</h3>
                    <p className="text-sm text-[var(--text-muted)]">Vos tickets terminés apparaîtront ici.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-2xl p-4 flex items-center justify-between group hover:border-[var(--border-light)] transition-colors">

                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ticket.requested_service === 'lavage' ? 'bg-primary-500/10 text-primary-400' : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    {ticket.requested_service === 'lavage' ? <Droplets className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                                </div>

                                <div>
                                    <h4 className="font-bold text-white capitalize">{ticket.requested_service}</h4>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {ticket.completed_at ? new Date(ticket.completed_at).toLocaleDateString('fr-DZ', {
                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        }) : 'Inconnue'}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="font-bold text-white">{ticket.paid_amount?.toLocaleString()} DA</p>
                                <div className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-success-500/10 text-success-400">
                                    <Receipt className="w-3 h-3" /> Payé
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
