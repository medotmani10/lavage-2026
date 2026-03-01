import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { showAlert } from '../stores/useDialogStore';
import { usePOSStore } from '../stores/usePOSStore';
import { useQueueStore } from '../stores/useQueueStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ServicesPanel } from './ServicesPanel';
import { ProductsPanel } from './ProductsPanel';
import { CartPanel } from './CartPanel';
import { CustomerSelect } from './CustomerSelect';
import { PaymentModal } from './PaymentModal';
import { ShoppingCart, Wrench, Package, ArrowLeft, Clock, Car, UserPlus } from 'lucide-react';
import type { QueueTicket } from '../types';
import { GuestConversionModal } from '../components/GuestConversionModal';

export function POS() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subtotal, total, setCustomer, setVehicle, setEmployee } = usePOSStore();
  const { tickets, fetchTickets, subscribeToTickets, createTicket } = useQueueStore();

  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [guestTicketToConvert, setGuestTicketToConvert] = useState<QueueTicket | null>(null);

  useEffect(() => {
    fetchTickets();
    const unsubscribe = subscribeToTickets();
    return () => unsubscribe();
  }, [fetchTickets, subscribeToTickets]);

  // Sort: Vidange first, then by created_at
  const activeTickets = tickets
    .filter(t => t.status === 'in_progress')
    .sort((a, b) => {
      const aIsVidange = a.requested_service === 'vidange' ? 0 : 1;
      const bIsVidange = b.requested_service === 'vidange' ? 0 : 1;
      if (aIsVidange !== bIsVidange) return aIsVidange - bIsVidange;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const handleTicketSelect = (ticket: QueueTicket) => {
    // Guest ticket: must convert to real customer first
    if (!ticket.customer_id) {
      setGuestTicketToConvert(ticket);
      return;
    }
    setSelectedTicketId(ticket.id);
    if (ticket.customer_id) setCustomer(ticket.customer_id);
    if (ticket.vehicle_id) setVehicle(ticket.vehicle_id);
    if (ticket.assigned_employee_id) setEmployee(ticket.assigned_employee_id);
  };

  const selectedTicket = activeTickets.find(t => t.id === selectedTicketId);
  const selectedCategory = selectedTicket?.requested_service as 'lavage' | 'vidange' | 'pneumatique' | undefined;

  const handleCheckout = async () => {
    setIsProcessing(true);

    try {
      const { customerId, vehicleId, employeeId, notes, discount, items } = usePOSStore.getState();

      if (!customerId || !vehicleId) {
        showAlert("Veuillez sélectionner un client et un véhicule", 'warning');
        setIsProcessing(false);
        return;
      }

      const services = items.filter(i => i.type === 'service');
      const products = items.filter(i => i.type === 'product');

      const serviceTotal = services.reduce((sum, s) => sum + s.subtotal, 0);
      const productTotal = products.reduce((sum, p) => sum + p.subtotal, 0);
      const subtotalAmt = serviceTotal + productTotal;

      // Bug #6 fix: Use s.category from the cart item (set by ServicesPanel from the DB),
      // NOT name keyword matching which is brittle and would miss the Fiche Vidange trigger.
      const hasVidange = services.some(s => s.category === 'vidange');
      const hasPneu = services.some(s => s.category === 'pneumatique');
      const inferredCategory = hasVidange ? 'vidange' : (hasPneu ? 'pneumatique' : 'lavage');

      // If a ticket was selected from the queue, update it. Otherwise create a new one.
      if (selectedTicketId) {
        // You would typically have an update function, but assuming we mark it completed via payment modal later
        // or we just transition it to 'completed' after payment. We just keep its ID.
        setShowPaymentModal(true);
      } else {
        const ticket = await createTicket({
          customer_id: customerId,
          vehicle_id: vehicleId,
          assigned_employee_id: employeeId || null,
          notes: notes || undefined,
          subtotal: subtotalAmt,
          tax_rate: 0,
          discount: discount,
          total_amount: total,
          paid_amount: 0,
          status: 'pending',
          requested_service: inferredCategory,
        });
        if (ticket) {
          setSelectedTicketId(ticket.id);
          setShowPaymentModal(true);
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showAlert(t('messages.saveError'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-base)] flex flex-col animate-fade-in">
      {/* ── Top Navigation Bar ── */}
      <div className="h-[var(--header-h)] bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 md:p-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors border border-[var(--border-lg)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm md:text-xl font-bold text-white tracking-tight">Caisse <span className="hidden sm:inline">Enregistreuse</span> (POS)</h1>
            <p className="hidden md:inline-block text-xs text-[var(--text-muted)] mt-0.5 border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 rounded text-primary-400 font-medium">
              Mode Plein Écran
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">{t('pos.subtotal')}</p>
            <p className="text-xl md:text-2xl font-bold text-gradient">{subtotal.toFixed(2)} DZD</p>
          </div>
          <Button
            variant="success"
            size="md"
            onClick={handleCheckout}
            isLoading={isProcessing}
            disabled={subtotal === 0}
            className="shadow-lg shadow-success-500/20 md:px-6 md:py-3"
          >
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
            <span className="md:text-lg">{subtotal > 0 ? `${subtotal.toFixed(0)} DA` : 'Encaisser'}</span>
          </Button>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 md:p-6 pb-24 lg:pb-6 gap-6 grid grid-cols-1 lg:grid-cols-12">

        {/* 1. Left Panel: Queue Active Tickets (col-span-3) */}
        <div className="hidden lg:flex flex-col gap-4 col-span-3 h-full">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Véhicules en station
          </h2>
          <Card className="flex-1 overflow-y-auto p-3 bg-[var(--bg-surface)] border-[var(--border)] scrollbar-thin scrollbar-thumb-gray" noPadding>
            {activeTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-6 text-center">
                <Car className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Aucun véhicule en station actuellement.</p>
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {activeTickets.map(ticket => {
                  const isGuest = !ticket.customer_id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketSelect(ticket)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${selectedTicketId === ticket.id
                        ? 'bg-primary-500/10 border-primary-500 shadow-[var(--shadow-glow-orange)]'
                        : 'bg-[var(--bg-panel)] border-[var(--border-lg)] hover:border-primary-400/50 hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">#{ticket.ticket_number}</span>
                          {isGuest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                              <UserPlus className="w-2.5 h-2.5" /> Visiteur
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {ticket.requested_service === 'lavage' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Lavage</span>
                          )}
                          {ticket.requested_service === 'vidange' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Vidange</span>
                          )}
                          {ticket.requested_service === 'pneumatique' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Pneumatique</span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-primary-500/20 text-primary-400">
                            En Cours
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mb-1 truncate">
                        {ticket.customer?.full_name || ticket.guest_name || 'Visiteur'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-base)] p-1.5 rounded border border-[var(--border)]">
                        <Car className="w-3.5 h-3.5" />
                        <span className="truncate">{ticket.vehicle?.plate_number || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 2. Middle Panel: Services & Products (col-span-12 lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 h-[500px] lg:h-full lg:min-h-0">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-lg)] overflow-hidden shrink-0">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'services'
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                }`}
            >
              <Wrench className="w-4 h-4" />
              Services
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'products'
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                }`}
            >
              <Package className="w-4 h-4" />
              Boutique
            </button>
          </div>

          <Card className="flex-1 overflow-hidden p-0 bg-[var(--bg-surface)] border-[var(--border)]">
            {activeTab === 'services' ? (
              <ServicesPanel ticketCategory={selectedCategory} />
            ) : (
              <ProductsPanel ticketCategory={selectedCategory} />
            )}
          </Card>
        </div>

        {/* 3. Right Panel: Current Cart & Customer (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-[600px] lg:h-full lg:min-h-0">
          <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)] shrink-0">
            <CustomerSelect />
          </Card>

          <Card className="flex-1 overflow-hidden p-0 flex flex-col bg-[var(--bg-surface)] border-[var(--border)]">
            <CartPanel />
          </Card>
        </div>

      </div>

      {showPaymentModal && (
        <PaymentModal
          ticketId={selectedTicketId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedTicketId(null);
          }}
        />
      )}

      {guestTicketToConvert && (
        <GuestConversionModal
          ticket={guestTicketToConvert}
          onConverted={() => {
            setGuestTicketToConvert(null);
            setSelectedTicketId(guestTicketToConvert.id);
            if (guestTicketToConvert.assigned_employee_id) setEmployee(guestTicketToConvert.assigned_employee_id);
            fetchTickets();
          }}
          onClose={() => setGuestTicketToConvert(null)}
        />
      )}
    </div>
  );
}
