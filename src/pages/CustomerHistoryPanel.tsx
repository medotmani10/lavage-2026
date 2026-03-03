/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { User, Mail, MapPin, X, Calendar, DollarSign, Activity, Settings2, Car } from 'lucide-react';
import type { Customer } from '../types';

interface Ticket {
    id: string;
    ticket_number: string;
    created_at: string;
    status: string;
    total_amount: number;
    vehicle_id?: string;
    vehicle?: {
        plate_number: string;
        brand: string;
        model: string;
    }
}

interface TicketDetail {
    id: string;
    ticket_number: string;
    created_at: string;
    status: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    notes?: string;
    employee?: {
        full_name: string;
    };
    vehicle?: {
        plate_number: string;
        brand: string;
        model: string;
    };
    services: any[];
    products: any[];
    payments: any[];
}

interface CustomerHistoryPanelProps {
    customer: Customer;
    isOpen: boolean;
    onClose: () => void;
}

export function CustomerHistoryPanel({ customer, isOpen, onClose }: CustomerHistoryPanelProps) {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [ticketDetails, setTicketDetails] = useState<TicketDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTickets();
            setSelectedTicketId(null);
            setTicketDetails(null);
        }
    }, [isOpen, customer?.id]);

    useEffect(() => {
        if (selectedTicketId) {
            fetchTicketDetails(selectedTicketId);
        }
    }, [selectedTicketId]);

    const fetchTickets = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('queue_tickets')
            .select('id, ticket_number, created_at, status, total_amount, vehicle_id, vehicle:vehicles(plate_number, brand, model)')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });

        if (data && !error) {
            setTickets(data as any);
        }
        setIsLoading(false);
    };

    const fetchTicketDetails = async (ticketId: string) => {
        setIsLoadingDetails(true);
        try {
            // Fetch ticket basic info + vehicle + employee
            const { data: ticketData, error: ticketError } = await supabase
                .from('queue_tickets')
                .select(`
          *,
          vehicle:vehicles(plate_number, brand, model),
          employee:employees(user:users(full_name))
        `)
                .eq('id', ticketId)
                .single();

            if (ticketError) throw ticketError;

            // Fetch services
            const { data: servicesData } = await supabase
                .from('ticket_services')
                .select('*, service:services(name, price)')
                .eq('ticket_id', ticketId);

            // Fetch products
            const { data: productsData } = await supabase
                .from('ticket_products')
                .select('*, product:inventory(name, sku, unit_price)')
                .eq('ticket_id', ticketId);

            // Fetch payments
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('*')
                .eq('ticket_id', ticketId);

            setTicketDetails({
                ...(ticketData as any),
                employee: (ticketData as any)?.employee ? { full_name: ((ticketData as any).employee.user as any)?.full_name } : undefined,
                services: servicesData || [],
                products: productsData || [],
                payments: paymentsData || [],
            });
        } catch (error) {
            console.error('Error fetching ticket details:', error);
        }
        setIsLoadingDetails(false);
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg lg:max-w-4xl bg-[var(--bg-surface)] h-full shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0 bg-[var(--bg-panel)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center">
                            <User className="w-6 h-6 text-primary-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{customer.full_name}</h2>
                            <p className="text-sm text-[var(--text-muted)] font-mono">{customer.phone}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-base)] rounded-xl transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                    {/* Left side: Customer Stats & Ticket List */}
                    <div className={`flex flex-col w-full ${selectedTicketId ? 'hidden lg:flex lg:w-1/2 border-r border-[var(--border)]' : ''}`}>

                        <div className="p-6 border-b border-[var(--border)] space-y-4 shrink-0 overflow-y-auto max-h-[40vh] scrollbar-thin scrollbar-thumb-gray">
                            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Aperçu du compte</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1 uppercase font-bold tracking-wider">{t('customer.currentBalance')}</p>
                                    <p className={`text-xl font-black ${customer.current_balance > 0 ? 'text-danger-500' : 'text-success-500'}`}>
                                        {customer.current_balance.toLocaleString()} DA
                                    </p>
                                </div>
                                <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1 uppercase font-bold tracking-wider">{t('customer.loyaltyPoints')}</p>
                                    <p className="text-xl font-black text-primary-400">
                                        {customer.loyalty_points.toLocaleString()} pts
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4 text-sm text-[var(--text-secondary)]">
                                {customer.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span>{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray">
                            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Historique des visites ({tickets.length})
                            </h3>

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                                    <p>Aucune transaction trouvée.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.map(ticket => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => setSelectedTicketId(ticket.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicketId === ticket.id
                                                ? 'bg-primary-500/10 border-primary-500/50 shadow-[var(--shadow-glow-orange)]'
                                                : 'bg-[var(--bg-base)] border-[var(--border)] hover:border-primary-500/30 hover:bg-[var(--bg-hover)]'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-white text-sm">#{ticket.ticket_number}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ticket.status === 'completed' ? 'bg-success-500/20 text-success-400' : 'bg-warning-500/20 text-warning-400'}`}>
                                                    {ticket.status === 'completed' ? 'Terminé' : 'En cours'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end mt-4">
                                                <div className="text-xs text-[var(--text-muted)] space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(ticket.created_at).toLocaleDateString()}
                                                    </div>
                                                    {ticket.vehicle && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Car className="w-3.5 h-3.5" />
                                                            {ticket.vehicle.plate_number}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-bold text-white">
                                                    {ticket.total_amount.toLocaleString()} DA
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Ticket Details */}
                    <div className={`flex flex-col w-full lg:w-1/2 bg-[var(--bg-base)] overflow-hidden ${!selectedTicketId ? 'hidden lg:flex items-center justify-center opacity-50' : ''}`}>
                        {!selectedTicketId ? (
                            <div className="text-center p-8 hidden lg:block">
                                <Settings2 className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-30" />
                                <p className="text-[var(--text-secondary)] font-medium">Sélectionnez une transaction pour voir les détails</p>
                            </div>
                        ) : isLoadingDetails ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                            </div>
                        ) : ticketDetails ? (
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray space-y-6">
                                {/* Block: Mobile back button */}
                                <button
                                    onClick={() => setSelectedTicketId(null)}
                                    className="lg:hidden flex items-center gap-2 text-sm text-primary-500 font-bold mb-4"
                                >
                                    &larr; Retour à l'historique
                                </button>

                                <div className="border-b border-[var(--border)] pb-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-2xl font-black text-white">#{ticketDetails.ticket_number}</h3>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                                {new Date(ticketDetails.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${ticketDetails.status === 'completed' ? 'bg-success-500/20 text-success-400' : 'bg-warning-500/20 text-warning-400'}`}>
                                            {ticketDetails.status === 'completed' ? 'Terminé' : 'En cours'}
                                        </span>
                                    </div>
                                </div>

                                {ticketDetails.vehicle && (
                                    <Card className="p-4 bg-[var(--bg-panel)] border-[var(--border-lg)]">
                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Car className="w-4 h-4" /> Véhicule
                                        </h4>
                                        <div className="flex justify-between items-center">
                                            <div className="font-mono text-sm font-bold bg-[var(--bg-base)] px-2 py-1 rounded inline-block border border-[var(--border)] text-white">
                                                {ticketDetails.vehicle.plate_number}
                                            </div>
                                            <div className="text-sm font-medium text-white text-right">
                                                {ticketDetails.vehicle.brand} {ticketDetails.vehicle.model}
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Prestations</h4>
                                    <div className="space-y-2">
                                        {ticketDetails.services.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl">
                                                <div>
                                                    <p className="font-bold text-sm text-white">{item.service.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{item.quantity} x {item.unit_price} DA</p>
                                                </div>
                                                <div className="font-bold text-white text-sm">
                                                    {item.total_price.toLocaleString()} DA
                                                </div>
                                            </div>
                                        ))}
                                        {ticketDetails.products.map((item, idx) => (
                                            <div key={`p-${idx}`} className="flex justify-between items-center p-3 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl">
                                                <div>
                                                    <p className="font-bold text-sm text-white">{item.product.name} (Produit)</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{item.quantity} x {item.unit_price} DA</p>
                                                </div>
                                                <div className="font-bold text-white text-sm">
                                                    {item.total_price.toLocaleString()} DA
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-lg)] p-5 space-y-3">
                                    <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                                        <span>Sous-total</span>
                                        <span>{ticketDetails.subtotal.toLocaleString()} DA</span>
                                    </div>
                                    {ticketDetails.discount_amount > 0 && (
                                        <div className="flex justify-between text-sm text-success-400">
                                            <span>Remise</span>
                                            <span>-{ticketDetails.discount_amount.toLocaleString()} DA</span>
                                        </div>
                                    )}
                                    {ticketDetails.tax_amount > 0 && (
                                        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                                            <span>TVA</span>
                                            <span>+{ticketDetails.tax_amount.toLocaleString()} DA</span>
                                        </div>
                                    )}
                                    <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center">
                                        <span className="font-bold text-white">Total Payé</span>
                                        <span className="text-xl font-black text-primary-400">{ticketDetails.total_amount.toLocaleString()} DA</span>
                                    </div>
                                </div>

                                {ticketDetails.payments.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Méthodes de paiement
                                        </h4>
                                        <div className="space-y-2">
                                            {ticketDetails.payments.map((payment, idx) => (
                                                <div key={idx} className="flex justify-between text-sm p-3 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl">
                                                    <span className="capitalize text-white">{payment.payment_method === 'cash' ? 'Espèces' : payment.payment_method === 'card' ? 'Carte' : 'Crédit (Dette)'}</span>
                                                    <span className="font-bold text-white">{payment.amount.toLocaleString()} DA</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                </div>
            </div>
        </div>
    );
}
